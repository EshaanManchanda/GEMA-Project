import { Event, Booking, IBooking, User } from '../models';
 import { AppError, catchAsync } from '../middleware';
 import { uploadSingle, getFileInfo } from '../middleware/upload';
 import { AuthRequest } from '../types';
 import { NextFunction, Response } from 'express';

// @desc    Get vendor dashboard statistics
// @route   GET /api/vendors/stats
// @access  Private (Vendor only)
export const getVendorDashboardStats = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  // Get total events created by vendor
  const totalEvents = await Event.countDocuments({ vendorId });

  // Get total bookings for vendor's events
  const vendorEvents = await Event.find({ vendorId }).select('_id');
  const eventIds = vendorEvents.map(event => event._id);
  const totalBookings = await Booking.countDocuments({ eventId: { $in: eventIds } });

  // Get total revenue (sum of prices from bookings for vendor's events)
  const bookings = await Booking.find({ eventId: { $in: eventIds } }).populate('eventId', 'price');
  const totalRevenue = bookings.reduce((acc: number, booking: IBooking) => acc + (booking.eventId as any)?.price || 0, 0);

  res.status(200).json({
    success: true,
    message: 'Vendor dashboard statistics retrieved successfully',
    data: {
      totalEvents,
      totalBookings,
      totalRevenue,
    },
  });
});

// @desc    Get events created by the authenticated vendor
// @route   GET /api/vendors/events
// @access  Private (Vendor only)
export const getVendorEvents = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const events = await Event.find({ vendorId, isDeleted: false }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Vendor events retrieved successfully',
    data: { events },
  });
});

// @desc    Get bookings for the authenticated vendor's events
// @route   GET /api/vendors/bookings
// @access  Private (Vendor only)
export const getVendorBookings = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const vendorEvents = await Event.find({ vendorId }).select('_id');
  const eventIds = vendorEvents.map(event => event._id);

  const bookings = await Booking.find({ eventId: { $in: eventIds } })
    .populate('eventId', 'title')
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Vendor bookings retrieved successfully',
    data: { bookings },
  });
});

// @desc    Get vendor profile for the authenticated vendor
// @route   GET /api/vendors/profile
// @access  Private (Vendor only)
export const getVendorProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const vendor = await User.findById(vendorId).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

  if (!vendor) {
    return next(new AppError('Vendor not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Vendor profile retrieved successfully',
    data: { vendor },
  });
});

// @desc    Update vendor profile for the authenticated vendor
// @route   PUT /api/vendors/profile
// @access  Private (Vendor only)
export const updateVendorProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const { firstName, lastName, phone, gender, dateOfBirth, addresses } = req.body;

  // Validate that the user is updating allowed fields only
  const allowedUpdates = ['firstName', 'lastName', 'phone', 'gender', 'dateOfBirth', 'addresses'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return next(new AppError('Invalid update fields', 400));
  }

  const vendor = await User.findByIdAndUpdate(
    vendorId,
    { firstName, lastName, phone, gender, dateOfBirth, addresses },
    { new: true, runValidators: true }
  ).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

  if (!vendor) {
    return next(new AppError('Vendor not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Vendor profile updated successfully',
    data: { vendor },
  });
});

// @desc    Upload vendor images (logo, cover image)
// @route   POST /api/vendors/upload-image
// @access  Private (Vendor only)
export const uploadVendorImage = [
  uploadSingle('avatar'),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const vendorId = req.user?.id;

    if (!vendorId) {
      return next(new AppError('Vendor ID not found', 401));
    }

    if (!req.file) {
      return next(new AppError('No image file provided', 400));
    }

    const fileInfo = getFileInfo(req.file);
    
    // Update vendor's avatar with the uploaded image URL
    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { avatar: fileInfo.url },
      { new: true }
    ).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

    if (!vendor) {
      return next(new AppError('Vendor not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Vendor image uploaded successfully',
      data: { 
        vendor,
        uploadedFile: fileInfo
      },
    });
  })
];

// @desc    Update vendor business hours
// @route   PUT /api/vendors/business-hours
// @access  Private (Vendor only)
export const updateVendorBusinessHours = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const { businessHours } = req.body;

  if (!businessHours || typeof businessHours !== 'object') {
    return next(new AppError('Business hours data is required', 400));
  }

  // Validate business hours format
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const isValidBusinessHours = Object.keys(businessHours).every(day => {
    if (!daysOfWeek.includes(day.toLowerCase())) return false;
    const dayData = businessHours[day];
    return dayData && typeof dayData === 'object' && 
           'isOpen' in dayData && 
           (!dayData.isOpen || ('openTime' in dayData && 'closeTime' in dayData));
  });

  if (!isValidBusinessHours) {
    return next(new AppError('Invalid business hours format', 400));
  }

  // For now, we'll store business hours in a custom field (could be extended to User model)
  const vendor = await User.findById(vendorId);
  
  if (!vendor) {
    return next(new AppError('Vendor not found', 404));
  }

  // Add business hours to vendor (using a custom field approach for now)
  const updatedVendor = await User.findByIdAndUpdate(
    vendorId,
    { $set: { businessHours } },
    { new: true, runValidators: true }
  ).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

  res.status(200).json({
    success: true,
    message: 'Vendor business hours updated successfully',
    data: { vendor: updatedVendor },
  });
});

// @desc    Update vendor social media links
// @route   PUT /api/vendors/social-media
// @access  Private (Vendor only)
export const updateVendorSocialMedia = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const { socialMedia } = req.body;

  if (!socialMedia || typeof socialMedia !== 'object') {
    return next(new AppError('Social media data is required', 400));
  }

  // Validate social media URLs
  const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'website'];
  const isValidSocialMedia = Object.keys(socialMedia).every(platform => {
    if (!validPlatforms.includes(platform.toLowerCase())) return false;
    const url = socialMedia[platform];
    if (url && typeof url === 'string') {
      // Basic URL validation
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
    return url === '' || url === null; // Allow empty strings or null to remove links
  });

  if (!isValidSocialMedia) {
    return next(new AppError('Invalid social media URLs or platforms', 400));
  }

  const vendor = await User.findById(vendorId);
  
  if (!vendor) {
    return next(new AppError('Vendor not found', 404));
  }

  // Add social media links to vendor (using a custom field approach for now)
  const updatedVendor = await User.findByIdAndUpdate(
    vendorId,
    { $set: { socialMedia } },
    { new: true, runValidators: true }
  ).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

  res.status(200).json({
    success: true,
    message: 'Vendor social media links updated successfully',
    data: { vendor: updatedVendor },
  });
});

// @desc    Get public vendor profile by ID
// @route   GET /api/vendors/public/:id
// @access  Public
export const getPublicVendorProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Find vendor with only public information
  const vendor = await User.findOne({
    _id: id,
    role: 'vendor',
    status: 'active'
  }).select('firstName lastName email phone avatar socialMedia businessHours createdAt');

  if (!vendor) {
    return next(new AppError('Vendor not found', 404));
  }

  // Get vendor's published events
  const events = await Event.find({
    vendorId: id,
    isDeleted: false,
    isActive: true,
    status: 'published',
    isApproved: true
  })
    .select('title description category price currency images dateSchedule location tags viewsCount averageRating reviewCount')
    .sort({ createdAt: -1 })
    .limit(20);

  // Get vendor statistics
  const totalEvents = await Event.countDocuments({
    vendorId: id,
    isDeleted: false,
    status: 'published'
  });

  const totalBookings = await Booking.countDocuments({
    eventId: { $in: events.map(e => e._id) }
  });

  res.status(200).json({
    success: true,
    message: 'Vendor profile retrieved successfully',
    data: {
      vendor,
      events,
      stats: {
        totalEvents,
        totalBookings,
        activeEvents: events.length
      }
    }
  });
});