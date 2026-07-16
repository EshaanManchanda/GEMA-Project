import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { Event, User, Order, AnalyticsEvent } from "../models/index";
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
import { escapeRegex } from "../utils/regexHelpers";
import { parseEventQuery } from "../utils/aiEventQueryParser";
import { escapeHtml } from "../utils/htmlHelpers";
import { eventService } from "../services/event.service";
import { CacheTTL } from "../config/cache-tiers"; // ✅ Phase 2.3: Tiered cache strategy
import { emailService } from "../services/email.service";
import { stripe } from "../config/stripe";
import {
  PROMOTION_TIERS,
  PromotionTier,
} from "../config/promotionPricing";
import logger from "../config/logger";

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

  const eventIds = events
    .map((event) => event?._id)
    .filter(Boolean);

  if (!eventIds.length) return;

  const soldAgg = await Order.aggregate([
    {
      $match: {
        "items.eventId": { $in: eventIds },
        status: "confirmed",
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.eventId": { $in: eventIds },
      },
    },
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
      logger.info("✅ Cache HIT for events listing");
      return res.status(200).json({
        success: true,
        message: "Events retrieved successfully",
        data: cached,
        cached: true,
      });
    }

    logger.info("❌ Cache MISS for events listing");

    // Build additional filters based on query params
    const additionalFilters: any = {};

    // Case-insensitive category matching (events store category as slugs)
    if (category) {
      additionalFilters.category = new RegExp(
        `^${escapeRegex(category as string)}$`,
        "i",
      );
    }
    // String() coercion on these prevents NoSQL operator injection (e.g. ?type[$ne]=x)
    if (type) additionalFilters.type = String(type);
    if (venueType) additionalFilters.venueType = String(venueType);
    if (city)
      additionalFilters["location.city"] = new RegExp(escapeRegex(city as string), "i");
    if (currency) additionalFilters.currency = String(currency);
    if (featured !== undefined) {
      additionalFilters.isFeatured = featured === "true";
    }
    if (teacherId) additionalFilters.teacherId = String(teacherId);
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

    // Age range filtering (overlap check: eventMin <= userMax and eventMax >= userMin)
    if (ageMin || ageMax) {
      if (ageMin) {
        filter["ageRange.1"] = { $gte: parseInt(ageMin as string) };
      }
      if (ageMax) {
        filter["ageRange.0"] = { $lte: parseInt(ageMax as string) };
      }
    }

    // Text search — escape input to prevent malformed-regex errors on chars like ( * [
    if (search) {
      const searchRegex = new RegExp(escapeRegex((search as string).trim()), "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
        { "location.city": searchRegex },
        { "location.address": searchRegex },
      ];
    }

    // Date range filtering (ensure both conditions apply to the same schedule slot using $elemMatch)
    if (dateFrom || dateTo) {
      const dateConditions: any = {};
      if (dateFrom) {
        dateConditions.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        dateConditions.$lte = new Date(dateTo as string);
      }
      filter.dateSchedule = { $elemMatch: { startDate: dateConditions } };
    }

    // Build sort query — honor the requested sort as the primary key.
    // Promoted (featuredUntil) and createdAt are secondary tiebreakers only.
    // Previously featuredUntil was pinned first unconditionally, making user-chosen
    // sorts (price, viewsCount, etc.) act as tiebreakers instead of the primary order.
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    if (sortBy !== "featuredUntil") sort.featuredUntil = -1; // active promotions break ties
    if (sortBy !== "createdAt") sort.createdAt = -1;          // deterministic final tiebreaker

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("vendorId", "firstName lastName businessName email logo bio")
        .populate({
          path: "teacherId",
          select: "fullName bio specialization profileImage coverImage userId",
          populate: { path: "userId", select: "firstName lastName email avatar" }
        }) // ✅ Populate teacher details and user data
        .populate("imageAssets", "url thumbnailUrl variations")
        .select("-dateSchedule.price")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // ✅ Read-only query optimization
      Event.countDocuments(filter),
    ]);

    await applyOrderSeatStatsToEvents(events as any[]);

    logger.info("Query results:");
    logger.info("- Total events matching filter:", total);
    logger.info("- Events returned:", events.length);
    logger.info(
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
      logger.info(`✅ Cache HIT for event ${lookupValue} (${lookupField})`);
      // Still increment view count (async, non-blocking)
      const updateQuery = isMongoId
        ? { _id: lookupValue }
        : { slug: lookupValue };
      withTimeout(
        Event.findOneAndUpdate(updateQuery, { $inc: { viewsCount: 1 } }),
        15000,
        "View count update",
      ).catch((error) => {
        logger.warn("Failed to update view count:", error.message);
      });

      return res.status(200).json({
        success: true,
        message: "Event retrieved successfully",
        data: cached,
        cached: true,
      });
    }

    logger.info(`❌ Cache MISS for event ${lookupValue} (${lookupField})`);

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
        .populate("vendorId", "firstName lastName businessName email phone avatar logo bio")
        .populate({
          path: "teacherId",
          select: "fullName bio specialization profileImage coverImage userId",
          populate: { path: "userId", select: "firstName lastName email avatar" }
        }) // ✅ Populate teacher and nested user details
        .populate("imageAssets", "url thumbnailUrl variations")
        .lean(), // ✅ Read-only query optimization
      config.mongodb.socketTimeoutMS,
      "Event lookup",
    );

    if (event) {
      await applyOrderSeatStatsToEvents([event] as any[]);
    }

    if (!event) {
      // Diagnostic check: check if event exists but was filtered out (e.g. not published, expired)
      // This helps debug issues where valid events are returned as 404
      const filterQuery = isMongoId
        ? { _id: lookupValue }
        : { slug: lookupValue };
      const rawEvent = await Event.findOne(filterQuery).lean(); // ✅ Diagnostic query optimization

      if (rawEvent) {
        // Self-heal legacy records: approved+published events can get stuck inactive
        // after older approval flows. Auto-reactivate and retry once.
        if (
          rawEvent.isApproved &&
          rawEvent.status === "published" &&
          !rawEvent.isDeleted &&
          rawEvent.isActive === false
        ) {
          await Event.updateOne(
            { _id: rawEvent._id },
            { $set: { isActive: true } },
          );

          const recoveredEvent = await Event.findOne(filter)
            .populate("vendorId", "firstName lastName businessName email phone avatar logo bio")
            .populate({
              path: "teacherId",
              select: "fullName bio specialization profileImage coverImage userId",
              populate: { path: "userId", select: "firstName lastName email avatar" }
            })
            .populate("imageAssets", "url thumbnailUrl variations")
            .lean();

          if (recoveredEvent) {
            const sanitizedEvent = sanitizeEventOutput(recoveredEvent);
            const responseData = { event: sanitizedEvent };

            await cacheService.set(cacheKey, responseData, {
              ttl: CacheTTL.SINGLE_EVENT,
            });

            return res.status(200).json({
              success: true,
              message: "Event retrieved successfully",
              data: responseData,
              cached: false,
            });
          }
        }

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
        logger.warn(
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
      logger.warn("Failed to update view count:", error.message);
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
        .populate("vendorId", "firstName lastName businessName email logo bio")
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
        const safeTitle = escapeHtml(String(event.title || ""));
        const reasonHtml = reason
          ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
          : "";
        emailService
          .sendEmail({
            to: ownerAny.email,
            subject: `Your event "${safeTitle}" has been ${statusText}`,
            html: `<p>Hi ${ownerAny.firstName},</p>
<p>Your event <strong>${safeTitle}</strong> has been <strong>${statusText}</strong> by the admin.</p>
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

    event.promotionTier = tier;
    event.featuredUntil = featuredUntil;
    event.promotionPaidAt = now;
    event.promotionSource = "paid";
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

// ─────────────────────────────────────────────────────────────────────
// Certificate Types Management
// ─────────────────────────────────────────────────────────────────────

export const getEventsForCertificates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const events = await Event.find({ isApproved: true, isDeleted: false })
      .select("_id title slug certificateTypes")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.status(200).json({ success: true, data: { events } });
  } catch (error) {
    next(error);
  }
};

export const listCertificateTypes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).select("certificateTypes vendorId teacherId");
    if (!event) return next(new AppError("Event not found", 404));
    res.status(200).json({ success: true, data: event.certificateTypes || [] });
  } catch (error) {
    next(error);
  }
};

export const addCertificateType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { name, slug, templateId, description, criteria, isDefault, sortOrder } = req.body;

    const event = await Event.findById(id);
    if (!event) return next(new AppError("Event not found", 404));

    const certTypes = event.certificateTypes || [];
    if (certTypes.find((ct) => ct.slug === slug)) {
      return next(new AppError("Certificate type with this slug already exists", 400));
    }

    if (isDefault) certTypes.forEach((ct) => (ct.isDefault = false));

    certTypes.push({
      name,
      slug: slug.toLowerCase(),
      templateId: templateId || undefined,
      description: description || "",
      criteria: criteria || "",
      isDefault: isDefault || false,
      sortOrder: sortOrder ?? certTypes.length,
    });

    event.certificateTypes = certTypes;
    await event.save();

    res.status(201).json({ success: true, data: certTypes });
  } catch (error) {
    next(error);
  }
};

export const updateCertificateType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, typeSlug } = req.params;
    const { name, templateId, description, criteria, isDefault, sortOrder } = req.body;

    const event = await Event.findById(id);
    if (!event) return next(new AppError("Event not found", 404));

    const certTypes = event.certificateTypes || [];
    const idx = certTypes.findIndex((ct) => ct.slug === typeSlug);
    if (idx === -1) return next(new AppError("Certificate type not found", 404));

    if (name) certTypes[idx].name = name;
    if (templateId !== undefined) certTypes[idx].templateId = templateId;
    if (description !== undefined) certTypes[idx].description = description;
    if (criteria !== undefined) certTypes[idx].criteria = criteria;
    if (sortOrder !== undefined) certTypes[idx].sortOrder = sortOrder;
    if (isDefault === true) certTypes.forEach((ct, i) => { ct.isDefault = i === idx; });

    event.certificateTypes = certTypes;
    await event.save();

    res.status(200).json({ success: true, data: certTypes });
  } catch (error) {
    next(error);
  }
};

export const deleteCertificateType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, typeSlug } = req.params;

    const event = await Event.findById(id);
    if (!event) return next(new AppError("Event not found", 404));

    const certTypes = event.certificateTypes || [];
    const idx = certTypes.findIndex((ct) => ct.slug === typeSlug);
    if (idx === -1) return next(new AppError("Certificate type not found", 404));

    const wasDefault = certTypes[idx].isDefault;
    certTypes.splice(idx, 1);
    if (wasDefault && certTypes.length > 0) certTypes[0].isDefault = true;

    event.certificateTypes = certTypes;
    await event.save();

    res.status(200).json({ success: true, data: certTypes });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Discovery: Similar Events (weighted scoring + fallback chain)
// ---------------------------------------------------------------------------
const SIMILAR_SELECT =
  "_id slug title images imageAssets category location venueType meetingLink price tags isFeatured viewsCount averageRating reviewCount currency dateSchedule ageRange vendorId teacherId";

export const getSimilarEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 12);

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const source = (await Event.findOne(
      isMongoId ? { _id: id } : { slug: id },
    ).lean()) as any;

    if (!source) return next(new AppError("Event not found", 404));

    const sourceId = source._id;
    const sourceCity: string | undefined = source.location?.city;
    const sourcePrice: number = source.price || 0;
    const sourceTags: string[] = Array.isArray(source.tags) ? source.tags : [];

    // Candidate pool: same-category published events, most-viewed first, cap 50
    const baseFilter = buildPublicEventFilter({ _id: { $ne: sourceId } });
    const candidates = (await Event.find({
      ...baseFilter,
      ...(source.category ? { category: source.category } : {}),
    })
      .select(SIMILAR_SELECT)
      .populate("imageAssets", "url thumbnailUrl variations")
      .sort({ viewsCount: -1 })
      .limit(50)
      .lean()) as any[];

    // Score each candidate
    const scored = candidates.map((ev) => {
      let score = 0;

      if (ev.category === source.category) score += 5;
      if (sourceCity && ev.location?.city === sourceCity) score += 3;

      // Age range overlap
      if (source.ageRange && ev.ageRange) {
        const [srcMin, srcMax] = source.ageRange as [number, number];
        const [evMin, evMax] = ev.ageRange as [number, number];
        if (srcMin <= evMax && evMin <= srcMax) score += 3;
      }

      // Same organizer
      const sameVendor =
        source.vendorId &&
        ev.vendorId &&
        ev.vendorId.toString() === source.vendorId.toString();
      const sameTeacher =
        source.teacherId &&
        ev.teacherId &&
        ev.teacherId.toString() === source.teacherId.toString();
      if (sameVendor || sameTeacher) score += 2;

      // Similar price ±25%
      if (sourcePrice > 0 && ev.price > 0) {
        const ratio = ev.price / sourcePrice;
        if (ratio >= 0.75 && ratio <= 1.25) score += 2;
      }

      // Tag overlap (≥1 shared tag)
      if (sourceTags.length > 0 && Array.isArray(ev.tags)) {
        if (sourceTags.some((t: string) => (ev.tags as string[]).includes(t)))
          score += 2;
      }

      if (ev.isFeatured) score += 1;

      return { ev, score };
    });

    scored.sort(
      (a, b) =>
        b.score - a.score ||
        (b.ev.viewsCount || 0) - (a.ev.viewsCount || 0),
    );

    let results: any[] = scored.filter((s) => s.score > 0).map((s) => s.ev);

    // Fallback 1: remainder of same-category candidates (score = 0 but same cat)
    if (results.length < limit) {
      const seen = new Set(results.map((e) => e._id.toString()));
      results = [
        ...results,
        ...candidates.filter((e) => !seen.has(e._id.toString())),
      ];
    }

    // Fallback 2: trending events (cross-category)
    if (results.length < limit) {
      const seen = new Set(results.map((e) => e._id.toString()));
      const trending = (await Event.find({
        ...buildPublicEventFilter(),
        _id: { $nin: [...seen, sourceId] },
      })
        .select(SIMILAR_SELECT)
        .populate("imageAssets", "url thumbnailUrl variations")
        .sort({ viewsCount: -1 })
        .limit(limit - results.length)
        .lean()) as any[];
      results = [...results, ...trending];
    }

    // Fallback 3: featured events
    if (results.length < limit) {
      const seen = new Set(results.map((e) => e._id.toString()));
      const featuredFallback = (await Event.find({
        ...buildPublicEventFilter(),
        isFeatured: true,
        _id: { $nin: [...seen, sourceId] },
      })
        .select(SIMILAR_SELECT)
        .populate("imageAssets", "url thumbnailUrl variations")
        .limit(limit - results.length)
        .lean()) as any[];
      results = [...results, ...featuredFallback];
    }

    res.status(200).json({
      success: true,
      data: sanitizeEventsOutput(results.slice(0, limit)),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Discovery: People Also Booked (co-occurrence in confirmed orders)
// ---------------------------------------------------------------------------
export const getPeopleAlsoBooked = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 12);

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const source = (await Event.findOne(
      isMongoId ? { _id: id } : { slug: id },
    )
      .select("_id")
      .lean()) as any;

    if (!source) return next(new AppError("Event not found", 404));

    const sourceId = source._id;

    // Customers with a confirmed order for this event
    const buyers = await Order.distinct("userId", {
      "items.eventId": sourceId,
      status: "confirmed",
    });

    let coBookedIds: any[] = [];
    if (buyers.length > 0) {
      // Other events those same customers have confirmed orders for,
      // ranked by how many distinct buyers co-booked each one.
      const coBooked = await Order.aggregate([
        {
          $match: {
            userId: { $in: buyers },
            status: "confirmed",
          },
        },
        { $unwind: "$items" },
        { $match: { "items.eventId": { $ne: sourceId } } },
        {
          $group: {
            _id: "$items.eventId",
            buyerCount: { $addToSet: "$userId" },
          },
        },
        { $project: { buyerCount: { $size: "$buyerCount" } } },
        { $sort: { buyerCount: -1 } },
        { $limit: limit * 2 }, // over-fetch — some ids may not pass buildPublicEventFilter
      ]);
      coBookedIds = coBooked.map((c) => c._id);
    }

    let results: any[] = [];
    if (coBookedIds.length > 0) {
      const events = (await Event.find({
        ...buildPublicEventFilter(),
        _id: { $in: coBookedIds },
      })
        .select(SIMILAR_SELECT)
        .populate("imageAssets", "url thumbnailUrl variations")
        .lean()) as any[];

      // Preserve co-booking rank (Mongo doesn't guarantee $in order)
      const rank = new Map(coBookedIds.map((id, i) => [id.toString(), i]));
      results = events.sort(
        (a, b) =>
          (rank.get(a._id.toString()) ?? 999) -
          (rank.get(b._id.toString()) ?? 999),
      );
    }

    // Fallback: trending, excluding source + whatever co-booking already found
    if (results.length < limit) {
      const seen = new Set(results.map((e) => e._id.toString()));
      seen.add(sourceId.toString());
      const remaining = limit - results.length;
      const trending = (await Event.find({
        ...buildPublicEventFilter(),
        _id: { $nin: [...seen] },
      })
        .select(SIMILAR_SELECT)
        .populate("imageAssets", "url thumbnailUrl variations")
        .sort({ viewsCount: -1 })
        .limit(remaining)
        .lean()) as any[];
      results = [...results, ...trending];
    }

    res.status(200).json({
      success: true,
      data: sanitizeEventsOutput(results.slice(0, limit)),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Discovery: More from this organizer
// ---------------------------------------------------------------------------
export const getOrganizerEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 4, 8);

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const source = (await Event.findOne(
      isMongoId ? { _id: id } : { slug: id },
    ).lean()) as any;

    if (!source) return next(new AppError("Event not found", 404));

    const { vendorId, teacherId } = source;
    if (!vendorId && !teacherId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const organizerFilter: any = vendorId ? { vendorId } : { teacherId };

    const events = (await Event.find({
      ...buildPublicEventFilter(),
      ...organizerFilter,
      _id: { $ne: source._id },
    })
      .select(SIMILAR_SELECT)
      .populate("imageAssets", "url thumbnailUrl variations")
      .sort({ viewsCount: -1 })
      .limit(limit)
      .lean()) as any[];

    res.status(200).json({
      success: true,
      data: sanitizeEventsOutput(events),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Discovery: Trending Near You (city-scoped, falls back to global trending)
// ---------------------------------------------------------------------------
export const getTrendingNearYou = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const city = (req.query.city as string || "").trim();
    const excludeId = req.query.excludeId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 12);

    const excludeFilter =
      excludeId && /^[0-9a-fA-F]{24}$/.test(excludeId)
        ? { _id: { $ne: excludeId } }
        : {};

    let results: any[] = [];

    if (city) {
      results = (await Event.find({
        ...buildPublicEventFilter(excludeFilter),
        "location.city": new RegExp(`^${escapeRegex(city)}$`, "i"),
      })
        .select(SIMILAR_SELECT)
        .populate("imageAssets", "url thumbnailUrl variations")
        .sort({ viewsCount: -1 })
        .limit(limit)
        .lean()) as any[];
    }

    // Fallback: global trending, excluding whatever the city query already found
    // (plus the source event, if any — folded into the same $nin as `seen`).
    if (results.length < limit) {
      const seen = new Set(results.map((e) => e._id.toString()));
      if (excludeId && /^[0-9a-fA-F]{24}$/.test(excludeId)) seen.add(excludeId);
      const remaining = limit - results.length;
      const globalTrending = (await Event.find({
        ...buildPublicEventFilter(),
        _id: { $nin: [...seen] },
      })
        .select(SIMILAR_SELECT)
        .populate("imageAssets", "url thumbnailUrl variations")
        .sort({ viewsCount: -1 })
        .limit(remaining)
        .lean()) as any[];
      results = [...results, ...globalTrending];
    }

    res.status(200).json({
      success: true,
      data: sanitizeEventsOutput(results.slice(0, limit)),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Discovery: Recommended For You (scored from view history, favorites, orders)
// ---------------------------------------------------------------------------
export const getRecommendedForYou = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return next(new AppError("Authentication required", 401));

    const limit = Math.min(parseInt(req.query.limit as string) || 8, 12);

    // Signal sources: recently viewed events, favorites, and confirmed-order
    // events. No signal at all means we can't personalize — return empty
    // rather than silently falling back to global trending (that would just
    // duplicate the separate Trending Near You section).
    const [recentViews, favoriteUser, orderedEventIds] = await Promise.all([
      AnalyticsEvent.find({ type: "eventViewed", userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .select("eventId")
        .lean(),
      User.findById(userId).select("favoriteEvents").lean(),
      Order.distinct("items.eventId", { userId, status: "confirmed" }),
    ]);

    const sourceIdSet = new Set<string>([
      ...recentViews.map((v: any) => v.eventId?.toString()).filter(Boolean),
      ...((favoriteUser as any)?.favoriteEvents || []).map((id: any) =>
        id.toString(),
      ),
      ...orderedEventIds.map((id: any) => id.toString()),
    ]);

    if (sourceIdSet.size === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const sourceEvents = (await Event.find({
      _id: { $in: [...sourceIdSet] },
    })
      .select("category location tags")
      .lean()) as any[];

    // Mode (most frequent) category and city across the user's signal — the
    // same two strongest weights Similar Events uses, applied at user scope
    // instead of single-event scope.
    const categoryCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const tagSet = new Set<string>();
    for (const ev of sourceEvents) {
      if (ev.category)
        categoryCounts.set(
          ev.category,
          (categoryCounts.get(ev.category) || 0) + 1,
        );
      const city = ev.location?.city;
      if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
      (ev.tags || []).forEach((t: string) => tagSet.add(t));
    }
    const topCategory = [...categoryCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const topCity = [...cityCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    const candidates = (await Event.find({
      ...buildPublicEventFilter({ _id: { $nin: [...sourceIdSet] } }),
    })
      .select(SIMILAR_SELECT)
      .populate("imageAssets", "url thumbnailUrl variations")
      .sort({ viewsCount: -1 })
      .limit(100)
      .lean()) as any[];

    const scored = candidates.map((ev) => {
      let score = 0;
      if (topCategory && ev.category === topCategory) score += 5;
      if (topCity && ev.location?.city === topCity) score += 3;
      if (Array.isArray(ev.tags) && ev.tags.some((t: string) => tagSet.has(t)))
        score += 2;
      if (ev.isFeatured) score += 1;
      return { ev, score };
    });

    scored.sort(
      (a, b) =>
        b.score - a.score || (b.ev.viewsCount || 0) - (a.ev.viewsCount || 0),
    );

    let results = scored.filter((s) => s.score > 0).map((s) => s.ev);

    // Fallback: fill remaining slots with trending among the same candidate
    // pool (already excludes the user's own signal events).
    if (results.length < limit) {
      const seen = new Set(results.map((e) => e._id.toString()));
      const remaining = candidates.filter((e) => !seen.has(e._id.toString()));
      results = [...results, ...remaining];
    }

    res.status(200).json({
      success: true,
      data: sanitizeEventsOutput(results.slice(0, limit)),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Discovery: AI Event Finder — natural language -> search filters.
// Rule-based (no LLM): returns the parsed filters only, so the frontend can
// apply them via the existing /events search flow rather than duplicating
// its filter-building logic here.
// ---------------------------------------------------------------------------
export const parseAiEventSearch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = (req.body?.query as string || "").trim();
    if (!query) {
      return next(new AppError("query is required", 400));
    }
    if (query.length > 300) {
      return next(new AppError("query is too long", 400));
    }

    const vocabulary = await cacheService.getOrSet(
      "ai-search:vocabulary",
      async () => {
        const [categories, cities] = await Promise.all([
          Event.distinct("category", { status: "published", isDeleted: false }),
          Event.distinct("location.city", { status: "published", isDeleted: false }),
        ]);
        return {
          categories: (categories as string[]).filter(Boolean),
          cities: (cities as string[]).filter(Boolean),
        };
      },
      { ttl: CacheTTL.CATEGORIES },
    );

    const filters = parseEventQuery(
      query,
      vocabulary || { categories: [], cities: [] },
    );

    res.status(200).json({ success: true, data: { filters } });
  } catch (error) {
    next(error);
  }
};
