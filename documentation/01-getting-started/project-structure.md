# Project Structure

## 📁 Complete Gema Project Organization

This document provides a comprehensive overview of the Gema Event Management Platform's folder structure, file organization, and architectural patterns.

---

## 🏗️ **Root Directory Structure**

```
gema/
├── 📁 backend/                 # Node.js/Express API server
├── 📁 frontend/                # React TypeScript application
├── 📁 documentation/           # Organized project documentation
├── 📄 README.md               # Main project overview
├── 📄 .gitignore              # Git ignore patterns
├── 📄 docker-compose.yml      # Multi-container setup
└── 📄 package.json            # Root workspace configuration
```

---

## ⚙️ **Backend Structure** (`/backend`)

### Main Directories
```
backend/
├── 📁 src/                    # Source code
│   ├── 📁 controllers/        # Request handlers
│   ├── 📁 middleware/         # Express middleware
│   ├── 📁 models/            # Mongoose schemas
│   ├── 📁 routes/            # API route definitions  
│   ├── 📁 services/          # Business logic
│   ├── 📁 utils/             # Helper functions
│   └── 📄 server.ts          # Application entry point
├── 📁 tests/                 # Test suites
├── 📁 logs/                  # Application logs
├── 📄 package.json           # Dependencies & scripts
├── 📄 tsconfig.json          # TypeScript configuration
└── 📄 .env                   # Environment variables
```

### Controllers (`/src/controllers`)
```
controllers/
├── 📄 auth.controller.ts      # Authentication endpoints
├── 📄 user.controller.ts      # User management
├── 📄 event.controller.ts     # Event operations
├── 📄 booking.controller.ts   # Booking management
├── 📄 admin.controller.ts     # Admin functions
├── 📄 vendor.controller.ts    # Vendor operations
├── 📄 payment.controller.ts   # Payment processing
├── 📄 upload.controller.ts    # File upload handling
├── 📄 category.controller.ts  # Category management
├── 📄 notification.controller.ts # Notification system
├── 📄 affiliate.controller.ts # Affiliate tracking
└── 📄 coupon.controller.ts    # Coupon management
```

### Models (`/src/models`)
```
models/
├── 📄 User.ts                # User account schema
├── 📄 Event.ts               # Event data schema
├── 📄 Booking.ts             # Booking records
├── 📄 Category.ts            # Event categories
├── 📄 Review.ts              # User reviews
├── 📄 Payment.ts             # Payment transactions
├── 📄 Notification.ts        # Notification messages
├── 📄 Affiliate.ts           # Affiliate tracking
├── 📄 Coupon.ts              # Discount coupons
├── 📄 Vendor.ts              # Vendor profiles
└── 📄 index.ts               # Model exports
```

### Routes (`/src/routes`)
```
routes/
├── 📄 auth.routes.ts         # Authentication routes
├── 📄 user.routes.ts         # User endpoints
├── 📄 event.routes.ts        # Event CRUD operations
├── 📄 booking.routes.ts      # Booking endpoints
├── 📄 admin.routes.ts        # Admin panel routes
├── 📄 vendor.routes.ts       # Vendor dashboard
├── 📄 payment.routes.ts      # Payment processing
├── 📄 upload.routes.ts       # File upload routes
├── 📄 category.routes.ts     # Category management
├── 📄 notification.routes.ts # Notification endpoints
├── 📄 affiliate.routes.ts    # Affiliate system
├── 📄 coupon.routes.ts       # Coupon management
└── 📄 index.ts               # Route aggregation
```

### Middleware (`/src/middleware`)
```
middleware/
├── 📄 auth.middleware.ts     # JWT authentication
├── 📄 validation.middleware.ts # Request validation
├── 📄 upload.middleware.ts   # File upload handling
├── 📄 cors.middleware.ts     # CORS configuration
├── 📄 rate-limit.middleware.ts # Rate limiting
├── 📄 error.middleware.ts    # Error handling
└── 📄 logger.middleware.ts   # Request logging
```

### Services (`/src/services`)
```
services/
├── 📄 email.service.ts       # Email notifications
├── 📄 payment.service.ts     # Payment processing
├── 📄 upload.service.ts      # File upload service
├── 📄 notification.service.ts # Push notifications
├── 📄 analytics.service.ts   # Analytics tracking
├── 📄 cache.service.ts       # Redis caching
└── 📄 external-api.service.ts # Third-party APIs
```

---

## 🎨 **Frontend Structure** (`/frontend`)

### Main Directories
```
frontend/
├── 📁 public/                # Static assets
│   ├── 📁 assets/           # Images, icons, animations
│   └── 📁 locales/          # Translation files
├── 📁 src/                  # Source code
│   ├── 📁 components/       # React components
│   ├── 📁 pages/           # Route components
│   ├── 📁 store/           # Redux state management
│   ├── 📁 services/        # API services
│   ├── 📁 hooks/           # Custom React hooks
│   ├── 📁 contexts/        # React contexts
│   ├── 📁 utils/           # Utility functions
│   ├── 📁 types/           # TypeScript definitions
│   ├── 📁 styles/          # CSS and styling
│   └── 📄 App.tsx          # Main application component
├── 📄 package.json         # Dependencies & scripts
├── 📄 tsconfig.json        # TypeScript configuration
├── 📄 tailwind.config.js   # Tailwind CSS configuration
└── 📄 vite.config.ts       # Vite build configuration
```

### Components (`/src/components`)
```
components/
├── 📁 admin/               # Admin-specific components
│   ├── 📄 UserManagement.tsx
│   ├── 📄 EventModeration.tsx
│   ├── 📄 RevenueReports.tsx
│   ├── 📄 CommissionOverview.tsx
│   ├── 📄 EmployeeManagement.tsx
│   └── 📄 PayoutSummaryCard.tsx
├── 📁 auth/                # Authentication components
│   ├── 📄 LoginForm.tsx
│   ├── 📄 RegisterForm.tsx
│   ├── 📄 ProtectedRoute.tsx
│   ├── 📄 AdminRoute.tsx
│   └── 📄 VendorRoute.tsx
├── 📁 business/            # Business logic components
│   ├── 📄 EventAnalytics.tsx
│   ├── 📄 BookingFlow.tsx
│   └── 📄 PaymentProcessor.tsx
├── 📁 client/              # Customer-facing components
│   ├── 📄 EventCard.tsx
│   ├── 📄 CategoryCarousel.tsx
│   ├── 📄 FilterSidebar.tsx
│   ├── 📄 ReviewCarousel.tsx
│   └── 📄 BookingHistory.tsx
├── 📁 common/              # Reusable components
│   ├── 📄 Button.tsx
│   ├── 📄 Modal.tsx
│   ├── 📄 LoadingSpinner.tsx
│   ├── 📄 ErrorBoundary.tsx
│   ├── 📄 Pagination.tsx
│   ├── 📄 SearchBar.tsx
│   ├── 📄 DatePicker.tsx
│   ├── 📄 ImageUpload.tsx
│   ├── 📄 CurrencySelector.tsx
│   ├── 📄 EnhancedWishlist.tsx
│   └── 📄 MultiLanguageSupport.tsx
├── 📁 display/             # Data display components
│   ├── 📄 EventDetails.tsx
│   ├── 📄 UserProfile.tsx
│   ├── 📄 StatCard.tsx
│   └── 📄 Chart.tsx
├── 📁 forms/               # Form components
│   ├── 📄 EventForm.tsx
│   ├── 📄 BookingForm.tsx
│   ├── 📄 ProfileForm.tsx
│   └── 📄 ContactForm.tsx
├── 📁 interactive/         # Interactive UI components
│   ├── 📄 MapView.tsx
│   ├── 📄 Calendar.tsx
│   ├── 📄 RatingSystem.tsx
│   └── 📄 NotificationCenter.tsx
└── 📁 layout/              # Layout components
    ├── 📄 Header.tsx
    ├── 📄 Footer.tsx
    ├── 📄 Sidebar.tsx
    ├── 📄 Layout.tsx
    ├── 📄 ConnectionStatus.tsx
    ├── 📄 NewsletterSubscription.tsx
    └── 📄 NotificationDropdown.tsx
```

### Pages (`/src/pages`)
```
pages/
├── 📁 admin/               # Admin panel pages
│   ├── 📄 AdminDashboardPage.tsx
│   ├── 📄 AdminEventsPage.tsx
│   ├── 📄 AdminCommissionsPage.tsx
│   └── 📄 AdminPayoutsPage.tsx
├── 📁 auth/                # Authentication pages
│   ├── 📄 LoginPage.tsx
│   ├── 📄 RegisterPage.tsx
│   └── 📄 ForgotPasswordPage.tsx
├── 📁 vendor/              # Vendor dashboard pages
│   ├── 📄 VendorDashboard.tsx
│   ├── 📄 VendorEventsPage.tsx
│   └── 📄 VendorAnalytics.tsx
├── 📄 HomePage.tsx         # Landing page
├── 📄 EventsPage.tsx       # Event browsing
├── 📄 EventDetails.tsx     # Individual event page
├── 📄 BookingPage.tsx      # Booking interface
├── 📄 ProfilePage.tsx      # User profile
├── 📄 AboutPage.tsx        # About us
└── 📄 ContactPage.tsx      # Contact information
```

### Store (`/src/store`)
```
store/
├── 📁 slices/              # Redux slices
│   ├── 📄 authSlice.ts     # Authentication state
│   ├── 📄 eventsSlice.ts   # Events data
│   ├── 📄 bookingsSlice.ts # Booking state
│   ├── 📄 cartSlice.ts     # Shopping cart
│   ├── 📄 adminSlice.ts    # Admin interface state
│   ├── 📄 uiSlice.ts       # UI state management
│   ├── 📄 affiliatesSlice.ts # Affiliate data
│   ├── 📄 couponsSlice.ts  # Coupon management
│   ├── 📄 notificationsSlice.ts # Notifications
│   └── 📄 paymentsSlice.ts # Payment state
├── 📄 index.ts             # Store configuration
├── 📄 middleware.ts        # Custom middleware
└── 📄 selectors.ts         # Reusable selectors
```

### Services (`/src/services`)
```
services/
├── 📁 api/                 # API service modules
│   ├── 📄 adminAPI.ts      # Admin endpoints
│   ├── 📄 bookingAPI.ts    # Booking services
│   ├── 📄 categoriesAPI.ts # Category services
│   ├── 📄 affiliateAPI.ts  # Affiliate services
│   ├── 📄 couponAPI.ts     # Coupon services
│   ├── 📄 notificationAPI.ts # Notification services
│   ├── 📄 paymentAPI.ts    # Payment services
│   └── 📄 index.ts         # API service aggregation
└── 📄 api.ts               # Base API configuration
```

---

## 📚 **Documentation Structure** (`/documentation`)

```
documentation/
├── 📄 README.md            # Master documentation index
├── 📁 01-getting-started/  # Project introduction
│   ├── 📄 README.md
│   ├── 📄 project-overview.md
│   ├── 📄 project-structure.md
│   └── 📄 quick-setup.md
├── 📁 02-database/         # Database documentation
│   ├── 📄 README.md
│   ├── 📄 schema-overview.md
│   └── 📄 collections-reference.md
├── 📁 03-backend/          # Backend documentation
│   ├── 📄 README.md
│   └── 📄 api-reference.md
├── 📁 04-frontend/         # Frontend documentation
│   └── 📄 README.md
├── 📁 05-admin-system/     # Admin system docs
│   ├── 📄 README.md
│   └── 📄 admin-overview.md
├── 📁 06-integrations/     # Third-party integrations
│   ├── 📄 README.md
│   └── 📄 cloudinary-integration.md
├── 📁 07-deployment/       # Deployment guides
│   └── 📄 README.md
├── 📁 08-testing/          # Testing documentation
│   └── 📄 README.md
└── 📁 09-maintenance/      # Operations & maintenance
    └── 📄 README.md
```

---

## 🧪 **Testing Structure**

### Backend Testing
```
backend/tests/
├── 📁 unit/                # Unit tests
│   ├── 📁 controllers/
│   ├── 📁 models/
│   ├── 📁 services/
│   └── 📁 utils/
├── 📁 integration/         # Integration tests
│   ├── 📁 auth/
│   ├── 📁 events/
│   └── 📁 payments/
└── 📁 e2e/                 # End-to-end tests
    ├── 📁 user-journeys/
    └── 📁 admin-workflows/
```

### Frontend Testing
```
frontend/src/tests/
├── 📁 components/          # Component tests
│   ├── 📁 admin/
│   ├── 📁 common/
│   └── 📁 client/
├── 📁 pages/              # Page tests
├── 📁 hooks/              # Custom hook tests
├── 📁 utils/              # Utility tests
└── 📁 mocks/              # Test mocks
    ├── 📄 api.mock.ts
    ├── 📄 user.mock.ts
    └── 📄 event.mock.ts
```

---

## ⚙️ **Configuration Files**

### Root Level Configuration
```
├── 📄 .gitignore          # Git ignore patterns
├── 📄 .env.example        # Environment variables template
├── 📄 docker-compose.yml  # Multi-container setup
├── 📄 Dockerfile          # Docker container configuration
├── 📄 .github/            # GitHub Actions workflows
│   └── workflows/
│       ├── 📄 ci.yml      # Continuous integration
│       └── 📄 deploy.yml  # Deployment automation
└── 📄 package.json        # Workspace configuration
```

### Backend Configuration
```
backend/
├── 📄 .env                # Environment variables
├── 📄 .env.example        # Environment template
├── 📄 tsconfig.json       # TypeScript configuration
├── 📄 jest.config.js      # Jest testing configuration
├── 📄 .eslintrc.js        # ESLint configuration
├── 📄 .prettierrc         # Prettier formatting
└── 📄 nodemon.json        # Development server config
```

### Frontend Configuration
```
frontend/
├── 📄 .env                # Environment variables
├── 📄 .env.example        # Environment template
├── 📄 tsconfig.json       # TypeScript configuration
├── 📄 tsconfig.node.json  # Node TypeScript config
├── 📄 vite.config.ts      # Vite build configuration
├── 📄 tailwind.config.js  # Tailwind CSS configuration
├── 📄 postcss.config.js   # PostCSS configuration
├── 📄 jest.config.js      # Jest testing configuration
├── 📄 .eslintrc.js        # ESLint configuration
└── 📄 .prettierrc         # Prettier formatting
```

---

## 📦 **Build & Deployment Structure**

### Build Artifacts
```
├── 📁 backend/dist/       # Compiled backend code
├── 📁 frontend/dist/      # Production frontend build
├── 📁 docker/             # Docker configurations
│   ├── 📄 Dockerfile.backend
│   ├── 📄 Dockerfile.frontend
│   └── 📄 docker-compose.prod.yml
└── 📁 scripts/            # Deployment scripts
    ├── 📄 deploy.sh       # Deployment automation
    ├── 📄 backup.sh       # Database backup
    └── 📄 health-check.sh # Health monitoring
```

---

## 🔧 **Development Tools & Scripts**

### Available Scripts

#### Backend Scripts
```bash
npm run dev          # Development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start           # Production server
npm run test        # Run test suites
npm run test:watch  # Watch mode testing
npm run lint        # Code linting
npm run type-check  # TypeScript validation
npm run db:seed     # Database seeding
npm run db:reset    # Database reset
```

#### Frontend Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run test suites
npm run test:ui      # Testing UI
npm run lint         # Code linting
npm run type-check   # TypeScript validation
npm run analyze      # Bundle analysis
```

---

## 🏗️ **Architectural Patterns**

### Backend Architecture
- **MVC Pattern**: Separation of concerns with Models, Views, Controllers
- **Middleware Pattern**: Request/response processing pipeline
- **Service Layer**: Business logic abstraction
- **Repository Pattern**: Data access abstraction

### Frontend Architecture
- **Component-Based**: Reusable UI component library
- **State Management**: Centralized state with Redux Toolkit
- **Custom Hooks**: Reusable stateful logic
- **Context Providers**: Global state and configuration

### Database Architecture
- **Document-Based**: MongoDB collections for flexible data modeling
- **Indexing Strategy**: Optimized queries with strategic indexing
- **Relationship Modeling**: References and embedded documents
- **Schema Validation**: Mongoose schema validation

---

## 📊 **File Organization Principles**

### Naming Conventions
- **Files**: kebab-case for folders, PascalCase for React components
- **Variables**: camelCase for JavaScript/TypeScript
- **Constants**: UPPER_SNAKE_CASE for environment variables
- **Database**: camelCase for fields, collections in lowercase

### Code Organization
- **Single Responsibility**: One purpose per file/function
- **Logical Grouping**: Related functionality grouped together
- **Consistent Structure**: Similar patterns across all modules
- **Clear Dependencies**: Explicit imports and exports

---

**Structure Status**: ✅ **Well-Organized & Scalable**

This comprehensive structure provides a solid foundation for development, maintenance, and scaling of the Gema Event Management Platform.