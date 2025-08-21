import { Request, Response, NextFunction } from 'express';
import { Event, User, IEvent, UserRole } from '../models';
import { AppError } from '../middleware';
import { ApiResponse, AuthRequest } from '../types';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

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
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for event update request
 */
interface UpdateEventRequest {
  title?: string;
  description?: string;
  category?: string;
  type?: 'Event' | 'Course' | 'Venue';
  venueType?: 'Indoor' | 'Outdoor';
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
  isFeatured?: boolean;
  tags?: string[];
  dateSchedule?: Array<{
    date: Date;
    availableSeats: number;
    price: number;
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
}

interface CreateEventRequest {
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor';
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
  vendorId: string;
  isApproved?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  dateSchedule: Array<{
    date: Date;
    availableSeats: number;
    price: number;
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
}

/**
 * Format event for admin response (includes all information)
 */
const formatAdminEventResponse = (event: any) => {
  return {
    id: event._id?.toString() || event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    type: event.type,
    venueType: event.venueType,
    ageRange: event.ageRange,
    location: event.location,
    vendor: event.vendorId ? {
      id: event.vendorId._id?.toString() || event.vendorId.id,
      firstName: event.vendorId.firstName,
      lastName: event.vendorId.lastName,
      email: event.vendorId.email,
      fullName: `${event.vendorId.firstName} ${event.vendorId.lastName}`
    } : null,
    price: event.price,
    currency: event.currency,
    isApproved: event.isApproved,
    isFeatured: event.isFeatured,
    affiliateCode: event.affiliateCode,
    tags: event.tags,
    dateSchedule: event.dateSchedule,
    seoMeta: event.seoMeta,
    faqs: event.faqs,
    viewsCount: event.viewsCount,
    images: event.images,
    isDeleted: event.isDeleted,
    createdAt: typeof event.createdAt === 'string' ? event.createdAt : event.createdAt?.toISOString(),
    updatedAt: typeof event.updatedAt === 'string' ? event.updatedAt : event.updatedAt?.toISOString()
  };
};

/**
 * Get all events with pagination and filtering (Admin view - includes all events)
 */
export const getAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      category,
      type,
      status,
      isApproved,
      isFeatured,
      vendorId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as EventQueryParams;

    // Build query - Admin can see all events including deleted ones based on status filter
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by approval status
    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    // Filter by featured status
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    // Filter by vendor
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      query.vendorId = vendorId;
    }

    // Filter by status (active/deleted)
    if (status === 'deleted') {
      query.isDeleted = true;
    } else if (status === 'active') {
      query.isDeleted = false;
    }
    // If status is 'all' or undefined, show both

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, totalEvents] = await Promise.all([
      Event.find(query)
        .populate('vendorId', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Event.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalEvents / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response
    const formattedEvents = events.map(event => formatAdminEventResponse(event as IEvent));

    const response: ApiResponse = {
      success: true,
      message: 'Events retrieved successfully',
      data: {
        events: formattedEvents,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEvents,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
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
          sortOrder
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get event by ID (Admin view - includes all details)
 */
export const getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    const event = await Event.findById(id)
      .populate('vendorId', 'firstName lastName email phone avatar');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Event retrieved successfully',
      data: {
        event: formatAdminEventResponse(event)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new event (Admin can assign to any vendor)
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventData = req.body as CreateEventRequest;

    // Validate required fields
    if (!eventData.vendorId) {
      return next(new AppError('Vendor ID is required', 400));
    }

    // Validate vendor exists and is active
    if (!mongoose.Types.ObjectId.isValid(eventData.vendorId)) {
      return next(new AppError('Invalid vendor ID', 400));
    }

    const vendor = await User.findOne({
      _id: eventData.vendorId,
      role: UserRole.VENDOR,
      status: 'active'
    });

    if (!vendor) {
      return next(new AppError('Vendor not found or inactive', 404));
    }

    // Validate dateSchedule dates are in the future
    if (eventData.dateSchedule && eventData.dateSchedule.length > 0) {
      const now = new Date();
      for (const schedule of eventData.dateSchedule) {
        if (new Date(schedule.date) < now) {
          return next(new AppError('Schedule dates cannot be in the past', 400));
        }
      }
    }

    // Create event - Admin created events can be auto-approved
    const newEvent = await Event.create({
      ...eventData,
      isApproved: eventData.isApproved !== undefined ? eventData.isApproved : true,
      isFeatured: eventData.isFeatured || false,
      isDeleted: false
    });

    // Populate vendor information
    const populatedEvent = await Event.findById(newEvent._id)
      .populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: 'Event created successfully',
      data: {
        event: formatAdminEventResponse(populatedEvent)
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Change event vendor
 */
export const changeEventVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    // Validate ObjectId for event
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // Validate vendorId is provided and valid
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new AppError('Valid vendor ID is required', 400));
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Validate vendor exists and is active
    const vendor = await User.findOne({
      _id: vendorId,
      role: UserRole.VENDOR,
      status: 'active'
    });

    if (!vendor) {
      return next(new AppError('Vendor not found or inactive', 404));
    }

    // Update event vendor
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { vendorId },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: 'Event vendor changed successfully',
      data: {
        event: formatAdminEventResponse(updatedEvent),
        previousVendorId: event.vendorId.toString(),
        newVendor: {
          id: vendor._id.toString(),
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          fullName: `${vendor.firstName} ${vendor.lastName}`
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update event (Admin can update any field)
 */
export const updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateEventRequest;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // If vendorId is being updated, validate the vendor
    if (updateData.vendorId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.vendorId)) {
        return next(new AppError('Invalid vendor ID', 400));
      }

      const vendor = await User.findOne({
        _id: updateData.vendorId,
        role: UserRole.VENDOR,
        status: 'active'
      });

      if (!vendor) {
        return next(new AppError('Vendor not found or inactive', 404));
      }
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: 'Event updated successfully',
      data: {
        event: formatAdminEventResponse(updatedEvent)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event (Admin can hard delete or restore)
 */
export const deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    if (permanent === 'true') {
      // Hard delete
      await Event.findByIdAndDelete(id);
    } else {
      // Soft delete
      await Event.findByIdAndUpdate(id, { isDeleted: true });
    }

    const response: ApiResponse = {
      success: true,
      message: permanent === 'true' ? 'Event permanently deleted' : 'Event deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Restore deleted event
 */
export const restoreEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // Check if event exists and is deleted
    const event = await Event.findOne({ _id: id, isDeleted: true });
    if (!event) {
      return next(new AppError('Deleted event not found', 404));
    }

    // Restore event
    const restoredEvent = await Event.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: 'Event restored successfully',
      data: {
        event: formatAdminEventResponse(restoredEvent)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve event
 */
export const approveEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // Update event approval status
    const event = await Event.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Event approved successfully',
      data: {
        event: formatAdminEventResponse(event)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject event
 */
export const rejectEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // Update event approval status
    const event = await Event.findByIdAndUpdate(
      id,
      { 
        isApproved: false,
        // You could add a rejectionReason field to the Event model if needed
      },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Event rejected successfully',
      data: {
        event: formatAdminEventResponse(event),
        rejectionReason: reason
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle featured status
 */
export const toggleFeatured = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid event ID', 400));
    }

    // Get current event
    const currentEvent = await Event.findById(id);
    if (!currentEvent) {
      return next(new AppError('Event not found', 404));
    }

    // Toggle featured status
    const event = await Event.findByIdAndUpdate(
      id,
      { isFeatured: !currentEvent.isFeatured },
      { new: true, runValidators: true }
    ).populate('vendorId', 'firstName lastName email');

    const response: ApiResponse = {
      success: true,
      message: `Event ${event?.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: {
        event: formatAdminEventResponse(event)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update events
 */
export const bulkUpdateEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { eventIds, updateData } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return next(new AppError('Event IDs array is required', 400));
    }

    // Validate all event IDs
    const invalidIds = eventIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(new AppError('Invalid event IDs found', 400));
    }

    // Update events
    const result = await Event.updateMany(
      { _id: { $in: eventIds } },
      updateData,
      { runValidators: true }
    );

    const response: ApiResponse = {
      success: true,
      message: `${result.modifiedCount} events updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all vendors for event assignment
 */
export const getAllVendors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vendors = await User.find({
      role: UserRole.VENDOR,
      status: 'active'
    })
    .select('_id firstName lastName email')
    .sort({ firstName: 1, lastName: 1 })
    .lean();

    const formattedVendors = vendors.map(vendor => ({
      id: vendor._id.toString(),
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      email: vendor.email,
      fullName: `${vendor.firstName} ${vendor.lastName}`
    }));

    const response: ApiResponse = {
      success: true,
      message: 'Vendors retrieved successfully',
      data: {
        vendors: formattedVendors,
        totalVendors: vendors.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get event statistics
 */
export const getEventStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      featuredEvents,
      deletedEvents,
      eventsByCategory,
      eventsByType,
      recentEvents
    ] = await Promise.all([
      Event.countDocuments({ isDeleted: false }),
      Event.countDocuments({ isApproved: true, isDeleted: false }),
      Event.countDocuments({ isApproved: false, isDeleted: false }),
      Event.countDocuments({ isFeatured: true, isDeleted: false }),
      Event.countDocuments({ isDeleted: true }),
      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Event.find({ isDeleted: false })
        .populate('vendorId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Event statistics retrieved successfully',
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
        recentEvents: recentEvents.map(event => formatAdminEventResponse(event as IEvent))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};