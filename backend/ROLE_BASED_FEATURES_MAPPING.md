# Role-Based Features to Database Operations Mapping

## Overview
This document maps all role-based features for the Gema Event Management Platform to specific database operations, providing clear guidance for API implementation and data access patterns.

---

## 1. 👨‍👩‍👧‍👦 **CUSTOMER Features**

### 1.1 Account Management

#### **Feature: Sign up / Login with email, social, OTP**
**Database Operations:**
```javascript
// User Registration
Users.create({
  firstName, lastName, email, passwordHash,
  role: 'customer',
  status: 'pending', // Until email verified
  socialLogins: [{ provider: 'google', providerId: 'xxx' }], // if social
  emailVerification: { otp: '1234', expiresAt: Date },
  firebaseUid: 'xxx' // if using Firebase
});

// Login Session Creation
UserSessions.create({
  userId: ObjectId,
  token: 'hashed_jwt_token',
  deviceInfo: { userAgent, platform, browser, ip },
  expiresAt: Date
});

// OTP Verification
Users.updateOne(
  { email: 'user@example.com', 'emailVerification.otp': '1234' },
  { 
    isEmailVerified: true, 
    status: 'active',
    $unset: { emailVerification: 1 }
  }
);
```

#### **Feature: Profile management (kids' age, interests, saved events)**
**Database Operations:**
```javascript
// Update Customer Profile
Users.updateOne(
  { _id: userId, role: 'customer' },
  {
    $set: {
      'customerProfile.kidsAgeGroups': [3, 6, 9], // Age brackets
      'customerProfile.interests': ['sports', 'arts', 'music'],
      'customerProfile.preferredLanguage': 'en'
    }
  }
);

// Save/Unsave Events (Wishlist)
Users.updateOne(
  { _id: userId },
  { $addToSet: { 'customerProfile.savedEvents': eventId } }
);

Users.updateOne(
  { _id: userId },
  { $pull: { 'customerProfile.savedEvents': eventId } }
);

// Get Customer Profile with Saved Events
Users.aggregate([
  { $match: { _id: userId } },
  {
    $lookup: {
      from: 'events',
      localField: 'customerProfile.savedEvents',
      foreignField: '_id',
      as: 'wishlistEvents'
    }
  },
  {
    $project: {
      customerProfile: 1,
      wishlistEvents: {
        title: 1, price: 1, images: 1, location: 1
      }
    }
  }
]);
```

### 1.2 Event Discovery

#### **Feature: Browse/search/filter events**
**Database Operations:**
```javascript
// Advanced Event Search with Filters
Events.aggregate([
  // Text search
  { $match: { $text: { $search: "birthday party" } } },
  
  // Filters
  {
    $match: {
      isApproved: true,
      isDeleted: false,
      'location.city': 'Dubai', // City filter
      'ageRange.0': { $lte: 6 }, // Min age <= 6
      'ageRange.1': { $gte: 6 }, // Max age >= 6
      price: { $gte: 50, $lte: 200 }, // Price range
      category: { $in: categoryIds }, // Category filter
      'dateSchedule.date': { $gte: new Date() }, // Future events
      tags: { $in: ['outdoor', 'family-friendly'] } // Tags filter
    }
  },
  
  // Location-based search (within radius)
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [55.2708, 25.2048] }, // Dubai coords
      distanceField: 'distance',
      maxDistance: 10000, // 10km radius
      spherical: true
    }
  },
  
  // Lookup vendor info
  {
    $lookup: {
      from: 'users',
      localField: 'vendorId',
      foreignField: '_id',
      as: 'vendor'
    }
  },
  
  // Sort by relevance, then distance
  { $sort: { score: { $meta: 'textScore' }, distance: 1 } },
  
  // Pagination
  { $skip: page * limit },
  { $limit: limit }
]);
```

#### **Feature: Featured & recommended events**
**Database Operations:**
```javascript
// Featured Events
Events.find({
  isFeatured: true,
  isApproved: true,
  isDeleted: false,
  featuredUntil: { $gte: new Date() }
}).sort({ createdAt: -1 });

// Personalized Recommendations
Events.aggregate([
  // Match user's interests and kids' age groups
  {
    $match: {
      isApproved: true,
      isDeleted: false,
      category: { $in: userInterestCategories },
      'ageRange.0': { $lte: Math.max(...userKidsAges) },
      'ageRange.1': { $gte: Math.min(...userKidsAges) }
    }
  },
  
  // Add recommendation score based on:
  // - Category match, age match, location proximity, rating, popularity
  {
    $addFields: {
      recommendationScore: {
        $add: [
          { $cond: [{ $in: ['$category', userInterests] }, 10, 0] }, // Interest match
          { $multiply: ['$metrics.averageRating', 2] }, // Rating boost
          { $divide: ['$metrics.bookingsCount', 10] } // Popularity boost
        ]
      }
    }
  },
  
  { $sort: { recommendationScore: -1 } },
  { $limit: 20 }
]);
```

### 1.3 Booking & Payments

#### **Feature: Book tickets/slots with multiple payment gateways**
**Database Operations:**
```javascript
// 1. Create Booking Hold (prevent double booking)
const hold = await BookingHolds.create({
  eventId: eventId,
  customerId: userId,
  selectedDate: selectedDate,
  numberOfTickets: quantity,
  holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min
});

// 2. Create Booking
const booking = await Bookings.create({
  bookingNumber: generateBookingNumber(),
  customerId: userId,
  eventId: eventId,
  vendorId: event.vendorId,
  selectedDate: selectedDate,
  numberOfTickets: quantity,
  attendees: attendeesInfo,
  pricing: {
    basePrice: event.price * quantity,
    totalAmount: calculatedTotal,
    discountAmount: appliedDiscount,
    taxAmount: calculatedTax
  },
  status: 'pending',
  paymentStatus: 'pending'
});

// 3. Process Payment
const payment = await Payments.create({
  paymentNumber: generatePaymentNumber(),
  bookingId: booking._id,
  customerId: userId,
  vendorId: event.vendorId,
  amount: totalAmount,
  currency: 'AED',
  gateway: selectedGateway, // stripe, paypal
  status: 'processing'
});

// 4. On Payment Success
await Promise.all([
  // Update booking status
  Bookings.updateOne(
    { _id: booking._id },
    { status: 'confirmed', paymentStatus: 'paid' }
  ),
  
  // Update payment status
  Payments.updateOne(
    { _id: payment._id },
    { status: 'completed', processedAt: new Date() }
  ),
  
  // Generate tickets
  ...Array(quantity).map((_, index) => 
    Tickets.create({
      ticketNumber: generateTicketNumber(),
      bookingId: booking._id,
      customerId: userId,
      eventId: eventId,
      attendeeName: attendees[index].name,
      qrCode: {
        code: generateUniqueQRCode(),
        imageUrl: await generateQRCodeImage()
      },
      status: 'active'
    })
  ),
  
  // Update event capacity
  Events.updateOne(
    { 
      _id: eventId,
      'dateSchedule.date': selectedDate
    },
    { 
      $inc: { 'dateSchedule.$.bookedSeats': quantity }
    }
  ),
  
  // Remove booking hold
  BookingHolds.deleteOne({ _id: hold._id })
]);
```

#### **Feature: View ticket with QR code & download invoice**
**Database Operations:**
```javascript
// Get Customer's Tickets with QR Codes
Tickets.aggregate([
  { $match: { customerId: userId, status: 'active' } },
  {
    $lookup: {
      from: 'bookings',
      localField: 'bookingId',
      foreignField: '_id',
      as: 'booking'
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
      from: 'payments',
      localField: 'booking.paymentId',
      foreignField: '_id',
      as: 'payment'
    }
  },
  {
    $project: {
      ticketNumber: 1,
      attendeeName: 1,
      qrCode: 1,
      checkIn: 1,
      event: { title: 1, location: 1, dateSchedule: 1 },
      booking: { selectedDate: 1, totalAmount: 1 },
      payment: { paymentNumber: 1, processedAt: 1 }
    }
  }
]);
```

### 1.4 Engagement

#### **Feature: Event ratings & reviews**
**Database Operations:**
```javascript
// Create Review (only after event completion)
Reviews.create({
  userId: userId,
  eventId: eventId,
  bookingId: bookingId,
  rating: 4.5,
  title: "Great experience!",
  content: "The kids loved it...",
  photos: ['cloudinary_url1', 'cloudinary_url2'],
  reviewType: 'event',
  status: 'published'
});

// Update Event Rating Statistics
Events.updateOne(
  { _id: eventId },
  {
    $inc: { 
      'metrics.totalReviews': 1,
    },
    // Calculate new average rating
    $set: {
      'metrics.averageRating': await calculateNewAverageRating(eventId)
    }
  }
);

// Get Event Reviews with Pagination
Reviews.aggregate([
  { $match: { eventId: eventId, status: 'published' } },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'customer'
    }
  },
  {
    $project: {
      rating: 1,
      title: 1,
      content: 1,
      photos: 1,
      createdAt: 1,
      customer: { firstName: 1, avatar: 1 }
    }
  },
  { $sort: { createdAt: -1 } },
  { $skip: page * limit },
  { $limit: limit }
]);
```

### 1.5 Customer Dashboard

#### **Feature: Upcoming & past bookings**
**Database Operations:**
```javascript
// Customer Dashboard - Upcoming Bookings
Bookings.aggregate([
  { 
    $match: { 
      customerId: userId,
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
    $sort: { selectedDate: 1 }
  }
]);

// Past Bookings
Bookings.aggregate([
  { 
    $match: { 
      customerId: userId,
      status: 'completed',
      selectedDate: { $lt: new Date() }
    }
  },
  // Similar lookup structure...
  { $sort: { selectedDate: -1 } }
]);

// Booking Statistics
Bookings.aggregate([
  { $match: { customerId: userId } },
  {
    $group: {
      _id: null,
      totalBookings: { $sum: 1 },
      totalSpent: { $sum: '$pricing.totalAmount' },
      completedEvents: {
        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
      },
      cancelledBookings: {
        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
      }
    }
  }
]);
```

---

## 2. 🏪 **VENDOR Features**

### 2.1 Account & Verification

#### **Feature: Vendor registration & KYC verification**
**Database Operations:**
```javascript
// Vendor Registration
Users.create({
  firstName, lastName, email, passwordHash,
  role: 'vendor',
  status: 'pending',
  vendorProfile: {
    businessName: 'Amazing Kids Events',
    businessType: 'Event Organizer',
    licenseNumber: 'LIC123456',
    description: 'We organize amazing events...',
    subscriptionPlan: 'basic',
    verificationStatus: 'pending',
    verificationDocuments: [], // Will be uploaded later
    payoutSettings: {
      method: 'bank_transfer',
      minimumPayout: 100
    }
  }
});

// Upload KYC Documents
Users.updateOne(
  { _id: vendorId, role: 'vendor' },
  {
    $push: {
      'vendorProfile.verificationDocuments': {
        type: 'business_license',
        url: cloudinaryUrl,
        uploadedAt: new Date()
      }
    }
  }
);

// Admin Approval
Users.updateOne(
  { _id: vendorId },
  {
    'vendorProfile.verificationStatus': 'verified',
    status: 'active'
  }
);
```

#### **Feature: Subscription plans (basic, premium, enterprise)**
**Database Operations:**
```javascript
// Upgrade Subscription
Users.updateOne(
  { _id: vendorId },
  {
    $set: {
      'vendorProfile.subscriptionPlan': 'premium',
      'vendorProfile.subscriptionExpiresAt': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  }
);

// Check Subscription Features
const vendor = await Users.findById(vendorId);
const subscriptionFeatures = getSubscriptionFeatures(vendor.vendorProfile.subscriptionPlan);
```

### 2.2 Event Management

#### **Feature: Create, edit, manage events**
**Database Operations:**
```javascript
// Create Event
const event = await Events.create({
  title: 'Birthday Party Package',
  description: 'Complete birthday party setup...',
  category: categoryId,
  type: 'event',
  venueType: 'indoor',
  ageRange: [5, 12],
  location: {
    city: 'Dubai',
    address: 'Al Wasl Road, Jumeirah',
    coordinates: { lat: 25.2048, lng: 55.2708 }
  },
  vendorId: vendorId,
  pricing: {
    basePrice: 250,
    currency: 'AED',
    priceType: 'per_child'
  },
  dateSchedule: [{
    date: new Date('2024-12-25'),
    timeSlots: [{
      startTime: '10:00',
      endTime: '12:00',
      availableSeats: 20,
      bookedSeats: 0,
      price: 250
    }]
  }],
  submissionStatus: 'draft',
  images: ['cloudinary_url1', 'cloudinary_url2']
});

// Bulk Event Upload via CSV
const bulkEvents = csvData.map(row => ({
  title: row.title,
  description: row.description,
  vendorId: vendorId,
  // ... other fields mapped from CSV
  submissionStatus: 'draft'
}));

await Events.insertMany(bulkEvents);
```

#### **Feature: Track bookings in real-time**
**Database Operations:**
```javascript
// Vendor Event Dashboard with Real-time Stats
Events.aggregate([
  { $match: { vendorId: vendorId, isDeleted: false } },
  {
    $lookup: {
      from: 'bookings',
      localField: '_id',
      foreignField: 'eventId',
      as: 'bookings'
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
      availableSlots: {
        $sum: '$dateSchedule.timeSlots.availableSeats'
      },
      bookedSlots: {
        $sum: '$dateSchedule.timeSlots.bookedSeats'
      }
    }
  },
  {
    $project: {
      title: 1,
      submissionStatus: 1,
      totalBookings: 1,
      confirmedBookings: 1,
      totalRevenue: 1,
      occupancyRate: {
        $multiply: [
          { $divide: ['$bookedSlots', '$availableSlots'] },
          100
        ]
      }
    }
  }
]);

// Real-time Booking Notifications (via WebSocket/SSE)
// Triggered when new booking is created
const newBooking = await Bookings.findById(bookingId).populate('customerId eventId');
// Send real-time notification to vendor
```

### 2.3 Financial Dashboard

#### **Feature: View sales & commissions**
**Database Operations:**
```javascript
// Vendor Financial Dashboard
VendorEarnings.aggregate([
  { $match: { vendorId: vendorId } },
  {
    $group: {
      _id: null,
      totalGrossRevenue: { $sum: '$grossRevenue' },
      totalCommissions: { $sum: '$platformCommission' },
      totalNetEarnings: { $sum: '$netEarnings' },
      totalProcessingFees: { $sum: '$processingFees' },
      monthlyEarnings: {
        $push: {
          month: '$period.month',
          year: '$period.year',
          earnings: '$netEarnings'
        }
      }
    }
  }
]);

// Commission Breakdown by Event
Events.aggregate([
  { $match: { vendorId: vendorId } },
  {
    $lookup: {
      from: 'bookings',
      localField: '_id',
      foreignField: 'eventId',
      pipeline: [{ $match: { status: 'confirmed' } }],
      as: 'confirmedBookings'
    }
  },
  {
    $addFields: {
      totalRevenue: { $sum: '$confirmedBookings.pricing.totalAmount' },
      estimatedCommission: {
        $multiply: [
          { $sum: '$confirmedBookings.pricing.totalAmount' },
          0.10 // 10% commission rate
        ]
      }
    }
  }
]);

// Payout History
Payouts.find({ vendorId: vendorId })
  .sort({ createdAt: -1 })
  .populate('includedEarnings');
```

### 2.4 Customer Engagement

#### **Feature: Respond to reviews & messaging**
**Database Operations:**
```javascript
// Get Reviews for Vendor's Events
Reviews.aggregate([
  {
    $lookup: {
      from: 'events',
      localField: 'eventId',
      foreignField: '_id',
      as: 'event'
    }
  },
  { $match: { 'event.vendorId': vendorId } },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'customer'
    }
  },
  { $sort: { createdAt: -1 } }
]);

// Respond to Review
Reviews.updateOne(
  { _id: reviewId, 'event.vendorId': vendorId },
  {
    $push: {
      responses: {
        responderId: vendorId,
        responderType: 'vendor',
        content: 'Thank you for your feedback...',
        respondedAt: new Date()
      }
    }
  }
);

// Customer Messaging
Messages.create({
  conversationId: generateConversationId(vendorId, customerId),
  senderId: vendorId,
  recipientId: customerId,
  messageType: 'text',
  content: 'Thank you for booking with us...',
  contextType: 'booking',
  contextId: bookingId
});
```

---

## 3. 👑 **ADMIN Features**

### 3.1 User Management

#### **Feature: Manage vendors, employees, and customers**
**Database Operations:**
```javascript
// Admin User Dashboard with Filters and Search
Users.aggregate([
  // Search and filter
  {
    $match: {
      $or: [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ],
      role: { $in: selectedRoles }, // ['vendor', 'customer', 'employee']
      status: { $in: selectedStatuses },
      createdAt: { $gte: startDate, $lte: endDate }
    }
  },
  
  // Add computed fields
  {
    $addFields: {
      fullName: { $concat: ['$firstName', ' ', '$lastName'] },
      // For vendors: add business metrics
      businessMetrics: {
        $cond: [
          { $eq: ['$role', 'vendor'] },
          {
            // Lookup will be added here for events count, revenue, etc.
          },
          null
        ]
      }
    }
  },
  
  // Sort and paginate
  { $sort: { createdAt: -1 } },
  { $skip: page * limit },
  { $limit: limit }
]);

// Vendor Verification Management
Users.updateOne(
  { _id: vendorId, role: 'vendor' },
  {
    $set: {
      'vendorProfile.verificationStatus': 'verified',
      status: 'active'
    },
    $push: {
      'vendorProfile.verificationHistory': {
        action: 'approved',
        adminId: adminId,
        notes: 'All documents verified',
        timestamp: new Date()
      }
    }
  }
);

// Suspend User Account
Users.updateOne(
  { _id: userId },
  {
    status: 'suspended',
    $push: {
      suspensionHistory: {
        reason: 'Policy violation',
        suspendedBy: adminId,
        suspendedAt: new Date(),
        isActive: true
      }
    }
  }
);
```

### 3.2 Event Oversight

#### **Feature: Approve/reject vendor events**
**Database Operations:**
```javascript
// Admin Event Moderation Queue
Events.aggregate([
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
      submissionAge: {
        $divide: [
          { $subtract: [new Date(), '$createdAt'] },
          1000 * 60 * 60 * 24 // Convert to days
        ]
      },
      vendorTrustScore: {
        // Calculate based on vendor history, reviews, etc.
        $multiply: ['$vendor.vendorProfile.rating', 20]
      }
    }
  },
  { $sort: { submissionAge: -1, vendorTrustScore: -1 } }
]);

// Approve Event
Events.updateOne(
  { _id: eventId },
  {
    $set: {
      submissionStatus: 'approved',
      isApproved: true
    },
    $push: {
      approvalHistory: {
        status: 'approved',
        adminId: adminId,
        notes: 'Event meets all quality standards',
        timestamp: new Date()
      }
    }
  }
);

// Reject Event with Feedback
Events.updateOne(
  { _id: eventId },
  {
    $set: {
      submissionStatus: 'rejected',
      isApproved: false
    },
    $push: {
      approvalHistory: {
        status: 'rejected',
        adminId: adminId,
        notes: 'Event description needs more details. Please include age-appropriate activities.',
        timestamp: new Date()
      }
    }
  }
);

// Send notification to vendor about rejection
Notifications.create({
  recipientId: event.vendorId,
  type: 'event_rejected',
  title: 'Event Submission Rejected',
  message: 'Your event "Birthday Party Package" needs updates...',
  metadata: { eventId: eventId, rejectionReason: rejectionNotes }
});
```

### 3.3 Financial Controls

#### **Feature: Commission tracking & vendor payouts**
**Database Operations:**
```javascript
// Platform Revenue Dashboard
PlatformRevenue.aggregate([
  {
    $group: {
      _id: { year: '$period.year', month: '$period.month' },
      totalCommissionRevenue: { $sum: '$commissionRevenue' },
      totalTransactionVolume: { $sum: '$totalTransactionVolume' },
      totalBookings: { $sum: '$totalBookings' },
      activeVendors: { $max: '$activeVendors' }
    }
  },
  { $sort: { '_id.year': -1, '_id.month': -1 } }
]);

// Process Vendor Payouts
const vendorsForPayout = await VendorEarnings.aggregate([
  {
    $match: {
      payoutStatus: 'pending',
      netEarnings: { $gte: minimumPayoutAmount }
    }
  },
  {
    $group: {
      _id: '$vendorId',
      totalAmount: { $sum: '$netEarnings' },
      earningsIds: { $push: '$_id' }
    }
  }
]);

// Create payout records
for (const vendorPayout of vendorsForPayout) {
  await Payouts.create({
    vendorId: vendorPayout._id,
    payoutNumber: generatePayoutNumber(),
    amount: vendorPayout.totalAmount,
    currency: 'AED',
    includedEarnings: vendorPayout.earningsIds,
    payoutMethod: vendorPayoutMethod,
    status: 'processing'
  });
  
  // Mark earnings as processing
  await VendorEarnings.updateMany(
    { _id: { $in: vendorPayout.earningsIds } },
    { payoutStatus: 'processing' }
  );
}

// Commission Rules Management
CommissionRules.create({
  name: 'High Volume Vendor Discount',
  type: 'tiered',
  tiers: [
    { minAmount: 0, maxAmount: 1000, percentage: 10 },
    { minAmount: 1000, maxAmount: 5000, percentage: 8 },
    { minAmount: 5000, maxAmount: Infinity, percentage: 6 }
  ],
  appliesTo: 'all_vendors',
  isActive: true,
  validFrom: new Date(),
  validUntil: new Date('2024-12-31')
});
```

### 3.4 Analytics & Reporting

#### **Feature: Platform analytics & business intelligence**
**Database Operations:**
```javascript
// Comprehensive Platform Analytics
const analytics = await Promise.all([
  // User growth metrics
  Users.aggregate([
    {
      $group: {
        _id: { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          role: '$role'
        },
        userCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]),
  
  // Event performance metrics
  Events.aggregate([
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'eventId',
        as: 'bookings'
      }
    },
    {
      $group: {
        _id: '$category',
        totalEvents: { $sum: 1 },
        totalBookings: { $sum: { $size: '$bookings' } },
        averagePrice: { $avg: '$pricing.basePrice' },
        totalRevenue: {
          $sum: {
            $sum: {
              $map: {
                input: '$bookings',
                as: 'booking',
                in: '$$booking.pricing.totalAmount'
              }
            }
          }
        }
      }
    }
  ]),
  
  // Geographic distribution
  Events.aggregate([
    {
      $group: {
        _id: '$location.city',
        eventCount: { $sum: 1 },
        averagePrice: { $avg: '$pricing.basePrice' }
      }
    },
    { $sort: { eventCount: -1 } }
  ])
]);

// Generate Monthly Business Report
const monthlyReport = await PlatformRevenue.aggregate([
  { $match: { 'period.year': 2024 } },
  {
    $project: {
      month: '$period.month',
      revenue: {
        commission: '$commissionRevenue',
        subscription: '$subscriptionRevenue',
        featured: '$featuredListingRevenue',
        total: {
          $add: ['$commissionRevenue', '$subscriptionRevenue', '$featuredListingRevenue']
        }
      },
      costs: {
        processing: '$paymentProcessingCosts',
        operating: '$operatingCosts',
        total: {
          $add: ['$paymentProcessingCosts', '$operatingCosts']
        }
      },
      profit: {
        $subtract: [
          { $add: ['$commissionRevenue', '$subscriptionRevenue', '$featuredListingRevenue'] },
          { $add: ['$paymentProcessingCosts', '$operatingCosts'] }
        ]
      },
      metrics: {
        transactionVolume: '$totalTransactionVolume',
        bookings: '$totalBookings',
        activeVendors: '$activeVendors',
        activeCustomers: '$activeCustomers'
      }
    }
  },
  { $sort: { month: 1 } }
]);
```

---

## 4. 👷 **EMPLOYEE Features**

### 4.1 QR Ticket Validation

#### **Feature: Mobile QR scanner & check-in system**
**Database Operations:**
```javascript
// Employee Event Access Check
const employeeAccess = await Employees.findOne({
  userId: employeeId,
  isActive: true,
  'permissions': 'ticket_validation'
}).populate('assignedVendor');

// Get Events Employee Can Access
const accessibleEvents = await Events.find({
  vendorId: employeeAccess.assignedVendor._id,
  'dateSchedule.date': {
    $gte: startOfToday,
    $lte: endOfToday
  }
}).select('title location dateSchedule');

// Validate QR Code and Check-in
const validateTicketCheckIn = async (qrCode, employeeId, location) => {
  // 1. Find ticket by QR code
  const ticket = await Tickets.findOne({
    'qrCode.code': qrCode,
    'qrCode.isValid': true,
    status: 'active'
  }).populate('eventId bookingId');
  
  if (!ticket) {
    return { success: false, error: 'Invalid or expired ticket' };
  }
  
  // 2. Check if employee has access to this event
  const employee = await Employees.findOne({ userId: employeeId });
  if (ticket.eventId.vendorId.toString() !== employee.assignedVendor.toString()) {
    return { success: false, error: 'Access denied for this event' };
  }
  
  // 3. Check if already checked in
  if (ticket.checkIn.isCheckedIn) {
    return { 
      success: false, 
      error: 'Ticket already used',
      checkInTime: ticket.checkIn.checkedInAt
    };
  }
  
  // 4. Perform check-in
  await Tickets.updateOne(
    { _id: ticket._id },
    {
      $set: {
        'checkIn.isCheckedIn': true,
        'checkIn.checkedInAt': new Date(),
        'checkIn.checkedInBy': employeeId,
        'checkIn.location': location,
        status: 'used'
      }
    }
  );
  
  // 5. Log the check-in
  await CheckinLog.create({
    employeeId: employeeId,
    ticketId: ticket._id,
    eventId: ticket.eventId._id,
    customerId: ticket.customerId,
    checkinTime: new Date(),
    checkinLocation: location
  });
  
  return {
    success: true,
    customerName: ticket.attendeeName,
    eventTitle: ticket.eventId.title,
    checkInTime: new Date()
  };
};
```

### 4.2 Event Operations

#### **Feature: Track attendance & generate reports**
**Database Operations:**
```javascript
// Real-time Event Attendance Dashboard
const getEventAttendanceStats = async (eventId, employeeId) => {
  // Verify employee access
  const employee = await Employees.findOne({ userId: employeeId });
  const event = await Events.findById(eventId);
  
  if (event.vendorId.toString() !== employee.assignedVendor.toString()) {
    throw new Error('Access denied');
  }
  
  return await Tickets.aggregate([
    { $match: { eventId: ObjectId(eventId) } },
    {
      $lookup: {
        from: 'bookings',
        localField: 'bookingId',
        foreignField: '_id',
        as: 'booking'
      }
    },
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        checkedInTickets: {
          $sum: { $cond: ['$checkIn.isCheckedIn', 1, 0] }
        },
        pendingCheckIns: {
          $sum: { $cond: [{ $not: '$checkIn.isCheckedIn' }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $arrayElemAt: ['$booking.pricing.totalAmount', 0] }
        },
        attendeesByAge: {
          $push: {
            $cond: [
              '$checkIn.isCheckedIn',
              '$attendeeAge',
              null
            ]
          }
        }
      }
    }
  ]);
};

// Generate Daily Attendance Report
const generateAttendanceReport = async (eventId, date, employeeId) => {
  return await CheckinLog.aggregate([
    {
      $match: {
        eventId: ObjectId(eventId),
        checkinTime: {
          $gte: new Date(date + 'T00:00:00.000Z'),
          $lte: new Date(date + 'T23:59:59.999Z')
        }
      }
    },
    {
      $lookup: {
        from: 'tickets',
        localField: 'ticketId',
        foreignField: '_id',
        as: 'ticket'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    {
      $project: {
        checkinTime: 1,
        checkinLocation: 1,
        attendeeName: { $arrayElemAt: ['$ticket.attendeeName', 0] },
        customerName: {
          $concat: [
            { $arrayElemAt: ['$customer.firstName', 0] },
            ' ',
            { $arrayElemAt: ['$customer.lastName', 0] }
          ]
        },
        customerEmail: { $arrayElemAt: ['$customer.email', 0] }
      }
    },
    { $sort: { checkinTime: 1 } }
  ]);
};

// Report Suspicious Activity
const reportSuspiciousTicket = async (ticketId, employeeId, reason) => {
  await SupportTickets.create({
    ticketNumber: generateTicketNumber(),
    customerId: null, // Internal report
    subject: 'Suspicious Ticket Activity',
    description: `Employee ${employeeId} reported suspicious activity for ticket ${ticketId}: ${reason}`,
    category: 'technical_issue',
    priority: 'high',
    status: 'open',
    relatedTicket: ticketId,
    messages: [{
      senderId: employeeId,
      message: reason,
      sentAt: new Date(),
      isInternal: true
    }]
  });
};
```

---

## Summary: Database Operation Patterns

### **Key Performance Considerations**

1. **Indexes for Role-based Queries:**
   ```javascript
   // Customer queries
   db.events.createIndex({ isApproved: 1, isDeleted: 1, 'location.city': 1 })
   db.events.createIndex({ category: 1, 'ageRange.0': 1, 'ageRange.1': 1 })
   
   // Vendor queries
   db.events.createIndex({ vendorId: 1, submissionStatus: 1 })
   db.bookings.createIndex({ vendorId: 1, status: 1, createdAt: -1 })
   
   // Admin queries
   db.users.createIndex({ role: 1, status: 1, createdAt: -1 })
   db.events.createIndex({ submissionStatus: 1, createdAt: 1 })
   
   // Employee queries
   db.tickets.createIndex({ 'qrCode.code': 1, status: 1 })
   db.events.createIndex({ vendorId: 1, 'dateSchedule.date': 1 })
   ```

2. **Aggregation Pipeline Optimization:**
   - Use `$match` early to filter documents
   - Limit `$lookup` operations and use targeted pipelines
   - Use `$project` to reduce data transfer
   - Implement proper pagination with `$skip` and `$limit`

3. **Real-time Data Patterns:**
   - Use Change Streams for real-time notifications
   - Implement caching for frequently accessed data (Redis)
   - Use atomic operations for booking and payment processing

This comprehensive mapping provides the foundation for implementing all role-based features with optimized database operations that scale with your platform's growth.