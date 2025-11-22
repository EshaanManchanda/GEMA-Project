import mongoose, { Document, Schema } from 'mongoose';

export enum PayoutFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export enum CommissionStructure {
  FLAT_RATE = 'flat_rate',
  TIERED = 'tiered',
  SUBSCRIPTION_BASED = 'subscription_based',
  CUSTOM = 'custom'
}

export enum TaxCalculationMethod {
  INCLUSIVE = 'inclusive',
  EXCLUSIVE = 'exclusive',
  EXEMPT = 'exempt'
}

export interface ITieredCommission {
  minAmount: number;
  maxAmount?: number;
  rate: number;
  description?: string;
}

export interface IPaymentGatewaySettings {
  stripe: {
    enabled: boolean;
    publicKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    applicationFeePercent: number;
    connectAccountRequired: boolean;
  };
  paypal: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    commissionRate: number;
    sandboxMode: boolean;
  };
  razorpay: {
    enabled: boolean;
    keyId?: string;
    keySecret?: string;
    commissionRate: number;
  };
}

export interface ITaxSettings {
  enabled: boolean;
  vatRate: number;
  serviceTaxRate: number;
  calculationMethod: TaxCalculationMethod;
  taxIdRequired: boolean;
  exemptCategories?: string[];
  regionalRates?: {
    [region: string]: {
      vatRate: number;
      serviceTaxRate: number;
    };
  };
}

export interface IRefundPolicy {
  enabled: boolean;
  defaultRefundableHours: number;
  processingFeePercent: number;
  maxProcessingFee: number;
  autoApprovalLimit: number;
  categorySpecificPolicies?: {
    [category: string]: {
      refundableHours: number;
      processingFeePercent: number;
    };
  };
}

export interface IRevenueSharingRule {
  revenueStream: string;
  adminPercentage: number;
  vendorPercentage: number;
  description?: string;
  conditions?: {
    minOrderAmount?: number;
    maxOrderAmount?: number;
    categories?: string[];
    vendorSubscriptionTier?: string[];
  };
}

export interface IPromotionalSettings {
  platformCouponsEnabled: boolean;
  vendorCouponsEnabled: boolean;
  maxDiscountPercent: number;
  maxDiscountAmount: number;
  adminApprovalRequired: boolean;
  blackoutDates?: Date[];
}

export interface IPlatformFees {
  listingFee: number;
  successFee: number;
  paymentProcessingFee: number;
  chargebackFee: number;
  disputeFee: number;
  currency: string;
}

export interface IAdminRevenueSettings extends Document {
  // Core platform settings
  platformName: string;
  isActive: boolean;
  maintenanceMode: boolean;

  // Commission and revenue sharing
  commissionStructure: CommissionStructure;
  defaultCommissionRate: number;
  tieredCommissions?: ITieredCommission[];
  revenueSharingRules: IRevenueSharingRule[];

  // Payout settings
  payoutFrequency: PayoutFrequency;
  minimumPayoutAmount: number;
  payoutCurrency: string;
  payoutProcessingTime: number; // Hours
  holdPayoutsForNewVendors: number; // Days

  // Payment gateway configurations
  paymentGateways: IPaymentGatewaySettings;

  // Tax and regulatory
  taxSettings: ITaxSettings;

  // Refund policies
  refundPolicy: IRefundPolicy;

  // Platform fees
  platformFees: IPlatformFees;

  // Vendor subscription settings
  vendorSubscriptionFee: number; // Monthly subscription fee for vendors using custom Stripe (default 150 AED)
  vendorSubscriptionCurrency: string;

  // Promotional and marketing
  promotionalSettings: IPromotionalSettings;

  // Analytics and reporting
  revenueReportingCurrency: string;
  enableRealTimeReporting: boolean;
  retentionPeriodDays: number;

  // Vendor onboarding
  vendorApprovalRequired: boolean;
  defaultVendorSubscriptionPlan: string;
  vendorOnboardingFee: number;

  // Risk management
  riskSettings: {
    maxDailyTransactionAmount: number;
    maxMonthlyTransactionAmount: number;
    fraudDetectionEnabled: boolean;
    highRiskCategories?: string[];
    manualReviewThreshold: number;
    autoSuspensionEnabled: boolean;
  };

  // Notification settings
  notificationSettings: {
    payoutNotifications: boolean;
    revenueAlerts: boolean;
    lowBalanceWarning: number;
    highVolumeAlert: number;
    emailNotifications: string[];
    smsNotifications: string[];
  };

  // Business rules
  businessRules: {
    allowNegativeBalance: boolean;
    gracePeriodDays: number;
    lateFeePercent: number;
    inactivityThresholdDays: number;
    autoArchiveAfterDays: number;
  };

  // Compliance and legal
  complianceSettings: {
    gdprCompliant: boolean;
    dataRetentionYears: number;
    auditLogEnabled: boolean;
    requireTermsAcceptance: boolean;
    privacyPolicyVersion: string;
    termsOfServiceVersion: string;
  };

  // Integration settings
  integrationSettings: {
    accountingSoftware?: {
      provider: 'quickbooks' | 'xero' | 'sage' | 'custom';
      enabled: boolean;
      syncFrequency: 'real_time' | 'daily' | 'weekly';
      credentials?: any;
    };
    crmIntegration?: {
      provider: string;
      enabled: boolean;
      syncCustomers: boolean;
      syncTransactions: boolean;
    };
    bankingIntegration?: {
      enabled: boolean;
      bankName?: string;
      accountNumber?: string;
      routingNumber?: string;
      autoReconciliation: boolean;
    };
  };

  // Admin controls
  lastModifiedBy: mongoose.Types.ObjectId;
  lastModifiedAt: Date;
  version: number;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateCommission(amount: number, vendorId?: string, category?: string): number;
  getEffectiveRefundPolicy(category?: string): any;
  isPaymentGatewayEnabled(gateway: string): boolean;
  getMinimumPayoutForVendor(vendorId: string): number;
  validateRevenueSplit(adminAmount: number, vendorAmount: number, totalAmount: number): boolean;
}

const AdminRevenueSettingsSchema = new Schema<IAdminRevenueSettings>(
  {
    platformName: {
      type: String,
      required: [true, 'Platform name is required'],
      trim: true,
      default: 'Gema Platform'
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    commissionStructure: {
      type: String,
      enum: Object.values(CommissionStructure),
      default: CommissionStructure.SUBSCRIPTION_BASED,
      required: true
    },
    defaultCommissionRate: {
      type: Number,
      required: true,
      min: [0, 'Commission rate cannot be negative'],
      max: [50, 'Commission rate cannot exceed 50%'],
      default: 5
    },
    tieredCommissions: [{
      minAmount: {
        type: Number,
        required: true,
        min: [0, 'Minimum amount cannot be negative']
      },
      maxAmount: {
        type: Number,
        min: [0, 'Maximum amount cannot be negative']
      },
      rate: {
        type: Number,
        required: true,
        min: [0, 'Rate cannot be negative'],
        max: [50, 'Rate cannot exceed 50%']
      },
      description: {
        type: String,
        trim: true
      }
    }],
    revenueSharingRules: [{
      revenueStream: {
        type: String,
        required: true,
        enum: ['booking', 'subscription', 'advertising', 'addon', 'bulk_booking', 'analytics', 'partnership']
      },
      adminPercentage: {
        type: Number,
        required: true,
        min: [0, 'Admin percentage cannot be negative'],
        max: [100, 'Admin percentage cannot exceed 100%']
      },
      vendorPercentage: {
        type: Number,
        required: true,
        min: [0, 'Vendor percentage cannot be negative'],
        max: [100, 'Vendor percentage cannot exceed 100%']
      },
      description: {
        type: String,
        trim: true
      },
      conditions: {
        minOrderAmount: Number,
        maxOrderAmount: Number,
        categories: [String],
        vendorSubscriptionTier: [String]
      }
    }],
    payoutFrequency: {
      type: String,
      enum: Object.values(PayoutFrequency),
      default: PayoutFrequency.WEEKLY,
      required: true
    },
    minimumPayoutAmount: {
      type: Number,
      required: true,
      min: [0, 'Minimum payout amount cannot be negative'],
      default: 50
    },
    payoutCurrency: {
      type: String,
      required: true,
      enum: ['AED', 'USD', 'EUR', 'GBP'],
      default: 'AED'
    },
    payoutProcessingTime: {
      type: Number,
      required: true,
      min: [0, 'Processing time cannot be negative'],
      default: 24
    },
    holdPayoutsForNewVendors: {
      type: Number,
      required: true,
      min: [0, 'Hold period cannot be negative'],
      default: 14
    },
    paymentGateways: {
      stripe: {
        enabled: {
          type: Boolean,
          default: true
        },
        publicKey: {
          type: String,
          select: false
        },
        secretKey: {
          type: String,
          select: false
        },
        webhookSecret: {
          type: String,
          select: false
        },
        applicationFeePercent: {
          type: Number,
          default: 2.9,
          min: [0, 'Application fee cannot be negative'],
          max: [10, 'Application fee cannot exceed 10%']
        },
        connectAccountRequired: {
          type: Boolean,
          default: false
        }
      },
      paypal: {
        enabled: {
          type: Boolean,
          default: false
        },
        clientId: {
          type: String,
          select: false
        },
        clientSecret: {
          type: String,
          select: false
        },
        commissionRate: {
          type: Number,
          default: 3.5,
          min: [0, 'Commission rate cannot be negative'],
          max: [10, 'Commission rate cannot exceed 10%']
        },
        sandboxMode: {
          type: Boolean,
          default: true
        }
      },
      razorpay: {
        enabled: {
          type: Boolean,
          default: false
        },
        keyId: {
          type: String,
          select: false
        },
        keySecret: {
          type: String,
          select: false
        },
        commissionRate: {
          type: Number,
          default: 2.5,
          min: [0, 'Commission rate cannot be negative'],
          max: [10, 'Commission rate cannot exceed 10%']
        }
      }
    },
    taxSettings: {
      enabled: {
        type: Boolean,
        default: true
      },
      vatRate: {
        type: Number,
        default: 5,
        min: [0, 'VAT rate cannot be negative'],
        max: [50, 'VAT rate cannot exceed 50%']
      },
      serviceTaxRate: {
        type: Number,
        default: 0,
        min: [0, 'Service tax rate cannot be negative'],
        max: [50, 'Service tax rate cannot exceed 50%']
      },
      calculationMethod: {
        type: String,
        enum: Object.values(TaxCalculationMethod),
        default: TaxCalculationMethod.INCLUSIVE
      },
      taxIdRequired: {
        type: Boolean,
        default: false
      },
      exemptCategories: [String],
      regionalRates: {
        type: Schema.Types.Mixed,
        default: {}
      }
    },
    refundPolicy: {
      enabled: {
        type: Boolean,
        default: true
      },
      defaultRefundableHours: {
        type: Number,
        default: 168, // 7 days
        min: [0, 'Refundable hours cannot be negative']
      },
      processingFeePercent: {
        type: Number,
        default: 3,
        min: [0, 'Processing fee cannot be negative'],
        max: [20, 'Processing fee cannot exceed 20%']
      },
      maxProcessingFee: {
        type: Number,
        default: 50,
        min: [0, 'Max processing fee cannot be negative']
      },
      autoApprovalLimit: {
        type: Number,
        default: 500,
        min: [0, 'Auto approval limit cannot be negative']
      },
      categorySpecificPolicies: {
        type: Schema.Types.Mixed,
        default: {}
      }
    },
    platformFees: {
      listingFee: {
        type: Number,
        default: 0,
        min: [0, 'Listing fee cannot be negative']
      },
      successFee: {
        type: Number,
        default: 0,
        min: [0, 'Success fee cannot be negative']
      },
      paymentProcessingFee: {
        type: Number,
        default: 2.9,
        min: [0, 'Payment processing fee cannot be negative'],
        max: [10, 'Payment processing fee cannot exceed 10%']
      },
      chargebackFee: {
        type: Number,
        default: 25,
        min: [0, 'Chargeback fee cannot be negative']
      },
      disputeFee: {
        type: Number,
        default: 15,
        min: [0, 'Dispute fee cannot be negative']
      },
      currency: {
        type: String,
        default: 'AED',
        enum: ['AED', 'USD', 'EUR', 'GBP']
      }
    },
    vendorSubscriptionFee: {
      type: Number,
      default: 150, // 150 AED per month for vendors using custom Stripe
      min: [0, 'Vendor subscription fee cannot be negative'],
      required: true
    },
    vendorSubscriptionCurrency: {
      type: String,
      default: 'AED',
      enum: ['AED', 'USD', 'EUR', 'GBP'],
      required: true
    },
    promotionalSettings: {
      platformCouponsEnabled: {
        type: Boolean,
        default: true
      },
      vendorCouponsEnabled: {
        type: Boolean,
        default: true
      },
      maxDiscountPercent: {
        type: Number,
        default: 50,
        min: [0, 'Max discount cannot be negative'],
        max: [100, 'Max discount cannot exceed 100%']
      },
      maxDiscountAmount: {
        type: Number,
        default: 500,
        min: [0, 'Max discount amount cannot be negative']
      },
      adminApprovalRequired: {
        type: Boolean,
        default: false
      },
      blackoutDates: [Date]
    },
    revenueReportingCurrency: {
      type: String,
      default: 'AED',
      enum: ['AED', 'USD', 'EUR', 'GBP']
    },
    enableRealTimeReporting: {
      type: Boolean,
      default: true
    },
    retentionPeriodDays: {
      type: Number,
      default: 2555, // 7 years
      min: [365, 'Retention period must be at least 1 year']
    },
    vendorApprovalRequired: {
      type: Boolean,
      default: true
    },
    defaultVendorSubscriptionPlan: {
      type: String,
      default: 'basic',
      enum: ['basic', 'standard', 'premium', 'enterprise']
    },
    vendorOnboardingFee: {
      type: Number,
      default: 0,
      min: [0, 'Onboarding fee cannot be negative']
    },
    riskSettings: {
      maxDailyTransactionAmount: {
        type: Number,
        default: 10000,
        min: [0, 'Max daily transaction amount cannot be negative']
      },
      maxMonthlyTransactionAmount: {
        type: Number,
        default: 100000,
        min: [0, 'Max monthly transaction amount cannot be negative']
      },
      fraudDetectionEnabled: {
        type: Boolean,
        default: true
      },
      highRiskCategories: [String],
      manualReviewThreshold: {
        type: Number,
        default: 1000,
        min: [0, 'Manual review threshold cannot be negative']
      },
      autoSuspensionEnabled: {
        type: Boolean,
        default: true
      }
    },
    notificationSettings: {
      payoutNotifications: {
        type: Boolean,
        default: true
      },
      revenueAlerts: {
        type: Boolean,
        default: true
      },
      lowBalanceWarning: {
        type: Number,
        default: 100,
        min: [0, 'Low balance warning cannot be negative']
      },
      highVolumeAlert: {
        type: Number,
        default: 10000,
        min: [0, 'High volume alert cannot be negative']
      },
      emailNotifications: [String],
      smsNotifications: [String]
    },
    businessRules: {
      allowNegativeBalance: {
        type: Boolean,
        default: false
      },
      gracePeriodDays: {
        type: Number,
        default: 7,
        min: [0, 'Grace period cannot be negative']
      },
      lateFeePercent: {
        type: Number,
        default: 1.5,
        min: [0, 'Late fee cannot be negative'],
        max: [10, 'Late fee cannot exceed 10%']
      },
      inactivityThresholdDays: {
        type: Number,
        default: 90,
        min: [1, 'Inactivity threshold must be at least 1 day']
      },
      autoArchiveAfterDays: {
        type: Number,
        default: 365,
        min: [30, 'Auto archive period must be at least 30 days']
      }
    },
    complianceSettings: {
      gdprCompliant: {
        type: Boolean,
        default: true
      },
      dataRetentionYears: {
        type: Number,
        default: 7,
        min: [1, 'Data retention must be at least 1 year']
      },
      auditLogEnabled: {
        type: Boolean,
        default: true
      },
      requireTermsAcceptance: {
        type: Boolean,
        default: true
      },
      privacyPolicyVersion: {
        type: String,
        default: '1.0'
      },
      termsOfServiceVersion: {
        type: String,
        default: '1.0'
      }
    },
    integrationSettings: {
      accountingSoftware: {
        provider: {
          type: String,
          enum: ['quickbooks', 'xero', 'sage', 'custom']
        },
        enabled: {
          type: Boolean,
          default: false
        },
        syncFrequency: {
          type: String,
          enum: ['real_time', 'daily', 'weekly'],
          default: 'daily'
        },
        credentials: Schema.Types.Mixed
      },
      crmIntegration: {
        provider: String,
        enabled: {
          type: Boolean,
          default: false
        },
        syncCustomers: {
          type: Boolean,
          default: false
        },
        syncTransactions: {
          type: Boolean,
          default: false
        }
      },
      bankingIntegration: {
        enabled: {
          type: Boolean,
          default: false
        },
        bankName: String,
        accountNumber: {
          type: String,
          select: false
        },
        routingNumber: {
          type: String,
          select: false
        },
        autoReconciliation: {
          type: Boolean,
          default: false
        }
      }
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
AdminRevenueSettingsSchema.index({ isActive: 1 });
AdminRevenueSettingsSchema.index({ version: -1 });
AdminRevenueSettingsSchema.index({ lastModifiedAt: -1 });

// Pre-save middleware to increment version and update lastModifiedAt
AdminRevenueSettingsSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    this.version += 1;
    this.lastModifiedAt = new Date();
  }
  next();
});

// Pre-save validation to ensure revenue sharing rules add up to 100%
AdminRevenueSettingsSchema.pre('save', function(next) {
  if (this.revenueSharingRules && this.revenueSharingRules.length > 0) {
    for (const rule of this.revenueSharingRules) {
      const total = rule.adminPercentage + rule.vendorPercentage;
      if (Math.abs(total - 100) > 0.01) { // Allow for small floating point differences
        return next(new Error(`Revenue sharing rule for ${rule.revenueStream} must total 100%. Current total: ${total}%`));
      }
    }
  }
  next();
});

// Method to calculate commission based on current settings
AdminRevenueSettingsSchema.methods.calculateCommission = function(
  amount: number,
  vendorId?: string,
  category?: string
): number {
  if (this.commissionStructure === CommissionStructure.FLAT_RATE) {
    return (amount * this.defaultCommissionRate) / 100;
  }

  if (this.commissionStructure === CommissionStructure.TIERED && this.tieredCommissions) {
    for (const tier of this.tieredCommissions) {
      if (amount >= tier.minAmount && (!tier.maxAmount || amount <= tier.maxAmount)) {
        return (amount * tier.rate) / 100;
      }
    }
  }

  // Default fallback
  return (amount * this.defaultCommissionRate) / 100;
};

// Method to get effective refund policy for a category
AdminRevenueSettingsSchema.methods.getEffectiveRefundPolicy = function(category?: string) {
  if (!this.refundPolicy.enabled) {
    return null;
  }

  const basePolicy = {
    refundableHours: this.refundPolicy.defaultRefundableHours,
    processingFeePercent: this.refundPolicy.processingFeePercent,
    maxProcessingFee: this.refundPolicy.maxProcessingFee,
    autoApprovalLimit: this.refundPolicy.autoApprovalLimit
  };

  if (category && this.refundPolicy.categorySpecificPolicies?.[category]) {
    return {
      ...basePolicy,
      ...this.refundPolicy.categorySpecificPolicies[category]
    };
  }

  return basePolicy;
};

// Method to check if payment gateway is enabled
AdminRevenueSettingsSchema.methods.isPaymentGatewayEnabled = function(gateway: string): boolean {
  switch (gateway.toLowerCase()) {
    case 'stripe':
      return this.paymentGateways.stripe.enabled;
    case 'paypal':
      return this.paymentGateways.paypal.enabled;
    case 'razorpay':
      return this.paymentGateways.razorpay.enabled;
    default:
      return false;
  }
};

// Method to get minimum payout for vendor (can be overridden based on vendor tier)
AdminRevenueSettingsSchema.methods.getMinimumPayoutForVendor = function(vendorId: string): number {
  // This could be enhanced to check vendor subscription tier
  return this.minimumPayoutAmount;
};

// Method to validate revenue split
AdminRevenueSettingsSchema.methods.validateRevenueSplit = function(
  adminAmount: number,
  vendorAmount: number,
  totalAmount: number
): boolean {
  const tolerance = 0.01;
  return Math.abs((adminAmount + vendorAmount) - totalAmount) <= tolerance;
};

// Static method to get current active settings
AdminRevenueSettingsSchema.statics.getCurrentSettings = async function() {
  // First try to find active settings
  let settings = await this.findOne({ isActive: true }).sort({ version: -1 });
  
  // If no active settings, find any settings
  if (!settings) {
    settings = await this.findOne().sort({ version: -1 });
  }
  
  return settings;
};

// Define interface for static methods
interface IAdminRevenueSettingsModel extends mongoose.Model<IAdminRevenueSettings> {
  getCurrentSettings(): Promise<IAdminRevenueSettings | null>;
}

const AdminRevenueSettings = mongoose.model<IAdminRevenueSettings, IAdminRevenueSettingsModel>('AdminRevenueSettings', AdminRevenueSettingsSchema);

export default AdminRevenueSettings;