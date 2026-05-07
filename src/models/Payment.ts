import mongoose, { Document, Schema } from "mongoose";

export enum PaymentGateway {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  RAZORPAY = "razorpay",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  DIGITAL_WALLET = "digital_wallet",
  BANK_TRANSFER = "bank_transfer",
  CASH = "cash",
}

export interface IPaymentRefund {
  refundId: string;
  amount: number;
  reason: string;
  status: "pending" | "completed" | "failed";
  processedAt?: Date;
  createdAt: Date;
}

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;

  // Gateway-specific fields
  paymentIntentId?: string;
  transactionId: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;

  // Payment details
  paymentDetails: {
    cardLast4?: string;
    cardBrand?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    bankName?: string;
    walletType?: string;
  };

  // Billing information
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Fees and charges
  platformFee: number;
  gatewayFee: number;
  netAmount: number;

  // Refund information
  refunds: IPaymentRefund[];
  totalRefunded: number;

  // Timestamps
  authorizedAt?: Date;
  capturedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;

  // Metadata and tracking
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;

  // Webhook and notification tracking
  webhookEvents: Array<{
    eventType: string;
    eventId: string;
    receivedAt: Date;
    processed: boolean;
  }>;

  // Security and fraud detection
  fraudScore?: number;
  fraudStatus?: "low_risk" | "medium_risk" | "high_risk" | "blocked";
  securityChecks: {
    cvvCheck?: "pass" | "fail" | "unavailable";
    avsCheck?: "pass" | "fail" | "partial" | "unavailable";
    threeDSecure?:
      | "authenticated"
      | "not_authenticated"
      | "attempted"
      | "unavailable";
  };

  createdAt: Date;
  updatedAt: Date;

  // Methods
  canBeRefunded(): boolean;
  processRefund(amount: number, reason: string): Promise<IPayment>;
  markAsCompleted(transactionId?: string): Promise<IPayment>;
  markAsFailed(reason?: string): Promise<IPayment>;
  addWebhookEvent(eventType: string, eventId: string): void;
  calculateRefundableAmount(): number;
}

const paymentRefundSchema = new Schema<IPaymentRefund>({
  refundId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, "Refund amount cannot be negative"],
  },
  reason: {
    type: String,
    required: true,
    maxlength: [500, "Refund reason cannot exceed 500 characters"],
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  processedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
    },
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: [true, "Payment gateway is required"],
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, "Payment method is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Payment amount cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      enum: ["AED", "EGP", "CAD", "USD"],
      default: "AED",
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },

    // Gateway-specific fields
    paymentIntentId: {
      type: String,
    },
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
    },
    gatewayTransactionId: String,
    gatewayOrderId: String,

    // Payment details
    paymentDetails: {
      cardLast4: String,
      cardBrand: {
        type: String,
        enum: [
          "visa",
          "mastercard",
          "amex",
          "discover",
          "diners",
          "jcb",
          "unionpay",
          "unknown",
        ],
      },
      cardExpMonth: {
        type: Number,
        min: 1,
        max: 12,
      },
      cardExpYear: {
        type: Number,
        min: 2024,
      },
      bankName: String,
      walletType: {
        type: String,
        enum: ["apple_pay", "google_pay", "samsung_pay", "paypal", "other"],
      },
    },

    // Billing information
    billingAddress: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
    },

    // Fees and charges
    platformFee: {
      type: Number,
      default: 0,
      min: [0, "Platform fee cannot be negative"],
    },
    gatewayFee: {
      type: Number,
      default: 0,
      min: [0, "Gateway fee cannot be negative"],
    },
    netAmount: {
      type: Number,
      required: true,
      min: [0, "Net amount cannot be negative"],
    },

    // Refund information
    refunds: [paymentRefundSchema],
    totalRefunded: {
      type: Number,
      default: 0,
      min: [0, "Total refunded cannot be negative"],
    },

    // Timestamps
    authorizedAt: Date,
    capturedAt: Date,
    failedAt: Date,
    cancelledAt: Date,

    // Metadata and tracking
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,

    // Webhook and notification tracking
    webhookEvents: [
      {
        eventType: {
          type: String,
          required: true,
        },
        eventId: {
          type: String,
          required: true,
        },
        receivedAt: {
          type: Date,
          default: Date.now,
        },
        processed: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Security and fraud detection
    fraudScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    fraudStatus: {
      type: String,
      enum: ["low_risk", "medium_risk", "high_risk", "blocked"],
    },
    securityChecks: {
      cvvCheck: {
        type: String,
        enum: ["pass", "fail", "unavailable"],
      },
      avsCheck: {
        type: String,
        enum: ["pass", "fail", "partial", "unavailable"],
      },
      threeDSecure: {
        type: String,
        enum: [
          "authenticated",
          "not_authenticated",
          "attempted",
          "unavailable",
        ],
      },
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

// Indexes for performance and uniqueness
paymentSchema.index({ userId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ paymentIntentId: 1 }, { sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gateway: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ gatewayTransactionId: 1 }, { sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 }); // Admin payment status + time queries

// Pre-save middleware to generate transaction ID and calculate fees
paymentSchema.pre("save", function (next) {
  // Generate transaction ID if not provided
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.transactionId = `PAY-${timestamp}-${random}`;
  }

  // Calculate net amount
  this.netAmount =
    this.amount - (this.platformFee || 0) - (this.gatewayFee || 0);

  next();
});

// Virtual for refundable amount
paymentSchema.virtual("refundableAmount").get(function () {
  return this.calculateRefundableAmount();
});

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function (): boolean {
  return (
    this.status === PaymentStatus.COMPLETED &&
    this.calculateRefundableAmount() > 0
  );
};

// Method to calculate refundable amount
paymentSchema.methods.calculateRefundableAmount = function (): number {
  return Math.max(0, this.amount - (this.totalRefunded || 0));
};

// Method to process refund
paymentSchema.methods.processRefund = async function (
  amount: number,
  reason: string,
): Promise<IPayment> {
  if (!this.canBeRefunded()) {
    throw new Error("Payment cannot be refunded");
  }

  const refundableAmount = this.calculateRefundableAmount();
  if (amount > refundableAmount) {
    throw new Error(
      `Refund amount cannot exceed refundable amount of ${refundableAmount}`,
    );
  }

  // Generate refund ID
  const refundId = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // Add refund record
  this.refunds.push({
    refundId,
    amount,
    reason,
    status: "pending",
    createdAt: new Date(),
  });

  // Update total refunded
  this.totalRefunded = (this.totalRefunded || 0) + amount;

  // Update payment status
  if (this.totalRefunded >= this.amount) {
    this.status = PaymentStatus.REFUNDED;
  } else {
    this.status = PaymentStatus.PARTIALLY_REFUNDED;
  }

  return this.save();
};

// Method to mark payment as completed
paymentSchema.methods.markAsCompleted = async function (
  transactionId?: string,
): Promise<IPayment> {
  this.status = PaymentStatus.COMPLETED;
  this.capturedAt = new Date();

  if (transactionId) {
    this.gatewayTransactionId = transactionId;
  }

  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markAsFailed = async function (
  reason?: string,
): Promise<IPayment> {
  this.status = PaymentStatus.FAILED;
  this.failedAt = new Date();

  if (reason) {
    this.metadata = { ...this.metadata, failureReason: reason };
  }

  return this.save();
};

// Method to add webhook event
paymentSchema.methods.addWebhookEvent = function (
  eventType: string,
  eventId: string,
): void {
  this.webhookEvents.push({
    eventType,
    eventId,
    receivedAt: new Date(),
    processed: false,
  });
};

// Static methods
paymentSchema.statics.findByUser = function (
  userId: string,
  status?: PaymentStatus,
) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

paymentSchema.statics.findByOrder = function (orderId: string) {
  return this.find({ orderId }).sort({ createdAt: -1 });
};

paymentSchema.statics.findSuccessful = function (
  startDate?: Date,
  endDate?: Date,
) {
  const query: any = { status: PaymentStatus.COMPLETED };

  if (startDate || endDate) {
    query.capturedAt = {};
    if (startDate) query.capturedAt.$gte = startDate;
    if (endDate) query.capturedAt.$lte = endDate;
  }

  return this.find(query).sort({ capturedAt: -1 });
};

const Payment = mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;
