# Postman Collection Guide

## Overview

The Gema API Postman collection has been reorganized to match the backend route structure for better navigation and clarity. All 298 endpoints are now organized into 25 logical folders that mirror the actual API routes.

## Collection Structure

The collection follows the exact same order as `backend/src/routes/index.ts`, making it easy to find endpoints:

### 1. 🔐 Authentication (19 requests)
**Route:** `/auth`
- User registration (Customer, Vendor, Admin)
- Login/Logout
- Profile management
- Password reset
- Email verification
- Token refresh

### 2. 🎉 Events (24 requests)
**Route:** `/events`
- Browse and search events
- Event details
- Event filtering
- Featured events
- Event categories

### 3. 📅 Bookings (9 requests)
**Route:** `/bookings`
- Create and manage bookings
- Booking confirmation
- Booking cancellation
- User booking history

### 4. 💳 Payments (11 requests)
**Route:** `/payments`
- Payment processing
- Stripe integration
- Payment confirmation
- Refund processing

### 5. 🎫 Tickets (2 requests)
**Route:** `/tickets`
- Ticket generation
- Ticket validation
- QR code generation

### 6. 📦 Orders (5 requests)
**Route:** `/orders`
- Order management
- Order history
- Order status tracking

### 7. ⭐ Reviews (9 requests)
**Route:** `/reviews`
- Submit reviews
- Review moderation
- Rating system
- Review responses

### 8. 📚 Collections (5 requests)
**Route:** `/collections`
- Event collections
- Featured collections
- Collection management

### 9. 🏢 Venues (6 requests)
**Route:** `/venues`
- Venue listing
- Venue details
- Venue search

### 10. 🔍 Search (3 requests)
**Route:** `/search`
- Global search
- Advanced filters
- Search suggestions

### 11. 🏷️ Categories (12 requests)
**Route:** `/categories`
- Category management
- Category hierarchy
- Category filtering

### 12. 🎟️ Coupons (12 requests)
**Route:** `/coupons`
- Coupon creation
- Coupon validation
- Discount application

### 13. ❤️ Favorites (8 requests)
**Route:** `/favorites`
- Add/remove favorites
- Favorite lists
- User preferences

### 14. 📰 Newsletter (8 requests)
**Route:** `/newsletter`
- Subscription management
- Newsletter preferences
- Unsubscribe

### 15. 🔔 Notifications (15 requests)
**Route:** `/notifications`
- Notification delivery
- Notification preferences
- Push notifications
- Email notifications

### 16. 🤝 Affiliates (13 requests)
**Route:** `/affiliates`
- Affiliate program
- Tracking links
- Commission management

### 17. 📝 Blogs (42 requests)
**Routes:** `/blogs`, `/blog`, `/admin/blogs`

#### Subfolders:
- **Public Blogs (10 requests)** - `/blogs`
  - Get all blogs
  - Featured/Popular/Recent blogs
  - Blog categories
  - Blog by slug
  - Related blogs
  - Like/Share functionality

- **Blog Comments (24 requests)** - `/blog`
  - Get comments
  - Create/Update/Delete comments
  - Reply to comments
  - Like/Dislike comments
  - Report comments
  - Get comment replies

- **Admin Blog Management (8 requests)** - `/admin/blogs` **[ADMIN ONLY]**
  - Create/Update/Delete blog posts
  - Get all blogs (admin view)
  - Blog category management (create, update, delete)
  - Blog moderation

### 18. 📤 Uploads (17 requests)
**Route:** `/uploads`
- File upload
- Image optimization
- Cloudinary integration
- File management

### 19. 📊 Analytics (9 requests)
**Route:** `/analytics`
- Event analytics
- User analytics
- Revenue reports
- Performance metrics

### 20. ✅ Check-in (2 requests)
**Route:** `/checkin`
- Event check-in
- QR code scanning
- Attendance tracking

### 21. 🏪 Vendors (7 requests)
**Route:** `/vendors`
- Vendor dashboard
- Vendor statistics
- Vendor management

### 22. 👥 Employees (2 requests)
**Route:** `/employees`
- Employee management
- Employee roles

### 23. 👨‍💼 Admin (42 requests)
**Route:** `/admin/*`

#### Subfolders:
- **User Management (15 requests)** - `/admin/users`
  - Create/Update/Delete users
  - User roles
  - User statistics

- **Event Management (3 requests)** - `/admin/events`
  - Approve/Reject events
  - Event moderation

- **Venue Management (4 requests)** - `/admin/venues`
  - Venue approval
  - Venue moderation

- **Revenue Management (14 requests)** - `/admin/revenue`
  - Revenue dashboard
  - Transaction reports
  - Financial analytics

- **Direct Admin Requests (6 requests)**
  - Dashboard stats
  - Moderation queue
  - System statistics

**Note:** Blog Management has been moved to the "📝 Blogs" folder for better feature-based organization.

### 24. 🏥 Health & System (3 requests)
**Route:** `/health`, `/seo`
- Health check
- System status
- SEO endpoints (sitemap, robots.txt)

### 25. 🧪 Test Workflows (12 requests)
**Special section for testing**
- Role-based authentication tests
- End-to-end workflows
- Integration test scenarios

## Key Improvements

### ✅ Clear Organization
- Folders match backend routes exactly
- Easy to find endpoints by route path
- Logical grouping of related functionality

### ✅ No Duplicates
- Consolidated multiple blog folders into one
- Removed redundant test folders
- Single source of truth for each endpoint
- Blog admin operations grouped with blog features (feature-based organization)

### ✅ Better Navigation
- Hierarchical structure with subfolders
- Consistent naming convention
- Route paths in folder descriptions

### ✅ Separation of Concerns
- Public routes separate from admin routes
- Test workflows in dedicated section
- Clear admin subfolder structure

## Usage

### Finding Endpoints

1. **By Route Path:** Folder names include route paths (e.g., "🔐 Authentication (/auth)")
2. **By Feature:** Grouped by functional area (Events, Bookings, Payments, etc.)
3. **By Role:** Admin routes clearly grouped under "👨‍💼 Admin" folder

### Authentication

The collection includes automatic token management:
- Login responses automatically save tokens
- Tokens are auto-selected based on route (admin/vendor/customer)
- Environment variables: `admin_token`, `vendor_token`, `customer_token`

### Environment Variables

Required variables:
- `base_url` - API base URL (default: localhost:5000)
- `api_version` - API version prefix (default: api)
- Role-specific tokens (auto-saved on login)
- Test user credentials (admin_email, vendor_email, customer_email, etc.)

## Comparison: Old vs New Structure

### Before (Confusing)
```
📁 Old Collection
├── 🔐 Authentication
├── 🧪 Role-Based Authentication Tests
├── 🧪 Event Management Tests
├── 🧪 Blog Comments Testing
├── 🎉 Events
├── 📝 Blog & Content
├── 📝 Blog Management
├── 🔗 Admin Blog Management
├── 📄 Blog Comments
├── 👨‍💼 Admin Panel
│   ├── User Management
│   ├── Event Management
│   └── Review Moderation
└── ... (many more mixed folders)
```

### After (Clear)
```
📁 New Collection (Matches Backend)
├── 1. 🔐 Authentication (/auth)
├── 2. 🎉 Events (/events)
├── 3. 📅 Bookings (/bookings)
├── 4. 💳 Payments (/payments)
├── ... (follows routes/index.ts order)
├── 17. 📝 Blogs (/blogs, /blog, /admin/blogs)
│   ├── Public Blogs
│   ├── Blog Comments
│   └── Admin Blog Management (Admin Only)
├── 23. 👨‍💼 Admin (/admin/*)
│   ├── User Management
│   ├── Event Management
│   ├── Venue Management
│   └── Revenue Management
└── 25. 🧪 Test Workflows (optional)
```

## Maintenance

When adding new endpoints:
1. Add to the appropriate folder based on route path
2. Follow the backend route structure in `routes/index.ts`
3. Use consistent naming: `{Action} {Resource}` (e.g., "Get All Events")
4. Update this guide if adding new top-level folders

## Support

For issues or questions:
- Check backend route structure: `backend/src/routes/index.ts`
- Verify endpoint exists in corresponding route file
- Ensure environment variables are set correctly
