import mongoose, { Document, Schema } from "mongoose";

export enum AffiliateStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  INACTIVE = "inactive",
}

export enum CommissionType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
  TIERED = "tiered",
}

export interface ICommissionTier {
  minSales: number;
  maxSales?: number;
  rate: number;
  type: CommissionType;
}

export interface IAffiliateClick {
  clickId: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  countryCode?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  clickedAt: Date;
  converted: boolean;
  conversionDate?: Date;
  orderId?: mongoose.Types.ObjectId;
  conversionValue?: number;
}

export interface IAffiliateCommission {
  orderId: mongoose.Types.ObjectId;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  commissionType: CommissionType;
  status: "pending" | "approved" | "paid" | "cancelled";
  approvedAt?: Date;
  paidAt?: Date;
  payoutId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IAffiliate extends Document {
  userId: mongoose.Types.ObjectId;
  affiliateCode: string;
  status: AffiliateStatus;

  // Commission settings
  defaultCommissionRate: number;
  commissionType: CommissionType;
  commissionTiers?: ICommissionTier[];

  // Event-specific commissions (overrides default)
  eventCommissions: Array<{
    eventId: mongoose.Types.ObjectId;
    commissionRate: number;
    commissionType: CommissionType;
    validUntil?: Date;
  }>;

  // Category-specific commissions
  categoryCommissions: Array<{
    category: string;
    commissionRate: number;
    commissionType: CommissionType;
    validUntil?: Date;
  }>;

  // Performance tracking
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;

  // Click and conversion tracking
  clicks: IAffiliateClick[];
  commissions: IAffiliateCommission[];

  // Analytics periods
  monthlyStats: Array<{
    year: number;
    month: number;
    clicks: number;
    conversions: number;
    revenue: number;
    commissionEarned: number;
  }>;

  // Affiliate profile
  businessName?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };

  // Payment information
  paymentMethod: "bank_transfer" | "paypal" | "stripe" | "wallet";
  paymentDetails: {
    bankAccount?: {
      accountHolderName: string;
      accountNumber: string;
      routingNumber: string;
      bankName: string;
    };
    paypalEmail?: string;
    stripeAccountId?: string;
    walletAddress?: string;
  };

  // Settings and preferences
  minimumPayoutAmount: number;
  payoutFrequency: "weekly" | "bi_weekly" | "monthly" | "quarterly";
  cookieExpiryDays: number;

  // Application and approval
  applicationDate: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;

  // Terms and agreement
  termsAcceptedAt?: Date;
  termsVersion?: string;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  generateTrackingUrl(
    eventId?: mongoose.Types.ObjectId,
    customParams?: Record<string, string>,
  ): string;
  recordClick(clickData: Partial<IAffiliateClick>): Promise<IAffiliate>;
  recordConversion(
    orderId: mongoose.Types.ObjectId,
    orderAmount: number,
  ): Promise<IAffiliate>;
  calculateCommission(
    orderAmount: number,
    eventId?: mongoose.Types.ObjectId,
    category?: string,
  ): number;
  getConversionRate(): number;
  getMonthlyStats(year: number, month: number): any;
  updateMonthlyStats(): Promise<IAffiliate>;
  canReceivePayout(): boolean;
  getPendingCommissions(): IAffiliateCommission[];
  getTotalPendingAmount(): number;
}

// Static methods interface
export interface IAffiliateModel extends mongoose.Model<IAffiliate> {
  findByCode(
    affiliateCode: string,
  ): mongoose.Query<IAffiliate | null, IAffiliate>;
  findActive(): mongoose.Query<IAffiliate[], IAffiliate>;
  findTopPerformers(limit?: number): mongoose.Query<IAffiliate[], IAffiliate>;
}

const affiliateClickSchema = new Schema<IAffiliateClick>({
  clickId: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: String,
  referrer: String,
  countryCode: String,
  deviceType: {
    type: String,
    enum: ["desktop", "mobile", "tablet"],
  },
  clickedAt: {
    type: Date,
    default: Date.now,
  },
  converted: {
    type: Boolean,
    default: false,
  },
  conversionDate: Date,
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "Order",
  },
  conversionValue: {
    type: Number,
    min: [0, "Conversion value cannot be negative"],
  },
});

const affiliateCommissionSchema = new Schema<IAffiliateCommission>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  orderAmount: {
    type: Number,
    required: true,
    min: [0, "Order amount cannot be negative"],
  },
  commissionRate: {
    type: Number,
    required: true,
    min: [0, "Commission rate cannot be negative"],
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: [0, "Commission amount cannot be negative"],
  },
  commissionType: {
    type: String,
    enum: Object.values(CommissionType),
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "paid", "cancelled"],
    default: "pending",
  },
  approvedAt: Date,
  paidAt: Date,
  payoutId: {
    type: Schema.Types.ObjectId,
    ref: "Payout",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const affiliateSchema = new Schema<IAffiliate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    affiliateCode: {
      type: String,
      required: [true, "Affiliate code is required"],
      uppercase: true,
      minlength: [4, "Affiliate code must be at least 4 characters"],
      maxlength: [20, "Affiliate code cannot exceed 20 characters"],
      match: [
        /^[A-Z0-9]+$/,
        "Affiliate code can only contain uppercase letters and numbers",
      ],
    },
    status: {
      type: String,
      enum: Object.values(AffiliateStatus),
      default: AffiliateStatus.PENDING,
    },

    // Commission settings
    defaultCommissionRate: {
      type: Number,
      required: [true, "Default commission rate is required"],
      min: [0, "Commission rate cannot be negative"],
      max: [100, "Commission rate cannot exceed 100%"],
    },
    commissionType: {
      type: String,
      enum: Object.values(CommissionType),
      default: CommissionType.PERCENTAGE,
    },
    commissionTiers: [
      {
        minSales: {
          type: Number,
          required: true,
          min: [0, "Minimum sales cannot be negative"],
        },
        maxSales: {
          type: Number,
          min: [0, "Maximum sales cannot be negative"],
        },
        rate: {
          type: Number,
          required: true,
          min: [0, "Commission rate cannot be negative"],
        },
        type: {
          type: String,
          enum: Object.values(CommissionType),
          required: true,
        },
      },
    ],

    // Event-specific commissions
    eventCommissions: [
      {
        eventId: {
          type: Schema.Types.ObjectId,
          ref: "Event",
          required: true,
        },
        commissionRate: {
          type: Number,
          required: true,
          min: [0, "Commission rate cannot be negative"],
        },
        commissionType: {
          type: String,
          enum: Object.values(CommissionType),
          required: true,
        },
        validUntil: Date,
      },
    ],

    // Category-specific commissions
    categoryCommissions: [
      {
        category: {
          type: String,
          required: true,
        },
        commissionRate: {
          type: Number,
          required: true,
          min: [0, "Commission rate cannot be negative"],
        },
        commissionType: {
          type: String,
          enum: Object.values(CommissionType),
          required: true,
        },
        validUntil: Date,
      },
    ],

    // Performance tracking
    totalClicks: {
      type: Number,
      default: 0,
      min: [0, "Total clicks cannot be negative"],
    },
    totalConversions: {
      type: Number,
      default: 0,
      min: [0, "Total conversions cannot be negative"],
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, "Total revenue cannot be negative"],
    },
    totalCommissionEarned: {
      type: Number,
      default: 0,
      min: [0, "Total commission earned cannot be negative"],
    },
    totalCommissionPaid: {
      type: Number,
      default: 0,
      min: [0, "Total commission paid cannot be negative"],
    },

    // Click and conversion tracking
    clicks: [affiliateClickSchema],
    commissions: [affiliateCommissionSchema],

    // Analytics periods
    monthlyStats: [
      {
        year: {
          type: Number,
          required: true,
        },
        month: {
          type: Number,
          required: true,
          min: [1, "Month must be between 1 and 12"],
          max: [12, "Month must be between 1 and 12"],
        },
        clicks: {
          type: Number,
          default: 0,
          min: [0, "Clicks cannot be negative"],
        },
        conversions: {
          type: Number,
          default: 0,
          min: [0, "Conversions cannot be negative"],
        },
        revenue: {
          type: Number,
          default: 0,
          min: [0, "Revenue cannot be negative"],
        },
        commissionEarned: {
          type: Number,
          default: 0,
          min: [0, "Commission earned cannot be negative"],
        },
      },
    ],

    // Affiliate profile
    businessName: String,
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
    },

    // Payment information
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "paypal", "stripe", "wallet"],
      required: [true, "Payment method is required"],
    },
    paymentDetails: {
      bankAccount: {
        accountHolderName: String,
        accountNumber: String,
        routingNumber: String,
        bankName: String,
      },
      paypalEmail: String,
      stripeAccountId: String,
      walletAddress: String,
    },

    // Settings and preferences
    minimumPayoutAmount: {
      type: Number,
      default: 50,
      min: [1, "Minimum payout amount must be at least 1"],
    },
    payoutFrequency: {
      type: String,
      enum: ["weekly", "bi_weekly", "monthly", "quarterly"],
      default: "monthly",
    },
    cookieExpiryDays: {
      type: Number,
      default: 30,
      min: [1, "Cookie expiry must be at least 1 day"],
      max: [365, "Cookie expiry cannot exceed 365 days"],
    },

    // Application and approval
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,
    rejectionReason: String,

    // Terms and agreement
    termsAcceptedAt: Date,
    termsVersion: String,
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
affiliateSchema.index({ affiliateCode: 1 }, { unique: true });
affiliateSchema.index({ status: 1 });
affiliateSchema.index({ "clicks.clickId": 1 }, { unique: true, sparse: true });
affiliateSchema.index({ "commissions.orderId": 1 });
affiliateSchema.index({ "commissions.status": 1 });
affiliateSchema.index({ totalRevenue: -1 });
affiliateSchema.index({ createdAt: -1 });

// Pre-save middleware to generate affiliate code
affiliateSchema.pre("save", function (next) {
  if (!this.affiliateCode) {
    // Generate a unique affiliate code
    const userId = this.userId.toString();
    const timestamp = Date.now().toString(36).toUpperCase();
    this.affiliateCode = `AFF${userId.slice(-4).toUpperCase()}${timestamp.slice(-4)}`;
  }
  next();
});

// Virtual for conversion rate
affiliateSchema.virtual("conversionRate").get(function () {
  return this.getConversionRate();
});

// Virtual for pending commission amount
affiliateSchema.virtual("pendingCommissionAmount").get(function () {
  return this.getTotalPendingAmount();
});

// Method to generate tracking URL
affiliateSchema.methods.generateTrackingUrl = function (
  eventId?: mongoose.Types.ObjectId,
  customParams?: Record<string, string>,
): string {
  const baseUrl = process.env.FRONTEND_URL || "https://kidrove.com";
  const params = new URLSearchParams({
    ref: this.affiliateCode,
    ...customParams,
  });

  if (eventId) {
    return `${baseUrl}/events/${eventId}?${params.toString()}`;
  }

  return `${baseUrl}?${params.toString()}`;
};

// Method to record click
affiliateSchema.methods.recordClick = async function (
  clickData: Partial<IAffiliateClick>,
): Promise<IAffiliate> {
  const clickId = `CLK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  this.clicks.push({
    clickId,
    ...clickData,
    clickedAt: new Date(),
    converted: false,
  });

  this.totalClicks += 1;

  await this.updateMonthlyStats();
  return this.save();
};

// Method to record conversion
affiliateSchema.methods.recordConversion = async function (
  orderId: mongoose.Types.ObjectId,
  orderAmount: number,
): Promise<IAffiliate> {
  // Find the click that led to this conversion (within cookie expiry period)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - this.cookieExpiryDays);

  const click = this.clicks.find(
    (c) => !c.converted && c.clickedAt > expiryDate,
  );

  if (click) {
    click.converted = true;
    click.conversionDate = new Date();
    click.orderId = orderId;
    click.conversionValue = orderAmount;
  }

  // Calculate commission
  const commissionAmount = this.calculateCommission(orderAmount);

  // Add commission record
  this.commissions.push({
    orderId,
    orderAmount,
    commissionRate: this.defaultCommissionRate,
    commissionAmount,
    commissionType: this.commissionType,
    status: "pending",
    createdAt: new Date(),
  });

  // Update totals
  this.totalConversions += 1;
  this.totalRevenue += orderAmount;
  this.totalCommissionEarned += commissionAmount;

  await this.updateMonthlyStats();
  return this.save();
};

// Method to calculate commission
affiliateSchema.methods.calculateCommission = function (
  orderAmount: number,
  eventId?: mongoose.Types.ObjectId,
  category?: string,
): number {
  let rate = this.defaultCommissionRate;
  let type = this.commissionType;

  // Check for event-specific commission
  if (eventId) {
    const eventCommission = this.eventCommissions.find(
      (ec) =>
        ec.eventId.toString() === eventId.toString() &&
        (!ec.validUntil || ec.validUntil > new Date()),
    );

    if (eventCommission) {
      rate = eventCommission.commissionRate;
      type = eventCommission.commissionType;
    }
  }

  // Check for category-specific commission
  if (category && !eventId) {
    const categoryCommission = this.categoryCommissions.find(
      (cc) =>
        cc.category === category &&
        (!cc.validUntil || cc.validUntil > new Date()),
    );

    if (categoryCommission) {
      rate = categoryCommission.commissionRate;
      type = categoryCommission.commissionType;
    }
  }

  // Apply tiered commission if configured
  if (type === CommissionType.TIERED && this.commissionTiers?.length) {
    const applicableTier = this.commissionTiers.find(
      (tier) =>
        this.totalRevenue >= tier.minSales &&
        (!tier.maxSales || this.totalRevenue <= tier.maxSales),
    );

    if (applicableTier) {
      rate = applicableTier.rate;
      type = applicableTier.type;
    }
  }

  // Calculate commission based on type
  switch (type) {
    case CommissionType.PERCENTAGE:
      return (orderAmount * rate) / 100;
    case CommissionType.FIXED_AMOUNT:
      return rate;
    default:
      return (orderAmount * rate) / 100;
  }
};

// Method to get conversion rate
affiliateSchema.methods.getConversionRate = function (): number {
  return this.totalClicks > 0
    ? (this.totalConversions / this.totalClicks) * 100
    : 0;
};

// Method to get monthly stats
affiliateSchema.methods.getMonthlyStats = function (
  year: number,
  month: number,
) {
  return this.monthlyStats.find(
    (stats) => stats.year === year && stats.month === month,
  );
};

// Method to update monthly stats
affiliateSchema.methods.updateMonthlyStats =
  async function (): Promise<IAffiliate> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let monthStats = this.monthlyStats.find(
      (stats) => stats.year === year && stats.month === month,
    );

    if (!monthStats) {
      monthStats = {
        year,
        month,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        commissionEarned: 0,
      };
      this.monthlyStats.push(monthStats);
    }

    // Recalculate from source data for accuracy
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    monthStats.clicks = this.clicks.filter(
      (c) => c.clickedAt >= monthStart && c.clickedAt <= monthEnd,
    ).length;

    monthStats.conversions = this.clicks.filter(
      (c) =>
        c.converted &&
        c.conversionDate &&
        c.conversionDate >= monthStart &&
        c.conversionDate <= monthEnd,
    ).length;

    const monthCommissions = this.commissions.filter(
      (c) => c.createdAt >= monthStart && c.createdAt <= monthEnd,
    );

    monthStats.revenue = monthCommissions.reduce(
      (sum, c) => sum + c.orderAmount,
      0,
    );
    monthStats.commissionEarned = monthCommissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0,
    );

    return this;
  };

// Method to check if affiliate can receive payout
affiliateSchema.methods.canReceivePayout = function (): boolean {
  const pendingAmount = this.getTotalPendingAmount();
  return (
    pendingAmount >= this.minimumPayoutAmount &&
    this.status === AffiliateStatus.ACTIVE
  );
};

// Method to get pending commissions
affiliateSchema.methods.getPendingCommissions =
  function (): IAffiliateCommission[] {
    return this.commissions.filter((c) => c.status === "pending");
  };

// Method to get total pending amount
affiliateSchema.methods.getTotalPendingAmount = function (): number {
  return this.getPendingCommissions().reduce(
    (sum, c) => sum + c.commissionAmount,
    0,
  );
};

// Static methods
affiliateSchema.statics.findByCode = function (affiliateCode: string) {
  return this.findOne({ affiliateCode: affiliateCode.toUpperCase() });
};

affiliateSchema.statics.findActive = function () {
  return this.find({ status: AffiliateStatus.ACTIVE });
};

affiliateSchema.statics.findTopPerformers = function (limit: number = 10) {
  return this.find({ status: AffiliateStatus.ACTIVE })
    .sort({ totalRevenue: -1 })
    .limit(limit);
};

const Affiliate = mongoose.model<IAffiliate, IAffiliateModel>(
  "Affiliate",
  affiliateSchema,
);

export default Affiliate;
