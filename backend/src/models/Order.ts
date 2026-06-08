import mongoose, { Document, Schema } from "mongoose";
import logger from "../config/logger";

// Participant interface for events requiring participant info
export interface IParticipant {
  name: string;
  age?: number;
  gender?: "male" | "female" | "other";
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialRequirements?: string;
  // Dynamic registration form data (from form builder)
  registrationData?: Array<{
    fieldId: string;
    fieldLabel: string;
    fieldType: string;
    value: any;
  }>;
}

export interface IOrderItem {
  eventId: mongoose.Types.ObjectId;

  eventTitle: string;
  scheduleDate: Date;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  participants?: IParticipant[];
  scheduleId?: mongoose.Types.ObjectId;
  _id?: mongoose.Types.ObjectId;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;

  // Multi-currency support (display vs charged)
  displayCurrency?: string;
  displayAmount?: number;
  exchangeRate?: number;
  chargedCurrency?: string;
  chargedAmount?: number;

  status: "pending" | "confirmed" | "cancelled" | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "free";
  paymentMethod?: "stripe" | "paypal" | "razorpay" | "test" | "free";
  paymentIntentId?: string;
  paymentIntentClientSecret?: string;
  transactionId?: string;
  affiliateCode?: string;
  couponCode?: string;
  couponDiscount?: number;
  serviceFee?: number;
  serviceFeeRate?: number;
  taxRate?: number;

  // Vendor management fields
  vendorNotes?: string;
  vendorStatus?: "processing" | "preparing" | "ready" | "completed" | "issue";
  isFulfilled?: boolean;
  lastModifiedBy?: mongoose.Types.ObjectId;
  lastModifiedAt?: Date;

  // Payment routing fields
  paymentRouting: {
    usesVendorStripe: boolean;
    vendorStripeAccountId?: string;
    platformCommission?: number;
    vendorPayout?: number;
    stripeApplicationFee?: number;
  };
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
  notes?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;

  // Enhanced refund tracking
  refundStatus?: "pending" | "processing" | "completed" | "failed";
  refundTransactionId?: string;
  cancellationType?: "user_requested" | "event_cancelled" | "admin_cancelled";
  serviceFeeRefunded?: boolean; // Track if service fee was refunded (should be false by policy)

  // Enhanced features from Booking model
  specialRequests?: string;
  accessibilityNeeds?: string[];
  dietaryRestrictions?: string[];

  // Admin commission tracking
  adminCommission: {
    rate: number;
    amount: number;
    revenueTransactionId?: mongoose.Types.ObjectId;
    calculatedAt: Date;
  };

  // Revenue metadata
  revenueMetadata: {
    revenueStream: "booking" | "addon" | "subscription";
    category?: string;
    vendorSubscriptionTier?: string;
    commissionSource: "platform_fee" | "service_fee" | "addon_fee";
  };

  // Check-in functionality
  checkIn?: {
    checkedInAt: Date;
    checkedInBy: mongoose.Types.ObjectId;
    notes?: string;
  };

  // Communication logs
  communications: Array<{
    type: "email" | "sms" | "push" | "call";
    subject?: string;
    message: string;
    sentAt: Date;
    status: "sent" | "delivered" | "failed" | "bounced";
    metadata?: any;
  }>;

  // Source tracking
  source: "web" | "mobile" | "admin" | "vendor";
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsPaid(transactionId?: string, paymentMethod?: string): Promise<IOrder>;
  confirm(): Promise<IOrder>;
  cancel(reason?: string): Promise<IOrder>;
  refund(amount: number, reason?: string): Promise<IOrder>;
  checkInOrder(
    checkedInBy: mongoose.Types.ObjectId,
    notes?: string,
  ): Promise<IOrder>;
  addCommunication(type: string, message: string, subject?: string): void;
  calculateRefundAmount(
    cancellationType?: "user_requested" | "event_cancelled" | "admin_cancelled",
  ): number;
  canBeCancelledByCustomer(): { canCancel: boolean; reason?: string };
  calculateAdminCommission(rate?: number): Promise<number>;
  createRevenueTransaction(): Promise<mongoose.Types.ObjectId>;
  updateCommissionTracking(): Promise<IOrder>;
}

const orderItemSchema = new Schema<IOrderItem>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    required: [true, "Event ID is required"],
  },

  eventTitle: {
    type: String,
    required: [true, "Event title is required"],
    trim: true,
  },
  scheduleDate: {
    type: Date,
    required: [true, "Schedule date is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
    max: [50, "Quantity cannot exceed 50"],
  },
  unitPrice: {
    type: Number,
    required: [true, "Unit price is required"],
    min: [0, "Unit price cannot be negative"],
  },
  totalPrice: {
    type: Number,
    required: [true, "Total price is required"],
    min: [0, "Total price cannot be negative"],
  },
  currency: {
    type: String,
    required: [true, "Currency is required"],
    enum: ["INR", "AED", "USD", "EUR", "GBP", "EGP", "CAD"],
  },
  participants: [
    {
      name: {
        type: String,
        required: [true, "Participant name is required"],
        trim: true,
      },
      age: {
        type: Number,
        required: [true, "Participant age is required"],
        min: 0,
        max: 120,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      allergies: [String],
      medicalConditions: [String],
      emergencyContact: {
        name: {
          type: String,
          required: function (this: any) {
            return this.age < 18;
          },
        },
        relationship: {
          type: String,
          required: function (this: any) {
            return this.age < 18;
          },
        },
        phone: {
          type: String,
          required: function (this: any) {
            return this.age < 18;
          },
        },
      },
      specialRequirements: String,
      // Dynamic registration form data (from form builder)
      registrationData: [
        {
          fieldId: {
            type: String,
            required: true,
          },
          fieldLabel: {
            type: String,
            required: true,
          },
          fieldType: {
            type: String,
            required: true,
          },
          value: {
            type: Schema.Types.Mixed,
            required: true,
          },
        },
      ],
    },
  ],
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: "Event.dateSchedule",
    required: false,
  },
});

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    orderNumber: {
      type: String,
      required: false, // Auto-generated by pre-save middleware
      trim: true,
      unique: false,
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Order items are required"],
      validate: {
        validator: function (v: IOrderItem[]) {
          return v.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      enum: ["INR", "AED", "USD", "EUR", "GBP", "EGP", "CAD"],
      default: "INR",
    },

    // Multi-currency support fields
    displayCurrency: {
      type: String,
      enum: ["INR", "AED", "USD", "EUR", "GBP", "EGP", "CAD"],
    },
    displayAmount: {
      type: Number,
      min: [0, "Display amount cannot be negative"],
    },
    exchangeRate: {
      type: Number,
      min: [0, "Exchange rate cannot be negative"],
    },
    chargedCurrency: {
      type: String,
      enum: ["INR", "AED", "USD", "EUR", "GBP", "EGP", "CAD"],
      default: "INR", // Always INR for Indian Stripe account
    },
    chargedAmount: {
      type: Number,
      min: [0, "Charged amount cannot be negative"],
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "free"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "razorpay", "test", "free"],
    },
    paymentIntentId: {
      type: String,
      trim: true,
    },
    paymentIntentClientSecret: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    affiliateCode: {
      type: String,
      trim: true,
    },
    couponCode: {
      type: String,
      trim: true,
    },
    couponDiscount: {
      type: Number,
      min: [0, "Coupon discount cannot be negative"],
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: [0, "Service fee cannot be negative"],
    },
    serviceFeeRate: {
      type: Number,
      default: 5,
      min: [0, "Service fee rate cannot be negative"],
      max: [100, "Service fee rate cannot exceed 100%"],
    },
    taxRate: {
      type: Number,
      default: 5,
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
    },
    // Vendor management fields
    vendorNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Vendor notes cannot exceed 500 characters"],
    },
    vendorStatus: {
      type: String,
      enum: ["processing", "preparing", "ready", "completed", "issue"],
      default: "processing",
    },
    isFulfilled: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedAt: {
      type: Date,
    },
    paymentRouting: {
      usesVendorStripe: {
        type: Boolean,
        default: false,
        required: true,
      },
      vendorStripeAccountId: {
        type: String,
        sparse: true,
      },
      platformCommission: {
        type: Number,
        default: 0,
        min: [0, "Platform commission cannot be negative"],
      },
      vendorPayout: {
        type: Number,
        default: 0,
        min: [0, "Vendor payout cannot be negative"],
      },
      stripeApplicationFee: {
        type: Number,
        default: 0,
        min: [0, "Stripe application fee cannot be negative"],
      },
    },
    billingAddress: {
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: [true, "Phone is required"],
        trim: true,
      },
      address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
        default: "TBD",
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        default: "TBD",
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
        default: "TBD",
      },
      zipCode: {
        type: String,
        required: [true, "Zip code is required"],
        trim: true,
        default: "00000",
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
      },
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    refundAmount: {
      type: Number,
      min: [0, "Refund amount cannot be negative"],
    },
    refundReason: {
      type: String,
      maxlength: [200, "Refund reason cannot exceed 200 characters"],
    },
    refundedAt: Date,
    confirmedAt: Date,
    cancelledAt: Date,

    // Enhanced refund tracking
    refundStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
    },
    refundTransactionId: {
      type: String,
      trim: true,
    },
    cancellationType: {
      type: String,
      enum: ["user_requested", "event_cancelled", "admin_cancelled"],
    },
    serviceFeeRefunded: {
      type: Boolean,
      default: false,
    },

    // Enhanced features
    specialRequests: {
      type: String,
      maxlength: [1000, "Special requests cannot exceed 1000 characters"],
    },
    accessibilityNeeds: [String],
    dietaryRestrictions: [String],

    // Check-in functionality
    checkIn: {
      checkedInAt: Date,
      checkedInBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      notes: String,
    },

    // Communication logs
    communications: [
      {
        type: {
          type: String,
          enum: ["email", "sms", "push", "call"],
          required: true,
        },
        subject: String,
        message: {
          type: String,
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["sent", "delivered", "failed", "bounced"],
          default: "sent",
        },
        metadata: Schema.Types.Mixed,
      },
    ],

    // Source tracking
    source: {
      type: String,
      enum: ["web", "mobile", "admin", "vendor"],
      default: "web",
    },
    userAgent: String,
    ipAddress: String,
    referrer: String,

    // Admin commission tracking
    adminCommission: {
      rate: {
        type: Number,
        required: true,
        min: [0, "Commission rate cannot be negative"],
        max: [100, "Commission rate cannot exceed 100%"],
        default: 5,
      },
      amount: {
        type: Number,
        required: true,
        min: [0, "Commission amount cannot be negative"],
        default: 0,
      },
      revenueTransactionId: {
        type: Schema.Types.ObjectId,
        ref: "RevenueTransaction",
      },
      calculatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // Revenue metadata
    revenueMetadata: {
      revenueStream: {
        type: String,
        enum: ["booking", "addon", "subscription"],
        default: "booking",
        required: true,
      },
      category: {
        type: String,
        trim: true,
      },
      vendorSubscriptionTier: {
        type: String,
        enum: ["basic", "standard", "premium", "enterprise"],
      },
      commissionSource: {
        type: String,
        enum: ["platform_fee", "service_fee", "addon_fee"],
        default: "platform_fee",
        required: true,
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

// Indexes for performance
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentIntentId: 1 }, { sparse: true });
orderSchema.index({ transactionId: 1 }, { sparse: true });
orderSchema.index({ affiliateCode: 1 }, { sparse: true });
orderSchema.index({ couponCode: 1 }, { sparse: true });

// Compound indexes for common query patterns
orderSchema.index({ userId: 1, status: 1 }); // User orders by status
orderSchema.index({ userId: 1, createdAt: -1 }); // User recent orders
orderSchema.index({ status: 1, createdAt: -1 }); // Recent orders by status
orderSchema.index({ paymentStatus: 1, createdAt: -1 }); // Orders by payment status
orderSchema.index({ "items.eventId": 1 }); // Orders by event
orderSchema.index({ userId: 1, paymentStatus: 1 }); // User orders by payment status

// Additional indexes for KVM1 optimization - faster dashboard revenue queries
orderSchema.index({ paymentStatus: 1, "items.eventId": 1 }); // Event revenue lookup by paid status
orderSchema.index({ createdAt: 1, paymentStatus: 1, total: 1 }); // Revenue trends over time
orderSchema.index(
  { userId: 1, "items.eventId": 1, status: 1, createdAt: -1 },
  { name: "idempotency_lookup" },
); // Idempotency check in initiateBooking

// Pre-save middleware to generate order number
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const timestamp = new Date().getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.orderNumber = `GM-${timestamp}-${random}`;
  }
  next();
});

// Pre-save middleware to calculate totals and commission
orderSchema.pre("save", async function (next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Free bookings: total must stay 0 — skip recalculation so the pre-save
  // hook doesn't override the controller's intentional zero total.
  const isFreeOrder =
    this.paymentMethod === "free" ||
    this.paymentStatus === "free" ||
    (this.paymentIntentId as string)?.startsWith("free_pi_");

  if (!isFreeOrder) {
    // Calculate total (subtotal + tax - discount - couponDiscount)
    this.total =
      this.subtotal +
      (this.tax || 0) +
      (this.serviceFee || 0) -
      (this.discount || 0) -
      (this.couponDiscount || 0);

    // Ensure total is not negative
    if (this.total < 0) {
      this.total = 0;
    }
  }

  // Calculate admin commission if not already set (now async)
  if (
    this.isNew ||
    this.isModified("total") ||
    this.isModified("adminCommission.rate")
  ) {
    this.adminCommission.amount = await this.calculateAdminCommission();
    this.adminCommission.calculatedAt = new Date();
  }

  next();
});

// Method to mark order as confirmed
orderSchema.methods.confirm = function () {
  this.status = "confirmed";
  this.confirmedAt = new Date();
  // Free orders: also mark paymentStatus so it doesn't stay "pending"
  if (
    this.paymentStatus === "pending" &&
    (this.total === 0 ||
      this.paymentMethod === "free" ||
      (this.paymentIntentId as string)?.startsWith("free_pi_"))
  ) {
    this.paymentStatus = "free";
  }
  return this.save();
};

// Method to mark order as cancelled
orderSchema.methods.cancel = function (reason?: string) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  if (reason) {
    this.notes = reason;
  }
  return this.save();
};

// Method to mark payment as paid
orderSchema.methods.markAsPaid = async function (
  transactionId?: string,
  paymentMethod?: string,
) {
  this.paymentStatus = "paid";
  if (transactionId) {
    this.transactionId = transactionId;
  }
  if (paymentMethod) {
    this.paymentMethod = paymentMethod as any;
  }

  // Save the order first
  await this.save();

  // Automatically create revenue transaction when order is marked as paid
  try {
    if (!this.adminCommission.revenueTransactionId) {
      logger.info(`Creating revenue transaction for order ${this._id}`);
      const revenueTransactionId = await this.createRevenueTransaction();
      this.adminCommission.revenueTransactionId = revenueTransactionId;
      await this.save();
    }
  } catch (error) {
    logger.error(
      `Failed to create revenue transaction for order ${this._id}:`,
      error,
    );
    // Don't fail the payment marking if revenue transaction creation fails
    // This can be retried later
  }

  return this;
};

// Method to process refund
orderSchema.methods.refund = function (amount: number, reason?: string) {
  this.status = "refunded";
  this.paymentStatus = "refunded";
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();

  // Add communication log
  this.addCommunication(
    "email",
    `Your order has been refunded. Amount: ${this.currency} ${amount}${reason ? ". Reason: " + reason : ""}`,
    "Order Refunded",
  );

  return this.save();
};

// Method to check in order (for events)
orderSchema.methods.checkInOrder = function (
  checkedInBy: mongoose.Types.ObjectId,
  notes?: string,
) {
  if (
    this.status !== "confirmed" ||
    !["paid", "free"].includes(this.paymentStatus)
  ) {
    throw new Error("Order must be confirmed and paid (or free) to check in");
  }

  this.checkIn = {
    checkedInAt: new Date(),
    checkedInBy,
    notes,
  };

  // Add communication log
  this.addCommunication("system", "Successfully checked in for event");

  return this.save();
};

// Method to add communication log
orderSchema.methods.addCommunication = function (
  type: string,
  message: string,
  subject?: string,
) {
  this.communications.push({
    type,
    subject,
    message,
    sentAt: new Date(),
    status: "sent",
  });
};

// Method to calculate admin commission
orderSchema.methods.calculateAdminCommission = async function (
  rate?: number,
): Promise<number> {
  try {
    // If rate is explicitly provided, use it
    if (rate !== undefined) {
      return (this.total * rate) / 100;
    }

    // Get the vendor to check their payment settings
    const Event = mongoose.model("Event");
    const User = mongoose.model("User");

    const firstEvent = await Event.findById(this.items[0]?.eventId).select(
      "vendorId",
    );
    if (!firstEvent) {
      // Fallback to default rate if event not found
      return (this.total * (this.adminCommission?.rate || 5)) / 100;
    }

    const vendor = await User.findById(firstEvent.vendorId).select(
      "vendorPaymentSettings",
    );
    if (!vendor) {
      // Fallback to default rate if vendor not found
      return (this.total * (this.adminCommission?.rate || 5)) / 100;
    }

    // Determine commission based on vendor payment setup
    if (
      vendor.vendorPaymentSettings?.hasCustomStripeAccount &&
      vendor.vendorPaymentSettings?.subscriptionActive
    ) {
      // Vendor uses their own Stripe account and has active subscription
      // Return 0 commission, but subscription fee will be charged separately
      return 0;
    } else {
      // Vendor uses platform payment gateway - charge commission
      const commissionRate = vendor.vendorPaymentSettings?.commissionRate || 5; // Default 5%
      return (this.total * commissionRate) / 100;
    }
  } catch (error) {
    logger.error("Error calculating admin commission:", error);
    // Fallback to default rate on error
    return (this.total * (this.adminCommission?.rate || 5)) / 100;
  }
};

// Method to create revenue transaction
orderSchema.methods.createRevenueTransaction =
  async function (): Promise<mongoose.Types.ObjectId> {
    const RevenueTransaction = mongoose.model("RevenueTransaction");

    // Get vendor from first item (assuming all items are from same vendor)
    const Event = mongoose.model("Event");
    const firstEvent = await Event.findById(this.items[0]?.eventId);

    if (!firstEvent) {
      throw new Error("Event not found for revenue transaction");
    }

    const revenueTransaction = new RevenueTransaction({
      orderId: this._id,
      vendorId: firstEvent.vendorId,
      customerId: this.userId,
      totalAmount: this.total,
      adminCommission: this.adminCommission.amount,
      vendorPayout: this.total - this.adminCommission.amount,
      serviceFeeRate: this.adminCommission.rate,
      currency: this.currency,
      revenueStream: this.revenueMetadata.revenueStream,
      category: this.revenueMetadata.category,
      description: `Order ${this.orderNumber} - ${this.items.length} item(s)`,
      status: this.paymentStatus === "paid" ? "completed" : "pending",
      payoutStatus: "pending",
      transactionDate: new Date(),
      payoutEligibleAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        orderNumber: this.orderNumber,
        itemCount: this.items.length,
        commissionSource: this.revenueMetadata.commissionSource,
        vendorSubscriptionTier: this.revenueMetadata.vendorSubscriptionTier,
      },
    });

    await revenueTransaction.save();
    return revenueTransaction._id;
  };

// Method to update commission tracking
orderSchema.methods.updateCommissionTracking =
  async function (): Promise<IOrder> {
    if (!this.adminCommission.revenueTransactionId) {
      this.adminCommission.revenueTransactionId =
        await this.createRevenueTransaction();
    }
    return this.save();
  };

// Method to calculate refund amount based on cancellation policy
// Policy: Event price is refundable, 10% service charge is NOT refundable
// Customer can only cancel 24 hours or more before event
orderSchema.methods.calculateRefundAmount = function (
  cancellationType?:
    | "user_requested"
    | "event_cancelled"
    | "admin_cancelled"
    | "teaching_event_cancelled",
): number {
  if (this.paymentStatus !== "paid") {
    return 0;
  }

  // Find the earliest event date in the order
  const earliestEventDate = this.items.reduce(
    (earliest: Date, item: IOrderItem) => {
      return item.scheduleDate < earliest ? item.scheduleDate : earliest;
    },
    this.items[0]?.scheduleDate || new Date(),
  );

  const now = new Date();
  const timeDiff = earliestEventDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);

  // For user-requested cancellations, must be at least 24 hours before event
  if (cancellationType === "user_requested" && hoursDiff < 24) {
    return 0; // No refund if less than 24 hours before event
  }

  // Calculate the event price (subtotal) without the service fee
  const eventPrice = this.subtotal - (this.couponDiscount || 0);

  // Service fee (10%) is NOT refundable
  // Refund only the event price portion
  const refundAmount = eventPrice;

  return Math.max(0, refundAmount);
};

// Method to check if order can be cancelled by customer
orderSchema.methods.canBeCancelledByCustomer = function (): {
  canCancel: boolean;
  reason?: string;
} {
  // Already cancelled or refunded - cannot cancel
  if (this.status === "cancelled" || this.status === "refunded") {
    return {
      canCancel: false,
      reason: "Order is already cancelled or refunded",
    };
  }

  // Completed orders cannot be cancelled
  if (this.status === "completed") {
    return { canCancel: false, reason: "Completed orders cannot be cancelled" };
  }

  // Pending orders can always be cancelled (no payment made yet)
  if (this.status === "pending") {
    return { canCancel: true };
  }

  // Confirmed orders - check 24-hour rule before event
  if (this.status === "confirmed") {
    // Find the earliest event date
    const earliestEventDate = this.items.reduce(
      (earliest: Date, item: IOrderItem) => {
        return item.scheduleDate < earliest ? item.scheduleDate : earliest;
      },
      this.items[0]?.scheduleDate || new Date(),
    );

    const now = new Date();
    const timeDiff = earliestEventDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 24) {
      return {
        canCancel: false,
        reason: "Cannot cancel within 24 hours of the event",
      };
    }

    return { canCancel: true };
  }

  // Default: cannot cancel
  return { canCancel: false, reason: "Order cannot be cancelled" };
};

// Static method to find orders by user
orderSchema.statics.findByUser = function (userId: string, status?: string) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find orders by payment status
orderSchema.statics.findByPaymentStatus = function (paymentStatus: string) {
  return this.find({ paymentStatus }).sort({ createdAt: -1 });
};

// Virtual for total ticket count
orderSchema.virtual("totalTickets").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Instance method implementations
// NOTE: This is a duplicate - the main implementation is above
// Keeping for backwards compatibility, but it delegates to the method defined earlier

orderSchema.methods.confirm = async function () {
  this.status = "confirmed";
  this.confirmedAt = new Date();

  // Save the order first
  await this.save();

  // Import and generate tickets using the new service
  const { TicketGenerationService } =
    await import("../services/ticketGeneration.service");
  const result = await TicketGenerationService.generateTicketsForOrder(
    this._id,
    {
      sendEmail: true,
      skipExisting: true,
    },
  );

  // Log ticket generation result but don't fail order confirmation
  if (result.success) {
    logger.info(
      `Successfully generated ${result.totalGenerated} tickets for order ${this._id}`,
    );
  } else {
    logger.error(
      `Failed to generate tickets for order ${this._id}:`,
      result.errors,
    );
  }

  return this;
};

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
