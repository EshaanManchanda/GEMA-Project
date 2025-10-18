import { Event, Booking, IBooking, User, Order } from '../models';
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
  const vendorId = req.user?.id;
  const { id } = req.params;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

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
  const vendorId = req.user?.id;
  const { id } = req.params;
  const { vendorNotes, vendorStatus, isFulfilled } = req.body;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

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
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

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
  const vendorId = req.user?.id;

  if (!vendorId) {
    return next(new AppError('Vendor ID not found', 401));
  }

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

// @desc    Get vendor payment information (public endpoint for booking flow)
// @route   GET /api/vendors/:vendorId/payment-info
// @access  Public
export const getVendorPaymentInfo = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { vendorId } = req.params;

  if (!vendorId) {
    return next(new AppError('Vendor ID is required', 400));
  }

  // Fetch vendor with payment settings
  // IMPORTANT: Only select safe fields - never expose secret keys
  const vendor = await User.findById(vendorId)
    .select('role vendorPaymentSettings.hasCustomStripeAccount')
    .select('vendorPaymentSettings.stripePublishableKey')
    .select('vendorPaymentSettings.commissionRate');

  // If vendor not found or not a vendor, return platform defaults instead of 404
  // This allows the payment flow to continue with platform payment settings
  if (!vendor || vendor.role !== 'vendor') {
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

  const paymentSettings = vendor.vendorPaymentSettings;

  res.status(200).json({
    success: true,
    message: 'Vendor payment information retrieved successfully',
    data: {
      vendorId,
      hasCustomStripe: paymentSettings?.hasCustomStripeAccount || false,
      stripePublishableKey: paymentSettings?.stripePublishableKey || null,
      serviceFeeRate: paymentSettings?.hasCustomStripeAccount ? 0 : (paymentSettings?.commissionRate || 5),
      usePlatformStripe: !paymentSettings?.hasCustomStripeAccount,
    },
  });
});