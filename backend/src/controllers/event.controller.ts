import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { Event, User } from "../models/index";
import Vendor from "../models/Vendor";
import Teacher from "../models/Teacher";
import MediaAsset from "../models/MediaAsset";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { config, checkDBHealth } from "../config/index";
import {
  buildPublicEventFilter,
  sanitizeEventOutput,
  sanitizeEventsOutput,
} from "../utils/event.utils";
import { cacheService } from "../services/cache.service";
import { invalidateEventCaches } from "../utils/cache.utils";
import { eventService } from "../services/event.service";
import { CacheTTL } from "../config/cache-tiers"; // ✅ Phase 2.3: Tiered cache strategy
import { emailService } from "../services/email.service";
import { stripe } from "../config/stripe";
import {
  PROMOTION_TIERS,
  PromotionTier,
} from "../config/promotionPricing";

/**
 * Wrapper to add timeout to database operations
 */
const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number = 30000,
  operationName: string = "Database operation",
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new AppError(`${operationName} timed out after ${timeoutMs}ms`, 408),
      );
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      type,
      venueType,
      city,
      minPrice,
      maxPrice,
      currency,
      ageMin,
      ageMax,
      featured,
      search,
      tags,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      teacherId,
      subject,
      topic,
    } = req.query;

    // Pagination validation constants
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 12;
    const MAX_PAGE = 1000;
    const MAX_SKIP = 10000; // Prevent deep pagination abuse

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(
      1,
      Math.min(parseInt(page as string) || 1, MAX_PAGE),
    );
    const limitNum = Math.max(
      1,
      Math.min(parseInt(limit as string) || DEFAULT_LIMIT, MAX_LIMIT),
    );
    const skip = (pageNum - 1) * limitNum;

    // Protection against deep pagination (MongoDB performance degrades)
    if (skip > MAX_SKIP) {
      return next(
        new AppError(
          "Page number too high. Please use more specific filters or contact support for data export options.",
          400,
        ),
      );
    }

    // Generate cache key based on query parameters
    const cacheKey = `events:list:${JSON.stringify({
      page: pageNum,
      limit: limitNum,
      category,
      type,
      venueType,
      city,
      minPrice,
      maxPrice,
      currency,
      ageMin,
      ageMax,
      featured,
      search,
      tags,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    })}`;

    // Try to get from cache first
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      console.log("✅ Cache HIT for events listing");
      return res.status(200).json({
        success: true,
        message: "Events retrieved successfully",
        data: cached,
        cached: true,
      });
    }

    console.log("❌ Cache MISS for events listing");

    // Build additional filters based on query params
    const additionalFilters: any = {};

    // Case-insensitive category matching (events store category as slugs)
    if (category) {
      // Escape regex special characters to prevent injection
      const escapedCategory = (category as string).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      additionalFilters.category = new RegExp(`^${escapedCategory}$`, "i");
    }
    if (type) additionalFilters.type = type;
    if (venueType) additionalFilters.venueType = venueType;
    if (city)
      additionalFilters["location.city"] = new RegExp(city as string, "i");
    if (currency) additionalFilters.currency = currency;
    if (featured !== undefined) {
      additionalFilters.isFeatured = featured === "true";
    }
    if (teacherId) additionalFilters.teacherId = teacherId;
    if (subject) {
      const escapedSubject = (subject as string).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      additionalFilters.subject = new RegExp(`^${escapedSubject}$`, "i");
    }
    if (topic) {
      const escapedTopic = (topic as string).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      additionalFilters.topic = new RegExp(`^${escapedTopic}$`, "i");
    }

    // Tag filtering
    if (tags) {
      const tagArray = (tags as string).split(",").map((tag) => tag.trim());
      additionalFilters.tags = { $in: tagArray };
    }

    // Build public event filter (includes expiration check)
    const filter = buildPublicEventFilter(additionalFilters);

    // Price filtering
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
    }

    // Age range filtering
    if (ageMin || ageMax) {
      const ageConditions: any = {};
      if (ageMin) ageConditions.$gte = parseInt(ageMin as string);
      if (ageMax) ageConditions.$lte = parseInt(ageMax as string);
      filter.ageRange = { $elemMatch: ageConditions };
    }

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      filter["dateSchedule.startDate"] = {};
      if (dateFrom) {
        filter["dateSchedule.startDate"].$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        filter["dateSchedule.startDate"].$lte = new Date(dateTo as string);
      }
    }

    // Build sort query — always pin active promoted events first
    const sort: any = {};
    sort.featuredUntil = -1; // nulls sort last in desc; active promotions bubble up
    if (search && !sortBy) {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    }

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("vendorId", "firstName lastName email")
        .populate("teacherId", "firstName lastName email bio profileImage") // ✅ Populate teacher details
        .populate("imageAssets", "url thumbnailUrl variations")
        .select("-dateSchedule.price")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // ✅ Read-only query optimization
      Event.countDocuments(filter),
    ]);

    console.log("Query results:");
    console.log("- Total events matching filter:", total);
    console.log("- Events returned:", events.length);
    console.log(
      "- Sample event viewsCounts:",
      events.map((e) => ({
        title: e.title.substring(0, 20),
        viewsCount: e.viewsCount,
      })),
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Sanitize output to remove internal fields
    const sanitizedEvents = sanitizeEventsOutput(events);

    const responseData = {
      events: sanitizedEvents,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalEvents: total,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
      },
    };

    // ✅ Cache with tiered TTL strategy (3 minutes for medium-churn data)
    await cacheService.set(cacheKey, responseData, {
      ttl: CacheTTL.EVENT_LISTING,
    });

    res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: responseData,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:slug (supports both slug and legacy ID for backward compatibility)
// @access  Public
export const getEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { slug } = req.params;

    // Check if parameter is a MongoDB ObjectId (24 hex characters) for backward compatibility
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(slug);
    const lookupField = isMongoId ? "_id" : "slug";
    const lookupValue = isMongoId ? slug : slug;

    // Try to get from cache first
    const cacheKey = `event:${lookupField}:${lookupValue}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      console.log(`✅ Cache HIT for event ${lookupValue} (${lookupField})`);
      // Still increment view count (async, non-blocking)
      const updateQuery = isMongoId
        ? { _id: lookupValue }
        : { slug: lookupValue };
      withTimeout(
        Event.findOneAndUpdate(updateQuery, { $inc: { viewsCount: 1 } }),
        15000,
        "View count update",
      ).catch((error) => {
        console.warn("Failed to update view count:", error.message);
      });

      return res.status(200).json({
        success: true,
        message: "Event retrieved successfully",
        data: cached,
        cached: true,
      });
    }

    console.log(`❌ Cache MISS for event ${lookupValue} (${lookupField})`);

    // Check database health before proceeding
    const isDBHealthy = await checkDBHealth();
    if (!isDBHealthy) {
      return next(
        new AppError(
          "Database is currently unavailable. Please try again later.",
          503,
        ),
      );
    }

    // Build public filter with expiration check
    // Allow past events for direct lookup (so we don't return 404 for valid but expired events)
    const filterQuery = isMongoId
      ? { _id: lookupValue, includePast: true }
      : { slug: lookupValue, includePast: true };
    const filter = buildPublicEventFilter(filterQuery);

    // Add timeout to the main query - only show active, published, non-expired events
    const event = await withTimeout(
      Event.findOne(filter)
        .populate("vendorId", "firstName lastName email phone avatar")
        .populate("teacherId", "firstName lastName email bio profileImage") // ✅ Populate teacher details
        .populate("imageAssets", "url thumbnailUrl variations")
        .lean(), // ✅ Read-only query optimization
      config.mongodb.socketTimeoutMS,
      "Event lookup",
    );

    if (!event) {
      // Diagnostic check: check if event exists but was filtered out (e.g. not published, expired)
      // This helps debug issues where valid events are returned as 404
      const filterQuery = isMongoId
        ? { _id: lookupValue }
        : { slug: lookupValue };
      const rawEvent = await Event.findOne(filterQuery).lean(); // ✅ Diagnostic query optimization

      if (rawEvent) {
        const reasons: string[] = [];
        if (!rawEvent.isApproved) reasons.push("not approved");
        if (!rawEvent.isActive) reasons.push("not active");
        if (rawEvent.status !== "published")
          reasons.push(`status is ${rawEvent.status}`);
        if (rawEvent.isDeleted) reasons.push("deleted");

        // Check dates
        const now = new Date();
        const bufferTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const hasValidDate =
          rawEvent.dateSchedule &&
          rawEvent.dateSchedule.some((schedule: any) => {
            const dateToCheck = schedule.endDate || schedule.date;
            return dateToCheck && new Date(dateToCheck) >= bufferTime;
          });

        if (!hasValidDate) reasons.push("expired (no future dates)");

        // Log the finding for backend visibility
        console.warn(
          `Event ${lookupValue} found but filtered out. Reasons: ${reasons.join(", ")}`,
        );

        // Return a more descriptive error for debugging (you might want to revert this for production security)
        return next(
          new AppError(
            `Event found but not visible: ${reasons.join(", ")}`,
            404,
          ),
        );
      }

      return next(new AppError("Event not found", 404));
    }

    // Increment view count with timeout (non-blocking, fire and forget)
    const updateQuery = isMongoId
      ? { _id: lookupValue }
      : { slug: lookupValue };
    withTimeout(
      Event.findOneAndUpdate(updateQuery, { $inc: { viewsCount: 1 } }),
      15000,
      "View count update",
    ).catch((error) => {
      console.warn("Failed to update view count:", error.message);
      // Don't fail the request if view count update fails
    });

    // Sanitize output
    const sanitizedEvent = sanitizeEventOutput(event);

    const responseData = { event: sanitizedEvent };

    // ✅ Cache with tiered TTL strategy (15 minutes for low-churn data)
    await cacheService.set(cacheKey, responseData, {
      ttl: CacheTTL.SINGLE_EVENT,
    });

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: responseData,
      cached: false,
    });
  } catch (error) {
    // Enhanced error handling for specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes("timed out")) {
        return next(
          new AppError(
            "Request timed out. The database is experiencing high load. Please try again.",
            408,
          ),
        );
      }
      if (error.message.includes("buffering timed out")) {
        return next(
          new AppError(
            "Database connection is unstable. Please try again in a moment.",
            503,
          ),
        );
      }
      if (error.message.includes("MongooseError")) {
        return next(
          new AppError("Database error occurred. Please try again later.", 503),
        );
      }
    }
    next(error);
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Vendor only)
export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    // Verify user is a vendor
    const user = await User.findById(userId).lean(); // ✅ Read-only query optimization
    if (!user || user.role !== "vendor") {
      return next(new AppError("Only vendors can create events", 403));
    }

    const eventData = {
      ...req.body,
      vendorId: userId,
      isApproved: false, // Events require admin approval
      isActive: true, // Set as active by default
      status: "pending", // Status starts as pending approval
    };

    // USE SERVICE LAYER (handles media tracking)
    const event = await eventService.createEvent(eventData);

    // Invalidate event caches
    await invalidateEventCaches();

    res.status(201).json({
      success: true,
      message: "Event created successfully. Pending admin approval.",
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Vendor - own events only)
export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const event = await Event.findOne({
      _id: id,
      vendorId: userId,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError("Event not found or unauthorized", 404));
    }

    // If event was previously approved and being modified, require re-approval
    const requiresReapproval =
      event.isApproved &&
      (req.body.title !== event.title ||
        req.body.description !== event.description ||
        req.body.price !== event.price ||
        JSON.stringify(req.body.dateSchedule) !==
          JSON.stringify(event.dateSchedule));

    const updateData = {
      ...req.body,
      ...(requiresReapproval && { isApproved: false }),
    };

    // USE SERVICE LAYER (handles media tracking)
    const updatedEvent = await eventService.updateEvent(id, updateData);

    // Invalidate event caches
    await invalidateEventCaches(id);

    res.status(200).json({
      success: true,
      message: requiresReapproval
        ? "Event updated successfully. Pending admin re-approval due to significant changes."
        : "Event updated successfully",
      data: { event: updatedEvent },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event (soft delete)
// @route   DELETE /api/events/:id
// @access  Private (Vendor - own events only)
export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // Support ?permanent=true for hard delete
    const userId = req.user?._id || req.user?.id;

    const event = await Event.findOne({
      _id: id,
      vendorId: userId,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError("Event not found or unauthorized", 404));
    }

    if (permanent === "true") {
      // Admin emptying the trash - hard delete with media cleanup
      await eventService.hardDeleteEvent(id);
    } else {
      // Standard user action - soft delete (archive)
      await eventService.softDeleteEvent(id);
    }

    // Invalidate event caches
    await invalidateEventCaches(id);

    res.status(200).json({
      success: true,
      message:
        permanent === "true"
          ? "Event permanently deleted"
          : "Event deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor's events
// @route   GET /api/events/vendor/my-events
// @access  Private (Vendor only)
export const getVendorEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      page = 1,
      limit = 12,
      status = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      vendorId: userId,
      isDeleted: false,
    };

    if (status !== "all") {
      switch (status) {
        case "approved":
          filter.isApproved = true;
          break;
        case "pending":
          filter.isApproved = false;
          break;
        case "featured":
          filter.isFeatured = true;
          break;
      }
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("imageAssets", "url thumbnailUrl variations")
        .populate("teacherId", "firstName lastName") // ✅ Populate teacher details for vendor view
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // ✅ Read-only query optimization
      Event.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: "Vendor events retrieved successfully",
      data: {
        events,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEvents: total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event categories
// @route   GET /api/events/categories
// @access  Public
export const getEventCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Use public filter to exclude expired/inactive events
    const filter = buildPublicEventFilter();

    const categories = await Event.distinct("category", filter);

    res.status(200).json({
      success: true,
      message: "Event categories retrieved successfully",
      data: { categories: categories.sort() },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event analytics for vendor
// @route   GET /api/events/vendor/analytics
// @access  Private (Vendor only)
export const getVendorEventAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const analytics = await Event.aggregate([
      {
        $match: {
          vendorId: userId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          approvedEvents: {
            $sum: { $cond: [{ $eq: ["$isApproved", true] }, 1, 0] },
          },
          pendingEvents: {
            $sum: { $cond: [{ $eq: ["$isApproved", false] }, 1, 0] },
          },
          featuredEvents: {
            $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] },
          },
          totalViews: { $sum: "$viewsCount" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    const result = analytics[0] || {
      totalEvents: 0,
      approvedEvents: 0,
      pendingEvents: 0,
      featuredEvents: 0,
      totalViews: 0,
      avgPrice: 0,
    };

    res.status(200).json({
      success: true,
      message: "Vendor analytics retrieved successfully",
      data: { analytics: result },
    });
  } catch (error) {
    next(error);
  }
};

// Admin-only functions

// @desc    Get all events for admin
// @route   GET /api/events/admin/all
// @access  Private (Admin only)
export const getAdminEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = 1,
      limit = 12,
      status = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { isDeleted: false };

    if (status !== "all") {
      switch (status) {
        case "approved":
          filter.isApproved = true;
          break;
        case "pending":
          filter.isApproved = false;
          break;
        case "featured":
          filter.isFeatured = true;
          break;
      }
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("vendorId", "firstName lastName email")
        .populate("teacherId", "firstName lastName email") // ✅ Populate teacher details for admin view
        .populate("imageAssets", "url thumbnailUrl variations")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // ✅ Read-only query optimization
      Event.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Admin events retrieved successfully",
      data: {
        events,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalEvents: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject event
// @route   PUT /api/events/admin/:id/approval
// @access  Private (Admin only)
export const updateEventApproval = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { isApproved, reason } = req.body;

    if (typeof isApproved !== "boolean") {
      return next(new AppError("isApproved must be a boolean value", 400));
    }

    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    event.isApproved = isApproved;
    await event.save();

    // Notify vendor/teacher about approval or rejection
    const ownerId = (event as any).vendorId || (event as any).teacherId;
    if (ownerId) {
      const owner = await User.findById(ownerId)
        .select("email firstName")
        .lean();
      if (owner) {
        const ownerAny = owner as any;
        const statusText = isApproved ? "approved" : "rejected";
        const reasonHtml = reason
          ? `<p><strong>Reason:</strong> ${reason}</p>`
          : "";
        emailService
          .sendEmail({
            to: ownerAny.email,
            subject: `Your event "${event.title}" has been ${statusText}`,
            html: `<p>Hi ${ownerAny.firstName},</p>
<p>Your event <strong>${event.title}</strong> has been <strong>${statusText}</strong> by the admin.</p>
${reasonHtml}
<p>Log in to your dashboard to view the event.</p>`,
          })
          .catch(() => {}); // fire-and-forget
      }
    }

    res.status(200).json({
      success: true,
      message: `Event ${isApproved ? "approved" : "rejected"} successfully`,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle event featured status
// @route   PUT /api/events/admin/:id/featured
// @access  Private (Admin only)
export const toggleEventFeatured = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    event.isFeatured = !event.isFeatured;
    await event.save();

    res.status(200).json({
      success: true,
      message: `Event ${event.isFeatured ? "featured" : "unfeatured"} successfully`,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Claim an unclaimed event
// @route   POST /api/events/:id/claim
// @access  Private (Vendor only)
export const claimEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    if (event.claimStatus === "claimed") {
      return next(new AppError("This event has already been claimed", 400));
    }

    const user = await User.findById(userId);
    if (!user || (user.role !== "vendor" && user.role !== "teacher")) {
      return next(new AppError("Only vendors or teachers can claim events", 403));
    }

    const TEACHING_TYPES = ["Class", "Course", "Workshop", "Bootcamp", "Masterclass"];
    const isTeachingEvent = TEACHING_TYPES.includes(event.type);

    if (isTeachingEvent && user.role !== "teacher") {
      return next(new AppError("Teaching events can only be claimed by teachers", 403));
    }
    if (!isTeachingEvent && user.role !== "vendor") {
      return next(new AppError("This event type can only be claimed by vendors", 403));
    }

    if (user.role === "vendor") {
      const vendor = await Vendor.findOne({ userId }).select("_id").lean();
      if (!vendor) {
        return next(new AppError("Vendor profile not found", 404));
      }
      event.vendorId = vendor._id as any;
      event.claimedBy = vendor._id as any;
    } else {
      // teacher
      const teacher = await Teacher.findOne({ userId }).select("_id").lean();
      if (!teacher) {
        return next(new AppError("Teacher profile not found", 404));
      }
      (event as any).teacherId = teacher._id;
      event.claimedBy = teacher._id as any;
    }

    event.claimStatus = "claimed";
    event.claimedAt = new Date();
    event.isApproved = false;
    event.status = "pending";

    // Transfer media assets to claimer so they appear in their media library
    if (event.imageAssets && event.imageAssets.length > 0) {
      await MediaAsset.updateMany(
        { _id: { $in: event.imageAssets } },
        { $set: { uploadedBy: userId } },
      );
    }

    await event.save();
    await invalidateEventCaches(id);

    res.status(200).json({
      success: true,
      message: "Event claimed successfully. You are now the owner of this event.",
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unique cities from events
// @route   GET /api/events/cities
// @access  Public
export const getUniqueCities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { country } = req.query;

    let cities: string[] = [];

    // If country is provided, check for static cities first
    if (country && typeof country === "string") {
      const countryCode = country.toUpperCase();

      // Import static cities utility
      const { getStaticCities, hasStaticCities } =
        await import("../utils/cities");

      // Use static cities if available (e.g., UAE)
      if (hasStaticCities(countryCode)) {
        const staticCities = getStaticCities(countryCode);

        // Also get cities from events for this country
        const filter: any = {
          isApproved: true,
          isActive: true,
          isDeleted: false,
          "location.country": countryCode,
        };

        const eventCities = await Event.distinct("location.city", filter);

        // Merge static + event cities, remove duplicates
        const mergedCities = [...new Set([...staticCities, ...eventCities])];
        cities = mergedCities;
      } else {
        // No static cities, use event cities only
        const filter: any = {
          isApproved: true,
          isActive: true,
          isDeleted: false,
          "location.country": countryCode,
        };

        cities = await Event.distinct("location.city", filter);
      }
    } else {
      // No country filter, return all cities from events
      const filter: any = {
        isApproved: true,
        isActive: true,
        isDeleted: false,
      };

      cities = await Event.distinct("location.city", filter);
    }

    // Sort alphabetically
    const sortedCities = cities.sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      data: sortedCities,
      count: sortedCities.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote event (vendor or teacher)
// @route   POST /api/events/:id/promote
// @access  Vendor | Teacher
export const promoteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { tier, paymentMethodId } = req.body as {
      tier: PromotionTier;
      paymentMethodId: string;
    };

    const tierConfig = PROMOTION_TIERS[tier];
    if (!tierConfig) {
      return next(new AppError("Invalid promotion tier", 400));
    }

    const event = await Event.findById(id);
    if (!event || event.isDeleted) {
      return next(new AppError("Event not found", 404));
    }

    // Verify ownership
    const userId = req.user?.id || req.user?._id;
    const vendorProfile = await Vendor.findOne({ userId });
    const teacherProfile = await Teacher.findOne({ userId });

    const isVendorOwner =
      vendorProfile && event.vendorId?.toString() === vendorProfile._id.toString();
    const isTeacherOwner =
      teacherProfile && event.teacherId?.toString() === teacherProfile._id.toString();

    if (!isVendorOwner && !isTeacherOwner) {
      return next(new AppError("Not authorized to promote this event", 403));
    }

    if (!event.isApproved) {
      return next(new AppError("Event must be approved before promotion", 400));
    }

    // Charge platform Stripe account
    const amountInFilsAED = tierConfig.priceAED * 100;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInFilsAED,
      currency: "aed",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/vendor/events`,
      metadata: { eventId: event._id.toString(), promotionTier: tier },
    });

    if (paymentIntent.status !== "succeeded") {
      return next(new AppError("Payment failed — promotion not applied", 402));
    }

    // Apply promotion
    const now = new Date();
    const featuredUntil = new Date(
      now.getTime() + tierConfig.days * 24 * 60 * 60 * 1000,
    );

    (event as any).promotionTier = tier;
    (event as any).featuredUntil = featuredUntil;
    (event as any).promotionPaidAt = now;
    event.isFeatured = true;
    await event.save();

    await invalidateEventCaches(event._id.toString());

    res.status(200).json({
      success: true,
      message: `Event promoted as ${tierConfig.label} until ${featuredUntil.toLocaleDateString()}`,
      data: {
        promotionTier: tier,
        featuredUntil,
        priceCharged: tierConfig.priceAED,
        currency: "AED",
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    next(error);
  }
};
