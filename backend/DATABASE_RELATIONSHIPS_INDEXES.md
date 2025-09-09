# Database Relationships & Performance Indexes

## Overview
This document defines all collection relationships, foreign key constraints, compound indexes, and performance optimization strategies for the Gema Event Management Platform.

---

## 1. **Core Relationships Diagram**

```
Users (1) ←→ (N) UserSessions
Users (1) ←→ (1) UserPreferences  
Users (1) ←→ (N) RefreshToken

Users[Vendor] (1) ←→ (N) Events
Users[Vendor] (1) ←→ (N) VendorEarnings
Users[Vendor] (1) ←→ (N) Payouts

Users[Customer] (1) ←→ (N) Bookings
Users[Customer] (1) ←→ (N) Reviews
Users[Customer] (1) ←→ (N) SupportTickets

Users[Employee] (1) ←→ (N) Employee
Users[Employee] (1) ←→ (N) CheckinLog

Events (1) ←→ (N) Bookings
Events (1) ←→ (N) Reviews  
Events (1) ←→ (N) EventViews
Events (1) ←→ (N) EventAnalytics
Events (1) ←→ (1) Venues

Bookings (1) ←→ (N) Tickets
Bookings (1) ←→ (1) Payments
Bookings (1) ←→ (N) Messages

Categories (1) ←→ (N) Events
Categories (self) (1) ←→ (N) Categories [parent-child]

Notifications (N) ←→ (1) Users
Messages (N) ←→ (2) Users [sender, recipient]
```

---

## 2. **Collection Relationships & Foreign Keys**

### 2.1 **Users Collection Relationships**

```javascript
// Users → Multiple Related Collections
{
  // Outgoing Relations (User owns these)
  events: [{ type: ObjectId, ref: 'Event' }], // If vendor
  bookings: [{ type: ObjectId, ref: 'Booking' }], // If customer
  tickets: [{ type: ObjectId, ref: 'Ticket' }], // If customer
  reviews: [{ type: ObjectId, ref: 'Review' }], // If customer
  notifications: [{ type: ObjectId, ref: 'Notification' }],
  
  // Incoming Relations (Referenced by other collections)
  // Sessions → Users (via userId)
  // RefreshTokens → Users (via userId) 
  // Payments → Users (via customerId, vendorId)
  // Messages → Users (via senderId, recipientId)
  // SupportTickets → Users (via customerId)
  // Employee → Users (via userId)
  // CheckinLog → Users (via employeeId, customerId)
  // VendorEarnings → Users (via vendorId)
  // Payouts → Users (via vendorId)
  // EventViews → Users (via userId)
  // AuditLogs → Users (via userId)
}
```

### 2.2 **Events Collection Relationships**

```javascript
{
  // Direct References
  vendorId: { type: ObjectId, ref: 'User', required: true },
  category: { type: ObjectId, ref: 'Category', required: true },
  subcategory: { type: ObjectId, ref: 'Category' },
  venue: { type: ObjectId, ref: 'Venue' },
  
  // Reverse Relations (handled via aggregation)
  bookings: [{ type: ObjectId, ref: 'Booking' }],
  reviews: [{ type: ObjectId, ref: 'Review' }],
  tickets: [{ type: ObjectId, ref: 'Ticket' }],
  eventViews: [{ type: ObjectId, ref: 'EventView' }],
  analytics: [{ type: ObjectId, ref: 'EventAnalytics' }],
}

// Virtual population for reverse relations
EventSchema.virtual('allBookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'eventId'
});
```

### 2.3 **Booking Transaction Chain**

```javascript
// The critical booking flow relationship chain:
User[Customer] → Booking → Payment → Tickets → CheckinLog
                     ↓
                 VendorEarnings → Payout
```

---

## 3. **Performance Indexes by Collection**

### 3.1 **Users Collection Indexes**

```javascript
// Primary indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 }, { sparse: true, unique: true })

// Role-based access patterns
db.users.createIndex({ role: 1, status: 1, createdAt: -1 })
db.users.createIndex({ role: 1, isEmailVerified: 1, status: 1 })

// Social login optimization
db.users.createIndex({ 
  'socialLogins.provider': 1, 
  'socialLogins.providerId': 1 
}, { unique: true, sparse: true })

// Firebase UID lookup
db.users.createIndex({ firebaseUid: 1 }, { sparse: true, unique: true })

// Vendor-specific queries
db.users.createIndex({ 
  role: 1, 
  'vendorProfile.subscriptionPlan': 1,
  'vendorProfile.verificationStatus': 1 
})
db.users.createIndex({ 
  role: 1,
  'vendorProfile.subscriptionExpiresAt': 1 
})

// Customer preference queries
db.users.createIndex({ 
  role: 1,
  'customerProfile.preferredLanguage': 1,
  'customerProfile.interests': 1 
})

// Location-based vendor search
db.users.createIndex({ 
  role: 1,
  'addresses.city': 1,
  'addresses.country': 1,
  status: 1 
})

// Authentication and security
db.users.createIndex({ 
  'passwordReset.token': 1,
  'passwordReset.expiresAt': 1 
}, { sparse: true })
db.users.createIndex({ 
  'emailVerification.otp': 1,
  'emailVerification.expiresAt': 1 
}, { sparse: true })

// Performance monitoring
db.users.createIndex({ lastLogin: -1, role: 1 })
db.users.createIndex({ createdAt: -1 })
db.users.createIndex({ updatedAt: -1 })
```

### 3.2 **Events Collection Indexes**

```javascript
// Primary discovery indexes
db.events.createIndex({ 
  isApproved: 1, 
  isDeleted: 1, 
  submissionStatus: 1,
  'dateSchedule.date': 1 
})

// Text search index (weighted)
db.events.createIndex({
  title: "text",
  description: "text", 
  "location.address": "text",
  "location.city": "text",
  tags: "text"
}, {
  weights: {
    title: 10,
    description: 5,
    "location.city": 8,
    tags: 6
  },
  name: "EventSearchIndex"
})

// Geographic search (2dsphere)
db.events.createIndex({ 'location.coordinates': '2dsphere' })

// Category and filtering
db.events.createIndex({ 
  category: 1, 
  isApproved: 1, 
  isDeleted: 1,
  'pricing.basePrice': 1 
})
db.events.createIndex({ 
  category: 1, 
  subcategory: 1,
  type: 1,
  venueType: 1
})

// Age-based filtering  
db.events.createIndex({ 
  'ageRange.0': 1, 
  'ageRange.1': 1,
  isApproved: 1,
  isDeleted: 1
})

// Price-based filtering
db.events.createIndex({ 
  'pricing.basePrice': 1, 
  'pricing.currency': 1,
  isApproved: 1 
})

// Location-based discovery
db.events.createIndex({ 
  'location.city': 1, 
  isApproved: 1, 
  isDeleted: 1,
  'dateSchedule.date': 1
})

// Vendor management queries
db.events.createIndex({ 
  vendorId: 1, 
  submissionStatus: 1, 
  createdAt: -1 
})
db.events.createIndex({ 
  vendorId: 1, 
  isDeleted: 1,
  'metrics.bookingsCount': -1 
})

// Admin moderation queue
db.events.createIndex({ 
  submissionStatus: 1, 
  createdAt: 1,
  'vendorProfile.verificationStatus': 1 
})

// Featured events
db.events.createIndex({ 
  isFeatured: 1, 
  featuredUntil: 1,
  isApproved: 1,
  isDeleted: 1 
})

// Performance and analytics
db.events.createIndex({ 
  'metrics.viewsCount': -1,
  'metrics.averageRating': -1,
  'metrics.bookingsCount': -1 
})

// Date-based availability queries
db.events.createIndex({ 
  'dateSchedule.date': 1,
  'dateSchedule.timeSlots.availableSeats': 1
})

// Recurring events
db.events.createIndex({ 
  'recurring.isRecurring': 1,
  'recurring.pattern': 1,
  'recurring.endDate': 1 
})
```

### 3.3 **Bookings Collection Indexes**

```javascript
// Customer booking history
db.bookings.createIndex({ 
  customerId: 1, 
  status: 1, 
  selectedDate: -1 
})
db.bookings.createIndex({ 
  customerId: 1, 
  createdAt: -1 
})

// Vendor booking management  
db.bookings.createIndex({ 
  vendorId: 1, 
  status: 1, 
  selectedDate: -1 
})
db.bookings.createIndex({ 
  eventId: 1, 
  status: 1,
  selectedDate: 1 
})

// Payment processing correlation
db.bookings.createIndex({ 
  paymentStatus: 1, 
  status: 1,
  createdAt: -1 
})

// Date-based queries (upcoming/past events)
db.bookings.createIndex({ 
  selectedDate: 1, 
  status: 1,
  customerId: 1 
})

// Booking number lookup (customer service)
db.bookings.createIndex({ bookingNumber: 1 }, { unique: true })

// Revenue and financial reporting
db.bookings.createIndex({ 
  status: 1,
  'pricing.totalAmount': 1,
  createdAt: -1,
  vendorId: 1 
})

// Commission calculation
db.bookings.createIndex({ 
  status: 1,
  vendorId: 1,
  'pricing.totalAmount': 1,
  createdAt: -1 
})

// Cancellation and refund tracking
db.bookings.createIndex({ 
  'cancellation.cancelledAt': -1,
  'cancellation.refundStatus': 1 
})

// Notification tracking
db.bookings.createIndex({ 
  'notifications.type': 1,
  'notifications.status': 1,
  customerId: 1 
})
```

### 3.4 **Tickets Collection Indexes**

```javascript
// QR code validation (most critical for performance)
db.tickets.createIndex({ 'qrCode.code': 1 }, { unique: true })
db.tickets.createIndex({ 
  'qrCode.isValid': 1,
  status: 1,
  eventId: 1 
})

// Customer ticket management
db.tickets.createIndex({ 
  customerId: 1, 
  status: 1,
  createdAt: -1 
})

// Booking correlation
db.tickets.createIndex({ 
  bookingId: 1,
  status: 1 
})

// Event check-in management
db.tickets.createIndex({ 
  eventId: 1,
  'checkIn.isCheckedIn': 1,
  status: 1 
})

// Employee check-in operations
db.tickets.createIndex({ 
  'checkIn.checkedInBy': 1,
  'checkIn.checkedInAt': -1 
})

// Ticket transfer tracking
db.tickets.createIndex({ 
  'transferHistory.fromUserId': 1,
  'transferHistory.toUserId': 1,
  'transferHistory.transferredAt': -1 
})

// Ticket number lookup
db.tickets.createIndex({ ticketNumber: 1 }, { unique: true })

// Attendee name search (customer service)
db.tickets.createIndex({ 
  attendeeName: 1,
  customerId: 1,
  eventId: 1 
})
```

### 3.5 **Payments Collection Indexes**

```javascript
// Payment processing correlation
db.payments.createIndex({ 
  bookingId: 1,
  status: 1 
})

// Customer payment history
db.payments.createIndex({ 
  customerId: 1, 
  status: 1,
  processedAt: -1 
})

// Vendor revenue tracking
db.payments.createIndex({ 
  vendorId: 1,
  status: 1,
  amount: -1,
  processedAt: -1 
})

// Gateway transaction correlation
db.payments.createIndex({ 
  gateway: 1,
  gatewayTransactionId: 1,
  status: 1 
})

// Payment number lookup
db.payments.createIndex({ paymentNumber: 1 }, { unique: true })

// Financial reporting
db.payments.createIndex({ 
  status: 1,
  processedAt: -1,
  amount: -1,
  currency: 1 
})

// Commission calculation
db.payments.createIndex({ 
  status: 1,
  platformCommission: -1,
  vendorAmount: -1,
  processedAt: -1 
})

// Refund processing
db.payments.createIndex({ 
  'refunds.refundId': 1,
  'refunds.status': 1,
  'refunds.processedAt': -1 
})

// Failed payment analysis
db.payments.createIndex({ 
  status: 1,
  failureReason: 1,
  gateway: 1,
  createdAt: -1 
})
```

### 3.6 **Reviews Collection Indexes**

```javascript
// Event reviews display
db.reviews.createIndex({ 
  eventId: 1, 
  status: 1, 
  createdAt: -1 
})

// User review history
db.reviews.createIndex({ 
  userId: 1,
  reviewType: 1,
  createdAt: -1 
})

// Vendor review management
db.reviews.createIndex({ 
  eventId: 1,
  status: 1,
  rating: -1 
})

// Review moderation
db.reviews.createIndex({ 
  status: 1,
  'moderationFlags': 1,
  createdAt: -1 
})

// Rating-based filtering
db.reviews.createIndex({ 
  eventId: 1,
  rating: -1,
  status: 1 
})

// Booking correlation (prevent duplicate reviews)
db.reviews.createIndex({ 
  bookingId: 1,
  userId: 1 
}, { unique: true })

// Helpful votes tracking
db.reviews.createIndex({ 
  '_id': 1,
  'helpfulVotes.userId': 1 
})
```

### 3.7 **Notifications Collection Indexes**

```javascript
// User notification feed
db.notifications.createIndex({ 
  recipientId: 1, 
  isRead: 1, 
  createdAt: -1 
})

// Role-based notifications
db.notifications.createIndex({ 
  recipientRole: 1,
  type: 1,
  createdAt: -1 
})

// Notification scheduling
db.notifications.createIndex({ 
  scheduledFor: 1,
  'channels.status': 1 
})

// Channel delivery tracking
db.notifications.createIndex({ 
  'channels.type': 1,
  'channels.status': 1,
  'channels.sentAt': -1 
})

// Priority handling
db.notifications.createIndex({ 
  priority: 1,
  'channels.status': 1,
  scheduledFor: 1 
})

// Cleanup of old notifications
db.notifications.createIndex({ 
  createdAt: -1,
  isRead: 1 
})
```

### 3.8 **Categories Collection Indexes**

```javascript
// Category hierarchy
db.categories.createIndex({ 
  parentId: 1,
  level: 1,
  displayOrder: 1 
})

// Category path lookup
db.categories.createIndex({ path: 1 }, { unique: true })
db.categories.createIndex({ slug: 1 }, { unique: true })

// Active categories
db.categories.createIndex({ 
  isActive: 1,
  isFeatured: 1,
  displayOrder: 1 
})

// Multi-language support
db.categories.createIndex({ 
  'translations.language': 1,
  isActive: 1 
})

// Category performance
db.categories.createIndex({ 
  eventCount: -1,
  popularityScore: -1,
  isActive: 1 
})
```

---

## 4. **Compound Indexes for Complex Queries**

### 4.1 **Event Discovery Compound Indexes**

```javascript
// Multi-filter event search
db.events.createIndex({
  isApproved: 1,
  isDeleted: 1,
  category: 1,
  'location.city': 1,
  'ageRange.0': 1,
  'ageRange.1': 1,
  'pricing.basePrice': 1,
  'dateSchedule.date': 1
}, { name: 'EventDiscoveryIndex' })

// Featured events with location
db.events.createIndex({
  isFeatured: 1,
  featuredUntil: 1,
  'location.city': 1,
  isApproved: 1,
  isDeleted: 1,
  'metrics.averageRating': -1
}, { name: 'FeaturedEventsIndex' })

// Vendor event management
db.events.createIndex({
  vendorId: 1,
  submissionStatus: 1,
  isDeleted: 1,
  createdAt: -1,
  'metrics.bookingsCount': -1
}, { name: 'VendorEventManagementIndex' })
```

### 4.2 **Booking Management Compound Indexes**

```javascript
// Customer booking dashboard
db.bookings.createIndex({
  customerId: 1,
  status: 1,
  selectedDate: -1,
  'pricing.totalAmount': -1
}, { name: 'CustomerBookingDashboard' })

// Vendor booking analytics
db.bookings.createIndex({
  vendorId: 1,
  status: 1,
  createdAt: -1,
  'pricing.totalAmount': -1
}, { name: 'VendorBookingAnalytics' })

// Financial reporting
db.bookings.createIndex({
  status: 1,
  createdAt: -1,
  vendorId: 1,
  'pricing.totalAmount': -1,
  'pricing.currency': 1
}, { name: 'FinancialReporting' })
```

### 4.3 **Analytics Compound Indexes**

```javascript
// User behavior analytics
db.useranalytics.createIndex({
  userId: 1,
  date: -1,
  sessionCount: -1,
  bookingsMade: -1
}, { name: 'UserBehaviorAnalytics' })

// Event performance analytics
db.eventanalytics.createIndex({
  eventId: 1,
  date: -1,
  views: -1,
  bookingsCompleted: -1,
  conversionRate: -1
}, { name: 'EventPerformanceAnalytics' })

// Platform revenue analytics
db.platformrevenue.createIndex({
  'period.year': -1,
  'period.month': -1,
  commissionRevenue: -1,
  totalTransactionVolume: -1
}, { name: 'PlatformRevenueAnalytics' })
```

---

## 5. **Special Performance Indexes**

### 5.1 **Geospatial Indexes**

```javascript
// Event location search
db.events.createIndex({ 'location.coordinates': '2dsphere' })

// User location (for location-based recommendations)
db.users.createIndex({ 
  'addresses.coordinates': '2dsphere'
}, { sparse: true })

// Venue location search
db.venues.createIndex({ coordinates: '2dsphere' })

// Example usage:
db.events.find({
  'location.coordinates': {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: 5000 // 5km radius
    }
  },
  isApproved: true
})
```

### 5.2 **TTL (Time To Live) Indexes**

```javascript
// Auto-expire booking holds after 15 minutes
db.bookingholds.createIndex({ 
  holdExpiresAt: 1 
}, { expireAfterSeconds: 0 })

// Auto-expire user sessions after inactivity
db.usersessions.createIndex({ 
  expiresAt: 1 
}, { expireAfterSeconds: 0 })

// Auto-expire password reset tokens
db.users.createIndex({ 
  'passwordReset.expiresAt': 1 
}, { 
  expireAfterSeconds: 0,
  sparse: true,
  partialFilterExpression: {
    'passwordReset.expiresAt': { $exists: true }
  }
})

// Auto-expire OTP verification codes
db.users.createIndex({ 
  'emailVerification.expiresAt': 1 
}, { 
  expireAfterSeconds: 0,
  sparse: true,
  partialFilterExpression: {
    'emailVerification.expiresAt': { $exists: true }
  }
})
```

### 5.3 **Partial Indexes for Performance**

```javascript
// Index only active, verified vendors
db.users.createIndex(
  { 
    role: 1, 
    'vendorProfile.businessName': 1,
    'vendorProfile.subscriptionPlan': 1 
  },
  { 
    partialFilterExpression: {
      role: 'vendor',
      status: 'active',
      'vendorProfile.verificationStatus': 'verified'
    }
  }
)

// Index only published events
db.events.createIndex(
  { 
    category: 1, 
    'location.city': 1, 
    'pricing.basePrice': 1 
  },
  {
    partialFilterExpression: {
      isApproved: true,
      isDeleted: false,
      submissionStatus: 'published'
    }
  }
)

// Index only confirmed bookings for revenue calculations
db.bookings.createIndex(
  { 
    vendorId: 1, 
    createdAt: -1, 
    'pricing.totalAmount': -1 
  },
  {
    partialFilterExpression: {
      status: 'confirmed',
      paymentStatus: 'paid'
    }
  }
)
```

---

## 6. **Index Monitoring and Maintenance**

### 6.1 **Index Usage Analysis**

```javascript
// Monitor index usage
db.runCommand({ collStats: 'events', indexDetails: true })

// Check slow queries
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Index efficiency analysis
db.events.aggregate([
  { $indexStats: {} }
])
```

### 6.2 **Index Maintenance Strategy**

```javascript
// Weekly index maintenance script
const maintainIndexes = async () => {
  // Rebuild fragmented indexes
  await db.events.reIndex()
  await db.users.reIndex()
  await db.bookings.reIndex()
  
  // Analyze index performance
  const indexStats = await db.runCommand({
    collStats: 'events',
    indexDetails: true
  })
  
  // Log index sizes and usage
  console.log('Index maintenance completed:', indexStats)
}

// Schedule to run weekly
// cron.schedule('0 2 * * 0', maintainIndexes) // Sundays at 2 AM
```

---

## 7. **Performance Optimization Guidelines**

### 7.1 **Query Optimization Best Practices**

1. **Always use compound indexes for multi-field queries**
2. **Place most selective fields first in compound indexes**
3. **Use covered queries when possible (projection matches index)**
4. **Limit result sets with $limit in aggregation pipelines**
5. **Use $match early in aggregation pipelines**
6. **Avoid $lookup when possible, use embedding for read-heavy data**

### 7.2 **Index Strategy by Collection Size**

```javascript
// Small collections (< 10,000 docs): Basic indexes only
// Medium collections (10K - 1M docs): Compound indexes + partial indexes
// Large collections (> 1M docs): All optimization strategies

const getIndexStrategy = (collectionSize) => {
  if (collectionSize < 10000) {
    return 'basic' // Simple single-field indexes
  } else if (collectionSize < 1000000) {
    return 'compound' // Compound + partial indexes
  } else {
    return 'advanced' // Full optimization with sharding consideration
  }
}
```

This comprehensive indexing strategy ensures optimal performance across all role-based features while maintaining data integrity and supporting real-time operations at scale.