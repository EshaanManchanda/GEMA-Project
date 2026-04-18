import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User, { UserRole } from "../models/index";
import Vendor, {
  PaymentMode,
  VendorSubscriptionStatus,
  VerificationStatus,
} from "../models/index";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Migration Script: User Vendor Data -> Vendor Model
 *
 * This script migrates all vendor-related data from the User model
 * to the new separate Vendor model.
 *
 * IMPORTANT: Make a backup before running this script!
 *
 * Usage:
 *   npm run migrate:vendors
 *   OR
 *   ts-node src/scripts/migrateVendorsToNewModel.ts
 */

interface MigrationStats {
  totalVendors: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

async function connectDatabase(): Promise<void> {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error);
    throw error;
  }
}

async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("✓ Disconnected from MongoDB");
}

function mapVerificationStatus(status?: string): VerificationStatus {
  switch (status) {
    case "verified":
      return VerificationStatus.VERIFIED;
    case "pending":
      return VerificationStatus.PENDING;
    case "rejected":
      return VerificationStatus.REJECTED;
    default:
      return VerificationStatus.UNVERIFIED;
  }
}

async function migrateVendor(user: any, stats: MigrationStats): Promise<void> {
  try {
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ userId: user._id });
    if (existingVendor) {
      console.log(`  → Skipping user ${user._id} - Vendor already exists`);
      stats.skipped++;
      return;
    }

    // Extract vendor-specific data from User model
    const vendorData = {
      userId: user._id,

      // Business Information
      businessName:
        user.businessName || `${user.firstName} ${user.lastName}'s Business`,
      description: user.description || "",
      logo: user.avatar || "",
      coverImage: user.coverImage || "",

      // Contact Information
      email: user.email,
      phone: user.phone || "",
      contactPerson: {
        name: `${user.firstName} ${user.lastName}`,
        position: "Owner",
        email: user.email,
        phone: user.phone || "",
      },

      // Address
      address: {
        street: user.addresses?.[0]?.street || "",
        city: user.addresses?.[0]?.city || "",
        state: user.addresses?.[0]?.state || "",
        zipCode: user.addresses?.[0]?.zipCode || "",
        country: user.addresses?.[0]?.country || "United Arab Emirates",
      },

      // Business Details
      businessHours: user.businessHours || {},
      socialMedia: user.socialMedia || {},
      website: user.socialMedia?.website || "",

      // Tax Information
      taxInformation: {
        taxId: user.taxInformation?.taxId || "",
        businessType: user.taxInformation?.businessType || "",
        registrationNumber: "",
        vatNumber: "",
      },

      // Payment Settings
      paymentSettings: {
        // Payment mode
        paymentMode: user.vendorPaymentSettings?.hasCustomStripeAccount
          ? PaymentMode.CUSTOM_STRIPE
          : PaymentMode.PLATFORM_STRIPE,
        paymentModeChangedAt: user.vendorPaymentSettings?.hasCustomStripeAccount
          ? new Date()
          : undefined,

        // Stripe settings
        stripeSettings: {
          // Stripe Connect
          stripeConnectAccountId:
            user.vendorPaymentSettings?.stripeAccountId || undefined,
          stripeConnectOnboardingComplete: Boolean(
            user.vendorPaymentSettings?.stripeAccountId,
          ),
          stripeConnectCapabilities: user.vendorPaymentSettings?.stripeAccountId
            ? {
                card_payments: "active",
                transfers: "active",
              }
            : undefined,

          // Manual keys (need to fetch with select: false)
          stripePublishableKey:
            user.vendorPaymentSettings?.stripePublishableKey || undefined,
          stripeSecretKey:
            user.vendorPaymentSettings?.stripeSecretKey ||
            user.vendorPaymentSettings?.stripeApiKey ||
            undefined,
          stripeTestMode:
            !user.vendorPaymentSettings?.stripePublishableKey?.startsWith(
              "pk_live_",
            ),

          stripeKeysLastValidated: undefined,
          stripeKeysValidationError: undefined,
        },

        // Commission
        commissionRate: user.vendorPaymentSettings?.commissionRate || 5,
        customCommissionRate: undefined,
        commissionAgreements: [],

        // Subscription
        subscriptionStatus: user.vendorPaymentSettings?.subscriptionActive
          ? VendorSubscriptionStatus.ACTIVE
          : VendorSubscriptionStatus.INACTIVE,
        subscriptionAmount:
          user.vendorPaymentSettings?.subscriptionAmount || 150,
        subscriptionStartDate: user.vendorPaymentSettings?.subscriptionActive
          ? user.createdAt
          : undefined,
        subscriptionPaidUntil:
          user.vendorPaymentSettings?.subscriptionPaidUntil || undefined,
        subscriptionHistory: [],

        // Payout settings
        payoutSchedule: user.vendorPaymentSettings?.payoutSchedule || "weekly",
        minimumPayout: user.vendorPaymentSettings?.minimumPayout || 50,
        preferredPayoutMethod:
          user.vendorPaymentSettings?.preferredPayoutMethod || "bank_transfer",
        bankAccountDetails: user.vendorPaymentSettings?.bankAccountDetails
          ? {
              accountHolderName:
                user.vendorPaymentSettings.bankAccountDetails.accountHolderName,
              bankName: user.vendorPaymentSettings.bankAccountDetails.bankName,
              accountNumber:
                user.vendorPaymentSettings.bankAccountDetails.accountNumber,
              routingNumber:
                user.vendorPaymentSettings.bankAccountDetails.routingNumber,
              iban: user.vendorPaymentSettings.bankAccountDetails.iban,
              swiftCode:
                user.vendorPaymentSettings.bankAccountDetails.swiftCode,
              isVerified: false,
            }
          : undefined,

        // Flags
        acceptsPlatformPayments:
          user.vendorPaymentSettings?.acceptsPlatformPayments !== false,
        autoPayoutEnabled: false,
      },

      // Status & Verification
      verificationStatus: mapVerificationStatus(user.verificationStatus),
      verificationNotes: "",
      isActive: user.status === "active",
      isSuspended: user.status === "suspended",
      suspensionReason:
        user.status === "suspended"
          ? "Migrated from suspended user account"
          : undefined,

      // Statistics
      stats: {
        totalEvents: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
        lastCalculatedAt: undefined,
      },

      // Timestamps
      memberSince: user.createdAt || new Date(),
    };

    // Create new vendor document
    const vendor = new Vendor(vendorData);
    await vendor.save();

    console.log(`  ✓ Migrated vendor: ${user.email} (ID: ${user._id})`);
    stats.migrated++;
  } catch (error: any) {
    console.error(`  ✗ Failed to migrate user ${user._id}:`, error.message);
    stats.failed++;
    stats.errors.push({
      userId: user._id.toString(),
      error: error.message,
    });
  }
}

async function runMigration(): Promise<void> {
  console.log("=".repeat(70));
  console.log("VENDOR MIGRATION SCRIPT");
  console.log("=".repeat(70));
  console.log("");

  const stats: MigrationStats = {
    totalVendors: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Connect to database
    await connectDatabase();
    console.log("");

    // Find all vendor users
    console.log("📊 Finding vendor users...");
    const vendorUsers = await User.find({ role: UserRole.VENDOR })
      .select(
        "+vendorPaymentSettings.stripeSecretKey +vendorPaymentSettings.stripeApiKey",
      )
      .lean();

    stats.totalVendors = vendorUsers.length;
    console.log(`   Found ${stats.totalVendors} vendor users to migrate`);
    console.log("");

    // Migrate each vendor
    console.log("🔄 Starting migration...");
    for (let i = 0; i < vendorUsers.length; i++) {
      const user = vendorUsers[i];
      console.log(
        `[${i + 1}/${stats.totalVendors}] Migrating ${user.email}...`,
      );
      await migrateVendor(user, stats);
    }

    console.log("");
    console.log("=".repeat(70));
    console.log("MIGRATION COMPLETE");
    console.log("=".repeat(70));
    console.log("");
    console.log("📈 Statistics:");
    console.log(`   Total Vendors:     ${stats.totalVendors}`);
    console.log(`   ✓ Migrated:        ${stats.migrated}`);
    console.log(`   → Skipped:         ${stats.skipped}`);
    console.log(`   ✗ Failed:          ${stats.failed}`);
    console.log("");

    if (stats.errors.length > 0) {
      console.log("❌ Errors:");
      stats.errors.forEach((err) => {
        console.log(`   User ID: ${err.userId}`);
        console.log(`   Error: ${err.error}`);
        console.log("");
      });
    }

    if (stats.failed === 0) {
      console.log("✅ All vendors migrated successfully!");
      console.log("");
      console.log("📝 Next steps:");
      console.log("   1. Update Event model to reference Vendor");
      console.log("   2. Update Payout model to reference Vendor");
      console.log(
        "   3. Update CommissionTransaction model to reference Vendor",
      );
      console.log("   4. Update Employee model to reference Vendor");
      console.log("   5. Update vendor controller to use new Vendor model");
      console.log("   6. Test all vendor functionality");
      console.log(
        "   7. Update statistics in vendor documents (run calculateStats script)",
      );
    } else {
      console.log(
        "⚠️  Some vendors failed to migrate. Please review errors above.",
      );
    }
  } catch (error: any) {
    console.error("");
    console.error("❌ Migration failed:", error);
    console.error("");
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("");
      console.log("Exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed with error:", error);
      process.exit(1);
    });
}

export { runMigration, MigrationStats };
