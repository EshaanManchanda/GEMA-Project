import mongoose, { Document, Schema } from "mongoose";

export enum CampaignType {
  FEATURED_LISTING = "featured_listing",
  BANNER_AD = "banner_ad",
  SPONSORED_SEARCH = "sponsored_search",
  CATEGORY_PLACEMENT = "category_placement",
  HOMEPAGE_FEATURED = "homepage_featured",
  EMAIL_NEWSLETTER = "email_newsletter",
  SOCIAL_MEDIA = "social_media",
}

export enum CampaignStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}

export enum BillingModel {
  FLAT_RATE = "flat_rate",
  PAY_PER_CLICK = "pay_per_click",
  PAY_PER_VIEW = "pay_per_view",
  PAY_PER_CONVERSION = "pay_per_conversion",
  REVENUE_SHARE = "revenue_share",
}

export enum AdPlacement {
  SEARCH_RESULTS_TOP = "search_results_top",
  SEARCH_RESULTS_SIDEBAR = "search_results_sidebar",
  CATEGORY_PAGE_HEADER = "category_page_header",
  HOMEPAGE_HERO = "homepage_hero",
  HOMEPAGE_GRID = "homepage_grid",
  EVENT_DETAIL_SIDEBAR = "event_detail_sidebar",
  MOBILE_BANNER = "mobile_banner",
  EMAIL_HEADER = "email_header",
  EMAIL_FOOTER = "email_footer",
}

export interface ITargeting {
  demographics: {
    ageRange?: [number, number];
    gender?: "male" | "female" | "all";
    interests?: string[];
  };
  geographic: {
    cities?: string[];
    emirates?: string[];
    radius?: number; // km from specific coordinates
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  behavioral: {
    previousBookings?: boolean;
    categoryPreferences?: string[];
    priceRange?: [number, number];
    bookingFrequency?: "first_time" | "regular" | "frequent";
  };
  temporal: {
    daysOfWeek?: string[];
    timeOfDay?: [string, string]; // e.g., ["09:00", "17:00"]
    seasonality?: string[];
  };
}

export interface IBudgetSettings {
  totalBudget: number;
  dailyBudget?: number;
  bidAmount?: number; // For PPC campaigns
  minBid?: number;
  maxBid?: number;
  currency: string;
}

export interface IPerformanceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  totalSpent: number;
  revenue: number;
  clickThroughRate: number;
  conversionRate: number;
  costPerClick: number;
  costPerConversion: number;
  returnOnAdSpend: number;
  lastUpdated: Date;
}

export interface IAdContent {
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  callToAction?: string;
  landingUrl?: string;
  customHtml?: string;
}

export interface ITeacherAdvertisingCampaign extends Document {
  teacherId: mongoose.Types.ObjectId;
  teachingeventId?: mongoose.Types.ObjectId; // For event-specific campaigns

  // Campaign basic info
  campaignName: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  billingModel: BillingModel;

  // Scheduling
  startDate: Date;
  endDate: Date;
  timezone?: string;

  // Budget and billing
  budgetSettings: IBudgetSettings;

  // Targeting
  targeting: ITargeting;

  // Ad placement and content
  adPlacements: AdPlacement[];
  adContent: IAdContent;

  // Performance tracking
  performanceMetrics: IPerformanceMetrics;

  // Approval and moderation
  moderationNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;

  // Revenue tracking for admin
  adminRevenue: number;
  adminCommissionRate: number;

  // Campaign settings
  isAutoRenew: boolean;
  maxImpressions?: number;
  maxClicks?: number;
  frequencyCap?: {
    impressionsPerUser: number;
    timeWindow: number; // hours
  };

  // Quality and compliance
  qualityScore?: number;
  complianceFlags?: string[];
  lastQualityCheck?: Date;

  // Analytics integration
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  conversionTracking?: {
    enabled: boolean;
    conversionGoals: string[];
    customEvents: string[];
  };

  // Communication logs
  communications: Array<{
    type:
      | "approval_request"
      | "approval_granted"
      | "rejection"
      | "pause_notice"
      | "budget_alert";
    message: string;
    sentAt: Date;
    sentBy: mongoose.Types.ObjectId;
    readAt?: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  activate(): Promise<ITeacherAdvertisingCampaign>;
  pause(reason?: string): Promise<ITeacherAdvertisingCampaign>;
  updateMetrics(
    metrics: Partial<IPerformanceMetrics>,
  ): Promise<ITeacherAdvertisingCampaign>;
  isActive(): boolean;
  canRun(): boolean;
  calculateROAS(): number;
  getRemainingBudget(): number;
  addCommunication(
    type: string,
    message: string,
    sentBy: mongoose.Types.ObjectId,
  ): void;
}

const TeacherAdvertisingCampaignSchema =
  new Schema<ITeacherAdvertisingCampaign>(
    {
      teacherId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "teacher ID is required"],
        index: true,
      },

      teachingeventId: {
        type: Schema.Types.ObjectId,
        ref: "TeachingEvent",
        sparse: true,
        index: true,
      },
      campaignName: {
        type: String,
        required: [true, "Campaign name is required"],
        trim: true,
        maxlength: [100, "Campaign name cannot exceed 100 characters"],
      },
      campaignType: {
        type: String,
        enum: Object.values(CampaignType),
        required: [true, "Campaign type is required"],
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(CampaignStatus),
        default: CampaignStatus.DRAFT,
        required: true,
        index: true,
      },
      billingModel: {
        type: String,
        enum: Object.values(BillingModel),
        required: [true, "Billing model is required"],
        index: true,
      },
      startDate: {
        type: Date,
        required: [true, "Start date is required"],
        index: true,
      },
      endDate: {
        type: Date,
        required: [true, "End date is required"],
        index: true,
        validate: {
          validator: function (this: ITeacherAdvertisingCampaign, value: Date) {
            return value > this.startDate;
          },
          message: "End date must be after start date",
        },
      },
      timezone: {
        type: String,
        default: "Asia/Dubai",
      },
      budgetSettings: {
        totalBudget: {
          type: Number,
          required: [true, "Total budget is required"],
          min: [1, "Total budget must be at least 1"],
        },
        dailyBudget: {
          type: Number,
          min: [0, "Daily budget cannot be negative"],
        },
        bidAmount: {
          type: Number,
          min: [0, "Bid amount cannot be negative"],
        },
        minBid: {
          type: Number,
          min: [0, "Minimum bid cannot be negative"],
        },
        maxBid: {
          type: Number,
          min: [0, "Maximum bid cannot be negative"],
        },
        currency: {
          type: String,
          required: true,
          enum: ["AED", "USD", "EUR", "GBP"],
          default: "AED",
        },
      },
      targeting: {
        demographics: {
          ageRange: {
            type: [Number],
            validate: {
              validator: function (v: number[]) {
                return (
                  !v ||
                  (v.length === 2 && v[0] >= 0 && v[1] >= v[0] && v[1] <= 100)
                );
              },
              message:
                "Age range must be [min, max] where 0 <= min <= max <= 100",
            },
          },
          gender: {
            type: String,
            enum: ["male", "female", "all"],
            default: "all",
          },
          interests: [String],
        },
        geographic: {
          cities: [String],
          emirates: [String],
          radius: {
            type: Number,
            min: [0, "Radius cannot be negative"],
          },
          coordinates: {
            lat: {
              type: Number,
              min: [-90, "Latitude must be between -90 and 90"],
              max: [90, "Latitude must be between -90 and 90"],
            },
            lng: {
              type: Number,
              min: [-180, "Longitude must be between -180 and 180"],
              max: [180, "Longitude must be between -180 and 180"],
            },
          },
        },
        behavioral: {
          previousBookings: Boolean,
          categoryPreferences: [String],
          priceRange: {
            type: [Number],
            validate: {
              validator: function (v: number[]) {
                return !v || (v.length === 2 && v[0] >= 0 && v[1] >= v[0]);
              },
              message:
                "Price range must be [min, max] where min >= 0 and max >= min",
            },
          },
          bookingFrequency: {
            type: String,
            enum: ["first_time", "regular", "frequent"],
          },
        },
        temporal: {
          daysOfWeek: [String],
          timeOfDay: {
            type: [String],
            validate: {
              validator: function (v: string[]) {
                return !v || v.length === 2;
              },
              message: "Time of day must be [start, end] format",
            },
          },
          seasonality: [String],
        },
      },
      adPlacements: {
        type: [String],
        enum: Object.values(AdPlacement),
        required: [true, "At least one ad placement is required"],
        validate: {
          validator: function (v: string[]) {
            return v.length > 0;
          },
          message: "At least one ad placement is required",
        },
      },
      adContent: {
        title: {
          type: String,
          required: [true, "Ad title is required"],
          trim: true,
          maxlength: [100, "Ad title cannot exceed 100 characters"],
        },
        description: {
          type: String,
          trim: true,
          maxlength: [300, "Ad description cannot exceed 300 characters"],
        },
        imageUrl: {
          type: String,
          trim: true,
        },
        videoUrl: {
          type: String,
          trim: true,
        },
        callToAction: {
          type: String,
          trim: true,
          maxlength: [50, "Call to action cannot exceed 50 characters"],
        },
        landingUrl: {
          type: String,
          trim: true,
        },
        customHtml: {
          type: String,
          maxlength: [5000, "Custom HTML cannot exceed 5000 characters"],
        },
      },
      performanceMetrics: {
        impressions: {
          type: Number,
          default: 0,
          min: [0, "Impressions cannot be negative"],
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
        totalSpent: {
          type: Number,
          default: 0,
          min: [0, "Total spent cannot be negative"],
        },
        revenue: {
          type: Number,
          default: 0,
          min: [0, "Revenue cannot be negative"],
        },
        clickThroughRate: {
          type: Number,
          default: 0,
          min: [0, "CTR cannot be negative"],
          max: [100, "CTR cannot exceed 100%"],
        },
        conversionRate: {
          type: Number,
          default: 0,
          min: [0, "Conversion rate cannot be negative"],
          max: [100, "Conversion rate cannot exceed 100%"],
        },
        costPerClick: {
          type: Number,
          default: 0,
          min: [0, "Cost per click cannot be negative"],
        },
        costPerConversion: {
          type: Number,
          default: 0,
          min: [0, "Cost per conversion cannot be negative"],
        },
        returnOnAdSpend: {
          type: Number,
          default: 0,
          min: [0, "ROAS cannot be negative"],
        },
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
      moderationNotes: {
        type: String,
        maxlength: [1000, "Moderation notes cannot exceed 1000 characters"],
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: Date,
      rejectionReason: {
        type: String,
        maxlength: [500, "Rejection reason cannot exceed 500 characters"],
      },
      adminRevenue: {
        type: Number,
        default: 0,
        min: [0, "Admin revenue cannot be negative"],
      },
      adminCommissionRate: {
        type: Number,
        default: 15, // 15% default commission on advertising spend
        min: [0, "Commission rate cannot be negative"],
        max: [50, "Commission rate cannot exceed 50%"],
      },
      isAutoRenew: {
        type: Boolean,
        default: false,
      },
      maxImpressions: {
        type: Number,
        min: [1, "Max impressions must be at least 1"],
      },
      maxClicks: {
        type: Number,
        min: [1, "Max clicks must be at least 1"],
      },
      frequencyCap: {
        impressionsPerUser: {
          type: Number,
          min: [1, "Impressions per user must be at least 1"],
        },
        timeWindow: {
          type: Number,
          min: [1, "Time window must be at least 1 hour"],
        },
      },
      qualityScore: {
        type: Number,
        min: [0, "Quality score cannot be negative"],
        max: [100, "Quality score cannot exceed 100"],
      },
      complianceFlags: [String],
      lastQualityCheck: Date,
      googleAnalyticsId: String,
      facebookPixelId: String,
      conversionTracking: {
        enabled: {
          type: Boolean,
          default: false,
        },
        conversionGoals: [String],
        customEvents: [String],
      },
      communications: [
        {
          type: {
            type: String,
            enum: [
              "approval_request",
              "approval_granted",
              "rejection",
              "pause_notice",
              "budget_alert",
            ],
            required: true,
          },
          message: {
            type: String,
            required: true,
            maxlength: [
              1000,
              "Communication message cannot exceed 1000 characters",
            ],
          },
          sentAt: {
            type: Date,
            default: Date.now,
          },
          sentBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          readAt: Date,
        },
      ],
    },
    {
      timestamps: true,
    },
  );

// Indexes for performance
TeacherAdvertisingCampaignSchema.index({ teacherId: 1, status: 1 });
TeacherAdvertisingCampaignSchema.index({ campaignType: 1, status: 1 });
TeacherAdvertisingCampaignSchema.index({ startDate: 1, endDate: 1 });
TeacherAdvertisingCampaignSchema.index({ status: 1, startDate: 1 });
// Removed explicit index - teachingeventId already has index: true

// Pre-save middleware to calculate admin revenue
TeacherAdvertisingCampaignSchema.pre("save", function (next) {
  if (
    this.isModified("performanceMetrics.totalSpent") ||
    this.isModified("adminCommissionRate")
  ) {
    this.adminRevenue =
      (this.performanceMetrics.totalSpent * this.adminCommissionRate) / 100;
  }
  next();
});

// Pre-save middleware to auto-calculate performance metrics
TeacherAdvertisingCampaignSchema.pre("save", function (next) {
  if (this.performanceMetrics.impressions > 0) {
    this.performanceMetrics.clickThroughRate =
      (this.performanceMetrics.clicks / this.performanceMetrics.impressions) *
      100;
  }

  if (this.performanceMetrics.clicks > 0) {
    this.performanceMetrics.conversionRate =
      (this.performanceMetrics.conversions / this.performanceMetrics.clicks) *
      100;
    this.performanceMetrics.costPerClick =
      this.performanceMetrics.totalSpent / this.performanceMetrics.clicks;
  }

  if (this.performanceMetrics.conversions > 0) {
    this.performanceMetrics.costPerConversion =
      this.performanceMetrics.totalSpent / this.performanceMetrics.conversions;
  }

  if (this.performanceMetrics.totalSpent > 0) {
    this.performanceMetrics.returnOnAdSpend =
      (this.performanceMetrics.revenue / this.performanceMetrics.totalSpent) *
      100;
  }

  this.performanceMetrics.lastUpdated = new Date();
  next();
});

// Method to activate campaign
TeacherAdvertisingCampaignSchema.methods.activate =
  async function (): Promise<ITeacherAdvertisingCampaign> {
    if (this.status === CampaignStatus.PENDING_APPROVAL) {
      return Promise.reject(
        new Error("Campaign must be approved before activation"),
      );
    }

    this.status = CampaignStatus.ACTIVE;
    this.addCommunication(
      "approval_granted",
      "Campaign has been activated",
      this.approvedBy || this.teacherId,
    );
    return this.save();
  };

// Method to pause campaign
TeacherAdvertisingCampaignSchema.methods.pause = async function (
  reason?: string,
): Promise<ITeacherAdvertisingCampaign> {
  this.status = CampaignStatus.PAUSED;
  const message = reason
    ? `Campaign paused: ${reason}`
    : "Campaign has been paused";
  this.addCommunication("pause_notice", message, this.teacherId);
  return this.save();
};

// Method to update performance metrics
TeacherAdvertisingCampaignSchema.methods.updateMetrics = async function (
  metrics: Partial<IPerformanceMetrics>,
): Promise<ITeacherAdvertisingCampaign> {
  Object.assign(this.performanceMetrics, metrics);
  return this.save();
};

// Method to check if campaign is currently active
TeacherAdvertisingCampaignSchema.methods.isActive = function (): boolean {
  const now = new Date();
  return (
    this.status === CampaignStatus.ACTIVE &&
    now >= this.startDate &&
    now <= this.endDate &&
    this.getRemainingBudget() > 0
  );
};

// Method to check if campaign can run
TeacherAdvertisingCampaignSchema.methods.canRun = function (): boolean {
  const now = new Date();
  return (
    this.status === CampaignStatus.ACTIVE &&
    now >= this.startDate &&
    now <= this.endDate &&
    this.getRemainingBudget() > 0 &&
    (!this.maxImpressions ||
      this.performanceMetrics.impressions < this.maxImpressions) &&
    (!this.maxClicks || this.performanceMetrics.clicks < this.maxClicks)
  );
};

// Method to calculate ROAS
TeacherAdvertisingCampaignSchema.methods.calculateROAS = function (): number {
  if (this.performanceMetrics.totalSpent === 0) return 0;
  return (
    (this.performanceMetrics.revenue / this.performanceMetrics.totalSpent) * 100
  );
};

// Method to get remaining budget
TeacherAdvertisingCampaignSchema.methods.getRemainingBudget =
  function (): number {
    return Math.max(
      0,
      this.budgetSettings.totalBudget - this.performanceMetrics.totalSpent,
    );
  };

// Method to add communication
TeacherAdvertisingCampaignSchema.methods.addCommunication = function (
  type: string,
  message: string,
  sentBy: mongoose.Types.ObjectId,
): void {
  this.communications.push({
    type: type as any,
    message,
    sentAt: new Date(),
    sentBy,
  });
};

// Static method to find active campaigns
TeacherAdvertisingCampaignSchema.statics.findActiveCampaigns = function () {
  const now = new Date();
  return this.find({
    status: CampaignStatus.ACTIVE,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

// Static method to find campaigns needing approval
TeacherAdvertisingCampaignSchema.statics.findPendingApproval = function () {
  return this.find({ status: CampaignStatus.PENDING_APPROVAL })
    .populate("teacherId", "firstName lastName email")
    .sort({ createdAt: 1 });
};

const TeacherAdvertisingCampaign = mongoose.model<ITeacherAdvertisingCampaign>(
  "TeacherAdvertisingCampaign",
  TeacherAdvertisingCampaignSchema,
);

export default TeacherAdvertisingCampaign;
