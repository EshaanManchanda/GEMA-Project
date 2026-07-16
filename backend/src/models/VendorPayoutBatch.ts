import mongoose, { Document, Schema } from "mongoose";

/**
 * Monthly vendor payout settlement batch.
 *
 * Two-layer settlement model:
 *   - RevenueTransaction.payoutEligibleAt (governed by AdminRevenueSettings.payoutHoldHours)
 *     controls WHEN a vendor's money becomes eligible (refund/clawback safety window).
 *   - VendorPayoutBatch controls WHEN eligible money is actually SETTLED — grouped
 *     once per month (or on-demand), reviewed, approved, and marked paid by an admin.
 *
 * A RevenueTransaction can belong to at most one non-cancelled batch — enforced by
 * stamping payoutBatchId on the txn at generation time and excluding txns that
 * already carry one from future generation runs. See payout.service.ts
 * generateMonthlyPayoutBatches().
 */

export enum VendorPayoutBatchStatus {
  DRAFT = "draft",
  APPROVED = "approved",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export enum VendorPayoutBatchMethod {
  BANK_TRANSFER = "bank_transfer",
  STRIPE_CONNECT = "stripe_connect",
  MANUAL = "manual",
  OTHER = "other",
}

export interface IVendorPayoutBatch extends Document {
  vendorId: mongoose.Types.ObjectId;

  periodStart: Date;
  periodEnd: Date;

  grossRevenue: number;
  platformCommission: number;
  refunds: number;
  adjustments: number;
  netPayout: number;
  currency: string;

  status: VendorPayoutBatchStatus;
  paymentMethod?: VendorPayoutBatchMethod;
  transactionReference?: string;

  includedRevenueTransactionIds: mongoose.Types.ObjectId[];

  // Snapshot of the hold window in effect when this batch was generated, for audit.
  payoutHoldHoursSnapshot: number;

  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  paidBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;

  adminNotes?: string;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  approve(adminId: mongoose.Types.ObjectId): Promise<IVendorPayoutBatch>;
  markPaid(
    adminId: mongoose.Types.ObjectId,
    details: { paymentMethod: VendorPayoutBatchMethod; transactionReference?: string },
  ): Promise<IVendorPayoutBatch>;
  cancel(reason?: string): Promise<IVendorPayoutBatch>;
}

const vendorPayoutBatchSchema = new Schema<IVendorPayoutBatch>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    grossRevenue: {
      type: Number,
      required: true,
      min: [0, "Gross revenue cannot be negative"],
    },
    platformCommission: {
      type: Number,
      required: true,
      min: [0, "Platform commission cannot be negative"],
    },
    refunds: {
      type: Number,
      default: 0,
      min: [0, "Refunds cannot be negative"],
    },
    adjustments: {
      type: Number,
      default: 0,
    },
    netPayout: {
      type: Number,
      required: true,
      min: [0, "Net payout cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      enum: ["AED", "USD", "EGP", "CAD"],
      default: "AED",
    },
    status: {
      type: String,
      enum: Object.values(VendorPayoutBatchStatus),
      default: VendorPayoutBatchStatus.DRAFT,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(VendorPayoutBatchMethod),
    },
    transactionReference: {
      type: String,
      trim: true,
      maxlength: [200, "Transaction reference cannot exceed 200 characters"],
    },
    includedRevenueTransactionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "RevenueTransaction",
      },
    ],
    payoutHoldHoursSnapshot: {
      type: Number,
      required: true,
      min: [0, "Payout hold hours cannot be negative"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    paidAt: Date,
    adminNotes: {
      type: String,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes for performance
vendorPayoutBatchSchema.index({ vendorId: 1, periodStart: -1 });
vendorPayoutBatchSchema.index({ status: 1, periodStart: -1 });
// One non-cancelled batch per vendor per period — prevents accidental double-generation
vendorPayoutBatchSchema.index(
  { vendorId: 1, periodStart: 1, periodEnd: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [VendorPayoutBatchStatus.DRAFT, VendorPayoutBatchStatus.APPROVED, VendorPayoutBatchStatus.PAID] },
    },
  },
);

vendorPayoutBatchSchema.methods.approve = async function (
  adminId: mongoose.Types.ObjectId,
): Promise<IVendorPayoutBatch> {
  if (this.status !== VendorPayoutBatchStatus.DRAFT) {
    throw new Error("Only draft batches can be approved");
  }
  this.status = VendorPayoutBatchStatus.APPROVED;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  return this.save();
};

vendorPayoutBatchSchema.methods.markPaid = async function (
  adminId: mongoose.Types.ObjectId,
  details: { paymentMethod: VendorPayoutBatchMethod; transactionReference?: string },
): Promise<IVendorPayoutBatch> {
  if (this.status !== VendorPayoutBatchStatus.APPROVED) {
    throw new Error("Only approved batches can be marked as paid");
  }
  this.status = VendorPayoutBatchStatus.PAID;
  this.paidBy = adminId;
  this.paidAt = new Date();
  this.paymentMethod = details.paymentMethod;
  if (details.transactionReference) {
    this.transactionReference = details.transactionReference;
  }
  return this.save();
};

vendorPayoutBatchSchema.methods.cancel = async function (
  reason?: string,
): Promise<IVendorPayoutBatch> {
  if (this.status === VendorPayoutBatchStatus.PAID) {
    throw new Error("Paid batches cannot be cancelled — use the admin correction flow");
  }
  this.status = VendorPayoutBatchStatus.CANCELLED;
  if (reason) {
    this.adminNotes = reason;
  }
  return this.save();
};

const VendorPayoutBatch = mongoose.model<IVendorPayoutBatch>(
  "VendorPayoutBatch",
  vendorPayoutBatchSchema,
);

export default VendorPayoutBatch;
