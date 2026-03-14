import { uploadSingle, getFileInfo } from "../middleware/upload";
import emailService from "../services/email.service";
import smsService from "../services/sms.service";
import { generateOTP } from "../utils/otp";

import { TeacherBooking, User, UserRole, Teacher } from "../models/index";
import EventModel from "../models/Event";
import { AppError, catchAsync } from "../middleware/index";
import mongoose from "mongoose";
import { AuthRequest } from "../types/index";
import { NextFunction, Response } from "express";
import { getOrCreateTeacherProfile } from "../utils/teacherHelpers";

/**
 * @desc    Get teacher dashboard statistics
 * @route   GET /api/teachers/stats
 * @access  Private (Teacher only)
 */
export const getTeacherDashboardStats = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    // Total events for this teacher (educational types)
    const totalTeachingEvents = await EventModel.countDocuments({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
    });

    // Get all event IDs
    const teacherEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id");
    const teachingEventIds = teacherEvents.map((e) => e._id);

    // Total Bookings
    const totalBookings = await TeacherBooking.countDocuments({
      "sessions.teachingEventId": { $in: teachingEventIds },
    });

    // Total revenue
    const paidBookings = await TeacherBooking.find({
      "sessions.teachingEventId": { $in: teachingEventIds },
      paymentStatus: "paid",
    }).select("totalAmount");

    const totalRevenue = paidBookings.reduce(
      (sum, reg) => sum + (reg.totalAmount || 0),
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        totalTeachingEvents,
        totalBookings,
        totalRevenue,
      },
    });
  },
);

/**
 * @desc    Get teaching events created by teacher
 * @route   GET /api/teachers/events
 * @access  Private (Teacher only)
 */
export const getTeacherTeachingEvents = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    // Auto-heal legacy teacher events created as draft before pending-moderation policy.
    await EventModel.updateMany(
      {
        teacherId,
        type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
        isDeleted: false,
        isApproved: false,
        status: "draft",
      },
      {
        $set: { status: "pending" },
      },
    );

    const teachingEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { teachingEvents },
    });
  },
);

/**
 * @desc    Get Bookings for teacher
 * @route   GET /api/teachers/Bookings
 * @access  Private (Teacher only)
 */
export const getTeacherBookings = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    // Teacher event IDs
    const teachingEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id title");
    const teachingEventIds = teachingEvents.map((e) => e._id);

    // Query params
    const {
      page = 1,
      limit = 10,
      search,
      status,
      paymentStatus,
      teachingEventId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Base filter
    const filter: any = {
      "sessions.teachingEventId": { $in: teachingEventIds },
    };

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Teaching event filter
    if (teachingEventId) {
      filter["sessions.teachingEventId"] = teachingEventId;
    }

    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Amount filter
    if (minAmount || maxAmount) {
      filter.totalAmount = {};
      if (minAmount) filter.totalAmount.$gte = Number(minAmount);
      if (maxAmount) filter.totalAmount.$lte = Number(maxAmount);
    }

    // Search (Booking number only)
    if (search) {
      filter.BookingNumber = new RegExp(search as string, "i");
    }

    // Sorting
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Fetch data
    const [Bookings, total] = await Promise.all([
      TeacherBooking.find(filter)
        .populate("studentId", "firstName lastName email phone")
        .populate("sessions.teachingEventId", "title subject coverImage")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),

      TeacherBooking.countDocuments(filter),
    ]);

    // Stats
    const statsAgg = await TeacherBooking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          paidBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        Bookings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalBookings: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
        stats: statsAgg[0] || {
          totalRevenue: 0,
          totalBookings: 0,
          confirmedBookings: 0,
          cancelledBookings: 0,
          paidBookings: 0,
          pendingPayments: 0,
        },
        teachingEvents,
      },
    });
  },
);

/**
 * @desc    Get single Booking
 * @route   GET /api/teachers/Bookings/:id
 * @access  Private (Teacher only)
 */
export const getTeacherBookingById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const teachingEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id");
    const teachingEventIds = teachingEvents.map((e) => e._id);

    const Booking = await TeacherBooking.findOne({
      _id: id,
      "sessions.teachingEventId": { $in: teachingEventIds },
    })
      .populate("studentId", "firstName lastName email phone avatar")
      .populate(
        "sessions.teachingEventId",
        "title subject coverImage teachingMode",
      );

    if (!Booking) {
      return next(new AppError("Booking not found", 404));
    }

    res.status(200).json({
      success: true,
      data: { Booking },
    });
  },
);
// @desc    Update teacher Booking (limited edit)
// @route   PUT /api/teachers/Bookings/:id
// @access  Private (Teacher only)
export const updateTeacherBooking = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { teacherNotes, teacherStatus, attendanceMarked } = req.body;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Get teacher profile
    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    // Get teaching events owned by teacher
    const teachingEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id");
    const teachingEventIds = teachingEvents.map((e) => e._id);

    // Find Booking belonging to teacher
    const Booking = await TeacherBooking.findOne({
      _id: id,
      "sessions.teachingEventId": { $in: teachingEventIds },
    });

    if (!Booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Allowed updates
    const updates: any = {};
    if (teacherNotes !== undefined) updates.teacherNotes = teacherNotes;
    if (teacherStatus !== undefined) updates.teacherStatus = teacherStatus;
    if (attendanceMarked !== undefined)
      updates.attendanceMarked = attendanceMarked;

    // Audit fields
    updates.lastModifiedBy = teacherId;
    updates.lastModifiedAt = new Date();

    const updatedBooking = await TeacherBooking.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("studentId", "firstName lastName email phone")
      .populate("sessions.teachingEventId", "title subject coverImage");

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: { Booking: updatedBooking },
    });
  },
);
// @desc    Export teacher Bookings
// @route   GET /api/teachers/Bookings/export
// @access  Private (Teacher only)
export const exportTeacherBookings = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Get teacher profile
    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const { format = "csv", ...filters } = req.query;

    // Teacher teaching events
    const teachingEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id");
    const teachingEventIds = teachingEvents.map((e) => e._id);

    // Base filter
    const filter: any = {
      "sessions.teachingEventId": { $in: teachingEventIds },
      status: { $nin: ["pending"] },
    };

    // Filters
    if (filters.status) filter.status = filters.status;
    if (filters.paymentStatus) filter.paymentStatus = filters.paymentStatus;
    if (filters.teachingEventId) {
      filter["sessions.teachingEventId"] = filters.teachingEventId;
    }

    if (filters.startDate || filters.endDate) {
      filter.createdAt = {};
      if (filters.startDate)
        filter.createdAt.$gte = new Date(filters.startDate as string);
      if (filters.endDate) {
        const end = new Date(filters.endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (filters.minAmount || filters.maxAmount) {
      filter.totalAmount = {};
      if (filters.minAmount)
        filter.totalAmount.$gte = Number(filters.minAmount);
      if (filters.maxAmount)
        filter.totalAmount.$lte = Number(filters.maxAmount);
    }

    if (filters.search) {
      filter.BookingNumber = new RegExp(filters.search as string, "i");
    }

    // Fetch data
    const Bookings = await TeacherBooking.find(filter)
      .populate("studentId", "firstName lastName email phone")
      .populate("sessions.teachingEventId", "title")
      .sort({ createdAt: -1 })
      .lean();

    /* ---------------- JSON EXPORT ---------------- */
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="teacher-Bookings-${Date.now()}.json"`,
      );

      return res.json({
        success: true,
        exportedAt: new Date(),
        totalRecords: Bookings.length,
        data: Bookings,
      });
    }

    /* ---------------- CSV EXPORT ---------------- */
    const csvRows: string[] = [];

    csvRows.push(
      [
        "Booking Number",
        "Student Name",
        "Student Email",
        "Student Phone",
        "Teaching Event",
        "Session Date",
        "Quantity",
        "Total Amount",
        "Currency",
        "Status",
        "Payment Status",
        "Booking Date",
        "Participant Names",
      ].join(","),
    );

    Bookings.forEach((reg: any) => {
      const studentName = reg.studentId
        ? `${reg.studentId.firstName} ${reg.studentId.lastName}`
        : "N/A";

      reg.sessions.forEach((session: any) => {
        const participantNames = session.students
          ? session.students.map((s: any) => s.name).join("; ")
          : "N/A";

        csvRows.push(
          [
            reg.BookingNumber || reg._id,
            `"${studentName}"`,
            reg.studentId?.email || "N/A",
            reg.studentId?.phone || "N/A",
            `"${session.teachingEventTitle || session.teachingEventId?.title || "N/A"}"`,
            new Date(session.scheduleDate).toLocaleDateString(),
            session.quantity,
            reg.totalAmount,
            reg.currency,
            reg.status,
            reg.paymentStatus,
            new Date(reg.createdAt).toLocaleDateString(),
            `"${participantNames}"`,
          ].join(","),
        );
      });
    });

    const csvContent = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="teacher-Bookings-${Date.now()}.csv"`,
    );

    return res.send(csvContent);
  },
);
// @desc    Import teacher Bookings from CSV
// @route   POST /api/teachers/Bookings/import
// @access  Private (Teacher only)
export const importTeacherBookings = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Get teacher profile
    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    const { csvData } = req.body;

    if (!csvData || !Array.isArray(csvData)) {
      return next(
        new AppError("CSV data is required and must be an array", 400),
      );
    }

    const results = {
      successful: [] as string[],
      failed: [] as { row: number; reason: string; data: any }[],
      total: csvData.length,
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Required fields
        if (
          !row.studentEmail ||
          !row.teachingEventTitle ||
          !row.quantity ||
          !row.totalAmount
        ) {
          results.failed.push({
            row: i + 1,
            reason:
              "Missing required fields (studentEmail, teachingEventTitle, quantity, totalAmount)",
            data: row,
          });
          continue;
        }

        // Find teaching event
        const teachingEvent = await EventModel.findOne({
          teacherId,
          type: {
            $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"],
          },
          title: new RegExp(`^${row.teachingEventTitle}$`, "i"),
          isDeleted: false,
        });

        if (!teachingEvent) {
          results.failed.push({
            row: i + 1,
            reason: `Teaching event not found: ${row.teachingEventTitle}`,
            data: row,
          });
          continue;
        }

        // Find or create student
        let student = await User.findOne({ email: row.studentEmail });

        if (!student) {
          const [firstName, ...lastNameParts] = (
            row.studentName || "Guest Student"
          ).split(" ");
          student = await User.create({
            email: row.studentEmail,
            firstName: firstName || "Guest",
            lastName: lastNameParts.join(" ") || "Student",
            phone: row.studentPhone || "",
            role: "student",
            status: "active",
          });
        }

        const sessionDate = row.sessionDate
          ? new Date(row.sessionDate)
          : new Date();

        // Create Booking
        const Booking = await TeacherBooking.create({
          studentId: student._id,
          sessions: [
            {
              teachingEventId: teachingEvent._id,
              teachingEventTitle: teachingEvent.title,
              scheduleDate: sessionDate,
              quantity: parseInt(row.quantity),
              unitPrice: parseFloat(row.totalAmount) / parseInt(row.quantity),
              totalPrice: parseFloat(row.totalAmount),
              currency: row.currency || teachingEvent.currency || "AED",
              students: row.participantNames
                ? row.participantNames.split(";").map((name: string) => ({
                    name: name.trim(),
                  }))
                : [],
            },
          ],
          subtotal: parseFloat(row.totalAmount),
          tax: 0,
          discount: 0,
          totalAmount: parseFloat(row.totalAmount),
          currency: row.currency || teachingEvent.currency || "AED",
          status: row.status || "confirmed",
          paymentStatus: row.paymentStatus || "paid",
          paymentMethod: "imported",
          billingAddress: {
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone || row.studentPhone || "",
            address: "Imported",
            city: "Imported",
            state: "Imported",
            zipCode: "00000",
            country: "UAE",
          },
          source: "teacher_import",
          teacherNotes: `Imported by teacher on ${new Date().toISOString()}`,
        });

        // results.successful.push(Booking.BookingNumber);
      } catch (error) {
        results.failed.push({
          row: i + 1,
          reason: error instanceof Error ? error.message : "Unknown error",
          data: row,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  },
);
// @desc    Get teacher profile
// @route   GET /api/teachers/profile
// @access  Private (Teacher only)
export const getTeacherProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    const user = await User.findById(userId).select(
      "-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts",
    );

    res.status(200).json({
      success: true,
      message: "Teacher profile retrieved successfully",
      data: {
        teacher,
        user,
      },
    });
  },
);
// @desc    Update teacher profile
// @route   PUT /api/teachers/profile
// @access  Private (Teacher only)
export const updateTeacherProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const {
      // User fields
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      addresses,

      // Teacher fields (CORRECT ONES)
      bio,
      subjects,
      expertise,
      qualifications,
      certifications,
      yearsOfExperience,
      specialization,
      languagesSpoken,
      teachingDescription,
      website,
    } = req.body;

    // Update User
    const userUpdates: any = {};
    if (firstName !== undefined) userUpdates.firstName = firstName;
    if (lastName !== undefined) userUpdates.lastName = lastName;
    if (phone !== undefined) userUpdates.phone = phone;
    if (gender !== undefined) userUpdates.gender = gender;
    if (dateOfBirth !== undefined) userUpdates.dateOfBirth = dateOfBirth;
    if (addresses !== undefined) userUpdates.addresses = addresses;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: userUpdates },
      { new: true, runValidators: true },
    ).select(
      "-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts",
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    // Basic profile fields
    if (bio !== undefined) teacher.bio = bio;

    // Expertise & Teaching
    if (subjects !== undefined) teacher.subjects = subjects;
    if (expertise !== undefined && Array.isArray(expertise)) {
      // Store expertise as subjects if they're similar
      teacher.subjects = [
        ...new Set([...(teacher.subjects || []), ...expertise]),
      ];
    }

    // Qualifications (stored as education array)
    if (qualifications !== undefined && Array.isArray(qualifications)) {
      teacher.education = qualifications.map((q: any) => ({
        degree: q.degree || q.title || "",
        institution: q.institution || "",
        year: q.year || new Date().getFullYear(),
        country: q.country || "UAE",
      }));
    }

    // Experience
    if (yearsOfExperience !== undefined) {
      teacher.yearsOfExperience = yearsOfExperience;
    }

    // Specialization
    if (specialization !== undefined) {
      teacher.specialization = specialization;
    }

    // Languages
    if (languagesSpoken !== undefined) {
      teacher.languagesSpoken = languagesSpoken;
    }

    // Social links with website
    if (website !== undefined) {
      teacher.socialLinks = {
        ...teacher.socialLinks,
        website,
      };
    }

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Teacher profile updated successfully",
      data: {
        user,
        teacher,
      },
    });
  },
);
// @desc    Upload teacher profile image
// @route   POST /api/teachers/upload-image
// @access  Private (Teacher only)
export const uploadTeacherImage = [
  uploadSingle("image"),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    if (!req.file) {
      return next(new AppError("No image file provided", 400));
    }

    const fileInfo = getFileInfo(req.file);
    const imageType = req.body.imageType || "profileImage";
    // allowed: profileImage | portfolio | demoVideo (future-safe)

    const teacher = await getOrCreateTeacherProfile(userId);

    if (imageType === "profileImage") {
      // teacher.profileImage = fileInfo.url;
    } else {
      return next(new AppError("Unsupported image type for teacher", 400));
    }

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Teacher image uploaded successfully",
      data: {
        // profileImage: teacher.profileImage,
        uploadedFile: fileInfo,
      },
    });
  }),
];
// @desc    Update teacher teaching availability
// @route   PUT /api/teachers/availability
// @access  Private (Teacher only)
export const updateTeacherAvailability = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { teachingAvailability } = req.body;

    if (!teachingAvailability || typeof teachingAvailability !== "object") {
      return next(new AppError("Teaching availability data is required", 400));
    }

    // Validate structure
    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const isValid =
      Array.isArray(teachingAvailability.daysOfWeek) &&
      teachingAvailability.daysOfWeek.every((d: string) =>
        validDays.includes(d),
      ) &&
      Array.isArray(teachingAvailability.timeSlots) &&
      teachingAvailability.timeSlots.every(
        (slot: any) =>
          typeof slot.startTime === "string" &&
          typeof slot.endTime === "string",
      );

    if (!isValid) {
      return next(new AppError("Invalid teaching availability format", 400));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    // teacher.teachingAvailability = teachingAvailability;
    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Teaching availability updated successfully",
      data: { teacher },
    });
  },
);
// @desc    Update teacher social media links
// @route   PUT /api/teachers/social-media
// @access  Private (Teacher only)
export const updateTeacherSocialMedia = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { socialMedia } = req.body;

    if (!socialMedia || typeof socialMedia !== "object") {
      return next(new AppError("Social media data is required", 400));
    }

    const validPlatforms = [
      "facebook",
      "twitter",
      "linkedin",
      "instagram",
      "youtube",
      "tiktok",
    ];

    const isValid = Object.keys(socialMedia).every((platform) => {
      if (!validPlatforms.includes(platform)) return false;
      const url = socialMedia[platform];
      if (!url) return true;

      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (!isValid) {
      return next(new AppError("Invalid social media URLs or platforms", 400));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    // teacher.socialMedia = {
    //   ...teacher.socialMedia,
    //   ...socialMedia,
    // };

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Teacher social media links updated successfully",
      data: { teacher },
    });
  },
);
// @desc    Get public teacher profile by ID
// @route   GET /api/teachers/public/:id
// @access  Public
export const getPublicTeacherProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    // Accept both teacher profile ID and user ID for public profile route.
    const teacherProfile = await Teacher.findOne({
      isDeleted: false,
      isActive: true,
      $or: [{ _id: id }, { userId: id }],
    }).select(
      `userId
      fullName
      email
      phone
      profileImage
      memberSince
      createdAt
      bio
      subjects
      expertise
      specialization
      yearsOfExperience
      languagesSpoken
      teachingDescription
      profileImage
      coverImageUrl
      socialLinks
      education
      verificationStatus
      stats
      website
      socialMedia
      averageRating
      totalReviews
      totalStudents
      totalClasses
      viewsCount
      `,
    );

    if (!teacherProfile) {
      return next(new AppError("Teacher profile not found", 404));
    }

    // Resolve profile owner user. Keep strict check first, then gracefully fallback
    // to owner by id to avoid false 404s when role/status drift exists.
    let user = await User.findOne({
      _id: teacherProfile.userId,
      role: "teacher",
      status: "active",
    }).select("firstName lastName email phone avatar createdAt role status");

    if (!user) {
      user = await User.findById(teacherProfile.userId)
        .select("firstName lastName email phone avatar createdAt role status");
    }

    const fallbackFullName = ((teacherProfile as any).fullName || "").trim();
    const [fallbackFirstName, ...fallbackLastNameParts] = fallbackFullName.split(/\s+/);

    const publicUser = user
      ? {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: user.createdAt,
        }
      : {
          _id: teacherProfile.userId,
          firstName: fallbackFirstName || "Teacher",
          lastName: fallbackLastNameParts.join(" "),
          email: (teacherProfile as any).email || "",
          phone: (teacherProfile as any).phone || "",
          avatar: (teacherProfile as any).profileImage || "",
          createdAt:
            (teacherProfile as any).memberSince || (teacherProfile as any).createdAt,
        };

    // Get published events for this teacher
    const teachingEvents = await EventModel.find({
      teacherId: teacherProfile._id,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
      isActive: true,
      status: "published",
      isApproved: true,
    })
      .select(
        `
        title
        description
        subject
        teachingMode
        price
        currency
        images
        image
        bannerImage
        coverImage
        schedules
        viewsCount
        averageRating
        reviewCount
        `,
      )
      .sort({ createdAt: -1 })
      .limit(20);

    // Statistics
    const totalTeachingEvents = await EventModel.countDocuments({
      teacherId: teacherProfile._id,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
      isActive: true,
      status: "published",
      isApproved: true,
    });

    const allTeachingEventIds = await EventModel.find({
      teacherId: teacherProfile._id,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
      isActive: true,
      status: "published",
      isApproved: true,
    }).distinct("_id");

    const totalBookings = await TeacherBooking.countDocuments({
      "sessions.teachingEventId": { $in: allTeachingEventIds },
    });

    const profileStats = (teacherProfile as any)?.stats || {};
    const computedAverageFromEvents = teachingEvents.length
      ? teachingEvents.reduce((sum: number, event: any) => {
          return sum + (Number(event?.averageRating) || 0);
        }, 0) / teachingEvents.length
      : 0;

    res.status(200).json({
      success: true,
      message: "Teacher profile retrieved successfully",
      data: {
        user: publicUser,
        teacher: {
          ...(teacherProfile.toObject() as any),
          // Keep legacy key used in public page card/header rendering.
          coverImage:
            (teacherProfile as any).coverImageUrl || (teacherProfile as any).coverImage,
          socialLinks:
            (teacherProfile as any).socialLinks || (teacherProfile as any).socialMedia || {},
        },
        teachingEvents,
        stats: {
          totalTeachingEvents,
          totalBookings,
          activeEvents: teachingEvents.length,
          // Compatibility keys expected by teachers listing/profile UI.
          totalEvents: Math.max(Number(profileStats?.totalClasses) || 0, totalTeachingEvents),
          totalStudents:
            Number((teacherProfile as any)?.totalStudents) || Number(profileStats?.totalStudents) || 0,
          averageRating:
            Number((teacherProfile as any)?.averageRating) ||
            Number(profileStats?.averageRating) ||
            computedAverageFromEvents ||
            0,
        },
      },
    });
  },
);
// @desc    Get teacher payment information (public endpoint for booking flow)
// @route   GET /api/teachers/:teacherId/payment-info
// @access  Public
// export const getTeacherPaymentInfo = catchAsync(
//   async (req: AuthRequest, res: Response, next: NextFunction) => {
//     const { teacherId } = req.params;

//     if (!teacherId) {
//       return next(new AppError('Teacher ID is required', 400));
//     }

//     // Check user
//     const user = await User.findById(teacherId).select('role');

//     // Fallback to platform payment
//     if (!user || user.role !== 'teacher') {
//       return res.status(200).json({
//         success: true,
//         message: 'Using platform payment settings',
//         data: {
//           teacherId,
//           hasCustomStripe: false,
//           stripePublishableKey: null,
//           serviceFeeRate: 5,
//           usePlatformStripe: true,
//         },
//       });
//     }

//     // Fetch teacher payment settings
//     const teacherProfile = await Teacher.findOne({ userId: teacherId }).select(
//       `
//       paymentSettings.paymentMode
//       paymentSettings.stripeSettings.isOnboardingComplete
//       paymentSettings.stripeSettings.manualStripeKey
//       paymentSettings.commissionRate
//       subscriptionSettings.subscriptionStatus
//       `
//     );

//     if (!teacherProfile) {
//       return res.status(200).json({
//         success: true,
//         message: 'Using platform payment settings',
//         data: {
//           teacherId,
//           hasCustomStripe: false,
//           stripePublishableKey: null,
//           serviceFeeRate: 5,
//           usePlatformStripe: true,
//         },
//       });
//     }

//     const { paymentSettings, subscriptionSettings } = teacherProfile;

//     const hasCustomStripe =
//       paymentSettings.paymentMode === 'CUSTOM_STRIPE' &&
//       paymentSettings.stripeSettings?.isOnboardingComplete === true &&
//       subscriptionSettings.subscriptionStatus === 'ACTIVE';

//     res.status(200).json({
//       success: true,
//       message: 'Teacher payment information retrieved successfully',
//       data: {
//         teacherId,
//         hasCustomStripe,
//         stripePublishableKey: hasCustomStripe
//           ? paymentSettings.stripeSettings?.manualStripeKey || null
//           : null,
/**
 * @desc    Get teacher payment information (for booking flow)
 * @route   GET /api/teachers/:id/payment-info
 * @access  Private (Authenticated)
 */
export const getTeacherPaymentInfo = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      return next(new AppError("Teacher ID is required", 400));
    }

    // Check user
    const user = await User.findById(id).select("role");

    // Fallback to platform payment
    if (!user || user.role !== "teacher") {
      return res.status(200).json({
        success: true,
        message: "Using platform payment settings",
        data: {
          teacherId: id,
          hasCustomStripe: false,
          stripePublishableKey: null,
          serviceFeeRate: 5,
          usePlatformStripe: true,
        },
      });
    }

    // Fetch teacher payment settings
    const teacherProfile = await Teacher.findOne({ userId: id }).select(
      "paymentSettings.paymentMode paymentSettings.stripeSettings.stripeConnectOnboardingComplete paymentSettings.stripeSettings.stripePublishableKey paymentSettings.commissionRate paymentSettings.subscriptionStatus",
    );

    if (!teacherProfile) {
      return res.status(200).json({
        success: true,
        message: "Using platform payment settings",
        data: {
          teacherId: id,
          hasCustomStripe: false,
          stripePublishableKey: null,
          serviceFeeRate: 5,
          usePlatformStripe: true,
        },
      });
    }

    const { paymentSettings } = teacherProfile;

    const hasCustomStripe =
      paymentSettings.paymentMode === "custom_stripe" &&
      paymentSettings.stripeSettings?.stripeConnectOnboardingComplete ===
        true &&
      paymentSettings.subscriptionStatus === "active";

    res.status(200).json({
      success: true,
      message: "Teacher payment information retrieved successfully",
      data: {
        teacherId: id,
        hasCustomStripe,
        stripePublishableKey: hasCustomStripe
          ? paymentSettings.stripeSettings?.stripePublishableKey || null
          : null,
        serviceFeeRate: hasCustomStripe
          ? 0
          : (paymentSettings.commissionRate ?? 15),
        usePlatformStripe: !hasCustomStripe,
      },
    });
  },
);

/**
 * @desc    Upload teacher media (profile image or demo video)
 * @route   POST /api/teachers/upload-media
 * @access  Private (Teacher only)
 */
export const uploadTeacherMedia = [
  uploadSingle("media"),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User ID not found", 401));
    }

    if (!req.file) {
      return next(new AppError("No media file provided", 400));
    }

    const fileInfo = getFileInfo(req.file);
    const mediaType = req.body.mediaType || "profile";

    const teacher = await getOrCreateTeacherProfile(userId);

    if (mediaType === "profile") {
      // Save profile image URL to user's avatar field
      await User.findByIdAndUpdate(userId, { avatar: fileInfo.url });
      res.status(200).json({
        success: true,
        message: "Profile image uploaded successfully",
        data: {
          uploadedFile: fileInfo,
          mediaType,
          avatarUrl: fileInfo.url,
        },
      });
    } else if (mediaType === "cover") {
      // Save cover image URL to teacher profile
      await Teacher.findOneAndUpdate(
        { userId },
        { coverImage: fileInfo.url },
        { new: true },
      );
      res.status(200).json({
        success: true,
        message: "Cover image uploaded successfully",
        data: {
          uploadedFile: fileInfo,
          mediaType,
          coverImageUrl: fileInfo.url,
        },
      });
    } else if (mediaType === "demoVideo") {
      // Update demo video
      res.status(200).json({
        success: true,
        message: "Demo video uploaded successfully",
        data: {
          uploadedFile: fileInfo,
          mediaType,
        },
      });
    } else {
      return next(new AppError("Unsupported media type", 400));
    }
  }),
];

/**
 * @desc    Update teacher availability hours
 * @route   PUT /api/teachers/availability-hours
 * @access  Private (Teacher only)
 */
export const updateTeacherAvailabilityHours = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { availabilityHours } = req.body;

    if (!availabilityHours || typeof availabilityHours !== "object") {
      return next(new AppError("Availability hours data is required", 400));
    }

    // Validate structure
    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const isValid = Object.keys(availabilityHours).every((day) => {
      if (!validDays.includes(day.toLowerCase())) return false;
      const schedule = availabilityHours[day];
      if (typeof schedule.isAvailable !== "boolean") return false;
      if (schedule.isAvailable) {
        if (!schedule.startTime || !schedule.endTime) return false;
        // Validate time format HH:mm
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (
          !timeRegex.test(schedule.startTime) ||
          !timeRegex.test(schedule.endTime)
        ) {
          return false;
        }
      }
      return true;
    });

    if (!isValid) {
      return next(new AppError("Invalid availability hours format", 400));
    }

    const teacher = await getOrCreateTeacherProfile(userId);
    teacher.availabilityHours = availabilityHours;
    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Availability hours updated successfully",
      data: { teacher },
    });
  },
);

/**
 * @desc    Update teacher social links
 * @route   PUT /api/teachers/social-links
 * @access  Private (Teacher only)
 */
export const updateTeacherSocialLinks = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { socialLinks } = req.body;

    if (!socialLinks || typeof socialLinks !== "object") {
      return next(new AppError("Social links data is required", 400));
    }

    const validPlatforms = [
      "facebook",
      "linkedin",
      "instagram",
      "youtube",
      "website",
      "portfolio",
    ];

    const isValid = Object.keys(socialLinks).every((platform) => {
      if (!validPlatforms.includes(platform)) return false;
      const url = socialLinks[platform];
      if (!url) return true; // Allow empty values

      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (!isValid) {
      return next(new AppError("Invalid social links format or URL", 400));
    }

    const teacher = await getOrCreateTeacherProfile(userId);
    teacher.socialLinks = {
      ...teacher.socialLinks,
      ...socialLinks,
    };
    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Social links updated successfully",
      data: { teacher },
    });
  },
);

/**
 * @desc    Update teacher bank details
 * @route   PUT /api/teachers/bank-details
 * @access  Private (Teacher only)
 */
export const updateTeacherBankDetails = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { accountHolderName, bankName, accountNumber, iban, swiftCode } = req.body;

    if (!accountHolderName || !bankName) {
      return next(new AppError("Account holder name and bank name are required", 400));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacher._id,
      {
        "paymentSettings.bankDetails": {
          accountHolderName,
          bankName,
          accountNumber: accountNumber || undefined,
          iban: iban || undefined,
          swiftCode: swiftCode || undefined,
          isVerified: false,
        },
      },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: { teacher: updatedTeacher },
    });
  },
);

/**
 * @desc    Get public list of active teachers
 * @route   GET /api/teachers/public
 * @access  Public
 */
export const getPublicTeachersList = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    const userQuery: any = { role: "teacher", status: "active" };
    if (search) {
      userQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const teacherUsers = await User.find(userQuery)
      .select("_id firstName lastName avatar")
      .limit(500);

    const userIds = teacherUsers.map((u) => u._id);

    const [teacherProfiles, total] = await Promise.all([
      Teacher.find({ userId: { $in: userIds }, isDeleted: false, isActive: true })
        .select("userId fullName bio subjects specialization yearsOfExperience languagesSpoken coverImageUrl socialLinks stats averageRating totalStudents totalClasses")
        .skip(skip)
        .limit(limit),
      Teacher.countDocuments({ userId: { $in: userIds }, isDeleted: false, isActive: true }),
    ]);

    const teacherProfileIds = teacherProfiles.map((t) => t._id);

    const eventCountAgg = await EventModel.aggregate([
      {
        $match: {
          teacherId: { $in: teacherProfileIds },
          type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
          isDeleted: false,
          isActive: true,
          status: "published",
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$teacherId",
          totalEvents: { $sum: 1 },
          avgEventRating: { $avg: { $ifNull: ["$averageRating", 0] } },
        },
      },
    ]);

    const eventStatsByTeacher: Record<string, { totalEvents: number; avgEventRating: number }> = {};
    eventCountAgg.forEach((row: any) => {
      eventStatsByTeacher[row._id.toString()] = {
        totalEvents: Number(row.totalEvents) || 0,
        avgEventRating: Number(row.avgEventRating) || 0,
      };
    });

    const userMap: Record<string, any> = {};
    teacherUsers.forEach((u) => { userMap[u._id.toString()] = u; });

    const teachers = teacherProfiles.map((t) => ({
      _id: t._id,
      userId: t.userId,
      fullName: t.fullName,
      bio: t.bio,
      subjects: t.subjects,
      specialization: t.specialization,
      yearsOfExperience: t.yearsOfExperience,
      languagesSpoken: t.languagesSpoken,
      coverImage: (t as any).coverImageUrl || (t as any).coverImage,
      coverImageUrl: (t as any).coverImageUrl,
      socialLinks: (t as any).socialLinks || {},
      stats: {
        totalEvents: Math.max(
          Number((t as any)?.stats?.totalClasses) || 0,
          eventStatsByTeacher[(t._id as any).toString()]?.totalEvents || 0,
        ),
        totalStudents:
          Number((t as any)?.totalStudents) ||
          Number((t as any)?.stats?.totalStudents) ||
          0,
        averageRating:
          Number((t as any)?.averageRating) ||
          Number((t as any)?.stats?.averageRating) ||
          eventStatsByTeacher[(t._id as any).toString()]?.avgEventRating ||
          0,
      },
      user: userMap[(t.userId as any).toString()] || null,
    }));

    res.status(200).json({
      success: true,
      message: "Teachers retrieved successfully",
      data: {
        teachers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  },
);

// @desc    Update teacher cover image
// @route   PUT /api/teachers/cover-image
// @access  Private (Teacher only)
export const updateTeacherCoverImage = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const { coverImageUrl }: { coverImageUrl: string } = req.body;

    if (!coverImageUrl) {
      return next(new AppError('Cover image URL is required', 400));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    // Extract UUID from URL if it's a UUID-based URL (for MediaAsset tracking)
    let newMediaAssetId: string | null = null;
    const uuidMatch = (coverImageUrl as string).match(/\/api\/media\/file\/([a-f0-9-]+)/i);

    if (uuidMatch) {
      // UUID-based URL - verify MediaAsset exists
      const uuid = uuidMatch[1];
      const mediaAsset = await (require('../models')?.MediaAsset?.findOne({ uuid }));

      if (mediaAsset) {
        // Verify it's an image
        if (mediaAsset.mimeType?.startsWith('image/')) {
          // Verify it belongs to this user (security check)
          if (mediaAsset.uploadedBy?.toString() === userId.toString()) {
            newMediaAssetId = mediaAsset._id.toString();
          }
        }
      }
    }

    // Update teacher's cover image
    teacher.coverImageUrl = coverImageUrl;
    if (newMediaAssetId) {
      (teacher as any).coverImageAssetId = newMediaAssetId;
    }
    await teacher.save();

    res.status(200).json({
      success: true,
      message: 'Cover image updated successfully',
      data: {
        teacher,
        coverImageUrl: teacher.coverImageUrl,
      },
    });
  }
);

// @desc    Delete teacher cover image
// @route   DELETE /api/teachers/cover-image
// @access  Private (Teacher only)
export const deleteTeacherCoverImage = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const teacher = await getOrCreateTeacherProfile(userId);

    if (!teacher.coverImageUrl) {
      return next(new AppError('No cover image to delete', 404));
    }

    (teacher as any).coverImageAssetId = undefined;
    teacher.coverImageUrl = undefined;

    await teacher.save();

    res.status(200).json({
      success: true,
      message: 'Cover image deleted successfully',
      data: { teacher },
    });
  }
);
