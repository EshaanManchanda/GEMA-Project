# Collections Reference

## 📚 Complete MongoDB Collections Documentation

Detailed reference for all 25+ collections in the Gema Event Management Platform database, including schemas, relationships, and usage patterns.

---

## 👥 **Core User Management**

### Users Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "john.doe@example.com",
  password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLJqPNfmXR7O0K6",
  firstName: "John",
  lastName: "Doe",
  phone: "+971-50-123-4567",
  role: "customer", // admin | vendor | employee | customer
  isActive: true,
  isEmailVerified: true,
  
  // Embedded Profile Data
  profile: {
    avatar: "https://res.cloudinary.com/gema/image/upload/v1/avatars/user123.jpg",
    dateOfBirth: ISODate("1990-05-15"),
    gender: "male", // male | female | other
    bio: "Loving parent of two amazing kids",
    
    // Address Information
    address: {
      street: "123 Al Wasl Road",
      city: "Dubai",
      state: "Dubai",
      zipCode: "12345",
      country: "UAE",
      coordinates: {
        type: "Point",
        coordinates: [55.2708, 25.2048] // [longitude, latitude]
      }
    },
    
    // User Preferences
    preferences: {
      language: "en", // en | ar
      currency: "AED", // AED | USD | EUR
      notifications: {
        email: true,
        sms: false,
        push: true,
        marketing: false
      },
      theme: "light", // light | dark
      timezone: "Asia/Dubai"
    }
  },
  
  // Vendor-Specific Information
  vendorInfo: {
    businessName: "Amazing Kids Events",
    businessType: "Entertainment", // Entertainment | Education | Sports | Arts
    licenseNumber: "DED-123456789",
    taxNumber: "TRN-987654321",
    bankAccount: {
      accountNumber: "1234567890",
      routingNumber: "ADCBAEAA",
      bankName: "ADCB Bank"
    },
    isApproved: true,
    approvedBy: ObjectId("507f1f77bcf86cd799439012"),
    approvedAt: ISODate("2024-01-15T10:00:00Z"),
    commissionRate: 0.15, // 15%
    payoutSchedule: "weekly" // daily | weekly | monthly
  },
  
  // Employee-Specific Information
  employeeInfo: {
    employeeId: "EMP-001",
    department: "Customer Service",
    supervisor: ObjectId("507f1f77bcf86cd799439013"),
    permissions: ["scan_tickets", "customer_support"],
    salary: 5000,
    hireDate: ISODate("2024-01-01")
  },
  
  // Authentication & Security
  lastLogin: ISODate("2024-09-07T14:30:00Z"),
  loginAttempts: 0,
  accountLocked: false,
  lockUntil: null,
  emailVerificationToken: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  
  // Audit Trail
  createdAt: ISODate("2024-01-01T12:00:00Z"),
  updatedAt: ISODate("2024-09-07T10:15:00Z"),
  createdBy: ObjectId("507f1f77bcf86cd799439000"),
  updatedBy: ObjectId("507f1f77bcf86cd799439011")
}
```

**Indexes:**
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1, isActive: 1 })
db.users.createIndex({ "profile.address.coordinates": "2dsphere" })
db.users.createIndex({ "vendorInfo.isApproved": 1 })
```

---

## 🎪 **Event Management**

### Events Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439021"),
  title: "Amazing Magic Show for Kids",
  slug: "amazing-magic-show-for-kids",
  description: "A spectacular magic show that will amaze children aged 4-12...",
  shortDescription: "Interactive magic show with audience participation",
  
  // Categorization
  category: ObjectId("507f1f77bcf86cd799439031"), // Reference to categories
  subcategory: "Magic Shows",
  tags: ["magic", "interactive", "entertainment", "kids"],
  
  // Vendor Information
  vendor: ObjectId("507f1f77bcf86cd799439012"), // Reference to vendor user
  vendorName: "Amazing Kids Events", // Denormalized for performance
  
  // Media Assets
  images: [
    {
      url: "https://res.cloudinary.com/gema/image/upload/v1/events/magic-show-1.jpg",
      publicId: "events/magic-show-1",
      alt: "Magician performing tricks",
      isPrimary: true
    },
    {
      url: "https://res.cloudinary.com/gema/image/upload/v1/events/magic-show-2.jpg",
      publicId: "events/magic-show-2",
      alt: "Children watching magic show",
      isPrimary: false
    }
  ],
  videos: [
    {
      url: "https://res.cloudinary.com/gema/video/upload/v1/events/magic-preview.mp4",
      publicId: "events/magic-preview",
      thumbnail: "https://res.cloudinary.com/gema/image/upload/v1/events/magic-thumb.jpg",
      duration: 120 // seconds
    }
  ],
  
  // Pricing Information
  pricing: {
    basePrice: 150,
    currency: "AED",
    priceType: "per_child", // per_child | per_family | fixed
    discountedPrice: 120,
    discountPercentage: 20,
    groupDiscounts: [
      { minQuantity: 5, discountPercentage: 10 },
      { minQuantity: 10, discountPercentage: 15 }
    ],
    earlyBirdDiscount: {
      percentage: 15,
      validUntil: ISODate("2024-09-20T00:00:00Z")
    }
  },
  
  // Target Audience
  ageRange: {
    min: 4,
    max: 12,
    recommended: "5-10 years"
  },
  audience: {
    maxCapacity: 50,
    minParticipants: 10,
    adultSupervisionRequired: true
  },
  
  // Location Details
  location: {
    venue: "Dubai Mall Community Centre",
    address: "Fashion Avenue, Dubai Mall, Dubai",
    city: "Dubai",
    emirate: "Dubai",
    country: "UAE",
    coordinates: {
      type: "Point",
      coordinates: [55.2796, 25.1972] // [longitude, latitude]
    },
    landmarks: ["Near Burj Khalifa", "Dubai Mall Metro Station"],
    parkingAvailable: true,
    accessibilityFeatures: ["wheelchair_accessible", "elevator_access"]
  },
  
  // Scheduling
  schedule: {
    startDate: ISODate("2024-09-25T15:00:00Z"),
    endDate: ISODate("2024-09-25T16:30:00Z"),
    duration: 90, // minutes
    recurring: false,
    frequency: null, // daily | weekly | monthly
    timezone: "Asia/Dubai",
    
    // Available Time Slots
    availableSlots: [
      {
        date: ISODate("2024-09-25"),
        startTime: "15:00",
        endTime: "16:30",
        maxCapacity: 50,
        bookedCount: 23,
        availableSpots: 27,
        price: 150,
        status: "available" // available | full | cancelled
      },
      {
        date: ISODate("2024-09-26"),
        startTime: "15:00", 
        endTime: "16:30",
        maxCapacity: 50,
        bookedCount: 45,
        availableSpots: 5,
        price: 150,
        status: "limited"
      }
    ]
  },
  
  // Event Features & Requirements
  features: [
    "Interactive participation",
    "Age-appropriate content", 
    "Professional magician",
    "Photo opportunities",
    "Surprise gifts for kids"
  ],
  requirements: [
    "Children must be accompanied by adults",
    "No food or drinks allowed",
    "Arrive 15 minutes early"
  ],
  includes: [
    "Magic show performance",
    "Interactive segments",
    "Small gift for each child"
  ],
  excludes: [
    "Transportation",
    "Food and beverages",
    "Photography services"
  ],
  
  // Multilingual Support
  translations: {
    ar: {
      title: "عرض سحري مذهل للأطفال",
      description: "عرض سحري مذهل سيبهر الأطفال من سن 4-12...",
      shortDescription: "عرض سحري تفاعلي مع مشاركة الجمهور"
    }
  },
  
  // Moderation & Status
  status: "active", // draft | pending | active | suspended | expired
  isApproved: true,
  approvalStatus: "approved", // pending | approved | rejected
  approvedBy: ObjectId("507f1f77bcf86cd799439001"),
  approvedAt: ISODate("2024-09-01T10:00:00Z"),
  rejectionReason: null,
  
  // Analytics & Performance
  analytics: {
    views: 1250,
    uniqueViews: 980,
    bookingsCount: 23,
    conversionRate: 2.34, // percentage
    averageRating: 4.8,
    reviewsCount: 15,
    wishlistCount: 45,
    shareCount: 12
  },
  
  // SEO & Marketing
  seo: {
    metaTitle: "Amazing Magic Show for Kids in Dubai - Book Now",
    metaDescription: "Book tickets for an amazing magic show...",
    keywords: ["kids magic show dubai", "children entertainment", "family fun"],
    ogImage: "https://res.cloudinary.com/gema/image/upload/v1/events/magic-og.jpg"
  },
  
  // System Fields
  createdAt: ISODate("2024-08-15T12:00:00Z"),
  updatedAt: ISODate("2024-09-07T14:30:00Z"),
  createdBy: ObjectId("507f1f77bcf86cd799439012"),
  updatedBy: ObjectId("507f1f77bcf86cd799439012")
}
```

**Indexes:**
```javascript
db.events.createIndex({ status: 1, isApproved: 1 })
db.events.createIndex({ vendor: 1, status: 1 })
db.events.createIndex({ category: 1, status: 1 })
db.events.createIndex({ "location.coordinates": "2dsphere" })
db.events.createIndex({ "schedule.startDate": 1, "schedule.endDate": 1 })
db.events.createIndex({ slug: 1 }, { unique: true })
```

---

## 🎫 **Booking Management**

### Bookings Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439041"),
  bookingNumber: "GEM-240907-001234",
  
  // Relationships
  user: ObjectId("507f1f77bcf86cd799439011"), // Customer
  event: ObjectId("507f1f77bcf86cd799439021"),
  vendor: ObjectId("507f1f77bcf86cd799439012"),
  
  // Booking Details
  attendees: [
    {
      name: "Sarah Doe",
      age: 8,
      relationship: "child",
      specialNeeds: "None",
      emergencyContact: "+971-50-987-6543"
    },
    {
      name: "John Doe",
      age: 35,
      relationship: "parent",
      emergencyContact: "+971-50-123-4567"
    }
  ],
  numberOfAttendees: 2,
  
  // Selected Time Slot
  selectedSlot: {
    date: ISODate("2024-09-25"),
    startTime: "15:00",
    endTime: "16:30",
    slotId: "slot-001"
  },
  
  // Pricing Breakdown
  pricing: {
    basePrice: 150,
    quantity: 1, // number of children
    subtotal: 150,
    discountAmount: 30, // Early bird discount
    couponDiscount: 0,
    taxAmount: 7.50, // 5% VAT
    serviceFee: 5.00,
    totalAmount: 132.50,
    currency: "AED"
  },
  
  // Discount & Promotion Details
  appliedDiscounts: [
    {
      type: "early_bird",
      name: "Early Bird Discount",
      amount: 30,
      percentage: 20
    }
  ],
  couponCode: null,
  affiliateCode: "REF123",
  affiliateCommission: 6.63, // 5% of total
  
  // Status Management
  status: "confirmed", // pending | confirmed | cancelled | completed | no_show
  paymentStatus: "paid", // pending | paid | refunded | partially_refunded | failed
  bookingConfirmed: true,
  confirmationSentAt: ISODate("2024-09-07T12:30:00Z"),
  
  // Special Requirements
  specialRequirements: "Child has mild peanut allergy - please ensure no nuts in any gifts",
  accessibilityNeeds: [],
  dietaryRestrictions: ["nuts"],
  
  // Contact Information
  contactInfo: {
    email: "john.doe@example.com",
    phone: "+971-50-123-4567",
    alternatePhone: "+971-4-123-4567",
    preferredContactMethod: "email"
  },
  
  // Check-in Information
  checkedIn: false,
  checkInTime: null,
  checkInBy: null, // Employee who checked them in
  qrCode: "GEM-240907-001234-QR",
  
  // Cancellation Details
  cancellationReason: null,
  cancellationPolicy: "full_refund_48h",
  cancellationFee: 0,
  refundAmount: 0,
  refundedAt: null,
  
  // Review & Rating
  reviewSubmitted: false,
  rating: null,
  reviewId: null,
  
  // Communication Log
  communications: [
    {
      type: "email",
      template: "booking_confirmation",
      sentAt: ISODate("2024-09-07T12:30:00Z"),
      status: "delivered"
    },
    {
      type: "sms",
      template: "reminder_24h",
      sentAt: ISODate("2024-09-24T15:00:00Z"),
      status: "pending"
    }
  ],
  
  // Payment Reference
  paymentId: ObjectId("507f1f77bcf86cd799439051"),
  paymentMethod: "card",
  paymentGateway: "stripe",
  transactionId: "pi_1234567890abcdef",
  
  // Timestamps
  bookedAt: ISODate("2024-09-07T12:15:00Z"),
  confirmedAt: ISODate("2024-09-07T12:30:00Z"),
  cancelledAt: null,
  completedAt: null,
  
  createdAt: ISODate("2024-09-07T12:15:00Z"),
  updatedAt: ISODate("2024-09-07T12:30:00Z")
}
```

**Indexes:**
```javascript
db.bookings.createIndex({ bookingNumber: 1 }, { unique: true })
db.bookings.createIndex({ user: 1, createdAt: -1 })
db.bookings.createIndex({ event: 1, status: 1 })
db.bookings.createIndex({ vendor: 1, status: 1 })
db.bookings.createIndex({ "selectedSlot.date": 1 })
db.bookings.createIndex({ status: 1, paymentStatus: 1 })
```

---

## 📂 **Category System**

### Categories Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439031"),
  name: "Entertainment",
  slug: "entertainment",
  description: "Fun and engaging entertainment activities for children",
  
  // Visual Identity
  icon: "🎭",
  iconUrl: "https://res.cloudinary.com/gema/image/upload/v1/categories/entertainment-icon.svg",
  image: "https://res.cloudinary.com/gema/image/upload/v1/categories/entertainment-banner.jpg",
  color: "#FF6B6B", // Primary brand color
  backgroundColor: "#FFE5E5",
  
  // Hierarchy
  parentCategory: null, // Top level category
  isTopLevel: true,
  sortOrder: 1,
  level: 0,
  path: ["entertainment"],
  
  // Subcategories
  subcategories: [
    {
      name: "Magic Shows",
      slug: "magic-shows",
      icon: "🎩"
    },
    {
      name: "Puppet Shows", 
      slug: "puppet-shows",
      icon: "🎪"
    }
  ],
  
  // Multi-language Support
  translations: {
    ar: {
      name: "الترفيه",
      description: "أنشطة ترفيهية ممتعة وجذابة للأطفال"
    }
  },
  
  // SEO & Marketing
  seo: {
    metaTitle: "Kids Entertainment Activities in Dubai | Gema",
    metaDescription: "Discover amazing entertainment activities for children...",
    keywords: ["kids entertainment", "children activities", "dubai events"]
  },
  
  // Analytics
  eventsCount: 45,
  bookingsCount: 234,
  totalRevenue: 23450.00,
  averageRating: 4.6,
  
  // Status
  isActive: true,
  isFeatured: true,
  
  createdAt: ISODate("2024-01-01T12:00:00Z"),
  updatedAt: ISODate("2024-09-01T10:00:00Z")
}
```

**Indexes:**
```javascript
db.categories.createIndex({ slug: 1 }, { unique: true })
db.categories.createIndex({ isActive: 1, sortOrder: 1 })
db.categories.createIndex({ parentCategory: 1, isActive: 1 })
```

---

## ⭐ **Review System**

### Reviews Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439061"),
  
  // Relationships
  user: ObjectId("507f1f77bcf86cd799439011"),
  event: ObjectId("507f1f77bcf86cd799439021"),
  booking: ObjectId("507f1f77bcf86cd799439041"),
  vendor: ObjectId("507f1f77bcf86cd799439012"),
  
  // Review Content
  rating: 5,
  title: "Amazing magic show! Kids loved it!",
  comment: "The magician was fantastic and kept all the kids engaged...",
  
  // Media Attachments
  images: [
    {
      url: "https://res.cloudinary.com/gema/image/upload/v1/reviews/review-001-1.jpg",
      publicId: "reviews/review-001-1",
      caption: "Kids enjoying the magic show"
    }
  ],
  
  // Detailed Ratings
  ratings: {
    overall: 5,
    value: 5,        // Value for money
    quality: 5,      // Quality of service
    organization: 4,  // Event organization
    venue: 4,        // Venue quality
    staff: 5         // Staff friendliness
  },
  
  // Review Metadata
  isVerifiedPurchase: true,
  attendedEvent: true,
  eventDate: ISODate("2024-09-25"),
  reviewDate: ISODate("2024-09-26T10:30:00Z"),
  
  // Moderation
  status: "approved", // pending | approved | rejected | flagged
  isApproved: true,
  moderatedBy: ObjectId("507f1f77bcf86cd799439001"),
  moderatedAt: ISODate("2024-09-26T14:00:00Z"),
  moderationNotes: null,
  
  // Engagement
  helpfulVotes: 8,
  notHelpfulVotes: 0,
  totalVotes: 8,
  reportCount: 0,
  
  // Vendor Response
  vendorResponse: {
    comment: "Thank you so much for the wonderful review! We're thrilled the kids enjoyed it.",
    respondedAt: ISODate("2024-09-26T16:00:00Z"),
    respondedBy: ObjectId("507f1f77bcf86cd799439012")
  },
  
  // User Information (Denormalized)
  userInfo: {
    firstName: "John",
    avatar: "https://res.cloudinary.com/gema/image/upload/v1/avatars/user123.jpg"
  },
  
  createdAt: ISODate("2024-09-26T10:30:00Z"),
  updatedAt: ISODate("2024-09-26T16:00:00Z")
}
```

**Indexes:**
```javascript
db.reviews.createIndex({ event: 1, isApproved: 1 })
db.reviews.createIndex({ user: 1, createdAt: -1 })
db.reviews.createIndex({ vendor: 1, isApproved: 1 })
db.reviews.createIndex({ rating: 1, isApproved: 1 })
```

---

## 💰 **Payment System**

### Payments Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439051"),
  
  // Relationships
  booking: ObjectId("507f1f77bcf86cd799439041"),
  user: ObjectId("507f1f77bcf86cd799439011"),
  vendor: ObjectId("507f1f77bcf86cd799439012"),
  
  // Payment Details
  amount: 132.50,
  currency: "AED",
  paymentMethod: "card",
  
  // Gateway Information
  gateway: "stripe",
  gatewayPaymentId: "pi_1234567890abcdef",
  gatewayCustomerId: "cus_1234567890abcdef",
  paymentIntentId: "pi_1234567890abcdef",
  
  // Card Details (Tokenized)
  paymentSource: {
    type: "card",
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2025,
    country: "AE",
    funding: "credit"
  },
  
  // Status & Processing
  status: "succeeded", // pending | processing | succeeded | failed | cancelled | refunded
  processingFee: 4.88, // Gateway fee (3.7% + AED 1.8)
  netAmount: 127.62,   // Amount after processing fee
  
  // Commission & Payouts
  platformCommission: 19.88, // 15% of amount
  vendorPayout: 107.74,       // Amount to be paid to vendor
  affiliateCommission: 6.63,  // 5% of amount
  
  // Transaction Timeline
  authorizedAt: ISODate("2024-09-07T12:15:00Z"),
  capturedAt: ISODate("2024-09-07T12:15:30Z"),
  settledAt: ISODate("2024-09-07T12:16:00Z"),
  
  // Refund Information
  refunds: [],
  totalRefunded: 0,
  refundableAmount: 132.50,
  
  // Receipt & Documentation
  receiptNumber: "RCP-240907-001234",
  receiptUrl: "https://gema.com/receipts/GEM-240907-001234.pdf",
  invoiceNumber: "INV-240907-001234",
  
  // Billing Information
  billingAddress: {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+971-50-123-4567",
    address: "123 Al Wasl Road",
    city: "Dubai",
    state: "Dubai",
    zipCode: "12345",
    country: "UAE"
  },
  
  // Tax Information
  taxDetails: {
    taxRate: 0.05, // 5% VAT
    taxAmount: 7.50,
    taxNumber: "TRN-100123456789012",
    taxInclusive: false
  },
  
  // Risk & Fraud
  riskScore: 12, // Low risk
  riskLevel: "low", // low | medium | high
  fraudChecks: {
    cvvCheck: "pass",
    avsCheck: "pass",
    velocityCheck: "pass"
  },
  
  // Metadata
  metadata: {
    bookingNumber: "GEM-240907-001234",
    eventTitle: "Amazing Magic Show for Kids",
    source: "web_checkout"
  },
  
  createdAt: ISODate("2024-09-07T12:15:00Z"),
  updatedAt: ISODate("2024-09-07T12:16:00Z")
}
```

**Indexes:**
```javascript
db.payments.createIndex({ booking: 1 })
db.payments.createIndex({ user: 1, createdAt: -1 })
db.payments.createIndex({ vendor: 1, status: 1 })
db.payments.createIndex({ gatewayPaymentId: 1 })
db.payments.createIndex({ status: 1, createdAt: -1 })
```

---

## 🔔 **Notification System**

### Notifications Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439071"),
  
  // Recipients
  user: ObjectId("507f1f77bcf86cd799439011"),
  recipients: [ObjectId("507f1f77bcf86cd799439011")], // For group notifications
  
  // Notification Content
  type: "booking_confirmation", // booking_confirmation | event_reminder | payment_received
  title: "Booking Confirmed!",
  message: "Your booking for 'Amazing Magic Show for Kids' has been confirmed.",
  
  // Rich Content
  data: {
    bookingId: ObjectId("507f1f77bcf86cd799439041"),
    eventId: ObjectId("507f1f77bcf86cd799439021"),
    bookingNumber: "GEM-240907-001234",
    eventTitle: "Amazing Magic Show for Kids",
    eventDate: "2024-09-25T15:00:00Z",
    actionUrl: "/bookings/507f1f77bcf86cd799439041"
  },
  
  // Delivery Channels
  channels: {
    push: {
      enabled: true,
      sent: true,
      sentAt: ISODate("2024-09-07T12:30:00Z"),
      deliveryStatus: "delivered"
    },
    email: {
      enabled: true,
      sent: true,
      sentAt: ISODate("2024-09-07T12:30:15Z"),
      deliveryStatus: "delivered",
      emailId: "msg_1234567890"
    },
    sms: {
      enabled: false,
      sent: false,
      reason: "user_preference"
    }
  },
  
  // Status & Interaction
  status: "delivered", // pending | sent | delivered | failed | read
  isRead: true,
  readAt: ISODate("2024-09-07T14:00:00Z"),
  isActionable: true,
  actionTaken: false,
  
  // Priority & Scheduling
  priority: "normal", // low | normal | high | urgent
  scheduledFor: null, // For scheduled notifications
  expiresAt: ISODate("2024-10-07T12:30:00Z"), // Auto-delete after 30 days
  
  createdAt: ISODate("2024-09-07T12:30:00Z"),
  updatedAt: ISODate("2024-09-07T14:00:00Z")
}
```

**Indexes:**
```javascript
db.notifications.createIndex({ user: 1, createdAt: -1 })
db.notifications.createIndex({ status: 1, scheduledFor: 1 })
db.notifications.createIndex({ expiresAt: 1 })
db.notifications.createIndex({ type: 1, status: 1 })
```

---

## 🏪 **Supporting Collections**

### Vendors Collection (Extended User Profile)
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  userId: ObjectId("507f1f77bcf86cd799439012"), // Reference to user
  
  // Business Information
  businessInfo: {
    legalName: "Amazing Kids Events LLC",
    tradeName: "Amazing Kids Events",
    businessType: "Entertainment Services",
    registrationNumber: "DED-123456789",
    taxNumber: "TRN-987654321",
    establishedYear: 2020
  },
  
  // Services & Specializations
  services: [
    "Magic Shows",
    "Birthday Parties", 
    "School Events",
    "Corporate Family Days"
  ],
  specializations: ["Interactive Entertainment", "Educational Shows"],
  ageGroups: ["3-6", "7-12", "13+"],
  
  // Operational Details
  serviceAreas: ["Dubai", "Sharjah", "Ajman"],
  languages: ["English", "Arabic"],
  teamSize: 5,
  yearsExperience: 8,
  
  // Financial Information
  payoutInfo: {
    method: "bank_transfer", // bank_transfer | paypal | stripe
    bankDetails: {
      accountName: "Amazing Kids Events LLC",
      accountNumber: "1234567890",
      iban: "AE12345678901234567890",
      swiftCode: "ADCBAEAA",
      bankName: "ADCB Bank"
    },
    taxId: "TRN-987654321"
  },
  
  // Performance Metrics
  metrics: {
    totalEvents: 156,
    completedBookings: 1543,
    averageRating: 4.8,
    responseTime: "2 hours", // Average response time
    cancellationRate: 0.02,
    repeatCustomerRate: 0.65
  },
  
  // Certifications & Documents
  certifications: [
    {
      name: "Child Safety Certification",
      issuedBy: "Dubai Municipality",
      validUntil: ISODate("2025-12-31"),
      documentUrl: "https://cloudinary.com/cert-001.pdf"
    }
  ],
  
  // Availability & Booking Settings
  availability: {
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    workingHours: {
      start: "09:00",
      end: "18:00"
    },
    bookingLeadTime: 48, // hours
    maxBookingsPerDay: 3
  },
  
  // Commission & Pricing
  commissionRate: 0.15, // 15%
  customCommissionRates: [
    {
      category: "Entertainment",
      rate: 0.15
    }
  ],
  
  createdAt: ISODate("2024-01-01T12:00:00Z"),
  updatedAt: ISODate("2024-09-01T10:00:00Z")
}
```

**Additional Supporting Collections:**

### Coupons Collection
```javascript
{
  _id: ObjectId,
  code: "MAGIC20",
  type: "percentage", // percentage | fixed_amount
  value: 20,
  currency: "AED",
  description: "20% off magic shows",
  
  // Usage Limits
  usageLimit: 100,
  usageCount: 23,
  maxUsagePerUser: 1,
  
  // Validity
  validFrom: ISODate,
  validUntil: ISODate,
  isActive: Boolean,
  
  // Conditions
  minimumAmount: 100,
  applicableCategories: [ObjectId],
  applicableEvents: [ObjectId],
  userRestrictions: {
    newUsersOnly: Boolean,
    excludeUsers: [ObjectId]
  },
  
  createdBy: ObjectId,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Affiliates Collection
```javascript
{
  _id: ObjectId,
  code: "REF123",
  referrer: ObjectId, // User who created the affiliate link
  
  // Commission Settings
  commissionType: "percentage", // percentage | fixed_amount
  commissionValue: 0.05, // 5%
  
  // Performance
  totalClicks: 245,
  totalBookings: 12,
  totalCommission: 315.50,
  conversionRate: 0.049,
  
  // Tracking
  lastUsed: ISODate,
  isActive: Boolean,
  
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

**Collections Status**: ✅ **Production Ready**

This comprehensive collections reference provides the complete data model for the Gema Event Management Platform, supporting all business operations from user management to complex booking workflows.