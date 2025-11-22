import mongoose, { Schema, Document } from 'mongoose';

// Enums
export enum CommissionTransactionStatus {
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum CommissionRecipientType {
  VENDOR = 'vendor',
  AFFILIATE = 'affiliate',
  REFERRER = 'referrer',
  PLATFORM = 'platform'
}

// Interfaces
export interface ICommissionDetail {
  recipientId: mongoose.Types.ObjectId | string;
  recipient: string;
  recipientType: CommissionRecipientType;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  percentage: number;
  rule: string;
}

export interface ICommissionTransaction extends Document {
  transactionId: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  commissionConfigId: mongoose.Types.ObjectId;
  originalAmount: number;
  totalCommissionAmount: number;
  platformCommission: number;
  vendorCommission: number;
  commissions: ICommissionDetail[];
  status: CommissionTransactionStatus;
  calculatedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  approve(adminId: mongoose.Types.ObjectId): Promise<ICommissionTransaction>;
  markAsPaid(): Promise<ICommissionTransaction>;
  cancel(reason: string): Promise<ICommissionTransaction>;
}

// Commission Transaction Schema
const CommissionTransactionSchema = new Schema<ICommissionTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor', // Changed from 'User' to 'Vendor'
      required: true,
      index: true
    },
    vendorName: {
      type: String,
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true
    },
    commissionConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommissionConfig',
      required: true
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalCommissionAmount: {
      type: Number,
      required: true,
      min: 0
    },
    platformCommission: {
      type: Number,
      required: true,
      min: 0
    },
    vendorCommission: {
      type: Number,
      required: true,
      min: 0
    },
    commissions: [
      {
        recipientId: {
          type: mongoose.Schema.Types.Mixed,
          required: true
        },
        recipient: {
          type: String,
          required: true
        },
        recipientType: {
          type: String,
          enum: Object.values(CommissionRecipientType),
          required: true
        },
        grossAmount: {
          type: Number,
          required: true,
          min: 0
        },
        deductions: {
          type: Number,
          default: 0,
          min: 0
        },
        netAmount: {
          type: Number,
          required: true,
          min: 0
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        },
        rule: {
          type: String,
          required: true
        }
      }
    ],
    status: {
      type: String,
      enum: Object.values(CommissionTransactionStatus),
      default: CommissionTransactionStatus.CALCULATED,
      required: true,
      index: true
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paidAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes
CommissionTransactionSchema.index({ status: 1, createdAt: -1 });
CommissionTransactionSchema.index({ vendorId: 1, status: 1 });
CommissionTransactionSchema.index({ calculatedAt: -1 });
CommissionTransactionSchema.index({ 'commissions.recipientId': 1 });

// Methods

/**
 * Approve commission transaction
 */
CommissionTransactionSchema.methods.approve = async function (
  adminId: mongoose.Types.ObjectId
): Promise<ICommissionTransaction> {
  if (this.status !== CommissionTransactionStatus.CALCULATED) {
    throw new Error('Only calculated commissions can be approved');
  }

  this.status = CommissionTransactionStatus.APPROVED;
  this.approvedAt = new Date();
  this.approvedBy = adminId;

  return await this.save();
};

/**
 * Mark commission as paid
 */
CommissionTransactionSchema.methods.markAsPaid = async function (): Promise<ICommissionTransaction> {
  if (this.status !== CommissionTransactionStatus.APPROVED) {
    throw new Error('Only approved commissions can be marked as paid');
  }

  this.status = CommissionTransactionStatus.PAID;
  this.paidAt = new Date();

  return await this.save();
};

/**
 * Cancel commission transaction
 */
CommissionTransactionSchema.methods.cancel = async function (reason: string): Promise<ICommissionTransaction> {
  if (this.status === CommissionTransactionStatus.PAID) {
    throw new Error('Paid commissions cannot be cancelled');
  }

  this.status = CommissionTransactionStatus.CANCELLED;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;

  return await this.save();
};

// Static Methods

/**
 * Generate unique transaction ID
 */
CommissionTransactionSchema.statics.generateTransactionId = async function (): Promise<string> {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `COM-${timestamp}-${random}`;
};

const CommissionTransaction = mongoose.model<ICommissionTransaction>(
  'CommissionTransaction',
  CommissionTransactionSchema
);

export default CommissionTransaction;
