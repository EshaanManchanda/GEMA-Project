import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Event, User } from '../models/index';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types/index';
import { config, checkDBHealth } from '../config/index';
import { buildPublicEventFilter, sanitizeEventOutput, sanitizeEventsOutput } from '../utils/event.utils';
import { cacheService } from '../services/cache.service';
import { invalidateEventCaches } from '../utils/cache.utils';

/**
 * Wrapper to add timeout to database operations
 */
const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number = 30000,
  operationName: string = 'Database operation'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError(`${operationName} timed out after ${timeoutMs}ms`, 408));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('\n=== EVENTS API DEBUG ===');
    console.log('Request query params:', req.query);
    console.log('User-Agent:', req.headers['user-agent']?.includes('curl') ? 'curl' : 'browser/app');

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
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

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
      sortBy,
      sortOrder,
    })}`;

    // Try to get from cache first
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT for events listing');
      return res.status(200).json({
        success: true,
        message: 'Events retrieved successfully',
        data: cached,
        cached: true,
      });
    }

    console.log('❌ Cache MISS for events listing');

    // Build additional filters based on query params
    const additionalFilters: any = {};

    // Case-insensitive category matching (events store category as slugs)
    if (category) {
      // Escape regex special characters to prevent injection
      const escapedCategory = (category as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      additionalFilters.category = new RegExp(`^${escapedCategory}$`, 'i');
    }
    if (type) additionalFilters.type = type;
    if (venueType) additionalFilters.venueType = venueType;
    if (city) additionalFilters['location.city'] = new RegExp(city as string, 'i');
    if (currency) additionalFilters.currency = currency;
    if (featured === 'true') additionalFilters.isFeatured = true;

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
      filter.ageRange = {};
      if (ageMin) filter.ageRange = { ...filter.ageRange, $elemMatch: { $gte: parseInt(ageMin as string) } };
      if (ageMax) filter.ageRange = { ...filter.ageRange, $elemMatch: { $lte: parseInt(ageMax as string) } };
    }

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
    }

    // Build sort query
    const sort: any = {};
    if (search && !sortBy) {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    }

    console.log('Filter being applied:', JSON.stringify(filter, null, 2));
    console.log('Sort being applied:', JSON.stringify(sort, null, 2));
    console.log('Pagination: page', pageNum, 'limit', limitNum, 'skip', skip);

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('vendorId', 'firstName lastName email')
        .select('-dateSchedule.price')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Event.countDocuments(filter),
    ]);

    console.log('Query results:');
    console.log('- Total events matching filter:', total);
    console.log('- Events returned:', events.length);
    console.log('- Sample event viewsCounts:', events.map(e => ({ title: e.title.substring(0, 20), viewsCount: e.viewsCount })));

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

    // Cache the response for 5 minutes (300 seconds)
    await cacheService.set(cacheKey, responseData, { ttl: 300 });

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: responseData,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Try to get from cache first
    const cacheKey = `event:${id}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      console.log(`✅ Cache HIT for event ${id}`);
      // Still increment view count (async, non-blocking)
      withTimeout(
        Event.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } }),
        15000,
        'View count update'
      ).catch(error => {
        console.warn('Failed to update view count:', error.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Event retrieved successfully',
        data: cached,
        cached: true,
      });
    }

    console.log(`❌ Cache MISS for event ${id}`);

    // Check database health before proceeding
    const isDBHealthy = await checkDBHealth();
    if (!isDBHealthy) {
      return next(new AppError('Database is currently unavailable. Please try again later.', 503));
    }

    // Build public filter with expiration check
    const filter = buildPublicEventFilter({ _id: id });

    // Add timeout to the main query - only show active, published, non-expired events
    const event = await withTimeout(
      Event.findOne(filter).populate('vendorId', 'firstName lastName email phone avatar'),
      config.mongodb.socketTimeoutMS,
      'Event lookup'
    );

    if (!event) {
      return next(new AppError('Event not found or expired', 404));
    }

    // Increment view count with timeout (non-blocking, fire and forget)
    withTimeout(
      Event.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } }),
      15000,
      'View count update'
    ).catch(error => {
      console.warn('Failed to update view count:', error.message);
      // Don't fail the request if view count update fails
    });

    // Sanitize output
    const sanitizedEvent = sanitizeEventOutput(event);

    const responseData = { event: sanitizedEvent };

    // Cache for 10 minutes (600 seconds)
    await cacheService.set(cacheKey, responseData, { ttl: 600 });

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: responseData,
      cached: false,
    });
  } catch (error) {
    // Enhanced error handling for specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        return next(new AppError('Request timed out. The database is experiencing high load. Please try again.', 408));
      }
      if (error.message.includes('buffering timed out')) {
        return next(new AppError('Database connection is unstable. Please try again in a moment.', 503));
      }
      if (error.message.includes('MongooseError')) {
        return next(new AppError('Database error occurred. Please try again later.', 503));
      }
    }
    next(error);
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Vendor only)
export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Verify user is a vendor
    const user = await User.findById(userId);
    if (!user || user.role !== 'vendor') {
      return next(new AppError('Only vendors can create events', 403));
    }

    const eventData = {
      ...req.body,
      vendorId: userId,
      isApproved: false, // Events require admin approval
      isActive: true, // Set as active by default
      status: 'pending', // Status starts as pending approval
    };

    const event = await Event.create(eventData);

    // Invalidate event caches
    await invalidateEventCaches();

    res.status(201).json({
      success: true,
      message: 'Event created successfully. Pending admin approval.',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Vendor - own events only)
export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const event = await Event.findOne({
      _id: id,
      vendorId: userId,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError('Event not found or unauthorized', 404));
    }

    // If event was previously approved and being modified, require re-approval
    const requiresReapproval = event.isApproved && (
      req.body.title !== event.title ||
      req.body.description !== event.description ||
      req.body.price !== event.price ||
      JSON.stringify(req.body.dateSchedule) !== JSON.stringify(event.dateSchedule)
    );

    const updateData = {
      ...req.body,
      ...(requiresReapproval && { isApproved: false }),
    };

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Invalidate event caches
    await invalidateEventCaches(id);

    res.status(200).json({
      success: true,
      message: requiresReapproval
        ? 'Event updated successfully. Pending admin re-approval due to significant changes.'
        : 'Event updated successfully',
      data: { event: updatedEvent },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event (soft delete)
// @route   DELETE /api/events/:id
// @access  Private (Vendor - own events only)
export const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const event = await Event.findOne({
      _id: id,
      vendorId: userId,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError('Event not found or unauthorized', 404));
    }

    await Event.findByIdAndUpdate(id, { isDeleted: true });

    // Invalidate event caches
    await invalidateEventCaches(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor's events
// @route   GET /api/events/vendor/my-events
// @access  Private (Vendor only)
export const getVendorEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      page = 1,
      limit = 12,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      vendorId: userId,
      isDeleted: false,
    };

    if (status !== 'all') {
      switch (status) {
        case 'approved':
          filter.isApproved = true;
          break;
        case 'pending':
          filter.isApproved = false;
          break;
        case 'featured':
          filter.isFeatured = true;
          break;
      }
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Event.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: 'Vendor events retrieved successfully',
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
export const getEventCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use public filter to exclude expired/inactive events
    const filter = buildPublicEventFilter();

    const categories = await Event.distinct('category', filter);

    res.status(200).json({
      success: true,
      message: 'Event categories retrieved successfully',
      data: { categories: categories.sort() },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event analytics for vendor
// @route   GET /api/events/vendor/analytics
// @access  Private (Vendor only)
export const getVendorEventAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
            $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] },
          },
          pendingEvents: {
            $sum: { $cond: [{ $eq: ['$isApproved', false] }, 1, 0] },
          },
          featuredEvents: {
            $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] },
          },
          totalViews: { $sum: '$viewsCount' },
          avgPrice: { $avg: '$price' },
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
      message: 'Vendor analytics retrieved successfully',
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
export const getAdminEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 12,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { isDeleted: false };

    if (status !== 'all') {
      switch (status) {
        case 'approved':
          filter.isApproved = true;
          break;
        case 'pending':
          filter.isApproved = false;
          break;
        case 'featured':
          filter.isFeatured = true;
          break;
      }
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('vendorId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Event.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Admin events retrieved successfully',
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
export const updateEventApproval = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isApproved, reason } = req.body;

    if (typeof isApproved !== 'boolean') {
      return next(new AppError('isApproved must be a boolean value', 400));
    }

    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    event.isApproved = isApproved;
    await event.save();

    // TODO: Send notification email to vendor about approval/rejection

    res.status(200).json({
      success: true,
      message: `Event ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle event featured status
// @route   PUT /api/events/admin/:id/featured
// @access  Private (Admin only)
export const toggleEventFeatured = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    event.isFeatured = !event.isFeatured;
    await event.save();

    res.status(200).json({
      success: true,
      message: `Event ${event.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};