import mongoose, { Document, Schema } from "mongoose";

export enum SubscriptionPlan {
  BASIC = "basic",
  STANDARD = "standard",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  TRIALING = "trialing",
  EXPIRED = "expired",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export interface IPlanFeatures {
  maxEvents: number;
  maxPhotosPerEvent: number;
  maxVideoUploads: number;
  customBranding: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  bulkImport: boolean;
  whiteLabel: boolean;
  dedicatedManager: boolean;
  customIntegrations: boolean;
}

export interface IPlanPricing {
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  setupFee?: number;
  currency: string;
}

export interface IUsageTracking {
  eventsCreated: number;
  photosUploaded: number;
  videosUploaded: number;
  apiCallsThisMonth: number;
  storageUsedMB: number;
  bandwidthUsedGB: number;
  lastResetDate: Date;
}

export interface IVendorSubscription extends Document {
  vendorId: mongoose.Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;

  // Subscription timing
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  pausedAt?: Date;

  // Pricing and billing
  currentPricing: IPlanPricing;
  serviceFeeRate: number; // Percentage commission rate for this plan
  discountRate?: number; // Any negotiated discount
  promoCode?: string;

  // Plan features and limits
  planFeatures: IPlanFeatures;
  customFeatures?: {
    [key: string]: any;
  };

  // Usage tracking
  usageTracking: IUsageTracking;
  usageLimitWarnings: Array<{
    type: "events" | "storage" | "bandwidth" | "api_calls";
    threshold: number;
    notifiedAt: Date;
    resolved: boolean;
  }>;

  // Payment information
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  failedPaymentAttempts: number;

  // Add-ons and upgrades
  addOns: Array<{
    type:
      | "extra_events"
      | "extra_storage"
      | "extra_bandwidth"
      | "priority_listing";
    name: string;
    price: number;
    quantity: number;
    billingCycle: BillingCycle;
    addedAt: Date;
    expiresAt?: Date;
  }>;

  // Contract and enterprise features
  contractTerms?: {
    minimumCommitmentMonths: number;
    customCommissionRate?: number;
    customFeatures?: string[];
    signedDate: Date;
    signedBy: string;
  };

  // Admin notes and management
  adminNotes?: string;
  assignedAccountManager?: mongoose.Types.ObjectId;
  lastReviewDate?: Date;
  nextReviewDate?: Date;

  // Billing history reference
  invoices: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isActive(): boolean;
  canCreateEvent(): boolean;
  canUploadPhoto(): boolean;
  canUploadVideo(): boolean;
  getRemainingEvents(): number;
  getRemainingStorage(): number;
  calculateMonthlyRevenue(): number;
  upgradeToNextPlan(): Promise<IVendorSubscription>;
  pauseSubscription(reason?: string): Promise<IVendorSubscription>;
  cancelSubscription(reason?: string): Promise<IVendorSubscription>;
  resetUsageCounters(): void;
  addUsageWarning(type: string, threshold: number): void;
}

const VendorSubscriptionSchema = new Schema<IVendorSubscription>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor ID is required"],
      index: true,
    },
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: SubscriptionPlan.BASIC,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.TRIALING,
      required: true,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      default: BillingCycle.MONTHLY,
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    nextBillingDate: {
      type: Date,
      required: true,
      index: true,
    },
    trialEndsAt: {
      type: Date,
      index: true,
    },
    cancelledAt: {
      type: Date,
      index: true,
    },
    pausedAt: {
      type: Date,
    },
    currentPricing: {
      monthlyPrice: {
        type: Number,
        required: true,
        min: [0, "Monthly price cannot be negative"],
      },
      quarterlyPrice: {
        type: Number,
        required: true,
        min: [0, "Quarterly price cannot be negative"],
      },
      yearlyPrice: {
        type: Number,
        required: true,
        min: [0, "Yearly price cannot be negative"],
      },
      setupFee: {
        type: Number,
        default: 0,
        min: [0, "Setup fee cannot be negative"],
      },
      currency: {
        type: String,
        required: true,
        enum: ["AED", "USD", "EUR", "GBP"],
        default: "AED",
      },
    },
    serviceFeeRate: {
      type: Number,
      required: true,
      min: [0, "Service fee rate cannot be negative"],
      max: [50, "Service fee rate cannot exceed 50%"],
      default: 5,
    },
    discountRate: {
      type: Number,
      min: [0, "Discount rate cannot be negative"],
      max: [100, "Discount rate cannot exceed 100%"],
    },
    promoCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    planFeatures: {
      maxEvents: {
        type: Number,
        required: true,
        min: [1, "Max events must be at least 1"],
      },
      maxPhotosPerEvent: {
        type: Number,
        required: true,
        min: [1, "Max photos per event must be at least 1"],
      },
      maxVideoUploads: {
        type: Number,
        required: true,
        min: [0, "Max video uploads cannot be negative"],
      },
      customBranding: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      advancedAnalytics: {
        type: Boolean,
        default: false,
      },
      customDomain: {
        type: Boolean,
        default: false,
      },
      apiAccess: {
        type: Boolean,
        default: false,
      },
      bulkImport: {
        type: Boolean,
        default: false,
      },
      whiteLabel: {
        type: Boolean,
        default: false,
      },
      dedicatedManager: {
        type: Boolean,
        default: false,
      },
      customIntegrations: {
        type: Boolean,
        default: false,
      },
    },
    customFeatures: {
      type: Schema.Types.Mixed,
      default: {},
    },
    usageTracking: {
      eventsCreated: {
        type: Number,
        default: 0,
        min: [0, "Events created cannot be negative"],
      },
      photosUploaded: {
        type: Number,
        default: 0,
        min: [0, "Photos uploaded cannot be negative"],
      },
      videosUploaded: {
        type: Number,
        default: 0,
        min: [0, "Videos uploaded cannot be negative"],
      },
      apiCallsThisMonth: {
        type: Number,
        default: 0,
        min: [0, "API calls cannot be negative"],
      },
      storageUsedMB: {
        type: Number,
        default: 0,
        min: [0, "Storage used cannot be negative"],
      },
      bandwidthUsedGB: {
        type: Number,
        default: 0,
        min: [0, "Bandwidth used cannot be negative"],
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },
    usageLimitWarnings: [
      {
        type: {
          type: String,
          enum: ["events", "storage", "bandwidth", "api_calls"],
          required: true,
        },
        threshold: {
          type: Number,
          required: true,
          min: [0, "Threshold cannot be negative"],
        },
        notifiedAt: {
          type: Date,
          default: Date.now,
        },
        resolved: {
          type: Boolean,
          default: false,
        },
      },
    ],
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    paymentMethodId: {
      type: String,
      sparse: true,
    },
    lastPaymentDate: {
      type: Date,
      index: true,
    },
    lastPaymentAmount: {
      type: Number,
      min: [0, "Last payment amount cannot be negative"],
    },
    failedPaymentAttempts: {
      type: Number,
      default: 0,
      min: [0, "Failed payment attempts cannot be negative"],
    },
    addOns: [
      {
        type: {
          type: String,
          enum: [
            "extra_events",
            "extra_storage",
            "extra_bandwidth",
            "priority_listing",
          ],
          required: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Add-on price cannot be negative"],
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Add-on quantity must be at least 1"],
        },
        billingCycle: {
          type: String,
          enum: Object.values(BillingCycle),
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],
    contractTerms: {
      minimumCommitmentMonths: {
        type: Number,
        min: [1, "Minimum commitment must be at least 1 month"],
      },
      customCommissionRate: {
        type: Number,
        min: [0, "Custom commission rate cannot be negative"],
        max: [50, "Custom commission rate cannot exceed 50%"],
      },
      customFeatures: [String],
      signedDate: Date,
      signedBy: {
        type: String,
        trim: true,
      },
    },
    adminNotes: {
      type: String,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
    },
    assignedAccountManager: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastReviewDate: Date,
    nextReviewDate: Date,
    invoices: [
      {
        type: Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
VendorSubscriptionSchema.index({ vendorId: 1, status: 1 });
VendorSubscriptionSchema.index({ plan: 1, status: 1 });
VendorSubscriptionSchema.index({ nextBillingDate: 1, status: 1 });
VendorSubscriptionSchema.index({ endDate: 1, status: 1 });
// Removed explicit index - stripeSubscriptionId already has sparse index

// Virtual for monthly recurring revenue
VendorSubscriptionSchema.virtual("mrr").get(function (
  this: IVendorSubscription,
) {
  if (this.status !== SubscriptionStatus.ACTIVE) return 0;

  switch (this.billingCycle) {
    case BillingCycle.MONTHLY:
      return this.currentPricing.monthlyPrice;
    case BillingCycle.QUARTERLY:
      return this.currentPricing.quarterlyPrice / 3;
    case BillingCycle.YEARLY:
      return this.currentPricing.yearlyPrice / 12;
    default:
      return 0;
  }
});

// Method to check if subscription is active
VendorSubscriptionSchema.methods.isActive = function (): boolean {
  return this.status === SubscriptionStatus.ACTIVE && new Date() < this.endDate;
};

// Method to check if vendor can create events
VendorSubscriptionSchema.methods.canCreateEvent = function (): boolean {
  if (!this.isActive()) return false;
  return this.usageTracking.eventsCreated < this.planFeatures.maxEvents;
};

// Method to check if vendor can upload photos
VendorSubscriptionSchema.methods.canUploadPhoto = function (): boolean {
  if (!this.isActive()) return false;
  // For simplicity, assuming unlimited photos within storage limits
  return true;
};

// Method to check if vendor can upload videos
VendorSubscriptionSchema.methods.canUploadVideo = function (): boolean {
  if (!this.isActive()) return false;
  return this.usageTracking.videosUploaded < this.planFeatures.maxVideoUploads;
};

// Method to get remaining events
VendorSubscriptionSchema.methods.getRemainingEvents = function (): number {
  return Math.max(
    0,
    this.planFeatures.maxEvents - this.usageTracking.eventsCreated,
  );
};

// Method to get remaining storage
VendorSubscriptionSchema.methods.getRemainingStorage = function (): number {
  const storageLimit = this.getStorageLimit();
  return Math.max(0, storageLimit - this.usageTracking.storageUsedMB);
};

// Helper method to get storage limit based on plan
VendorSubscriptionSchema.methods.getStorageLimit = function (): number {
  switch (this.plan) {
    case SubscriptionPlan.BASIC:
      return 1000; // 1GB
    case SubscriptionPlan.STANDARD:
      return 5000; // 5GB
    case SubscriptionPlan.PREMIUM:
      return 20000; // 20GB
    case SubscriptionPlan.ENTERPRISE:
      return 100000; // 100GB
    default:
      return 1000;
  }
};

// Method to calculate monthly revenue from this subscription
VendorSubscriptionSchema.methods.calculateMonthlyRevenue = function (): number {
  if (this.status !== SubscriptionStatus.ACTIVE) return 0;

  let baseRevenue = 0;
  switch (this.billingCycle) {
    case BillingCycle.MONTHLY:
      baseRevenue = this.currentPricing.monthlyPrice;
      break;
    case BillingCycle.QUARTERLY:
      baseRevenue = this.currentPricing.quarterlyPrice / 3;
      break;
    case BillingCycle.YEARLY:
      baseRevenue = this.currentPricing.yearlyPrice / 12;
      break;
  }

  // Add add-on revenue
  const addOnRevenue = this.addOns.reduce((sum, addon) => {
    let addonMonthly = addon.price;
    if (addon.billingCycle === BillingCycle.QUARTERLY) {
      addonMonthly = addon.price / 3;
    } else if (addon.billingCycle === BillingCycle.YEARLY) {
      addonMonthly = addon.price / 12;
    }
    return sum + addonMonthly * addon.quantity;
  }, 0);

  return baseRevenue + addOnRevenue;
};

// Method to pause subscription
VendorSubscriptionSchema.methods.pauseSubscription = async function (
  reason?: string,
): Promise<IVendorSubscription> {
  this.status = SubscriptionStatus.INACTIVE;
  this.pausedAt = new Date();
  if (reason) {
    this.adminNotes = `${this.adminNotes || ""}\nPaused: ${reason} (${new Date().toISOString()})`;
  }
  return this.save();
};

// Method to cancel subscription
VendorSubscriptionSchema.methods.cancelSubscription = async function (
  reason?: string,
): Promise<IVendorSubscription> {
  this.status = SubscriptionStatus.CANCELLED;
  this.cancelledAt = new Date();
  if (reason) {
    this.adminNotes = `${this.adminNotes || ""}\nCancelled: ${reason} (${new Date().toISOString()})`;
  }
  return this.save();
};

// Method to reset usage counters (called monthly)
VendorSubscriptionSchema.methods.resetUsageCounters = function (): void {
  this.usageTracking.eventsCreated = 0;
  this.usageTracking.apiCallsThisMonth = 0;
  this.usageTracking.lastResetDate = new Date();
  // Note: Storage and bandwidth are cumulative, photos/videos might be cumulative too
};

// Method to add usage warning
VendorSubscriptionSchema.methods.addUsageWarning = function (
  type: string,
  threshold: number,
): void {
  this.usageLimitWarnings.push({
    type: type as any,
    threshold,
    notifiedAt: new Date(),
    resolved: false,
  });
};

// Pre-save middleware to set default plan features
VendorSubscriptionSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("plan")) {
    switch (this.plan) {
      case SubscriptionPlan.BASIC:
        this.planFeatures = {
          maxEvents: 5,
          maxPhotosPerEvent: 10,
          maxVideoUploads: 0,
          customBranding: false,
          prioritySupport: false,
          advancedAnalytics: false,
          customDomain: false,
          apiAccess: false,
          bulkImport: false,
          whiteLabel: false,
          dedicatedManager: false,
          customIntegrations: false,
        };
        this.serviceFeeRate = 8; // 8% for basic
        this.currentPricing = {
          monthlyPrice: 49,
          quarterlyPrice: 132, // 10% discount
          yearlyPrice: 470, // 20% discount
          currency: "AED",
        };
        break;

      case SubscriptionPlan.STANDARD:
        this.planFeatures = {
          maxEvents: 25,
          maxPhotosPerEvent: 25,
          maxVideoUploads: 5,
          customBranding: true,
          prioritySupport: true,
          advancedAnalytics: true,
          customDomain: false,
          apiAccess: true,
          bulkImport: true,
          whiteLabel: false,
          dedicatedManager: false,
          customIntegrations: false,
        };
        this.serviceFeeRate = 6; // 6% for standard
        this.currentPricing = {
          monthlyPrice: 149,
          quarterlyPrice: 402, // 10% discount
          yearlyPrice: 1432, // 20% discount
          currency: "AED",
        };
        break;

      case SubscriptionPlan.PREMIUM:
        this.planFeatures = {
          maxEvents: 100,
          maxPhotosPerEvent: 50,
          maxVideoUploads: 20,
          customBranding: true,
          prioritySupport: true,
          advancedAnalytics: true,
          customDomain: true,
          apiAccess: true,
          bulkImport: true,
          whiteLabel: true,
          dedicatedManager: true,
          customIntegrations: true,
        };
        this.serviceFeeRate = 4; // 4% for premium
        this.currentPricing = {
          monthlyPrice: 399,
          quarterlyPrice: 1077, // 10% discount
          yearlyPrice: 3832, // 20% discount
          currency: "AED",
        };
        break;

      case SubscriptionPlan.ENTERPRISE:
        this.planFeatures = {
          maxEvents: 999999, // Unlimited
          maxPhotosPerEvent: 999999, // Unlimited
          maxVideoUploads: 999999, // Unlimited
          customBranding: true,
          prioritySupport: true,
          advancedAnalytics: true,
          customDomain: true,
          apiAccess: true,
          bulkImport: true,
          whiteLabel: true,
          dedicatedManager: true,
          customIntegrations: true,
        };
        this.serviceFeeRate = this.contractTerms?.customCommissionRate || 2; // 2% for enterprise
        this.currentPricing = {
          monthlyPrice: 999,
          quarterlyPrice: 2698, // 10% discount
          yearlyPrice: 9592, // 20% discount
          currency: "AED",
        };
        break;
    }
  }
  next();
});

const VendorSubscription = mongoose.model<IVendorSubscription>(
  "VendorSubscription",
  VendorSubscriptionSchema,
);

export default VendorSubscription;
