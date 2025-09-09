# Gema Event Management Platform - Complete Database Schema

## Overview
This document provides a comprehensive database schema mapping for all role-based features in the Gema Event Management Platform, supporting 4 primary user roles: **Customer**, **Vendor**, **Admin**, and **Employee**.

## Current Collections Analysis
Based on existing models, we have 18 collections:
- User, RefreshToken, Event, Booking, Ticket, Employee, CheckinLog
- Venue, Order, Review, Payment, Category, Coupon, Notification
- Affiliate, Blog, BlogCategory

## Complete Schema Architecture (25+ Collections)

### 1. **Core User Management Collections**

#### 1.1 Users Collection (Enhanced)
```javascript
// Current: User.ts (✅ Already exists - enhanced)
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String, // unique
  passwordHash: String,
  phone: String,
  avatar: String, // Cloudinary URL
  role: Enum['customer', 'vendor', 'admin', 'employee'],
  status: Enum['active', 'inactive', 'suspended', 'pending'],
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  gender: Enum['male', 'female', 'other', 'prefer_not_to_say'],
  dateOfBirth: Date,
  country: String,
  
  // Customer-specific fields
  customerProfile: {
    kidsAgeGroups: [Number], // [3-5, 6-8, 9-12, etc.]
    interests: [String], // ['sports', 'arts', 'music']
    preferredLanguage: String, // 'en', 'ar'
    savedEvents: [ObjectId], // Wishlist
    notificationPreferences: {
      email: Boolean,
      sms: Boolean,
      push: Boolean,
      eventReminders: Boolean,
      promotions: Boolean
    }
  },
  
  // Vendor-specific fields
  vendorProfile: {
    businessName: String,
    businessType: String,
    licenseNumber: String,
    taxId: String,
    description: String,
    subscriptionPlan: Enum['basic', 'premium', 'enterprise'],
    subscriptionExpiresAt: Date,
    verificationStatus: Enum['pending', 'verified', 'rejected'],
    verificationDocuments: [String], // Cloudinary URLs
    payoutSettings: {
      method: Enum['bank_transfer', 'paypal', 'stripe'],
      bankDetails: {
        accountNumber: String,
        routingNumber: String,
        bankName: String
      },
      paypalEmail: String,
      minimumPayout: Number
    },
    businessHours: Object,
    socialMedia: Object
  },
  
  // Employee-specific fields
  employeeProfile: {
    employeeId: String,
    department: String,
    position: String,
    permissions: [String],
    assignedVendor: ObjectId, // ref: User (vendor)
    isActive: Boolean
  },
  
  addresses: [{
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    isDefault: Boolean
  }],
  
  // Authentication & Security
  socialLogins: [{
    provider: Enum['google', 'facebook', 'apple'],
    providerId: String
  }],
  twoFactorAuth: {
    enabled: Boolean,
    secret: String,
    backupCodes: [String]
  },
  passwordReset: {
    token: String,
    expiresAt: Date
  },
  emailVerification: {
    otp: String,
    expiresAt: Date
  },
  phoneVerification: {
    code: String,
    expiresAt: Date
  },
  loginAttempts: [{
    timestamp: Date,
    ip: String,
    userAgent: String,
    success: Boolean
  }],
  lastLogin: Date,
  firebaseUid: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 1.2 UserSessions Collection (New)
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // ref: User
  token: String, // JWT token hash
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    ip: String,
    location: {
      country: String,
      city: String
    }
  },
  isActive: Boolean,
  lastActivity: Date,
  expiresAt: Date,
  createdAt: Date
}
```

#### 1.3 UserPreferences Collection (New)
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // ref: User
  preferences: {
    language: String,
    currency: String,
    timezone: String,
    theme: Enum['light', 'dark', 'system'],
    notifications: {
      email: Boolean,
      sms: Boolean,
      push: Boolean,
      eventReminders: Boolean,
      promotions: Boolean,
      bookingUpdates: Boolean
    },
    privacy: {
      showProfile: Boolean,
      showReviews: Boolean,
      allowMessages: Boolean
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **Event Management Collections**

#### 2.1 Events Collection (Enhanced)
```javascript
// Current: Event.ts (✅ Already exists - needs enhancement)
{
  _id: ObjectId,
  title: String,
  description: String,
  shortDescription: String, // For cards/previews
  category: ObjectId, // ref: Category
  subcategory: ObjectId, // ref: Category
  type: Enum['event', 'course', 'venue'],
  venueType: Enum['indoor', 'outdoor', 'both'],
  
  // Age and targeting
  ageRange: [Number, Number], // [min, max]
  targetAudience: [String], // ['families', 'kids', 'parents']
  difficulty: Enum['beginner', 'intermediate', 'advanced'],
  
  // Location details
  venue: ObjectId, // ref: Venue
  location: {
    city: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    directions: String,
    parkingInfo: String
  },
  
  // Pricing and availability
  pricing: {
    basePrice: Number,
    currency: String,
    priceType: Enum['per_child', 'per_family', 'per_person'],
    discountedPrice: Number,
    earlyBirdPrice: Number,
    earlyBirdDeadline: Date
  },
  
  // Schedule management
  dateSchedule: [{
    date: Date,
    timeSlots: [{
      startTime: String, // "10:00"
      endTime: String,   // "12:00"
      availableSeats: Number,
      bookedSeats: Number,
      price: Number,
      isActive: Boolean
    }],
    specialNotes: String
  }],
  
  // Recurring events
  recurring: {
    isRecurring: Boolean,
    pattern: Enum['daily', 'weekly', 'monthly'],
    interval: Number, // every N days/weeks/months
    daysOfWeek: [Number], // [0-6] for weekly
    endDate: Date
  },
  
  // Vendor and approval
  vendorId: ObjectId, // ref: User
  submissionStatus: Enum['draft', 'submitted', 'approved', 'rejected', 'published'],
  approvalHistory: [{
    status: String,
    adminId: ObjectId, // ref: User
    notes: String,
    timestamp: Date
  }],
  
  // Content and media
  images: [String], // Cloudinary URLs
  videos: [String], // Cloudinary URLs
  documents: [String], // Terms, requirements, etc.
  
  // SEO and content
  seoMeta: {
    title: String,
    description: String,
    keywords: [String],
    slug: String
  },
  
  // Additional information
  requirements: [String], // What to bring, age restrictions
  inclusions: [String], // What's included in price
  exclusions: [String], // What's not included
  cancellationPolicy: String,
  refundPolicy: String,
  
  // Interactive features
  faqs: [{
    question: String,
    answer: String,
    isPublic: Boolean
  }],
  
  // Performance metrics
  metrics: {
    viewsCount: Number,
    bookingsCount: Number,
    averageRating: Number,
    totalReviews: Number,
    conversionRate: Number
  },
  
  // Marketing
  tags: [String],
  isFeatured: Boolean,
  featuredUntil: Date,
  promotionalText: String,
  
  // System fields
  isActive: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.2 EventTemplates Collection (New)
```javascript
{
  _id: ObjectId,
  vendorId: ObjectId, // ref: User
  templateName: String,
  templateData: {
    // Reusable event structure
    category: ObjectId,
    type: String,
    defaultPricing: Object,
    standardInclusions: [String],
    defaultDuration: Number, // minutes
    defaultCapacity: Number
  },
  isActive: Boolean,
  usageCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.3 EventViews Collection (New)
```javascript
{
  _id: ObjectId,
  eventId: ObjectId, // ref: Event
  userId: ObjectId, // ref: User (nullable for anonymous)
  sessionId: String, // for anonymous tracking
  viewedAt: Date,
  referrer: String,
  userAgent: String,
  location: {
    city: String,
    country: String
  },
  viewDuration: Number // seconds spent on page
}
```

### 3. **Booking and Payment Collections**

#### 3.1 Bookings Collection (Enhanced)
```javascript
// Current: Booking.ts (✅ Already exists - needs major enhancement)
{
  _id: ObjectId,
  bookingNumber: String, // unique, user-friendly (BK-2024-001234)
  
  // Core booking info
  customerId: ObjectId, // ref: User
  eventId: ObjectId, // ref: Event
  vendorId: ObjectId, // ref: User
  
  // Booking details
  selectedDate: Date,
  selectedTimeSlot: {
    startTime: String,
    endTime: String
  },
  numberOfTickets: Number,
  attendees: [{
    name: String,
    age: Number,
    gender: String,
    specialNeeds: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  }],
  
  // Pricing breakdown
  pricing: {
    basePrice: Number,
    totalAmount: Number,
    discountAmount: Number,
    taxAmount: Number,
    serviceFeee: Number,
    currency: String
  },
  
  // Applied discounts
  appliedCoupons: [{
    couponId: ObjectId, // ref: Coupon
    discountAmount: Number
  }],
  
  // Status management
  status: Enum['pending', 'confirmed', 'cancelled', 'completed', 'refunded'],
  paymentStatus: Enum['pending', 'paid', 'partial', 'refunded', 'failed'],
  
  // Special requests
  specialRequests: String,
  dietaryRequirements: [String],
  accessibility: [String],
  
  // Communication
  customerNotes: String,
  vendorNotes: String,
  
  // Payment integration
  paymentId: ObjectId, // ref: Payment
  
  // Cancellation and refund
  cancellation: {
    cancelledAt: Date,
    cancelledBy: ObjectId, // ref: User
    reason: String,
    refundAmount: Number,
    refundStatus: String
  },
  
  // Notifications sent
  notifications: [{
    type: String,
    sentAt: Date,
    status: String
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 3.2 BookingHolds Collection (New)
```javascript
{
  _id: ObjectId,
  eventId: ObjectId, // ref: Event
  customerId: ObjectId, // ref: User
  selectedDate: Date,
  numberOfTickets: Number,
  holdExpiresAt: Date, // 15 minutes from creation
  isActive: Boolean,
  createdAt: Date
}
```

#### 3.3 Tickets Collection (Enhanced)
```javascript
// Current: Ticket.ts (✅ Already exists - needs enhancement)
{
  _id: ObjectId,
  ticketNumber: String, // unique (TK-2024-001234)
  bookingId: ObjectId, // ref: Booking
  customerId: ObjectId, // ref: User
  eventId: ObjectId, // ref: Event
  
  // Ticket details
  attendeeName: String,
  attendeeAge: Number,
  seatNumber: String, // if applicable
  
  // QR Code system
  qrCode: {
    code: String, // unique QR string
    imageUrl: String, // Cloudinary URL of QR image
    isValid: Boolean
  },
  
  // Check-in tracking
  checkIn: {
    isCheckedIn: Boolean,
    checkedInAt: Date,
    checkedInBy: ObjectId, // ref: User (employee)
    location: String,
    notes: String
  },
  
  // Status
  status: Enum['active', 'used', 'cancelled', 'refunded'],
  
  // Special features
  transferHistory: [{
    fromUserId: ObjectId,
    toUserId: ObjectId,
    transferredAt: Date,
    reason: String
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 3.4 Payments Collection (Enhanced)
```javascript
// Current: Payment.ts (✅ Already exists - needs enhancement)
{
  _id: ObjectId,
  paymentNumber: String, // unique (PAY-2024-001234)
  
  // Core payment info
  bookingId: ObjectId, // ref: Booking
  customerId: ObjectId, // ref: User
  vendorId: ObjectId, // ref: User
  
  // Amount details
  amount: Number,
  currency: String,
  
  // Payment processing
  gateway: Enum['stripe', 'paypal', 'bank_transfer'],
  gatewayTransactionId: String,
  paymentMethod: {
    type: Enum['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'digital_wallet'],
    last4: String, // last 4 digits if card
    brand: String, // visa, mastercard, etc.
    country: String
  },
  
  // Status tracking
  status: Enum['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
  
  // Fees and commissions
  processingFee: Number,
  platformCommission: Number,
  vendorAmount: Number, // amount after fees and commissions
  
  // Metadata
  metadata: Object, // Gateway-specific data
  failureReason: String,
  
  // Refunds
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    processedAt: Date,
    status: String
  }],
  
  processedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **Commission and Financial Collections**

#### 4.1 CommissionRules Collection (New)
```javascript
{
  _id: ObjectId,
  name: String, // "Platform Base Commission", "High Volume Discount"
  description: String,
  
  // Rule configuration
  type: Enum['percentage', 'fixed', 'tiered', 'performance_based'],
  
  // Percentage-based
  percentage: Number, // 10.5 for 10.5%
  
  // Fixed amount
  fixedAmount: Number,
  
  // Tiered structure
  tiers: [{
    minAmount: Number, // Monthly volume threshold
    maxAmount: Number,
    percentage: Number
  }],
  
  // Performance-based
  performanceMetrics: {
    minRating: Number,
    minBookings: Number,
    bonusPercentage: Number
  },
  
  // Applicability
  appliesTo: Enum['all_vendors', 'specific_vendors', 'categories'],
  vendorIds: [ObjectId], // specific vendors
  categoryIds: [ObjectId], // specific categories
  
  // Validity
  isActive: Boolean,
  validFrom: Date,
  validUntil: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.2 VendorEarnings Collection (New)
```javascript
{
  _id: ObjectId,
  vendorId: ObjectId, // ref: User
  
  // Period tracking
  period: {
    year: Number,
    month: Number,
    startDate: Date,
    endDate: Date
  },
  
  // Revenue breakdown
  grossRevenue: Number, // Total from bookings
  platformCommission: Number,
  processingFees: Number,
  netEarnings: Number, // Amount vendor receives
  
  // Performance metrics
  totalBookings: Number,
  averageOrderValue: Number,
  conversionRate: Number,
  customerRating: Number,
  
  // Commission details
  appliedCommissionRules: [{
    ruleId: ObjectId,
    ruleName: String,
    commissionAmount: Number,
    calculationDetails: Object
  }],
  
  // Payout tracking
  payoutStatus: Enum['pending', 'processing', 'paid'],
  payoutDate: Date,
  payoutTransactionId: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.3 PlatformRevenue Collection (New)
```javascript
{
  _id: ObjectId,
  
  // Period tracking
  period: {
    year: Number,
    month: Number,
    startDate: Date,
    endDate: Date
  },
  
  // Revenue streams
  commissionRevenue: Number,
  subscriptionRevenue: Number,
  featuredListingRevenue: Number,
  
  // Cost breakdown
  paymentProcessingCosts: Number,
  operatingCosts: Number,
  
  // Metrics
  totalTransactionVolume: Number,
  totalBookings: Number,
  activeVendors: Number,
  activeCustomers: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.4 Payouts Collection (New)
```javascript
{
  _id: ObjectId,
  vendorId: ObjectId, // ref: User
  payoutNumber: String, // unique (PO-2024-001234)
  
  // Amount details
  amount: Number,
  currency: String,
  
  // Period covered
  periodStart: Date,
  periodEnd: Date,
  
  // Earnings included
  includedEarnings: [{
    earningId: ObjectId, // ref: VendorEarnings
    amount: Number
  }],
  
  // Payout method
  payoutMethod: Enum['bank_transfer', 'paypal', 'stripe', 'digital_wallet'],
  
  // Destination details
  destination: {
    bankAccount: {
      accountNumber: String,
      routingNumber: String,
      bankName: String
    },
    paypalEmail: String,
    stripeAccountId: String
  },
  
  // Status tracking
  status: Enum['pending', 'processing', 'completed', 'failed', 'cancelled'],
  processedAt: Date,
  
  // External references
  externalTransactionId: String,
  
  // Failure details
  failureReason: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **Communication Collections**

#### 5.1 Notifications Collection (Enhanced)
```javascript
// Current: Notification.ts (✅ Already exists - needs enhancement)
{
  _id: ObjectId,
  
  // Recipients
  recipientId: ObjectId, // ref: User
  recipientRole: String, // for role-based notifications
  
  // Content
  type: Enum['booking_confirmation', 'event_reminder', 'payment_success', 'event_cancelled', 'review_request', 'promotion', 'system_update'],
  title: String,
  message: String,
  actionUrl: String, // Deep link or web URL
  
  // Rich content
  imageUrl: String,
  metadata: Object, // Additional data for rendering
  
  // Multi-channel delivery
  channels: [{
    type: Enum['email', 'sms', 'push', 'in_app'],
    status: Enum['pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'],
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    failureReason: String
  }],
  
  // Scheduling
  scheduledFor: Date,
  
  // Status
  isRead: Boolean,
  readAt: Date,
  
  // Priority
  priority: Enum['low', 'normal', 'high', 'urgent'],
  
  // Personalization
  personalizationData: Object,
  language: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 5.2 Messages Collection (New)
```javascript
{
  _id: ObjectId,
  
  // Conversation
  conversationId: ObjectId, // Groups related messages
  
  // Participants
  senderId: ObjectId, // ref: User
  recipientId: ObjectId, // ref: User
  
  // Message content
  messageType: Enum['text', 'image', 'file', 'system'],
  content: String,
  attachments: [{
    type: String, // image, pdf, etc.
    url: String,
    filename: String,
    size: Number
  }],
  
  // Context (what this message is about)
  contextType: Enum['booking', 'event', 'general_inquiry', 'support'],
  contextId: ObjectId, // booking ID, event ID, etc.
  
  // Status
  status: Enum['sent', 'delivered', 'read'],
  readAt: Date,
  
  // Moderation
  isModerated: Boolean,
  moderationFlags: [String],
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 5.3 SupportTickets Collection (New)
```javascript
{
  _id: ObjectId,
  ticketNumber: String, // unique (ST-2024-001234)
  
  // User information
  customerId: ObjectId, // ref: User
  
  // Ticket details
  subject: String,
  description: String,
  category: Enum['booking_issue', 'payment_problem', 'technical_issue', 'general_inquiry', 'complaint'],
  priority: Enum['low', 'medium', 'high', 'urgent'],
  
  // Status tracking
  status: Enum['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'],
  
  // Assignment
  assignedTo: ObjectId, // ref: User (admin/support)
  assignedAt: Date,
  
  // Resolution
  resolution: String,
  resolvedAt: Date,
  resolvedBy: ObjectId, // ref: User
  customerSatisfaction: Number, // 1-5 rating
  
  // Related entities
  relatedBooking: ObjectId,
  relatedEvent: ObjectId,
  
  // Communication thread
  messages: [{
    senderId: ObjectId,
    message: String,
    attachments: [String],
    sentAt: Date,
    isInternal: Boolean // internal notes vs customer communication
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

### 6. **Content Management Collections**

#### 6.1 Categories Collection (Enhanced)
```javascript
// Current: Category.ts (✅ Already exists - needs enhancement)
{
  _id: ObjectId,
  name: String,
  slug: String, // unique URL-friendly name
  description: String,
  
  // Hierarchy
  parentId: ObjectId, // ref: Category (null for top-level)
  level: Number, // 0 for top-level, 1 for subcategory, etc.
  path: String, // "sports/football/youth"
  
  // Display
  icon: String, // icon name or URL
  color: String, // hex color for theming
  image: String, // Cloudinary URL
  displayOrder: Number,
  
  // Multi-language support
  translations: [{
    language: String, // 'en', 'ar'
    name: String,
    description: String
  }],
  
  // SEO
  seoMeta: {
    title: String,
    description: String,
    keywords: [String]
  },
  
  // Statistics
  eventCount: Number,
  popularityScore: Number, // calculated based on bookings, views
  
  // Status
  isActive: Boolean,
  isFeatured: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 6.2 ContentPages Collection (New)
```javascript
{
  _id: ObjectId,
  
  // Page identification
  slug: String, // unique URL slug
  type: Enum['page', 'help_article', 'faq', 'legal', 'blog_post'],
  
  // Content
  title: String,
  content: String, // Rich text/HTML content
  excerpt: String, // Short summary
  
  // Multi-language
  translations: [{
    language: String,
    title: String,
    content: String,
    excerpt: String
  }],
  
  // SEO
  seoMeta: {
    title: String,
    description: String,
    keywords: [String]
  },
  
  // Media
  featuredImage: String,
  gallery: [String],
  
  // Organization
  categoryId: ObjectId, // ref: ContentCategory
  tags: [String],
  
  // Authoring
  authorId: ObjectId, // ref: User (admin)
  
  // Publishing
  status: Enum['draft', 'published', 'archived'],
  publishedAt: Date,
  scheduledFor: Date,
  
  // Engagement
  viewCount: Number,
  shareCount: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 6.3 Languages Collection (New)
```javascript
{
  _id: ObjectId,
  code: String, // 'en', 'ar'
  name: String, // 'English', 'Arabic'
  nativeName: String, // 'English', 'العربية'
  isRTL: Boolean,
  isActive: Boolean,
  isDefault: Boolean,
  flagIcon: String, // Country flag URL
  createdAt: Date,
  updatedAt: Date
}
```

#### 6.4 Translations Collection (New)
```javascript
{
  _id: ObjectId,
  key: String, // 'app.login.title'
  namespace: String, // 'common', 'auth', 'booking'
  
  translations: [{
    language: String, // 'en', 'ar'
    value: String, // Translated text
    isApproved: Boolean,
    translatedBy: ObjectId, // ref: User
    translatedAt: Date
  }],
  
  // Metadata
  category: String, // ui, email, sms, etc.
  description: String, // Context for translators
  
  createdAt: Date,
  updatedAt: Date
}
```

### 7. **Analytics and Reporting Collections**

#### 7.1 UserAnalytics Collection (New)
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // ref: User
  
  // Date tracking
  date: Date, // Daily aggregation
  
  // Activity metrics
  sessionCount: Number,
  sessionDuration: Number, // total minutes
  pageViews: Number,
  eventsViewed: Number,
  searchesPerformed: Number,
  bookingsMade: Number,
  
  // Engagement
  eventsLiked: Number,
  reviewsWritten: Number,
  messagesExchanged: Number,
  
  // Device info
  deviceTypes: [{
    type: String, // mobile, desktop, tablet
    count: Number
  }],
  
  createdAt: Date
}
```

#### 7.2 EventAnalytics Collection (New)
```javascript
{
  _id: ObjectId,
  eventId: ObjectId, // ref: Event
  
  // Date tracking
  date: Date, // Daily aggregation
  
  // Performance metrics
  views: Number,
  uniqueViews: Number,
  bookingAttempts: Number,
  bookingsCompleted: Number,
  conversionRate: Number,
  
  // Financial metrics
  revenue: Number,
  averageOrderValue: Number,
  
  // User engagement
  timeSpentOnPage: Number, // average seconds
  shareCount: Number,
  wishlistAdds: Number,
  
  // Traffic sources
  trafficSources: [{
    source: String, // search, social, direct, referral
    count: Number
  }],
  
  createdAt: Date
}
```

### 8. **System Collections**

#### 8.1 SystemSettings Collection (New)
```javascript
{
  _id: ObjectId,
  key: String, // unique setting key
  value: Mixed, // Setting value (string, number, object, etc.)
  type: Enum['string', 'number', 'boolean', 'object', 'array'],
  description: String,
  category: String, // payment, email, general, etc.
  isPublic: Boolean, // Can be accessed by frontend
  lastModifiedBy: ObjectId, // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

#### 8.2 AuditLogs Collection (New)
```javascript
{
  _id: ObjectId,
  
  // Action tracking
  action: String, // 'user.login', 'booking.create', 'event.approve'
  entity: String, // 'User', 'Booking', 'Event'
  entityId: ObjectId,
  
  // User information
  userId: ObjectId, // ref: User
  userRole: String,
  
  // Request details
  ipAddress: String,
  userAgent: String,
  
  // Changes made
  oldValues: Object,
  newValues: Object,
  
  // Status
  success: Boolean,
  errorMessage: String,
  
  // Context
  metadata: Object,
  
  createdAt: Date
}
```

## Summary: Complete Collections List (27 Collections)

### Core Collections (8)
1. **Users** - Enhanced user management with role-specific profiles
2. **UserSessions** - Session tracking and device management
3. **UserPreferences** - User preferences and settings
4. **RefreshToken** - JWT refresh token management ✅ (exists)
5. **Employee** - Employee management ✅ (exists)
6. **CheckinLog** - Event check-in tracking ✅ (exists)
7. **UserAnalytics** - User behavior analytics
8. **AuditLogs** - System audit trail

### Event Management (4)
9. **Events** - Enhanced event management ✅ (exists, needs enhancement)
10. **EventTemplates** - Reusable event templates
11. **EventViews** - Event view tracking
12. **EventAnalytics** - Event performance analytics

### Booking & Transactions (6)
13. **Bookings** - Enhanced booking management ✅ (exists, needs enhancement)  
14. **BookingHolds** - Temporary booking holds
15. **Tickets** - Enhanced ticket management with QR codes ✅ (exists, needs enhancement)
16. **Orders** - Order management ✅ (exists)
17. **Payments** - Enhanced payment processing ✅ (exists, needs enhancement)
18. **Payouts** - Vendor payout management

### Financial Management (3)
19. **CommissionRules** - Commission calculation rules
20. **VendorEarnings** - Vendor earnings tracking
21. **PlatformRevenue** - Platform revenue analytics

### Communication (3)
22. **Notifications** - Multi-channel notifications ✅ (exists, needs enhancement)
23. **Messages** - Direct messaging system
24. **SupportTickets** - Customer support system

### Content & Reviews (3)
25. **Categories** - Enhanced category management ✅ (exists, needs enhancement)
26. **Reviews** - Review and rating system ✅ (exists)
27. **ContentPages** - CMS for static content

### Additional Specialized Collections (4)
28. **Coupons** - Discount and coupon system ✅ (exists)
29. **Venues** - Venue management ✅ (exists)
30. **Affiliates** - Affiliate program management ✅ (exists)
31. **Blogs** - Blog management ✅ (exists)

### Internationalization (2)
32. **Languages** - Multi-language support
33. **Translations** - Translation management

### System (1)
34. **SystemSettings** - Application configuration

This gives you a total of **34 comprehensive collections** that support all the role-based features you outlined, far exceeding your target of 25+ collections while providing a robust, scalable architecture for your event management platform.