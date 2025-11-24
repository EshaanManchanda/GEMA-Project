import { Event, Booking, IBooking, User, Order, Employee, UserRole, Vendor, VerificationStatus } from '../models/index';
 import { AppError, catchAsync } from '../middleware/index';
 import { uploadSingle, getFileInfo } from '../middleware/upload';
 import { AuthRequest } from '../types/index';
 import { NextFunction, Response } from 'express';
 import emailService from '../services/email.service';
import mongoose from 'mongoose';
import { getOrCreateVendorProfile } from '../utils/vendorHelpers';
import { generateOTP } from '../utils/otp';
import smsService from '../services/sms.service';

// @desc    Get vendor dashboard statistics
// @route   GET /api/vendors/stats
// @access  Private (Vendor only)
export const getVendorDashboardStats = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile (this gives us the Vendor._id)
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

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
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

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
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Get all event IDs for this vendor
  const vendorEvents = await Event.find({ vendorId }).select('_id title');
  const eventIds = vendorEvents.map(event => event._id);

  // Extract query parameters
  const {
    page = 1,
    limit = 10,
    search,
    status,
    paymentStatus,
    eventId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build filter query
  const filter: any = {
    'items.eventId': { $in: eventIds },
  };

  // Status filter (exclude pending by default unless explicitly requested)
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $nin: ['pending'] };
  }

  // Payment status filter
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  // Event filter
  if (eventId) {
    filter['items.eventId'] = eventId;
  }

  // Date range filter (for booking creation date)
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      const endDateTime = new Date(endDate as string);
      endDateTime.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDateTime;
    }
  }

  // Amount range filter
  if (minAmount || maxAmount) {
    filter.total = {};
    if (minAmount) {
      filter.total.$gte = parseFloat(minAmount as string);
    }
    if (maxAmount) {
      filter.total.$lte = parseFloat(maxAmount as string);
    }
  }

  // Search filter (across multiple fields)
  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    filter.$or = [
      { orderNumber: searchRegex },
      { 'billingAddress.firstName': searchRegex },
      { 'billingAddress.lastName': searchRegex },
      { 'billingAddress.email': searchRegex },
      { 'billingAddress.phone': searchRegex },
      { 'items.eventTitle': searchRegex },
    ];
  }

  // Build sort query
  const sort: any = {};
  sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [bookings, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .populate('items.eventId', 'title category images')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Calculate statistics
  const stats = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalBookings: { $sum: 1 },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        paidBookings: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Vendor bookings retrieved successfully',
    data: {
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
      events: vendorEvents, // Send vendor's events for filter dropdown
    },
  });
});

// @desc    Get single booking by ID for vendor
// @route   GET /api/vendors/bookings/:id
// @access  Private (Vendor only)
export const getVendorBookingById = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Get all event IDs for this vendor
  const vendorEvents = await Event.find({ vendorId }).select('_id');
  const eventIds = vendorEvents.map(event => event._id);

  // Find order that contains vendor's events
  const booking = await Order.findOne({
    _id: id,
    'items.eventId': { $in: eventIds },
  })
    .populate('userId', 'firstName lastName email phone avatar')
    .populate('items.eventId', 'title category images location');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Booking retrieved successfully',
    data: { booking },
  });
});

// @desc    Update booking (limited edit - status, notes, fulfillment)
// @route   PUT /api/vendors/bookings/:id
// @access  Private (Vendor only)
export const updateVendorBooking = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;
  const { vendorNotes, vendorStatus, isFulfilled } = req.body;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Get all event IDs for this vendor
  const vendorEvents = await Event.find({ vendorId }).select('_id');
  const eventIds = vendorEvents.map(event => event._id);

  // Find order that contains vendor's events
  const booking = await Order.findOne({
    _id: id,
    'items.eventId': { $in: eventIds },
  });

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Only allow limited updates
  const updates: any = {};
  if (vendorNotes !== undefined) updates.vendorNotes = vendorNotes;
  if (vendorStatus !== undefined) updates.vendorStatus = vendorStatus;
  if (isFulfilled !== undefined) updates.isFulfilled = isFulfilled;

  // Add vendor metadata
  updates.lastModifiedBy = vendorId;
  updates.lastModifiedAt = new Date();

  const updatedBooking = await Order.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate('userId', 'firstName lastName email phone')
    .populate('items.eventId', 'title category images');

  res.status(200).json({
    success: true,
    message: 'Booking updated successfully',
    data: { booking: updatedBooking },
  });
});

// @desc    Export vendor bookings to CSV or JSON
// @route   GET /api/vendors/bookings/export
// @access  Private (Vendor only)
export const exportVendorBookings = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  const { format = 'csv', ...filters } = req.query;

  // Get all event IDs for this vendor
  const vendorEvents = await Event.find({ vendorId }).select('_id');
  const eventIds = vendorEvents.map(event => event._id);

  // Build filter query (similar to getVendorBookings)
  const filter: any = {
    'items.eventId': { $in: eventIds },
    status: { $nin: ['pending'] },
  };

  // Apply filters
  if (filters.status) filter.status = filters.status;
  if (filters.paymentStatus) filter.paymentStatus = filters.paymentStatus;
  if (filters.eventId) filter['items.eventId'] = filters.eventId;
  if (filters.startDate || filters.endDate) {
    filter.createdAt = {};
    if (filters.startDate) filter.createdAt.$gte = new Date(filters.startDate as string);
    if (filters.endDate) {
      const endDateTime = new Date(filters.endDate as string);
      endDateTime.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDateTime;
    }
  }
  if (filters.minAmount || filters.maxAmount) {
    filter.total = {};
    if (filters.minAmount) filter.total.$gte = parseFloat(filters.minAmount as string);
    if (filters.maxAmount) filter.total.$lte = parseFloat(filters.maxAmount as string);
  }
  if (filters.search) {
    const searchRegex = new RegExp(filters.search as string, 'i');
    filter.$or = [
      { orderNumber: searchRegex },
      { 'billingAddress.firstName': searchRegex },
      { 'billingAddress.lastName': searchRegex },
      { 'billingAddress.email': searchRegex },
    ];
  }

  // Fetch all matching bookings
  const bookings = await Order.find(filter)
    .populate('userId', 'firstName lastName email phone')
    .populate('items.eventId', 'title')
    .sort({ createdAt: -1 })
    .lean();

  if (format === 'json') {
    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${Date.now()}.json"`);
    return res.json({
      success: true,
      data: bookings,
      exportedAt: new Date(),
      totalRecords: bookings.length,
    });
  } else {
    // CSV export
    const csvRows: string[] = [];

    // CSV Headers
    csvRows.push([
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Event Title',
      'Event Date',
      'Quantity',
      'Total Amount',
      'Currency',
      'Status',
      'Payment Status',
      'Booking Date',
      'Participant Names',
    ].join(','));

    // CSV Data
    bookings.forEach((booking: any) => {
      const customerName = `${booking.billingAddress.firstName} ${booking.billingAddress.lastName}`;

      booking.items.forEach((item: any) => {
        const participantNames = item.participants
          ? item.participants.map((p: any) => p.name).join('; ')
          : 'N/A';

        csvRows.push([
          booking.orderNumber || booking._id,
          `"${customerName}"`,
          booking.billingAddress.email || 'N/A',
          booking.billingAddress.phone || 'N/A',
          `"${item.eventTitle || (item.eventId?.title) || 'N/A'}"`,
          new Date(item.scheduleDate).toLocaleDateString(),
          item.quantity,
          booking.total,
          booking.currency,
          booking.status,
          booking.paymentStatus,
          new Date(booking.createdAt).toLocaleDateString(),
          `"${participantNames}"`,
        ].join(','));
      });
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${Date.now()}.csv"`);
    return res.send(csvContent);
  }
});

// @desc    Import vendor bookings from CSV
// @route   POST /api/vendors/bookings/import
// @access  Private (Vendor only)
export const importVendorBookings = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  const { csvData } = req.body;

  if (!csvData || !Array.isArray(csvData)) {
    return next(new AppError('CSV data is required and must be an array', 400));
  }

  const results = {
    successful: [] as string[],
    failed: [] as { row: number; reason: string; data: any }[],
    total: csvData.length,
  };

  // Process each row
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];

    try {
      // Validate required fields
      if (!row.customerEmail || !row.eventTitle || !row.quantity || !row.totalAmount) {
        results.failed.push({
          row: i + 1,
          reason: 'Missing required fields (customerEmail, eventTitle, quantity, totalAmount)',
          data: row,
        });
        continue;
      }

      // Find event by title
      const event = await Event.findOne({
        vendorId,
        title: new RegExp(`^${row.eventTitle}$`, 'i'),
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

      // Find or create user
      let user = await User.findOne({ email: row.customerEmail });
      if (!user) {
        // Create guest user
        const [firstName, ...lastNameParts] = (row.customerName || 'Guest User').split(' ');
        user = await User.create({
          email: row.customerEmail,
          firstName: firstName || 'Guest',
          lastName: lastNameParts.join(' ') || 'User',
          phone: row.customerPhone || '',
          role: 'customer',
          status: 'active',
        });
      }

      // Parse event date
      const eventDate = row.eventDate ? new Date(row.eventDate) : new Date();

      // Create order
      const order = await Order.create({
        userId: user._id,
        items: [{
          eventId: event._id,
          eventTitle: event.title,
          scheduleDate: eventDate,
          quantity: parseInt(row.quantity),
          unitPrice: parseFloat(row.totalAmount) / parseInt(row.quantity),
          totalPrice: parseFloat(row.totalAmount),
          currency: row.currency || event.currency || 'AED',
          participants: row.participantNames ? row.participantNames.split(';').map((name: string) => ({
            name: name.trim(),
          })) : [],
        }],
        subtotal: parseFloat(row.totalAmount),
        tax: 0,
        discount: 0,
        total: parseFloat(row.totalAmount),
        currency: row.currency || event.currency || 'AED',
        status: row.status || 'confirmed',
        paymentStatus: row.paymentStatus || 'paid',
        paymentMethod: 'imported',
        billingAddress: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || row.customerPhone || '',
          address: 'Imported',
          city: 'Imported',
          state: 'Imported',
          zipCode: '00000',
          country: 'UAE',
        },
        source: 'vendor_import',
        notes: `Imported by vendor on ${new Date().toISOString()}`,
      });

      results.successful.push(order.orderNumber);
    } catch (error) {
      results.failed.push({
        row: i + 1,
        reason: error instanceof Error ? error.message : 'Unknown error',
        data: row,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `Import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    data: results,
  });
});

// @desc    Get vendor profile for the authenticated vendor
// @route   GET /api/vendors/profile
// @access  Private (Vendor only)
export const getVendorProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get or create vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  // Also get user data for basic info
  const user = await User.findById(userId).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

  res.status(200).json({
    success: true,
    message: 'Vendor profile retrieved successfully',
    data: {
      vendor,
      user
    },
  });
});

// @desc    Update vendor profile for the authenticated vendor
// @route   PUT /api/vendors/profile
// @access  Private (Vendor only)
export const updateVendorProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const {
    // User fields
    firstName, lastName, phone, gender, dateOfBirth, addresses,
    // Vendor fields
    businessName, description, category, address, location, website
  } = req.body;

  // Update User model with basic profile fields
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
    { new: true, runValidators: true }
  ).select('-passwordHash -twoFactorAuth.secret -passwordReset -emailVerification -phoneVerification -loginAttempts');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Update Vendor model with business fields
  const vendor = await getOrCreateVendorProfile(userId);

  if (businessName !== undefined) vendor.businessName = businessName;
  if (description !== undefined) vendor.description = description;
  if (category !== undefined) vendor.category = category;
  if (address !== undefined) vendor.address = address;
  if (location !== undefined) vendor.location = location;
  if (website !== undefined) vendor.website = website;

  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Vendor profile updated successfully',
    data: {
      user,
      vendor
    },
  });
});

// @desc    Upload vendor images (logo, cover image)
// @route   POST /api/vendors/upload-image
// @access  Private (Vendor only)
export const uploadVendorImage = [
  uploadSingle('image'),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User ID not found', 401));
    }

    if (!req.file) {
      return next(new AppError('No image file provided', 400));
    }

    const fileInfo = getFileInfo(req.file);
    const imageType = req.body.imageType || 'logo'; // 'logo' or 'coverImage'

    // Get vendor profile
    const vendorProfile = await getOrCreateVendorProfile(userId);

    // Update vendor's logo or coverImage with the uploaded image URL
    if (imageType === 'coverImage') {
      vendorProfile.coverImage = fileInfo.url;
    } else {
      vendorProfile.logo = fileInfo.url;
    }

    await vendorProfile.save();

    res.status(200).json({
      success: true,
      message: `Vendor ${imageType} uploaded successfully`,
      data: {
        logo: vendorProfile.logo,
        coverImage: vendorProfile.coverImage,
        uploadedFile: fileInfo
      },
    });
  })
];

// @desc    Update vendor business hours
// @route   PUT /api/vendors/business-hours
// @access  Private (Vendor only)
export const updateVendorBusinessHours = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
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

  // Get or create vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  // Update business hours
  vendor.businessHours = businessHours;
  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Vendor business hours updated successfully',
    data: { vendor },
  });
});

// @desc    Update vendor social media links
// @route   PUT /api/vendors/social-media
// @access  Private (Vendor only)
export const updateVendorSocialMedia = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
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

  // Get or create vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  // Update social media links
  vendor.socialMedia = socialMedia;
  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Vendor social media links updated successfully',
    data: { vendor },
  });
});

// @desc    Get public vendor profile by ID
// @route   GET /api/vendors/public/:id
// @access  Public
export const getPublicVendorProfile = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Find user with vendor role
  const user = await User.findOne({
    _id: id,
    role: 'vendor',
    status: 'active'
  }).select('firstName lastName email phone avatar createdAt');

  if (!user) {
    return next(new AppError('Vendor not found', 404));
  }

  // Find vendor business profile
  const vendorProfile = await Vendor.findOne({ userId: id })
    .select('businessName description category address location website socialMedia businessHours stats');

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
      user,
      vendor: vendorProfile,
      events,
      stats: {
        totalEvents,
        totalBookings,
        activeEvents: events.length
      }
    }
  });
});

// @desc    Get vendor payment information (public endpoint for booking flow)
// @route   GET /api/vendors/:vendorId/payment-info
// @access  Public
export const getVendorPaymentInfo = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { vendorId } = req.params;

  if (!vendorId) {
    return next(new AppError('Vendor ID is required', 400));
  }

  // Check if user exists and is a vendor
  const user = await User.findById(vendorId).select('role');

  // If vendor not found or not a vendor, return platform defaults instead of 404
  // This allows the payment flow to continue with platform payment settings
  if (!user || user.role !== 'vendor') {
    return res.status(200).json({
      success: true,
      message: 'Using platform payment settings',
      data: {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      },
    });
  }

  // Fetch vendor payment settings from Vendor model
  // IMPORTANT: Only select safe fields - never expose secret keys
  const vendorProfile = await Vendor.findOne({ userId: vendorId })
    .select('paymentSettings.paymentMode paymentSettings.stripeSettings.stripePublishableKey paymentSettings.subscriptionStatus');

  // If no vendor profile, use platform defaults
  if (!vendorProfile) {
    return res.status(200).json({
      success: true,
      message: 'Using platform payment settings',
      data: {
        vendorId,
        hasCustomStripe: false,
        stripePublishableKey: null,
        serviceFeeRate: 5,
        usePlatformStripe: true,
      },
    });
  }

  const paymentSettings = vendorProfile.paymentSettings;
  const isCustomStripe = paymentSettings.paymentMode === 'custom_stripe' &&
                         paymentSettings.subscriptionStatus === 'active';

  res.status(200).json({
    success: true,
    message: 'Vendor payment information retrieved successfully',
    data: {
      vendorId,
      hasCustomStripe: isCustomStripe,
      stripePublishableKey: isCustomStripe ? paymentSettings.stripeSettings?.stripePublishableKey : null,
      serviceFeeRate: isCustomStripe ? 0 : vendorProfile.getEffectiveCommissionRate(),
      usePlatformStripe: !isCustomStripe,
    },
  });
});

// ===================== EMPLOYEE MANAGEMENT CONTROLLERS =====================

// @desc    Get employees for the authenticated vendor
// @route   GET /api/vendors/employees
// @access  Private (Vendor only)
export const getVendorEmployees = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Extract query parameters
  const {
    page = 1,
    limit = 10,
    search,
    role,
    status,
    assignedEvent,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build filter query
  const filter: any = { vendorId };

  // Role filter
  if (role) {
    filter.role = role;
  }

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Assigned event filter
  if (assignedEvent) {
    filter.assignedEvents = assignedEvent;
  }

  // Search filter (across multiple fields)
  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { employeeId: searchRegex },
      { phone: searchRegex },
    ];
  }

  // Build sort query
  const sort: any = {};
  sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('userId', 'firstName lastName email phone avatar status')
      .populate('assignedEvents', 'title startDate endDate category')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  // Calculate statistics
  const stats = await Employee.aggregate([
    { $match: { vendorId } },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        activeEmployees: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        inactiveEmployees: {
          $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] },
        },
        suspendedEmployees: {
          $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] },
        },
        managerCount: {
          $sum: { $cond: [{ $eq: ['$role', 'manager'] }, 1, 0] },
        },
        scannerCount: {
          $sum: { $cond: [{ $eq: ['$role', 'scanner'] }, 1, 0] },
        },
        coordinatorCount: {
          $sum: { $cond: [{ $eq: ['$role', 'coordinator'] }, 1, 0] },
        },
        securityCount: {
          $sum: { $cond: [{ $eq: ['$role', 'security'] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Vendor employees retrieved successfully',
    data: {
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
    },
  });
});

// @desc    Get single employee by ID for vendor
// @route   GET /api/vendors/employees/:id
// @access  Private (Vendor only)
export const getVendorEmployeeById = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const employee = await Employee.findOne({ _id: id, vendorId })
    .populate('userId', 'firstName lastName email phone avatar status')
    .populate('assignedEvents', 'title startDate endDate category location images')
    .populate('assignedVenues', 'name location');

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: { employee },
  });
});

// @desc    Create a new employee
// @route   POST /api/vendors/employees
// @access  Private (Vendor only)
export const createVendorEmployee = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  const {
    firstName,
    lastName,
    email,
    phone,
    role,
    permissions,
    assignedEvents,
    assignedVenues,
    emergencyContact,
    hiredAt,
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !role) {
    return next(new AppError('First name, last name, email, and role are required', 400));
  }

  // Check if employee with this email already exists
  const existingEmployee = await Employee.findOne({ email });
  if (existingEmployee) {
    return next(new AppError('Employee with this email already exists', 400));
  }

  // Check if user with this email exists
  let user = await User.findOne({ email });

  // Store temporary password for email (before hashing)
  let tempPassword: string | null = null;

  // If user doesn't exist, create a new user account
  if (!user) {
    // Generate a random password for the employee (they should reset it on first login)
    tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    user = await User.create({
      email,
      firstName,
      lastName,
      phone: phone || '',
      role: UserRole.EMPLOYEE,
      status: 'active',
      passwordHash: tempPassword, // This will be hashed by the User model pre-save hook
    });
  } else {
    // If user exists, check if they are already an employee or have a role conflict
    if (user.role !== UserRole.EMPLOYEE && user.role !== UserRole.CUSTOMER) {
      return next(new AppError('User with this email already has a different role', 400));
    }

    // Update user role to employee if they were a customer
    if (user.role === UserRole.CUSTOMER) {
      user.role = UserRole.EMPLOYEE;
      await user.save();
    }
  }

  // Generate unique employee ID (format: EMP-XXXXX)
  const employeeCount = await Employee.countDocuments({ vendorId });
  const employeeId = `EMP-${(employeeCount + 1).toString().padStart(5, '0')}`;

  // Create employee record
  const employee = await Employee.create({
    vendorId,
    userId: user._id,
    employeeId,
    firstName,
    lastName,
    email,
    phone,
    role,
    permissions: permissions || [],
    assignedEvents: assignedEvents || [],
    assignedVenues: assignedVenues || [],
    status: 'active',
    emergencyContact,
    hiredAt: hiredAt || new Date(),
  });

  // Populate the created employee
  const populatedEmployee = await Employee.findById(employee._id)
    .populate('userId', 'firstName lastName email phone avatar status')
    .populate('assignedEvents', 'title startDate endDate category')
    .populate('assignedVenues', 'name location');

  // Send welcome email with credentials (only if a new user was created with temp password)
  if (tempPassword) {
    try {
      // Fetch vendor details to get vendor name
      const vendor = await User.findById(vendorId).select('firstName lastName');
      const vendorName = vendor
        ? `${vendor.firstName} ${vendor.lastName}`
        : 'Your Employer';

      // Send welcome email to employee
      await emailService.sendEmployeeWelcomeEmail({
        to: email,
        firstName,
        lastName,
        employeeId,
        email,
        temporaryPassword: tempPassword,
        vendorName,
        role,
      });

      console.log(`Welcome email sent to employee: ${email}`);
    } catch (emailError) {
      // Log error but don't fail employee creation
      console.error('Failed to send welcome email:', emailError);
      // Optionally, you could add a flag to the response indicating email wasn't sent
    }
  }

  res.status(201).json({
    success: true,
    message: tempPassword
      ? 'Employee created successfully. Welcome email sent with login credentials.'
      : 'Employee created successfully.',
    data: { employee: populatedEmployee },
  });
});

// @desc    Update employee
// @route   PUT /api/vendors/employees/:id
// @access  Private (Vendor only)
export const updateVendorEmployee = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Find employee belonging to this vendor
  const employee = await Employee.findOne({ _id: id, vendorId });

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  // Extract updatable fields
  const {
    firstName,
    lastName,
    phone,
    role,
    permissions,
    assignedEvents,
    assignedVenues,
    status,
    emergencyContact,
  } = req.body;

  // Prepare updates
  const updates: any = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (phone !== undefined) updates.phone = phone;
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (assignedEvents !== undefined) updates.assignedEvents = assignedEvents;
  if (assignedVenues !== undefined) updates.assignedVenues = assignedVenues;
  if (status !== undefined) updates.status = status;
  if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;

  // Update employee
  const updatedEmployee = await Employee.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate('userId', 'firstName lastName email phone avatar status')
    .populate('assignedEvents', 'title startDate endDate category location')
    .populate('assignedVenues', 'name location');

  // Also update the user record if name or phone changed
  if (firstName !== undefined || lastName !== undefined || phone !== undefined) {
    const userUpdates: any = {};
    if (firstName !== undefined) userUpdates.firstName = firstName;
    if (lastName !== undefined) userUpdates.lastName = lastName;
    if (phone !== undefined) userUpdates.phone = phone;

    await User.findByIdAndUpdate(employee.userId, { $set: userUpdates });
  }

  res.status(200).json({
    success: true,
    message: 'Employee updated successfully',
    data: { employee: updatedEmployee },
  });
});

// @desc    Delete/deactivate employee
// @route   DELETE /api/vendors/employees/:id
// @access  Private (Vendor only)
export const deleteVendorEmployee = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;
  const { hard } = req.query;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  // Find employee belonging to this vendor
  const employee = await Employee.findOne({ _id: id, vendorId });

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  if (hard === 'true') {
    // Hard delete - permanently remove employee
    await Employee.findByIdAndDelete(id);

    // Optionally deactivate the user account as well
    await User.findByIdAndUpdate(employee.userId, { status: 'inactive' });

    res.status(200).json({
      success: true,
      message: 'Employee permanently deleted',
      data: null,
    });
  } else {
    // Soft delete - just set status to inactive
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Employee deactivated successfully',
      data: { employee: updatedEmployee },
    });
  }
});

// @desc    Assign employee to one or more events
// @route   POST /api/vendors/employees/:id/assign-event
// @access  Private (Vendor only)
export const assignEmployeeToEvent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;
  const { eventIds } = req.body;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    return next(new AppError('eventIds array is required and must not be empty', 400));
  }

  // Validate all event IDs are valid ObjectIds
  const invalidIds = eventIds.filter(eid => !mongoose.Types.ObjectId.isValid(eid));
  if (invalidIds.length > 0) {
    return next(new AppError(`Invalid event IDs: ${invalidIds.join(', ')}`, 400));
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find employee belonging to this vendor
    const employee = await Employee.findOne({ _id: id, vendorId }).session(session);
    if (!employee) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Employee not found', 404));
    }

    // Verify all events belong to this vendor
    const events = await Event.find({
      _id: { $in: eventIds },
      vendorId
    }).session(session);

    if (events.length !== eventIds.length) {
      const foundEventIds = events.map(e => e._id.toString());
      const notFoundIds = eventIds.filter(eid => !foundEventIds.includes(eid.toString()));
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(`Events not found or do not belong to you: ${notFoundIds.join(', ')}`, 404));
    }

    // Add events to assigned events (avoid duplicates)
    const currentEventIds = employee.assignedEvents.map(e => e.toString());
    const newEventIds = eventIds.filter(eid => !currentEventIds.includes(eid.toString()));

    if (newEventIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: 'All events are already assigned to this employee',
        data: {
          employee: await Employee.findById(id)
            .populate('userId', 'firstName lastName email phone avatar')
            .populate('assignedEvents', 'title startDate endDate category location')
        },
      });
    }

    // Update employee with new events
    employee.assignedEvents.push(...newEventIds);
    await employee.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Populate and return
    const updatedEmployee = await Employee.findById(id)
      .populate('userId', 'firstName lastName email phone avatar')
      .populate('assignedEvents', 'title startDate endDate category location');

    res.status(200).json({
      success: true,
      message: `Employee assigned to ${newEventIds.length} event(s) successfully`,
      data: { employee: updatedEmployee },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Remove employee from an event
// @route   POST /api/vendors/employees/:id/remove-event
// @access  Private (Vendor only)
export const removeEmployeeFromEvent = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;
  const { eventId } = req.body;

  if (!userId) {
    return next(new AppError('User ID not found', 401));
  }

  // Get vendor profile to get Vendor._id
  const vendorProfile = await getOrCreateVendorProfile(userId);
  const vendorId = vendorProfile._id;

  if (!eventId) {
    return next(new AppError('Event ID is required', 400));
  }

  // Find employee belonging to this vendor
  const employee = await Employee.findOne({ _id: id, vendorId });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  // Remove event from assigned events
  employee.assignedEvents = employee.assignedEvents.filter(
    (event) => event.toString() !== eventId
  );
  await employee.save();

  // Populate and return
  const updatedEmployee = await Employee.findById(id)
    .populate('userId', 'firstName lastName email phone avatar')
    .populate('assignedEvents', 'title startDate endDate category location');

  res.status(200).json({
    success: true,
    message: 'Employee removed from event successfully',
    data: { employee: updatedEmployee },
  });
});

// @desc    Export vendor employees to CSV or JSON
// @route   POST /api/vendors/employees/export
// @access  Private (Vendor only)
export const exportVendorEmployees = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vendorId = req.user?._id || req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

  const { format = 'csv', filters = {} } = req.body;

  // Build filter query
  const filter: any = { vendorId };

  // Apply filters from request body
  if (filters.role) filter.role = filters.role;
  if (filters.status) filter.status = filters.status;
  if (filters.assignedEvent) filter.assignedEvents = filters.assignedEvent;
  if (filters.search) {
    const searchRegex = new RegExp(filters.search as string, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { employeeId: searchRegex },
    ];
  }

  // Fetch all matching employees
  const employees = await Employee.find(filter)
    .populate('userId', 'firstName lastName email phone status')
    .populate('assignedEvents', 'title')
    .sort({ createdAt: -1 })
    .lean();

  if (format === 'json') {
    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="employees-${Date.now()}.json"`);
    return res.json({
      success: true,
      data: employees,
      exportedAt: new Date(),
      totalRecords: employees.length,
    });
  } else {
    // CSV export
    const csvRows: string[] = [];

    // CSV Headers
    csvRows.push([
      'Employee ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Role',
      'Status',
      'Assigned Events',
      'Hired Date',
      'Emergency Contact Name',
      'Emergency Contact Phone',
    ].join(','));

    // CSV Data
    employees.forEach((employee: any) => {
      const assignedEventTitles = employee.assignedEvents
        ? employee.assignedEvents.map((e: any) => e.title || e._id).join('; ')
        : 'None';

      csvRows.push([
        employee.employeeId,
        `"${employee.firstName}"`,
        `"${employee.lastName}"`,
        employee.email,
        employee.phone || 'N/A',
        employee.role,
        employee.status,
        `"${assignedEventTitles}"`,
        employee.hiredAt ? new Date(employee.hiredAt).toLocaleDateString() : 'N/A',
        employee.emergencyContact?.name ? `"${employee.emergencyContact.name}"` : 'N/A',
        employee.emergencyContact?.phone || 'N/A',
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="employees-${Date.now()}.csv"`);
    return res.send(csvContent);
  }
});

// ==================== NEW VENDOR PROFILE ENDPOINTS ====================

// @desc    Send phone verification OTP for vendor
// @route   POST /api/vendors/verify-phone/send
// @access  Private (Vendor only)
export const sendVendorPhoneVerificationOTP = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { phone } = req.body;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!phone) {
    return next(new AppError('Phone number is required', 400));
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Update user with phone verification OTP
  await User.findByIdAndUpdate(userId, {
    'phoneVerification.code': otp,
    'phoneVerification.expiresAt': expiresAt,
  });

  // Send OTP via SMS
  try {
    await smsService.sendSMS(phone, `Your GEMA verification code is: ${otp}. Valid for 10 minutes.`);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return next(new AppError('Failed to send verification code', 500));
  }

  res.status(200).json({
    success: true,
    message: 'Verification code sent successfully',
    data: { expiresAt },
  });
});

// @desc    Verify phone OTP for vendor
// @route   POST /api/vendors/verify-phone/confirm
// @access  Private (Vendor only)
export const verifyVendorPhoneOTP = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { otp } = req.body;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!otp) {
    return next(new AppError('Verification code is required', 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if OTP is valid
  if (
    !user.phoneVerification?.code ||
    user.phoneVerification.code !== otp ||
    !user.phoneVerification.expiresAt ||
    user.phoneVerification.expiresAt < new Date()
  ) {
    return next(new AppError('Invalid or expired verification code', 400));
  }

  // Mark phone as verified
  user.isPhoneVerified = true;
  user.phoneVerification = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Phone verified successfully',
    data: { isPhoneVerified: true },
  });
});

// @desc    Update vendor bank details
// @route   PUT /api/vendors/bank-details
// @access  Private (Vendor only)
export const updateVendorBankDetails = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const { accountHolderName, bankName, accountNumber, routingNumber, iban, swiftCode, accountType, country } = req.body;

  // Validate required fields
  if (!accountHolderName || !bankName || !accountNumber || !country) {
    return next(new AppError('Account holder name, bank name, account number, and country are required', 400));
  }

  // Get vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  // Update bank details in paymentSettings
  if (!vendor.paymentSettings.bankAccountDetails) {
    vendor.paymentSettings.bankAccountDetails = {};
  }

  vendor.paymentSettings.bankAccountDetails = {
    accountHolderName,
    bankName,
    accountNumber,
    routingNumber,
    iban,
    swiftCode,
    isVerified: false,
  };

  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Bank details updated successfully',
    data: { bankAccountDetails: vendor.paymentSettings.bankAccountDetails },
  });
});

// @desc    Upload vendor verification document
// @route   POST /api/vendors/documents/upload
// @access  Private (Vendor only)
export const uploadVendorDocument = [
  uploadSingle('document'),
  catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?._id || req.user?.id;
    const { type } = req.body; // businessLicense, taxCertificate, identityDocument

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    if (!req.file) {
      return next(new AppError('No document file provided', 400));
    }

    if (!type || !['businessLicense', 'taxCertificate', 'identityDocument'].includes(type)) {
      return next(new AppError('Valid document type is required (businessLicense, taxCertificate, identityDocument)', 400));
    }

    const fileInfo = getFileInfo(req.file);

    // Get vendor profile
    const vendor = await getOrCreateVendorProfile(userId);

    // Initialize verificationDocuments if not exists
    if (!vendor.verificationDocuments) {
      vendor.verificationDocuments = {};
    }

    // Update document
    vendor.verificationDocuments[type] = {
      url: fileInfo.url,
      status: VerificationStatus.PENDING,
      uploadedAt: new Date(),
    };

    // If this is the first document upload, update verification status to pending
    if (vendor.verificationStatus === VerificationStatus.UNVERIFIED) {
      vendor.verificationStatus = VerificationStatus.PENDING;
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        type,
        document: vendor.verificationDocuments[type],
      },
    });
  }),
];

// @desc    Delete vendor verification document
// @route   DELETE /api/vendors/documents/:type
// @access  Private (Vendor only)
export const deleteVendorDocument = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;
  const { type } = req.params;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!type || !['businessLicense', 'taxCertificate', 'identityDocument'].includes(type)) {
    return next(new AppError('Valid document type is required', 400));
  }

  // Get vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  if (!vendor.verificationDocuments || !vendor.verificationDocuments[type]) {
    return next(new AppError('Document not found', 404));
  }

  // Delete document
  vendor.verificationDocuments[type] = undefined;
  await vendor.save();

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
  });
});

// @desc    Get vendor documents status
// @route   GET /api/vendors/documents
// @access  Private (Vendor only)
export const getVendorDocuments = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  // Transform documents to array format
  const documents = [];
  if (vendor.verificationDocuments) {
    ['businessLicense', 'taxCertificate', 'identityDocument'].forEach((type) => {
      const doc = vendor.verificationDocuments[type];
      if (doc && doc.url) {
        documents.push({
          type,
          url: doc.url,
          status: doc.status || 'not_uploaded',
          uploadedAt: doc.uploadedAt,
          rejectionReason: doc.rejectionReason,
        });
      } else {
        documents.push({
          type,
          status: 'not_uploaded',
        });
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Documents retrieved successfully',
    data: { documents },
  });
});

// @desc    Initialize Stripe Connect onboarding
// @route   POST /api/vendors/stripe-connect/onboard
// @access  Private (Vendor only)
export const initializeStripeConnectOnboarding = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // TODO: Implement Stripe Connect account creation and onboarding link generation
  // This is a placeholder implementation
  res.status(200).json({
    success: true,
    message: 'Stripe Connect onboarding initialized',
    data: {
      url: 'https://connect.stripe.com/setup/placeholder', // Replace with actual Stripe onboarding URL
    },
  });
});

// @desc    Get Stripe Connect account status
// @route   GET /api/vendors/stripe-connect/status
// @access  Private (Vendor only)
export const getStripeConnectStatus = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Get vendor profile
  const vendor = await getOrCreateVendorProfile(userId);

  // Check if Stripe is connected
  const stripeSettings = vendor.paymentSettings?.stripeSettings;
  const isConnected = !!stripeSettings?.stripeConnectAccountId;

  res.status(200).json({
    success: true,
    message: 'Stripe Connect status retrieved',
    data: {
      isConnected,
      accountId: stripeSettings?.stripeConnectAccountId,
      onboardingComplete: stripeSettings?.stripeConnectOnboardingComplete || false,
      chargesEnabled: stripeSettings?.stripeConnectCapabilities?.card_payments === 'active',
      payoutsEnabled: stripeSettings?.stripeConnectCapabilities?.transfers === 'active',
      detailsSubmitted: stripeSettings?.stripeConnectOnboardingComplete || false,
    },
  });
});