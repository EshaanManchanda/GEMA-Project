import Vendor, {
  PaymentMode,
  VendorSubscriptionStatus,
  VerificationStatus,
} from "../models/Vendor";
import User from "../models/User";
import { Types } from "mongoose";
import logger from "../config/logger";

/**
 * Get or create vendor profile for a user
 * This helps with migration - if vendor profile doesn't exist, create it from User data
 */
export async function getOrCreateVendorProfile(
  userId: Types.ObjectId | string,
) {
  const userIdObj =
    typeof userId === "string" ? new Types.ObjectId(userId) : userId;

  // Try to find existing vendor
  let vendor = await Vendor.findOne({ userId: userIdObj });

  if (vendor) {
    return vendor;
  }

  // Vendor doesn't exist, create from User data
  const user = await User.findById(userIdObj);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is a vendor
  if (user.role !== "vendor") {
    throw new Error("User is not a vendor");
  }

  // Create vendor profile from user data
  vendor = new Vendor({
    userId: userIdObj,

    // Business Information
    businessName: `${user.firstName} ${user.lastName}'s Business`,
    description: "",
    logo: user.avatar || "",
    coverImage: "",

    // Contact Information
    email: user.email,
    phone: user.phone || "",
    contactPerson: {
      name: `${user.firstName} ${user.lastName}`,
      position: "Owner",
      email: user.email,
      phone: user.phone || "",
    },

    // Address - Provide defaults to pass validation
    address: {
      street: user.addresses?.[0]?.street || "Not provided",
      city: user.addresses?.[0]?.city || "Dubai",
      state: user.addresses?.[0]?.state || "Dubai",
      zipCode: user.addresses?.[0]?.zipCode || "00000",
      country: user.addresses?.[0]?.country || "United Arab Emirates",
    },

    // Business Details
    businessHours: {},
    socialMedia: user.socialMedia || {},
    website: user.socialMedia?.website || "",

    // Tax Information
    taxInformation: {
      taxId: "",
      businessType: "",
      registrationNumber: "",
      vatNumber: "",
    },

    // Payment Settings - Start with platform Stripe (safest default)
    paymentSettings: {
      paymentMode: PaymentMode.PLATFORM_STRIPE,

      stripeSettings: {
        stripeConnectAccountId: undefined,
        stripeConnectOnboardingComplete: false,
        stripePublishableKey: undefined,
        stripeSecretKey: undefined,
        stripeTestMode: true,
      },

      commissionRate: 5,
      subscriptionStatus: VendorSubscriptionStatus.INACTIVE,
      subscriptionAmount: 150,

      payoutSchedule: "weekly",
      minimumPayout: 50,
      preferredPayoutMethod: "bank_transfer",

      acceptsPlatformPayments: true,
      autoPayoutEnabled: false,
    },

    // Status
    verificationStatus: VerificationStatus.UNVERIFIED,
    isActive: user.status === "active",
    isSuspended: user.status === "suspended",

    // Statistics
    stats: {
      totalEvents: 0,
      totalBookings: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalReviews: 0,
    },

    memberSince: user.createdAt || new Date(),
  });

  await vendor.save();

  logger.info(`✓ Auto-created vendor profile for user ${userId}`);

  return vendor;
}

/**
 * Ensure vendor profile exists for authenticated vendor user
 * Middleware helper
 */
export async function ensureVendorProfile(userId: Types.ObjectId | string) {
  try {
    return await getOrCreateVendorProfile(userId);
  } catch (error: any) {
    logger.error("Error ensuring vendor profile:", error);
    throw error;
  }
}
