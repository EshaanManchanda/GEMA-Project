import mongoose, { Document, Schema } from "mongoose";
import { SUPPORTED_CURRENCIES } from "../services/currency.service";

//============ ENUMS ============

export enum TeacherSubscriptionPlan {
  BASIC = "basic",
  STANDARD = "standard",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export enum TeacherSubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  TRIALING = "trialing",
  EXPIRED = "expired",
  PENDING = "pending",
  SUSPENDED = "suspended",
  GRACE_PERIOD = "grace_period",
}

export enum TeacherBillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

// ============ INTERFACES ============

export interface ITeacherPlanFeatures {
  maxClasses: number;
  maxStudents: number;
  maxVideoUploads: number;
  advancedAnalytics: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  bulkImport: boolean;
  whiteLabel: boolean;
  customIntegrations: boolean;
}

export interface ITeacherPlanPricing {
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  setupFee?: number;
  currency: keyof typeof SUPPORTED_CURRENCIES;
}

export interface ITeacherUsageTracking {
  classesCreated: number;
  studentsEnrolled: number;
  videosUploaded: number;
  apiCallsThisMonth: number;
  storageUsedMB: number;
  bandwidthUsedGB: number;
  lastResetDate: Date;
}

/* ============================
   MAIN DOCUMENT INTERFACE
============================ */

export interface ITeacherSubscription extends Document {
  teacherId: mongoose.Types.ObjectId;

  plan: TeacherSubscriptionPlan;
  status: TeacherSubscriptionStatus;
  billingCycle: TeacherBillingCycle;

  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  pausedAt?: Date;

  currentPricing: ITeacherPlanPricing;
  serviceFeeRate: number;
  discountRate?: number;
  promoCode?: string;

  planFeatures: ITeacherPlanFeatures;
  customFeatures?: Record<string, any>;

  usageTracking: ITeacherUsageTracking;
  usageLimitWarnings: Array<{
    type: "classes" | "storage" | "bandwidth" | "api_calls";
    threshold: number;
    notifiedAt: Date;
    resolved: boolean;
  }>;

  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  failedPaymentAttempts: number;

  addOns: Array<{
    type:
      | "extra_classes"
      | "extra_storage"
      | "extra_bandwidth"
      | "priority_listing";
    name: string;
    price: number;
    quantity: number;
    billingCycle: TeacherBillingCycle;
    addedAt: Date;
    expiresAt?: Date;
  }>;

  contractTerms?: {
    minimumCommitmentMonths: number;
    customCommissionRate?: number;
    customFeatures?: string[];
    signedDate: Date;
    signedBy: string;
  };

  adminNotes?: string;
  assignedAccountManager?: mongoose.Types.ObjectId;
  lastReviewDate?: Date;
  nextReviewDate?: Date;

  invoices: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;

  /* METHODS */
  isActive(): boolean;
  canCreateClass(): boolean;
  canUploadVideo(): boolean;
  getRemainingClasses(): number;
  getRemainingStorage(): number;
  calculateMonthlyRevenue(): number;
  pauseSubscription(reason?: string): Promise<ITeacherSubscription>;
  cancelSubscription(reason?: string): Promise<ITeacherSubscription>;
  resetUsageCounters(): void;
  addUsageWarning(type: string, threshold: number): void;
}

/*================== SCHEMA ================== */

const TeacherSubscriptionSchema = new Schema<ITeacherSubscription>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: Object.values(TeacherSubscriptionPlan),
      default: TeacherSubscriptionPlan.BASIC,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(TeacherSubscriptionStatus),
      default: TeacherSubscriptionStatus.TRIALING,
      required: true,
      index: true,
    },

    billingCycle: {
      type: String,
      enum: Object.values(TeacherBillingCycle),
      default: TeacherBillingCycle.MONTHLY,
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

    trialEndsAt: { type: Date, index: true },
    cancelledAt: { type: Date, index: true },
    pausedAt: { type: Date },

    currentPricing: {
      monthlyPrice: { type: Number, required: true },
      quarterlyPrice: { type: Number, required: true },
      yearlyPrice: { type: Number, required: true },
      setupFee: { type: Number, default: 0 },
      currency: {
        type: String,
        enum: Object.keys(SUPPORTED_CURRENCIES),
        required: true,
        default: "AED",
      },
    },
    serviceFeeRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 50,
    },

    discountRate: { type: Number, min: 0, max: 100 },
    promoCode: { type: String, trim: true, uppercase: true },

    planFeatures: {
      maxClasses: Number,
      maxStudents: Number,
      maxVideoUploads: Number,
      advancedAnalytics: Boolean,
      customDomain: Boolean,
      apiAccess: Boolean,
      bulkImport: Boolean,
      whiteLabel: Boolean,
      customIntegrations: Boolean,
    },

    customFeatures: {
      type: Schema.Types.Mixed,
      default: {},
    },

    usageTracking: {
      classesCreated: { type: Number, default: 0 },
      studentsEnrolled: { type: Number, default: 0 },
      videosUploaded: { type: Number, default: 0 },
      apiCallsThisMonth: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 },
      bandwidthUsedGB: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },

    usageLimitWarnings: [
      {
        type: {
          type: String,
          enum: ["classes", "storage", "bandwidth", "api_calls"],
          required: true,
        },
        threshold: Number,
        notifiedAt: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false },
      },
    ],

    stripeSubscriptionId: { type: String, sparse: true },
    stripeCustomerId: { type: String, sparse: true },
    paymentMethodId: { type: String, sparse: true },

    lastPaymentDate: Date,
    lastPaymentAmount: Number,
    failedPaymentAttempts: { type: Number, default: 0 },

    addOns: [
      {
        type: {
          type: String,
          enum: [
            "extra_classes",
            "extra_storage",
            "extra_bandwidth",
            "priority_listing",
          ],
        },
        name: String,
        price: Number,
        quantity: Number,
        billingCycle: {
          type: String,
          enum: Object.values(TeacherBillingCycle),
        },
        addedAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],

    contractTerms: {
      minimumCommitmentMonths: Number,
      customCommissionRate: Number,
      customFeatures: [String],
      signedDate: Date,
      signedBy: String,
    },

    adminNotes: String,
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
  { timestamps: true },
);

/* ============================
   INDEXES
============================ */

TeacherSubscriptionSchema.index({ teacherId: 1, status: 1 });
TeacherSubscriptionSchema.index({ plan: 1, status: 1 });
TeacherSubscriptionSchema.index({ nextBillingDate: 1, status: 1 });
TeacherSubscriptionSchema.index({ endDate: 1, status: 1 });

/* ============================
   VIRTUALS
============================ */

TeacherSubscriptionSchema.virtual("mrr").get(function (
  this: ITeacherSubscription,
) {
  if (this.status !== TeacherSubscriptionStatus.ACTIVE) return 0;

  switch (this.billingCycle) {
    case TeacherBillingCycle.MONTHLY:
      return this.currentPricing.monthlyPrice;
    case TeacherBillingCycle.QUARTERLY:
      return this.currentPricing.quarterlyPrice / 3;
    case TeacherBillingCycle.YEARLY:
      return this.currentPricing.yearlyPrice / 12;
    default:
      return 0;
  }
});

/* ============================
   METHODS
============================ */

TeacherSubscriptionSchema.methods.isActive = function (): boolean {
  return (
    this.status === TeacherSubscriptionStatus.ACTIVE &&
    new Date() < this.endDate
  );
};

TeacherSubscriptionSchema.methods.canCreateClass = function (): boolean {
  return (
    this.isActive() &&
    this.usageTracking.classesCreated < this.planFeatures.maxClasses
  );
};

TeacherSubscriptionSchema.methods.canUploadVideo = function (): boolean {
  return (
    this.isActive() &&
    this.usageTracking.videosUploaded < this.planFeatures.maxVideoUploads
  );
};

TeacherSubscriptionSchema.methods.getRemainingClasses = function (): number {
  return Math.max(
    0,
    this.planFeatures.maxClasses - this.usageTracking.classesCreated,
  );
};

TeacherSubscriptionSchema.methods.getRemainingStorage = function (): number {
  const limits = {
    basic: 1000,
    standard: 5000,
    premium: 20000,
    enterprise: 100000,
  };
  return Math.max(0, limits[this.plan] - this.usageTracking.storageUsedMB);
};

TeacherSubscriptionSchema.methods.calculateMonthlyRevenue =
  function (): number {
    if (!this.isActive()) return 0;

    const base =
      this.billingCycle === TeacherBillingCycle.MONTHLY
        ? this.currentPricing.monthlyPrice
        : this.billingCycle === TeacherBillingCycle.QUARTERLY
          ? this.currentPricing.quarterlyPrice / 3
          : this.currentPricing.yearlyPrice / 12;

    const addons = this.addOns.reduce((sum, a) => {
      const price =
        a.billingCycle === TeacherBillingCycle.YEARLY
          ? a.price / 12
          : a.billingCycle === TeacherBillingCycle.QUARTERLY
            ? a.price / 3
            : a.price;
      return sum + price * a.quantity;
    }, 0);

    return base + addons;
  };

TeacherSubscriptionSchema.methods.pauseSubscription = async function (
  reason?: string,
) {
  this.status = TeacherSubscriptionStatus.INACTIVE;
  this.pausedAt = new Date();
  if (reason) {
    this.adminNotes = `${this.adminNotes || ""}\nPaused: ${reason}`;
  }
  return this.save();
};

TeacherSubscriptionSchema.methods.cancelSubscription = async function (
  reason?: string,
) {
  this.status = TeacherSubscriptionStatus.CANCELLED;
  this.cancelledAt = new Date();
  if (reason) {
    this.adminNotes = `${this.adminNotes || ""}\nCancelled: ${reason}`;
  }
  return this.save();
};

TeacherSubscriptionSchema.methods.resetUsageCounters = function (): void {
  this.usageTracking.classesCreated = 0;
  this.usageTracking.apiCallsThisMonth = 0;
  this.usageTracking.lastResetDate = new Date();
};

TeacherSubscriptionSchema.methods.addUsageWarning = function (
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
TeacherSubscriptionSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("plan")) {
    switch (this.plan) {
      case TeacherSubscriptionPlan.BASIC:
        this.planFeatures = {
          maxClasses: 5,
          maxStudents: 50,
          maxVideoUploads: 0,
          advancedAnalytics: false,
          customDomain: false,
          apiAccess: false,
          bulkImport: false,
          whiteLabel: false,
          customIntegrations: false,
        };

        this.serviceFeeRate = 8;

        this.currentPricing = {
          monthlyPrice: 49,
          quarterlyPrice: 132,
          yearlyPrice: 470,
          currency: "AED",
        };
        break;

      case TeacherSubscriptionPlan.STANDARD:
        this.planFeatures = {
          maxClasses: 25,
          maxStudents: 300,
          maxVideoUploads: 10,
          advancedAnalytics: true,
          customDomain: false,
          apiAccess: true,
          bulkImport: true,
          whiteLabel: false,
          customIntegrations: false,
        };

        this.serviceFeeRate = 6;

        this.currentPricing = {
          monthlyPrice: 149,
          quarterlyPrice: 402,
          yearlyPrice: 1432,
          currency: "AED",
        };
        break;

      case TeacherSubscriptionPlan.PREMIUM:
        this.planFeatures = {
          maxClasses: 100,
          maxStudents: 2000,
          maxVideoUploads: 50,
          advancedAnalytics: true,
          customDomain: true,
          apiAccess: true,
          bulkImport: true,
          whiteLabel: true,
          customIntegrations: true,
        };

        this.serviceFeeRate = 4;

        this.currentPricing = {
          monthlyPrice: 399,
          quarterlyPrice: 1077,
          yearlyPrice: 3832,
          currency: "AED",
        };
        break;

      case TeacherSubscriptionPlan.ENTERPRISE:
        this.planFeatures = {
          maxClasses: 999999, // Unlimited
          maxStudents: 999999, // Unlimited
          maxVideoUploads: 999999,
          advancedAnalytics: true,
          customDomain: true,
          apiAccess: true,
          bulkImport: true,
          whiteLabel: true,
          customIntegrations: true,
        };

        // Allow contract override, fallback to default
        this.serviceFeeRate = this.contractTerms?.customCommissionRate ?? 2;

        this.currentPricing = {
          monthlyPrice: 999,
          quarterlyPrice: 2698,
          yearlyPrice: 9592,
          currency: "AED",
        };
        break;
    }
    if (
      !this.currentPricing?.currency ||
      !(this.currentPricing.currency in SUPPORTED_CURRENCIES)
    ) {
      this.currentPricing.currency = "AED";
    }
  }

  next();
});

/* ============================
   EXPORT
============================ */

const TeacherSubscription = mongoose.model<ITeacherSubscription>(
  "TeacherSubscription",
  TeacherSubscriptionSchema,
);

export default TeacherSubscription;
