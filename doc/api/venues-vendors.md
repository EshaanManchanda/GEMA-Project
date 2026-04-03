# Venues & Vendors APIs

Complete documentation for venue management and vendor operations.

## 🏢 Overview

The Venues & Vendors system provides:
- **Venue Discovery**: Browse and search event venues publicly
- **Venue Management**: Create and manage venue listings
- **Vendor Profiles**: Comprehensive vendor profile management
- **Business Operations**: Business hours, social media, and operational settings
- **Analytics**: Performance tracking for vendor businesses

---

## 🏟️ Venue Management

### GET /api/venues
Browse all available venues with filtering capabilities.

**Authentication:** Not required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 50)
- `city` (string): Filter by city (case-insensitive)
- `venueType` (string): Filter by venue type ("indoor", "outdoor")
- `capacity` (number): Minimum capacity filter
- `minPrice` (number): Minimum rental price filter
- `maxPrice` (number): Maximum rental price filter
- `currency` (string): Currency filter ("AED", "USD", "EUR")
- `facilities` (string): Comma-separated facilities filter
- `search` (string): Search by venue name or description
- `sortBy` (string): Sort field ("name", "capacity", "baseRentalPrice", "rating")
- `sortOrder` (string): Sort order ("asc", "desc", default: "asc")

**Example Request:**
```bash
curl "http://localhost:5000/api/venues?city=Dubai&capacity=500&venueType=indoor&limit=5"
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
          "https://cloudinary.com/venue-interior.jpg"
        ],
        "isApproved": true,
        "rating": 4.7,
        "reviewCount": 45,
        "availability": {
          "isAvailable": true,
          "nextAvailableDate": "2024-03-20T00:00:00.000Z"
        },
        "owner": {
          "_id": "owner_id",
          "firstName": "Sarah",
          "lastName": "Manager",
          "email": "sarah@dubaicc.com"
        },
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalVenues": 38,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 5
    }
  }
}
```

### GET /api/venues/:id
Get detailed information for a specific venue.

**Authentication:** Not required

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
      "description": "Premier event venue offering state-of-the-art facilities...",
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
      "operationalDetails": {
        "setupTime": 2,
        "cleanupTime": 1,
        "minimumRentalHours": 4,
        "cancellationPolicy": "48 hours notice required",
        "securityDeposit": 5000
      },
      "rating": 4.7,
      "reviewCount": 45,
      "isApproved": true,
      "owner": {
        "_id": "owner_id",
        "firstName": "Sarah",
        "lastName": "Manager",
        "email": "sarah@dubaicc.com",
        "phone": "+971501234567"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-03-10T16:30:00.000Z"
    }
  }
}
```

### POST /api/venues
Create a new venue listing (Vendor authentication required).

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Grand Event Hall",
  "description": "A beautiful and spacious venue perfect for weddings, corporate events, and celebrations.",
  "address": {
    "street": "456 Marina Walk",
    "city": "Dubai",
    "state": "Dubai",
    "country": "UAE",
    "zipCode": "12345"
  },
  "coordinates": {
    "lat": 25.2048,
    "lng": 55.2708
  },
  "capacity": 800,
  "venueType": "indoor",
  "facilities": [
    "parking",
    "wifi",
    "catering",
    "av_equipment",
    "air_conditioning",
    "dance_floor",
    "stage"
  ],
  "baseRentalPrice": 8000,
  "currency": "AED",
  "operationalDetails": {
    "setupTime": 3,
    "cleanupTime": 2,
    "minimumRentalHours": 6,
    "cancellationPolicy": "72 hours notice required for full refund",
    "securityDeposit": 3000
  },
  "checkInGates": [
    {
      "name": "Main Entrance",
      "location": "Ground floor, Marina Walk entrance"
    }
  ],
  "accessRules": "Valid ID required. No smoking inside the venue."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Venue created successfully and is pending admin approval",
  "data": {
    "venue": {
      "_id": "new_venue_id",
      "name": "Grand Event Hall",
      "description": "A beautiful and spacious venue...",
      "owner": "vendor_id",
      "isApproved": false,
      "status": "PENDING_APPROVAL",
      "createdAt": "2024-03-16T10:30:00.000Z"
    }
  }
}
```

### PUT /api/venues/:id
Update venue information (Venue owner/Admin authentication required).

**Authentication:** Required (Venue owner or Admin)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (string): Venue MongoDB ObjectId

**Request Body:** Same structure as POST /api/venues (partial updates allowed)

**Response:**
```json
{
  "success": true,
  "message": "Venue updated successfully",
  "data": {
    "venue": {
      "_id": "venue_id",
      "name": "Updated Venue Name",
      "updatedAt": "2024-03-16T14:30:00.000Z"
    }
  }
}
```

### DELETE /api/venues/:id
Delete/deactivate a venue (Venue owner/Admin authentication required).

**Authentication:** Required (Venue owner or Admin)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` (string): Venue MongoDB ObjectId

**Response:**
```json
{
  "success": true,
  "message": "Venue deleted successfully"
}
```

---

## 🏪 Vendor Profile Management

### GET /api/vendors/profile
Get current vendor's profile information.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor profile retrieved successfully",
  "data": {
    "vendor": {
      "_id": "vendor_id",
      "firstName": "Ahmed",
      "lastName": "Events Co",
      "email": "ahmed@eventsco.com",
      "phone": "+971501234567",
      "avatar": "https://cloudinary.com/vendor-avatar.jpg",
      "role": "vendor",
      "businessName": "Ahmed Events & Entertainment",
      "businessLicense": "BL-2024-12345",
      "addresses": [
        {
          "_id": "address_id",
          "type": "business",
          "street": "123 Business District",
          "city": "Dubai",
          "state": "Dubai",
          "zipCode": "12345",
          "country": "UAE",
          "isDefault": true
        }
      ],
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
      },
      "socialMedia": {
        "facebook": "https://facebook.com/ahmedevents",
        "instagram": "https://instagram.com/ahmedevents",
        "twitter": "https://twitter.com/ahmedevents",
        "linkedin": "https://linkedin.com/company/ahmedevents",
        "website": "https://ahmedevents.com"
      },
      "businessDetails": {
        "description": "Professional event planning and management services",
        "specialties": ["corporate events", "weddings", "conferences"],
        "yearsInBusiness": 8,
        "teamSize": 25,
        "languages": ["English", "Arabic"]
      },
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "status": "ACTIVE",
      "rating": 4.8,
      "reviewCount": 156,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "lastLogin": "2024-03-16T09:30:00.000Z"
    }
  }
}
```

### PUT /api/vendors/profile
Update vendor profile information.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "Ahmed",
  "lastName": "Events & Entertainment",
  "phone": "+971501234567",
  "businessName": "Ahmed Events & Entertainment LLC",
  "businessLicense": "BL-2024-12345",
  "addresses": [
    {
      "type": "business",
      "street": "456 New Business District",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "54321",
      "country": "UAE",
      "isDefault": true
    }
  ],
  "businessDetails": {
    "description": "Full-service event planning and management company specializing in corporate events, weddings, and cultural celebrations.",
    "specialties": ["corporate events", "weddings", "conferences", "cultural events"],
    "yearsInBusiness": 9,
    "teamSize": 30,
    "languages": ["English", "Arabic", "Hindi"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor profile updated successfully",
  "data": {
    "vendor": {
      "_id": "vendor_id",
      "firstName": "Ahmed",
      "lastName": "Events & Entertainment",
      "businessName": "Ahmed Events & Entertainment LLC",
      "updatedAt": "2024-03-16T14:35:00.000Z"
    }
  }
}
```

### PUT /api/vendors/business-hours
Update vendor business hours and availability.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "businessHours": {
    "monday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "19:00"
    },
    "tuesday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "19:00"
    },
    "wednesday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "19:00"
    },
    "thursday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "19:00"
    },
    "friday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "saturday": {
      "isOpen": true,
      "openTime": "10:00",
      "closeTime": "16:00"
    },
    "sunday": {
      "isOpen": false
    }
  },
  "timeZone": "Asia/Dubai",
  "advanceBookingDays": 90,
  "emergencyContact": "+971501234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business hours updated successfully",
  "data": {
    "vendor": {
      "_id": "vendor_id",
      "businessHours": {...},
      "updatedAt": "2024-03-16T14:40:00.000Z"
    }
  }
}
```

### PUT /api/vendors/social-media
Update vendor social media links and online presence.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "socialMedia": {
    "facebook": "https://facebook.com/ahmedevents",
    "instagram": "https://instagram.com/ahmedevents",
    "twitter": "https://twitter.com/ahmedevents",
    "linkedin": "https://linkedin.com/company/ahmedevents",
    "youtube": "https://youtube.com/c/ahmedevents",
    "tiktok": "https://tiktok.com/@ahmedevents",
    "website": "https://ahmedevents.com",
    "blog": "https://blog.ahmedevents.com"
  },
  "onlinePresence": {
    "googleMyBusiness": "https://maps.google.com/ahmedevents",
    "tripadvisor": "https://tripadvisor.com/ahmedevents",
    "eventbrite": "https://eventbrite.com/o/ahmedevents"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Social media links updated successfully",
  "data": {
    "vendor": {
      "_id": "vendor_id",
      "socialMedia": {...},
      "updatedAt": "2024-03-16T14:45:00.000Z"
    }
  }
}
```

---

## 📊 Vendor Analytics & Dashboard

### GET /api/vendors/stats
Get comprehensive vendor dashboard statistics.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `period` (number): Analysis period in days (default: 30, max: 365)

**Response:**
```json
{
  "success": true,
  "message": "Vendor statistics retrieved successfully",
  "data": {
    "overview": {
      "totalEvents": 45,
      "activeEvents": 12,
      "completedEvents": 30,
      "cancelledEvents": 3,
      "totalBookings": 1250,
      "totalRevenue": 485000.75,
      "averageOrderValue": 388.00
    },
    "performance": {
      "profileViews": 8540,
      "eventViews": 25670,
      "conversionRate": 0.048,
      "customerSatisfaction": 4.7,
      "responseTime": "2.3 hours",
      "bookingSuccessRate": 0.92
    },
    "trends": {
      "revenueGrowth": 0.18,
      "bookingGrowth": 0.15,
      "eventGrowth": 0.22,
      "period": "30_days"
    },
    "topEvents": [
      {
        "eventId": "event_id_1",
        "title": "Corporate Summit 2024",
        "bookings": 89,
        "revenue": 45000.00
      }
    ],
    "upcomingEvents": [
      {
        "eventId": "event_id_2",
        "title": "Wedding Celebration",
        "date": "2024-03-25T18:00:00.000Z",
        "bookings": 45
      }
    ]
  }
}
```

### GET /api/vendors/events
Get events created by the authenticated vendor.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (string): Filter by status ("active", "completed", "cancelled", "draft")
- `category` (string): Filter by event category
- `dateFrom` (string): Filter events from date
- `dateTo` (string): Filter events to date
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `sortBy` (string): Sort field ("createdAt", "title", "date", "bookings")
- `sortOrder` (string): Sort order ("asc", "desc")

**Response:**
```json
{
  "success": true,
  "message": "Vendor events retrieved successfully",
  "data": {
    "events": [
      {
        "_id": "event_id",
        "title": "Corporate Annual Summit",
        "category": "Business",
        "status": "active",
        "dateSchedule": [
          {
            "date": "2024-04-15T09:00:00.000Z",
            "availableSeats": 150,
            "bookedSeats": 89
          }
        ],
        "price": 450,
        "currency": "AED",
        "totalBookings": 89,
        "totalRevenue": 40050.00,
        "viewsCount": 1450,
        "isApproved": true,
        "isFeatured": true,
        "createdAt": "2024-02-15T10:00:00.000Z"
      }
    ],
    "summary": {
      "totalEvents": 45,
      "totalRevenue": 485000.75,
      "averageBookingsPerEvent": 27.8
    },
    "pagination": {...}
  }
}
```

### GET /api/vendors/bookings
Get bookings for vendor's events with detailed information.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `eventId` (string): Filter by specific event
- `status` (string): Filter by booking status
- `paymentStatus` (string): Filter by payment status
- `dateFrom` (string): Filter bookings from date
- `dateTo` (string): Filter bookings to date
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Vendor bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "_id": "order_id",
        "orderNumber": "ORD-1647890123456",
        "customerId": {
          "firstName": "Sarah",
          "lastName": "Ahmed",
          "email": "sarah@example.com",
          "phone": "+971501234567"
        },
        "eventId": {
          "title": "Corporate Summit 2024",
          "dateSchedule": [{
            "date": "2024-04-15T09:00:00.000Z"
          }]
        },
        "ticketQuantity": 3,
        "totalAmount": 1350.00,
        "currency": "AED",
        "status": "confirmed",
        "paymentStatus": "paid",
        "bookingDate": "2024-03-16T10:30:00.000Z",
        "specialRequests": "Dietary restrictions: vegetarian meals"
      }
    ],
    "summary": {
      "totalBookings": 234,
      "totalRevenue": 125670.50,
      "averageBookingValue": 537.00,
      "conversionRate": 0.052
    },
    "pagination": {...}
  }
}
```

---

## 📁 File Upload Management

### POST /api/vendors/upload-image
Upload vendor images including avatar, logos, and portfolio images.

**Authentication:** Required (Vendor role)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
- `avatar` (file): Vendor avatar/profile image
- `logo` (file): Business logo
- `coverImage` (file): Cover/banner image
- `portfolio` (files): Portfolio images (multiple files allowed)

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/vendors/upload-image \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "avatar=@vendor-avatar.jpg" \
  -F "logo=@business-logo.png"
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor images uploaded successfully",
  "data": {
    "vendor": {
      "_id": "vendor_id",
      "avatar": "https://cloudinary.com/vendor-avatar-new.jpg",
      "logo": "https://cloudinary.com/business-logo-new.png",
      "updatedAt": "2024-03-16T15:00:00.000Z"
    },
    "uploadedFiles": [
      {
        "fieldName": "avatar",
        "url": "https://cloudinary.com/vendor-avatar-new.jpg",
        "originalName": "vendor-avatar.jpg",
        "size": 245678,
        "mimetype": "image/jpeg"
      },
      {
        "fieldName": "logo", 
        "url": "https://cloudinary.com/business-logo-new.png",
        "originalName": "business-logo.png",
        "size": 123456,
        "mimetype": "image/png"
      }
    ]
  }
}
```

---

## 🔧 Implementation Examples

### Venue Search with Filters
```javascript
// Advanced venue search with multiple filters
const searchVenues = async (filters) => {
  const params = new URLSearchParams({
    city: 'Dubai',
    venueType: 'indoor',
    capacity: 500,
    facilities: 'parking,wifi,catering',
    sortBy: 'rating',
    sortOrder: 'desc',
    ...filters
  });
  
  const response = await fetch(`/api/venues?${params}`);
  const data = await response.json();
  
  return data.success ? data.data.venues : [];
};

// Usage
const venues = await searchVenues({
  minPrice: 5000,
  maxPrice: 20000,
  currency: 'AED'
});
```

### Vendor Dashboard Component
```javascript
// React component for vendor dashboard
const VendorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      const [statsResponse, eventsResponse] = await Promise.all([
        fetch('/api/vendors/stats', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch('/api/vendors/events?limit=5&status=active', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      ]);
      
      const statsData = await statsResponse.json();
      const eventsData = await eventsResponse.json();
      
      setStats(statsData.data);
      setEvents(eventsData.data.events);
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="vendor-dashboard">
      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Events</h3>
          <p>{stats?.overview.totalEvents}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p>{stats?.overview.totalRevenue} AED</p>
        </div>
        <div className="stat-card">
          <h3>Active Bookings</h3>
          <p>{stats?.overview.totalBookings}</p>
        </div>
      </div>
      
      <div className="recent-events">
        <h3>Recent Events</h3>
        {events.map(event => (
          <div key={event._id} className="event-card">
            <h4>{event.title}</h4>
            <p>Bookings: {event.totalBookings}</p>
            <p>Revenue: {event.totalRevenue} {event.currency}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Business Hours Manager
```javascript
// Business hours management utility
const BusinessHoursManager = {
  // Convert business hours to display format
  formatBusinessHours: (businessHours) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return days.map(day => {
      const dayInfo = businessHours[day];
      return {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        isOpen: dayInfo.isOpen,
        hours: dayInfo.isOpen 
          ? `${dayInfo.openTime} - ${dayInfo.closeTime}`
          : 'Closed'
      };
    });
  },
  
  // Update business hours
  updateBusinessHours: async (newHours) => {
    const response = await fetch('/api/vendors/business-hours', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ businessHours: newHours })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data.vendor;
  }
};
```

---

**Related Documentation:**
- [Events →](events.md) - Event creation and management for venues
- [Orders & Payments →](orders-payments.md) - Booking and payment processing
- [Reviews & Ratings →](reviews-ratings.md) - Venue and vendor review system
- [File Uploads →](file-uploads.md) - Image and document management
- [Admin APIs →](admin-apis.md) - Administrative venue and vendor management