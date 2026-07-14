import mongoose, { Document, Schema } from "mongoose";

/**
 * Offline service-package tracker for vendors.
 *
 * Vendors frequently buy marketing/growth services offline (WhatsApp/email/invoice) —
 * e.g. "3 featured events + 2 blog posts + 90 days priority listing". This model
 * records what was sold; fulfillment (actually granting a feature, posting a blog)
 * is tracked via the separate VendorServiceUsage ledger — `items.used` here is a
 * denormalized cache recomputed from that ledger, never the source of truth.
 *
 * See backend/src/models/VendorServiceUsage.ts for the audit ledger.
 */

export enum ServiceItemType {
  FEATURED_EVENT = "featured_event",
  BLOG_POST = "blog_post",
  PRIORITY_LISTING = "priority_listing",
  SOCIAL_POST = "social_post",
  OTHER = "other",
}

export enum PackageStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum PackagePaymentStatus {
  PAID = "paid",
  UNPAID = "unpaid",
  PARTIAL = "partial",
  COMPED = "comped",
}

export enum PackageSource {
  OFFLINE_INVOICE = "offline_invoice",
  ADMIN_COMP = "admin_comp",
  MANUAL = "manual",
}

export interface IServicePackageItem {
  type: ServiceItemType;
  label?: string; // required when type === OTHER
  unit: "count" | "days";
  quantity: number; // count-based deliverables (unit='count')
  durationDays?: number; // time-based deliverables (unit='days'), e.g. priority_listing
  used: number; // DERIVED cache from VendorServiceUsage ledger — recomputed, not hand-edited
}

export interface IVendorServicePackage extends Document {
  vendorId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  currency: "AED" | "USD" | "EGP" | "CAD";
  paymentStatus: PackagePaymentStatus;
  source: PackageSource;
  paymentReference?: string; // admin-only, never sent to vendor
  items: IServicePackageItem[];
  startDate: Date;
  endDate: Date;
  status: PackageStatus;
  adminNotes?: string; // internal, never sent to vendor
  vendorNotes?: string; // vendor-visible explanation
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  remaining(type: ServiceItemType): number;
}

const ServicePackageItemSchema = new Schema<IServicePackageItem>(
  {
    type: {
      type: String,
      enum: Object.values(ServiceItemType),
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: [200, "Item label cannot exceed 200 characters"],
      validate: {
        validator: function (this: IServicePackageItem, value: string) {
          if (this.type === ServiceItemType.OTHER) {
            return !!value && value.trim().length > 0;
          }
          return true;
        },
        message: "label is required when item type is 'other'",
      },
    },
    unit: {
      type: String,
      enum: ["count", "days"],
      default: "count",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Item quantity must be at least 1"],
    },
    durationDays: {
      type: Number,
      min: [1, "durationDays must be at least 1"],
    },
    used: {
      type: Number,
      default: 0,
      min: [0, "used cannot be negative"],
    },
  },
  { _id: false },
);

const VendorServicePackageSchema = new Schema<IVendorServicePackage>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
      maxlength: [150, "Package name cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      enum: ["AED", "USD", "EGP", "CAD"],
      default: "AED",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PackagePaymentStatus),
      default: PackagePaymentStatus.PAID,
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(PackageSource),
      default: PackageSource.OFFLINE_INVOICE,
      required: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: [300, "Payment reference cannot exceed 300 characters"],
    },
    items: {
      type: [ServicePackageItemSchema],
      validate: {
        validator: (items: IServicePackageItem[]) =>
          Array.isArray(items) && items.length > 0,
        message: "Package must have at least one item",
      },
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
      required: [true, "endDate is required"],
      validate: {
        validator: function (this: IVendorServicePackage, value: Date) {
          return value > this.startDate;
        },
        message: "endDate must be after startDate",
      },
    },
    status: {
      type: String,
      enum: Object.values(PackageStatus),
      default: PackageStatus.ACTIVE,
      required: true,
      index: true,
    },
    adminNotes: {
      type: String,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
    },
    vendorNotes: {
      type: String,
      maxlength: [1000, "Vendor notes cannot exceed 1000 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },
  },
  { timestamps: true },
);

VendorServicePackageSchema.index({ vendorId: 1, status: 1 });
VendorServicePackageSchema.index({ endDate: 1, status: 1 });
VendorServicePackageSchema.index({ "items.type": 1, vendorId: 1, status: 1 });

// Display-only status that accounts for expiry/completion without mutating
// the stored `status` field on read. Persisted `status` is still updated
// explicitly on cancel and after grant/consume operations (see controller).
VendorServicePackageSchema.virtual("computedStatus").get(function (
  this: IVendorServicePackage,
) {
  if (this.status === PackageStatus.CANCELLED) return PackageStatus.CANCELLED;
  if (new Date() > this.endDate) return PackageStatus.EXPIRED;

  const countItems = this.items.filter((i) => i.unit === "count");
  const allCountItemsUsed =
    countItems.length > 0 && countItems.every((i) => i.used >= i.quantity);
  if (allCountItemsUsed) return PackageStatus.COMPLETED;

  return PackageStatus.ACTIVE;
});

VendorServicePackageSchema.set("toJSON", { virtuals: true });
VendorServicePackageSchema.set("toObject", { virtuals: true });

VendorServicePackageSchema.methods.remaining = function (
  type: ServiceItemType,
): number {
  return this.items
    .filter((i: IServicePackageItem) => i.type === type)
    .reduce(
      (sum: number, i: IServicePackageItem) =>
        sum + Math.max(0, i.quantity - i.used),
      0,
    );
};

const VendorServicePackage = mongoose.model<IVendorServicePackage>(
  "VendorServicePackage",
  VendorServicePackageSchema,
);

export default VendorServicePackage;
