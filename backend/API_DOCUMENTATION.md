# Gema Event Management Platform - API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Events](#events)
3. [Orders](#orders)
4. [Tickets](#tickets)
5. [Venues](#venues)
6. [Vendors](#vendors)
7. [Reviews](#reviews)
8. [Payments](#payments)
9. [Analytics](#analytics)
10. [Check-in System](#check-in-system)
11. [Employee Management](#employee-management)
12. [Admin Management](#admin-management)
13. [Blog System](#blog-system)
14. [File Uploads](#file-uploads)
15. [Error Handling](#error-handling)
16. [Rate Limiting](#rate-limiting)

## Base URL

### Environments
```
Development:  http://localhost:5000/api
Staging:      https://gema-backend-staging.render.com/api
Production:   https://gema-backend.render.com/api
```

### API Version
- **Current Version**: v1.0.0
- **API Path**: All endpoints are prefixed with `/api`
- **Versioning Strategy**: URL-based versioning (future versions will use `/api/v2`)

### Environment Configuration
- **Node.js Version**: >=18.0.0
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with refresh tokens
- **File Storage**: Cloudinary CDN
- **Payment Processing**: Stripe
- **Email Service**: Nodemailer with SMTP
- **Logging**: Winston with file and console transports

## Authentication

### POST /api/auth/register
Register a new user account.

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123",
  "role": "customer", // "customer", "vendor", "admin"
  "phone": "+1234567890",
  "country": "UAE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "customer"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### POST /api/auth/login
Login with email and password.

**Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

### POST /api/auth/refresh-token
Refresh JWT token using refresh token.

**Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### POST /api/auth/forgot-password
Request password reset email.

**Body:**
```json
{
  "email": "john.doe@example.com"
}
```

### POST /api/auth/verify-email
Verify email address.

**Body:**
```json
{
  "token": "verification_token"
}
```

### POST /api/auth/logout
Logout user and invalidate tokens.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "customer",
      "phone": "+1234567890",
      "country": "UAE",
      "avatar": "https://cloudinary.com/avatar.jpg",
      "emailVerified": true,
      "status": "ACTIVE",
      "addresses": [],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-16T14:30:00Z"
    }
  }
}
```

### PUT /api/auth/profile
Update authenticated user's profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "country": "UAE",
  "gender": "male",
  "dateOfBirth": "1990-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "updatedAt": "2024-01-16T14:35:00Z"
    }
  }
}
```

### PUT /api/auth/change-password
Change authenticated user's password.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (Wrong Current Password):**
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "details": "The provided current password does not match"
  }
}
```

## Events

### GET /api/events
Get all events with pagination and filtering. **No authentication required.**

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12, max: 50)
- `category` (string): Filter by category (e.g., "Family & Kids", "Technology")
- `type` (string): Filter by type ("Event", "Course", "Venue")
- `venueType` (string): Filter by venue type ("Indoor", "Outdoor")
- `city` (string): Filter by city (case-insensitive)
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `currency` (string): Filter by currency ("AED", "USD", "EGP", "CAD")
- `ageMin` (number): Minimum age range filter
- `ageMax` (number): Maximum age range filter
- `featured` (string): Filter featured events ("true" for featured only)
- `search` (string): Text search across title, description, and tags
- `sortBy` (string): Sort field ("createdAt", "price", "viewsCount", "title")
- `sortOrder` (string): Sort order ("asc", "desc", default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [
      {
        "_id": "68a155c40214f9e8ddf64aff",
        "title": "Family Fun Day",
        "description": "A day of entertainment for the whole family...",
        "category": "Family & Kids",
        "type": "Event",
        "venueType": "Outdoor",
        "ageRange": [0, 80],
        "location": {
          "coordinates": {
            "lat": 25.232,
            "lng": 55.2515
          },
          "city": "Dubai",
          "address": "Jumeirah Beach Park"
        },
        "seoMeta": {
          "title": "Family Fun Day at Jumeirah Beach - All Ages",
          "description": "Perfect family day out with activities...",
          "keywords": ["family", "kids", "entertainment"]
        },
        "vendorId": {
          "_id": "68a155c30214f9e8ddf64a65",
          "firstName": "Jennifer",
          "lastName": "Smith",
          "email": "jennifer.smith@example.com"
        },
        "price": 120,
        "currency": "AED",
        "isApproved": true,
        "tags": ["family", "kids", "entertainment"],
        "dateSchedule": [
          {
            "date": "2024-04-30T10:00:00.000Z",
            "availableSeats": 2000,
            "_id": "68a155c40214f9e8ddf64b00"
          }
        ],
        "faqs": [
          {
            "question": "What age groups are the activities suitable for?",
            "answer": "Activities are designed for all ages...",
            "_id": "68a155c40214f9e8ddf64b01"
          }
        ],
        "viewsCount": 1456,
        "isFeatured": true,
        "images": ["/images/family-fun-1.jpg", "/images/family-fun-2.jpg"],
        "isDeleted": false,
        "createdAt": "2025-08-17T04:08:36.815Z",
        "updatedAt": "2025-08-17T04:08:36.815Z",
        "affiliateCode": "EVT-DDF64AFF"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalEvents": 100,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 12
    }
  }
}
```

### GET /api/events/categories
Get all available event categories. **No authentication required.**

**Response:**
```json
{
  "success": true,
  "message": "Event categories retrieved successfully",
  "data": {
    "categories": [
      "Art & Culture",
      "Business",
      "Culture & Heritage",
      "Family & Kids",
      "Food & Dining",
      "Health & Wellness",
      "Music",
      "Sports & Recreation",
      "Technology"
    ]
  }
}
```

### GET /api/events/:id
Get single event details. **No authentication required.**

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Response:**
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "event": {
      "_id": "68a155c40214f9e8ddf64aff",
      "title": "Family Fun Day",
      "description": "Complete event details...",
      "vendorId": {
        "_id": "68a155c30214f9e8ddf64a65",
        "firstName": "Jennifer",
        "lastName": "Smith",
        "email": "jennifer.smith@example.com",
        "phone": "+1234567890",
        "avatar": "https://cloudinary.com/avatar.jpg"
      }
    }
  }
}
```

**Note:** This endpoint increments the `viewsCount` for the event.

### POST /api/events
Create a new event (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "title": "Amazing Concert",
  "description": "A wonderful evening of music",
  "category": "Music",
  "type": "Event",
  "venueType": "Indoor",
  "ageRange": [18, 65],
  "location": {
    "city": "Dubai",
    "address": "123 Main Street",
    "coordinates": {
      "lat": 25.2048,
      "lng": 55.2708
    }
  },
  "price": 150,
  "currency": "AED",
  "tags": ["music", "concert", "entertainment"],
  "dateSchedule": [{
    "date": "2024-03-15T19:00:00Z",
    "availableSeats": 500,
    "price": 150
  }],
  "images": ["image_url_1", "image_url_2"]
}
```

### PUT /api/events/:id
Update event (Event owner only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Body:** Same as POST /api/events (partial updates allowed)

**Response:**
```json
{
  "success": true,
  "message": "Event updated successfully. Pending admin re-approval due to significant changes.",
  "data": {
    "event": {...}
  }
}
```

**Note:** Major changes (title, description, price, schedule) require admin re-approval.

### DELETE /api/events/:id
Soft delete event (Event owner only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### GET /api/events/vendor/my-events
Get vendor's own events (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `status` (string): Filter by status ("all", "approved", "pending", "featured")
- `sortBy` (string): Sort field (default: "createdAt")
- `sortOrder` (string): Sort order (default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Vendor events retrieved successfully",
  "data": {
    "events": [...],
    "pagination": {...}
  }
}
```

### GET /api/events/vendor/analytics
Get vendor event analytics (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor analytics retrieved successfully",
  "data": {
    "analytics": {
      "totalEvents": 25,
      "approvedEvents": 20,
      "pendingEvents": 3,
      "featuredEvents": 5,
      "totalViews": 15420,
      "avgPrice": 245.50
    }
  }
}
```

### GET /api/events/admin/all
Get all events for admin management (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `status` (string): Filter by status ("all", "approved", "pending", "featured")
- `sortBy` (string): Sort field (default: "createdAt")
- `sortOrder` (string): Sort order (default: "desc")

**Response:**
```json
{
  "success": true,
  "message": "Admin events retrieved successfully",
  "data": {
    "events": [...],
    "pagination": {...}
  }
}
```

### PUT /api/events/admin/:id/approval
Approve or reject event (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Body:**
```json
{
  "isApproved": true,
  "reason": "Optional rejection reason"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event approved successfully",
  "data": {
    "event": {...}
  }
}
```

### PUT /api/events/admin/:id/featured
Toggle event featured status (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Response:**
```json
{
  "success": true,
  "message": "Event featured successfully",
  "data": {
    "event": {...}
  }
}
```

## Orders

### POST /api/orders
Create a new order (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "items": [{
    "eventId": "event_id",
    "scheduleDate": "2024-12-01T18:00:00Z",
    "quantity": 2
  }],
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "Dubai",
    "state": "Dubai",
    "zipCode": "12345",
    "country": "UAE"
  },
  "notes": "Special requirements",
  "couponCode": "DISCOUNT10",
  "affiliateCode": "PARTNER123"
}
```

### GET /api/orders
Get user's orders (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (string): Filter by status ("pending", "confirmed", "cancelled", "refunded")
- `sortBy` (string): Sort field ("createdAt", "total", "status")
- `sortOrder` (string): "asc" or "desc"
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 50)

### GET /api/orders/:id
Get single order details (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### PUT /api/orders/:id/cancel
Cancel order (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### PUT /api/orders/:id/cancel
Cancel order (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "reason": "Changed my mind"
}
```

### POST /api/orders/:id/payment
Process payment for order (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "paymentMethod": "stripe",
  "paymentIntentId": "pi_1234567890"
}
```

### GET /api/orders/vendor/my-orders
Get vendor's orders (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### GET /api/orders/admin/all
Get all orders (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (string): Filter by status ("pending", "confirmed", "cancelled", "refunded")
- `paymentStatus` (string): Filter by payment status ("pending", "paid", "failed", "refunded")
- `sortBy` (string): Sort field ("createdAt", "total", "status", "paymentStatus")
- `sortOrder` (string): "asc" or "desc"
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)

### GET /api/orders/admin/analytics
Get order analytics (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `period` (number): Number of days for analytics (1-365, default: 30)

## Tickets

### GET /api/tickets
Get user's tickets (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (string): Filter by status ("active", "used", "cancelled", "expired")
- `eventId` (string): Filter by event ID
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

### GET /api/tickets/:id
Get ticket details (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### POST /api/tickets/:id/transfer
Transfer ticket to another user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "toEmail": "recipient@example.com",
  "message": "Enjoy the event!"
}
```

### POST /api/tickets/:id/resend
Resend ticket via email or SMS (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "method": "email"
}
```

**Note:** Available methods: "email" or "sms"

## Venues

### GET /api/venues
Get all venues. **No authentication required.**

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `city` (string): Filter by city
- `venueType` (string): Filter by venue type ("indoor", "outdoor")
- `capacity` (number): Minimum capacity filter
- `search` (string): Search by name or description

### POST /api/venues
Create new venue (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "name": "Grand Hall",
  "description": "A beautiful venue for events",
  "address": {
    "street": "123 Main Street",
    "city": "Dubai",
    "state": "Dubai",
    "country": "UAE",
    "zipCode": "12345"
  },
  "coordinates": {
    "lat": 25.2048,
    "lng": 55.2708
  },
  "capacity": 500,
  "venueType": "indoor",
  "facilities": ["parking", "wifi", "catering"],
  "baseRentalPrice": 5000,
  "currency": "AED"
}
```

### GET /api/venues/:id
Get venue details. **No authentication required.**

### PUT /api/venues/:id
Update venue (Owner/Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### DELETE /api/venues/:id
Delete venue (Owner/Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

## Vendors

### GET /api/vendors/stats
Get vendor dashboard statistics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor dashboard statistics retrieved successfully",
  "data": {
    "totalEvents": 25,
    "totalBookings": 150,
    "totalRevenue": 25000
  }
}
```

### GET /api/vendors/events
Get events created by the authenticated vendor.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor events retrieved successfully",
  "data": {
    "events": [...]
  }
}
```

### GET /api/vendors/bookings
Get bookings for the authenticated vendor's events.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor bookings retrieved successfully",
  "data": {
    "bookings": [...]
  }
}
```

### GET /api/vendors/profile
Get vendor profile for the authenticated vendor.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor profile retrieved successfully",
  "data": {
    "vendor": {
      "id": "vendor_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@vendor.com",
      "phone": "+1234567890",
      "avatar": "https://cloudinary.com/image.jpg",
      "role": "vendor",
      "addresses": [...],
      "businessHours": {...},
      "socialMedia": {...}
    }
  }
}
```

### PUT /api/vendors/profile
Update vendor profile for the authenticated vendor.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "gender": "male",
  "dateOfBirth": "1990-01-01",
  "addresses": [{
    "street": "123 Main Street",
    "city": "Dubai",
    "state": "Dubai",
    "zipCode": "12345",
    "country": "UAE",
    "isDefault": true
  }]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor profile updated successfully",
  "data": {
    "vendor": {...}
  }
}
```

### POST /api/vendors/upload-image
Upload vendor images (logo, avatar).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body (multipart/form-data):**
- `avatar`: Vendor avatar/logo image file

**Response:**
```json
{
  "success": true,
  "message": "Vendor image uploaded successfully",
  "data": {
    "vendor": {...},
    "uploadedFile": {
      "url": "https://cloudinary.com/image.jpg",
      "originalName": "logo.jpg",
      "size": 125432,
      "mimetype": "image/jpeg"
    }
  }
}
```

### PUT /api/vendors/business-hours
Update vendor business hours.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "businessHours": {
    "monday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00"
    },
    "tuesday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00"
    },
    "wednesday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00"
    },
    "thursday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00"
    },
    "friday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00"
    },
    "saturday": {
      "isOpen": false
    },
    "sunday": {
      "isOpen": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor business hours updated successfully",
  "data": {
    "vendor": {...}
  }
}
```

### PUT /api/vendors/social-media
Update vendor social media links.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "socialMedia": {
    "facebook": "https://facebook.com/vendor",
    "instagram": "https://instagram.com/vendor",
    "twitter": "https://twitter.com/vendor",
    "linkedin": "https://linkedin.com/company/vendor",
    "youtube": "https://youtube.com/c/vendor",
    "website": "https://vendor.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor social media links updated successfully",
  "data": {
    "vendor": {...}
  }
}
```

## Reviews

### GET /api/reviews/:type/:id
Get reviews for a specific target with filtering. **No authentication required.**

**Path Parameters:**
- `type` (string): "event" or "vendor"
- `id` (string): MongoDB ObjectId of the target (event/vendor)

**Query Parameters:**
- `rating` (number): Filter by rating (1-5)
- `verified` (boolean): Only verified reviews
- `sortBy` (string): Sort field (default: "createdAt")
- `sortOrder` (string): "asc" or "desc" (default: "desc")
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 50)

### POST /api/reviews
Create new review (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "type": "event",
  "targetId": "event_or_vendor_id",
  "rating": 5,
  "title": "Amazing event!",
  "comment": "Had a wonderful time",
  "pros": ["Great music", "Good organization"],
  "cons": ["Long queues"],
  "orderId": "order_id_optional",
  "media": ["image_urls_optional"]
}
```

### GET /api/reviews/my-reviews
Get current user's reviews (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### PUT /api/reviews/:id
Update review (Author only, within 24 hours - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### DELETE /api/reviews/:id
Delete review (Author/Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### POST /api/reviews/:id/vote
Vote on review helpfulness (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "helpful": true
}
```

**Note:** `true` for helpful, `false` for not helpful

### POST /api/reviews/:id/flag
Flag review for moderation (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "reason": "spam",
  "description": "This review contains spam content"
}
```

**Available reasons:** "inappropriate", "spam", "fake", "offensive", "copyright", "other"

### POST /api/reviews/:id/respond
Respond to review (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "message": "Thank you for your feedback!"
}
```

### GET /api/reviews/admin/pending
Get pending reviews for moderation (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)

### PUT /api/reviews/admin/:id/moderate
Moderate review status (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "status": "approved",
  "notes": "Review approved after verification"
}
```

**Available statuses:** "pending", "approved", "rejected"

## Payments

### POST /api/payments/create-intent
Create payment intent for Stripe (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "orderId": "order_id"
}
```

### POST /api/payments/webhook
Stripe webhook endpoint (for Stripe use only - no authentication required).

**Note:** This endpoint uses Stripe signature verification instead of JWT authentication.

### GET /api/payments/config
Get Stripe configuration (public key, etc.) **No authentication required.**

### POST /api/payments/confirm
Confirm payment intent (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "paymentIntentId": "pi_1234567890",
  "paymentMethodId": "pm_1234567890"
}
```

### POST /api/payments/cancel
Cancel payment intent (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "paymentIntentId": "pi_1234567890"
}
```

### GET /api/payments/payment-methods
Get user's saved payment methods (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### DELETE /api/payments/payment-methods/:id
Remove saved payment method (Customer only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### POST /api/payments/refund
Process refund (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "orderId": "order_id",
  "amount": 100,
  "reason": "Customer request"
}
```

### GET /api/payments/admin/analytics
Get payment analytics (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `period` (number): Number of days for analytics (1-365, default: 30)

## Check-in System

### POST /api/checkin
Check in a ticket using QR code scan (Employee only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "ticketNumber": "TKT-12345",
  "employeeId": "employee_id",
  "location": "Main Entrance Gate 1",
  "deviceInfo": {
    "deviceId": "SCANNER-001",
    "deviceType": "Mobile Scanner",
    "appVersion": "1.0.0"
  },
  "geoLocation": {
    "lat": 25.2048,
    "lng": 55.2708
  },
  "notes": "Optional check-in notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket checked in successfully",
  "data": {
    "ticket": {
      "_id": "ticket_id",
      "ticketNumber": "TKT-12345",
      "status": "used",
      "checkInDetails": {
        "isCheckedIn": true,
        "checkInTime": "2024-03-15T10:30:00Z",
        "checkInBy": "employee_id",
        "checkInLocation": "Main Entrance Gate 1",
        "scanCount": 1
      }
    },
    "checkinLog": {
      "_id": "log_id",
      "ticketId": "ticket_id",
      "eventId": "event_id",
      "employeeId": "employee_id",
      "customerId": "customer_id",
      "scanResult": "success",
      "scanTime": "2024-03-15T10:30:00Z",
      "location": "Main Entrance Gate 1"
    }
  }
}
```

### GET /api/checkin/logs
Get check-in logs with filtering (Vendor/Admin/Employee - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `eventId` (string): Filter by event ID
- `employeeId` (string): Filter by employee ID
- `scanResult` (string): Filter by scan result ("success", "failed")

**Response:**
```json
{
  "success": true,
  "message": "Check-in logs retrieved successfully",
  "data": [
    {
      "_id": "log_id",
      "ticketId": {
        "_id": "ticket_id",
        "ticketNumber": "TKT-12345",
        "ticketType": "General Admission"
      },
      "eventId": {
        "_id": "event_id",
        "name": "Music Festival 2024"
      },
      "employeeId": {
        "_id": "employee_id",
        "firstName": "John",
        "lastName": "Doe"
      },
      "customerId": {
        "_id": "customer_id",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "scanResult": "success",
      "scanTime": "2024-03-15T10:30:00Z",
      "location": "Main Entrance Gate 1"
    }
  ]
}
```

### GET /api/checkin/summary
Get check-in summary statistics (Vendor/Admin - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `eventId` (string): Required - Event ID to get summary for

**Response:**
```json
{
  "success": true,
  "message": "Check-in summary retrieved successfully",
  "data": {
    "totalTickets": 1500,
    "checkedInTickets": 1200,
    "uncheckedTickets": 300,
    "uniqueAttendees": 1180,
    "checkInRate": 80.0
  }
}
```

## Employee Management

### POST /api/employees
Create a new employee (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.employee@example.com",
  "phone": "+1234567890",
  "role": "scanner",
  "permissions": ["ticket_scan", "view_logs"],
  "assignedEvents": ["event_id_1", "event_id_2"],
  "assignedVenues": ["venue_id_1"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "employee_id",
    "vendorId": "vendor_id",
    "userId": "user_id",
    "employeeId": "EMP-1647890123456",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.employee@example.com",
    "phone": "+1234567890",
    "role": "scanner",
    "permissions": ["ticket_scan", "view_logs"],
    "assignedEvents": ["event_id_1", "event_id_2"],
    "assignedVenues": ["venue_id_1"],
    "status": "active",
    "hiredAt": "2024-03-15T09:00:00Z"
  }
}
```

### GET /api/employees/:employeeId
Get employee details (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `employeeId` (string): Employee MongoDB ObjectId

**Response:**
```json
{
  "success": true,
  "message": "Employee details retrieved successfully",
  "data": {
    "_id": "employee_id",
    "vendorId": "vendor_id",
    "userId": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.employee@example.com"
    },
    "assignedEvents": [
      {
        "_id": "event_id_1",
        "name": "Music Festival",
        "startDate": "2024-04-15T18:00:00Z",
        "endDate": "2024-04-15T23:00:00Z"
      }
    ],
    "assignedVenues": [
      {
        "_id": "venue_id_1",
        "name": "Main Hall",
        "address": "123 Main Street"
      }
    ]
  }
}
```

### PUT /api/employees/:employeeId
Update employee details (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:** Same as POST /api/employees (partial updates allowed)

### DELETE /api/employees/:employeeId
Delete/deactivate employee (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

### GET /api/employees
Get all employees for vendor (Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status ("active", "inactive")
- `role` (string): Filter by role

**Response:**
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": {
    "employees": [...],
    "pagination": {...}
  }
}
```

## Admin Management

All admin endpoints require authentication and admin role permissions.

### User Management

### GET /api/admin/users/stats
Get user statistics overview (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "totalUsers": 1520,
    "activeUsers": 1350,
    "suspendedUsers": 45,
    "newUsersThisMonth": 125,
    "usersByRole": {
      "customer": 1200,
      "vendor": 280,
      "employee": 35,
      "admin": 5
    },
    "usersByStatus": {
      "ACTIVE": 1350,
      "PENDING": 125,
      "SUSPENDED": 45
    },
    "registrationTrend": [
      {
        "month": "2024-01",
        "count": 89
      },
      {
        "month": "2024-02", 
        "count": 125
      }
    ]
  }
}
```

### GET /api/admin/users
Get all users for admin management (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search by name, email, or phone
- `role` (string): Filter by role ("customer", "vendor", "employee", "admin")
- `status` (string): Filter by status ("ACTIVE", "PENDING", "SUSPENDED", "BANNED")
- `country` (string): Filter by country
- `verified` (boolean): Filter by email verification status
- `sortBy` (string): Sort field ("createdAt", "firstName", "email", "lastLoginAt")
- `sortOrder` (string): Sort order ("asc", "desc", default: "desc")
- `dateFrom` (date): Filter users created after this date
- `dateTo` (date): Filter users created before this date

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "role": "customer",
        "status": "ACTIVE",
        "country": "UAE", 
        "emailVerified": true,
        "avatar": "https://cloudinary.com/avatar.jpg",
        "lastLoginAt": "2024-03-15T10:30:00Z",
        "createdAt": "2024-01-15T09:00:00Z",
        "totalOrders": 5,
        "totalSpent": 1250.00,
        "accountValue": "high"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 76,
      "totalUsers": 1520,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 20
    },
    "summary": {
      "totalFound": 1520,
      "activeUsers": 1350,
      "newThisMonth": 125
    }
  }
}
```

### GET /api/admin/users/:id
Get detailed user information by ID (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): User MongoDB ObjectId

**Response:**
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe", 
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "status": "ACTIVE",
      "emailVerified": true,
      "addresses": [
        {
          "street": "123 Main Street",
          "city": "Dubai",
          "country": "UAE",
          "isDefault": true
        }
      ],
      "loginHistory": [
        {
          "timestamp": "2024-03-15T10:30:00Z",
          "ipAddress": "192.168.1.100",
          "userAgent": "Mozilla/5.0...",
          "location": "Dubai, UAE"
        }
      ],
      "orderSummary": {
        "totalOrders": 15,
        "totalSpent": 3750.00,
        "averageOrderValue": 250.00,
        "lastOrderDate": "2024-03-10T15:20:00Z"
      },
      "activityMetrics": {
        "eventsAttended": 8,
        "reviewsPosted": 3,
        "averageRating": 4.5
      }
    }
  }
}
```

### POST /api/admin/users
Create new user account (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "password": "SecurePassword123!",
  "phone": "+1234567890",
  "role": "vendor",
  "status": "ACTIVE",
  "country": "UAE",
  "emailVerified": true,
  "sendWelcomeEmail": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "new_user_id",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "role": "vendor",
      "status": "ACTIVE",
      "createdAt": "2024-03-15T14:30:00Z"
    },
    "temporaryPassword": "TempPass123!",
    "welcomeEmailSent": true
  }
}
```

### PUT /api/admin/users/:id
Update user information (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): User MongoDB ObjectId

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+9876543210",
  "role": "vendor",
  "status": "ACTIVE",
  "country": "Canada",
  "emailVerified": true,
  "notes": "Updated by admin - role change approved"
}
```

### PUT /api/admin/users/:id/status
Update user status with reason (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): User MongoDB ObjectId

**Body:**
```json
{
  "status": "SUSPENDED",
  "reason": "Policy violation - inappropriate content",
  "suspensionDuration": 30,
  "notifyUser": true,
  "adminNotes": "Internal notes about the suspension"
}
```

**Available Status Values:**
- `ACTIVE` - User can access all features
- `PENDING` - Account pending verification
- `SUSPENDED` - Temporary access restriction
- `BANNED` - Permanent account termination

**Response:**
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "status": "SUSPENDED",
      "suspendedUntil": "2024-04-15T00:00:00Z",
      "suspensionReason": "Policy violation - inappropriate content"
    },
    "emailNotificationSent": true
  }
}
```

### PUT /api/admin/users/:id/role
Update user role (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "newRole": "vendor",
  "reason": "User requested vendor account upgrade",
  "effectiveDate": "2024-03-16T00:00:00Z",
  "notifyUser": true
}
```

### DELETE /api/admin/users/:id
Delete user account (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `deleteType` (string): "soft" or "hard" (default: "soft")
- `reason` (string): Reason for deletion
- `transferData` (boolean): Transfer user data to another account

**Response:**
```json
{
  "success": true,
  "message": "User account deleted successfully",
  "data": {
    "deletedUserId": "user_id",
    "deleteType": "soft", 
    "dataRetentionDays": 30,
    "recoverable": true
  }
}
```

### POST /api/admin/users/bulk-update
Bulk update multiple users (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "userIds": ["user1_id", "user2_id", "user3_id"],
  "updates": {
    "status": "ACTIVE",
    "emailVerified": true,
    "country": "UAE"
  },
  "reason": "Bulk verification completed",
  "notifyUsers": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk update completed",
  "data": {
    "updatedCount": 3,
    "failedCount": 0,
    "results": [
      {
        "userId": "user1_id",
        "status": "success"
      },
      {
        "userId": "user2_id", 
        "status": "success"
      }
    ]
  }
}
```

### Venue Management

### GET /api/admin/venues
Get all venues for admin management (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name or address
- `status` (string): Filter by approval status ("pending", "approved", "rejected")
- `city` (string): Filter by city
- `venueType` (string): Filter by venue type ("indoor", "outdoor")
- `capacity` (number): Minimum capacity filter
- `sortBy` (string): Sort field ("createdAt", "name", "capacity")
- `sortOrder` (string): Sort order ("asc", "desc")

**Response:**
```json
{
  "success": true,
  "message": "Venues retrieved successfully",
  "data": {
    "venues": [
      {
        "_id": "venue_id",
        "name": "Grand Convention Center",
        "description": "Premium event venue",
        "address": {
          "street": "123 Business Bay",
          "city": "Dubai",
          "country": "UAE"
        },
        "capacity": 1000,
        "venueType": "indoor",
        "status": "approved",
        "owner": {
          "_id": "owner_id",
          "firstName": "Ahmed",
          "lastName": "Ali",
          "email": "ahmed@venue.com"
        },
        "baseRentalPrice": 15000,
        "currency": "AED",
        "facilities": ["parking", "wifi", "catering"],
        "images": ["https://cloudinary.com/venue1.jpg"],
        "approvedAt": "2024-02-15T10:00:00Z",
        "createdAt": "2024-02-10T14:30:00Z"
      }
    ],
    "pagination": {...},
    "summary": {
      "totalVenues": 85,
      "approvedVenues": 72,
      "pendingApproval": 8,
      "rejectedVenues": 5
    }
  }
}
```

### GET /api/admin/venues/:id
Get detailed venue information (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### PUT /api/admin/venues/:id/approval
Approve or reject venue (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): Venue MongoDB ObjectId

**Body:**
```json
{
  "isApproved": true,
  "reason": "Meets all quality standards",
  "adminNotes": "Excellent facilities and documentation",
  "conditions": [
    "Must maintain insurance coverage",
    "Regular safety inspections required"
  ],
  "notifyOwner": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Venue approved successfully", 
  "data": {
    "venue": {
      "_id": "venue_id",
      "name": "Grand Convention Center",
      "status": "approved",
      "approvedBy": "admin_id",
      "approvedAt": "2024-03-15T14:30:00Z",
      "approvalConditions": [
        "Must maintain insurance coverage"
      ]
    },
    "ownerNotified": true
  }
}
```

### Event Management

### GET /api/admin/events/all
Get all events for admin management (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1) 
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by title or description
- `status` (string): Filter by approval status ("pending", "approved", "rejected", "draft")
- `category` (string): Filter by event category
- `vendor` (string): Filter by vendor ID
- `featured` (boolean): Filter featured events
- `dateFrom` (date): Filter events starting after this date
- `dateTo` (date): Filter events ending before this date
- `sortBy` (string): Sort field ("createdAt", "title", "price", "viewsCount")
- `sortOrder` (string): Sort order ("asc", "desc")

**Response:**
```json
{
  "success": true,
  "message": "Admin events retrieved successfully", 
  "data": {
    "events": [
      {
        "_id": "event_id",
        "title": "Tech Conference 2024",
        "description": "Annual technology conference",
        "category": "Technology",
        "status": "pending",
        "vendor": {
          "_id": "vendor_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@techconf.com"
        },
        "price": 299,
        "currency": "AED",
        "featured": false,
        "viewsCount": 1250,
        "ticketsSold": 0,
        "revenue": 0,
        "submittedAt": "2024-03-10T09:00:00Z",
        "pendingChanges": [
          "title",
          "description",
          "price"
        ]
      }
    ],
    "pagination": {...},
    "summary": {
      "totalEvents": 342,
      "pendingApproval": 23,
      "approvedEvents": 298,
      "rejectedEvents": 15,
      "featuredEvents": 45
    }
  }
}
```

### PUT /api/admin/events/:id/approval
Approve or reject event (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Body:**
```json
{
  "isApproved": true,
  "reason": "Event meets all guidelines",
  "adminNotes": "High quality content and organization",
  "autoFeature": false,
  "notifyVendor": true,
  "conditions": [
    "Must provide COVID safety protocols",
    "Insurance documentation required"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event approved successfully",
  "data": {
    "event": {
      "_id": "event_id", 
      "title": "Tech Conference 2024",
      "status": "approved",
      "approvedBy": "admin_id",
      "approvedAt": "2024-03-15T14:30:00Z",
      "featured": false,
      "visibleToPublic": true
    },
    "vendorNotified": true,
    "emailSent": true
  }
}
```

### PUT /api/admin/events/:id/featured
Toggle event featured status (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Body:**
```json
{
  "featured": true,
  "featuredUntil": "2024-04-15T23:59:59Z",
  "reason": "High quality event with strong registration",
  "priority": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event featured successfully",
  "data": {
    "event": {
      "_id": "event_id",
      "title": "Tech Conference 2024", 
      "featured": true,
      "featuredAt": "2024-03-15T14:30:00Z",
      "featuredUntil": "2024-04-15T23:59:59Z",
      "featuredPriority": 1
    }
  }
}
```

## Analytics

### GET /api/analytics/dashboard
Get dashboard summary (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 50000,
    "totalEvents": 25,
    "totalTicketsSold": 1200,
    "totalUsers": 500,
    "revenueGrowth": 15.5,
    "eventGrowth": 8.2,
    "userGrowth": 12.3,
    "topPerformingEvents": [...]
  }
}
```

### GET /api/analytics/events
Get event analytics (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `startDate` (date): Start date for analytics (ISO 8601 format)
- `endDate` (date): End date for analytics (ISO 8601 format)

### GET /api/analytics/orders
Get order analytics (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### GET /api/analytics/tickets
Get ticket analytics (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### GET /api/analytics/users
Get user analytics (Admin only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### GET /api/analytics/venues
Get venue analytics (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### GET /api/analytics/revenue
Get revenue report (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `startDate` (date): Required start date (ISO 8601 format)
- `endDate` (date): Required end date (ISO 8601 format)
- `groupBy` (string): "day" or "month" (default: "month")

### GET /api/analytics/events/:eventId/performance
Get performance report for specific event (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### GET /api/analytics/export
Export analytics data (Admin/Vendor only - requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `type` (string): Required. "events", "orders", "tickets", "users", or "venues"
- `startDate` (date): Start date for export (ISO 8601 format)
- `endDate` (date): End date for export (ISO 8601 format)
- `format` (string): "json" or "csv" (default: "json")

## File Uploads

### POST /api/uploads/single
Upload single file (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `file`: Single file to upload

**File Constraints:**
- Maximum file size: 5MB
- Allowed types: JPEG, PNG, GIF, PDF, DOC, DOCX
- Field name must be exactly `file`

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "filename": "1647890123456-photo.jpg",
      "originalName": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 2048576,
      "url": "https://cloudinary.com/v1_1/your-cloud/image/upload/v1647890123/uploads/1647890123456-photo.jpg",
      "category": "general",
      "uploadedAt": "2024-03-15T10:30:00Z"
    }
  }
}
```

### POST /api/uploads/multiple
Upload multiple files (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `files`: Array of files to upload (max 5 files)

**File Constraints:**
- Maximum 5 files per request
- Maximum file size: 5MB each
- Total request size: 25MB max
- Allowed types: JPEG, PNG, GIF, PDF

**Response:**
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "files": [
      {
        "filename": "1647890123456-image1.jpg",
        "originalName": "image1.jpg",
        "url": "https://cloudinary.com/image1.jpg",
        "size": 1024000
      },
      {
        "filename": "1647890123457-image2.jpg",
        "originalName": "image2.jpg",
        "url": "https://cloudinary.com/image2.jpg", 
        "size": 2048000
      }
    ],
    "totalUploaded": 2,
    "totalSize": 3072000
  }
}
```

### POST /api/uploads/event-images
Upload event-related images (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `images`: Event gallery images (max 10 files)
- `banner`: Event banner image (max 1 file) 
- `thumbnail`: Event thumbnail image (max 1 file)

**File Constraints:**
- Gallery images: Max 10 files, 3MB each, JPEG/PNG only
- Banner: Max 1 file, 5MB, JPEG/PNG, recommended 1920x1080
- Thumbnail: Max 1 file, 2MB, JPEG/PNG, recommended 600x400

**Response:**
```json
{
  "success": true,
  "message": "Event images uploaded successfully",
  "data": {
    "images": [
      "https://cloudinary.com/event-image1.jpg",
      "https://cloudinary.com/event-image2.jpg"
    ],
    "banner": "https://cloudinary.com/event-banner.jpg",
    "thumbnail": "https://cloudinary.com/event-thumb.jpg",
    "uploadSummary": {
      "totalImages": 2,
      "hasBanner": true,
      "hasThumbnail": true,
      "totalSize": 8192000
    }
  }
}
```

### POST /api/uploads/venue-images
Upload venue-related images (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `images`: Venue gallery images (max 20 files)
- `floorPlan`: Venue floor plan (max 1 file)
- `thumbnail`: Venue thumbnail (max 1 file)

**File Constraints:**
- Gallery images: Max 20 files, 3MB each, JPEG/PNG only
- Floor plan: Max 1 file, 10MB, JPEG/PNG/PDF
- Thumbnail: Max 1 file, 2MB, JPEG/PNG, recommended 600x400

**Response:**
```json
{
  "success": true,
  "message": "Venue images uploaded successfully",
  "data": {
    "images": ["https://cloudinary.com/venue1.jpg"],
    "floorPlan": "https://cloudinary.com/floor-plan.pdf", 
    "thumbnail": "https://cloudinary.com/venue-thumb.jpg",
    "uploadSummary": {
      "totalImages": 1,
      "hasFloorPlan": true,
      "hasThumbnail": true
    }
  }
}
```

### POST /api/uploads/avatar
Upload user avatar image (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `avatar`: Avatar image file

**File Constraints:**
- Maximum file size: 2MB
- Allowed types: JPEG, PNG, GIF
- Recommended size: 300x300 pixels
- Auto-cropped to square if needed

**Response:**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar": {
      "url": "https://cloudinary.com/avatar.jpg",
      "filename": "avatar-user123.jpg",
      "size": 512000,
      "dimensions": {
        "width": 300,
        "height": 300
      }
    },
    "user": {
      "_id": "user_id",
      "avatar": "https://cloudinary.com/avatar.jpg"
    }
  }
}
```

### POST /api/uploads/document
Upload document file (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `document`: Document file

**File Constraints:**
- Maximum file size: 10MB
- Allowed types: PDF, DOC, DOCX, TXT
- Virus scanning enabled

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "filename": "document-1647890123456.pdf",
      "originalName": "contract.pdf",
      "url": "https://cloudinary.com/document.pdf",
      "size": 5242880,
      "mimetype": "application/pdf",
      "pages": 5,
      "uploadedAt": "2024-03-15T10:30:00Z"
    }
  }
}
```

### GET /api/uploads/files/:category/:filename
Serve uploaded file with proper headers.

**Path Parameters:**
- `category` (string): File category (users, events, venues, documents)
- `filename` (string): File name

**Query Parameters:**
- `download` (boolean): Force download instead of inline display
- `w` (number): Resize width for images
- `h` (number): Resize height for images
- `q` (number): Quality for images (1-100)

**Response:**
- Returns file with appropriate content-type headers
- For images: Supports on-the-fly resizing via Cloudinary
- For documents: Proper content-disposition headers

### DELETE /api/uploads/file/:filename
Delete uploaded file (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `filename` (string): File name to delete

**Query Parameters:**
- `category` (string): File category (required)

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "deletedFile": "1647890123456-photo.jpg",
    "category": "users"
  }
}
```

### GET /api/uploads/info/:filename
Get detailed file information (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "filename": "1647890123456-photo.jpg",
      "originalName": "vacation-photo.jpg",
      "mimetype": "image/jpeg",
      "size": 2048576,
      "url": "https://cloudinary.com/photo.jpg",
      "category": "users",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "uploadedAt": "2024-03-15T10:30:00Z",
      "uploadedBy": "user_id"
    }
  }
}
```

### GET /api/uploads/list/:category
List files in category (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `category` (string): File category

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `type` (string): Filter by file type (image, document, video)
- `sortBy` (string): Sort by field (uploadedAt, size, name)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "photo1.jpg",
        "originalName": "vacation.jpg",
        "size": 2048576,
        "url": "https://cloudinary.com/photo1.jpg",
        "uploadedAt": "2024-03-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalFiles": 45,
      "totalSize": 104857600,
      "categories": {
        "images": 30,
        "documents": 15
      }
    }
  }
}
```

### Upload Error Responses

**File Too Large:**
```json
{
  "success": false,
  "message": "File too large",
  "error": {
    "code": "FILE_SIZE_EXCEEDED",
    "details": "File size 6MB exceeds maximum allowed size of 5MB",
    "maxSize": 5242880
  }
}
```

**Invalid File Type:**
```json
{
  "success": false,
  "message": "Invalid file type",
  "error": {
    "code": "INVALID_FILE_TYPE",
    "details": "Only JPEG, PNG, GIF files are allowed",
    "allowedTypes": ["image/jpeg", "image/png", "image/gif"]
  }
}
```

**Too Many Files:**
```json
{
  "success": false,
  "message": "Too many files",
  "error": {
    "code": "FILE_COUNT_EXCEEDED", 
    "details": "Maximum 5 files allowed per request",
    "maxFiles": 5,
    "receivedFiles": 7
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Authentication required
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ERROR` - Resource already exists
- `PAYMENT_ERROR` - Payment processing failed
- `FILE_UPLOAD_ERROR` - File upload failed

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Window**: 15 minutes
- **Limit**: 100 requests per window per IP
- **Headers**: Rate limit info returned in response headers
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## Authentication Headers

For protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Pagination

List endpoints support pagination with these query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Pagination info is returned in the response:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## File Upload Constraints

- **Maximum file size**: 5MB
- **Allowed file types**: 
  - Images: JPEG, PNG, GIF
  - Documents: PDF
- **Maximum files per request**: 
  - Single upload: 1 file
  - Multiple upload: 5 files
  - Event images: 10 files
  - Venue images: 20 files

## Currency Support

Supported currencies:
- `AED` - UAE Dirham (default)
- `USD` - US Dollar
- `EGP` - Egyptian Pound
- `CAD` - Canadian Dollar

## Date Formats

All dates should be in ISO 8601 format:
- `2024-03-15T19:00:00Z` (UTC)
- `2024-03-15T19:00:00+04:00` (with timezone)

## Webhook Endpoints

### Stripe Webhooks
- **Endpoint**: `/api/payments/webhook`
- **Method**: POST
- **Authentication**: Stripe signature verification
- **Events**: 
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.dispute.created`

## SDK and Integration Examples

### React Frontend Integration

#### 1. API Service Setup
```javascript
// services/api/eventsAPI.js
const API_BASE_URL = 'http://localhost:5000/api';

const eventsAPI = {
  // Get all events (no auth required)
  getAllEvents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/events?${queryString}`);
    return response.json();
  },

  // Get featured events
  getFeaturedEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events?featured=true&limit=6`);
    return response.json();
  },

  // Get event categories
  getEventCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/events/categories`);
    return response.json();
  },

  // Search events
  searchEvents: async (searchQuery, filters = {}) => {
    const params = { search: searchQuery, ...filters };
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/events?${queryString}`);
    return response.json();
  },

  // Get single event
  getEventById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
    return response.json();
  },

  // Create event (requires auth)
  createEvent: async (eventData, token) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    return response.json();
  }
};

export default eventsAPI;
```

#### 2. React Component Example
```jsx
// components/EventsList.jsx
import React, { useState, useEffect } from 'react';
import eventsAPI from '../services/api/eventsAPI';

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    category: '',
    city: '',
    featured: false
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getAllEvents(filters);
        
        if (response.success) {
          setEvents(response.data.events);
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError('Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  if (loading) return <div>Loading events...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="events-list">
      {/* Filter Controls */}
      <div className="filters">
        <select 
          value={filters.category} 
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Family & Kids">Family & Kids</option>
          <option value="Technology">Technology</option>
          <option value="Music">Music</option>
        </select>
        
        <input
          type="text"
          placeholder="Search by city..."
          value={filters.city}
          onChange={(e) => handleFilterChange('city', e.target.value)}
        />
        
        <label>
          <input
            type="checkbox"
            checked={filters.featured}
            onChange={(e) => handleFilterChange('featured', e.target.checked)}
          />
          Featured Only
        </label>
      </div>

      {/* Events Grid */}
      <div className="events-grid">
        {events.map(event => (
          <div key={event._id} className="event-card">
            <img 
              src={event.images?.[0] || '/placeholder-event.jpg'} 
              alt={event.title} 
            />
            <div className="event-info">
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <div className="event-details">
                <span className="price">{event.currency} {event.price}</span>
                <span className="location">{event.location.city}</span>
                <span className="category">{event.category}</span>
              </div>
              {event.dateSchedule?.[0] && (
                <div className="event-date">
                  {new Date(event.dateSchedule[0].date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsList;
```

#### 3. Authentication Hook
```jsx
// hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token and get user info
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        localStorage.setItem('token', data.data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### JavaScript/Node.js (Vanilla)
```javascript
// Basic API call example
const response = await fetch('http://localhost:5000/api/events', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();

// Error handling example
try {
  const response = await fetch('http://localhost:5000/api/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Event created:', result.data.event);
  } else {
    console.error('API Error:', result.message);
  }
} catch (error) {
  console.error('Network Error:', error);
}
```

### cURL Examples

#### Get Events (No Auth)
```bash
curl -X GET \
  'http://localhost:5000/api/events?page=1&limit=12&category=Technology&featured=true' \
  -H 'Content-Type: application/json'
```

#### Create Event (With Auth)
```bash
curl -X POST \
  'http://localhost:5000/api/events' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Tech Conference 2024",
    "description": "Annual technology conference",
    "category": "Technology",
    "type": "Event",
    "venueType": "Indoor",
    "ageRange": [18, 65],
    "location": {
      "city": "Dubai",
      "address": "DIFC, Dubai",
      "coordinates": {
        "lat": 25.2048,
        "lng": 55.2708
      }
    },
    "price": 299,
    "currency": "AED",
    "dateSchedule": [{
      "date": "2024-06-15T09:00:00Z",
      "availableSeats": 500,
      "price": 299
    }],
    "tags": ["technology", "conference", "networking"]
  }'
```

#### Check-in Ticket
```bash
curl -X POST \
  'http://localhost:5000/api/checkin' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "ticketNumber": "TKT-12345",
    "employeeId": "employee_id_here",
    "location": "Main Entrance Gate 1",
    "deviceInfo": {
      "deviceId": "SCANNER-001",
      "deviceType": "Mobile Scanner"
    }
  }'
```

## Blog System

The blog system provides endpoints for managing and displaying blog articles, categories, and related content.

### GET /api/blogs
Get all published blog posts with optional filtering.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 12, max: 50)
- `category` (string, optional): Category ID or slug
- `featured` (boolean, optional): Filter featured posts
- `search` (string, optional): Search in title, excerpt, and content
- `tags` (string, optional): Comma-separated tags
- `sortBy` (string, optional): Sort by field (publishedAt, createdAt, viewCount, likeCount)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "message": "Blogs retrieved successfully",
  "data": {
    "blogs": [
      {
        "_id": "60f1b2c3d4e5f6789a0b1c2d",
        "title": "Top 10 Summer Activities for Kids",
        "slug": "top-10-summer-activities-for-kids",
        "excerpt": "Discover the best summer activities to keep your kids entertained...",
        "featuredImage": "https://example.com/image.jpg",
        "category": {
          "_id": "60f1b2c3d4e5f6789a0b1c2e",
          "name": "Activities",
          "slug": "activities",
          "color": "#FF6B35"
        },
        "author": {
          "name": "Sarah Johnson",
          "email": "sarah@kidzapp.com",
          "avatar": "https://example.com/avatar.jpg"
        },
        "tags": ["summer", "activities", "kids"],
        "featured": false,
        "readTime": 5,
        "viewCount": 150,
        "likeCount": 12,
        "shareCount": 8,
        "publishedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalBlogs": 48,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 12
    }
  }
}
```

### GET /api/blogs/:slug
Get a specific blog post by its slug.

**Response:**
```json
{
  "success": true,
  "message": "Blog retrieved successfully",
  "data": {
    "blog": {
      "_id": "60f1b2c3d4e5f6789a0b1c2d",
      "title": "Top 10 Summer Activities for Kids",
      "slug": "top-10-summer-activities-for-kids",
      "excerpt": "Discover the best summer activities...",
      "content": "<p>Full blog content here...</p>",
      "featuredImage": "https://example.com/image.jpg",
      "category": {
        "_id": "60f1b2c3d4e5f6789a0b1c2e",
        "name": "Activities",
        "slug": "activities",
        "color": "#FF6B35"
      },
      "author": {
        "name": "Sarah Johnson",
        "email": "sarah@kidzapp.com",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "Sarah is a parenting expert..."
      },
      "seo": {
        "metaTitle": "Top 10 Summer Activities for Kids",
        "metaDescription": "Discover amazing summer activities...",
        "metaKeywords": ["summer", "kids", "activities"]
      }
    }
  }
}
```

### GET /api/blogs/featured
Get featured blog posts.

**Query Parameters:**
- `limit` (number, optional): Number of posts to return (default: 6, max: 20)

### GET /api/blogs/popular
Get popular blog posts based on view and like counts.

### GET /api/blogs/recent
Get recently published blog posts.

### GET /api/blogs/:slug/related
Get related blog posts for a specific post.

### GET /api/blogs/categories
Get all active blog categories.

**Response:**
```json
{
  "success": true,
  "message": "Blog categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "60f1b2c3d4e5f6789a0b1c2e",
        "name": "Activities",
        "slug": "activities",
        "description": "Fun activities for kids",
        "color": "#FF6B35",
        "postsCount": 15,
        "isActive": true
      }
    ]
  }
}
```

### POST /api/blogs/:slug/like
Like a blog post (increments like count).

**Response:**
```json
{
  "success": true,
  "message": "Blog liked successfully",
  "data": {
    "likeCount": 13
  }
}
```

### POST /api/blogs/:slug/share
Record a blog post share (increments share count).

## Admin Blog Management

Requires authentication and admin/superadmin role.

### GET /api/admin/blogs/blogs
Get all blog posts for admin panel.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (draft, published, archived)
- `category`: Filter by category
- `search`: Search blogs
- `sortBy`, `sortOrder`: Sort options

### POST /api/admin/blogs/blogs
Create a new blog post.

**Body:**
```json
{
  "title": "New Blog Post",
  "excerpt": "Brief description...",
  "content": "<p>Full blog content...</p>",
  "featuredImage": "https://example.com/image.jpg",
  "category": "60f1b2c3d4e5f6789a0b1c2e",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Author biography..."
  },
  "tags": ["tag1", "tag2"],
  "status": "published",
  "featured": false,
  "seo": {
    "metaTitle": "SEO Title",
    "metaDescription": "SEO Description",
    "metaKeywords": ["keyword1", "keyword2"]
  }
}
```

### PUT /api/admin/blogs/blogs/:id
Update an existing blog post.

### DELETE /api/admin/blogs/blogs/:id
Delete a blog post.

### GET /api/admin/blogs/categories
Get all blog categories (admin view).

### POST /api/admin/blogs/categories
Create a new blog category.

**Body:**
```json
{
  "name": "New Category",
  "description": "Category description",
  "color": "#FF6B35"
}
```

### PUT /api/admin/blogs/categories/:id
Update a blog category.

### DELETE /api/admin/blogs/categories/:id
Delete a blog category (only if no associated posts).

## Frontend Integration Examples

### React Component Integration
```jsx
import React, { useState, useEffect } from 'react';
import blogAPI from '../services/api/blogAPI';

function BlogList() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await blogAPI.getAllBlogs({
          limit: 12,
          featured: true
        });
        setBlogs(response.data.blogs);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {blogs.map(blog => (
        <article key={blog._id}>
          <h2>{blog.title}</h2>
          <p>{blog.excerpt}</p>
          <span>By {blog.author.name}</span>
        </article>
      ))}
    </div>
  );
}
```

### CURL Examples

#### Get All Blogs
```bash
curl -X GET \
  'http://localhost:5000/api/blogs?page=1&limit=6&featured=true' \
  -H 'Content-Type: application/json'
```

#### Get Blog by Slug
```bash
curl -X GET \
  'http://localhost:5000/api/blogs/top-10-summer-activities-for-kids' \
  -H 'Content-Type: application/json'
```

#### Create Blog (Admin)
```bash
curl -X POST \
  'http://localhost:5000/api/admin/blogs/blogs' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Amazing Kids Activity Ideas",
    "excerpt": "Discover creative and fun activity ideas...",
    "content": "<p>Here are some amazing activity ideas...</p>",
    "featuredImage": "https://example.com/image.jpg",
    "category": "60f1b2c3d4e5f6789a0b1c2e",
    "author": {
      "name": "Content Creator",
      "email": "creator@kidzapp.com"
    },
    "tags": ["activities", "kids", "fun"],
    "status": "published",
    "featured": true
  }'
```

## Support

For API support, contact:
- **Email**: api-support@gema.com
- **Documentation**: https://docs.gema.com
- **Status Page**: https://status.gema.com

## Security Considerations

### Authentication Security
- JWT tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Rate limiting applied to authentication endpoints
- Account lockout after 5 failed login attempts
- Password requirements: minimum 8 characters, uppercase, lowercase, number, special character

### Data Protection
- All sensitive data encrypted at rest
- API communication secured with HTTPS
- Personal data handling complies with GDPR
- Payment data processed securely via Stripe
- File uploads scanned for malware

### API Security
- CORS configured for allowed origins
- Request sanitization to prevent injection attacks
- Helmet.js for security headers
- HPP protection against parameter pollution
- XSS protection enabled

## Performance Considerations

### Caching Strategy
- Static assets cached via Cloudinary CDN
- Database queries optimized with indexing
- Redis caching for frequently accessed data
- Image optimization and lazy loading

### Scalability
- Horizontal scaling support via load balancers
- Database connection pooling
- Asynchronous processing for heavy operations
- Rate limiting to prevent abuse

## Monitoring and Logging

### Request Logging
- All API requests logged with Winston
- Error tracking and alerting
- Performance monitoring
- Security incident logging

### Analytics Tracking
- API usage metrics
- Error rate monitoring
- Response time tracking
- User behavior analytics

## Testing and Development

### Development Tools
- Postman collection available for API testing
- Swagger/OpenAPI documentation (planned)
- Mock data generators for testing
- Automated API testing suite

### Testing Endpoints
```bash
# Health check endpoint
GET /api/health

# API status and version
GET /api/status

# Development-only test endpoints (not available in production)
GET /api/dev/test-email
POST /api/dev/seed-data
```

## Migration Guide

### Upgrading from v0.x to v1.0
1. Update base URLs to include `/api` prefix
2. Replace old authentication endpoints with new JWT system
3. Update file upload endpoints to use new structure
4. Migrate to new error response format

### Breaking Changes in v1.0
- Authentication now uses JWT instead of sessions
- All endpoints require `/api` prefix
- Error response structure standardized
- File upload field names changed for consistency

## API Client Libraries

### Official SDKs (Planned)
- JavaScript/TypeScript SDK
- React hooks library
- Node.js server SDK
- Mobile SDK (React Native)

### Third-party Integrations
- Zapier integration
- Webhook support for external systems
- REST API wrappers available

## Support and Community

### Documentation
- **API Documentation**: This document
- **Integration Guides**: Available in `/docs` folder
- **Video Tutorials**: YouTube channel (coming soon)
- **FAQ**: Frequently asked questions in knowledge base

### Support Channels
- **Email Support**: api-support@gema.com
- **Discord Community**: gema-developers (invite link)
- **GitHub Issues**: For bug reports and feature requests
- **Stack Overflow**: Tag questions with `gema-api`

### SLA and Uptime
- **Uptime Target**: 99.9%
- **Response Time**: <200ms for 95% of requests
- **Support Response**: <24 hours for standard support
- **Status Page**: https://status.gema.com

## Changelog

### Version 1.0.0 (Current - March 2024)
- **New Features**:
  - Complete JWT authentication system with refresh tokens
  - Comprehensive admin management panel APIs
  - Enhanced file upload system with Cloudinary integration
  - Advanced analytics and reporting endpoints
  - Blog management system with categories
  - Employee management for vendors
  - QR code-based check-in system
  - Multi-currency payment support

- **API Endpoints Added**:
  - Authentication: 7 new endpoints including profile management
  - Admin Management: 15+ endpoints for user, event, venue management
  - File Uploads: 8 specialized upload endpoints with error handling
  - Blog System: 10+ endpoints for content management
  - Enhanced vendor and analytics endpoints

- **Improvements**:
  - Standardized error response format across all endpoints
  - Enhanced security with rate limiting and validation
  - Comprehensive logging and monitoring
  - Performance optimizations for database queries
  - Mobile-optimized file upload handling

- **Breaking Changes**:
  - All endpoints now require `/api` prefix
  - Authentication system migrated from sessions to JWT
  - File upload field names standardized
  - Error response structure updated

### Version 0.9.0 (February 2024)
- Initial beta release
- Basic CRUD operations for events, venues, orders
- Simple authentication system
- File upload functionality
- Payment processing integration

### Upcoming in Version 1.1.0 (Planned - June 2024)
- **Planned Features**:
  - Real-time notifications via WebSockets
  - Advanced search with Elasticsearch
  - Multi-language support
  - Automated event recommendations
  - Social media integration
  - Advanced reporting dashboard
  - Mobile app API optimizations

- **API Versioning**:
  - Introduction of `/api/v2` endpoints
  - Backward compatibility maintained for v1
  - Gradual migration path documented

### Version History
- **v1.0.0** (March 2024) - Current stable release
- **v0.9.0** (February 2024) - Beta release  
- **v0.8.0** (January 2024) - Alpha release
- **v0.7.0** (December 2023) - Internal testing