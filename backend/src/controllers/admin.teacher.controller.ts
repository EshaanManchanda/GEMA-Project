import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware";
import { ApiResponse, AuthRequest } from "../types";
import Teacher, {
  TeacherPaymentMode,
  TeacherVerificationStatus,
} from "../models/Teacher";
import TeacherSubscription, {
  TeacherSubscriptionStatus,
} from "../models/TeacherSubscription";
import User from "../models/User";

/**
 * Get all teachers with pagination
 * @route GET /api/admin/teachers
 */
export const getAllTeachers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      paymentMode,
      verificationStatus,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const teacherUserIds = await User.distinct("_id", { role: "teacher" });
    const query: any = { isDeleted: false, userId: { $in: teacherUserIds } };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (
      paymentMode &&
      Object.values(TeacherPaymentMode).includes(
        paymentMode as TeacherPaymentMode,
      )
    ) {
      query["paymentSettings.paymentMode"] = paymentMode;
    }

    if (
      verificationStatus &&
      Object.values(TeacherVerificationStatus).includes(
        verificationStatus as TeacherVerificationStatus,
      )
    ) {
      query.verificationStatus = verificationStatus;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };

    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .populate("userId", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Teacher.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        teachers: teachers.map((t) => ({
          id: t._id,
          _id: t._id,
          fullName: t.fullName,
          email: t.email,
          phone: t.phone,
          user: t.userId,
          paymentMode: t.paymentSettings?.paymentMode,
          commissionRate: t.paymentSettings?.commissionRate,
          verificationStatus: t.verificationStatus,
          isActive: t.isActive,
          isSuspended: t.isSuspended,
          teachingMode: t.teachingMode,
          languagesSpoken: t.languagesSpoken,
          createdAt: t.createdAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get teacher by ID
 * @route GET /api/admin/teachers/:id
 */

export const getTeacherById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid teacher ID", 400));
    }

    const teacher = await Teacher.findById(id)
      .populate("userId", "firstName lastName email")
      .lean();

    if (!teacher) {
      return next(new AppError("Teacher not found", 404));
    }

    const subscription = await TeacherSubscription.findOne({
      teacherId: teacher._id,
    }).lean();

    res.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          _id: teacher._id,
          fullName: teacher.fullName,
          email: teacher.email,
          phone: teacher.phone,
          bio: teacher.bio,
          subjects: teacher.subjects,
          specialization: teacher.specialization,
          languagesSpoken: teacher.languagesSpoken,
          teachingMode: teacher.teachingMode,
          paymentSettings: teacher.paymentSettings,
          verificationStatus: teacher.verificationStatus,
          isActive: teacher.isActive,
          isSuspended: teacher.isSuspended,
          stats: teacher.stats,
          subscription: subscription || null,
          createdAt: teacher.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create teacher
 * @route POST /api/admin/teachers
 */
export const createTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      userId,
      fullName,
      email,
      phone,
      bio,
      subjects,
      specialization,
      languagesSpoken,
      yearsOfExperience,
      teachingMode,
      address,
      demoVideoAssetId,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(new AppError("Invalid user ID", 400));
    }

    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    if (user.role !== "teacher") {
      return next(new AppError("User role must be TEACHER", 400));
    }

    const existingTeacher = await Teacher.findOne({ userId });
    if (existingTeacher) {
      return next(new AppError("Teacher profile already exists", 409));
    }

    if (
      (teachingMode === "offline" || teachingMode === "hybrid") &&
      (!address || !address.city)
    ) {
      return next(
        new AppError("Address is required for offline or hybrid teaching", 400),
      );
    }

    const teacher = await Teacher.create({
      userId,
      fullName,
      email,
      phone,
      bio,
      subjects,
      specialization,
      languagesSpoken,
      yearsOfExperience,
      teachingMode,
      address,
      demoVideoAssetId,

      paymentSettings: {
        paymentMode: TeacherPaymentMode.PLATFORM_STRIPE,
        commissionRate: 5,
        subscriptionStatus: "inactive",
        subscriptionAmount: 150,
        payoutSchedule: "weekly",
        minimumPayout: 50,
        preferredPayoutMethod: "bank_transfer",
        acceptsPlatformPayments: true,
        autoPayoutEnabled: false,
        stripeSettings: {
          stripeConnectOnboardingComplete: false,
          stripeTestMode: true,
        },
      },

      verificationStatus: TeacherVerificationStatus.UNVERIFIED,
      isActive: false,
      isSuspended: false,
      isDeleted: false,
      memberSince: new Date(),
    });

    await TeacherSubscription.create({
      teacherId: teacher._id,
      status: "inactive",
      amount: 150,
      startDate: null,
      endDate: null,
    });

    res.status(201).json({
      success: true,
      message: "Teacher created successfully (pending verification)",
      data: {
        id: teacher._id,
        verificationStatus: teacher.verificationStatus,
        paymentMode: teacher.paymentSettings.paymentMode,
        subscriptionStatus: teacher.paymentSettings.subscriptionStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update teacher profile
 * @route PUT /api/admin/teachers/:id
 */
export const updateTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid teacher ID", 400));
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    const updatableFields = [
      "fullName",
      "bio",
      "subjects",
      "specialization",
      "languagesSpoken",
      "yearsOfExperience",
      "teachingMode",
      "address",
      "socialLinks",
      "availabilityHours",
      "education",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (teacher as any)[field] = req.body[field];
      }
    });

    await teacher.save();

    res.json({
      success: true,
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete teacher
 * @route DELETE /api/admin/teachers/:id
 */
export const softDeleteTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    teacher.isDeleted = true;
    teacher.deletedAt = new Date();
    teacher.isActive = false;

    await teacher.save();

    res.json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Suspend or unsuspend teacher
 * @route PUT /api/admin/teachers/:id/suspend
 */
export const toggleTeacherSuspension = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    teacher.isSuspended = Boolean(isSuspended);

    // Optional: auto deactivate when suspended
    if (teacher.isSuspended) {
      teacher.isActive = false;
    }

    await teacher.save();

    res.json({
      success: true,
      message: isSuspended ? "Teacher suspended" : "Teacher unsuspended",
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Activate or deactivate teacher
 * @route PUT /api/admin/teachers/:id/active
 */
export const toggleTeacherActiveStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    if (teacher.isSuspended && isActive) {
      return next(new AppError("Cannot activate a suspended teacher", 400));
    }

    teacher.isActive = Boolean(isActive);
    await teacher.save();

    res.json({
      success: true,
      message: isActive ? "Teacher activated" : "Teacher deactivated",
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update teacher payment mode
 * @route PUT /api/admin/teachers/:id/payment-mode
 */
export const updateTeacherPaymentMode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { paymentMode, commissionRate } = req.body;

    if (!Object.values(TeacherPaymentMode).includes(paymentMode)) {
      return next(new AppError("Invalid payment mode", 400));
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    teacher.paymentSettings.paymentMode = paymentMode;
    teacher.paymentSettings.paymentModeChangedAt = new Date();
    teacher.paymentSettings.paymentModeChangedBy = req.user!._id;

    if (commissionRate !== undefined) {
      teacher.paymentSettings.commissionRate = Number(commissionRate);
    }

    await teacher.save();

    res.json({
      success: true,
      message: "Payment mode updated",
      data: teacher.paymentSettings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update teacher subscription status
 * @route PUT /api/admin/teachers/:id/subscription-status
 */

export const updateTeacherSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status, endDate } = req.body;

    const subscription = await TeacherSubscription.findOne({ teacherId: id });
    if (!subscription) {
      return next(new AppError("Subscription not found", 404));
    }

    if (status) subscription.status = status;
    if (endDate) subscription.endDate = new Date(endDate);

    await subscription.save();

    res.json({
      success: true,
      message: "Subscription updated",
      data: subscription,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update teacher status
 * @route PUT /api/admin/teachers/:id/status
 */
export const updateTeacherStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { isActive, isSuspended, verificationStatus } = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) return next(new AppError("Teacher not found", 404));

    if (isActive !== undefined) teacher.isActive = isActive;
    if (isSuspended !== undefined) teacher.isSuspended = isSuspended;
    if (verificationStatus) teacher.verificationStatus = verificationStatus;

    await teacher.save();

    res.json({
      success: true,
      message: "Teacher status updated",
      data: teacher,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get teacher statistics
 * @route GET /api/admin/teachers/stats
 */
export const getTeacherStats = async (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teacherUserIds = await User.distinct("_id", { role: "teacher" });
    const baseQuery = { isDeleted: false, userId: { $in: teacherUserIds } };

    const [total, active, pendingVerification, suspended, byPaymentMode, byVerificationStatus] = await Promise.all([
      Teacher.countDocuments(baseQuery),
      Teacher.countDocuments({ ...baseQuery, isActive: true }),
      Teacher.countDocuments({ ...baseQuery, verificationStatus: TeacherVerificationStatus.PENDING }),
      Teacher.countDocuments({ ...baseQuery, isSuspended: true }),
      Teacher.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$paymentSettings.paymentMode", count: { $sum: 1 } } },
      ]),
      Teacher.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalTeachers: total,
        activeTeachers: active,
        pendingVerification,
        suspendedTeachers: suspended,
        teachersByPaymentMode: Object.fromEntries(
          byPaymentMode.map((x) => [x._id || "unknown", x.count]),
        ),
        teachersByVerificationStatus: Object.fromEntries(
          byVerificationStatus.map((x) => [x._id || "unknown", x.count]),
        ),
      },
    });
  } catch (err) {
    next(err);
  }
};
