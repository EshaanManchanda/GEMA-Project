import mongoose, { Document, Schema } from "mongoose";
import { ServiceItemType } from "./VendorServicePackage";

/**
 * Audit ledger for VendorServicePackage fulfillment.
 *
 * This is the SOURCE OF TRUTH for how many of a package's deliverables have
 * been consumed. VendorServicePackage.items[].used is a denormalized cache
 * recomputed from the `active` rows here (see recomputePackageUsage() in
 * admin.servicePackage.controller.ts) — never trust the cache alone.
 *
 * A row is created every time an admin grants a package deliverable (e.g.
 * features an event, posts a blog). Cancelling a row (status='cancelled')
 * restores the corresponding package slot.
 */

export type ServiceUsageRefModel = "Event" | "Blog";
export type ServiceUsageStatus = "active" | "completed" | "cancelled";
export type PromotionTierName = "boost" | "featured" | "premium";

export interface IVendorServiceUsage extends Document {
  vendorId: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;
  itemType: ServiceItemType;
  refModel?: ServiceUsageRefModel;
  refId?: mongoose.Types.ObjectId;
  quantityUsed: number;
  tier?: PromotionTierName;
  startDate?: Date;
  endDate?: Date;
  status: ServiceUsageStatus;
  usedBy: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorServiceUsageSchema = new Schema<IVendorServiceUsage>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "VendorServicePackage",
      required: [true, "Package ID is required"],
      index: true,
    },
    itemType: {
      type: String,
      enum: Object.values(ServiceItemType),
      required: true,
    },
    refModel: {
      type: String,
      enum: ["Event", "Blog"],
    },
    refId: {
      type: Schema.Types.ObjectId,
      refPath: "refModel",
    },
    quantityUsed: {
      type: Number,
      default: 1,
      min: [1, "quantityUsed must be at least 1"],
    },
    tier: {
      type: String,
      enum: ["boost", "featured", "premium"],
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      required: true,
      index: true,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "usedBy is required"],
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  { timestamps: true },
);

VendorServiceUsageSchema.index({ packageId: 1, status: 1 });
VendorServiceUsageSchema.index({ refModel: 1, refId: 1, status: 1 });
VendorServiceUsageSchema.index({ vendorId: 1 });

const VendorServiceUsage = mongoose.model<IVendorServiceUsage>(
  "VendorServiceUsage",
  VendorServiceUsageSchema,
);

export default VendorServiceUsage;
