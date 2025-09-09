# Implementation Guide: Role-Based Dashboard Queries

## Overview
This guide provides practical implementation examples with sample queries, API endpoint patterns, and dashboard-specific aggregations for each user role in the Gema Event Management Platform.

---

## 1. 👨‍👩‍👧‍👦 **Customer Dashboard Implementation**

### 1.1 **Customer Home Dashboard**

#### **API Endpoint:** `GET /api/customer/dashboard`

```javascript
// Controller Implementation
const getCustomerDashboard = async (req, res) => {
  const customerId = req.user._id;
  
  try {
    const [
      upcomingBookings,
      personalizedEvents,
      recentlyViewed,
      stats
    ] = await Promise.all([
      getUpcomingBookings(customerId),
      getPersonalizedRecommendations(customerId),
      getRecentlyViewedEvents(customerId),
      getCustomerStats(customerId)
    ]);

    res.json({
      success: true,
      data: {
        upcomingBookings,
        recommendedEvents: personalizedEvents,
        recentlyViewed,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Upcoming Bookings Query
const getUpcomingBookings = async (customerId) => {
  return await Booking.aggregate([
    {
      $match: {
        customerId: new ObjectId(customerId),
        status: { $in: ['confirmed', 'pending'] },
        selectedDate: { $gte: new Date() }
      }
    },
    {
      $lookup: {
        from: 'events',
        localField: 'eventId',
        foreignField: '_id',
        as: 'event'
      }
    },
    {
      $lookup: {
        from: 'tickets',
        localField: '_id',
        foreignField: 'bookingId',
        as: 'tickets'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    {
      $addFields: {
        event: { $arrayElemAt: ['$event', 0] },
        vendor: { $arrayElemAt: ['$vendor', 0] },
        ticketCount: { $size: '$tickets' },
        daysUntilEvent: {
          $divide: [
            { $subtract: ['$selectedDate', new Date()] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $project: {
        bookingNumber: 1,
        selectedDate: 1,
        numberOfTickets: 1,
        status: 1,
        'pricing.totalAmount': 1,
        daysUntilEvent: 1,
        event: {
          title: 1,
          images: { $arrayElemAt: ['$images', 0] },
          location: 1
        },
        vendor: {
          'vendorProfile.businessName': 1
        },
        tickets: {
          ticketNumber: 1,
          'qrCode.imageUrl': 1,
          attendeeName: 1
        }
      }
    },
    { $sort: { selectedDate: 1 } },
    { $limit: 5 }
  ]);
};

// Personalized Recommendations
const getPersonalizedRecommendations = async (customerId) => {
  const user = await User.findById(customerId).select('customerProfile');
  const { interests = [], kidsAgeGroups = [], savedEvents = [] } = user.customerProfile || {};
  
  return await Event.aggregate([
    {
      $match: {
        isApproved: true,
        isDeleted: false,
        _id: { $nin: savedEvents }, // Exclude already saved events
        $or: [
          { category: { $in: interests } },
          {
            $and: [
              { 'ageRange.0': { $lte: Math.max(...kidsAgeGroups) } },
              { 'ageRange.1': { $gte: Math.min(...kidsAgeGroups) } }
            ]
          }
        ],
        'dateSchedule.date': { $gte: new Date() }
      }
    },
    {
      $addFields: {
        recommendationScore: {
          $add: [
            { $cond: [{ $in: ['$category', interests] }, 10, 0] },
            { $multiply: ['$metrics.averageRating', 2] },
            { $divide: ['$metrics.bookingsCount', 10] }
          ]
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    {
      $project: {
        title: 1,
        images: { $arrayElemAt: ['$images', 0] },
        'pricing.basePrice': 1,
        'pricing.currency': 1,
        'location.city': 1,
        'metrics.averageRating': 1,
        recommendationScore: 1,
        vendor: {
          'vendorProfile.businessName': 1
        }
      }
    },
    { $sort: { recommendationScore: -1 } },
    { $limit: 8 }
  ]);
};

// Customer Statistics
const getCustomerStats = async (customerId) => {
  return await Booking.aggregate([
    { $match: { customerId: new ObjectId(customerId) } },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalSpent: { $sum: '$pricing.totalAmount' },
        completedEvents: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        upcomingEvents: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$status', ['confirmed', 'pending']] },
                  { $gte: ['$selectedDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};
```

### 1.2 **Event Search and Discovery**

#### **API Endpoint:** `GET /api/events/search`

```javascript
const searchEvents = async (req, res) => {
  const {
    query,
    category,
    city,
    minAge,
    maxAge,
    minPrice,
    maxPrice,
    date,
    lat,
    lng,
    radius = 10000, // 10km default
    page = 0,
    limit = 20,
    sortBy = 'relevance'
  } = req.query;

  const customerId = req.user?._id;

  try {
    const pipeline = [];

    // 1. Geographic filtering (if coordinates provided)
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: parseInt(radius),
          spherical: true,
          query: {
            isApproved: true,
            isDeleted: false
          }
        }
      });
    } else {
      // Standard match if no geo filtering
      pipeline.push({
        $match: {
          isApproved: true,
          isDeleted: false
        }
      });
    }

    // 2. Text search
    if (query) {
      pipeline.push({
        $match: {
          $text: { $search: query }
        }
      });
      pipeline.push({
        $addFields: {
          searchScore: { $meta: 'textScore' }
        }
      });
    }

    // 3. Apply filters
    const matchConditions = {};
    
    if (category) matchConditions.category = new ObjectId(category);
    if (city) matchConditions['location.city'] = new RegExp(city, 'i');
    if (minAge || maxAge) {
      matchConditions.$and = [];
      if (minAge) matchConditions.$and.push({ 'ageRange.1': { $gte: parseInt(minAge) } });
      if (maxAge) matchConditions.$and.push({ 'ageRange.0': { $lte: parseInt(maxAge) } });
    }
    if (minPrice || maxPrice) {
      matchConditions['pricing.basePrice'] = {};
      if (minPrice) matchConditions['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) matchConditions['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }
    if (date) {
      const searchDate = new Date(date);
      matchConditions['dateSchedule.date'] = {
        $gte: searchDate,
        $lt: new Date(searchDate.getTime() + 24 * 60 * 60 * 1000)
      };
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // 4. Lookup related data
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      }
    );

    // 5. Add computed fields
    pipeline.push({
      $addFields: {
        vendor: { $arrayElemAt: ['$vendor', 0] },
        categoryInfo: { $arrayElemAt: ['$categoryInfo', 0] },
        availableSlots: {
          $sum: '$dateSchedule.timeSlots.availableSeats'
        },
        isInWishlist: customerId ? {
          $in: ['$_id', `$customerProfile.savedEvents`]
        } : false
      }
    });

    // 6. Sorting
    const sortStage = {};
    switch (sortBy) {
      case 'price_low':
        sortStage['pricing.basePrice'] = 1;
        break;
      case 'price_high':
        sortStage['pricing.basePrice'] = -1;
        break;
      case 'rating':
        sortStage['metrics.averageRating'] = -1;
        break;
      case 'popularity':
        sortStage['metrics.bookingsCount'] = -1;
        break;
      case 'date':
        sortStage['dateSchedule.date'] = 1;
        break;
      default: // relevance
        if (query) {
          sortStage.searchScore = { $meta: 'textScore' };
        } else {
          sortStage['metrics.averageRating'] = -1;
          sortStage['metrics.bookingsCount'] = -1;
        }
    }
    pipeline.push({ $sort: sortStage });

    // 7. Pagination
    pipeline.push(
      { $skip: parseInt(page) * parseInt(limit) },
      { $limit: parseInt(limit) }
    );

    // 8. Final projection
    pipeline.push({
      $project: {
        title: 1,
        description: 1,
        images: { $arrayElemAt: ['$images', 0] },
        'pricing.basePrice': 1,
        'pricing.currency': 1,
        'location.city': 1,
        'location.address': 1,
        ageRange: 1,
        'metrics.averageRating': 1,
        'metrics.totalReviews': 1,
        availableSlots: 1,
        distance: 1,
        isInWishlist: 1,
        vendor: {
          'vendorProfile.businessName': 1
        },
        categoryInfo: {
          name: 1
        }
      }
    });

    const events = await Event.aggregate(pipeline);
    
    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: events.length
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## 2. 🏪 **Vendor Dashboard Implementation**

### 2.1 **Vendor Analytics Dashboard**

#### **API Endpoint:** `GET /api/vendor/dashboard`

```javascript
const getVendorDashboard = async (req, res) => {
  const vendorId = req.user._id;
  
  try {
    const [
      businessMetrics,
      recentBookings,
      eventPerformance,
      financialSummary,
      upcomingEvents
    ] = await Promise.all([
      getBusinessMetrics(vendorId),
      getRecentBookings(vendorId),
      getEventPerformance(vendorId),
      getFinancialSummary(vendorId),
      getUpcomingEvents(vendorId)
    ]);

    res.json({
      success: true,
      data: {
        metrics: businessMetrics,
        recentBookings,
        eventPerformance,
        financialSummary,
        upcomingEvents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Business Metrics Overview
const getBusinessMetrics = async (vendorId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return await Booking.aggregate([
    { $match: { vendorId: new ObjectId(vendorId) } },
    {
      $facet: {
        // Overall metrics
        overall: [
          {
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              totalRevenue: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'confirmed'] }, '$pricing.totalAmount', 0]
                }
              },
              averageOrderValue: { $avg: '$pricing.totalAmount' },
              confirmedBookings: {
                $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
              },
              cancelledBookings: {
                $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
              }
            }
          }
        ],
        
        // Last 30 days metrics
        lastThirtyDays: [
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: null,
              recentBookings: { $sum: 1 },
              recentRevenue: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'confirmed'] }, '$pricing.totalAmount', 0]
                }
              }
            }
          }
        ],
        
        // Daily bookings trend
        dailyTrend: [
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              bookings: { $sum: 1 },
              revenue: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'confirmed'] }, '$pricing.totalAmount', 0]
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);
};

// Event Performance Analysis
const getEventPerformance = async (vendorId) => {
  return await Event.aggregate([
    { $match: { vendorId: new ObjectId(vendorId), isDeleted: false } },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'eventId',
        as: 'bookings'
      }
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'eventId',
        pipeline: [{ $match: { status: 'published' } }],
        as: 'reviews'
      }
    },
    {
      $addFields: {
        totalBookings: { $size: '$bookings' },
        confirmedBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              cond: { $eq: ['$$this.status', 'confirmed'] }
            }
          }
        },
        totalRevenue: {
          $sum: {
            $map: {
              input: '$bookings',
              as: 'booking',
              in: {
                $cond: [
                  { $eq: ['$$booking.status', 'confirmed'] },
                  '$$booking.pricing.totalAmount',
                  0
                ]
              }
            }
          }
        },
        averageRating: { $avg: '$reviews.rating' },
        totalReviews: { $size: '$reviews' },
        conversionRate: {
          $cond: [
            { $gt: ['$metrics.viewsCount', 0] },
            {
              $multiply: [
                { $divide: [{ $size: '$bookings' }, '$metrics.viewsCount'] },
                100
              ]
            },
            0
          ]
        }
      }
    },
    {
      $project: {
        title: 1,
        images: { $arrayElemAt: ['$images', 0] },
        submissionStatus: 1,
        totalBookings: 1,
        confirmedBookings: 1,
        totalRevenue: 1,
        averageRating: 1,
        totalReviews: 1,
        conversionRate: 1,
        'metrics.viewsCount': 1
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Financial Summary
const getFinancialSummary = async (vendorId) => {
  return await VendorEarnings.aggregate([
    { $match: { vendorId: new ObjectId(vendorId) } },
    {
      $group: {
        _id: null,
        totalGrossRevenue: { $sum: '$grossRevenue' },
        totalCommissions: { $sum: '$platformCommission' },
        totalNetEarnings: { $sum: '$netEarnings' },
        pendingPayouts: {
          $sum: {
            $cond: [{ $eq: ['$payoutStatus', 'pending'] }, '$netEarnings', 0]
          }
        },
        monthlyBreakdown: {
          $push: {
            month: '$period.month',
            year: '$period.year',
            earnings: '$netEarnings',
            commission: '$platformCommission'
          }
        }
      }
    }
  ]);
};
```

### 2.2 **Event Management Interface**

#### **API Endpoint:** `GET /api/vendor/events`

```javascript
const getVendorEvents = async (req, res) => {
  const vendorId = req.user._id;
  const { 
    status = 'all',
    page = 0, 
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  try {
    const pipeline = [];

    // Base match
    const matchConditions = {
      vendorId: new ObjectId(vendorId),
      isDeleted: false
    };

    if (status !== 'all') {
      matchConditions.submissionStatus = status;
    }

    if (search) {
      matchConditions.$text = { $search: search };
    }

    pipeline.push({ $match: matchConditions });

    // Lookup bookings and reviews
    pipeline.push(
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'eventId',
          as: 'bookings'
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'eventId',
          pipeline: [{ $match: { status: 'published' } }],
          as: 'reviews'
        }
      }
    );

    // Add computed fields
    pipeline.push({
      $addFields: {
        totalBookings: { $size: '$bookings' },
        confirmedBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              cond: { $eq: ['$$this.status', 'confirmed'] }
            }
          }
        },
        totalRevenue: {
          $sum: {
            $map: {
              input: '$bookings',
              as: 'booking',
              in: {
                $cond: [
                  { $eq: ['$$booking.status', 'confirmed'] },
                  '$$booking.pricing.totalAmount',
                  0
                ]
              }
            }
          }
        },
        averageRating: { $avg: '$reviews.rating' },
        reviewCount: { $size: '$reviews' },
        nextEventDate: {
          $min: {
            $filter: {
              input: '$dateSchedule.date',
              cond: { $gte: ['$$this', new Date()] }
            }
          }
        }
      }
    });

    // Sorting
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push(
      { $skip: parseInt(page) * parseInt(limit) },
      { $limit: parseInt(limit) }
    );

    // Final projection
    pipeline.push({
      $project: {
        title: 1,
        description: 1,
        images: { $arrayElemAt: ['$images', 0] },
        submissionStatus: 1,
        'pricing.basePrice': 1,
        'pricing.currency': 1,
        totalBookings: 1,
        confirmedBookings: 1,
        totalRevenue: 1,
        averageRating: 1,
        reviewCount: 1,
        nextEventDate: 1,
        createdAt: 1,
        updatedAt: 1
      }
    });

    const events = await Event.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## 3. 👑 **Admin Dashboard Implementation**

### 3.1 **Admin Overview Dashboard**

#### **API Endpoint:** `GET /api/admin/dashboard`

```javascript
const getAdminDashboard = async (req, res) => {
  try {
    const [
      platformMetrics,
      userGrowth,
      eventModeration,
      financialOverview,
      systemHealth
    ] = await Promise.all([
      getPlatformMetrics(),
      getUserGrowthStats(),
      getEventModerationQueue(),
      getFinancialOverview(),
      getSystemHealth()
    ]);

    res.json({
      success: true,
      data: {
        platformMetrics,
        userGrowth,
        eventModeration,
        financialOverview,
        systemHealth
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Platform Overview Metrics
const getPlatformMetrics = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return await Promise.all([
    // User statistics
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          recentSignups: {
            $sum: { 
              $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] 
            }
          }
        }
      }
    ]),
    
    // Event statistics
    Event.aggregate([
      {
        $group: {
          _id: '$submissionStatus',
          count: { $sum: 1 },
          recentSubmissions: {
            $sum: { 
              $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] 
            }
          }
        }
      }
    ]),
    
    // Booking statistics
    Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          recentBookings: {
            $sum: { 
              $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] 
            }
          }
        }
      }
    ])
  ]);
};

// Event Moderation Queue
const getEventModerationQueue = async () => {
  return await Event.aggregate([
    { 
      $match: { 
        submissionStatus: 'submitted',
        isDeleted: false
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    {
      $addFields: {
        vendor: { $arrayElemAt: ['$vendor', 0] },
        submissionAge: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24
          ]
        },
        vendorTrustScore: {
          $multiply: [
            { $ifNull: ['$vendor.vendorProfile.rating', 3] },
            20
          ]
        }
      }
    },
    {
      $project: {
        title: 1,
        images: { $arrayElemAt: ['$images', 0] },
        'pricing.basePrice': 1,
        submissionAge: 1,
        vendorTrustScore: 1,
        vendor: {
          'vendorProfile.businessName': 1,
          'vendorProfile.verificationStatus': 1
        },
        createdAt: 1
      }
    },
    { $sort: { submissionAge: -1, vendorTrustScore: -1 } },
    { $limit: 10 }
  ]);
};

// Financial Overview
const getFinancialOverview = async () => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  return await PlatformRevenue.aggregate([
    {
      $match: {
        'period.year': currentYear
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $add: ['$commissionRevenue', '$subscriptionRevenue', '$featuredListingRevenue']
          }
        },
        totalCommissions: { $sum: '$commissionRevenue' },
        totalTransactionVolume: { $sum: '$totalTransactionVolume' },
        totalBookings: { $sum: '$totalBookings' },
        monthlyBreakdown: {
          $push: {
            month: '$period.month',
            revenue: {
              $add: ['$commissionRevenue', '$subscriptionRevenue', '$featuredListingRevenue']
            },
            commissions: '$commissionRevenue',
            transactionVolume: '$totalTransactionVolume'
          }
        }
      }
    }
  ]);
};
```

### 3.2 **User Management Interface**

#### **API Endpoint:** `GET /api/admin/users`

```javascript
const getUsers = async (req, res) => {
  const {
    role,
    status,
    search,
    verificationStatus,
    page = 0,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  try {
    const pipeline = [];

    // Build match conditions
    const matchConditions = {};
    
    if (role) matchConditions.role = role;
    if (status) matchConditions.status = status;
    if (verificationStatus && role === 'vendor') {
      matchConditions['vendorProfile.verificationStatus'] = verificationStatus;
    }
    
    if (search) {
      matchConditions.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    pipeline.push({ $match: matchConditions });

    // Add business metrics for vendors
    pipeline.push({
      $lookup: {
        from: 'vendorearnings',
        localField: '_id',
        foreignField: 'vendorId',
        as: 'earnings'
      }
    });

    pipeline.push({
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: 'vendorId',
        as: 'events'
      }
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        fullName: { $concat: ['$firstName', ' ', '$lastName'] },
        totalEarnings: { $sum: '$earnings.netEarnings' },
        totalEvents: { $size: '$events' },
        activeEvents: {
          $size: {
            $filter: {
              input: '$events',
              cond: { 
                $and: [
                  { $eq: ['$$this.isApproved', true] },
                  { $eq: ['$$this.isDeleted', false] }
                ]
              }
            }
          }
        }
      }
    });

    // Sorting
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push(
      { $skip: parseInt(page) * parseInt(limit) },
      { $limit: parseInt(limit) }
    );

    // Final projection
    pipeline.push({
      $project: {
        fullName: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        role: 1,
        status: 1,
        isEmailVerified: 1,
        createdAt: 1,
        lastLogin: 1,
        // Vendor-specific fields
        'vendorProfile.businessName': 1,
        'vendorProfile.verificationStatus': 1,
        'vendorProfile.subscriptionPlan': 1,
        totalEarnings: 1,
        totalEvents: 1,
        activeEvents: 1,
        // Customer-specific fields
        'customerProfile.interests': 1,
        // Employee-specific fields
        'employeeProfile.position': 1,
        'employeeProfile.isActive': 1
      }
    });

    const users = await User.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## 4. 👷 **Employee Dashboard Implementation**

### 4.1 **Employee Check-in Interface**

#### **API Endpoint:** `GET /api/employee/events/today`

```javascript
const getTodayEvents = async (req, res) => {
  const employeeId = req.user._id;
  
  try {
    // Get employee info and assigned vendor
    const employee = await Employee.findOne({ 
      userId: employeeId,
      isActive: true 
    }).populate('assignedVendor');
    
    if (!employee) {
      return res.status(403).json({ 
        success: false, 
        error: 'Employee access not found' 
      });
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const events = await Event.aggregate([
      {
        $match: {
          vendorId: employee.assignedVendor._id,
          isApproved: true,
          isDeleted: false,
          'dateSchedule.date': {
            $gte: startOfToday,
            $lte: endOfToday
          }
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'eventId',
          pipeline: [
            {
              $match: {
                status: 'confirmed',
                selectedDate: {
                  $gte: startOfToday,
                  $lte: endOfToday
                }
              }
            }
          ],
          as: 'todayBookings'
        }
      },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: 'eventId',
          as: 'allTickets'
        }
      },
      {
        $addFields: {
          todayTickets: {
            $filter: {
              input: '$allTickets',
              cond: {
                $and: [
                  { $eq: ['$$this.status', 'active'] },
                  { $in: ['$$this.bookingId', '$todayBookings._id'] }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          totalExpectedAttendees: { $size: '$todayTickets' },
          checkedInAttendees: {
            $size: {
              $filter: {
                input: '$todayTickets',
                cond: { $eq: ['$$this.checkIn.isCheckedIn', true] }
              }
            }
          }
        }
      },
      {
        $project: {
          title: 1,
          'location.address': 1,
          dateSchedule: {
            $filter: {
              input: '$dateSchedule',
              cond: {
                $and: [
                  { $gte: ['$$this.date', startOfToday] },
                  { $lte: ['$$this.date', endOfToday] }
                ]
              }
            }
          },
          totalExpectedAttendees: 1,
          checkedInAttendees: 1,
          attendanceRate: {
            $cond: [
              { $gt: ['$totalExpectedAttendees', 0] },
              {
                $multiply: [
                  { $divide: ['$checkedInAttendees', '$totalExpectedAttendees'] },
                  100
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        employee: {
          name: `${employee.userId.firstName} ${employee.userId.lastName}`,
          position: employee.position,
          vendor: employee.assignedVendor.vendorProfile.businessName
        },
        events
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 4.2 **QR Code Validation**

#### **API Endpoint:** `POST /api/employee/checkin`

```javascript
const validateAndCheckIn = async (req, res) => {
  const { qrCode, location, notes } = req.body;
  const employeeId = req.user._id;

  try {
    // Start transaction for atomic operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find ticket by QR code
      const ticket = await Ticket.findOne({
        'qrCode.code': qrCode,
        'qrCode.isValid': true,
        status: 'active'
      }).populate(['eventId', 'bookingId', 'customerId']).session(session);

      if (!ticket) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired ticket'
        });
      }

      // 2. Verify employee access
      const employee = await Employee.findOne({ 
        userId: employeeId,
        isActive: true 
      }).session(session);

      if (!employee || ticket.eventId.vendorId.toString() !== employee.assignedVendor.toString()) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          error: 'Access denied for this event'
        });
      }

      // 3. Check if already checked in
      if (ticket.checkIn.isCheckedIn) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Ticket already used',
          checkInTime: ticket.checkIn.checkedInAt
        });
      }

      // 4. Perform check-in
      const now = new Date();
      
      await Ticket.updateOne(
        { _id: ticket._id },
        {
          $set: {
            'checkIn.isCheckedIn': true,
            'checkIn.checkedInAt': now,
            'checkIn.checkedInBy': employeeId,
            'checkIn.location': location,
            'checkIn.notes': notes,
            status: 'used'
          }
        },
        { session }
      );

      // 5. Log the check-in
      await CheckinLog.create([{
        employeeId: employeeId,
        ticketId: ticket._id,
        eventId: ticket.eventId._id,
        customerId: ticket.customerId._id,
        checkinTime: now,
        checkinLocation: location,
        notes: notes
      }], { session });

      await session.commitTransaction();

      // 6. Return success response
      res.json({
        success: true,
        data: {
          customerName: ticket.attendeeName,
          eventTitle: ticket.eventId.title,
          checkInTime: now,
          ticketNumber: ticket.ticketNumber
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## 5. **Real-time Features Implementation**

### 5.1 **WebSocket Integration for Real-time Updates**

```javascript
// WebSocket server setup
const setupWebSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST']
    }
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const user = socket.user;
    
    // Join role-based rooms
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);
    
    if (user.role === 'vendor') {
      socket.join(`vendor:${user._id}`);
    }
    
    if (user.role === 'employee') {
      socket.join(`employee:${user._id}`);
    }

    // Handle real-time booking updates
    socket.on('subscribe:bookings', (vendorId) => {
      if (user.role === 'vendor' && user._id.toString() === vendorId) {
        socket.join(`vendor:${vendorId}:bookings`);
      }
    });

    // Handle check-in updates
    socket.on('subscribe:checkins', (eventId) => {
      socket.join(`event:${eventId}:checkins`);
    });
  });

  return io;
};

// Real-time notification service
const sendRealTimeNotification = (io, notification) => {
  const { recipientId, recipientRole, type, data } = notification;
  
  // Send to specific user
  if (recipientId) {
    io.to(`user:${recipientId}`).emit('notification', {
      type,
      data,
      timestamp: new Date()
    });
  }
  
  // Send to role-based rooms
  if (recipientRole) {
    io.to(`role:${recipientRole}`).emit('notification', {
      type,
      data,
      timestamp: new Date()
    });
  }
};

// Booking update notifications
const notifyBookingUpdate = (io, booking) => {
  // Notify vendor
  io.to(`vendor:${booking.vendorId}:bookings`).emit('booking:update', {
    bookingId: booking._id,
    status: booking.status,
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    eventTitle: booking.event.title,
    amount: booking.pricing.totalAmount
  });
  
  // Notify customer
  io.to(`user:${booking.customerId}`).emit('booking:status', {
    bookingId: booking._id,
    status: booking.status,
    message: getBookingStatusMessage(booking.status)
  });
};

// Check-in update notifications
const notifyCheckIn = (io, checkInData) => {
  // Notify event attendees in real-time
  io.to(`event:${checkInData.eventId}:checkins`).emit('checkin:update', {
    attendeeName: checkInData.attendeeName,
    checkInTime: checkInData.checkInTime,
    totalCheckedIn: checkInData.totalCheckedIn,
    totalExpected: checkInData.totalExpected
  });
};
```

### 5.2 **Caching Strategy with Redis**

```javascript
// Redis caching service
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

const CacheService = {
  // Cache popular events
  getCachedEvents: async (cacheKey) => {
    const cached = await client.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  },

  setCachedEvents: async (cacheKey, events, ttl = 300) => {
    await client.setex(cacheKey, ttl, JSON.stringify(events));
  },

  // Cache user sessions
  cacheUserSession: async (userId, sessionData) => {
    await client.setex(`session:${userId}`, 3600, JSON.stringify(sessionData));
  },

  // Cache booking holds
  setBookingHold: async (holdId, holdData) => {
    await client.setex(`hold:${holdId}`, 900, JSON.stringify(holdData)); // 15 minutes
  },

  getBookingHold: async (holdId) => {
    const hold = await client.get(`hold:${holdId}`);
    return hold ? JSON.parse(hold) : null;
  },

  // Cache frequently accessed vendor data
  cacheVendorStats: async (vendorId, stats) => {
    await client.setex(`vendor:${vendorId}:stats`, 1800, JSON.stringify(stats));
  }
};

// Middleware for caching API responses
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    const cacheKey = `api:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      const cached = await CacheService.getCachedEvents(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          CacheService.setCachedEvents(cacheKey, data, ttl);
        }
        originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};
```

This comprehensive implementation guide provides production-ready code examples for all role-based features, optimized database queries, real-time functionality, and caching strategies to ensure your platform scales efficiently.