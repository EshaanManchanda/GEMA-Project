import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import {
  Event,
  Booking,
  User,
  Order,
  Employee,
  UserRole,
  Vendor,
  VerificationStatus,
} from "../models/index";
import { AppError } from "../middleware/index";
import { getOrCreateVendorProfile } from "../utils/vendorHelpers";
import { getFileInfo } from "../middleware/upload";
import emailService from "./email.service";
import { sendPhoneOtp } from "./communication/otpDelivery.service";
import {
  generateOTP,
  getOTPExpiry,
  hashOTP,
  verifyOTPHash,
  MAX_OTP_ATTEMPTS,
  isResendOnCooldown,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../utils/otp";
import { escapeRegex } from "../utils/regexHelpers";
import logger from "../config/logger";
import { stripeConnectService } from "./stripe-connect.service";

// ==================== INTERFACES ====================

export interface VendorBookingQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  assignedEvent?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  addresses?: any[];
  businessName?: string;
  description?: string;
  category?: string;
  address?: any;
  location?: any;
  website?: string;
  profileVideoUrl?: string;
  videoDescription?: string;
  languagesSpoken?: string[];
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  permissions?: string[];
  assignedEvents?: string[];
  assignedVenues?: string[];
  emergencyContact?: any;
  hiredAt?: Date;
}

export interface BankDetailsInput {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
  accountType?: string;
  country: string;
}

// ==================== VENDOR SERVICE ====================

class VendorService {
  /**
   * Get vendor dashboard stats
   */
  async getDashboardStats(userId: string) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const [totalEvents, activeEvents, vendorEvents] = await Promise.all([
      Event.countDocuments({ vendorId, isDeleted: false }),
      Event.countDocuments({ vendorId, isDeleted: false, isApproved: true, isActive: true }),
      Event.find({ vendorId, isDeleted: false }).select("_id").lean(),
    ]);

    const eventIds = vendorEvents.map((e) => e._id);
    const orderFilter = { "items.eventId": { $in: eventIds } };

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [aggAll, aggThisMonth, aggLastMonth] = await Promise.all([
      Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: null, totalRevenue: { $sum: "$total" }, totalBookings: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...orderFilter, createdAt: { $gte: startOfThisMonth } } },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $match: { ...orderFilter, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]),
    ]);

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      totalEvents,
      activeEvents,
      totalBookings: aggAll[0]?.totalBookings || 0,
      totalRevenue: round2(aggAll[0]?.totalRevenue || 0),
      revenueThisMonth: round2(aggThisMonth[0]?.revenue || 0),
      revenueLastMonth: round2(aggLastMonth[0]?.revenue || 0),
    };
  }

  /**
   * Get vendor events
   */
  async getEvents(userId: string) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    return Event.find({ vendorId: vendorProfile._id })
      .populate("imageAssets", "url secureUrl publicId")
      .sort({ createdAt: -1 });
  }

  /**
   * Get vendor bookings with pagination/filters
   */
  async getBookings(userId: string, params: VendorBookingQueryParams) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const vendorEvents = await Event.find({ vendorId }).select("_id title");
    const eventIds = vendorEvents.map((e) => e._id);

    const pageNum = params.page || 1;
    const limitNum = params.limit || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { "items.eventId": { $in: eventIds } };

    if (params.status) {
      filter.status = params.status;
    }
    // No default status filter — vendors see all bookings including pending

    if (params.paymentStatus) filter.paymentStatus = params.paymentStatus;
    if (params.eventId) filter["items.eventId"] = params.eventId;

    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        filter.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (params.minAmount || params.maxAmount) {
      filter.total = {};
      if (params.minAmount) filter.total.$gte = params.minAmount;
      if (params.maxAmount) filter.total.$lte = params.maxAmount;
    }

    if (params.search) {
      const searchRegex = new RegExp(escapeRegex(params.search), "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "billingAddress.firstName": searchRegex },
        { "billingAddress.lastName": searchRegex },
        { "billingAddress.email": searchRegex },
        { "billingAddress.phone": searchRegex },
        { "items.eventTitle": searchRegex },
      ];
    }

    const sort: any = {};
    sort[params.sortBy || "createdAt"] = params.sortOrder === "asc" ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Order.find(filter)
        .populate("userId", "firstName lastName email phone")
        .populate("items.eventId", "title category images")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
            },
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
          paidBookings: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
            },
          },
          pendingPayments: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0],
            },
          },
        },
      },
    ]);

    return {
      bookings,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalBookings: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
      stats: stats[0] || {
        totalRevenue: 0,
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        paidBookings: 0,
        pendingPayments: 0,
      },
      events: vendorEvents,
    };
  }

  /**
   * Get single booking by ID
   */
  async getBookingById(userId: string, bookingId: string) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const eventIds = await Event.distinct("_id", { vendorId });

    const booking = await Order.findOne({
      _id: bookingId,
      "items.eventId": { $in: eventIds },
    })
      .populate("userId", "firstName lastName email phone avatar")
      .populate("items.eventId", "title category images location");

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    return booking;
  }

  /**
   * Update booking (limited fields)
   */
  async updateBooking(
    userId: string,
    bookingId: string,
    data: {
      vendorNotes?: string;
      vendorStatus?: string;
      isFulfilled?: boolean;
    },
  ) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const eventIds = await Event.distinct("_id", { vendorId });

    const booking = await Order.findOne({
      _id: bookingId,
      "items.eventId": { $in: eventIds },
    });

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const updates: any = {};
    if (data.vendorNotes !== undefined) updates.vendorNotes = data.vendorNotes;
    if (data.vendorStatus !== undefined)
      updates.vendorStatus = data.vendorStatus;
    if (data.isFulfilled !== undefined) updates.isFulfilled = data.isFulfilled;
    updates.lastModifiedBy = vendorId;
    updates.lastModifiedAt = new Date();

    return Order.findByIdAndUpdate(
      bookingId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("userId", "firstName lastName email phone")
      .populate("items.eventId", "title category images");
  }

  /**
   * Export bookings
   */
  async exportBookings(userId: string, format: string, filters: any) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const eventIds = await Event.distinct("_id", { vendorId });

    const filter: any = {
      "items.eventId": { $in: eventIds },
    };

    if (filters.status) filter.status = filters.status;
    if (filters.paymentStatus) filter.paymentStatus = filters.paymentStatus;
    if (filters.eventId) filter["items.eventId"] = filters.eventId;
    if (filters.startDate || filters.endDate) {
      filter.createdAt = {};
      if (filters.startDate) {
        filter.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (filters.minAmount || filters.maxAmount) {
      filter.total = {};
      if (filters.minAmount) filter.total.$gte = parseFloat(filters.minAmount);
      if (filters.maxAmount) filter.total.$lte = parseFloat(filters.maxAmount);
    }
    if (filters.search) {
      const searchRegex = new RegExp(escapeRegex(filters.search), "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "billingAddress.firstName": searchRegex },
        { "billingAddress.lastName": searchRegex },
        { "billingAddress.email": searchRegex },
      ];
    }

    const bookings = await Order.find(filter)
      .populate("userId", "firstName lastName email phone")
      .populate("items.eventId", "title")
      .sort({ createdAt: -1 })
      .lean();

    if (format === "json") {
      return { type: "json", data: bookings };
    }

    const csvEscape = (val: string) =>
      `"${String(val ?? "").replace(/"/g, '""')}"`;

    // CSV
    const csvRows: string[] = [];
    csvRows.push(
      [
        "Order Number",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Event Title",
        "Event Date",
        "Quantity",
        "Total Amount",
        "Currency",
        "Status",
        "Payment Status",
        "Booking Date",
        "Participant Names",
      ].join(","),
    );

    bookings.forEach((booking: any) => {
      const customerName = `${booking.billingAddress.firstName} ${booking.billingAddress.lastName}`;
      booking.items.forEach((item: any) => {
        const participantNames = item.participants
          ? item.participants.map((p: any) => p.name).join("; ")
          : "N/A";
        csvRows.push(
          [
            csvEscape(String(booking.orderNumber || booking._id)),
            csvEscape(customerName),
            csvEscape(booking.billingAddress.email || "N/A"),
            csvEscape(booking.billingAddress.phone || "N/A"),
            csvEscape(item.eventTitle || item.eventId?.title || "N/A"),
            csvEscape(new Date(item.scheduleDate).toLocaleDateString()),
            item.quantity,
            booking.total,
            csvEscape(booking.currency),
            csvEscape(booking.status),
            csvEscape(booking.paymentStatus),
            csvEscape(new Date(booking.createdAt).toLocaleDateString()),
            csvEscape(participantNames),
          ].join(","),
        );
      });
    });

    return { type: "csv", data: csvRows.join("\n") };
  }

  /**
   * Export participant-level rows for a specific event
   */
  async exportEventParticipants(userId: string, eventId: string, format: string) {
    const vendorProfile = await getOrCreateVendorProfile(userId);

    // Verify vendor owns the event
    const event = await Event.findOne({ _id: eventId, vendorId: vendorProfile._id });
    if (!event) {
      throw new AppError("Event not found or access denied", 404);
    }

    const orders = await Order.find({
      "items.eventId": eventId,
      status: { $nin: ["pending"] },
    })
      .populate("userId", "firstName lastName email phone")
      .lean();

    if (format === "json") {
      const rows: any[] = [];
      orders.forEach((order: any) => {
        order.items
          .filter((item: any) => String(item.eventId) === String(eventId))
          .forEach((item: any) => {
            const participants: any[] = item.participants || [];
            if (participants.length === 0) {
              rows.push({
                orderNumber: order.orderNumber || order._id,
                eventTitle: item.eventTitle,
                scheduleDate: item.scheduleDate,
                customerName: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`,
                customerEmail: order.billingAddress.email,
                customerPhone: order.billingAddress.phone || "",
                participant: null,
              });
            } else {
              participants.forEach((p: any) => {
                rows.push({
                  orderNumber: order.orderNumber || order._id,
                  eventTitle: item.eventTitle,
                  scheduleDate: item.scheduleDate,
                  customerName: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`,
                  customerEmail: order.billingAddress.email,
                  customerPhone: order.billingAddress.phone || "",
                  participant: p,
                });
              });
            }
          });
      });
      return { type: "json", data: rows };
    }

    // CSV — one row per participant
    const csvRows: string[] = [];
    csvRows.push(
      [
        "Order Number",
        "Event Title",
        "Schedule Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Participant Name",
        "Age",
        "Gender",
        "Phone",
        "Allergies",
        "Medical Conditions",
        "Emergency Contact Name",
        "Emergency Contact Phone",
        "Emergency Contact Relation",
        "Special Requirements",
        "Registration Data",
      ].join(","),
    );

    orders.forEach((order: any) => {
      order.items
        .filter((item: any) => String(item.eventId) === String(eventId))
        .forEach((item: any) => {
          const customerName = `${order.billingAddress.firstName} ${order.billingAddress.lastName}`;
          const participants: any[] = item.participants || [];

          const baseRow = [
            order.orderNumber || order._id,
            `"${item.eventTitle || ""}"`,
            item.scheduleDate ? new Date(item.scheduleDate).toLocaleDateString() : "",
            `"${customerName}"`,
            order.billingAddress.email || "",
            order.billingAddress.phone || "",
          ];

          if (participants.length === 0) {
            csvRows.push([...baseRow, "", "", "", "", "", "", "", "", "", "", ""].join(","));
            return;
          }

          participants.forEach((p: any) => {
            const regData = (p.registrationData || [])
              .map((f: any) => `${f.fieldLabel}: ${f.value}`)
              .join("; ");
            csvRows.push(
              [
                ...baseRow,
                `"${p.name || ""}"`,
                p.age ?? "",
                p.gender || "",
                p.phone || "",
                `"${(p.allergies || []).join("; ")}"`,
                `"${(p.medicalConditions || []).join("; ")}"`,
                `"${p.emergencyContact?.name || ""}"`,
                `"${p.emergencyContact?.phone || ""}"`,
                `"${p.emergencyContact?.relationship || ""}"`,
                `"${p.specialRequirements || ""}"`,
                `"${regData}"`,
              ].join(","),
            );
          });
        });
    });

    return { type: "csv", data: csvRows.join("\n") };
  }

  /**
   * Import bookings from CSV data
   */
  async importBookings(userId: string, csvData: any[]) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const results = {
      successful: [] as string[],
      failed: [] as { row: number; reason: string; data: any }[],
      total: csvData.length,
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        if (
          !row.customerEmail ||
          !row.eventTitle ||
          !row.quantity ||
          !row.totalAmount
        ) {
          results.failed.push({
            row: i + 1,
            reason: "Missing required fields",
            data: row,
          });
          continue;
        }

        const event = await Event.findOne({
          vendorId,
          title: new RegExp(`^${escapeRegex(row.eventTitle)}$`, "i"),
          isDeleted: false,
        });

        if (!event) {
          results.failed.push({
            row: i + 1,
            reason: `Event not found: ${row.eventTitle}`,
            data: row,
          });
          continue;
        }

        let user = await User.findOne({ email: row.customerEmail });
        if (!user) {
          const [firstName, ...lastParts] = (
            row.customerName || "Guest User"
          ).split(" ");
          const tempPassword = crypto.randomBytes(16).toString("hex");
          user = await User.create({
            email: row.customerEmail,
            firstName: firstName || "Guest",
            lastName: lastParts.join(" ") || "User",
            phone: row.customerPhone || "",
            passwordHash: tempPassword,
            role: "customer",
            status: "active",
            requirePasswordReset: true,
          });
        }

        const eventDate = row.eventDate ? new Date(row.eventDate) : new Date();

        const order = await Order.create({
          userId: user._id,
          items: [
            {
              eventId: event._id,
              eventTitle: event.title,
              scheduleDate: eventDate,
              quantity: parseInt(row.quantity),
              unitPrice: parseFloat(row.totalAmount) / parseInt(row.quantity),
              totalPrice: parseFloat(row.totalAmount),
              currency: row.currency || event.currency || "AED",
              participants: row.participantNames
                ? row.participantNames
                    .split(";")
                    .map((name: string) => ({ name: name.trim() }))
                : [],
            },
          ],
          subtotal: parseFloat(row.totalAmount),
          tax: 0,
          discount: 0,
          total: parseFloat(row.totalAmount),
          currency: row.currency || event.currency || "AED",
          status: row.status || "confirmed",
          paymentStatus: row.paymentStatus || "paid",
          paymentMethod: "imported",
          billingAddress: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || row.customerPhone || "",
            address: "Imported",
            city: "Imported",
            state: "Imported",
            zipCode: "00000",
            country: "UAE",
          },
          source: "vendor_import",
          notes: `Imported by vendor on ${new Date().toISOString()}`,
        });

        results.successful.push(order.orderNumber);
      } catch (error) {
        results.failed.push({
          row: i + 1,
          reason: error instanceof Error ? error.message : "Unknown error",
          data: row,
        });
      }
    }

    return results;
  }

  // ==================== PROFILE ====================

  /**
   * Get vendor profile
   */
  async getProfile(userId: string) {
    const vendor = await getOrCreateVendorProfile(userId);
    const user = await User.findById(userId).select(
      "-passwordHash -twoFactorAuth.secret -passwordReset " +
        "-emailVerification -loginAttempts",
    );

    return { vendor, user };
  }

  /**
   * Update vendor profile
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const userUpdates: any = {};
    if (data.firstName !== undefined) userUpdates.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdates.lastName = data.lastName;
    if (data.phone !== undefined) userUpdates.phone = data.phone;
    if (data.gender !== undefined) userUpdates.gender = data.gender;
    if (data.dateOfBirth !== undefined)
      userUpdates.dateOfBirth = data.dateOfBirth;
    if (data.addresses !== undefined) userUpdates.addresses = data.addresses;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: userUpdates },
      { new: true, runValidators: true },
    ).select(
      "-passwordHash -twoFactorAuth.secret -passwordReset " +
        "-emailVerification -loginAttempts",
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const vendor = await getOrCreateVendorProfile(userId);

    if (data.businessName !== undefined)
      vendor.businessName = data.businessName;
    if (data.description !== undefined) vendor.description = data.description;
    if (data.category !== undefined) vendor.category = data.category;
    if (data.address !== undefined) vendor.address = data.address;
    if (data.location !== undefined) vendor.location = data.location;
    if (data.website !== undefined) vendor.website = data.website;
    if (data.profileVideoUrl !== undefined) vendor.profileVideoUrl = data.profileVideoUrl;
    if (data.videoDescription !== undefined) vendor.videoDescription = data.videoDescription;
    if (data.languagesSpoken !== undefined) vendor.languagesSpoken = data.languagesSpoken;

    await vendor.save();

    return { user, vendor };
  }

  /**
   * Upload vendor image (logo/cover)
   */
  async uploadImage(
    userId: string,
    file: Express.Multer.File,
    imageType: string,
  ) {
    const fileInfo = getFileInfo(file);
    const vendorProfile = await getOrCreateVendorProfile(userId);

    if (imageType === "coverImage") {
      vendorProfile.coverImage = fileInfo.url;
    } else {
      vendorProfile.logo = fileInfo.url;
      await User.findByIdAndUpdate(userId, { avatar: fileInfo.url });
    }

    await vendorProfile.save();

    return {
      logo: vendorProfile.logo,
      coverImage: vendorProfile.coverImage,
      uploadedFile: fileInfo,
    };
  }

  /**
   * Delete vendor image (logo/cover)
   */
  async deleteImage(userId: string, imageType: string) {
    const vendorProfile = await getOrCreateVendorProfile(userId);

    if (imageType === "coverImage") {
      vendorProfile.coverImage = undefined as any;
    } else {
      vendorProfile.logo = undefined as any;
      await User.findByIdAndUpdate(userId, { avatar: "" });
    }

    await vendorProfile.save();

    return {
      logo: vendorProfile.logo || "",
      coverImage: vendorProfile.coverImage || "",
    };
  }

  /**
   * Update business hours
   */
  async updateBusinessHours(userId: string, businessHours: any) {
    if (!businessHours || typeof businessHours !== "object") {
      throw new AppError("Business hours data is required", 400);
    }

    const daysOfWeek = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const isValid = Object.keys(businessHours).every((day) => {
      if (!daysOfWeek.includes(day.toLowerCase())) return false;
      const d = businessHours[day];
      return (
        d &&
        typeof d === "object" &&
        "isOpen" in d &&
        (!d.isOpen || ("openTime" in d && "closeTime" in d))
      );
    });

    if (!isValid) {
      throw new AppError("Invalid business hours format", 400);
    }

    const vendor = await getOrCreateVendorProfile(userId);
    vendor.businessHours = businessHours;
    await vendor.save();

    return vendor;
  }

  /**
   * Update social media links
   */
  async updateSocialMedia(userId: string, socialMedia: any) {
    if (!socialMedia || typeof socialMedia !== "object") {
      throw new AppError("Social media data is required", 400);
    }

    const validPlatforms = [
      "facebook",
      "instagram",
      "twitter",
      "linkedin",
      "youtube",
      "website",
    ];
    const isValid = Object.keys(socialMedia).every((platform) => {
      if (!validPlatforms.includes(platform.toLowerCase())) return false;
      const url = socialMedia[platform];
      if (url && typeof url === "string") {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      }
      return url === "" || url === null;
    });

    if (!isValid) {
      throw new AppError("Invalid social media URLs or platforms", 400);
    }

    const vendor = await getOrCreateVendorProfile(userId);
    vendor.socialMedia = socialMedia;
    await vendor.save();

    return vendor;
  }

  // ==================== PUBLIC ====================

  /**
   * Get all public vendors (active, verified, non-suspended)
   */
  async getAllPublicVendors(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const pageNum = params.page || 1;
    const limitNum = params.limit || 12;
    const skip = (pageNum - 1) * limitNum;

    // 1. Build the base User query for active vendors
    const userQuery: any = { role: "vendor", status: "active" };

    if (params.search) {
      const searchRegex = new RegExp(escapeRegex(params.search), "i");
      
      // Also match Vendor businessName for the search
      const matchedVendors = await Vendor.find({
        businessName: searchRegex,
        isSuspended: false
      }).select("userId");
      
      const matchedVendorUserIds = matchedVendors.map(v => v.userId);

      userQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { _id: { $in: matchedVendorUserIds } }
      ];
    }

    const sortObj: any = {};
    sortObj[params.sortBy || "createdAt"] = params.sortOrder === "asc" ? 1 : -1;

    // 2. Fetch users and count
    const [users, total] = await Promise.all([
      User.find(userQuery)
        .select("firstName lastName avatar email phone createdAt")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(userQuery),
    ]);

    const userIds = users.map((u: any) => u._id);

    // 3. Fetch corresponding Vendor documents (if they exist)
    const vendors = await Vendor.find({
      userId: { $in: userIds },
      isSuspended: false,
    }).lean();

    const vendorMap = new Map(vendors.map((v: any) => [v.userId.toString(), v]));

    // 4. Map them together
    const transformedVendors = users.map((u: any) => {
      const v: any = vendorMap.get(u._id.toString()) || {};
      const name = v.businessName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Vendor';

      return {
        id: u._id.toString(),
        name,
        description: v.bio || `Professional event organizer - ${name}`,
        location: v.location?.city || "Location TBD",
        rating: v.stats?.averageRating || 4.5,
        reviewCount: v.stats?.totalReviews || v.stats?.totalBookings || 0,
        eventCount: v.stats?.totalEvents || 0,
        logo: v.logo || u.avatar || "",
        coverImage: v.coverImage || "",
        categories: v.category ? [v.category] : [],
      };
    });

    return {
      vendors: transformedVendors,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
    };
  }

  /**
   * Get public vendor profile by ID
   */
  async getPublicVendorProfile(vendorUserId: string) {
    const isObjectId = /^[a-f\d]{24}$/i.test(vendorUserId);
    let resolvedUserId = vendorUserId;
    let user: any;

    if (!isObjectId) {
      // Slug-based lookup
      const vendorDoc = await Vendor.findOne({ slug: vendorUserId }).select("userId");
      if (!vendorDoc) throw new AppError("Vendor not found", 404);
      resolvedUserId = vendorDoc.userId.toString();
      user = await User.findOne({
        _id: resolvedUserId,
        role: "vendor",
        status: { $ne: "suspended" },
      }).select("firstName lastName avatar createdAt");
      if (!user) throw new AppError("Vendor not found", 404);
    } else {
      // Try User lookup first; if not found, treat ID as Vendor doc _id
      user = await User.findOne({
        _id: vendorUserId,
        role: "vendor",
        status: { $ne: "suspended" },
      }).select("firstName lastName avatar createdAt");

      if (!user) {
        const vendorDoc = await Vendor.findById(vendorUserId).select("userId");
        if (!vendorDoc) throw new AppError("Vendor not found", 404);

        resolvedUserId = vendorDoc.userId.toString();
        user = await User.findOne({
          _id: resolvedUserId,
          role: "vendor",
          status: { $ne: "suspended" },
        }).select("firstName lastName avatar createdAt");

        if (!user) throw new AppError("Vendor not found", 404);
      }
    }

    const vendorProfile = await Vendor.findOne({
      userId: resolvedUserId,
    }).select(
      "businessName description category address location website " +
        "socialMedia businessHours stats coverImage logo",
    );

    if (!vendorProfile) throw new AppError("Vendor not found", 404);

    // Event.vendorId refs Vendor doc _id, not User _id
    const vendorDocId = vendorProfile._id;

    const events = await Event.find({
      vendorId: vendorDocId,
      isDeleted: false,
      isActive: true,
      status: "published",
      isApproved: true,
    })
      .select(
        "title slug description category price currency images imageAssets dateSchedule " +
          "location tags viewsCount averageRating reviewCount",
      )
      .populate("imageAssets", "url secureUrl publicId")
      .sort({ createdAt: -1 })
      .limit(20);

    const totalEvents = await Event.countDocuments({
      vendorId: vendorDocId,
      isDeleted: false,
      status: "published",
      isApproved: true,
    });

    const activeEvents = await Event.countDocuments({
      vendorId: vendorDocId,
      isDeleted: false,
      isActive: true,
      status: "published",
      isApproved: true,
    });

    // Count bookings across ALL vendor events, not just the returned page
    const allVendorEventIds = await Event.find({
      vendorId: vendorDocId,
      isDeleted: false,
    }).distinct("_id");

    const totalBookings = await Booking.countDocuments({
      eventId: { $in: allVendorEventIds },
    });

    return {
      user,
      vendor: vendorProfile,
      events,
      stats: {
        totalEvents,
        totalBookings,
        activeEvents,
      },
    };
  }

  /**
   * Get vendor payment info (for booking flow)
   */
  async getPaymentInfo(vendorId: string) {
    const user = await User.findById(vendorId).select("role");

    if (!user || user.role !== "vendor") {
      return {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      };
    }

    const vendorProfile = await Vendor.findOne({ userId: vendorId }).select(
      "paymentSettings.paymentMode " +
        "paymentSettings.stripeSettings.stripePublishableKey " +
        "paymentSettings.subscriptionStatus",
    );

    if (!vendorProfile) {
      return {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      };
    }

    const ps = vendorProfile.paymentSettings;
    const isCustomStripe =
      ps.paymentMode === "custom_stripe" && ps.subscriptionStatus === "active";

    return {
      vendorId,
      hasCustomStripe: isCustomStripe,
      stripePublishableKey: isCustomStripe
        ? ps.stripeSettings?.stripePublishableKey
        : null,
      serviceFeeRate: isCustomStripe
        ? 0
        : vendorProfile.getEffectiveCommissionRate(),
      usePlatformStripe: !isCustomStripe,
    };
  }

  // ==================== EMPLOYEES ====================

  /**
   * Get vendor employees with pagination
   */
  async getEmployees(userId: string, params: EmployeeQueryParams) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const pageNum = params.page || 1;
    const limitNum = params.limit || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { vendorId };
    if (params.role) filter.role = params.role;
    if (params.status) filter.status = params.status;
    if (params.assignedEvent) filter.assignedEvents = params.assignedEvent;

    if (params.search) {
      const searchRegex = new RegExp(escapeRegex(params.search), "i");
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
        { phone: searchRegex },
      ];
    }

    const sort: any = {};
    sort[params.sortBy || "createdAt"] = params.sortOrder === "asc" ? 1 : -1;

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate("userId", "firstName lastName email phone avatar status")
        .populate("assignedEvents", "title startDate endDate category")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Employee.countDocuments(filter),
    ]);

    const stats = await Employee.aggregate([
      { $match: { vendorId } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactiveEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
          },
          suspendedEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
          },
          managerCount: {
            $sum: { $cond: [{ $eq: ["$role", "manager"] }, 1, 0] },
          },
          scannerCount: {
            $sum: { $cond: [{ $eq: ["$role", "scanner"] }, 1, 0] },
          },
          coordinatorCount: {
            $sum: { $cond: [{ $eq: ["$role", "coordinator"] }, 1, 0] },
          },
          securityCount: {
            $sum: { $cond: [{ $eq: ["$role", "security"] }, 1, 0] },
          },
        },
      },
    ]);

    return {
      employees,
      pagination: {
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalEmployees: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
      stats: stats[0] || {
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        suspendedEmployees: 0,
        managerCount: 0,
        scannerCount: 0,
        coordinatorCount: 0,
        securityCount: 0,
      },
    };
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(userId: string, employeeId: string) {
    const vendorProfile = await getOrCreateVendorProfile(userId);

    const employee = await Employee.findOne({
      _id: employeeId,
      vendorId: vendorProfile._id,
    })
      .populate("userId", "firstName lastName email phone avatar status")
      .populate(
        "assignedEvents",
        "title startDate endDate category location images",
      )
      .populate("assignedVenues", "name location");

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    return employee;
  }

  /**
   * Create employee
   */
  async createEmployee(userId: string, data: CreateEmployeeInput) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    if (!data.firstName || !data.lastName || !data.email || !data.role) {
      throw new AppError(
        "First name, last name, email, and role are required",
        400,
      );
    }

    const existing = await Employee.findOne({ email: data.email });
    if (existing) {
      throw new AppError("Employee with this email already exists", 400);
    }

    let user = await User.findOne({ email: data.email });
    let tempPassword: string | null = null;

    if (!user) {
      tempPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8).toUpperCase();
      user = await User.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
        role: UserRole.EMPLOYEE,
        status: "active",
        passwordHash: tempPassword,
      });
    } else {
      if (user.role !== UserRole.EMPLOYEE && user.role !== UserRole.CUSTOMER) {
        throw new AppError(
          "User with this email already has a different role",
          400,
        );
      }
      if (user.role === UserRole.CUSTOMER) {
        user.role = UserRole.EMPLOYEE;
        await user.save();
      }
    }

    const employeeCount = await Employee.countDocuments({ vendorId });
    const employeeId = `EMP-${(employeeCount + 1).toString().padStart(5, "0")}`;

    const employee = await Employee.create({
      vendorId,
      userId: user._id,
      employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      permissions: data.permissions || [],
      assignedEvents: data.assignedEvents || [],
      assignedVenues: data.assignedVenues || [],
      status: "active",
      emergencyContact: data.emergencyContact,
      hiredAt: data.hiredAt || new Date(),
    });

    const populated = await Employee.findById(employee._id)
      .populate("userId", "firstName lastName email phone avatar status")
      .populate("assignedEvents", "title startDate endDate category")
      .populate("assignedVenues", "name location");

    if (tempPassword) {
      try {
        const vendorUser =
          await User.findById(vendorId).select("firstName lastName");
        const vendorName = vendorUser
          ? `${vendorUser.firstName} ${vendorUser.lastName}`
          : "Your Employer";

        await emailService.sendEmployeeWelcomeEmail({
          to: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          employeeId,
          email: data.email,
          temporaryPassword: tempPassword,
          vendorName,
          role: data.role,
        });
      } catch (emailError) {
        logger.error("Failed to send welcome email:", emailError);
      }
    }

    return { employee: populated, tempPasswordSent: !!tempPassword };
  }

  /**
   * Update employee
   */
  async updateEmployee(userId: string, employeeId: string, data: any) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const employee = await Employee.findOne({
      _id: employeeId,
      vendorId,
    });
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const updates: any = {};
    const fields = [
      "firstName",
      "lastName",
      "phone",
      "role",
      "permissions",
      "assignedEvents",
      "assignedVenues",
      "status",
      "emergencyContact",
    ];
    fields.forEach((f) => {
      if (data[f] !== undefined) updates[f] = data[f];
    });

    const updated = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("userId", "firstName lastName email phone avatar status")
      .populate("assignedEvents", "title startDate endDate category location")
      .populate("assignedVenues", "name location");

    if (
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      data.phone !== undefined
    ) {
      const userUpdates: any = {};
      if (data.firstName !== undefined) userUpdates.firstName = data.firstName;
      if (data.lastName !== undefined) userUpdates.lastName = data.lastName;
      if (data.phone !== undefined) userUpdates.phone = data.phone;
      await User.findByIdAndUpdate(employee.userId, {
        $set: userUpdates,
      });
    }

    return updated;
  }

  /**
   * Delete/deactivate employee
   */
  async deleteEmployee(userId: string, employeeId: string, hard: boolean) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const employee = await Employee.findOne({
      _id: employeeId,
      vendorId,
    });
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    if (hard) {
      await Employee.findByIdAndDelete(employeeId);
      const otherEmployeeRoles = await Employee.countDocuments({
        userId: employee.userId,
        _id: { $ne: employeeId },
        status: "active",
      });
      if (otherEmployeeRoles === 0) {
        await User.findByIdAndUpdate(employee.userId, {
          status: "inactive",
        });
      }
      return null;
    }

    return Employee.findByIdAndUpdate(
      employeeId,
      { status: "inactive" },
      { new: true },
    );
  }

  /**
   * Assign employee to events
   */
  async assignEmployeeToEvent(
    userId: string,
    employeeId: string,
    eventIds: string[],
  ) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      throw new AppError(
        "eventIds array is required and must not be empty",
        400,
      );
    }

    const invalidIds = eventIds.filter(
      (eid) => !mongoose.Types.ObjectId.isValid(eid),
    );
    if (invalidIds.length > 0) {
      throw new AppError(`Invalid event IDs: ${invalidIds.join(", ")}`, 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const employee = await Employee.findOne({
        _id: employeeId,
        vendorId,
      }).session(session);
      if (!employee) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError("Employee not found", 404);
      }

      const events = await Event.find({
        _id: { $in: eventIds },
        vendorId,
      }).session(session);

      if (events.length !== eventIds.length) {
        const found = events.map((e) => e._id.toString());
        const notFound = eventIds.filter(
          (eid) => !found.includes(eid.toString()),
        );
        await session.abortTransaction();
        session.endSession();
        throw new AppError(
          `Events not found or not yours: ${notFound.join(", ")}`,
          404,
        );
      }

      const current = employee.assignedEvents.map((e: any) => e.toString());
      const newIds = eventIds.filter(
        (eid) => !current.includes(eid.toString()),
      );

      if (newIds.length === 0) {
        await session.abortTransaction();
        session.endSession();
        const populated = await Employee.findById(employeeId)
          .populate("userId", "firstName lastName email phone avatar")
          .populate(
            "assignedEvents",
            "title startDate endDate category location",
          );
        return { employee: populated, newCount: 0 };
      }

      employee.assignedEvents.push(
        ...newIds.map((id) => new mongoose.Types.ObjectId(id)),
      );
      await employee.save({ session });

      await session.commitTransaction();
      session.endSession();

      const populated = await Employee.findById(employeeId)
        .populate("userId", "firstName lastName email phone avatar")
        .populate(
          "assignedEvents",
          "title startDate endDate category location",
        );

      return { employee: populated, newCount: newIds.length };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Remove employee from event
   */
  async removeEmployeeFromEvent(
    userId: string,
    employeeId: string,
    eventId: string,
  ) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    if (!eventId) {
      throw new AppError("Event ID is required", 400);
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      vendorId,
    });
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    employee.assignedEvents = employee.assignedEvents.filter(
      (e: any) => e.toString() !== eventId,
    );
    await employee.save();

    return Employee.findById(employeeId)
      .populate("userId", "firstName lastName email phone avatar")
      .populate("assignedEvents", "title startDate endDate category location");
  }

  /**
   * Export employees
   */
  async exportEmployees(userId: string, format: string, filters: any) {
    const vendorProfile = await getOrCreateVendorProfile(userId);
    const vendorId = vendorProfile._id;

    const filter: any = { vendorId };
    if (filters.role) filter.role = filters.role;
    if (filters.status) filter.status = filters.status;
    if (filters.assignedEvent) filter.assignedEvents = filters.assignedEvent;
    if (filters.search) {
      const searchRegex = new RegExp(escapeRegex(filters.search), "i");
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
      ];
    }

    const employees = await Employee.find(filter)
      .populate("userId", "firstName lastName email phone status")
      .populate("assignedEvents", "title")
      .sort({ createdAt: -1 })
      .lean();

    if (format === "json") {
      return { type: "json", data: employees };
    }

    const csvRows: string[] = [];
    csvRows.push(
      [
        "Employee ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Role",
        "Status",
        "Assigned Events",
        "Hired Date",
        "Emergency Contact Name",
        "Emergency Contact Phone",
      ].join(","),
    );

    employees.forEach((emp: any) => {
      const assignedTitles = emp.assignedEvents
        ? emp.assignedEvents.map((e: any) => e.title || e._id).join("; ")
        : "None";
      csvRows.push(
        [
          emp.employeeId,
          `"${emp.firstName}"`,
          `"${emp.lastName}"`,
          emp.email,
          emp.phone || "N/A",
          emp.role,
          emp.status,
          `"${assignedTitles}"`,
          emp.hiredAt ? new Date(emp.hiredAt).toLocaleDateString() : "N/A",
          emp.emergencyContact?.name ? `"${emp.emergencyContact.name}"` : "N/A",
          emp.emergencyContact?.phone || "N/A",
        ].join(","),
      );
    });

    return { type: "csv", data: csvRows.join("\n") };
  }

  // ==================== PHONE/BANK/DOCS ====================

  /**
   * Send phone verification OTP
   */
  async sendPhoneVerificationOTP(userId: string, phone: string) {
    if (!phone) {
      throw new AppError("Phone number is required", 400);
    }

    const existing = await User.findById(userId).select(
      "phoneVerification.lastSentAt",
    );
    if (isResendOnCooldown(existing?.phoneVerification?.lastSentAt)) {
      throw new AppError(
        `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another code.`,
        429,
      );
    }

    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    // Store only the hash — never persist the plaintext code
    await User.findByIdAndUpdate(userId, {
      phoneVerification: {
        otpHash: await hashOTP(otp),
        expiresAt,
        attempts: 0,
        resendCount: 0,
        lastSentAt: new Date(),
      },
    });

    // WhatsApp-first with automatic SMS fallback.
    const delivery = await sendPhoneOtp(phone, otp, "whatsapp");
    if (!delivery.success) {
      throw new AppError(
        "Failed to send verification code. Please try again or contact support.",
        500,
      );
    }
    await User.findByIdAndUpdate(userId, {
      phoneVerificationChannel: delivery.channelUsed,
    });

    return { expiresAt };
  }

  /**
   * Verify phone OTP
   */
  async verifyPhoneOTP(userId: string, otp: string) {
    if (!otp) {
      throw new AppError("Verification code is required", 400);
    }

    const user = await User.findById(userId).select(
      "+phoneVerification.otpHash",
    );
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (
      !user.phoneVerification?.otpHash ||
      !user.phoneVerification.expiresAt ||
      user.phoneVerification.expiresAt < new Date()
    ) {
      throw new AppError("Invalid or expired verification code", 400);
    }

    if (user.phoneVerification.attempts >= MAX_OTP_ATTEMPTS) {
      user.phoneVerification = undefined;
      await user.save();
      throw new AppError(
        "Too many incorrect attempts. Please request a new verification code.",
        429,
      );
    }

    const isValidOTP = await verifyOTPHash(otp, user.phoneVerification.otpHash);
    if (!isValidOTP) {
      user.phoneVerification.attempts += 1;
      await user.save();
      throw new AppError("Invalid or expired verification code", 400);
    }

    user.isPhoneVerified = true;
    user.phoneVerification = undefined;
    await user.save();

    return { isPhoneVerified: true };
  }

  /**
   * Update bank details
   */
  async updateBankDetails(userId: string, data: BankDetailsInput) {
    if (
      !data.accountHolderName ||
      !data.bankName ||
      !data.accountNumber ||
      !data.country
    ) {
      throw new AppError(
        "Account holder name, bank name, account number, and country are required",
        400,
      );
    }

    const vendor = await getOrCreateVendorProfile(userId);

    if (!vendor.paymentSettings.bankAccountDetails) {
      vendor.paymentSettings.bankAccountDetails = {};
    }

    vendor.paymentSettings.bankAccountDetails = {
      accountHolderName: data.accountHolderName,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      routingNumber: data.routingNumber,
      iban: data.iban,
      swiftCode: data.swiftCode,
      country: data.country,
      accountType: data.accountType as "checking" | "savings" | undefined,
      isVerified: false,
    };

    await vendor.save();

    return vendor.paymentSettings.bankAccountDetails;
  }

  /**
   * Upload verification document
   */
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    type: string,
  ) {
    const validTypes = [
      "businessLicense",
      "taxCertificate",
      "identityDocument",
    ];
    if (!type || !validTypes.includes(type)) {
      throw new AppError(
        "Valid document type is required (businessLicense, taxCertificate, identityDocument)",
        400,
      );
    }

    const fileInfo = getFileInfo(file);
    const vendor = await getOrCreateVendorProfile(userId);

    if (!vendor.verificationDocuments) {
      vendor.verificationDocuments = {};
    }

    vendor.verificationDocuments[type] = {
      url: fileInfo.url,
      status: VerificationStatus.PENDING,
      uploadedAt: new Date(),
    };

    if (vendor.verificationStatus === VerificationStatus.UNVERIFIED) {
      vendor.verificationStatus = VerificationStatus.PENDING;
    }

    await vendor.save();

    return { type, document: vendor.verificationDocuments[type] };
  }

  /**
   * Delete verification document
   */
  async deleteDocument(userId: string, type: string) {
    const validTypes = [
      "businessLicense",
      "taxCertificate",
      "identityDocument",
    ];
    if (!type || !validTypes.includes(type)) {
      throw new AppError("Valid document type is required", 400);
    }

    const vendor = await getOrCreateVendorProfile(userId);

    if (!vendor.verificationDocuments || !vendor.verificationDocuments[type]) {
      throw new AppError("Document not found", 404);
    }

    vendor.verificationDocuments[type] = undefined;
    await vendor.save();
  }

  /**
   * Get documents status
   */
  async getDocuments(userId: string) {
    const vendor = await getOrCreateVendorProfile(userId);

    const documents: any[] = [];
    if (vendor.verificationDocuments) {
      ["businessLicense", "taxCertificate", "identityDocument"].forEach(
        (type) => {
          const doc = vendor.verificationDocuments[type];
          if (doc && doc.url) {
            documents.push({
              type,
              url: doc.url,
              status: doc.status || "not_uploaded",
              uploadedAt: doc.uploadedAt,
              rejectionReason: doc.rejectionReason,
            });
          } else {
            documents.push({ type, status: "not_uploaded" });
          }
        },
      );
    }

    return documents;
  }

  // ==================== STRIPE CONNECT ====================

  async initializeStripeConnect(userId: string) {
    const vendor = await getOrCreateVendorProfile(userId);
    const frontendUrl = process.env.FRONTEND_URL || "https://kidrove.com";
    const url = await stripeConnectService.generateOnboardingLink(
      vendor._id as Types.ObjectId,
      `${frontendUrl}/vendor/stripe-connect/refresh`,
      `${frontendUrl}/vendor/stripe-connect/return`,
    );
    return { url };
  }

  /**
   * Get Stripe Connect status
   */
  async getStripeConnectStatus(userId: string) {
    const vendor = await getOrCreateVendorProfile(userId);
    const stripeSettings = vendor.paymentSettings?.stripeSettings;
    const isConnected = !!stripeSettings?.stripeConnectAccountId;

    return {
      isConnected,
      accountId: stripeSettings?.stripeConnectAccountId,
      onboardingComplete:
        stripeSettings?.stripeConnectOnboardingComplete || false,
      chargesEnabled:
        stripeSettings?.stripeConnectCapabilities?.card_payments === "active",
      payoutsEnabled:
        stripeSettings?.stripeConnectCapabilities?.transfers === "active",
      detailsSubmitted:
        stripeSettings?.stripeConnectOnboardingComplete || false,
    };
  }
}

export default new VendorService();
