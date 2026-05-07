import mongoose from "mongoose";
import CommissionConfig from "../models/CommissionConfig";
import {
  ConfigStatus,
  CommissionRuleType,
  RecipientType,
  RuleStatus,
} from "../models/CommissionConfig";

/**
 * Seed default commission configurations
 */
export const seedCommissionConfigs = async (
  adminId: mongoose.Types.ObjectId,
) => {
  try {
    console.log("🔄 Seeding commission configurations...");

    // Check if configurations already exist
    const existingCount = await CommissionConfig.countDocuments();
    if (existingCount > 0) {
      console.log(
        `✓ Commission configurations already exist (${existingCount} found). Skipping seed.`,
      );
      return;
    }

    const configs = [
      // Default Standard Commission
      {
        name: "Standard Commission (5%)",
        description: "Default 5% platform commission for all vendors",
        version: "1.0",
        status: ConfigStatus.ACTIVE,
        isDefault: true,
        platformCommission: {
          defaultPercentage: 5,
          minAmount: 0,
          maxAmount: 10000,
          currency: "AED",
        },
        rules: [
          {
            id: "platform_standard",
            name: "Platform 5% Commission",
            type: CommissionRuleType.PERCENTAGE,
            recipient: RecipientType.PLATFORM,
            percentage: 5,
            status: RuleStatus.ACTIVE,
            priority: 1,
          },
        ],
        multiLevelEnabled: false,
        maxLevels: 3,
        createdBy: adminId,
      },

      // Premium Vendor Configuration
      {
        name: "Premium Vendor (3%)",
        description: "Reduced 3% commission for premium/verified vendors",
        version: "1.0",
        status: ConfigStatus.ACTIVE,
        isDefault: false,
        platformCommission: {
          defaultPercentage: 3,
          minAmount: 0,
          maxAmount: 50000,
          currency: "AED",
        },
        rules: [
          {
            id: "platform_premium",
            name: "Platform 3% Commission (Premium)",
            type: CommissionRuleType.PERCENTAGE,
            recipient: RecipientType.PLATFORM,
            percentage: 3,
            status: RuleStatus.ACTIVE,
            priority: 1,
          },
        ],
        multiLevelEnabled: false,
        maxLevels: 3,
        createdBy: adminId,
      },

      // Tiered Commission Configuration
      {
        name: "Tiered Commission",
        description: "Variable commission rate based on order value",
        version: "1.0",
        status: ConfigStatus.ACTIVE,
        isDefault: false,
        platformCommission: {
          defaultPercentage: 5,
          minAmount: 0,
          currency: "AED",
        },
        rules: [
          {
            id: "tier_low",
            name: "Small Orders (< 1000 AED) - 5%",
            type: CommissionRuleType.TIERED,
            recipient: RecipientType.PLATFORM,
            tiers: [
              {
                minAmount: 0,
                maxAmount: 1000,
                percentage: 5,
              },
            ],
            conditions: {
              maxOrderAmount: 1000,
            },
            status: RuleStatus.ACTIVE,
            priority: 1,
          },
          {
            id: "tier_medium",
            name: "Medium Orders (1000-5000 AED) - 3%",
            type: CommissionRuleType.TIERED,
            recipient: RecipientType.PLATFORM,
            tiers: [
              {
                minAmount: 1000,
                maxAmount: 5000,
                percentage: 3,
              },
            ],
            conditions: {
              minOrderAmount: 1000,
              maxOrderAmount: 5000,
            },
            status: RuleStatus.ACTIVE,
            priority: 2,
          },
          {
            id: "tier_high",
            name: "Large Orders (> 5000 AED) - 2%",
            type: CommissionRuleType.TIERED,
            recipient: RecipientType.PLATFORM,
            tiers: [
              {
                minAmount: 5000,
                percentage: 2,
              },
            ],
            conditions: {
              minOrderAmount: 5000,
            },
            status: RuleStatus.ACTIVE,
            priority: 3,
          },
        ],
        multiLevelEnabled: false,
        maxLevels: 3,
        createdBy: adminId,
      },

      // Affiliate Commission Configuration
      {
        name: "Affiliate Commission (10%)",
        description: "Commission configuration for affiliate referrals",
        version: "1.0",
        status: ConfigStatus.ACTIVE,
        isDefault: false,
        platformCommission: {
          defaultPercentage: 5,
          minAmount: 0,
          currency: "AED",
        },
        rules: [
          {
            id: "platform_affiliate",
            name: "Platform Commission - 5%",
            type: CommissionRuleType.PERCENTAGE,
            recipient: RecipientType.PLATFORM,
            percentage: 5,
            status: RuleStatus.ACTIVE,
            priority: 1,
          },
          {
            id: "affiliate_commission",
            name: "Affiliate Referral - 10%",
            type: CommissionRuleType.PERCENTAGE,
            recipient: RecipientType.AFFILIATE,
            percentage: 10,
            status: RuleStatus.ACTIVE,
            priority: 2,
          },
        ],
        multiLevelEnabled: true,
        maxLevels: 3,
        levelDistribution: [
          { level: 1, percentage: 10 },
          { level: 2, percentage: 5 },
          { level: 3, percentage: 2 },
        ],
        createdBy: adminId,
      },
    ];

    // Insert all configurations
    const createdConfigs = await CommissionConfig.insertMany(configs);
    console.log(
      `✅ Successfully seeded ${createdConfigs.length} commission configurations`,
    );

    return createdConfigs;
  } catch (error) {
    console.error("❌ Error seeding commission configurations:", error);
    throw error;
  }
};

/**
 * Ensure default commission configuration exists
 */
export const ensureDefaultCommissionConfig = async (
  adminId?: mongoose.Types.ObjectId,
) => {
  try {
    // Check if any commission config exists
    const existingConfig = await CommissionConfig.findOne();

    if (existingConfig) {
      // Ensure there's a default config
      const defaultConfig = await CommissionConfig.findOne({ isDefault: true });
      if (!defaultConfig) {
        console.log(
          "⚠️  No default commission config found. Setting first config as default...",
        );
        existingConfig.isDefault = true;
        await existingConfig.save();
        console.log("✅ Default commission config set");
      }
      return existingConfig;
    }

    // No configs exist, create a basic default one
    console.log("📝 Creating default commission configuration...");

    const defaultAdminId = adminId || new mongoose.Types.ObjectId();

    const defaultConfig = new CommissionConfig({
      name: "Default Platform Commission (5%)",
      description: "Standard 5% commission for all transactions",
      version: "1.0",
      status: ConfigStatus.ACTIVE,
      isDefault: true,
      platformCommission: {
        defaultPercentage: 5,
        minAmount: 0,
        maxAmount: 100000,
        currency: "AED",
      },
      rules: [
        {
          id: "platform_default",
          name: "Platform 5% Commission",
          type: CommissionRuleType.PERCENTAGE,
          recipient: RecipientType.PLATFORM,
          percentage: 5,
          status: RuleStatus.ACTIVE,
          priority: 1,
        },
      ],
      multiLevelEnabled: false,
      maxLevels: 3,
      createdBy: defaultAdminId,
    });

    await defaultConfig.save();
    console.log("✅ Default commission configuration created");

    return defaultConfig;
  } catch (error) {
    console.error("❌ Error ensuring default commission config:", error);
    throw error;
  }
};

// If run directly
if (require.main === module) {
  const runSeed = async () => {
    try {
      // Connect to MongoDB
      const mongoUri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
      await mongoose.connect(mongoUri);
      console.log("✅ Connected to MongoDB");

      // Create a dummy admin ID for seeding
      const dummyAdminId = new mongoose.Types.ObjectId();

      // Run seed
      await seedCommissionConfigs(dummyAdminId);

      console.log("✅ Seed completed successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    }
  };

  runSeed();
}

export default { seedCommissionConfigs, ensureDefaultCommissionConfig };
