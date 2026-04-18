import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import Vendor from "../../models/index";
import User from "../../models/index";
import logger from "../../config/logger";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const AFFILIATE_VENDOR_EMAIL = "affiliate@kidrove-system.com";
const AFFILIATE_VENDOR_BUSINESS_NAME = "Platform Affiliate";

/**
 * Ensures the affiliate vendor exists in the database.
 * This function is called during backend startup.
 * It's idempotent and safe to call multiple times.
 *
 * @returns The existing or newly created vendor document
 */
export async function ensureAffiliateVendor() {
  try {
    // Check if affiliate vendor already exists
    const existingVendor = await Vendor.findOne({
      email: AFFILIATE_VENDOR_EMAIL,
    });

    if (existingVendor) {
      logger.info("Affiliate vendor already exists", {
        vendorId: existingVendor._id,
        businessName: existingVendor.businessName,
      });
      return existingVendor;
    }

    // Check if a user exists with this email
    const existingUser = await User.findOne({ email: AFFILIATE_VENDOR_EMAIL });
    let userId: mongoose.Types.ObjectId;

    if (existingUser) {
      logger.info("Found existing user with affiliate email", {
        userId: existingUser._id,
      });
      userId = existingUser._id as mongoose.Types.ObjectId;
    } else {
      // Create system user for affiliate vendor
      const randomPassword = Math.random().toString(36).slice(-16) + "Aa1!";
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const affiliateUser = await User.create({
        firstName: "Affiliate",
        lastName: "System",
        email: AFFILIATE_VENDOR_EMAIL,
        passwordHash,
        role: "vendor",
        phone: "+1000000000",
        isPhoneVerified: true,
        status: "active",
        isEmailVerified: true,
        twoFactorAuth: {
          enabled: false,
        },
      });
      logger.info("Created affiliate system user", {
        userId: affiliateUser._id,
      });
      userId = affiliateUser._id as mongoose.Types.ObjectId;
    }

    // Create affiliate vendor
    const affiliateVendor = await Vendor.create({
      userId,
      email: AFFILIATE_VENDOR_EMAIL,
      businessName: AFFILIATE_VENDOR_BUSINESS_NAME,
      phone: "+1000000000",
      contactPerson: {
        name: "Affiliate System",
        position: "System Account",
        email: AFFILIATE_VENDOR_EMAIL,
        phone: "+1000000000",
      },
      description:
        "System vendor for affiliate events. This vendor is used for events that redirect to external booking links.",
      address: {
        street: "System Address",
        city: "System City",
        state: "System State",
        zipCode: "00000",
        country: "United Arab Emirates",
      },
      taxInformation: {
        taxId: "SYSTEM-TAX-ID",
        businessType: "affiliate_system",
        registrationNumber: "GEMA-AFFILIATE-SYSTEM",
      },
      verificationStatus: "verified",
      isActive: true,
      isSuspended: false,
      website: "https://gema-events.com",
      socialMedia: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
      },
      businessHours: {},
      rating: {
        average: 0,
        count: 0,
      },
      analytics: {
        totalEvents: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageEventRating: 0,
      },
      paymentSettings: {
        paymentMode: "platform_stripe",
        stripeSettings: {
          stripeConnectOnboardingComplete: false,
          stripeTestMode: true,
        },
        commissionRate: 0,
        subscriptionStatus: "active",
        subscriptionAmount: 0,
        payoutSchedule: "monthly",
        minimumPayout: 0,
        preferredPayoutMethod: "bank_transfer",
        acceptsPlatformPayments: false,
        autoPayoutEnabled: false,
      },
    });

    logger.info("Successfully created affiliate vendor", {
      vendorId: affiliateVendor._id,
      userId,
      businessName: affiliateVendor.businessName,
      email: affiliateVendor.email,
    });

    return affiliateVendor;
  } catch (error) {
    logger.error("Error ensuring affiliate vendor exists", { error });
    throw error;
  }
}

/**
 * Standalone function for manual seeding.
 * Connects to MongoDB, creates the vendor, and disconnects.
 */
async function seedAffiliateVendor() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");

    // Use the shared ensure function
    const vendor = await ensureAffiliateVendor();

    console.log(
      "\n📋 Use this Vendor ID when creating affiliate events in the admin panel",
    );
    console.log("Vendor ID:", vendor._id);

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error seeding affiliate vendor:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedAffiliateVendor();
}

export default seedAffiliateVendor;
