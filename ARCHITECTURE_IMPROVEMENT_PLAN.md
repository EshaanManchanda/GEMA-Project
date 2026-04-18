# GEMA — Scalable Architecture & File Structure Plan

> Professional-grade restructuring plan for the GEMA MERN platform.
> Covers architecture options, target file structures, and migration strategy.

---

## Current State Assessment

| Metric | Backend | Frontend |
|---|---|---|
| Controllers | 63 files (flat) | — |
| Routes | 68 files (flat) | ~100 routes in single App.tsx |
| Models | 51 files (flat) | 19 Redux slices |
| Services | 40 files (flat) | 37 API modules |
| Middleware | 12 files | 9 Context providers |
| Validators | 26 files | — |
| Workers | 6 files | — |
| Fat Controllers | auth (1852 lines), booking (1139), order (1100), event (1181) | App.tsx (1240 lines) |
| Organization | Type-based (flat) | Hybrid type/feature (27 component subdirs) |

**Core problems:**
1. No domain boundaries — everything flat
2. Fat controllers with business logic inline
3. No repository pattern — direct Mongoose everywhere
4. No dependency injection
5. Inconsistent data fetching (Redux + React Query + direct API calls mixed)
6. 19 Redux slices for what should be server state (React Query)
7. No API versioning
8. Vendor/Teacher duality handled with `as any` casts

---

## Architecture Options

### Option A: Modular Monolith (Recommended — Phase 1)

**Best for:** Current team size, single deployment, fastest path to scalability.

Keep one codebase but organize by **domain modules**. Each domain owns its controllers, services, models, routes, and validators. This is what Stripe, Shopify, and most successful SaaS platforms use before splitting into microservices.

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.validator.ts
│   │   ├── auth.types.ts
│   │   └── index.ts          # Barrel export
│   ├── events/
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   ├── events.routes.ts
│   │   ├── events.validator.ts
│   │   ├── events.repository.ts
│   │   ├── events.types.ts
│   │   ├── events.utils.ts
│   │   └── index.ts
│   ├── orders/
│   ├── bookings/
│   ├── payments/
│   ├── vendors/
│   ├── teachers/
│   ├── tickets/
│   ├── users/
│   ├── reviews/
│   ├── affiliates/
│   ├── commissions/
│   ├── content/               # blogs, SEO, reels, banners, popups
│   ├── notifications/
│   ├── media/
│   ├── registrations/
│   ├── checkin/
│   ├── employees/
│   ├── venues/
│   ├── coupons/
│   ├── categories/
│   ├── collections/
│   ├── settings/
│   └── analytics/
├── shared/
│   ├── config/                # env, database, redis, queue, logger
│   ├── middleware/            # auth, error, validation, security, rateLimiter
│   ├── decorators/            # @Roles(), @CurrentUser(), etc.
│   ├── interceptors/          # Response transformation, logging
│   ├── filters/               # Exception filters
│   ├── pipes/                 # Validation pipes
│   ├── utils/                 # Pure helpers (otp, dateHelpers, phoneUtils)
│   ├── types/                 # Cross-domain types
│   └── errors/                # AppError, error codes
├── workers/                   # BullMQ workers (unchanged)
├── scripts/                   # Migration/seed scripts
└── server.ts                  # Entry point
```

**Pros:**
- Single deploy, single codebase
- Clear domain boundaries
- Easy to extract to microservices later
- No distributed tracing needed
- Shared types and utilities

**Cons:**
- Still one repo, one deploy
- Module boundaries are convention, not enforced

---

### Option B: Domain-Driven Monorepo (Recommended — Phase 2)

**Best for:** Multiple developers, independent feature teams, gradual microservices migration.

Use a monorepo (Turborepo or Nx) with separate packages per domain. Each package is independently testable and deployable.

```
gema/
├── apps/
│   ├── api/                   # Express gateway (thin routing layer)
│   │   ├── src/
│   │   │   ├── routes/        # Route definitions only
│   │   │   ├── middleware/    # Auth, rate limiting, CORS
│   │   │   └── server.ts
│   │   └── package.json
│   ├── web/                   # React frontend (unchanged structure)
│   │   └── package.json
│   └── worker/                # Background job processor
│       ├── src/
│       │   ├── email.worker.ts
│       │   ├── qr.worker.ts
│       │   ├── payout.worker.ts
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── auth/                  # Auth domain
│   │   ├── src/
│   │   │   ├── controller.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   ├── routes.ts
│   │   │   ├── validator.ts
│   │   │   └── types.ts
│   │   └── package.json
│   ├── events/
│   ├── orders/
│   ├── bookings/
│   ├── payments/
│   ├── vendors/
│   ├── teachers/
│   ├── tickets/
│   ├── users/
│   ├── content/
│   ├── notifications/
│   ├── shared/                # Cross-domain utilities
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── utils/
│   │   │   ├── types/
│   │   │   └── errors/
│   │   └── package.json
│   └── database/              # Shared DB connection, base models
│       ├── src/
│       │   ├── connection.ts
│       │   ├── base-model.ts
│       │   └── migrations/
│       └── package.json
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

**Pros:**
- Independent package testing
- Clear dependency graph
- Easy to extract any package to microservice
- Shared tooling (lint, test, build configs)
- Multiple teams can work independently

**Cons:**
- More complex setup
- Requires monorepo tooling knowledge
- Slower initial setup

---

### Option C: Microservices (Future — Only When Needed)

**Best for:** 10+ developers, independent scaling requirements, different tech stacks per domain.

**DO NOT start here.** Only migrate to this when:
- Team > 10 developers
- Specific domains need independent scaling (e.g., events gets 100x more traffic than blogs)
- Different domains need different tech stacks

```
gema/
├── services/
│   ├── api-gateway/           # Kong/Traefik/Nginx gateway
│   ├── auth-service/          # Node.js + Express + Firebase
│   ├── event-service/         # Node.js + Express + MongoDB
│   ├── order-service/         # Node.js + Express + MongoDB
│   ├── payment-service/       # Node.js + Express + Stripe
│   ├── notification-service/  # Node.js + BullMQ + Redis
│   ├── content-service/       # Node.js + Express + MongoDB
│   └── analytics-service/     # Node.js + TimescaleDB/ClickHouse
├── packages/
│   ├── shared-types/          # Cross-service TypeScript types
│   ├── event-bus/             # RabbitMQ/Kafka client wrapper
│   └── api-client/            # Generated API clients (OpenAPI)
├── infra/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
└── apps/
    └── web/                   # React frontend (unchanged)
```

**Communication:**
- Synchronous: REST/gRPC for direct calls
- Asynchronous: RabbitMQ/Kafka for events (OrderCreated → NotificationService)
- API Gateway: Routes requests to correct service

**Pros:**
- Independent scaling
- Independent deployments
- Team autonomy
- Fault isolation

**Cons:**
- Distributed tracing required
- Complex deployment
- Network latency
- Data consistency challenges
- Overkill for current team size

---

## Recommended Path: Modular Monolith → Monorepo → Microservices (if needed)

```
Now (1-2 weeks)     → Option A: Modular Monolith
6-12 months         → Option B: Domain-Driven Monorepo
When team > 10 devs → Option C: Microservices (only if needed)
```

---

## Target File Structure — Modular Monolith (Option A)

### Backend: `backend/src/modules/`

Each module follows the same pattern:

```
modules/<domain>/
├── <domain>.controller.ts     # HTTP handlers (THIN — max 200 lines each)
├── <domain>.service.ts        # Business logic (testable, no Express/Mongoose coupling)
├── <domain>.repository.ts     # Mongoose queries (ONLY place for DB access)
├── <domain>.routes.ts         # Express router definitions
├── <domain>.validator.ts      # express-validator chains
├── <domain>.types.ts          # Domain-specific TypeScript types
├── <domain>.utils.ts          # Domain-specific pure helpers
├── <domain>.events.ts         # Domain events (for cross-module communication)
└── index.ts                   # Barrel export
```

### Module Breakdown — Current Files → Target Locations

#### `auth/` module
| Current | Target |
|---|---|
| `controllers/auth.controller.ts` (1852 lines) | `modules/auth/auth.controller.ts` (split into 3 files) |
| — (no service) | `modules/auth/auth.service.ts` (NEW — extract profile, address, avatar logic) |
| `middleware/auth.ts` | `shared/middleware/auth.ts` |
| `validators/auth.validator.ts` | `modules/auth/auth.validator.ts` |
| `config/jwt.ts` | `modules/auth/jwt.service.ts` |
| `models/User.ts` | `modules/users/user.model.ts` |
| `models/RefreshToken.ts` | `modules/auth/refresh-token.model.ts` |

**Split auth.controller.ts into:**
- `auth.controller.ts` — register, login, logout, refresh, password reset (~400 lines)
- `profile.controller.ts` — profile, avatar, address CRUD, phone verification (~500 lines)
- `firebase-auth.controller.ts` — Firebase auth, phone verification (~300 lines)

#### `events/` module
| Current | Target |
|---|---|
| `controllers/event.controller.ts` (1181 lines) | `modules/events/events.controller.ts` (split query building to service) |
| `controllers/admin.event.controller.ts` | `modules/events/admin-events.controller.ts` |
| `controllers/vendor.event.controller.ts` | `modules/events/vendor-events.controller.ts` |
| `controllers/teacher.event.controller.ts` | `modules/events/teacher-events.controller.ts` |
| `services/event.service.ts` | `modules/events/events.service.ts` |
| — (no repository) | `modules/events/events.repository.ts` (NEW) |
| `validators/event.validator.ts` | `modules/events/events.validator.ts` |
| `utils/event.utils.ts` | `modules/events/events.utils.ts` |
| `utils/eventLifecycle.ts` | `modules/events/events.cron.ts` |
| `models/Event.ts` | `modules/events/event.model.ts` |
| `models/EventAddon.ts` | `modules/events/event-addon.model.ts` |
| `routes/event.routes.ts` | `modules/events/events.routes.ts` |
| `routes/admin.event.routes.ts` | `modules/events/admin-events.routes.ts` |
| `routes/event.affiliate.routes.ts` | `modules/events/event-affiliate.routes.ts` |
| `routes/event.cancellation.routes.ts` | `modules/events/event-cancellation.routes.ts` |

#### `orders/` module
| Current | Target |
|---|---|
| `controllers/order.controller.ts` (1100 lines) | `modules/orders/orders.controller.ts` (move logic to service) |
| — (order logic inline in controller) | `modules/orders/orders.service.ts` (NEW — extract from controller) |
| — (no repository) | `modules/orders/orders.repository.ts` (NEW) |
| `validators/order.validator.ts` | `modules/orders/orders.validator.ts` |
| `models/Order.ts` | `modules/orders/order.model.ts` |
| `routes/order.routes.ts` | `modules/orders/orders.routes.ts` |

#### `bookings/` module
| Current | Target |
|---|---|
| `controllers/booking.controller.ts` (1139 lines) | `modules/bookings/bookings.controller.ts` (move logic to service) |
| — (booking logic inline in controller) | `modules/bookings/bookings.service.ts` (NEW — extract from controller) |
| — (no repository) | `modules/bookings/bookings.repository.ts` (NEW) |
| `models/Booking.ts` | `modules/bookings/booking.model.ts` |
| `routes/booking.routes.ts` | `modules/bookings/bookings.routes.ts` |

#### `payments/` module
| Current | Target |
|---|---|
| `controllers/payment.controller.ts` | `modules/payments/payments.controller.ts` |
| `controllers/vendor.payment.controller.ts` | `modules/payments/vendor-payments.controller.ts` |
| `controllers/teacher.payment.controller.ts` | `modules/payments/teacher-payments.controller.ts` |
| `services/payment.service.ts` | `modules/payments/payments.service.ts` |
| `config/stripe.ts` | `modules/payments/stripe.service.ts` |
| `services/refund.service.ts` | `modules/payments/refund.service.ts` |
| `models/Payment.ts` | `modules/payments/payment.model.ts` |
| `routes/payment.routes.ts` | `modules/payments/payments.routes.ts` |
| `routes/vendor.payment.routes.ts` | `modules/payments/vendor-payment.routes.ts` |
| `routes/teacher.payment.routes.ts` | `modules/payments/teacher-payment.routes.ts` |

#### `tickets/` module
| Current | Target |
|---|---|
| `controllers/ticket.controller.ts` | `modules/tickets/tickets.controller.ts` |
| `services/ticketGeneration.service.ts` | `modules/tickets/ticket-generation.service.ts` |
| `utils/qrcode.ts` | `modules/tickets/qrcode.utils.ts` |
| `utils/ticketExpiration.ts` | `modules/tickets/ticket-expiration.cron.ts` |
| `workers/qr.worker.ts` | `workers/qr.worker.ts` (stays at root) |
| `models/Ticket.ts` | `modules/tickets/ticket.model.ts` |
| `routes/ticket.routes.ts` | `modules/tickets/tickets.routes.ts` |

#### `vendors/` module
| Current | Target |
|---|---|
| `controllers/vendor.controller.ts` (714 lines — gold standard) | `modules/vendors/vendors.controller.ts` |
| `services/vendor.service.ts` | `modules/vendors/vendors.service.ts` |
| `models/Vendor.ts` | `modules/vendors/vendor.model.ts` |
| `models/VendorSubscription.ts` | `modules/vendors/vendor-subscription.model.ts` |
| `routes/vendor.routes.ts` | `modules/vendors/vendors.routes.ts` |
| `routes/vendor.payout.routes.ts` | `modules/vendors/vendor-payout.routes.ts` |
| `utils/vendorHelpers.ts` | `modules/vendors/vendor.utils.ts` |

#### `teachers/` module
| Current | Target |
|---|---|
| `controllers/teacher.controller.ts` | `modules/teachers/teachers.controller.ts` |
| `services/teacher.service.ts` | `modules/teachers/teachers.service.ts` |
| `services/teacher.payment.service.ts` | `modules/teachers/teacher-payment.service.ts` |
| `services/teacher.payout.service.ts` | `modules/teachers/teacher-payout.service.ts` |
| `services/teacher.subscription.service.ts` | `modules/teachers/teacher-subscription.service.ts` |
| `services/teacher.stripe-connect.service.ts` | `modules/teachers/teacher-stripe-connect.service.ts` |
| `models/Teacher.ts` | `modules/teachers/teacher.model.ts` |
| `models/TeacherBooking.ts` | `modules/teachers/teacher-booking.model.ts` |
| `models/TeacherSubscription.ts` | `modules/teachers/teacher-subscription.model.ts` |
| `models/teacher.AdvertisingCampaign.ts` | `modules/teachers/advertising-campaign.model.ts` |
| `routes/teacher.routes.ts` | `modules/teachers/teachers.routes.ts` |
| `routes/teacher.payment.routes.ts` | `modules/teachers/teacher-payment.routes.ts` |
| `routes/teacher.payout.routes.ts` | `modules/teachers/teacher-payout.routes.ts` |
| `utils/teacherHelpers.ts` | `modules/teachers/teacher.utils.ts` |

#### `payouts/` module
| Current | Target |
|---|---|
| `controllers/admin.payout.controller.ts` | `modules/payouts/admin-payouts.controller.ts` |
| `controllers/admin.teacher.payout.controller.ts` | `modules/payouts/admin-teacher-payouts.controller.ts` |
| `services/payout.service.ts` | `modules/payouts/payouts.service.ts` |
| `workers/payout.worker.ts` | `workers/payout.worker.ts` (stays at root) |
| `models/Payout.ts` | `modules/payouts/payout.model.ts` |
| `validators/payout.validator.ts` | `modules/payouts/payouts.validator.ts` |
| `routes/admin.payout.routes.ts` | `modules/payouts/admin-payouts.routes.ts` |
| `routes/admin.teacher.payout.routes.ts` | `modules/payouts/admin-teacher-payouts.routes.ts` |

#### `commissions/` module
| Current | Target |
|---|---|
| `controllers/admin.commission.controller.ts` | `modules/commissions/admin-commissions.controller.ts` |
| `services/commission.service.ts` | `modules/commissions/commissions.service.ts` |
| `models/CommissionConfig.ts` | `modules/commissions/commission-config.model.ts` |
| `models/CommissionTransaction.ts` | `modules/commissions/commission-transaction.model.ts` |
| `models/RevenueTransaction.ts` | `modules/commissions/revenue-transaction.model.ts` |
| `models/AdminRevenueSettings.ts` | `modules/commissions/revenue-settings.model.ts` |
| `validators/commissionConfig.validator.ts` | `modules/commissions/commissions.validator.ts` |
| `routes/admin.commission.routes.ts` | `modules/commissions/admin-commissions.routes.ts` |
| `routes/admin.revenue.routes.ts` | `modules/commissions/admin-revenue.routes.ts` |
| `routes/admin.teacher.revenue.routes.ts` | `modules/commissions/admin-teacher-revenue.routes.ts` |

#### `users/` module
| Current | Target |
|---|---|
| `controllers/admin.user.controller.ts` | `modules/users/admin-users.controller.ts` |
| `models/User.ts` | `modules/users/user.model.ts` |
| `models/Employee.ts` | `modules/users/employee.model.ts` |
| `routes/admin.user.routes.ts` | `modules/users/admin-users.routes.ts` |

#### `content/` module (blogs, SEO, reels, banners, popups, announcements)
| Current | Target |
|---|---|
| `controllers/blog.controller.ts` | `modules/content/blog.controller.ts` |
| `controllers/blog.comments.controller.ts` | `modules/content/blog-comments.controller.ts` |
| `controllers/seoContent.controller.ts` | `modules/content/seo-content.controller.ts` |
| `controllers/reel.controller.ts` | `modules/content/reels.controller.ts` |
| `controllers/admin.reel.controller.ts` | `modules/content/admin-reels.controller.ts` |
| `controllers/banner.controller.ts` | `modules/content/banners.controller.ts` |
| `controllers/popup.controller.ts` | `modules/content/popups.controller.ts` |
| `controllers/announcementBar.controller.ts` | `modules/content/announcements.controller.ts` |
| `controllers/newsletter.controller.ts` | `modules/content/newsletter.controller.ts` |
| `services/blog.service.ts` | `modules/content/blog.service.ts` |
| `services/seo.service.ts` | `modules/content/seo.service.ts` |
| `services/seoContent.service.ts` | `modules/content/seo-content.service.ts` |
| `services/reel.service.ts` | `modules/content/reels.service.ts` |
| `services/banner.service.ts` | `modules/content/banners.service.ts` |
| `services/popup.service.ts` | `modules/content/popups.service.ts` |
| `services/announcementBar.service.ts` | `modules/content/announcements.service.ts` |
| `services/newsletter.service.ts` | `modules/content/newsletter.service.ts` |
| `models/Blog.ts` | `modules/content/blog.model.ts` |
| `models/BlogCategory.ts` | `modules/content/blog-category.model.ts` |
| `models/Comment.ts` | `modules/content/comment.model.ts` |
| `models/SEOContent.ts` | `modules/content/seo-content.model.ts` |
| `models/Reel.ts` | `modules/content/reel.model.ts` |
| `models/Banner.ts` | `modules/content/banner.model.ts` |
| `models/PopupNotification.ts` | `modules/content/popup-notification.model.ts` |
| `models/AnnouncementBar.ts` | `modules/content/announcement-bar.model.ts` |
| `models/NewsletterSubscriber.ts` | `modules/content/newsletter-subscriber.model.ts` |
| `routes/blog.routes.ts` | `modules/content/blog.routes.ts` |
| `routes/blog.comments.routes.ts` | `modules/content/blog-comments.routes.ts` |
| `routes/seoContent.routes.ts` | `modules/content/seo-content.routes.ts` |
| `routes/reel.routes.ts` | `modules/content/reels.routes.ts` |
| `routes/admin.reel.routes.ts` | `modules/content/admin-reels.routes.ts` |
| `routes/banner.routes.ts` | `modules/content/banners.routes.ts` |
| `routes/popup.routes.ts` | `modules/content/popups.routes.ts` |
| `routes/announcementBar.routes.ts` | `modules/content/announcements.routes.ts` |
| `routes/newsletter.routes.ts` | `modules/content/newsletter.routes.ts` |
| `validators/blog.validator.ts` (if exists) | `modules/content/content.validator.ts` |

#### `notifications/` module
| Current | Target |
|---|---|
| `controllers/notification.controller.ts` | `modules/notifications/notifications.controller.ts` |
| `services/email.service.ts` | `modules/notifications/email.service.ts` |
| `services/sms.service.ts` | `modules/notifications/sms.service.ts` |
| `workers/email.worker.ts` | `workers/email.worker.ts` (stays at root) |
| `models/Notification.ts` | `modules/notifications/notification.model.ts` |
| `models/UserPushSubscription.ts` | `modules/notifications/push-subscription.model.ts` |
| `routes/notification.routes.ts` | `modules/notifications/notifications.routes.ts` |

#### `media/` module
| Current | Target |
|---|---|
| `controllers/media.controller.ts` | `modules/media/media.controller.ts` |
| `services/media.service.ts` | `modules/media/media.service.ts` |
| `services/upload.service.ts` | `modules/media/upload.service.ts` |
| `services/storage/` | `modules/media/storage/` |
| `middleware/upload.ts` | `modules/media/upload.middleware.ts` |
| `utils/uploadHelpers.ts` | `modules/media/upload.utils.ts` |
| `models/MediaAsset.ts` | `modules/media/media-asset.model.ts` |
| `routes/media.routes.ts` | `modules/media/media.routes.ts` |
| `routes/upload.routes.ts` | `modules/media/upload.routes.ts` |

#### `registrations/` module
| Current | Target |
|---|---|
| `controllers/registration.controller.ts` | `modules/registrations/registrations.controller.ts` |
| `validators/registration.validator.ts` | `modules/registrations/registrations.validator.ts` |
| `models/Registration.ts` | `modules/registrations/registration.model.ts` |
| `routes/registration.routes.ts` | `modules/registrations/registrations.routes.ts` |

#### `checkin/` module
| Current | Target |
|---|---|
| `controllers/checkin.controller.ts` | `modules/checkin/checkin.controller.ts` |
| `models/CheckinLog.ts` | `modules/checkin/checkin-log.model.ts` |
| `models/CancellationLog.ts` | `modules/checkin/cancellation-log.model.ts` |
| `routes/checkin.routes.ts` | `modules/checkin/checkin.routes.ts` |
| `routes/event.cancellation.routes.ts` | `modules/checkin/event-cancellation.routes.ts` |

#### `affiliates/` module
| Current | Target |
|---|---|
| `controllers/affiliate.controller.ts` | `modules/affiliates/affiliates.controller.ts` |
| `controllers/event.affiliate.controller.ts` | `modules/affiliates/event-affiliates.controller.ts` |
| `controllers/venue.affiliate.controller.ts` | `modules/affiliates/venue-affiliates.controller.ts` |
| `models/Affiliate.ts` | `modules/affiliates/affiliate.model.ts` |
| `models/AffiliateEventClick.ts` | `modules/affiliates/event-click.model.ts` |
| `models/AffiliateVenueClick.ts` | `modules/affiliates/venue-click.model.ts` |
| `validators/affiliate.validator.ts` | `modules/affiliates/affiliates.validator.ts` |
| `routes/affiliate.routes.ts` | `modules/affiliates/affiliates.routes.ts` |
| `routes/event.affiliate.routes.ts` | `modules/affiliates/event-affiliate.routes.ts` |
| `routes/venue.affiliate.routes.ts` | `modules/affiliates/venue-affiliate.routes.ts` |

#### `reviews/` module
| Current | Target |
|---|---|
| `controllers/review.controller.ts` | `modules/reviews/reviews.controller.ts` |
| `validators/review.validator.ts` | `modules/reviews/reviews.validator.ts` |
| `models/Review.ts` | `modules/reviews/review.model.ts` |
| `routes/review.routes.ts` | `modules/reviews/reviews.routes.ts` |

#### `venues/` module
| Current | Target |
|---|---|
| `controllers/venue.controller.ts` | `modules/venues/venues.controller.ts` |
| `controllers/admin.venue.controller.ts` | `modules/venues/admin-venues.controller.ts` |
| `services/venue.service.ts` | `modules/venues/venues.service.ts` |
| `models/Venue.ts` (if exists — check) | `modules/venues/venue.model.ts` |
| `validators/venue.validator.ts` | `modules/venues/venues.validator.ts` |
| `routes/venue.routes.ts` | `modules/venues/venues.routes.ts` |
| `routes/admin.venue.routes.ts` | `modules/venues/admin-venues.routes.ts` |

#### `employees/` module
| Current | Target |
|---|---|
| `controllers/employee.controller.ts` | `modules/employees/employees.controller.ts` |
| `controllers/admin.employee.controller.ts` | `modules/employees/admin-employees.controller.ts` |
| `validators/employee.validator.ts` | `modules/employees/employees.validator.ts` |
| `routes/employee.routes.ts` | `modules/employees/employees.routes.ts` |
| `routes/admin.employee.routes.ts` | `modules/employees/admin-employees.routes.ts` |

#### `coupons/` module
| Current | Target |
|---|---|
| `controllers/coupon.controller.ts` | `modules/coupons/coupons.controller.ts` |
| `services/coupon.service.ts` | `modules/coupons/coupons.service.ts` |
| `validators/coupon.validator.ts` | `modules/coupons/coupons.validator.ts` |
| `models/Coupon.ts` | `modules/coupons/coupon.model.ts` |
| `routes/coupon.routes.ts` | `modules/coupons/coupons.routes.ts` |

#### `categories/` module
| Current | Target |
|---|---|
| `controllers/category.controller.ts` | `modules/categories/categories.controller.ts` |
| `models/Category.ts` | `modules/categories/category.model.ts` |
| `routes/category.routes.ts` | `modules/categories/categories.routes.ts` |

#### `collections/` module
| Current | Target |
|---|---|
| `controllers/collection.controller.ts` | `modules/collections/collections.controller.ts` |
| `services/collection-sync.service.ts` | `modules/collections/collection-sync.service.ts` |
| `workers/collection-sync.worker.ts` | `workers/collection-sync.worker.ts` (stays at root) |
| `models/Collection.ts` | `modules/collections/collection.model.ts` |
| `routes/collection.routes.ts` | `modules/collections/collections.routes.ts` |
| `routes/admin.collection.routes.ts` | `modules/collections/admin-collections.routes.ts` |

#### `settings/` module
| Current | Target |
|---|---|
| `controllers/admin.settings.controller.ts` | `modules/settings/admin-settings.controller.ts` |
| `controllers/admin.app-settings.controller.ts` | `modules/settings/admin-app-settings.controller.ts` |
| `controllers/public.settings.controller.ts` | `modules/settings/public-settings.controller.ts` |
| `models/PaymentSettings.ts` | `modules/settings/payment-settings.model.ts` |
| `models/SocialSettings.ts` | `modules/settings/social-settings.model.ts` |
| `models/EmailSettings.ts` | `modules/settings/email-settings.model.ts` |
| `models/SystemSettings.ts` | `modules/settings/system-settings.model.ts` |
| `routes/admin.settings.routes.ts` | `modules/settings/admin-settings.routes.ts` |
| `routes/admin.app-settings.routes.ts` | `modules/settings/admin-app-settings.routes.ts` |
| `routes/public.settings.routes.ts` | `modules/settings/public-settings.routes.ts` |

#### `analytics/` module
| Current | Target |
|---|---|
| `controllers/admin.dashboard.controller.ts` | `modules/analytics/admin-dashboard.controller.ts` |
| `controllers/admin.stats.controller.ts` | `modules/analytics/admin-stats.controller.ts` |
| `controllers/stats.controller.ts` | `modules/analytics/stats.controller.ts` |
| `controllers/homepage.controller.ts` | `modules/analytics/homepage.controller.ts` |
| `services/analytics.service.ts` | `modules/analytics/analytics.service.ts` |
| `services/dashboard-optimized.service.ts` | `modules/analytics/dashboard-optimized.service.ts` |
| `services/stats.service.ts` | `modules/analytics/stats.service.ts` |
| `services/homepage.service.ts` | `modules/analytics/homepage.service.ts` |
| `routes/admin.dashboard.routes.ts` | `modules/analytics/admin-dashboard.routes.ts` |
| `routes/admin.stats.routes.ts` | `modules/analytics/admin-stats.routes.ts` |
| `routes/stats.routes.ts` | `modules/analytics/stats.routes.ts` |
| `routes/homepage.routes.ts` | `modules/analytics/homepage.routes.ts` |
| `routes/analytics.routes.ts` | `modules/analytics/analytics.routes.ts` |

#### `admin/` module (cross-cutting admin operations)
| Current | Target |
|---|---|
| `controllers/admin.vendor.controller.ts` | `modules/admin/admin-vendors.controller.ts` |
| `controllers/admin.teacher.controller.ts` | `modules/admin/admin-teachers.controller.ts` |
| `controllers/admin.moderation.controller.ts` | `modules/admin/admin-moderation.controller.ts` |
| `controllers/admin.bulk-import.controller.ts` | `modules/admin/admin-bulk-import.controller.ts` |
| `validators/bulk-import/` | `modules/admin/bulk-import/` |
| `services/bulk-data.service.ts` | `modules/admin/bulk-data.service.ts` |
| `routes/admin.vendor.routes.ts` | `modules/admin/admin-vendors.routes.ts` |
| `routes/admin.teacher.routes.ts` | `modules/admin/admin-teachers.routes.ts` |
| `routes/admin.moderation.routes.ts` | `modules/admin/admin-moderation.routes.ts` |
| `routes/admin.bulk-import.routes.ts` | `modules/admin/admin-bulk-import.routes.ts` |

### Shared: `backend/src/shared/`

```
shared/
├── config/
│   ├── env.ts                 # Environment config
│   ├── database.ts            # MongoDB connection
│   ├── redis.ts               # Redis client
│   ├── redis-pool.ts          # Redis pool
│   ├── queue.ts               # BullMQ queue definitions
│   ├── cache-tiers.ts         # Cache tier TTL constants
│   ├── firebase.ts            # Firebase Admin SDK
│   ├── firebase.config.ts     # Firebase service account
│   ├── logger.ts              # Winston logger
│   ├── promotionPricing.ts    # Pricing config
│   ├── cloudinary.ts          # Cloudinary config
│   └── index.ts               # Barrel export
├── middleware/
│   ├── auth.ts                # JWT + Firebase auth
│   ├── error.ts               # Global error handler
│   ├── validation.ts          # express-validator wrapper
│   ├── security.ts            # Helmet, CORS, sanitization
│   ├── rateLimiter.ts         # Rate limiting
│   ├── timeout.ts             # Request timeout
│   ├── query-timeout.ts       # MongoDB query timeout
│   ├── mongoose-slow-query.ts # Slow query logging
│   ├── performance.ts         # Performance monitoring
│   ├── upload.ts              # Multer upload (if not in media module)
│   ├── requirePhoneVerification.ts
│   └── index.ts
├── errors/
│   ├── AppError.ts            # Custom error class
│   ├── error-codes.ts         # Error code constants
│   └── index.ts
├── types/
│   ├── api.ts                 # ApiResponse, ErrorResponse, PaginationResponse
│   ├── auth.ts                # Auth request/response types
│   ├── express.d.ts           # Express augmentation
│   └── index.ts
├── utils/
│   ├── catchAsync.ts          # Async error wrapper
│   ├── otp.ts                 # OTP generation
│   ├── mailer.ts              # Email utility
│   ├── email-rate-limiter.ts  # Email rate limiting
│   ├── phoneUtils.ts          # Phone utilities
│   ├── phoneValidation.ts     # Phone validation
│   ├── dateHelpers.ts         # Date formatting
│   ├── cities.ts              # Static city data
│   ├── brandConfig.ts         # Brand configuration
│   ├── export-stream.ts       # Data export streaming
│   ├── relationship-resolver.ts
│   ├── json-worker.util.ts    # JSON parsing worker pool
│   └── index.ts
├── decorators/                # (NEW — for future NestJS migration)
│   ├── roles.decorator.ts
│   ├── current-user.decorator.ts
│   └── index.ts
└── scripts/                   # Migration/seed scripts (48 files)
    ├── seeds/
    │   ├── seed.ts
    │   ├── seedBlogs.ts
    │   ├── seedCategories.ts
    │   ├── seedCoupons.ts
    │   ├── seedCommissions.ts
    │   ├── seedAffiliateVendor.ts
    │   └── seedSEOContent.ts
    ├── migrations/
    │   ├── migrate-cloudinary-assets.ts
    │   ├── migrate-event-images.ts
    │   ├── migratePhoneNumbers.ts
    │   ├── migrateVendorsToNewModel.ts
    │   └── ...
    └── utilities/
        ├── generate-event-slugs.ts
        ├── archiveExpiredEventsDirectly.ts
        ├── cleanup-orphaned-media.ts
        └── ...
```

### Entry Point: `backend/src/server.ts`

```typescript
// Thin entry point — just wires up modules
import express from 'express';
import { sharedConfig } from './shared/config';
import { registerMiddleware } from './shared/middleware';
import { registerModules } from './modules';  // Auto-registers all module routes
import { startWorkers } from './workers';
import { gracefulShutdown } from './shared/utils/shutdown';

const app = express();

registerMiddleware(app);
registerModules(app);  // Each module registers its own routes

const server = app.listen(sharedConfig.port, () => {
  sharedConfig.logger.info(`Server running on port ${sharedConfig.port}`);
});

startWorkers();
gracefulShutdown(server);
```

### Module Registration: `backend/src/modules/index.ts`

```typescript
import { Application } from 'express';
import { authRouter } from './auth';
import { eventsRouter } from './events';
import { ordersRouter } from './orders';
// ... all module routers

export function registerModules(app: Application) {
  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/orders', ordersRouter);
  // ...
}
```

---

## Frontend: Target Structure

### Current Problems
1. `App.tsx` is 1240+ lines — all routes in one file
2. `components/` has 27 subdirectories with mixed taxonomy
3. 19 Redux slices — most should be React Query server state
4. Inconsistent data fetching (Redux + React Query + direct API calls)
5. i18n translations inline in config

### Target Structure

```
frontend/src/
├── app/
│   ├── App.tsx              # Thin — just Provider tree + Router
│   ├── routes/              # Split routes by namespace
│   │   ├── public.routes.tsx
│   │   ├── customer.routes.tsx
│   │   ├── vendor.routes.tsx
│   │   ├── teacher.routes.tsx
│   │   ├── employee.routes.tsx
│   │   ├── admin.routes.tsx
│   │   ├── route-guards.tsx
│   │   └── index.tsx        # Combines all route configs
│   ├── providers/           # Provider tree extracted from main.tsx
│   │   ├── AppProviders.tsx
│   │   ├── QueryProvider.tsx
│   │   ├── StoreProvider.tsx
│   │   └── ThemeProvider.tsx
│   └── config/
│       ├── api.ts
│       ├── app.ts
│       ├── env.ts
│       └── firebase.ts
│
├── features/                # Feature-based organization (NEW)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── index.ts
│   ├── events/
│   ├── bookings/
│   ├── orders/
│   ├── payments/
│   ├── vendors/
│   ├── teachers/
│   ├── tickets/
│   ├── reviews/
│   ├── affiliates/
│   ├── registrations/
│   └── analytics/
│
├── shared/                  # Shared across features
│   ├── components/
│   │   ├── ui/              # Primitive UI components (Button, Input, Card, Modal)
│   │   ├── layout/          # Layout shells (MainLayout, AdminLayout, VendorLayout)
│   │   ├── forms/           # Form inputs and wrappers
│   │   ├── common/          # Generic components (LoadingSpinner, ErrorBoundary, SEO)
│   │   └── charts/          # Chart wrappers
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useApiRetry.ts
│   │   ├── useScrollAnimation.ts
│   │   └── useSEO.ts
│   ├── services/
│   │   ├── api.ts           # Axios instance + interceptors
│   │   └── pwaService.ts
│   ├── utils/
│   ├── types/
│   ├── contexts/            # React Context providers
│   └── i18n/
│       ├── locales/
│       │   ├── en/
│       │   │   ├── common.json
│       │   │   ├── auth.json
│       │   │   ├── events.json
│       │   │   └── bookings.json
│       │   └── ar/
│       │       ├── common.json
│       │       └── ...
│       └── config.ts
│
├── pages/                   # Route-level page components (thin — compose features)
│   ├── public/
│   │   ├── HomePage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── EventDetailPage.tsx
│   │   └── ...
│   ├── auth/
│   ├── customer/
│   ├── vendor/
│   ├── teacher/
│   ├── employee/
│   ├── admin/
│   └── error/
│
├── store/                   # Redux — ONLY for client state
│   ├── index.ts
│   ├── hooks.ts
│   └── slices/
│       ├── uiSlice.ts       # UI state (modals, sidebar, theme)
│       ├── favoritesSlice.ts # User preferences
│       └── settingsSlice.ts  # Client settings
│       # REMOVE: eventsSlice, categoriesSlice, bookingsSlice, vendorSlice,
│       #         adminSlice, couponsSlice, affiliatesSlice, paymentsSlice,
│       #         ticketsSlice, blogSlice, registrationsSlice, mediaSlice
│       # (replace with React Query)
│
└── tests/
    ├── unit/
    ├── integration/
    ├── mobile/
    ├── performance/
    └── security/
```

### Key Frontend Changes

#### 1. Split App.tsx into route config files

```typescript
// app/routes/admin.routes.tsx
const AdminDashboardPage = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ '../../pages/admin/DashboardPage'));
const AdminEventsPage = lazy(() => import(/* webpackChunkName: "admin-events" */ '../../pages/admin/EventsPage'));
// ...

export const adminRoutes = {
  path: '/admin',
  element: <AdminRoute><AdminLayout /></AdminRoute>,
  children: [
    { index: true, element: <AdminDashboardPage /> },
    { path: 'events', element: <AdminEventsPage /> },
    // ...
  ]
};
```

```typescript
// app/App.tsx (reduced from 1240 lines to ~80 lines)
import { Routes, Route } from 'react-router-dom';
import { publicRoutes, customerRoutes, vendorRoutes, teacherRoutes, employeeRoutes, adminRoutes } from './routes';

export default function App() {
  return (
    <Routes>
      {publicRoutes}
      {customerRoutes}
      {vendorRoutes}
      {teacherRoutes}
      {employeeRoutes}
      {adminRoutes}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

#### 2. Migrate Redux server state to React Query

**Keep in Redux (client state only):**
- `uiSlice` — modals, sidebar, theme
- `favoritesSlice` — user wishlist
- `settingsSlice` — client preferences

**Migrate to React Query (server state):**
- `eventsSlice` → `useEvents()` hook (already has React Query hooks in `hooks/queries/`)
- `categoriesSlice` → `useCategories()` hook
- `bookingsSlice` → `useBookings()` hook
- `vendorSlice` → `useVendor()` hook
- `adminSlice` → `useAdminData()` hook
- `couponsSlice` → `useCoupons()` hook
- `affiliatesSlice` → `useAffiliates()` hook
- `paymentsSlice` → `usePayments()` hook
- `ticketsSlice` → `useTickets()` hook
- `blogSlice` → `useBlogs()` hook
- `registrationsSlice` → `useRegistrations()` hook
- `mediaSlice` → `useMedia()` hook

#### 3. Externalize i18n translations

```
shared/i18n/locales/en/
├── common.json       # Shared translations
├── auth.json         # Login, register, password reset
├── events.json       # Event-related translations
├── bookings.json     # Booking flow translations
├── vendor.json       # Vendor dashboard translations
├── teacher.json      # Teacher dashboard translations
├── admin.json        # Admin panel translations
└── errors.json       # Error message translations
```

---

## Repository Pattern (NEW — Backend)

Add a repository layer between services and Mongoose models:

```typescript
// modules/events/events.repository.ts
import { Event, EventDocument } from './event.model';
import { EventFilter, EventSort } from './events.types';

export class EventRepository {
  async findAll(filter: EventFilter, sort: EventSort, page: number, limit: number) {
    const query = Event.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
    const [events, total] = await Promise.all([query, Event.countDocuments(filter)]);
    return { events, total, page, limit };
  }

  async findById(id: string) {
    return Event.findById(id).populate('vendorId teacherId');
  }

  async create(data: Partial<EventDocument>) {
    return Event.create(data);
  }

  async update(id: string, data: Partial<EventDocument>) {
    return Event.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDelete(id: string) {
    return Event.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
  }
}
```

```typescript
// modules/events/events.service.ts
import { EventRepository } from './events.repository';
import { CacheService } from '../../shared/config';

export class EventService {
  constructor(
    private repository: EventRepository,
    private cache: CacheService
  ) {}

  async getPublicEvents(filter: EventFilter, page: number, limit: number) {
    const cacheKey = `events:public:${JSON.stringify(filter)}:${page}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAll(
      { ...filter, status: 'published' },
      { startDate: 1 },
      page,
      limit
    );

    await this.cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }
}
```

**Benefits:**
- Services don't know about Mongoose — only repositories do
- Easy to swap MongoDB for another DB (change repository, not service)
- Repositories are easily mockable for unit tests
- Query logic is centralized — no scattered `Event.find()` calls

---

## Dependency Injection (NEW — Backend)

Replace singleton imports with constructor injection:

```typescript
// shared/container.ts (simple DI container)
import { EventRepository } from '../modules/events/events.repository';
import { EventService } from '../modules/events/events.service';
import { CacheService } from './config/cache.service';
import { EmailService } from '../modules/notifications/email.service';

const container = {
  cacheService: new CacheService(),
  emailService: new EmailService(),
  eventRepository: new EventRepository(),
  eventService: new EventService(container.cacheService, container.eventRepository),
  // ...
};

export default container;
```

```typescript
// modules/events/events.controller.ts
import container from '../../shared/container';

// Use container.eventService instead of importing singleton
export const getEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await container.eventService.getPublicEvents(req.query, page, limit);
  res.json(result);
});
```

**For larger scale:** Use `tsyringe` or `inversify` for proper DI with decorators.

---

## API Versioning

Add version prefix to all routes:

```typescript
// modules/events/events.routes.ts
const router = Router();
router.get('/v1/events', getPublicEvents);
router.get('/v1/events/:id', getEvent);
router.post('/v1/events', authenticate, authorize('vendor'), createEvent);
```

Or at the gateway level:

```typescript
// server.ts
app.use('/api/v1', registerModules());
```

---

## Vendor/Teacher Unification

Create a unified `Account` model with role-based behavior:

```typescript
// shared/types/accounts.ts
type AccountRole = 'vendor' | 'teacher';

interface IAccount {
  _id: string;
  userId: string;
  role: AccountRole;
  displayName: string;
  email: string;
  paymentSettings: IPaymentSettings;
  subscription: ISubscription;
  // ... shared fields
}

// modules/vendors/vendor.model.ts
const VendorSchema = new Schema<IVendor>({
  ...AccountBaseSchema,  // Extend base
  businessName: String,
  businessType: String,
  // ... vendor-specific fields
});

// modules/teachers/teacher.model.ts
const TeacherSchema = new Schema<ITeacher>({
  ...AccountBaseSchema,  // Extend base
  qualifications: [String],
  availability: Schema.Types.Mixed,
  // ... teacher-specific fields
});
```

Services accept `IAccount` interface instead of `Vendor | Teacher`:

```typescript
// Before
async getDashboard(vendorOrTeacherId: string, vendorOrTeacher: any) { ... }

// After
async getDashboard(account: IAccount) { ... }
```

---

## Migration Strategy

### Phase 1: Preparation (1-2 days)
1. Clean root-level artifacts (move PDFs, JSON dumps, plan files to `doc/`)
2. Create `backend/src/modules/` and `backend/src/shared/` directories
3. Create `shared/` subdirectories: `config/`, `middleware/`, `errors/`, `types/`, `utils/`
4. Move shared files to `shared/` (no code changes, just moves)

### Phase 2: Extract First Module (2-3 days)
Start with the **cleanest module** — `reviews/` or `categories/` (small, simple):

1. Create `modules/reviews/` directory
2. Move `controllers/review.controller.ts` → `modules/reviews/review.controller.ts`
3. Move `models/Review.ts` → `modules/reviews/review.model.ts`
4. Move `routes/review.routes.ts` → `modules/reviews/review.routes.ts`
5. Move `validators/review.validator.ts` → `modules/reviews/review.validator.ts`
6. Update all import paths
7. Run tests — verify nothing breaks
8. Commit

### Phase 3: Extract Core Modules (1-2 weeks)
Extract in order of dependency (least dependent first):

1. `categories/` — no dependencies on other modules
2. `reviews/` — depends on events only
3. `coupons/` — standalone
4. `content/` — blogs, SEO, reels, banners, popups
5. `media/` — standalone
6. `settings/` — standalone
7. `users/` — core dependency
8. `auth/` — depends on users
9. `events/` — depends on users, categories, media
10. `vendors/` — depends on users, events
11. `teachers/` — depends on users, events
12. `orders/` — depends on events, users
13. `bookings/` — depends on events, orders
14. `payments/` — depends on orders, vendors, teachers
15. `tickets/` — depends on orders, bookings
16. `payouts/` — depends on payments, vendors, teachers
17. `commissions/` — depends on payouts, orders
18. `affiliates/` — depends on events, vendors
19. `registrations/` — depends on events
20. `checkin/` — depends on events, registrations
21. `employees/` — depends on vendors, events
22. `venues/` — depends on events
23. `collections/` — depends on events
24. `notifications/` — cross-cutting
25. `analytics/` — depends on everything

### Phase 4: Add Repository Layer (3-5 days)
For each module, add a repository layer:

1. Create `<domain>.repository.ts`
2. Move all Mongoose queries from service to repository
3. Update service to use repository instead of direct Mongoose
4. Run tests

### Phase 5: Add Dependency Injection (2-3 days)
1. Create simple DI container
2. Update all controllers to use container instead of singleton imports
3. Update all services to receive dependencies via constructor

### Phase 6: Frontend Restructure (1-2 weeks)
1. Split `App.tsx` into route config files
2. Create `features/` directory structure
3. Move feature-scoped components into `features/<domain>/components/`
4. Migrate Redux server state to React Query
5. Externalize i18n translations
6. Clean up dead code (disabled notification system)

### Phase 7: API Versioning (1-2 days)
1. Add `/api/v1/` prefix to all routes
2. Update frontend API base URL
3. Update WP plugin API calls

---

## Execution Rules

1. **One module per PR** — extract one module, test, merge, repeat
2. **No breaking changes** — all routes must work exactly the same after move
3. **Tests first** — write integration tests for each module before extracting
4. **Git branch per module** — `refactor/module-reviews`, `refactor/module-events`, etc.
5. **Verify after each move** — `npm run build`, `npm test`, manual smoke test
6. **Update CLAUDE.md** after each module move

---

## Estimated Timeline

| Phase | Duration | Risk |
|---|---|---|
| Phase 1: Preparation | 1-2 days | Low |
| Phase 2: First module | 2-3 days | Low |
| Phase 3: Core modules | 1-2 weeks | Medium |
| Phase 4: Repository layer | 3-5 days | Medium |
| Phase 5: Dependency injection | 2-3 days | Low |
| Phase 6: Frontend restructure | 1-2 weeks | Medium |
| Phase 7: API versioning | 1-2 days | Low |
| **Total** | **4-6 weeks** | |

---

## Quick Wins (Do These First — 1-2 days)

Before the big restructure, fix these immediately:

1. **Clean root artifacts** — move PDFs, zips, JSON dumps to `doc/` or delete
2. **Split `auth.controller.ts`** — extract profile, address, avatar into `auth.service.ts`
3. **Extract order logic** — move order creation from `order.controller.ts` to `order.service.ts`
4. **Extract booking logic** — move booking flow from `booking.controller.ts` to `booking.service.ts`
5. **Move Stripe logic** — `event.controller.ts` promote endpoint should use `PaymentService`
6. **Delete dead code** — commented-out notification imports, `booking.controller.ts.bak`
7. **Move 48 scripts** — from `src/scripts/` to `scripts/seeds/`, `scripts/migrations/`, `scripts/utilities/`
8. **Add `.gitignore` entries** — `*.csv`, `*.zip`, `*.pdf`, `*.log`, `kidrove.com-*.zip`

---

*Created: 2026-04-04*
