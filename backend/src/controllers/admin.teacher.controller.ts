import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware";
import { ApiResponse, AuthRequest } from "../types";
import Teacher, {
  TeacherPaymentMode,
  TeacherVerificationStatus,
} from "../models/Teacher";
import User from "../models/User";
import logger from "../config/logger";

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
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // --- Start: Auto-create Platform Affiliate Logic ---
    const affiliateEmail = "affiliate@kidrove-system.com";
    let affiliateUser = await User.findOne({ email: affiliateEmail });

    if (!affiliateUser) {
      // Create Affiliate User
      // Generate a random password if needed, or use a placeholder since this is system managed
      const randomPassword = Math.random().toString(36).slice(-8) + "Aa1!";

      affiliateUser = await User.create({
        firstName: "Platform",
        lastName: "Affiliate",
        email: affiliateEmail,
        passwordHash: await import("bcryptjs").then((bcrypt) =>
          bcrypt.hash(randomPassword, 10),
        ),
        role: "teacher", // Enums are imported but strings work due to TS enum value
        status: "active",
        isEmailVerified: true,
        phone: "+971500000000", // Placeholder valid phone
        addresses: [
          {
            label: "HQ",
            street: "Kidrove HQ",
            city: "Dubai",
            state: "Dubai",
            country: "United Arab Emirates",
            zipCode: "00000",
            isDefault: true,
          },
        ],
        preferences: {
          currency: "AED",
          language: "en",
          timezone: "Asia/Dubai",
          notifications: { email: true, sms: false, push: true },
        },
      });
      logger.info("✅ Created Platform Affiliate User");
    }

    let affiliateTeacher = await Teacher.findOne({ userId: affiliateUser._id });

    if (!affiliateTeacher) {
      // Create Affiliate Teacher Profile
      affiliateTeacher = await Teacher.create({
        userId: affiliateUser._id,
        fullName: "Platform Affiliate",
        email: affiliateEmail,
        phone: affiliateUser.phone || "+971500000000",
        teachingMode: "online",
        address: {
          address: "Kidrove HQ",
          city: "Dubai",
          country: "United Arab Emirates",
        },
        paymentSettings: {
          paymentMode: "platform_stripe",
          commissionRate: 0, // Affiliate takes 0 commission or configurable? Defaulting to 0 effectively means platform keeps 100% of "commission" logic or handled separately.
          // Actually, if this is THE platform user, maybe it doesn't matter much, but let's stick to defaults.
          subscriptionStatus: "active", // Should correspond to enum value
          subscriptionAmount: 0,
          payoutSchedule: "monthly",
          minimumPayout: 0,
          stripeSettings: {
            stripeTestMode: true,
            stripeConnectOnboardingComplete: true,
          },
          acceptsPlatformPayments: true,
          autoPayoutEnabled: false,
        },
        verificationStatus: "verified",
        isActive: true,
        isSuspended: false,
        isDeleted: false,
        memberSince: new Date(),
      });
      logger.info("✅ Created Platform Affiliate Teacher Profile");
    }
    // --- End: Auto-create Platform Affiliate Logic ---

    const query: any = { isDeleted: { $ne: true } };

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

    // Filter by status now done in-memory after populate
    const filterStatus = status || isActive; // Reuse the query parameter for now, but treat it as status string

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Default sorting to descending by createdAt
    const sortField = (sortBy as string) || "createdAt";
    const order = sortOrder ? (sortOrder === "asc" ? 1 : -1) : -1;
    const sort: any = { [sortField]: order };

    const allTeachers = await Teacher.find(query)
      .populate("userId", "firstName lastName email status lastLogin")
      .sort(sort)
      .lean();

    // Filter out orphan teachers (userId is null) AND apply status filter if provided
    const validTeachers = allTeachers.filter((t) => {
      if (!t.userId) return false;
      if (filterStatus && filterStatus !== 'all') {
        return (t.userId as any).status === filterStatus;
      }
      return true;
    });

    const total = validTeachers.length;
    const paginatedTeachers = validTeachers.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: {
        teachers: paginatedTeachers.map((t) => ({
          id: t._id,
          _id: t._id,
          fullName: t.fullName,
          email: t.email,
          phone: t.phone,
          user: t.userId,
          paymentMode: t.paymentSettings?.paymentMode,
          commissionRate: t.paymentSettings?.commissionRate,
          isActive: (t.userId as any)?.status === 'active',
          isSuspended: (t.userId as any)?.status === 'suspended',
          lastLogin: (t.userId as any)?.lastLogin,
          verificationStatus: t.verificationStatus,
          teachingMode: t.teachingMode,
          languagesSpoken: t.languagesSpoken,
          createdAt: t.createdAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Sync Teacher data (maintenance route to fix orphans and missing profiles)
 * @route POST /api/admin/teachers/sync
 */
export const syncTeacherUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let stats = {
      orphanedProfilesDeactivated: 0,
      missingProfilesCreated: 0,
      deletedProfilesReactivated: 0,
    };

    // 1. Soft-delete orphaned teachers (User is missing)
    const teachers = await Teacher.find({ isDeleted: { $ne: true } });
    for (const teacher of teachers) {
      if (teacher.userId) {
        const userExists = await User.findById(teacher.userId);
        if (!userExists || userExists.status === 'suspended') {
          // If User hard-deleted or suspended and we need to match status, here we just do soft delete if user doesn't exist.
          if (!userExists) {
            teacher.isDeleted = true;
            teacher.isActive = false;
            await teacher.save();
            stats.orphanedProfilesDeactivated++;
          }
        }
      }
    }

    // 2. Create missing profiles and reactivate soft-deleted ones for active 'teacher' Users
    const teacherUsers = await User.find({ role: "teacher" });
    for (const user of teacherUsers) {
      let teacherProfile = await Teacher.findOne({ userId: user._id });

      if (!teacherProfile) {
        // Create missing
        await Teacher.create({
          userId: user._id,
          email: user.email,
          phone: user.phone || "+971500000000",
          fullName: `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0],
          isActive: user.status === 'active',
          isSuspended: user.status === 'suspended',
          isDeleted: false,
          verificationStatus: "verified", // default for legacy ones
          teachingMode: "online",
        });
        stats.missingProfilesCreated++;
      } else if (teacherProfile.isDeleted) {
        // Reactivate erroneously soft-deleted ones
        teacherProfile.isDeleted = false;
        teacherProfile.isActive = user.status === 'active';
        teacherProfile.isSuspended = user.status === 'suspended';
        await teacherProfile.save();
        stats.deletedProfilesReactivated++;
      } else {
        // Sync status
        let updated = false;
        if (teacherProfile.isActive !== (user.status === 'active')) {
          teacherProfile.isActive = user.status === 'active';
          updated = true;
        }
        if (teacherProfile.isSuspended !== (user.status === 'suspended')) {
          teacherProfile.isSuspended = user.status === 'suspended';
          updated = true;
        }
        if (updated) {
          await teacherProfile.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Teacher data synchronized successfully",
      data: stats
    });
  } catch (error) {
    next(error);
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

    let teacher = await Teacher.findById(id);
    if (!teacher) {
      // Fallback: in case the frontend passed the User ID instead of Teacher ID
      teacher = await Teacher.findOne({ userId: id });
    }
    if (!teacher) return next(new AppError("Teacher not found", 404));

    teacher.isDeleted = true;
    teacher.deletedAt = new Date();
    teacher.isActive = false;

    await teacher.save();

    // Downgrade the linked User's role to 'customer' so admin/users stays in sync
    if (teacher.userId) {
      try {
        await User.findByIdAndUpdate(
          teacher.userId,
          { $set: { role: "customer" } },
          { runValidators: true }
        );
      } catch (userSyncError: any) {
        logger.error("Failed to downgrade user role after teacher deletion:", userSyncError);
      }
    }

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

    if (verificationStatus === TeacherVerificationStatus.VERIFIED) {
      await User.findByIdAndUpdate(teacher.userId, {
        role: "teacher",
        status: "active",
      });
      teacher.isActive = true;
      await teacher.save();
    }

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
    const [total, active, byPaymentMode] = await Promise.all([
      Teacher.countDocuments({ isDeleted: false }),
      Teacher.countDocuments({ isActive: true, isDeleted: false }),
      Teacher.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$paymentSettings.paymentMode", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalTeachers: total,
        activeTeachers: active,
        teachersByPaymentMode: Object.fromEntries(
          byPaymentMode.map((x) => [x._id || "unknown", x.count]),
        ),
      },
    });
  } catch (err) {
    next(err);
  }
};
