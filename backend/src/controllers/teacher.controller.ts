import { uploadSingle, getFileInfo } from "../middleware/upload";
import emailService from "../services/email.service";
import smsService from "../services/sms.service";
import { generateOTP } from "../utils/otp";

import { TeacherBooking, User, UserRole, Teacher, Order } from "../models/index";
import EventModel from "../models/Event";
import { AppError, catchAsync } from "../middleware/index";
import mongoose from "mongoose";
import { AuthRequest } from "../types/index";
import { NextFunction, Response } from "express";
import { getOrCreateTeacherProfile } from "../utils/teacherHelpers";
import { cacheService } from "../services/cache.service";
import { CacheTTL } from "../config/cache-tiers";
import { transformEventResponse } from "../utils/event.utils";

const getScheduleCapacity = (schedule: any): number => {
  if (schedule?.unlimitedSeats) return 999999;
  if (typeof schedule?.totalSeats === "number") return schedule.totalSeats;

  const available = Number(schedule?.availableSeats || 0);
  const sold = Number(schedule?.soldSeats || 0);
  const reserved = Number(schedule?.reservedSeats || 0);
  return Math.max(0, available + sold + reserved);
};

const applyOrderSeatStatsToEvents = async (events: any[]) => {
  if (!events.length) return;

  const eventIds = events.map((event) => event?._id).filter(Boolean);
  if (!eventIds.length) return;

  const soldAgg = await Order.aggregate([
    { $match: { "items.eventId": { $in: eventIds }, status: "confirmed" } },
    { $unwind: "$items" },
    { $match: { "items.eventId": { $in: eventIds } } },
    {
      $group: {
        _id: {
          eventId: "$items.eventId",
          scheduleId: "$items.scheduleId",
        },
        soldSeats: { $sum: "$items.quantity" },
      },
    },
  ]);

  const soldByEventAndSchedule = new Map<string, number>();
  soldAgg.forEach((row: any) => {
    const eventId = row?._id?.eventId?.toString?.();
    const scheduleId = row?._id?.scheduleId?.toString?.() || "none";
    if (!eventId) return;
    soldByEventAndSchedule.set(`${eventId}:${scheduleId}`, Number(row?.soldSeats || 0));
  });

  for (const event of events) {
    const eventId = event?._id?.toString?.();
    if (!eventId || !Array.isArray(event.dateSchedule)) continue;

    const unscheduledSold = soldByEventAndSchedule.get(`${eventId}:none`) || 0;
    const hasScheduleSpecificSales = soldAgg.some(
      (row: any) =>
        row?._id?.eventId?.toString?.() === eventId &&
        !!row?._id?.scheduleId,
    );

    let totalSoldForEvent = 0;

    event.dateSchedule.forEach((schedule: any) => {
      const scheduleId = schedule?._id?.toString?.();
      let soldSeats = scheduleId
        ? soldByEventAndSchedule.get(`${eventId}:${scheduleId}`) || 0
        : 0;

      if (!hasScheduleSpecificSales && event.dateSchedule.length === 1 && unscheduledSold > 0) {
        soldSeats = unscheduledSold;
      }

      const reservedSeats = Number(schedule?.reservedSeats || 0);
      const totalSeats = getScheduleCapacity(schedule);

      schedule.soldSeats = soldSeats;
      schedule.totalSeats = totalSeats;
      schedule.availableSeats = schedule?.unlimitedSeats
        ? 999999
        : Math.max(0, totalSeats - soldSeats - reservedSeats);

      totalSoldForEvent += soldSeats;
    });

    event._soldSeats =
      totalSoldForEvent +
      (!hasScheduleSpecificSales && event.dateSchedule.length > 1 ? unscheduledSold : 0);
  }
};

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

    // Optional date range filtering
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Total events for this teacher (educational types)
    const eventFilter: any = {
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
    };
    if (hasDateFilter) eventFilter.createdAt = dateFilter;

    const totalTeachingEvents = await EventModel.countDocuments(eventFilter);

    // Get all event IDs (all-time, for booking correlation)
    const teacherEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id averageRating reviewCount");
    const teachingEventIds = teacherEvents.map((e) => e._id);

    // Booking base filter — query Order model (actual bookings), not legacy TeacherBooking
    const orderFilter: any = {
      "items.eventId": { $in: teachingEventIds },
      status: "confirmed",
    };
    if (hasDateFilter) orderFilter.createdAt = dateFilter;

    // Total Bookings
    const totalBookings = await Order.countDocuments(orderFilter);

    // Total revenue + unique students
    const paidOrders = await Order.find({
      ...orderFilter,
      paymentStatus: { $in: ["paid", "free"] },
    }).select("total userId");

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + ((order as any).total || 0),
      0,
    );

    const uniqueStudentIds = new Set(
      paidOrders.map((o) => (o as any).userId?.toString()).filter(Boolean),
    );
    const totalStudents = uniqueStudentIds.size;

    // Average rating across teacher's events
    const ratedEvents = teacherEvents.filter((e: any) => (e.reviewCount || 0) > 0);
    const averageRating = ratedEvents.length > 0
      ? ratedEvents.reduce((sum: number, e: any) => sum + (e.averageRating || 0), 0) / ratedEvents.length
      : 0;
    const totalReviews = teacherEvents.reduce((sum: number, e: any) => sum + (e.reviewCount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalTeachingEvents,
        totalBookings,
        totalRevenue,
        totalStudents,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
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

    const {
      page = 1,
      limit = 12,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
      isDeleted: false,
    };

    if (search) {
      filter.title = { $regex: search as string, $options: "i" };
    }
    if (status) {
      filter.status = status;
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [teachingEvents, total] = await Promise.all([
      EventModel.find(filter)
        .select("title description shortDescription subject price currency coverImage images imageAssets location dateSchedule status isApproved isActive isFeatured viewsCount averageRating reviewCount tags eventType venueType type slug createdAt updatedAt")
        .populate("imageAssets", "url thumbnailUrl secureUrl publicId variations")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      EventModel.countDocuments(filter),
    ]);

    const normalizedTeachingEvents = teachingEvents.map((event) => transformEventResponse(event));

    await applyOrderSeatStatsToEvents(normalizedTeachingEvents as any[]);

    res.status(200).json({
      success: true,
      data: {
        teachingEvents: normalizedTeachingEvents,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
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

    // Short-circuit: teacher has no events yet → return empty result immediately
    if (teachingEventIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          Bookings: [],
          pagination: { currentPage: 1, totalPages: 0, totalBookings: 0, hasNextPage: false, hasPrevPage: false, limit: 10 },
          stats: { totalRevenue: 0, totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, paidBookings: 0, pendingPayments: 0 },
          teachingEvents: [],
        },
      });
    }

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

    // Base filter — query Order model (not legacy TeacherBooking)
    const filter: any = {
      "items.eventId": { $in: teachingEventIds },
    };

    if (status) filter.status = status;

    // paymentStatus 'free' is stored on Order as-is; map 'paid' query to include 'free' too
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus === "paid"
        ? { $in: ["paid", "free"] }
        : paymentStatus;
    }

    if (teachingEventId) {
      filter["items.eventId"] = teachingEventId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      filter.total = {};
      if (minAmount) filter.total.$gte = Number(minAmount);
      if (maxAmount) filter.total.$lte = Number(maxAmount);
    }

    if (search) {
      filter.orderNumber = new RegExp(search as string, "i");
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Fetch Orders for teacher's events
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("userId", "firstName lastName email phone")
        .populate("items.eventId", "title coverImage")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Map Order → ITeacherBooking shape expected by frontend
    const Bookings = orders.map((order: any) => ({
      _id: order._id,
      bookingNumber: order.orderNumber || order._id.toString(),
      studentId: order.userId
        ? {
            _id: order.userId._id,
            firstName: order.userId.firstName,
            lastName: order.userId.lastName,
            email: order.userId.email,
            phone: order.userId.phone,
          }
        : null,
      sessions: (order.items || []).map((item: any) => ({
        teachingEventId: item.eventId?._id || item.eventId,
        teachingEventTitle: item.eventTitle || item.eventId?.title || "N/A",
        scheduleDate: item.scheduleDate,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        currency: item.currency || order.currency || "AED",
        students: (item.participants || []).map((p: any) => ({
          name: p.name,
          age: p.age,
        })),
      })),
      subtotal: order.subtotal ?? order.total ?? 0,
      tax: order.tax ?? 0,
      discount: order.couponDiscount ?? order.discount ?? 0,
      totalAmount: order.total ?? 0,
      currency: order.currency || "AED",
      status: order.status,
      paymentStatus: order.paymentStatus === "free" ? "paid" : (order.paymentStatus || "pending"),
      paymentMethod: order.paymentMethod,
      programStatus: order.programStatus,
      meetingLink: (order.items && order.items.length > 0) ? order.items[0].meetingLink : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    // Stats aggregation on Order
    const statsAgg = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalBookings: { $sum: 1 },
          confirmedBookings: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
          cancelledBookings: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          paidBookings: { $sum: { $cond: [{ $in: ["$paymentStatus", ["paid", "free"]] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] } },
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

// @desc    Update teacher Booking meeting link (Order-based)
// @route   PUT /api/teachers/bookings/:id/meeting-link
// @access  Private (Teacher only)
export const updateTeacherBookingMeetingLink = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { meetingLink } = req.body;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const teacherProfile = await getOrCreateTeacherProfile(userId);
    const teacherId = teacherProfile._id;

    // Get teaching events owned by teacher
    const teachingEvents = await EventModel.find({
      teacherId,
      type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
    }).select("_id");
    const teachingEventIds = teachingEvents.map((e) => e._id);

    // Find Order belonging to teacher's events
    const order = await Order.findOne({
      _id: id,
      "items.eventId": { $in: teachingEventIds },
    }).populate("userId", "firstName lastName email");

    if (!order) {
      return next(new AppError("Booking not found", 404));
    }

    // Update the meetingLink on the first item (since 1:1 classes usually have 1 item per order)
    if (order.items && order.items.length > 0) {
      order.items[0].meetingLink = meetingLink;
      await order.save();

      const user = order.userId as any;
      if (user && user.email) {
        // Send email
        await emailService.sendEmail({
          to: user.email,
          subject: `Meeting Link Updated for ${order.items[0].eventTitle}`,
          html: `<p>Hi ${user.firstName},</p>
          <p>The meeting link for your upcoming class <strong>${order.items[0].eventTitle}</strong> has been updated.</p>
          <p><strong>New Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
          <p>Thank you!</p>`,
        });
      } else if (order.billingAddress && order.billingAddress.email) {
        // Fallback to billing email
        await emailService.sendEmail({
          to: order.billingAddress.email,
          subject: `Meeting Link Updated for ${order.items[0].eventTitle}`,
          html: `<p>Hi ${order.billingAddress.firstName},</p>
          <p>The meeting link for your upcoming class <strong>${order.items[0].eventTitle}</strong> has been updated.</p>
          <p><strong>New Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
          <p>Thank you!</p>`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Meeting link updated successfully",
      data: { meetingLink },
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

    // Base filter — query Order model
    const filter: any = {
      "items.eventId": { $in: teachingEventIds },
      status: { $nin: ["pending"] },
    };

    // Filters
    if (filters.status) filter.status = filters.status;
    if (filters.paymentStatus) filter.paymentStatus = filters.paymentStatus;
    if (filters.teachingEventId) {
      filter["items.eventId"] = filters.teachingEventId;
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
      filter.total = {};
      if (filters.minAmount)
        filter.total.$gte = Number(filters.minAmount);
      if (filters.maxAmount)
        filter.total.$lte = Number(filters.maxAmount);
    }

    if (filters.search) {
      filter.orderNumber = new RegExp(filters.search as string, "i");
    }

    // Fetch Orders
    const orders = await Order.find(filter)
      .populate("userId", "firstName lastName email phone")
      .populate("items.eventId", "title")
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
        totalRecords: orders.length,
        data: orders,
      });
    }

    /* ---------------- CSV EXPORT ---------------- */
    const csvRows: string[] = [];

    csvRows.push(
      [
        "Order Number",
        "Student Name",
        "Student Email",
        "Student Phone",
        "Event",
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

    orders.forEach((order: any) => {
      const studentName = order.userId
        ? `${order.userId.firstName} ${order.userId.lastName}`
        : "N/A";

      (order.items || []).forEach((item: any) => {
        const participantNames = (item.participants || []).length > 0
          ? item.participants.map((p: any) => p.name).join("; ")
          : "N/A";

        csvRows.push(
          [
            order.orderNumber || order._id,
            `"${studentName}"`,
            order.userId?.email || "N/A",
            order.userId?.phone || "N/A",
            `"${item.eventTitle || item.eventId?.title || "N/A"}"`,
            item.scheduleDate ? new Date(item.scheduleDate).toLocaleDateString() : "N/A",
            item.quantity,
            order.total ?? 0,
            order.currency || "AED",
            order.status,
            order.paymentStatus === "free" ? "paid (free)" : (order.paymentStatus || "N/A"),
            new Date(order.createdAt).toLocaleDateString(),
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
      // phoneVerification.otpHash is already select:false at the schema level —
      // excluding the parent "phoneVerification" path too causes a MongoDB
      // "Path collision" error (parent + nested-child exclusion on same path).
      "-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -loginAttempts",
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
      education,        // frontend sends 'education' array directly
      certifications,
      yearsOfExperience,
      specialization,
      languagesSpoken,
      teachingDescription,
      website,
      socialLinks,
      profileVideoUrl,
      videoDescription,
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
      // phoneVerification.otpHash is already select:false at the schema level —
      // excluding the parent "phoneVerification" path too causes a MongoDB
      // "Path collision" error (parent + nested-child exclusion on same path).
      "-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -loginAttempts",
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
    // Accept either 'qualifications' (legacy) or 'education' (frontend)
    if (education !== undefined && Array.isArray(education)) {
      teacher.education = education.map((q: any) => ({
        degree: q.degree || q.title || '',
        institution: q.institution || '',
        year: q.year || new Date().getFullYear(),
        country: q.country || 'UAE',
      }));
    } else if (qualifications !== undefined && Array.isArray(qualifications)) {
      teacher.education = qualifications.map((q: any) => ({
        degree: q.degree || q.title || '',
        institution: q.institution || '',
        year: q.year || new Date().getFullYear(),
        country: q.country || 'UAE',
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

    // Teaching description
    if (teachingDescription !== undefined) {
      (teacher as any).teachingDescription = teachingDescription;
    }

    // Intro video link & description (set from teacher/profile page)
    if (profileVideoUrl !== undefined) {
      teacher.profileVideoUrl = profileVideoUrl;
    }
    if (videoDescription !== undefined) {
      (teacher as any).videoDescription = videoDescription;
    }

    // Social links with website
    if (website !== undefined) {
      teacher.socialLinks = {
        ...teacher.socialLinks,
        website,
      };
    }

    if (socialLinks !== undefined && typeof socialLinks === "object") {
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
        if (!url) return true;
        const isValidUrl = /^(https?:\/\/|www\.|[a-z0-9.-]+\.[a-z]{2,})/i.test(url);
        return isValidUrl;
      });

      if (!isValid) {
        return next(new AppError("Invalid social links format or URL", 400));
      }

      teacher.socialLinks = {
        ...teacher.socialLinks,
        ...socialLinks,
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
    const param = req.params.id;
    const isObjectId = /^[a-f\d]{24}$/i.test(param);

    const teacherSelect = `
      bio subjects expertise specialization yearsOfExperience languagesSpoken
      teachingDescription profileImage coverImage profileVideoUrl website socialMedia socialLinks
      averageRating totalReviews totalStudents totalClasses viewsCount slug
      education verificationStatus availabilityHours videoDescription
    `;

    let user: any;
    let teacherProfile: any;

    if (isObjectId) {
      // Existing behavior: param is a User._id
      user = await User.findOne({
        _id: param,
        role: "teacher",
        status: "active",
      }).select("firstName lastName email phone avatar createdAt");

      if (!user) return next(new AppError("Teacher not found", 404));

      teacherProfile = await Teacher.findOne({
        userId: param,
        isDeleted: false,
        isActive: true,
      }).select(teacherSelect);
    } else {
      // Slug-based lookup
      teacherProfile = await Teacher.findOne({
        slug: param,
        isDeleted: false,
        isActive: true,
      }).select(teacherSelect);

      if (!teacherProfile) return next(new AppError("Teacher not found", 404));

      user = await User.findOne({
        _id: teacherProfile.userId,
        role: "teacher",
        status: "active",
      }).select("firstName lastName email phone avatar createdAt");
    }

    if (!teacherProfile) return next(new AppError("Teacher profile not found", 404));
    if (!user) return next(new AppError("Teacher not found", 404));

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
        "title description subject teachingMode price currency coverImage images imageAssets " +
        "dateSchedule type eventType venueType viewsCount averageRating reviewCount",
      )
      .populate("imageAssets", "url thumbnailUrl secureUrl publicId variations")
      .sort({ createdAt: -1 })
      .limit(20);

    const normalizedTeachingEvents = teachingEvents.map((event) => transformEventResponse(event));

    const teachingEventIds = teachingEvents.map((e) => e._id);

    await applyOrderSeatStatsToEvents(normalizedTeachingEvents as any[]);

    const [totalTeachingEvents, totalBookings] = await Promise.all([
      EventModel.countDocuments({
        teacherId: teacherProfile._id,
        type: { $in: ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"] },
        isDeleted: false,
        status: "published",
      }),
      Order.countDocuments({
        "items.eventId": { $in: teachingEventIds },
        status: "confirmed",
        paymentStatus: { $in: ["paid", "free"] },
      }),
    ]);

    // Calculate unique students and aggregate ratings
    const paidOrders = await Order.find({
      "items.eventId": { $in: teachingEventIds },
      status: "confirmed",
      paymentStatus: { $in: ["paid", "free"] },
    }).select("userId");
    const uniqueStudentIds = new Set(
      paidOrders.map((o) => (o as any).userId?.toString()).filter(Boolean),
    );
    const totalStudents = uniqueStudentIds.size;

    const ratedEvents = teachingEvents.filter((e: any) => (e.reviewCount || 0) > 0);
    const averageRating = ratedEvents.length > 0
      ? ratedEvents.reduce((sum: number, e: any) => sum + (e.averageRating || 0), 0) / ratedEvents.length
      : 0;
    const totalReviews = teachingEvents.reduce((sum: number, e: any) => sum + (e.reviewCount || 0), 0);

    res.status(200).json({
      success: true,
      message: "Teacher profile retrieved successfully",
      data: {
        user,
        teacher: teacherProfile,
        teachingEvents: normalizedTeachingEvents,
        stats: {
          totalTeachingEvents,
          totalBookings,
          activeEvents: normalizedTeachingEvents.length,
          totalStudents,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
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
    } else if (mediaType === "eventImage") {
      // Generic event image upload — just return the URL, caller stores it
      res.status(200).json({
        success: true,
        message: "Event image uploaded successfully",
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

      // Allow URLs with or without protocol (e.g., linkedin.com/in/user or https://linkedin.com/in/user)
      const isValidUrl = /^(https?:\/\/|www\.|[a-z0-9.-]+\.[a-z]{2,})/i.test(url);
      return isValidUrl;
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

    const cacheKey = `public:teachers:${page}:${limit}:${search}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

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
        .select("userId fullName bio subjects specialization yearsOfExperience languagesSpoken coverImage teachingMode verificationStatus stats createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Teacher.countDocuments({ userId: { $in: userIds }, isDeleted: false, isActive: true }),
    ]);

    const userMap: Record<string, any> = {};
    teacherUsers.forEach((u) => { userMap[u._id.toString()] = u; });

    const teachers = teacherProfiles.map((t) => ({
      teacher: {
        _id: t._id,
        userId: t.userId,
        fullName: t.fullName,
        bio: t.bio,
        subjects: t.subjects,
        specialization: t.specialization,
        yearsOfExperience: t.yearsOfExperience,
        languagesSpoken: t.languagesSpoken,
        coverImage: (t as any).coverImage,
        teachingMode: t.teachingMode,
        verificationStatus: t.verificationStatus,
        stats: t.stats,
        createdAt: (t as any).createdAt,
      },
      user: userMap[(t.userId as any).toString()] || null,
      stats: t.stats,
    }));

    const responseData = {
      success: true,
      message: "Teachers retrieved successfully",
      data: {
        teachers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };

    await cacheService.set(cacheKey, responseData, { ttl: CacheTTL.HOMEPAGE_DATA });

    res.status(200).json(responseData);
  },
);
