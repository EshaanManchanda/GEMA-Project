import mongoose from "mongoose";
import { Teacher, MediaAsset, Event, User } from "../models/index";
import TeacherBooking from "../models/TeacherBooking";
import {
  TeachingMode,
  TeacherVerificationStatus,
  ITeacher,
} from "../models/Teacher";
import { AppError } from "../middleware/index";
import logger from "../config/logger";

/**
 * Teacher Service Layer
 * Contains all business logic for teacher operations
 */

// ==================== INTERFACES ====================

export interface UpdateProfileInput {
  bio?: string;
  subjects?: string[];
  expertise?: string[];
  specialization?: string;
  languagesSpoken?: string[];
  yearsOfExperience?: number;
  teachingMode?: TeachingMode;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
    country: string;
  }>;
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
    portfolio?: string;
  };
  address?: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
  };
  availabilityHours?: Record<
    string,
    {
      isAvailable: boolean;
      startTime?: string;
      endTime?: string;
    }
  >;
}

export interface TeacherStatsResult {
  totalClasses: number;
  totalStudents: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  viewsCount: number;
  totalTeachingEvents: number;
  activeTeachingEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

export interface EarningsResult {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  commissionPaid: number;
  netEarnings: number;
  currency: string;
  breakdown: Array<{
    teachingEventId: string;
    teachingEventTitle: string;
    totalRevenue: number;
    commission: number;
    netRevenue: number;
    bookingsCount: number;
  }>;
}

// ==================== PROFILE MANAGEMENT ====================

/**
 * Update teacher profile with validation
 */
export async function updateTeacherProfile(
  teacherId: mongoose.Types.ObjectId,
  input: UpdateProfileInput,
): Promise<ITeacher> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  // Update basic fields
  if (input.bio !== undefined) teacher.bio = input.bio;
  if (input.specialization !== undefined)
    teacher.specialization = input.specialization;
  if (input.yearsOfExperience !== undefined)
    teacher.yearsOfExperience = input.yearsOfExperience;
  if (input.teachingMode !== undefined)
    teacher.teachingMode = input.teachingMode;

  // Update subjects/expertise
  if (input.subjects !== undefined) {
    teacher.subjects = input.subjects;
  }
  if (input.expertise !== undefined) {
    // Merge expertise with subjects
    const combined = [
      ...new Set([...(teacher.subjects || []), ...input.expertise]),
    ];
    teacher.subjects = combined;
  }

  // Update education/qualifications
  if (input.education !== undefined) {
    teacher.education = input.education;
  }

  // Update languages
  if (input.languagesSpoken !== undefined) {
    teacher.languagesSpoken = input.languagesSpoken as any;
  }

  // Update social links
  if (input.socialLinks !== undefined) {
    teacher.socialLinks = {
      ...teacher.socialLinks,
      ...input.socialLinks,
    };
  }

  // Update address
  if (input.address !== undefined) {
    teacher.address = input.address;
  }

  // Update availability
  if (input.availabilityHours !== undefined) {
    teacher.availabilityHours = input.availabilityHours;
  }

  await teacher.save();

  logger.info("Teacher profile updated", { teacherId: teacher._id });

  return teacher;
}

/**
 * Attach offline demo video to teacher
 * Uses MediaAsset instead of raw URL
 */
export async function attachOfflineDemoVideo(
  teacherId: mongoose.Types.ObjectId,
  mediaAssetId: mongoose.Types.ObjectId,
): Promise<void> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error("Teacher not found");
  }

  const media = await MediaAsset.findById(mediaAssetId);
  if (!media) {
    throw new Error("MediaAsset not found");
  }

  teacher.teachingMode = TeachingMode.OFFLINE;
  teacher.demoVideoAssetId = mediaAssetId;

  await teacher.save();

  await (media as any).incrementUsage(
    "Teacher",
    "demoVideoAssetId",
    teacher._id as mongoose.Types.ObjectId,
  );
}

/**
 * Attach profile image to teacher
 */
export async function attachProfileImage(
  teacherId: mongoose.Types.ObjectId,
  mediaAssetId: mongoose.Types.ObjectId,
): Promise<void> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const media = await MediaAsset.findById(mediaAssetId);
  if (!media) {
    throw new AppError("MediaAsset not found", 404);
  }

  // Remove old profile image usage if exists
  if (teacher.profileImageAssetId) {
    const oldMedia = await MediaAsset.findById(teacher.profileImageAssetId);
    if (oldMedia) {
      await (oldMedia as any).decrementUsage(
        "Teacher",
        "profileImageAssetId",
        teacher._id as mongoose.Types.ObjectId,
      );
    }
  }

  teacher.profileImageAssetId = mediaAssetId;
  await teacher.save();

  await (media as any).incrementUsage(
    "Teacher",
    "profileImageAssetId",
    teacher._id as mongoose.Types.ObjectId,
  );

  logger.info("Teacher profile image updated", {
    teacherId: teacher._id,
    mediaAssetId,
  });
}

// ==================== VERIFICATION ====================

/**
 * Verify teacher qualifications (admin action)
 */
export async function verifyTeacherQualifications(
  teacherId: mongoose.Types.ObjectId,
  verifiedBy: mongoose.Types.ObjectId,
  status: TeacherVerificationStatus,
  notes?: string,
): Promise<ITeacher> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const previousStatus = teacher.verificationStatus;
  teacher.verificationStatus = status;

  // If approved, activate the teacher
  if (status === TeacherVerificationStatus.VERIFIED) {
    teacher.isActive = true;
  } else if (status === TeacherVerificationStatus.REJECTED) {
    teacher.isActive = false;
  }

  await teacher.save();

  logger.info("Teacher verification status updated", {
    teacherId: teacher._id,
    previousStatus,
    newStatus: status,
    verifiedBy,
    notes,
  });

  return teacher;
}

/**
 * Request teacher verification
 */
export async function requestVerification(
  teacherId: mongoose.Types.ObjectId,
): Promise<ITeacher> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  if (teacher.verificationStatus === TeacherVerificationStatus.VERIFIED) {
    throw new AppError("Teacher is already verified", 400);
  }

  if (teacher.verificationStatus === TeacherVerificationStatus.PENDING) {
    throw new AppError("Verification request already pending", 400);
  }

  // Validate that required fields are filled
  if (!teacher.bio || !teacher.subjects?.length) {
    throw new AppError(
      "Please complete your profile before requesting verification",
      400,
    );
  }

  teacher.verificationStatus = TeacherVerificationStatus.PENDING;
  await teacher.save();

  logger.info("Teacher verification requested", { teacherId: teacher._id });

  return teacher;
}

// ==================== STATISTICS ====================

/**
 * Calculate comprehensive teacher statistics
 */
export async function calculateTeacherStats(
  teacherId: mongoose.Types.ObjectId,
): Promise<TeacherStatsResult> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  // Get all events for this teacher (educational event types)
  const teachingEvents = await Event.find({
    teacherId,
    type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    isDeleted: false,
  });

  const teachingEventIds = teachingEvents.map((e) => e._id);

  // Get bookings stats
  const bookingStats = await TeacherBooking.aggregate([
    {
      $match: {
        "sessions.teachingEventId": { $in: teachingEventIds },
      },
    },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
          },
        },
        uniqueStudents: { $addToSet: "$studentId" },
      },
    },
  ]);

  // Revenue by month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const revenueByMonth = await TeacherBooking.aggregate([
    {
      $match: {
        "sessions.teachingEventId": { $in: teachingEventIds },
        paymentStatus: "paid",
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
          ],
        },
        revenue: 1,
      },
    },
  ]);

  // Calculate averages from teaching events
  const avgRating =
    teachingEvents.length > 0
      ? teachingEvents.reduce((sum, e) => sum + (e.averageRating || 0), 0) /
        teachingEvents.length
      : 0;

  const totalReviews = teachingEvents.reduce(
    (sum, e) => sum + (e.reviewCount || 0),
    0,
  );
  const totalViews = teachingEvents.reduce(
    (sum, e) => sum + (e.viewsCount || 0),
    0,
  );

  const stats = bookingStats[0] || {
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    uniqueStudents: [],
  };

  const result: TeacherStatsResult = {
    totalClasses: stats.totalBookings,
    totalStudents: stats.uniqueStudents?.length || 0,
    totalEarnings: stats.totalRevenue,
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews,
    viewsCount: totalViews,
    totalTeachingEvents: teachingEvents.length,
    activeTeachingEvents: teachingEvents.filter(
      (e) => e.isActive && e.status === "published",
    ).length,
    totalBookings: stats.totalBookings,
    confirmedBookings: stats.confirmedBookings,
    cancelledBookings: stats.cancelledBookings,
    revenueByMonth,
  };

  // Update teacher stats cache
  teacher.stats = {
    totalClasses: result.totalClasses,
    totalStudents: result.totalStudents,
    totalEarnings: result.totalEarnings,
    averageRating: result.averageRating,
    totalReviews: result.totalReviews,
    viewsCount: result.viewsCount,
  };
  await teacher.save();

  return result;
}

/**
 * Get teacher earnings breakdown
 */
export async function getTeacherEarnings(
  teacherId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date,
): Promise<EarningsResult> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  // Get events for this teacher
  const teachingEvents = await Event.find({
    teacherId,
    type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    isDeleted: false,
  }).lean();

  const teachingEventIds = teachingEvents.map((e) => e._id);
  const teachingEventMap = new Map(
    teachingEvents.map((e) => [e._id.toString(), e]),
  );

  // Build date filter
  const dateFilter: any = {};
  if (startDate) dateFilter.$gte = startDate;
  if (endDate) dateFilter.$lte = endDate;

  const matchFilter: any = {
    "sessions.teachingEventId": { $in: teachingEventIds },
    paymentStatus: "paid",
  };

  if (Object.keys(dateFilter).length > 0) {
    matchFilter.createdAt = dateFilter;
  }

  // Aggregate earnings by teaching event
  const earningsByEvent = await TeacherBooking.aggregate([
    { $match: matchFilter },
    { $unwind: "$sessions" },
    {
      $match: {
        "sessions.teachingEventId": { $in: teachingEventIds },
      },
    },
    {
      $group: {
        _id: "$sessions.teachingEventId",
        totalRevenue: { $sum: "$sessions.totalPrice" },
        bookingsCount: { $sum: 1 },
      },
    },
  ]);

  // Calculate commission and net earnings
  const commissionRate = teacher.getEffectiveCommissionRate() / 100;

  let totalEarnings = 0;
  let commissionPaid = 0;

  const breakdown = earningsByEvent.map((item) => {
    const event = teachingEventMap.get(item._id.toString());
    const commission = item.totalRevenue * commissionRate;
    const netRevenue = item.totalRevenue - commission;

    totalEarnings += item.totalRevenue;
    commissionPaid += commission;

    return {
      teachingEventId: item._id.toString(),
      teachingEventTitle: event?.title || "Unknown",
      totalRevenue: Math.round(item.totalRevenue * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      bookingsCount: item.bookingsCount,
    };
  });

  // TODO: Calculate pending vs paid from payout records
  const pendingEarnings = totalEarnings - commissionPaid; // Simplified
  const paidEarnings = 0; // Would need payout records

  return {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    pendingEarnings: Math.round(pendingEarnings * 100) / 100,
    paidEarnings: Math.round(paidEarnings * 100) / 100,
    commissionPaid: Math.round(commissionPaid * 100) / 100,
    netEarnings: Math.round((totalEarnings - commissionPaid) * 100) / 100,
    currency: "AED", // Default currency
    breakdown,
  };
}

// ==================== LIFECYCLE ====================

/**
 * Archive teacher (soft delete with cascading)
 */
export async function archiveTeacher(
  teacherId: mongoose.Types.ObjectId,
  archivedBy: mongoose.Types.ObjectId,
  reason?: string,
): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    // Mark teacher as deleted
    teacher.isDeleted = true;
    teacher.deletedAt = new Date();
    teacher.isActive = false;
    await teacher.save({ session });

    // Archive all events belonging to this teacher
    await Event.updateMany(
      { teacherId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
          status: "archived",
        },
      },
      { session },
    );

    // Update user role back to regular user
    await User.findByIdAndUpdate(
      teacher.userId,
      { $set: { role: "user" } },
      { session },
    );

    await session.commitTransaction();

    logger.info("Teacher archived", {
      teacherId,
      archivedBy,
      reason,
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Restore archived teacher
 */
export async function restoreTeacher(
  teacherId: mongoose.Types.ObjectId,
  restoredBy: mongoose.Types.ObjectId,
): Promise<ITeacher> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    if (!teacher.isDeleted) {
      throw new AppError("Teacher is not archived", 400);
    }

    // Restore teacher
    teacher.isDeleted = false;
    teacher.deletedAt = undefined;
    teacher.isActive = true;
    await teacher.save({ session });

    // Restore events (but keep them as drafts)
    await Event.updateMany(
      { teacherId, isDeleted: true },
      {
        $set: {
          isDeleted: false,
          status: "draft",
          isActive: false,
        },
        $unset: { deletedAt: 1 },
      },
      { session },
    );

    // Restore user role
    await User.findByIdAndUpdate(
      teacher.userId,
      { $set: { role: "teacher" } },
      { session },
    );

    await session.commitTransaction();

    logger.info("Teacher restored", {
      teacherId,
      restoredBy,
    });

    return teacher;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Suspend teacher
 */
export async function suspendTeacher(
  teacherId: mongoose.Types.ObjectId,
  suspendedBy: mongoose.Types.ObjectId,
  reason: string,
): Promise<ITeacher> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  teacher.isSuspended = true;
  teacher.isActive = false;
  await teacher.save();

  // Deactivate all events for this teacher
  await Event.updateMany(
    { teacherId, isDeleted: false },
    { $set: { isActive: false } },
  );

  logger.info("Teacher suspended", {
    teacherId,
    suspendedBy,
    reason,
  });

  return teacher;
}

/**
 * Unsuspend teacher
 */
export async function unsuspendTeacher(
  teacherId: mongoose.Types.ObjectId,
  unsuspendedBy: mongoose.Types.ObjectId,
): Promise<ITeacher> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  if (!teacher.isSuspended) {
    throw new AppError("Teacher is not suspended", 400);
  }

  teacher.isSuspended = false;
  teacher.isActive = true;
  await teacher.save();

  logger.info("Teacher unsuspended", {
    teacherId,
    unsuspendedBy,
  });

  return teacher;
}

// ==================== QUERIES ====================

/**
 * Get teacher by user ID
 */
export async function getTeacherByUserId(
  userId: mongoose.Types.ObjectId,
): Promise<ITeacher | null> {
  return Teacher.findOne({ userId, isDeleted: false });
}

/**
 * Get teacher with populated fields
 */
export async function getTeacherWithDetails(
  teacherId: mongoose.Types.ObjectId,
): Promise<ITeacher | null> {
  return Teacher.findById(teacherId)
    .populate("userId", "firstName lastName email avatar")
    .populate("profileImageAssetId")
    .populate("demoVideoAssetId")
    .populate("education.certificateAssetId");
}

/**
 * Search teachers
 */
export async function searchTeachers(query: {
  search?: string;
  subjects?: string[];
  teachingMode?: TeachingMode;
  verificationStatus?: TeacherVerificationStatus;
  minRating?: number;
  city?: string;
  page?: number;
  limit?: number;
}): Promise<{
  teachers: ITeacher[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    search,
    subjects,
    teachingMode,
    verificationStatus,
    minRating,
    city,
    page = 1,
    limit = 20,
  } = query;

  const filter: any = {
    isDeleted: false,
    isActive: true,
  };

  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, "i") },
      { bio: new RegExp(search, "i") },
      { specialization: new RegExp(search, "i") },
    ];
  }

  if (subjects?.length) {
    filter.subjects = { $in: subjects };
  }

  if (teachingMode) {
    filter.teachingMode = teachingMode;
  }

  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  }

  if (minRating) {
    filter["stats.averageRating"] = { $gte: minRating };
  }

  if (city) {
    filter["address.city"] = new RegExp(city, "i");
  }

  const skip = (page - 1) * limit;

  const [teachers, total] = await Promise.all([
    Teacher.find(filter)
      .populate("userId", "firstName lastName avatar")
      .sort({ "stats.averageRating": -1, "stats.totalReviews": -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Teacher.countDocuments(filter),
  ]);

  return {
    teachers: teachers as unknown as ITeacher[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export default {
  updateTeacherProfile,
  attachOfflineDemoVideo,
  attachProfileImage,
  verifyTeacherQualifications,
  requestVerification,
  calculateTeacherStats,
  getTeacherEarnings,
  archiveTeacher,
  restoreTeacher,
  suspendTeacher,
  unsuspendTeacher,
  getTeacherByUserId,
  getTeacherWithDetails,
  searchTeachers,
};
