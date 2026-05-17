import { Request, Response, NextFunction } from "express";
import { Event,  IEvent } from "../models/index";
import Vendor from "../models/Vendor";
import Teacher from "../models/Teacher";
import { AppError } from "../middleware/index";
import { ApiResponse, AuthRequest } from "../types/index";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import { transformEventResponse } from "../utils/event.utils";
import logger from "../config/logger";

/**
 * Interface for event query parameters
 */
interface EventQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  isApproved?: string;
  isFeatured?: string;
  vendorId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Interface for event update request
 */
interface UpdateEventRequest {
  title?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  type?: "Event" | "Course" | "Venue";
  eventType?: "Online" | "Offline";
  venueType?: "Online" | "Offline";
  ageRange?: [number, number];
  location?: {
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price?: number;
  currency?: string;
  isApproved?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  dateSchedule?: Array<{
    date?: Date; // Legacy format
    startDate?: Date; // New format
    endDate?: Date; // New format
    availableSeats: number;
    price: number;
    unlimitedSeats?: boolean;
  }>;
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  vendorId?: string;
  teacherId?: string;
  googlePlaceId?: string;
  customCSS?: string;
  meetingLink?: string;
  registrationConfig?: any;
  subject?: string;
  topic?: string;
  introVideo?: string;
  syllabus?: Array<{
    title: string;
    description: string;
    duration?: string;
    lessons?: Array<{ title: string; duration?: string }>;
  }>;
  pastEventMemories?: Array<{
    url: string;
    caption?: string;
    participantName?: string;
  }>;
  imageAssets?: string[];
  bookingAttachments?: Array<{
    originalName: string;
    filename: string;
    url: string;
    size: number;
    mimetype: string;
    provider: "local" | "cloudinary";
    publicId?: string;
    cloudinaryUrl?: string;
    uploadedAt?: Date;
  }>;
}

interface CreateEventRequest {
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type: "Event" | "Course" | "Venue";
  eventType?: "Online" | "Offline";
  venueType?: "Online" | "Offline";
  ageRange: [number, number];
  location: {
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  currency: string;
  vendorId?: string;
  teacherId?: string;
  isApproved?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  dateSchedule: Array<{
    date?: Date; // Legacy format
    startDate?: Date; // New format
    endDate?: Date; // New format
    availableSeats: number;
    price: number;
    unlimitedSeats?: boolean;
  }>;
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  images?: string[];
  imageAssets?: string[];
  customCSS?: string;
  meetingLink?: string;
  googlePlaceId?: string;
  registrationConfig?: any;
  subject?: string;
  topic?: string;
  introVideo?: string;
  syllabus?: Array<{
    title: string;
    description: string;
    duration?: string;
    lessons?: Array<{ title: string; duration?: string }>;
  }>;
  pastEventMemories?: Array<{
    url: string;
    caption?: string;
    participantName?: string;
  }>;
  bookingAttachments?: Array<{
    originalName: string;
    filename: string;
    url: string;
    size: number;
    mimetype: string;
    provider: "local" | "cloudinary";
    publicId?: string;
    cloudinaryUrl?: string;
    uploadedAt?: Date;
  }>;
}

/**
 * Format event for admin response (includes all information)
 */
const formatAdminEventResponse = (event: any) => {
  // Apply transformation to extract image URLs from MediaAssets
  const transformedEvent = transformEventResponse(event);

  return {
    id: transformedEvent._id?.toString() || transformedEvent.id,
    title: transformedEvent.title,
    description: transformedEvent.description,
    shortDescription: transformedEvent.shortDescription || "",
    category: transformedEvent.category,
    type: transformedEvent.type,
    eventType: transformedEvent.eventType,
    // Keep legacy alias in response for older clients.
    venueType: transformedEvent.eventType,
    ageRange: transformedEvent.ageRange,
    location: transformedEvent.location,
    vendor: transformedEvent.vendorId
      ? {
          id:
            transformedEvent.vendorId._id?.toString() ||
            transformedEvent.vendorId.id,
          businessName: transformedEvent.vendorId.businessName,
          email: transformedEvent.vendorId.email,
          fullName: transformedEvent.vendorId.businessName,
        }
      : null,
    vendorId:
      transformedEvent.vendorId?._id?.toString() ||
      transformedEvent.vendorId?.id ||
      transformedEvent.vendorId?.toString?.() ||
      null,
    teacher: transformedEvent.teacherId
      ? {
          id:
            transformedEvent.teacherId._id?.toString() ||
            transformedEvent.teacherId.id,
          firstName: transformedEvent.teacherId.firstName,
          lastName: transformedEvent.teacherId.lastName,
          email: transformedEvent.teacherId.email,
          fullName:
            transformedEvent.teacherId.fullName ||
            [transformedEvent.teacherId.firstName, transformedEvent.teacherId.lastName]
              .filter(Boolean)
              .join(" ")
              .trim(),
        }
      : null,
    teacherId:
      transformedEvent.teacherId?._id?.toString() ||
      transformedEvent.teacherId?.id ||
      transformedEvent.teacherId?.toString?.() ||
      null,
    price: transformedEvent.price,
    currency: transformedEvent.currency,
    isApproved: transformedEvent.isApproved,
    isFeatured: transformedEvent.isFeatured,
    affiliateCode: transformedEvent.affiliateCode,
    tags: transformedEvent.tags,
    dateSchedule: transformedEvent.dateSchedule,
    seoMeta: transformedEvent.seoMeta,
    faqs: transformedEvent.faqs,
    viewsCount: transformedEvent.viewsCount,
    images: transformedEvent.images || [],
    imageAssets: transformedEvent.imageAssets || [],
    isDeleted: transformedEvent.isDeleted,
    createdAt:
      typeof transformedEvent.createdAt === "string"
        ? transformedEvent.createdAt
        : transformedEvent.createdAt?.toISOString(),
    updatedAt:
      typeof transformedEvent.updatedAt === "string"
        ? transformedEvent.updatedAt
        : transformedEvent.updatedAt?.toISOString(),

    // Admin-specific fields
    isActive:
      transformedEvent.isActive !== undefined
        ? transformedEvent.isActive
        : true,
    requirePhoneVerification:
      transformedEvent.requirePhoneVerification || false,
    status: transformedEvent.status || "pending",
    isAffiliateEvent: transformedEvent.isAffiliateEvent || false,
    externalBookingLink: transformedEvent.externalBookingLink || "",
    claimStatus:
      transformedEvent.claimStatus ||
      (transformedEvent.isAffiliateEvent ? "unclaimed" : "not_claimable"),

    // Pricing flags
    isFreeEvent: transformedEvent.isFreeEvent === true,

    // Additional fields
    customCSS: transformedEvent.customCSS || null,
    meetingLink: transformedEvent.meetingLink || null,
    reviewCount: transformedEvent.reviewCount || 0,
    averageRating: transformedEvent.averageRating || 0,
    ratingDistribution: transformedEvent.ratingDistribution || {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
    registrationConfig: transformedEvent.registrationConfig || null,
    combinedRating: transformedEvent.combinedRating || 0,
    combinedReviewCount: transformedEvent.combinedReviewCount || 0,
    googleRating: transformedEvent.googleRating || 0,
    googleReviewCount: transformedEvent.googleReviewCount || 0,

    // Educational content fields (Ensure these stay in the response)
    subject: transformedEvent.subject || "",
    topic: transformedEvent.topic || "",
    introVideo: transformedEvent.introVideo || "",
    syllabus: transformedEvent.syllabus || [],
    pastEventMemories: transformedEvent.pastEventMemories || [],
    bookingAttachments: transformedEvent.bookingAttachments || [],
  };
};

/**
 * Get all events with pagination and filtering (Admin view - includes all events)
 */
export const getAllEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      category,
      type,
      status,
      isApproved,
      isFeatured,
      vendorId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as EventQueryParams;

    // Build query - Admin can see all events including deleted ones based on status filter
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by type (supports single value or comma-separated list, e.g. type=Class,Course,Workshop)
    if (type) {
      const types = type
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      query.type = types.length > 1 ? { $in: types } : types[0];
    }

    // Filter by approval status
    if (isApproved !== undefined) {
      query.isApproved = isApproved === "true";
    }

    // Filter by featured status
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === "true";
    }

    // Filter by vendor
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      query.vendorId = vendorId;
    }

    // Filter by status (active/deleted)
    if (status === "deleted") {
      query.isDeleted = true;
    } else if (status === "active") {
      query.isDeleted = false;
    }
    // If status is 'all' or undefined, show both

    // Pagination - cap limit to prevent performance issues
    const pageNum = parseInt(page);
    let limitNum = parseInt(limit);
    limitNum = Math.min(limitNum, 50); // Cap at 50 max
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    //Execute query
    const [events, totalEvents] = await Promise.all([
      Event.find(query)
        .populate("vendorId", "businessName email phone")
        .populate("teacherId", "fullName firstName lastName email")
        .populate("imageAssets", "url thumbnailUrl variations provider")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Event.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalEvents / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response
    const formattedEvents = events.map((event) =>
      formatAdminEventResponse(event as unknown as IEvent),
    );

    const response: ApiResponse = {
      success: true,
      message: "Events retrieved successfully",
      data: {
        events: formattedEvents,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEvents,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
        filters: {
          search,
          category,
          type,
          status,
          isApproved,
          isFeatured,
          vendorId,
          sortBy,
          sortOrder,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get event by ID (Admin view - includes all details)
 */
export const getEventById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    const event = await Event.findById(id)
      .populate("vendorId", "businessName email phone")
      .populate("teacherId", "fullName firstName lastName email")
      .populate("imageAssets", "url thumbnailUrl variations provider");

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Event retrieved successfully",
      data: {
        event: formatAdminEventResponse(event),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new event (Admin can assign to any vendor)
 */
export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const eventData = req.body as CreateEventRequest;
    const normalizedEventType =
      eventData.eventType || eventData.venueType || "Offline";

    // Validate required ownership fields
    if (!eventData.vendorId && !eventData.teacherId) {
      return next(new AppError("Either vendorId or teacherId is required", 400));
    }

    // Validate vendor if provided
    if (eventData.vendorId) {
      if (!mongoose.Types.ObjectId.isValid(eventData.vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      const vendor = await Vendor.findOne({
        _id: eventData.vendorId,
        isActive: true,
        isSuspended: false,
      });

      if (!vendor) {
        return next(new AppError("Vendor not found or inactive", 404));
      }
    }

    // Validate teacher if provided
    if (eventData.teacherId) {
      if (!mongoose.Types.ObjectId.isValid(eventData.teacherId)) {
        return next(new AppError("Invalid teacher ID", 400));
      }

      const teacher = await Teacher.findOne({
        _id: eventData.teacherId,
        isDeleted: false,
      });

      if (!teacher) {
        return next(new AppError("Teacher not found", 404));
      }
    }

    // Validate dateSchedule dates are in the future
    if (eventData.dateSchedule && eventData.dateSchedule.length > 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      for (const schedule of eventData.dateSchedule) {
        // Support both legacy 'date' and new 'startDate' formats
        const dateToCheck = schedule.startDate || schedule.date;
        if (new Date(dateToCheck) < now) {
          return next(
            new AppError("Schedule dates cannot be in the past", 400),
          );
        }
      }
    }

    // Create event - Admin created events can be auto-approved
    const newEvent = await Event.create({
      ...eventData,
      eventType: undefined,
      venueType: normalizedEventType,
      isApproved:
        eventData.isApproved !== undefined ? eventData.isApproved : true,
      isFeatured: eventData.isFeatured || false,
      isDeleted: false,
    });

    // Populate vendor information
    const populatedEvent = await Event.findById(newEvent._id)
      .populate("vendorId", "businessName email phone")
      .populate("teacherId", "fullName firstName lastName email");

    const response: ApiResponse = {
      success: true,
      message: "Event created successfully",
      data: {
        event: formatAdminEventResponse(populatedEvent),
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Change event vendor
 */
export const changeEventVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    // Validate ObjectId for event
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // Validate vendorId is provided and valid
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new AppError("Valid vendor ID is required", 400));
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    // Validate vendor exists and is active
    const vendor = await Vendor.findOne({
      _id: vendorId,
      isActive: true,
      isSuspended: false,
    });

    if (!vendor) {
      return next(new AppError("Vendor not found or inactive", 404));
    }

    // Update event vendor
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { vendorId },
      { new: true, runValidators: true },
    ).populate("vendorId", "businessName email phone");

    const response: ApiResponse = {
      success: true,
      message: "Event vendor changed successfully",
      data: {
        event: formatAdminEventResponse(updatedEvent),
        previousVendorId: event.vendorId.toString(),
        newVendor: {
          id: vendor._id.toString(),
          businessName: vendor.businessName,
          email: vendor.email,
          fullName: vendor.businessName,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update event (Admin can update any field)
 */
export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateEventRequest;
    const normalizedEventType = updateData.eventType || updateData.venueType;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // If vendorId is being updated, validate the vendor
    if (updateData.vendorId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      const vendor = await Vendor.findOne({
        _id: updateData.vendorId,
        isActive: true,
        isSuspended: false,
      });

      if (!vendor) {
        return next(new AppError("Vendor not found or inactive", 404));
      }
    }

    // If teacherId is being updated, validate the teacher
    if (updateData.teacherId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.teacherId)) {
        return next(new AppError("Invalid teacher ID", 400));
      }

      const teacher = await Teacher.findOne({
        _id: updateData.teacherId,
        isDeleted: false,
      });

      if (!teacher) {
        return next(new AppError("Teacher not found", 404));
      }
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    // Normalize optional owner fields from UI payload
    const normalizedVendorId =
      typeof updateData.vendorId === "string" && updateData.vendorId.trim()
        ? updateData.vendorId.trim()
        : undefined;
    const normalizedTeacherId =
      typeof updateData.teacherId === "string" && updateData.teacherId.trim()
        ? updateData.teacherId.trim()
        : undefined;

    if (updateData.vendorId !== undefined) {
      updateData.vendorId = normalizedVendorId;
    }
    if (updateData.teacherId !== undefined) {
      updateData.teacherId = normalizedTeacherId;
    }

    // Special handling for dateSchedule to preserve bookings
    if (updateData.dateSchedule && Array.isArray(updateData.dateSchedule)) {
      updateData.dateSchedule = updateData.dateSchedule.map((schedule: any) => {
        // Find existing schedule in current event data
        const existingSchedule = event.dateSchedule.find(
          (s: any) => s._id?.toString() === schedule._id?.toString(),
        );

        const totalSeats = schedule.unlimitedSeats
          ? 999999
          : schedule.totalSeats || schedule.availableSeats || 0;
        const soldSeats = existingSchedule?.soldSeats || 0;
        const reservedSeats = existingSchedule?.reservedSeats || 0;

        return {
          ...schedule,
          totalSeats,
          soldSeats,
          reservedSeats,
          // Sync availability: Capacity - Already Sold
          availableSeats: schedule.unlimitedSeats
            ? 999999
            : Math.max(0, totalSeats - soldSeats),
        };
      });
    }

    // Check if googlePlaceId is being updated
    const googlePlaceIdChanged =
      updateData.googlePlaceId !== undefined &&
      updateData.googlePlaceId !== event.googlePlaceId;

    // Update event using save() to trigger pre-save middleware (for slug generation)
    Object.assign(event, updateData);

    // Admin approval should make event publicly visible unless explicitly deactivated in same request.
    if (updateData.isApproved === true && updateData.isActive === undefined) {
      event.isActive = true;
    }

    if (normalizedEventType) {
      event.venueType = normalizedEventType;
    }
    event.markModified("dateSchedule");
    if (updateData.bookingAttachments) {
      event.markModified("bookingAttachments");
    }
    await event.save();

    // Populate vendor information
    const updatedEvent = await Event.findById(id)
      .populate("vendorId", "businessName email phone")
      .populate("teacherId", "fullName firstName lastName email");

    // Clear event cache after update (including bookingAttachments changes)
    try {
      const { invalidateEventCaches } = await import("../utils/cache.utils");
      await invalidateEventCaches(id);
      logger.debug(`Cache invalidated for event ${id} after update`);
    } catch (cacheErr: any) {
      logger.warn(`Failed to invalidate event cache (non-blocking):`, cacheErr?.message);
    }

    // Trigger combined rating calculation if googlePlaceId changed
    if (googlePlaceIdChanged) {
      try {
        const { eventService } = await import("../services/event.service");
        // Run in background - don't wait for completion
        eventService.updateCombinedRating(id).catch((err) => {
          logger.error(
            `Background combined rating update failed for event ${id}:`,
            err,
          );
        });
      } catch (error) {
        logger.error(
          `Error triggering combined rating update for event ${id}:`,
          error,
        );
        // Don't fail the update if rating calculation fails
      }
    }

    const response: ApiResponse = {
      success: true,
      message: "Event updated successfully",
      data: {
        event: formatAdminEventResponse(updatedEvent),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event (Admin can hard delete or restore)
 */
export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    if (permanent === "true") {
      // Hard delete
      await Event.findByIdAndDelete(id);
    } else {
      // Soft delete
      await Event.findByIdAndUpdate(id, { isDeleted: true });
    }

    const response: ApiResponse = {
      success: true,
      message:
        permanent === "true"
          ? "Event permanently deleted"
          : "Event deleted successfully",
      data: null,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Restore deleted event
 */
export const restoreEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // Check if event exists and is deleted
    const event = await Event.findOne({ _id: id, isDeleted: true });
    if (!event) {
      return next(new AppError("Deleted event not found", 404));
    }

    // Restore event
    const restoredEvent = await Event.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true, runValidators: true },
    ).populate("vendorId", "businessName email phone");

    const response: ApiResponse = {
      success: true,
      message: "Event restored successfully",
      data: {
        event: formatAdminEventResponse(restoredEvent),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve event
 */
export const approveEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // Update event approval status
    const event = await Event.findByIdAndUpdate(
      id,
      { isApproved: true, status: "published", isActive: true },
      { new: true, runValidators: true },
    ).populate("vendorId", "businessName email phone");

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Event approved successfully",
      data: {
        event: formatAdminEventResponse(event),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject event
 */
export const rejectEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // Update event approval status
    const event = await Event.findByIdAndUpdate(
      id,
      {
        isApproved: false,
        status: "rejected",
        // You could add a rejectionReason field to the Event model if needed
      },
      { new: true, runValidators: true },
    ).populate("vendorId", "businessName email phone");

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const response: ApiResponse = {
      success: true,
      message: "Event rejected successfully",
      data: {
        event: formatAdminEventResponse(event),
        rejectionReason: reason,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle featured status
 */
export const toggleFeatured = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid event ID", 400));
    }

    // Get current event
    const currentEvent = await Event.findById(id);
    if (!currentEvent) {
      return next(new AppError("Event not found", 404));
    }

    // Toggle featured status
    const event = await Event.findByIdAndUpdate(
      id,
      { isFeatured: !currentEvent.isFeatured },
      { new: true, runValidators: true },
    ).populate("vendorId", "businessName email phone");

    const response: ApiResponse = {
      success: true,
      message: `Event ${event?.isFeatured ? "featured" : "unfeatured"} successfully`,
      data: {
        event: formatAdminEventResponse(event),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update events
 */
export const bulkUpdateEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { eventIds, updateData } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return next(new AppError("Event IDs array is required", 400));
    }

    // Validate all event IDs
    const invalidIds = eventIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidIds.length > 0) {
      return next(new AppError("Invalid event IDs found", 400));
    }

    const normalizedUpdateData = { ...updateData };

    // Keep approval behavior consistent with single-event approve endpoint.
    if (normalizedUpdateData.isApproved === true) {
      if (normalizedUpdateData.isActive === undefined) {
        normalizedUpdateData.isActive = true;
      }
      if (normalizedUpdateData.status === undefined) {
        normalizedUpdateData.status = "published";
      }
    }

    // Update events
    const result = await Event.updateMany(
      { _id: { $in: eventIds } },
      normalizedUpdateData,
      { runValidators: true },
    );

    const response: ApiResponse = {
      success: true,
      message: `${result.modifiedCount} events updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all vendors for event assignment
 */
export const getAllVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendors = await Vendor.find({
      isActive: true,
      isSuspended: false,
    })
      .select("_id businessName email")
      .sort({ businessName: 1 })
      .lean();

    const formattedVendors = vendors.map((vendor) => ({
      id: vendor._id.toString(),
      businessName: vendor.businessName,
      email: vendor.email,
      fullName: vendor.businessName,
    }));

    const response: ApiResponse = {
      success: true,
      message: "Vendors retrieved successfully",
      data: {
        vendors: formattedVendors,
        totalVendors: vendors.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get event statistics
 */
export const getEventStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      featuredEvents,
      deletedEvents,
      eventsByCategory,
      eventsByType,
      recentEvents,
    ] = await Promise.all([
      Event.countDocuments({ isDeleted: false }),
      Event.countDocuments({ isApproved: true, isDeleted: false }),
      Event.countDocuments({ isApproved: false, isDeleted: false }),
      Event.countDocuments({ isFeatured: true, isDeleted: false }),
      Event.countDocuments({ isDeleted: true }),
      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Event.find({ isDeleted: false })
        .populate("vendorId", "businessName email phone")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Event statistics retrieved successfully",
      data: {
        totalEvents,
        approvedEvents,
        pendingEvents,
        featuredEvents,
        deletedEvents,
        eventsByCategory: eventsByCategory.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        eventsByType: eventsByType.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recentEvents: recentEvents.map((event) =>
          formatAdminEventResponse(event as unknown as IEvent),
        ),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
