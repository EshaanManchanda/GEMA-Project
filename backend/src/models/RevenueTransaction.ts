import mongoose, { Document, Schema } from 'mongoose';

export enum RevenueStream {
  BOOKING = 'booking',
  SUBSCRIPTION = 'subscription',
  ADVERTISING = 'advertising',
  ADDON = 'addon',
  BULK_BOOKING = 'bulk_booking',
  ANALYTICS = 'analytics',
  PARTNERSHIP = 'partnership'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum PayoutStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface IRevenueTransaction extends Document {
  // Core transaction info
  orderId?: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;

  // Financial breakdown
  totalAmount: number;
  adminCommission: number;
  vendorPayout: number;
  serviceFeeRate: number;
  currency: string;

  // Revenue classification
  revenueStream: RevenueStream;
  category?: string;
  description?: string;

  // Status tracking
  status: TransactionStatus;
  payoutStatus: PayoutStatus;

  // Dates
  transactionDate: Date;
  payoutDate?: Date;
  scheduledPayoutDate?: Date;

  // References
  stripePaymentId?: string;
  stripeTransferId?: string;
  invoiceId?: string;

  // Metadata
  metadata?: {
    eventTitle?: string;
    subscriptionPlan?: string;
    campaignName?: string;
    addonType?: string;
    bulkDiscount?: number;
    notes?: string;
    // Admin tracking fields
    adminNotes?: string;
    rejectionReason?: string;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
  };

  // Admin notes
  adminNotes?: string;
  payoutMethod?: 'bank_transfer' | 'stripe' | 'paypal' | 'manual';

  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateAdminRevenue(): number;
  markAsPaid(payoutMethod: string, transferId?: string): Promise<IRevenueTransaction>;
  scheduleForPayout(date: Date): Promise<IRevenueTransaction>;
  refund(amount: number, reason: string): Promise<IRevenueTransaction>;
}

const RevenueTransactionSchema = new Schema<IRevenueTransaction>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      sparse: true
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor ID is required'],
      index: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    adminCommission: {
      type: Number,
      required: [true, 'Admin commission is required'],
      min: [0, 'Admin commission cannot be negative']
    },
    vendorPayout: {
      type: Number,
      required: [true, 'Vendor payout is required'],
      min: [0, 'Vendor payout cannot be negative']
    },
    serviceFeeRate: {
      type: Number,
      required: [true, 'Service fee rate is required'],
      min: [0, 'Service fee rate cannot be negative'],
      max: [100, 'Service fee rate cannot exceed 100%']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      enum: ['AED', 'USD', 'EUR', 'GBP'],
      default: 'AED'
    },
    revenueStream: {
      type: String,
      enum: Object.values(RevenueStream),
      required: [true, 'Revenue stream is required'],
      index: true
    },
    category: {
      type: String,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      required: true,
      index: true
    },
    payoutStatus: {
      type: String,
      enum: Object.values(PayoutStatus),
      default: PayoutStatus.PENDING,
      required: true,
      index: true
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    payoutDate: {
      type: Date,
      index: true
    },
    scheduledPayoutDate: {
      type: Date,
      index: true
    },
    stripePaymentId: {
      type: String,
      sparse: true
    },
    stripeTransferId: {
      type: String,
      sparse: true
    },
    invoiceId: {
      type: String,
      sparse: true
    },
    metadata: {
      eventTitle: String,
      subscriptionPlan: String,
      campaignName: String,
      addonType: String,
      bulkDiscount: Number,
      notes: String,
      // Admin tracking fields
      adminNotes: String,
      rejectionReason: String,
      rejectedBy: Schema.Types.ObjectId,
      rejectedAt: Date,
      approvedBy: Schema.Types.ObjectId,
      approvedAt: Date,
      processedBy: Schema.Types.ObjectId,
      processedAt: Date
    },
    adminNotes: {
      type: String,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'stripe', 'paypal', 'manual']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
RevenueTransactionSchema.index({ vendorId: 1, revenueStream: 1 });
RevenueTransactionSchema.index({ transactionDate: -1 });
RevenueTransactionSchema.index({ status: 1, payoutStatus: 1 });
RevenueTransactionSchema.index({ scheduledPayoutDate: 1, payoutStatus: 1 });

// Virtual for admin revenue
RevenueTransactionSchema.virtual('adminRevenue').get(function(this: IRevenueTransaction) {
  return this.adminCommission;
});

// Method to calculate admin revenue
RevenueTransactionSchema.methods.calculateAdminRevenue = function(): number {
  return this.adminCommission;
};

// Method to mark as paid
RevenueTransactionSchema.methods.markAsPaid = async function(
  payoutMethod: string,
  transferId?: string
): Promise<IRevenueTransaction> {
  this.payoutStatus = PayoutStatus.COMPLETED;
  this.payoutDate = new Date();
  this.payoutMethod = payoutMethod;
  if (transferId) {
    this.stripeTransferId = transferId;
  }
  return this.save();
};

// Method to schedule for payout
RevenueTransactionSchema.methods.scheduleForPayout = async function(
  date: Date
): Promise<IRevenueTransaction> {
  this.scheduledPayoutDate = date;
  this.payoutStatus = PayoutStatus.SCHEDULED;
  return this.save();
};

// Method to refund
RevenueTransactionSchema.methods.refund = async function(
  amount: number,
  reason: string
): Promise<IRevenueTransaction> {
  this.status = TransactionStatus.REFUNDED;
  this.adminNotes = `Refunded: ${amount} ${this.currency}. Reason: ${reason}`;
  // Adjust amounts for partial refunds
  if (amount < this.totalAmount) {
    const refundRatio = amount / this.totalAmount;
    this.adminCommission = this.adminCommission * (1 - refundRatio);
    this.vendorPayout = this.vendorPayout * (1 - refundRatio);
  } else {
    this.adminCommission = 0;
    this.vendorPayout = 0;
  }
  return this.save();
};

// Pre-save validation
RevenueTransactionSchema.pre('save', function(next) {
  // Ensure admin commission + vendor payout = total amount (within rounding tolerance)
  const tolerance = 0.01;
  const sum = this.adminCommission + this.vendorPayout;
  if (Math.abs(sum - this.totalAmount) > tolerance) {
    return next(new Error('Admin commission + vendor payout must equal total amount'));
  }
  next();
});

const RevenueTransaction = mongoose.model<IRevenueTransaction>('RevenueTransaction', RevenueTransactionSchema);

export default RevenueTransaction;