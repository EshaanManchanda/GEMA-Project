import { Event, Category, Vendor } from '../models';
import { AppError, catchAsync } from '../middleware';
import { AuthRequest } from '../types';
import { NextFunction, Response } from 'express';
import { getOrCreateVendorProfile } from '../utils/vendorHelpers';

// @desc    Get single event by ID (vendor's own event)
// @route   GET /api/vendors/events/:id
// @access  Private (Vendor only)
export const getVendorEventById = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  const event = await Event.findOne({ _id: id, vendorId, isDeleted: false });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Event retrieved successfully',
    data: { event },
  });
});

// @desc    Create new event
// @route   POST /api/vendors/events
// @access  Private (Vendor only)
export const createVendorEvent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  const {
    title,
    description,
    category,
    type,
    venueType,
    ageRange,
    location,
    price,
    currency,
    tags,
    images,
    dateSchedule,
    seoMeta,
    faqs
  } = req.body;

  // Validation
  if (!title || !description || !category) {
    return next(new AppError('Title, description, and category are required', 400));
  }

  if (!location || !location.city || !location.address) {
    return next(new AppError('Location details (city, address) are required', 400));
  }

  if (!dateSchedule || dateSchedule.length === 0) {
    return next(new AppError('At least one date schedule is required', 400));
  }

  // Validate category exists
  const categoryDoc = await Category.findOne({ slug: category, isActive: true });
  if (!categoryDoc) {
    return next(new AppError('Invalid category', 400));
  }

  // Create event
  const event = await Event.create({
    vendorId,
    title,
    description,
    category,
    type: type || 'Event',
    venueType: venueType || 'Indoor',
    ageRange: ageRange || [0, 100],
    location: {
      city: location.city,
      address: location.address,
      coordinates: {
        lat: location.coordinates?.lat || 0,
        lng: location.coordinates?.lng || 0,
      }
    },
    price: price || 0,
    currency: currency || 'AED',
    tags: tags || [],
    images: images || [],
    dateSchedule: dateSchedule.map((schedule: any) => ({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      availableSeats: schedule.unlimitedSeats ? 999999 : (schedule.availableSeats || 0),
      totalSeats: schedule.unlimitedSeats ? 999999 : (schedule.totalSeats || schedule.availableSeats || 0),
      price: schedule.price || price || 0,
      unlimitedSeats: schedule.unlimitedSeats || false,
      isOverride: schedule.isOverride || false,
    })),
    seoMeta: seoMeta || undefined,
    faqs: faqs || undefined,
    isApproved: false, // Vendor events need admin approval
    isFeatured: false,
    isDeleted: false,
    isActive: true,
    status: 'draft', // Start as draft
    viewsCount: 0,
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully. Waiting for admin approval.',
    data: { event },
  });
});

// @desc    Update vendor's own event
// @route   PUT /api/vendors/events/:id
// @access  Private (Vendor only)
export const updateVendorEvent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Find event and verify ownership
  const event = await Event.findOne({ _id: id, vendorId });

  if (!event) {
    return next(new AppError('Event not found or you do not have permission to edit this event', 404));
  }

  const {
    title,
    description,
    category,
    type,
    venueType,
    ageRange,
    location,
    price,
    currency,
    tags,
    images,
    dateSchedule,
    seoMeta,
    faqs,
    status
  } = req.body;

  // Update fields
  if (title) event.title = title;
  if (description) event.description = description;
  if (category) {
    // Validate category exists
    const categoryDoc = await Category.findOne({ slug: category, isActive: true });
    if (!categoryDoc) {
      return next(new AppError('Invalid category', 400));
    }
    event.category = category;
  }
  if (type) event.type = type;
  if (venueType) event.venueType = venueType;
  if (ageRange) event.ageRange = ageRange;
  if (location) {
    event.location = {
      city: location.city || event.location.city,
      address: location.address || event.location.address,
      coordinates: {
        lat: location.coordinates?.lat ?? event.location.coordinates.lat,
        lng: location.coordinates?.lng ?? event.location.coordinates.lng,
      }
    };
  }
  if (price !== undefined) event.price = price;
  if (currency) event.currency = currency;
  if (tags) event.tags = tags;
  if (images) event.images = images;
  if (dateSchedule) {
    event.dateSchedule = dateSchedule.map((schedule: any) => ({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      availableSeats: schedule.unlimitedSeats ? 999999 : (schedule.availableSeats || 0),
      totalSeats: schedule.unlimitedSeats ? 999999 : (schedule.totalSeats || schedule.availableSeats || 0),
      price: schedule.price || event.price || 0,
      unlimitedSeats: schedule.unlimitedSeats || false,
      isOverride: schedule.isOverride || false,
    }));
  }
  if (seoMeta) event.seoMeta = seoMeta;
  if (faqs) event.faqs = faqs;
  if (status) event.status = status;

  await event.save();

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: { event },
  });
});

// @desc    Delete vendor's own event (soft or permanent)
// @route   DELETE /api/vendors/events/:id
// @access  Private (Vendor only)
export const deleteVendorEvent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;
  const { permanent } = req.query;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Find event and verify ownership
  const event = await Event.findOne({ _id: id, vendorId });

  if (!event) {
    return next(new AppError('Event not found or you do not have permission to delete this event', 404));
  }

  if (permanent === 'true') {
    // Permanent delete
    await Event.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event permanently deleted',
    });
  } else {
    // Soft delete
    event.isDeleted = true;
    event.status = 'archived';
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
      data: { event },
    });
  }
});

// @desc    Restore deleted event
// @route   PUT /api/vendors/events/:id/restore
// @access  Private (Vendor only)
export const restoreVendorEvent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Find event and verify ownership
  const event = await Event.findOne({ _id: id, vendorId, isDeleted: true });

  if (!event) {
    return next(new AppError('Event not found or already restored', 404));
  }

  event.isDeleted = false;
  event.status = 'draft';
  await event.save();

  res.status(200).json({
    success: true,
    message: 'Event restored successfully',
    data: { event },
  });
});
