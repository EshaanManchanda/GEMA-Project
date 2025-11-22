import mongoose, { Document, Schema } from 'mongoose';

export interface ICancellationLog extends Document {
  // Reference IDs
  orderId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Who initiated the cancellation
  customerId?: mongoose.Types.ObjectId; // The affected customer

  // Cancellation details
  type: 'order_cancellation' | 'event_cancellation';
  cancellationType: 'user_requested' | 'event_cancelled' | 'admin_cancelled';
  reason: string;

  // Financial details
  originalAmount: number;
  refundAmount: number;
  serviceFee: number;
  tax: number;
  currency: string;

  // Refund tracking
  refundStatus: 'pending' | 'processing' | 'completed' | 'failed';
  refundTransactionId?: string;
  refundProcessedAt?: Date;
  refundFailureReason?: string;

  // Notification tracking
  notificationStatus: {
    email: {
      sent: boolean;
      sentAt?: Date;
      status?: 'pending' | 'sent' | 'delivered' | 'failed';
    };
    sms: {
      sent: boolean;
      sentAt?: Date;
      status?: 'pending' | 'sent' | 'delivered' | 'failed';
    };
    push: {
      sent: boolean;
      sentAt?: Date;
      status?: 'pending' | 'sent' | 'delivered' | 'failed';
    };
  };

  // Metadata
  metadata?: {
    eventTitle?: string;
    orderNumber?: string;
    customerEmail?: string;
    customerPhone?: string;
    [key: string]: any;
  };

  createdAt: Date;
  updatedAt: Date;
}

const cancellationLogSchema = new Schema<ICancellationLog>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['order_cancellation', 'event_cancellation'],
      required: [true, 'Cancellation type is required'],
    },
    cancellationType: {
      type: String,
      enum: ['user_requested', 'event_cancelled', 'admin_cancelled'],
      required: [true, 'Cancellation type detail is required'],
    },
    reason: {
      type: String,
      required: [true, 'Cancellation reason is required'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    originalAmount: {
      type: Number,
      required: [true, 'Original amount is required'],
      min: [0, 'Original amount cannot be negative'],
    },
    refundAmount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount cannot be negative'],
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: [0, 'Service fee cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['INR', 'AED', 'USD', 'EUR', 'GBP', 'EGP', 'CAD'],
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    refundTransactionId: {
      type: String,
      trim: true,
    },
    refundProcessedAt: {
      type: Date,
    },
    refundFailureReason: {
      type: String,
      maxlength: [500, 'Failure reason cannot exceed 500 characters'],
    },
    notificationStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
        },
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
        },
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
        },
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
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
  }
);

// Indexes for efficient querying
cancellationLogSchema.index({ orderId: 1 });
cancellationLogSchema.index({ eventId: 1 });
cancellationLogSchema.index({ userId: 1 });
cancellationLogSchema.index({ customerId: 1 });
cancellationLogSchema.index({ type: 1 });
cancellationLogSchema.index({ refundStatus: 1 });
cancellationLogSchema.index({ createdAt: -1 });
cancellationLogSchema.index({ eventId: 1, type: 1 }); // For event cancellation queries
cancellationLogSchema.index({ refundStatus: 1, createdAt: -1 }); // For pending refunds

// Static method to find cancellations by event
cancellationLogSchema.statics.findByEvent = function (eventId: string) {
  return this.find({ eventId }).sort({ createdAt: -1 });
};

// Static method to find pending refunds
cancellationLogSchema.statics.findPendingRefunds = function () {
  return this.find({ refundStatus: { $in: ['pending', 'processing'] } }).sort({ createdAt: 1 });
};

// Static method to find failed refunds for retry
cancellationLogSchema.statics.findFailedRefunds = function () {
  return this.find({ refundStatus: 'failed' }).sort({ createdAt: 1 });
};

const CancellationLog = mongoose.model<ICancellationLog>('CancellationLog', cancellationLogSchema);

export default CancellationLog;
