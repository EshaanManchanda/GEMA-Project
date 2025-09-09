# Backend Documentation

## ⚙️ Node.js/Express Backend API

This section contains comprehensive documentation for the Gema Event Management Platform's backend implementation, including API endpoints, authentication, and integration patterns.

---

## 📑 Section Contents

### [🏗️ Backend Overview](./backend-overview.md)
Server architecture and setup fundamentals:
- Technology stack and dependencies
- Project structure and organization
- Development workflow and scripts
- Configuration and environment setup

### [📡 API Reference](./api-reference.md)
Complete API endpoint documentation:
- Authentication endpoints
- Event management APIs
- Booking and payment processing
- Admin and vendor operations
- Search and filtering capabilities

### [👨‍💼 Admin API Reference](./admin-api-reference.md)
Administrative API endpoints and workflows:
- User management operations
- Event moderation and approval
- Vendor management and assignment
- Analytics and reporting endpoints
- System administration features

---

## 🚀 Quick Backend Overview

### Technology Stack
- **Runtime**: Node.js v18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens + Firebase integration
- **Payment Processing**: Stripe integration
- **File Storage**: Cloudinary CDN
- **Email Service**: Nodemailer with SMTP
- **Logging**: Winston with file and console transports

### Architecture Pattern
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Controllers   │    │  Middleware  │    │   Services      │
│   (HTTP Layer)  │◄───│  (Security,  │◄───│  (Business      │
│                 │    │   Auth, etc) │    │   Logic)        │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                    │
         ▼                       ▼                    ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│     Routes      │    │    Models    │    │     Utils       │
│  (API Routing)  │    │  (Data Layer)│    │   (Helpers)     │
│                 │    │              │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

---

## 🔗 Quick API Access

### Base URLs
```
Development:  http://localhost:5000/api
Staging:      https://gema-backend-staging.render.com/api
Production:   https://gema-backend.render.com/api
```

### Health Check
```bash
# Test server status
curl http://localhost:5000/api/health

# Expected response
{
  "success": true,
  "message": "Server is running",
  "data": {
    "timestamp": "2025-09-07T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Authentication Flow
```bash
# Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Login and get tokens
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 📊 API Statistics

| Category | Count | Description |
|----------|-------|-------------|
| **Total Endpoints** | 50+ | Complete API coverage |
| **Auth Endpoints** | 8 | Authentication and authorization |
| **Event Endpoints** | 12+ | Event management operations |
| **Admin Endpoints** | 15+ | Administrative functions |
| **Payment Endpoints** | 6 | Transaction processing |
| **File Upload Endpoints** | 8 | Media management |

---

## 🛡️ Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure access token implementation
- **Refresh Tokens**: Automatic token renewal
- **Role-Based Access**: Admin, Vendor, Employee, Customer roles
- **Firebase Integration**: Social authentication support
- **Password Security**: bcrypt hashing with salt rounds

### API Security
- **Rate Limiting**: Request throttling and abuse prevention
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Output sanitization and encoding

### Security Headers
```javascript
// Helmet.js security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

---

## 🔌 Integration Services

### Payment Processing (Stripe)
```javascript
// Payment intent creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount * 100, // Convert to cents
  currency: 'aed',
  metadata: {
    bookingId: booking._id.toString(),
    userId: user._id.toString()
  }
})
```

### File Storage (Cloudinary)
```javascript
// Image upload and optimization
const result = await cloudinary.uploader.upload(file.path, {
  folder: 'gema/events',
  transformation: [
    { width: 800, height: 600, crop: 'limit' },
    { quality: 'auto', fetch_format: 'auto' }
  ]
})
```

### Email Service (Nodemailer)
```javascript
// Booking confirmation email
await sendEmail({
  to: user.email,
  subject: 'Booking Confirmation',
  template: 'booking-confirmation',
  data: {
    userName: user.firstName,
    eventTitle: event.title,
    bookingDetails: booking
  }
})
```

---

## ⚡ Performance Features

### Database Optimization
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries and aggregation pipelines
- **Caching Strategy**: Redis integration for frequent queries
- **Pagination**: Cursor-based pagination for large datasets

### Response Optimization
```javascript
// Response compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    return compression.filter(req, res)
  }
}))

// Response caching
app.use('/api/events/categories', cache('5 minutes'))
```

### Monitoring & Logging
```javascript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})
```

---

## 🛠️ Development Tools

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server
npm run db:seed     # Seed database with sample data
npm run db:reset    # Reset and reseed database
npm run lint        # Run ESLint for code quality
npm test           # Run test suites
npm run type-check # TypeScript type checking
```

### Environment Configuration
```env
# Server Configuration
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/gema

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# External Services
STRIPE_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=your-cloud-name
SMTP_HOST=smtp.gmail.com
```

---

## 🧪 Testing Strategy

### Test Coverage
- **Unit Tests**: Individual function and method testing
- **Integration Tests**: API endpoint and workflow testing
- **Security Tests**: Authentication and authorization validation
- **Performance Tests**: Load testing and response time analysis

### Testing Examples
```javascript
// Unit test for authentication
describe('Auth Controller', () => {
  test('should register new user', async () => {
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'SecurePass123!'
    }
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201)
    
    expect(response.body.success).toBe(true)
    expect(response.body.data.user.email).toBe(userData.email)
  })
})
```

---

## 🚀 Getting Started

1. **Setup Environment**: Follow [Quick Setup Guide](../01-getting-started/quick-setup.md)
2. **Explore API**: Review [API Reference](./api-reference.md)
3. **Understanding Admin Features**: Check [Admin API Reference](./admin-api-reference.md)
4. **Database Integration**: See [Database Documentation](../02-database/)

---

## 🔍 Common Use Cases

### Customer Journey
```bash
# 1. User Registration
POST /api/auth/register

# 2. Browse Events
GET /api/events?category=Entertainment&limit=10

# 3. Event Details
GET /api/events/:eventId

# 4. Create Booking
POST /api/bookings

# 5. Process Payment
POST /api/payments/create-intent
```

### Vendor Workflow
```bash
# 1. Vendor Login
POST /api/auth/login

# 2. Create Event
POST /api/vendor/events

# 3. Check Event Status
GET /api/vendor/events/:eventId

# 4. View Analytics
GET /api/vendor/analytics
```

### Admin Operations
```bash
# 1. Admin Authentication
POST /api/auth/login

# 2. Manage Users
GET /api/admin/users
PUT /api/admin/users/:userId/status

# 3. Event Moderation
GET /api/admin/events/pending
POST /api/admin/events/:eventId/approve

# 4. System Analytics
GET /api/admin/analytics/overview
```

---

**Next Steps**: Begin with the [Backend Overview](./backend-overview.md) to understand the server architecture, then explore the comprehensive [API Reference](./api-reference.md) for detailed endpoint documentation.