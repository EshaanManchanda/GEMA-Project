import mongoose, { Document, Schema } from 'mongoose';

export enum PayoutRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PayoutMethodType {
  BANK_TRANSFER = 'bank_transfer',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  MANUAL = 'manual'
}

export interface IBankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
}

export interface IPayout extends Document {
  // Core payout info
  vendorId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PayoutRequestStatus;

  // Request details
  requestedAt: Date;
  requestedBy: mongoose.Types.ObjectId; // Vendor who requested
  requestNotes?: string;

  // Approval details
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId; // Admin who approved
  approvalNotes?: string;

  // Rejection details
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;

  // Processing details
  processingStartedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Payment method & details
  payoutMethod: PayoutMethodType;
  bankDetails?: IBankDetails;
  stripeTransferId?: string;
  paypalTransactionId?: string;
  paymentReference?: string;

  // Related transactions
  revenueTransactionIds: mongoose.Types.ObjectId[];

  // Metadata
  totalOrders: number;
  periodStartDate?: Date;
  periodEndDate?: Date;
  adminNotes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  approve(adminId: mongoose.Types.ObjectId, notes?: string): Promise<IPayout>;
  reject(adminId: mongoose.Types.ObjectId, reason: string): Promise<IPayout>;
  markAsProcessing(): Promise<IPayout>;
  markAsCompleted(transactionId?: string): Promise<IPayout>;
  markAsFailed(reason: string): Promise<IPayout>;
  cancel(reason?: string): Promise<IPayout>;
}

const bankDetailsSchema = new Schema({
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  routingNumber: {
    type: String,
    trim: true
  },
  iban: {
    type: String,
    trim: true,
    uppercase: true
  },
  swiftCode: {
    type: String,
    trim: true,
    uppercase: true
  }
}, { _id: false });

const payoutSchema = new Schema<IPayout>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor', // Changed from 'User' to 'Vendor'
      required: [true, 'Vendor ID is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payout amount is required'],
      min: [0, 'Payout amount cannot be negative']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      enum: ['AED', 'USD', 'EUR', 'GBP', 'EGP', 'CAD'],
      default: 'AED'
    },
    status: {
      type: String,
      enum: Object.values(PayoutRequestStatus),
      default: PayoutRequestStatus.PENDING,
      required: true,
      index: true
    },

    // Request details
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestNotes: {
      type: String,
      maxlength: [500, 'Request notes cannot exceed 500 characters']
    },

    // Approval details
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalNotes: {
      type: String,
      maxlength: [500, 'Approval notes cannot exceed 500 characters']
    },

    // Rejection details
    rejectedAt: Date,
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    },

    // Processing details
    processingStartedAt: Date,
    completedAt: {
      type: Date
    },
    failedAt: Date,
    failureReason: {
      type: String,
      maxlength: [500, 'Failure reason cannot exceed 500 characters']
    },

    // Payment method & details
    payoutMethod: {
      type: String,
      enum: Object.values(PayoutMethodType),
      required: [true, 'Payout method is required']
    },
    bankDetails: bankDetailsSchema,
    stripeTransferId: {
      type: String,
      sparse: true
    },
    paypalTransactionId: {
      type: String,
      sparse: true
    },
    paymentReference: {
      type: String,
      trim: true
    },

    // Related transactions
    revenueTransactionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'RevenueTransaction'
    }],

    // Metadata
    totalOrders: {
      type: Number,
      default: 0,
      min: [0, 'Total orders cannot be negative']
    },
    periodStartDate: Date,
    periodEndDate: Date,
    adminNotes: {
      type: String,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance
payoutSchema.index({ vendorId: 1, status: 1 });
payoutSchema.index({ vendorId: 1, requestedAt: -1 });
payoutSchema.index({ status: 1, requestedAt: -1 });
payoutSchema.index({ approvedAt: 1 }, { sparse: true });
payoutSchema.index({ completedAt: 1 }, { sparse: true });

// Method to approve payout
payoutSchema.methods.approve = async function (
  adminId: mongoose.Types.ObjectId,
  notes?: string
): Promise<IPayout> {
  if (this.status !== PayoutRequestStatus.PENDING) {
    throw new Error('Only pending payouts can be approved');
  }

  this.status = PayoutRequestStatus.APPROVED;
  this.approvedAt = new Date();
  this.approvedBy = adminId;
  this.approvalNotes = notes;

  return this.save();
};

// Method to reject payout
payoutSchema.methods.reject = async function (
  adminId: mongoose.Types.ObjectId,
  reason: string
): Promise<IPayout> {
  if (this.status !== PayoutRequestStatus.PENDING) {
    throw new Error('Only pending payouts can be rejected');
  }

  this.status = PayoutRequestStatus.REJECTED;
  this.rejectedAt = new Date();
  this.rejectedBy = adminId;
  this.rejectionReason = reason;

  return this.save();
};

// Method to mark as processing
payoutSchema.methods.markAsProcessing = async function (): Promise<IPayout> {
  if (this.status !== PayoutRequestStatus.APPROVED) {
    throw new Error('Only approved payouts can be marked as processing');
  }

  this.status = PayoutRequestStatus.PROCESSING;
  this.processingStartedAt = new Date();

  return this.save();
};

// Method to mark as completed
payoutSchema.methods.markAsCompleted = async function (
  transactionId?: string
): Promise<IPayout> {
  if (![PayoutRequestStatus.APPROVED, PayoutRequestStatus.PROCESSING].includes(this.status)) {
    throw new Error('Only approved or processing payouts can be marked as completed');
  }

  this.status = PayoutRequestStatus.COMPLETED;
  this.completedAt = new Date();

  if (transactionId) {
    switch (this.payoutMethod) {
      case PayoutMethodType.STRIPE:
        this.stripeTransferId = transactionId;
        break;
      case PayoutMethodType.PAYPAL:
        this.paypalTransactionId = transactionId;
        break;
      default:
        this.paymentReference = transactionId;
    }
  }

  return this.save();
};

// Method to mark as failed
payoutSchema.methods.markAsFailed = async function (reason: string): Promise<IPayout> {
  if (![PayoutRequestStatus.APPROVED, PayoutRequestStatus.PROCESSING].includes(this.status)) {
    throw new Error('Only approved or processing payouts can be marked as failed');
  }

  this.status = PayoutRequestStatus.FAILED;
  this.failedAt = new Date();
  this.failureReason = reason;

  return this.save();
};

// Method to cancel payout
payoutSchema.methods.cancel = async function (reason?: string): Promise<IPayout> {
  if (![PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED].includes(this.status)) {
    throw new Error('Only pending or approved payouts can be cancelled');
  }

  this.status = PayoutRequestStatus.CANCELLED;
  if (reason) {
    this.adminNotes = reason;
  }

  return this.save();
};

// Static method to find payouts by vendor
payoutSchema.statics.findByVendor = function (
  vendorId: string,
  status?: PayoutRequestStatus
) {
  const query: any = { vendorId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ requestedAt: -1 });
};

// Static method to find pending payouts
payoutSchema.statics.findPending = function () {
  return this.find({ status: PayoutRequestStatus.PENDING })
    .populate('vendorId', 'businessName email phone') // Changed to match Vendor model fields
    .sort({ requestedAt: 1 });
};

// Interface for static methods
interface IPayoutModel extends mongoose.Model<IPayout> {
  findByVendor(vendorId: string, status?: PayoutRequestStatus): mongoose.Query<IPayout[], IPayout>;
  findPending(): mongoose.Query<IPayout[], IPayout>;
}

const Payout = mongoose.model<IPayout, IPayoutModel>('Payout', payoutSchema);

export default Payout;
