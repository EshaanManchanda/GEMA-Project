# Event Management APIs

Complete documentation for event creation, management, and discovery endpoints.

## 🎯 Overview

The Events API provides comprehensive functionality for:
- **Event Discovery**: Browse and search events publicly
- **Event Creation**: Vendors can create and manage events
- **Event Administration**: Admin approval and featured event management
- **Analytics**: Event performance tracking for vendors

---

## 📂 Public Event Discovery

### GET /api/events
Browse all approved events with filtering and search capabilities.

**Authentication:** Not required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12, max: 50)
- `category` (string): Filter by category (e.g., "Music", "Family & Kids")
- `type` (string): Event type ("Event", "Course", "Venue")
- `venueType` (string): Venue type ("Indoor", "Outdoor")
- `city` (string): Filter by city (case-insensitive)
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `currency` (string): Currency filter ("AED", "USD", "EGP", "CAD")
- `ageMin` (number): Minimum age range filter
- `ageMax` (number): Maximum age range filter
- `featured` (string): Filter featured events ("true" for featured only)
- `search` (string): Text search across title, description, and tags
- `sortBy` (string): Sort field ("createdAt", "price", "viewsCount", "title")
- `sortOrder` (string): Sort order ("asc", "desc", default: "desc")

**Example Request:**
```bash
curl "http://localhost:5000/api/events?category=Music&city=Dubai&limit=5&featured=true"
```

**Response:**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [
      {
        "_id": "68a155c40214f9e8ddf64aff",
        "title": "Summer Music Festival",
        "description": "A day of entertainment for the whole family with live music...",
        "category": "Music",
        "type": "Event",
        "venueType": "Outdoor",
        "ageRange": [16, 65],
        "location": {
          "coordinates": {
            "lat": 25.232,
            "lng": 55.2515
          },
          "city": "Dubai",
          "address": "Jumeirah Beach Park"
        },
        "seoMeta": {
          "title": "Summer Music Festival 2024 - Dubai",
          "description": "Join the biggest music festival in Dubai...",
          "keywords": ["music", "festival", "dubai"]
        },
        "vendorId": {
          "_id": "68a155c30214f9e8ddf64a65",
          "firstName": "Ahmed",
          "lastName": "Music Events",
          "email": "ahmed@musicevent.com"
        },
        "price": 299,
        "currency": "AED",
        "isApproved": true,
        "isFeatured": true,
        "tags": ["music", "festival", "outdoor"],
        "dateSchedule": [
          {
            "date": "2024-07-15T18:00:00.000Z",
            "availableSeats": 10000,
            "_id": "68a155c40214f9e8ddf64b00"
          }
        ],
        "faqs": [
          {
            "question": "What should I bring to the event?",
            "answer": "Please bring a valid ID for entry. Food and drinks available for purchase.",
            "_id": "68a155c40214f9e8ddf64b01"
          }
        ],
        "viewsCount": 2847,
        "images": [
          "https://cloudinary.com/music-festival-banner.jpg",
          "https://cloudinary.com/music-festival-1.jpg"
        ],
        "isDeleted": false,
        "createdAt": "2024-03-15T08:30:00.000Z",
        "updatedAt": "2024-03-16T14:22:15.000Z",
        "affiliateCode": "MUS-FEST-2024"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalEvents": 15,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 5
    }
  }
}
```

### GET /api/events/categories
Get all available event categories for filtering.

**Authentication:** Not required

**Example Request:**
```bash
curl http://localhost:5000/api/events/categories
```

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
Get detailed information for a single event.

**Authentication:** Not required

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Example Request:**
```bash
curl http://localhost:5000/api/events/68a155c40214f9e8ddf64aff
```

**Response:**
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "event": {
      "_id": "68a155c40214f9e8ddf64aff",
      "title": "Summer Music Festival",
      "description": "The biggest music event of the year featuring world-renowned DJs and live bands...",
      "category": "Music",
      "type": "Event",
      "venueType": "Outdoor",
      "ageRange": [16, 65],
      "location": {
        "coordinates": {
          "lat": 25.232,
          "lng": 55.2515
        },
        "city": "Dubai",
        "address": "Dubai Marina Beach, Marina Walk"
      },
      "price": 299,
      "currency": "AED",
      "tags": ["music", "festival", "outdoor", "international"],
      "dateSchedule": [
        {
          "date": "2024-07-15T18:00:00.000Z",
          "availableSeats": 10000,
          "price": 299,
          "_id": "68a155c40214f9e8ddf64b00"
        }
      ],
      "faqs": [
        {
          "question": "What should I bring to the event?",
          "answer": "Please bring a valid ID for entry. Food and drinks will be available for purchase. Chairs and blankets are welcome.",
          "_id": "68a155c40214f9e8ddf64b01"
        },
        {
          "question": "Is parking available?",
          "answer": "Yes, complimentary parking is available at Dubai Marina Mall. Shuttle service provided.",
          "_id": "68a155c40214f9e8ddf64b02"
        }
      ],
      "images": [
        "https://cloudinary.com/music-festival-banner.jpg",
        "https://cloudinary.com/music-festival-1.jpg",
        "https://cloudinary.com/music-festival-2.jpg"
      ],
      "seoMeta": {
        "title": "Summer Music Festival 2024 - Dubai Marina Beach",
        "description": "Join the biggest music festival in Dubai featuring international artists. Book your tickets now!",
        "keywords": ["dubai music festival", "marina beach events", "summer concerts"]
      },
      "vendorId": {
        "_id": "68a155c30214f9e8ddf64a65",
        "firstName": "Ahmed",
        "lastName": "Music Events",
        "email": "ahmed@musicevent.com",
        "phone": "+971501234567",
        "avatar": "https://cloudinary.com/vendor-avatar.jpg"
      },
      "viewsCount": 2848,
      "isFeatured": true,
      "isApproved": true,
      "createdAt": "2024-03-15T08:30:00.000Z",
      "updatedAt": "2024-03-16T14:22:15.000Z"
    }
  }
}
```

**Note:** This endpoint automatically increments the `viewsCount` for analytics tracking.

---

## 🏪 Vendor Event Management

### POST /api/events
Create a new event (Vendor authentication required).

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Amazing Concert Night",
  "description": "A wonderful evening of music and entertainment featuring local and international artists.",
  "category": "Music",
  "type": "Event",
  "venueType": "Indoor",
  "ageRange": [18, 65],
  "location": {
    "city": "Dubai",
    "address": "123 Main Street, Downtown Dubai",
    "coordinates": {
      "lat": 25.2048,
      "lng": 55.2708
    }
  },
  "price": 150,
  "currency": "AED",
  "tags": ["music", "concert", "entertainment", "nightlife"],
  "dateSchedule": [{
    "date": "2024-03-15T19:00:00Z",
    "availableSeats": 500,
    "price": 150
  }],
  "faqs": [
    {
      "question": "What time does the event start?",
      "answer": "The event starts at 7:00 PM. Gates open at 6:00 PM."
    }
  ],
  "images": ["image_url_1", "image_url_2"],
  "seoMeta": {
    "title": "Amazing Concert Night 2024 - Dubai",
    "description": "Don't miss the amazing concert night in Dubai",
    "keywords": ["concert", "dubai", "music", "entertainment"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created successfully and is pending admin approval",
  "data": {
    "event": {
      "_id": "new_event_id",
      "title": "Amazing Concert Night",
      "description": "A wonderful evening of music and entertainment...",
      "isApproved": false,
      "status": "PENDING",
      "vendorId": "vendor_id",
      "affiliateCode": "AMZ-CONC-2024",
      "createdAt": "2024-03-16T10:30:00.000Z",
      "updatedAt": "2024-03-16T10:30:00.000Z"
    }
  }
}
```

### PUT /api/events/:id
Update an existing event (Event owner authentication required).

**Authentication:** Required (Event owner only)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Request Body:** Same structure as POST /api/events (partial updates allowed)

**Response:**
```json
{
  "success": true,
  "message": "Event updated successfully. Pending admin re-approval due to significant changes.",
  "data": {
    "event": {
      "_id": "event_id",
      "title": "Updated Event Title",
      "isApproved": false,
      "status": "PENDING_UPDATE",
      "updatedAt": "2024-03-16T14:35:00.000Z"
    }
  }
}
```

**Notes:** 
- Major changes (title, description, price, schedule) require admin re-approval
- Minor changes (tags, images) don't require re-approval
- Event remains live during re-approval process unless major pricing/scheduling changes occur

### DELETE /api/events/:id
Soft delete an event (Event owner authentication required).

**Authentication:** Required (Event owner only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

**Note:** This performs a soft delete. Event is marked as deleted but remains in database for order history.

### GET /api/events/vendor/my-events
Get vendor's own events with filtering and pagination.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12, max: 50)
- `status` (string): Filter by status ("all", "approved", "pending", "featured", "rejected")
- `sortBy` (string): Sort field ("createdAt", "title", "price", "viewsCount")
- `sortOrder` (string): Sort order ("asc", "desc", default: "desc")
- `search` (string): Search in event titles

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/events/vendor/my-events?status=approved&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor events retrieved successfully",
  "data": {
    "events": [
      {
        "_id": "event_id",
        "title": "My Amazing Event",
        "category": "Music",
        "price": 150,
        "currency": "AED",
        "isApproved": true,
        "isFeatured": false,
        "viewsCount": 245,
        "dateSchedule": [...],
        "createdAt": "2024-03-15T10:00:00.000Z",
        "updatedAt": "2024-03-16T14:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalEvents": 25,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 10
    }
  }
}
```

### GET /api/events/vendor/analytics
Get comprehensive analytics for vendor's events.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `period` (number): Analysis period in days (default: 30, max: 365)
- `eventId` (string): Specific event analytics (optional)

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/events/vendor/analytics?period=90" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor analytics retrieved successfully",
  "data": {
    "analytics": {
      "summary": {
        "totalEvents": 25,
        "approvedEvents": 20,
        "pendingEvents": 3,
        "rejectedEvents": 2,
        "featuredEvents": 5,
        "totalViews": 15420,
        "avgViewsPerEvent": 616,
        "totalRevenue": 125000,
        "avgPrice": 245.50
      },
      "performance": {
        "topPerformingEvent": {
          "title": "Summer Music Festival",
          "views": 2847,
          "revenue": 35000
        },
        "categoryBreakdown": {
          "Music": 12,
          "Sports": 8,
          "Technology": 5
        },
        "monthlyTrends": [
          {
            "month": "2024-01",
            "events": 8,
            "views": 3200,
            "revenue": 24000
          }
        ]
      }
    }
  }
}
```

---

## ⚙️ Admin Event Management

### GET /api/events/admin/all
Get all events for administrative management.

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12, max: 100)
- `status` (string): Filter by status ("all", "approved", "pending", "featured", "rejected")
- `vendorId` (string): Filter by specific vendor
- `category` (string): Filter by category
- `sortBy` (string): Sort field ("createdAt", "title", "price", "viewsCount")
- `sortOrder` (string): Sort order ("asc", "desc", default: "desc")
- `search` (string): Search in titles, descriptions

**Response:**
```json
{
  "success": true,
  "message": "Admin events retrieved successfully",
  "data": {
    "events": [
      {
        "_id": "event_id",
        "title": "Pending Event Title",
        "vendorId": {
          "_id": "vendor_id",
          "firstName": "John",
          "lastName": "Vendor",
          "email": "john@vendor.com"
        },
        "category": "Music",
        "isApproved": false,
        "isFeatured": false,
        "status": "PENDING",
        "submittedAt": "2024-03-16T10:30:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### PUT /api/events/admin/:id/approval
Approve or reject an event submission.

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Request Body:**
```json
{
  "isApproved": true,
  "reason": "Optional rejection reason if disapproving",
  "adminNotes": "Internal admin notes"
}
```

**Response (Approval):**
```json
{
  "success": true,
  "message": "Event approved successfully",
  "data": {
    "event": {
      "_id": "event_id",
      "title": "Event Title",
      "isApproved": true,
      "approvedAt": "2024-03-16T15:30:00.000Z",
      "approvedBy": "admin_id"
    }
  }
}
```

**Response (Rejection):**
```json
{
  "success": true,
  "message": "Event rejected successfully",
  "data": {
    "event": {
      "_id": "event_id",
      "title": "Event Title",
      "isApproved": false,
      "rejectionReason": "Event description needs more detail",
      "rejectedAt": "2024-03-16T15:30:00.000Z",
      "rejectedBy": "admin_id"
    }
  }
}
```

### PUT /api/events/admin/:id/featured
Toggle event featured status for enhanced visibility.

**Authentication:** Required (Admin role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (string): Event MongoDB ObjectId

**Request Body:**
```json
{
  "isFeatured": true
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
      "title": "Event Title",
      "isFeatured": true,
      "featuredAt": "2024-03-16T15:45:00.000Z",
      "featuredBy": "admin_id"
    }
  }
}
```

---

## 📈 Event Analytics & Insights

### Event View Tracking
- All public event detail views are automatically tracked
- View counts help vendors understand event popularity
- Analytics aggregation runs daily for performance optimization

### SEO Optimization
- Events include structured meta tags for search engines
- Automatic generation of SEO-friendly URLs
- Keywords and descriptions optimized for discovery

### Performance Monitoring
- Response time tracking for all event endpoints
- Automated scaling based on traffic patterns
- Caching strategies for high-traffic events

---

## 🔧 Implementation Examples

### Frontend Event Listing
```javascript
// Fetch featured events with filtering
const fetchEvents = async (filters = {}) => {
  const params = new URLSearchParams({
    featured: 'true',
    city: 'Dubai',
    limit: 12,
    ...filters
  });
  
  const response = await fetch(`/api/events?${params}`);
  const data = await response.json();
  
  return data.success ? data.data.events : [];
};
```

### Vendor Event Creation
```javascript
// Create new event with comprehensive data
const createEvent = async (eventData) => {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...eventData,
      dateSchedule: eventData.dates.map(date => ({
        date: new Date(date).toISOString(),
        availableSeats: eventData.capacity,
        price: eventData.price
      }))
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data.event;
};
```

### Admin Event Approval Workflow
```javascript
// Bulk approve/reject events
const processEventBatch = async (eventIds, action, reason = '') => {
  const promises = eventIds.map(id =>
    fetch(`/api/events/admin/${id}/approval`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isApproved: action === 'approve',
        reason: action === 'reject' ? reason : undefined
      })
    })
  );
  
  const results = await Promise.allSettled(promises);
  return results.map(result => 
    result.status === 'fulfilled' ? result.value.json() : null
  );
};
```

---

**Related Documentation:**
- [Authentication →](../authentication.md) - User and role management
- [Orders & Payments →](orders-payments.md) - Event booking and payment processing  
- [Venues & Vendors →](venues-vendors.md) - Venue and vendor management
- [File Uploads →](file-uploads.md) - Event image and document uploads
- [Admin APIs →](admin-apis.md) - Additional administrative functions