# API Reference

Comprehensive documentation for the Gema Event Management Platform API.

## 📖 Quick Navigation

| Section | Description | Authentication |
|---------|-------------|----------------|
| [**Public APIs**](public-apis.md) | Browse events, categories, and public data | None required |
| [**Authentication**](../authentication.md) | User registration, login, and token management | Public + Private |
| [**User Management**](user-management.md) | Profile management and user preferences | 🔒 User auth |
| [**Events**](events.md) | Event creation, management, and discovery | 🔒 Vendor/Admin |
| [**Orders & Payments**](orders-payments.md) | Order processing and payment handling | 🔒 Customer auth |
| [**Venues & Vendors**](venues-vendors.md) | Venue and vendor management | 🔒 Vendor/Admin |
| [**Reviews & Ratings**](reviews-ratings.md) | Review system and moderation | 🔒 Customer auth |
| [**File Uploads**](file-uploads.md) | Image and document management | 🔒 Auth required |
| [**Admin APIs**](admin-apis.md) | Administrative functions | 🔒 Admin only |

## 🌐 Base URLs

| Environment | URL | Status |
|-------------|-----|---------|
| **Development** | `http://localhost:5000/api` | ✅ Local development |
| **Staging** | `https://gema-backend-staging.render.com/api` | 🔄 Testing environment |
| **Production** | `https://gema-backend.render.com/api` | 🚀 Live system |

## 🔐 Authentication Overview

Most endpoints require authentication via JWT tokens:

```bash
# Include in request headers
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

**Token Types:**
- **Access Token**: Short-lived (7 days), used for API requests
- **Refresh Token**: Long-lived (30 days), used to obtain new access tokens

## 📊 Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully", 
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 10
    }
  }
}
```

## ⚠️ HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| **200** | OK | Request successful |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request data/validation failed |
| **401** | Unauthorized | Authentication required or token invalid |
| **403** | Forbidden | Insufficient permissions for this action |
| **404** | Not Found | Requested resource doesn't exist |
| **409** | Conflict | Resource already exists (duplicate) |
| **422** | Unprocessable Entity | Request valid but cannot be processed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |

## 🔄 Rate Limiting

API requests are rate-limited to prevent abuse:

- **Default Limit**: 100 requests per 15-minute window
- **Headers Included**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## 📄 Pagination

List endpoints support pagination with consistent parameters:

### Query Parameters
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (varies by endpoint, max: 50-100)
- `sortBy` (string): Field to sort by (varies by endpoint)
- `sortOrder` (string): "asc" or "desc" (default: "desc")

### Example Request
```bash
GET /api/events?page=2&limit=20&sortBy=createdAt&sortOrder=desc
```

## 🔍 Filtering & Search

Many endpoints support filtering and search:

### Common Filters
- **Text Search**: `search` parameter for full-text search
- **Date Ranges**: `dateFrom`, `dateTo` parameters
- **Status Filters**: `status` parameter with predefined values
- **Category Filters**: `category`, `type` parameters

### Example Request
```bash
GET /api/events?search=music&category=Entertainment&dateFrom=2024-03-01&dateTo=2024-03-31
```

## 🛡️ Security Best Practices

### Authentication
1. **Store tokens securely** - Use secure storage mechanisms
2. **Refresh tokens before expiry** - Implement automatic token refresh
3. **Don't expose sensitive data** - Never log or expose tokens

### Request Security
1. **Use HTTPS in production** - All production requests must use HTTPS
2. **Validate input** - Client-side validation doesn't replace server-side
3. **Handle errors gracefully** - Don't expose internal system details

## 🚀 Getting Started

1. **New to the API?** Start with [Getting Started Guide](../getting-started.md)
2. **Need examples?** Check out [Examples Directory](../examples/)
3. **Having issues?** See [Troubleshooting Guide](../troubleshooting.md)
4. **Ready to develop?** Read [Development Guidelines](../development.md)

## 📚 Additional Resources

- [**Authentication Deep Dive**](../authentication.md) - Detailed auth implementation
- [**Deployment Guide**](../deployment.md) - Production deployment steps  
- [**Code Examples**](../examples/) - Common workflows and use cases
- [**Troubleshooting**](../troubleshooting.md) - Common issues and solutions

---

**Last Updated**: January 2024 | **API Version**: v1.0.0