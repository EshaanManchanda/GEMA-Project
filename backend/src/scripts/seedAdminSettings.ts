import mongoose from 'mongoose';
import AdminRevenueSettings, {
  PayoutFrequency,
  CommissionStructure,
  TaxCalculationMethod
} from '../models/AdminRevenueSettings';

/**
 * Ensure default admin revenue settings exist
 */
export const ensureAdminRevenueSettings = async (adminId?: mongoose.Types.ObjectId) => {
  try {
    console.log('🔧 [AdminSettings] Checking admin revenue settings...');

    // Check if settings already exist
    console.log('🔍 [AdminSettings] Querying for existing settings...');
    const existingSettings = await AdminRevenueSettings.getCurrentSettings();

    if (existingSettings) {
      console.log('✅ [AdminSettings] Settings already exist:', existingSettings._id);
      return existingSettings;
    }

    console.log('⚠️  [AdminSettings] No existing settings found');
    console.log('📝 [AdminSettings] Creating default admin revenue settings...');

    const defaultAdminId = adminId || new mongoose.Types.ObjectId();

    const defaultSettings = new AdminRevenueSettings({
      // Core platform settings
      platformName: 'Gema Platform',
      isActive: true,
      maintenanceMode: false,

      // Commission and revenue sharing
      commissionStructure: CommissionStructure.FLAT_RATE,
      defaultCommissionRate: 5, // 5% default
      tieredCommissions: [
        {
          minAmount: 0,
          maxAmount: 1000,
          rate: 5,
          description: 'Standard rate for orders under 1000 AED'
        },
        {
          minAmount: 1000,
          maxAmount: 5000,
          rate: 3,
          description: 'Reduced rate for mid-range orders'
        },
        {
          minAmount: 5000,
          rate: 2,
          description: 'Premium rate for high-value orders'
        }
      ],
      revenueSharingRules: [
        {
          revenueStream: 'booking',
          adminPercentage: 5,
          vendorPercentage: 95,
          description: 'Standard ticket sales commission'
        },
        {
          revenueStream: 'subscription',
          adminPercentage: 100,
          vendorPercentage: 0,
          description: 'Vendor subscription fees'
        },
        {
          revenueStream: 'advertising',
          adminPercentage: 100,
          vendorPercentage: 0,
          description: 'Advertising revenue'
        },
        {
          revenueStream: 'addon',
          adminPercentage: 10,
          vendorPercentage: 90,
          description: 'Event add-ons and upgrades'
        }
      ],

      // Payout settings
      payoutFrequency: PayoutFrequency.WEEKLY,
      minimumPayoutAmount: 50, // 50 AED minimum
      payoutCurrency: 'AED',
      payoutProcessingTime: 24, // 24 hours
      holdPayoutsForNewVendors: 7, // 7 days hold for new vendors

      // Payment gateway configurations
      paymentGateways: {
        stripe: {
          enabled: true,
          publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
          applicationFeePercent: 5,
          connectAccountRequired: false
        },
        paypal: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          commissionRate: 5,
          sandboxMode: true
        },
        razorpay: {
          enabled: false,
          keyId: '',
          keySecret: '',
          commissionRate: 5
        }
      },

      // Tax and regulatory
      taxSettings: {
        enabled: true,
        vatRate: 5, // 5% VAT in UAE
        serviceTaxRate: 0,
        calculationMethod: TaxCalculationMethod.INCLUSIVE,
        taxIdRequired: false,
        exemptCategories: [],
        regionalRates: {}
      },

      // Refund policies
      refundPolicy: {
        enabled: true,
        defaultRefundableHours: 48, // 48 hours before event
        processingFeePercent: 5,
        maxProcessingFee: 50,
        autoApprovalLimit: 100,
        categorySpecificPolicies: {}
      },

      // Platform fees
      platformFees: {
        listingFee: 0,
        successFee: 0,
        paymentProcessingFee: 2.9, // 2.9% + 0.30 AED (Stripe fees)
        chargebackFee: 50,
        disputeFee: 25,
        currency: 'AED'
      },

      // Vendor subscription settings
      vendorSubscriptionFee: 150, // 150 AED/month for custom Stripe
      vendorSubscriptionCurrency: 'AED',

      // Promotional and marketing
      promotionalSettings: {
        platformCouponsEnabled: true,
        vendorCouponsEnabled: true,
        maxDiscountPercent: 50,
        maxDiscountAmount: 500,
        adminApprovalRequired: false,
        blackoutDates: []
      },

      // Analytics and reporting
      revenueReportingCurrency: 'AED',
      enableRealTimeReporting: true,
      retentionPeriodDays: 2555, // 7 years

      // Vendor onboarding
      vendorApprovalRequired: true,
      defaultVendorSubscriptionPlan: 'basic',
      vendorOnboardingFee: 0,

      // Risk management
      riskSettings: {
        maxDailyTransactionAmount: 50000,
        maxMonthlyTransactionAmount: 500000,
        fraudDetectionEnabled: true,
        highRiskCategories: [],
        manualReviewThreshold: 10000,
        autoSuspensionEnabled: false
      },

      // Notification settings
      notificationSettings: {
        payoutNotifications: true,
        revenueAlerts: true,
        lowBalanceWarning: 1000,
        highVolumeAlert: 10000,
        emailNotifications: [],
        smsNotifications: []
      },

      // Business rules
      businessRules: {
        allowNegativeBalance: false,
        gracePeriodDays: 7,
        lateFeePercent: 2,
        inactivityThresholdDays: 90,
        autoArchiveAfterDays: 365
      },

      // Compliance and legal
      complianceSettings: {
        gdprCompliant: true,
        dataRetentionYears: 7,
        auditLogEnabled: true,
        requireTermsAcceptance: true,
        privacyPolicyVersion: '1.0',
        termsOfServiceVersion: '1.0'
      },

      // Integration settings
      integrationSettings: {
        accountingSoftware: {
          provider: 'custom',
          enabled: false,
          syncFrequency: 'daily'
        },
        crmIntegration: {
          provider: '',
          enabled: false,
          syncCustomers: false,
          syncTransactions: false
        },
        bankingIntegration: {
          enabled: false,
          autoReconciliation: false
        }
      },

      // Admin controls
      lastModifiedBy: defaultAdminId,
      lastModifiedAt: new Date(),
      version: 1
    });

    console.log('💾 [AdminSettings] Saving settings to database...');
    await defaultSettings.save();
    console.log('✅ [AdminSettings] Settings saved successfully! ID:', defaultSettings._id);

    return defaultSettings;
  } catch (error) {
    console.error('❌ [AdminSettings] Error creating admin revenue settings:', error);
    if (error instanceof Error) {
      console.error('❌ [AdminSettings] Error message:', error.message);
      console.error('❌ [AdminSettings] Error stack:', error.stack);
    }
    throw error;
  }
};

// If run directly
if (require.main === module) {
  const runSeed = async () => {
    try {
      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gema';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');

      // Run seed
      await ensureAdminRevenueSettings();

      console.log('✅ Seed completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    }
  };

  runSeed();
}

export default { ensureAdminRevenueSettings };
