import Teacher, {
  TeacherPaymentMode,
  TeacherSubscriptionStatus,
  TeacherVerificationStatus,
} from "../models/Teacher";
import User from "../models/User";
import { Types } from "mongoose";
import logger from "../config/logger";

/**
 * Get or create teacher profile for a user
 * Useful for migration & safety – auto-creates teacher profile if missing
 */
export async function getOrCreateTeacherProfile(
  userId: Types.ObjectId | string,
) {
  const userIdObj =
    typeof userId === "string" ? new Types.ObjectId(userId) : userId;

  // Try to find existing teacher by userId
  let teacher = await Teacher.findOne({ userId: userIdObj });

  if (teacher) {
    return teacher;
  }

  // Teacher profile does not exist, create from User
  const user = await User.findById(userIdObj);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate user role
  if (user.role !== "teacher") {
    throw new Error("User is not a teacher");
  }

  // Fallback: find by email in case userId was never set on an existing record
  // (can happen if profile was created via a different path)
  const existingByEmail = await Teacher.findOne({ email: user.email, isDeleted: false });
  if (existingByEmail) {
    // Link the userId to this record so future lookups succeed
    existingByEmail.userId = userIdObj;
    await existingByEmail.save();
    return existingByEmail;
  }

  // Create teacher profile from user data
  teacher = new Teacher({
    userId: userIdObj,

    // Basic Info
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone || "",
    profileImage: user.avatar || "",
    bio: "",

    // Expertise & Qualifications (empty defaults)
    subjects: [],
    expertise: [],
    teachingDescription: "",
    qualifications: [],
    certifications: [],
    yearsOfExperience: 0,
    specialization: "",
    languagesSpoken: [],

    // Contact & Address (safe defaults)
    contactInformation: {
      email: user.email,
      phone: user.phone || "",
    },
    teachingAddress: {
      address: user.addresses?.[0]?.street || "Not provided",
      city: user.addresses?.[0]?.city || "Dubai",
      country: user.addresses?.[0]?.country || "United Arab Emirates",
      postalCode: user.addresses?.[0]?.zipCode,
    },

    // Teaching Details
    onlineTeachingEnabled: true,
    inPersonTeachingEnabled: false,
    teachingAvailability: {
      daysOfWeek: [],
      timeSlots: [],
    },
    socialMedia: user.socialMedia || {},
    website: user.socialMedia?.website || "",

    // Payment & Monetization (safe defaults)
    paymentSettings: {
      paymentMode: TeacherPaymentMode.PLATFORM_STRIPE,
      stripeSettings: {
        isOnboardingComplete: false,
        isTestMode: true,
      },
      commissionRate: 15,
    },

    subscriptionSettings: {
      subscriptionStatus: TeacherSubscriptionStatus.INACTIVE,
    },

    payoutSettings: {
      payoutSchedule: "weekly",
      minimumPayout: 50,
      preferredPayoutMethod: "bank_transfer",
    },

    // Ratings & Reviews
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
    reviews: [],

    // Statistics
    totalClasses: 0,
    totalStudents: 0,
    totalEarnings: 0,
    viewsCount: 0,

    // Verification & Status
    verificationStatus: TeacherVerificationStatus.UNVERIFIED,
    isApproved: false,
    isVerified: false,
    status:
      user.status === "active"
        ? "active"
        : user.status === "suspended"
          ? "suspended"
          : "pending",

    // Metadata
    isDeleted: false,
    createdAt: user.createdAt || new Date(),
  });

  await teacher.save();

  logger.info(`✓ Auto-created teacher profile for user ${userIdObj}`);

  return teacher;
}

/**
 * Ensure teacher profile exists for authenticated teacher user
 * Middleware / service helper
 */
export async function ensureTeacherProfile(userId: Types.ObjectId | string) {
  try {
    return await getOrCreateTeacherProfile(userId);
  } catch (error: any) {
    logger.error("Error ensuring teacher profile:", error);
    throw error;
  }
}
