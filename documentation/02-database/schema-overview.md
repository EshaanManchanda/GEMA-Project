# Database Schema Overview

## 🗄️ MongoDB Database Architecture

The Gema Event Management Platform uses MongoDB as its primary database, designed with a flexible document-based approach to handle complex relationships between users, events, bookings, and business operations.

---

## 🏗️ **Database Design Philosophy**

### Core Design Principles
- **Document-Oriented**: Leverage MongoDB's flexible schema capabilities
- **Embedded vs Referenced**: Strategic use of both patterns based on access patterns
- **Scalability**: Designed for horizontal scaling and sharding
- **Performance**: Optimized indexes for common query patterns
- **Data Integrity**: Validation at both application and database levels

### Relationship Patterns
- **One-to-Many**: Users → Bookings, Events → Reviews
- **Many-to-Many**: Users ↔ Events (through Bookings), Categories ↔ Events
- **One-to-One**: User → Profile extensions, Payment → Booking
- **Embedded Documents**: Address, Contact Info, Settings

---

## 📊 **Database Collections Overview**

### Core Collections (8)
```
📁 Core Business Logic
├── 👥 users           # User accounts and authentication
├── 🎪 events          # Event listings and details
├── 🎫 bookings        # Event bookings and reservations
├── 📂 categories      # Event categorization system
├── ⭐ reviews         # User reviews and ratings
├── 💰 payments        # Payment transactions
├── 🔔 notifications   # System notifications
└── 🏪 vendors         # Vendor profiles and settings
```

### Supporting Collections (12)
```
📁 Supporting Systems
├── 👨‍💼 employees       # Staff and employee management
├── 🎟️ coupons         # Discount codes and promotions
├── 🤝 affiliates      # Affiliate tracking system
├── 📊 analytics       # Analytics and metrics
├── 📝 blogs           # Blog posts and content
├── 💬 comments        # User comments on blogs
├── 📧 newsletters     # Newsletter subscriptions
├── 🎯 wishlists       # User wishlists and favorites
├── 📱 sessions        # User session management
├── 🔄 refreshTokens   # JWT refresh tokens
├── ⚙️ settings        # System configuration
└── 📈 reports         # Generated reports and exports
```

### Utility Collections (5)
```
📁 System Utilities
├── 🏷️ tags            # Tagging system
├── 📍 locations       # Geographic locations
├── 📅 schedules       # Event scheduling
├── 📸 media           # Media file metadata
└── 🗓️ calendars       # Calendar integrations
```

**Total Collections: 25+**

---

## 🎯 **Core Collection Schemas**

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String,        // Unique identifier
  password: String,     // Hashed password
  firstName: String,
  lastName: String,
  phone: String,
  role: String,        // "admin" | "vendor" | "employee" | "customer"
  isActive: Boolean,
  isEmailVerified: Boolean,
  profile: {           // Embedded profile data
    avatar: String,
    dateOfBirth: Date,
    gender: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    preferences: {
      language: String,  // "en" | "ar"
      currency: String,  // "AED" | "USD" | "EUR"
      notifications: Boolean,
      theme: String
    }
  },
  vendorInfo: {        // Vendor-specific data
    businessName: String,
    businessType: String,
    licenseNumber: String,
    isApproved: Boolean,
    commissionRate: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Events Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  shortDescription: String,
  category: ObjectId,    // Reference to categories
  vendor: ObjectId,      // Reference to users (vendor)
  
  // Event Details
  images: [String],      // Cloudinary URLs
  videos: [String],
  price: {
    amount: Number,
    currency: String,
    discountedPrice: Number
  },
  ageRange: {
    min: Number,
    max: Number
  },
  
  // Location & Timing
  location: {
    name: String,
    address: String,
    city: String,
    coordinates: {
      type: "Point",
      coordinates: [Number, Number]  // [longitude, latitude]
    }
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    recurring: Boolean,
    frequency: String,   // "daily" | "weekly" | "monthly"
    availableSlots: [{
      date: Date,
      startTime: String,
      endTime: String,
      maxCapacity: Number,
      bookedCount: Number
    }]
  },
  
  // Metadata
  tags: [String],
  capacity: Number,
  duration: Number,      // Duration in minutes
  language: String,
  isActive: Boolean,
  isApproved: Boolean,
  approvedBy: ObjectId,
  approvedAt: Date,
  
  // Stats
  views: Number,
  bookingsCount: Number,
  averageRating: Number,
  reviewsCount: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Bookings Collection
```javascript
{
  _id: ObjectId,
  bookingNumber: String,  // Unique booking identifier
  user: ObjectId,         // Reference to users
  event: ObjectId,        // Reference to events
  vendor: ObjectId,       // Reference to vendor
  
  // Booking Details
  attendees: [{
    name: String,
    age: Number,
    relationship: String  // "child" | "parent" | "guardian"
  }],
  numberOfAttendees: Number,
  selectedSlot: {
    date: Date,
    startTime: String,
    endTime: String
  },
  
  // Pricing
  pricing: {
    basePrice: Number,
    discountAmount: Number,
    taxAmount: Number,
    totalAmount: Number,
    currency: String
  },
  
  // Status Management
  status: String,         // "pending" | "confirmed" | "cancelled" | "completed"
  paymentStatus: String,  // "pending" | "paid" | "refunded" | "failed"
  paymentId: ObjectId,    // Reference to payments
  
  // Special Requirements
  specialRequirements: String,
  couponCode: String,
  affiliateCode: String,
  
  // Timestamps
  bookedAt: Date,
  confirmedAt: Date,
  cancelledAt: Date,
  completedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Categories Collection
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,           // URL-friendly identifier
  description: String,
  icon: String,           // Icon identifier or URL
  image: String,          // Category image URL
  color: String,          // Brand color for category
  
  // Hierarchy
  parentCategory: ObjectId,  // Reference to parent category
  isTopLevel: Boolean,
  sortOrder: Number,
  
  // Metadata
  isActive: Boolean,
  eventsCount: Number,    // Denormalized count
  
  // Multi-language Support
  translations: {
    ar: {
      name: String,
      description: String
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Reviews Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId,         // Reference to users
  event: ObjectId,        // Reference to events
  booking: ObjectId,      // Reference to bookings
  
  // Review Content
  rating: Number,         // 1-5 stars
  title: String,
  comment: String,
  images: [String],       // Optional review images
  
  // Moderation
  isApproved: Boolean,
  moderatedBy: ObjectId,
  moderatedAt: Date,
  
  // Engagement
  helpfulVotes: Number,
  reportCount: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔗 **Relationship Mapping**

### Primary Relationships
```
Users (1) ←→ (M) Bookings ←→ (1) Events
Users (1) ←→ (M) Reviews ←→ (1) Events
Users (1) ←→ (M) Events (vendor relationship)
Categories (1) ←→ (M) Events
Bookings (1) ←→ (1) Payments
Users (1) ←→ (M) Notifications
```

### Reference Strategy
```javascript
// Embedded Documents (Small, Stable Data)
- User preferences and settings
- Address information
- Pricing details
- Event schedules and slots

// Referenced Documents (Large, Changing Data)
- User → Bookings relationship
- Event → Reviews relationship
- Category → Events relationship
- Booking → Payment relationship
```

---

## ⚡ **Performance Optimization**

### Indexing Strategy

#### Primary Indexes
```javascript
// Users Collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1, isActive: 1 })
db.users.createIndex({ "vendorInfo.isApproved": 1 })

// Events Collection
db.events.createIndex({ isActive: 1, isApproved: 1 })
db.events.createIndex({ category: 1, isActive: 1 })
db.events.createIndex({ vendor: 1, isActive: 1 })
db.events.createIndex({ "location.coordinates": "2dsphere" })
db.events.createIndex({ "schedule.startDate": 1, "schedule.endDate": 1 })

// Bookings Collection
db.bookings.createIndex({ user: 1, createdAt: -1 })
db.bookings.createIndex({ event: 1, status: 1 })
db.bookings.createIndex({ bookingNumber: 1 }, { unique: true })
db.bookings.createIndex({ "selectedSlot.date": 1 })

// Categories Collection
db.categories.createIndex({ slug: 1 }, { unique: true })
db.categories.createIndex({ isActive: 1, sortOrder: 1 })
```

#### Compound Indexes
```javascript
// Event Search Optimization
db.events.createIndex({
  isActive: 1,
  isApproved: 1,
  "schedule.startDate": 1,
  "price.amount": 1
})

// User Activity Optimization
db.bookings.createIndex({
  user: 1,
  status: 1,
  createdAt: -1
})

// Vendor Dashboard Optimization
db.events.createIndex({
  vendor: 1,
  isActive: 1,
  createdAt: -1
})
```

### Query Optimization Patterns
```javascript
// Efficient Event Searching
db.events.find({
  isActive: true,
  isApproved: true,
  "schedule.startDate": { $gte: new Date() },
  "location.city": "Dubai"
}).hint({ isActive: 1, isApproved: 1, "schedule.startDate": 1 })

// User Booking History
db.bookings.find({
  user: ObjectId("..."),
  status: { $in: ["confirmed", "completed"] }
}).sort({ createdAt: -1 }).limit(20)

// Vendor Analytics
db.bookings.aggregate([
  { $match: { vendor: ObjectId("...") } },
  { $group: {
    _id: "$status",
    count: { $sum: 1 },
    totalRevenue: { $sum: "$pricing.totalAmount" }
  }}
])
```

---

## 📈 **Data Growth Planning**

### Estimated Collection Sizes
| Collection | Initial | 1 Year | 5 Years | Notes |
|------------|---------|---------|---------|-------|
| **users** | 1K | 50K | 500K | User growth |
| **events** | 100 | 5K | 50K | Event listings |
| **bookings** | 500 | 100K | 2M | High transaction volume |
| **reviews** | 100 | 10K | 200K | User engagement |
| **notifications** | 1K | 500K | 10M | High frequency |

### Scaling Strategies
```javascript
// Sharding Strategy
sh.shardCollection("gema.bookings", { "user": 1, "createdAt": 1 })
sh.shardCollection("gema.notifications", { "user": 1, "createdAt": 1 })

// Archive Strategy
// Monthly archival of old notifications
db.notifications.remove({
  createdAt: { $lt: new Date(Date.now() - 90*24*60*60*1000) },
  isRead: true
})
```

---

## 🛡️ **Data Validation & Integrity**

### Schema Validation Examples
```javascript
// Users Collection Validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "firstName", "lastName", "role"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^.+@.+\..+$",
          description: "must be a valid email"
        },
        role: {
          bsonType: "string",
          enum: ["admin", "vendor", "employee", "customer"]
        }
      }
    }
  }
})

// Events Collection Validation  
db.createCollection("events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "description", "category", "vendor", "price"],
      properties: {
        price: {
          bsonType: "object",
          required: ["amount", "currency"],
          properties: {
            amount: { bsonType: "number", minimum: 0 },
            currency: { bsonType: "string", enum: ["AED", "USD", "EUR"] }
          }
        }
      }
    }
  }
})
```

### Data Consistency Patterns
```javascript
// Denormalization for Performance
// Update event stats when booking is created
db.events.updateOne(
  { _id: eventId },
  { 
    $inc: { bookingsCount: 1 },
    $set: { updatedAt: new Date() }
  }
)

// Referential Integrity (Application Level)
// Cascade delete: Remove user reviews when user is deleted
db.reviews.deleteMany({ user: deletedUserId })
db.bookings.updateMany(
  { user: deletedUserId },
  { $set: { user: null, userDeleted: true } }
)
```

---

## 🔄 **Migration & Evolution**

### Schema Versioning
```javascript
// Schema version tracking
db.metadata.insertOne({
  _id: "schema_version",
  version: "1.2.0",
  lastUpdate: new Date(),
  changes: [
    "Added affiliate tracking to bookings",
    "Enhanced location schema with coordinates",
    "Added multi-language support to categories"
  ]
})
```

### Common Migration Patterns
```javascript
// Add new field with default value
db.users.updateMany(
  { "profile.preferences": { $exists: false } },
  { 
    $set: { 
      "profile.preferences": {
        language: "en",
        currency: "AED",
        notifications: true,
        theme: "light"
      }
    }
  }
)

// Rename field
db.events.updateMany(
  {},
  { $rename: { "oldFieldName": "newFieldName" } }
)

// Data type conversion
db.events.find({ capacity: { $type: "string" } }).forEach(function(doc) {
  db.events.updateOne(
    { _id: doc._id },
    { $set: { capacity: parseInt(doc.capacity) } }
  )
})
```

---

**Schema Status**: ✅ **Production Optimized**

This database schema is designed for scalability, performance, and maintainability, supporting the full feature set of the Gema Event Management Platform while allowing for future growth and enhancements.