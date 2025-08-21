# Admin Event Management with Vendor Management API

## Overview
Enhanced admin event management system that allows administrators to create events and assign them to vendors, as well as manage vendor assignments for existing events.

## New API Endpoints

### 1. Get All Vendors
**Endpoint:** `GET /api/admin/events/vendors`
**Access:** Admin only
**Description:** Retrieves a list of all active vendors for event assignment

**Response:**
```json
{
  "success": true,
  "message": "Vendors retrieved successfully",
  "data": {
    "vendors": [
      {
        "id": "vendor_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "fullName": "John Doe"
      }
    ],
    "totalVendors": 5
  }
}
```

### 2. Create Event (Admin)
**Endpoint:** `POST /api/admin/events`
**Access:** Admin only
**Description:** Creates a new event and assigns it to a specified vendor

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "category": "Entertainment",
  "type": "Event",
  "venueType": "Indoor",
  "ageRange": [18, 65],
  "location": {
    "city": "Dubai",
    "address": "Address",
    "coordinates": {
      "lat": 25.2048,
      "lng": 55.2708
    }
  },
  "price": 100,
  "currency": "AED",
  "vendorId": "vendor_object_id",
  "isApproved": true,
  "isFeatured": false,
  "tags": ["music", "entertainment"],
  "dateSchedule": [
    {
      "date": "2024-12-01T18:00:00Z",
      "availableSeats": 100,
      "price": 100
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "event": {
      "id": "event_id",
      "title": "Event Title",
      "vendor": {
        "id": "vendor_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "fullName": "John Doe"
      },
      // ... other event details
    }
  }
}
```

### 3. Change Event Vendor
**Endpoint:** `PUT /api/admin/events/:id/vendor`
**Access:** Admin only
**Description:** Reassigns an event to a different vendor

**Request Body:**
```json
{
  "vendorId": "new_vendor_object_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event vendor changed successfully",
  "data": {
    "event": {
      // updated event details with new vendor
    },
    "previousVendorId": "old_vendor_id",
    "newVendor": {
      "id": "new_vendor_id",
      "firstName": "Jane",
      "lastName": "Smith", 
      "email": "jane@example.com",
      "fullName": "Jane Smith"
    }
  }
}
```

### 4. Enhanced Update Event
**Endpoint:** `PUT /api/admin/events/:id`
**Access:** Admin only
**Description:** Updates event details, now includes vendor validation when vendorId is provided

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "vendorId": "vendor_object_id",
  // ... other event fields
}
```

## Features

1. **Vendor Assignment**: Admin can create events and assign them to any active vendor
2. **Vendor Reassignment**: Admin can change the vendor for existing events
3. **Vendor Validation**: System validates that assigned vendors exist and are active
4. **Auto-approval**: Events created by admin are auto-approved by default
5. **Vendor Listing**: Admin can retrieve list of all vendors for selection
6. **Enhanced Updates**: Regular event updates now support vendor changes with validation

## Security

- All endpoints require admin authentication
- Vendor validation ensures only active vendors can be assigned
- Proper ObjectId validation for all parameters
- Comprehensive error handling with appropriate HTTP status codes

## Integration

These endpoints integrate seamlessly with the existing event management system:
- Existing vendor and public routes remain unchanged
- Admin can still use all existing admin event management features
- Vendor permissions and access controls are preserved
- Events created by admin follow the same data structure as vendor-created events