import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Event, User } from '../models';
import { AppError } from '../middleware';
import { AuthRequest } from '../types';

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {
      isApproved: true,
      isDeleted: false,
    };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (venueType) filter.venueType = venueType;
    if (city) filter['location.city'] = new RegExp(city as string, 'i');
    if (currency) filter.currency = currency;
    if (featured === 'true') filter.isFeatured = true;

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

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: {
        events,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEvents: total,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
      },
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

    const event = await Event.findOne({
      _id: id,
      isApproved: true,
      isDeleted: false,
    }).populate('vendorId', 'firstName lastName email phone avatar');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Increment view count
    await Event.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: { event },
    });
  } catch (error) {
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

    const userId = req.user?.id;
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
    };

    const event = await Event.create(eventData);

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
    const userId = req.user?.id;

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
    const userId = req.user?.id;

    const event = await Event.findOne({
      _id: id,
      vendorId: userId,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError('Event not found or unauthorized', 404));
    }

    await Event.findByIdAndUpdate(id, { isDeleted: true });

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
    const userId = req.user?.id;
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
    const categories = await Event.distinct('category', {
      isApproved: true,
      isDeleted: false,
    });

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
    const userId = req.user?.id;

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