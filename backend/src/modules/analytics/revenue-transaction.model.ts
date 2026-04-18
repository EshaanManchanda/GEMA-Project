import mongoose, { Document, Schema, model } from "mongoose";

export enum RevenueStream {
  EVENT_BOOKING = "event_booking",
  EVENT_ADDON = "event_addon",
  TEACHER_BOOKING = "teacher_booking",
  TEACHER_SUBSCRIPTION = "teacher_subscription",
  VENDOR_SUBSCRIPTION = "vendor_subscription",
  ADVERTISING = "advertising",
  AFFILIATE_COMMISSION = "affiliate_commission",
  COUPON = "coupon",
  ANALYTICS = "analytics",
  BOOKING = "booking",
  OTHER = "other",
}

export enum TransactionStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

export enum PayoutStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  PAID = "paid",
  FAILED = "failed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
  SCHEDULED = "scheduled",
}

export interface IRevenueTransaction extends Document {
  orderId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  revenueStream: RevenueStream;
  status: TransactionStatus;
  payoutStatus: PayoutStatus;
  grossAmount: number;
  platformFee: number;
  platformFeePercentage: number;
  vendorPayout: number;
  teacherPayout?: number;
  affiliateCommission?: number;
  affiliateId?: mongoose.Types.ObjectId;
  couponDiscount?: number;
  currency: string;
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  payoutDate?: Date;
  payoutId?: mongoose.Types.ObjectId;
  notes?: string;
  metadata?: Record<string, any>;
  totalAmount?: number;
  adminCommission?: number;
  recipientPayout?: number;
  payoutMethod?: string;
  description?: string;
  serviceFeeRate?: number;
  transactionDate?: Date;
  markAsPaid?(payoutMethod?: string, payoutId?: mongoose.Types.ObjectId | string): Promise<IRevenueTransaction>;
  createdAt: Date;
  updatedAt: Date;
}

const RevenueTransactionSchema = new Schema<IRevenueTransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    revenueStream: {
      type: String,
      enum: Object.values(RevenueStream),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    payoutStatus: {
      type: String,
      enum: Object.values(PayoutStatus),
      default: PayoutStatus.PENDING,
    },
    grossAmount: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    platformFeePercentage: { type: Number, default: 0 },
    vendorPayout: { type: Number, default: 0 },
    teacherPayout: { type: Number, default: 0 },
    affiliateCommission: { type: Number, default: 0 },
    affiliateId: { type: Schema.Types.ObjectId, ref: "Affiliate" },
    couponDiscount: { type: Number, default: 0 },
    currency: { type: String, default: "AED" },
    paymentMethod: { type: String },
    stripePaymentIntentId: { type: String },
    stripeTransferId: { type: String },
    payoutDate: { type: Date },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout" },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed },
    totalAmount: { type: Number },
    adminCommission: { type: Number },
    recipientPayout: { type: Number },
    payoutMethod: { type: String },
    description: { type: String },
    serviceFeeRate: { type: Number },
    transactionDate: { type: Date },
  },
  { timestamps: true }
);

RevenueTransactionSchema.methods.markAsPaid = async function (
  payoutMethod?: string,
  payoutId?: mongoose.Types.ObjectId | string,
) {
  this.payoutStatus = PayoutStatus.COMPLETED;
  this.status = TransactionStatus.COMPLETED;
  if (payoutMethod) this.payoutMethod = payoutMethod;
  if (payoutId) this.payoutId = payoutId as mongoose.Types.ObjectId;
  return await this.save();
};

RevenueTransactionSchema.index({ vendorId: 1, status: 1 });
RevenueTransactionSchema.index({ teacherId: 1, status: 1 });
RevenueTransactionSchema.index({ orderId: 1 }, { unique: true });
RevenueTransactionSchema.index({ payoutStatus: 1, status: 1 });
RevenueTransactionSchema.index({ revenueStream: 1, createdAt: -1 });

export const RevenueTransaction = model<IRevenueTransaction>(
  "RevenueTransaction",
  RevenueTransactionSchema
);

export default RevenueTransaction;
