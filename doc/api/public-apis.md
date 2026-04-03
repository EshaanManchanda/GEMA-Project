# Public APIs

Endpoints that don't require authentication - perfect for browsing and discovery.

## 🌐 Overview

These endpoints are publicly accessible and don't require authentication tokens. They're designed for:
- Event browsing and discovery
- Category exploration  
- Basic system information
- SEO-friendly content access

---

## Events

### GET /api/events
Browse all approved events with filtering and search.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12, max: 50)
- `category` (string): Filter by category
- `type` (string): Event type ("Event", "Course", "Venue")
- `venueType` (string): Venue type ("Indoor", "Outdoor")
- `city` (string): Filter by city (case-insensitive)
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `currency` (string): Currency filter ("AED", "USD", "EGP", "CAD")
- `ageMin` (number): Minimum age range
- `ageMax` (number): Maximum age range  
- `featured` (string): "true" for featured events only
- `search` (string): Text search across title, description, tags
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
        "description": "The biggest music event of the year featuring international artists...",
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
          "address": "Dubai Marina Beach"
        },
        "price": 299,
        "currency": "AED",
        "isFeatured": true,
        "tags": ["music", "festival", "outdoor", "international"],
        "dateSchedule": [
          {
            "date": "2024-07-15T18:00:00.000Z",
            "availableSeats": 10000,
            "_id": "68a155c40214f9e8ddf64b00"
          }
        ],
        "images": [
          "https://cloudinary.com/music-festival-banner.jpg",
          "https://cloudinary.com/music-festival-1.jpg"
        ],
        "viewsCount": 2847,
        "vendorId": {
          "_id": "68a155c30214f9e8ddf64a65",
          "firstName": "Ahmed",
          "lastName": "Music Events",
          "email": "ahmed@musicevent.com"
        },
        "createdAt": "2024-03-15T08:30:00.000Z",
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
      "description": "The biggest music event of the year featuring world-renowned DJs and live bands. Experience an unforgettable night of music, food, and entertainment at Dubai's most scenic venue.",
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
          "answer": "Yes, complimentary parking is available at Dubai Marina Mall. Shuttle service will be provided to the venue.",
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

**Note:** This endpoint automatically increments the `viewsCount` for analytics.

---

## Venues

### GET /api/venues
Browse available venues for events.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `city` (string): Filter by city
- `venueType` (string): Filter by type ("indoor", "outdoor")
- `capacity` (number): Minimum capacity filter
- `search` (string): Search by name or description

**Example Request:**
```bash
curl "http://localhost:5000/api/venues?city=Dubai&capacity=500&limit=3"
```

**Response:**
```json
{
  "success": true,
  "message": "Venues retrieved successfully", 
  "data": {
    "venues": [
      {
        "_id": "venue_id_123",
        "name": "Dubai Convention Center",
        "description": "World-class convention center in the heart of Dubai",
        "address": {
          "street": "123 Business Bay Boulevard",
          "city": "Dubai",
          "state": "Dubai",
          "country": "UAE",
          "zipCode": "00000"
        },
        "coordinates": {
          "lat": 25.1972,
          "lng": 55.2744
        },
        "capacity": 2000,
        "venueType": "indoor",
        "facilities": ["parking", "wifi", "catering", "av_equipment", "air_conditioning"],
        "baseRentalPrice": 15000,
        "currency": "AED",
        "images": [
          "https://cloudinary.com/venue-main.jpg",
          "https://cloudinary.com/venue-interior.jpg"
        ],
        "isApproved": true,
        "rating": 4.7,
        "reviewCount": 45,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalVenues": 23,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 3
    }
  }
}
```

### GET /api/venues/:id
Get detailed venue information.

**Path Parameters:**
- `id` (string): Venue MongoDB ObjectId

**Example Request:**
```bash
curl http://localhost:5000/api/venues/venue_id_123
```

**Response:**
```json
{
  "success": true,
  "message": "Venue details retrieved successfully",
  "data": {
    "venue": {
      "_id": "venue_id_123",
      "name": "Dubai Convention Center",
      "description": "Premier event venue offering state-of-the-art facilities for conferences, exhibitions, and corporate events.",
      "address": {
        "street": "123 Business Bay Boulevard", 
        "city": "Dubai",
        "state": "Dubai",
        "country": "UAE",
        "zipCode": "00000"
      },
      "coordinates": {
        "lat": 25.1972,
        "lng": 55.2744
      },
      "capacity": 2000,
      "venueType": "indoor",
      "facilities": [
        "parking",
        "wifi", 
        "catering",
        "av_equipment",
        "air_conditioning",
        "security",
        "elevator_access"
      ],
      "baseRentalPrice": 15000,
      "currency": "AED",
      "images": [
        "https://cloudinary.com/venue-main.jpg",
        "https://cloudinary.com/venue-interior.jpg",
        "https://cloudinary.com/venue-exterior.jpg"
      ],
      "floorPlan": "https://cloudinary.com/venue-floorplan.pdf",
      "checkInGates": [
        {
          "name": "Main Entrance",
          "location": "Ground floor, Boulevard entrance"
        },
        {
          "name": "VIP Entrance", 
          "location": "Mezzanine level, East wing"
        }
      ],
      "accessRules": "Valid ID required for entry. Professional attire recommended for corporate events.",
      "wifiCredentials": {
        "network": "DCC_Guest",
        "password": "Available upon request"
      },
      "rating": 4.7,
      "reviewCount": 45,
      "isApproved": true,
      "owner": {
        "_id": "owner_id",
        "firstName": "Sarah",
        "lastName": "Venue Manager",
        "email": "sarah@dubaicc.com"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-03-10T16:30:00.000Z"
    }
  }
}
```

---

## System Information

### GET /api
Health check and basic system information.

**Example Request:**
```bash
curl http://localhost:5000/api
```

**Response:**
```json
{
  "message": "Welcome to the Gema API!",
  "version": "1.0.0",
  "timestamp": "2024-03-16T10:30:00.000Z",
  "status": "healthy"
}
```

### GET /api/health
Detailed system health check.

**Example Request:**
```bash
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "success": true,
  "message": "System healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-03-16T10:30:00.000Z",
    "uptime": 1234567,
    "version": "1.0.0",
    "environment": "development",
    "database": {
      "status": "connected",
      "responseTime": 25
    },
    "services": {
      "firebase": "connected",
      "stripe": "connected", 
      "cloudinary": "connected"
    }
  }
}
```

---

## 💡 Usage Tips

### Caching
- **Event listings** are cached for 5 minutes
- **Categories** are cached for 1 hour
- **Individual events** have dynamic caching based on update frequency

### Performance
- Use `limit` parameter to control response size
- Add specific filters to reduce data transfer
- Featured events are optimized for faster loading

### SEO Optimization
- All public endpoints return SEO-friendly data
- Meta tags and descriptions are included for events
- Structured data is available for search engines

---

**Next Steps:**
- [Authentication →](../authentication.md) - Learn about user registration and login
- [Examples →](../examples/) - See complete workflow examples  
- [Getting Started →](../getting-started.md) - Full setup guide