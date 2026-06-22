# GEMA Platform — Subscription Model

## Overview

GEMA has **4 subscriber personas**, each with distinct needs and value drivers.
This document maps existing platform features to tiers and defines pricing in **AED**.

> **Accuracy note:** Only the **Vendor flat-fee subscription** is live in production.
> All other personas and tier tables are **design targets**, not implemented features.
> See the Implementation Status section before building anything related to billing.

---

## Platform Features Inventory

### Event & Venue Management
- Create / edit / cancel events
- Venue management & capacity
- Event collections & categories
- Event galleries
- Coupon & discount codes
- Affiliate tracking per event
- QR-code ticket generation
- Event check-in (scanner app)
- Event cancellation & refund flows
- Registration management

### Booking & Payments
- Online booking with seat reservation
- Stripe checkout (platform Stripe)
- Stripe Connect (vendor's own Stripe)
- Order management
- Refunds & cancellations
- Payout processing
- Multi-currency support
- Idempotency-safe payments

### Teacher / LMS
- Course creation (lessons, quizzes, assignments)
- Student enrollment
- Video uploads (Cloudinary)
- Online examination system with proctoring / anti-cheat
- Certificate generation & verification
- Student progress tracking
- Parent-linked student portal
- Bulk student import
- Teacher payout management

### School / Organisation
- School profile & multi-campus
- Academic calendar
- HR & employee management (ERP)
- Finance & inventory (ERP)
- Scheduling
- Notice board & announcements
- Grievance / complaints system
- Feedback & survey module
- Internal messaging

### Content & Marketing
- Blog / SEO articles
- Reels / short-form video feed
- Banners & popup campaigns
- Announcement bar
- Newsletter
- Review & rating system
- Favourites / wishlist
- Search
- Open Graph / SEO meta

### Analytics & Reporting
- Admin revenue dashboard
- Vendor revenue stats
- Teacher revenue stats
- Traffic analytics
- Booking & ticket stats
- Commission reports

### Admin & Platform Ops
- RBAC with 50+ permissions
- Moderation (events, reviews, blogs)
- Bulk import (events, students)
- Audit log & compliance
- API key & webhook integrations
- Notification system (email, SMS, push)
- Chatbot proxy

---

## Subscriber Personas & Tiers

---

### 1. Vendors (Event Organizers)

**Value:** List events, sell tickets, manage check-in, get payouts.

| | **Starter** | **Growth** | **Pro** | **Enterprise** |
|---|---|---|---|---|
| **Price / month** | Free | 99 AED | 299 AED | Custom |
| **Platform commission** | 8% | 5% | 2% | Negotiated |
| **Own Stripe Connect** | ✗ | ✗ | ✓ | ✓ |
| **Active events** | 2 | 10 | Unlimited | Unlimited |
| **Ticket types per event** | 1 | 3 | Unlimited | Unlimited |
| **Coupons / discounts** | ✗ | ✓ | ✓ | ✓ |
| **Affiliate tracking** | ✗ | ✓ | ✓ | ✓ |
| **Check-in scanner** | ✓ | ✓ | ✓ | ✓ |
| **Event analytics** | Basic | Standard | Advanced | Advanced + export |
| **Employee seats** | 1 | 3 | 10 | Unlimited |
| **Payout frequency** | Weekly | Weekly | Daily | Daily + instant |
| **Featured listing** | ✗ | ✗ | ✓ | Priority |
| **Reels / video content** | ✗ | 5/month | Unlimited | Unlimited |
| **API access** | ✗ | ✗ | ✓ | ✓ |
| **Dedicated account manager** | ✗ | ✗ | ✗ | ✓ |
| **SLA support** | Community | Email | Priority email | Dedicated |

> ⚠️ **Live system is a single flat plan (150 AED/month), not the 4-tier table above.**
> The tier table is the design target. Commission-avoidance is the only live gate:
> vendors on `PLATFORM_STRIPE` pay a commission; vendors on `CUSTOM_STRIPE` pay 150 AED/mo flat.
> The `requireSubscription()` enforcement middleware does not yet exist.

---

### 2. Teachers (Online / Offline Educators)

**Value:** Sell classes, manage students, upload content, earn payouts.

| | **Basic** | **Standard** | **Premium** | **Enterprise** |
|---|---|---|---|---|
| **Price / month** | 49 AED | 149 AED | 399 AED | 999 AED |
| **Quarterly price** | 132 AED | 402 AED | 1,077 AED | 2,698 AED |
| **Annual price** | 470 AED | 1,432 AED | 3,832 AED | 9,592 AED |
| **Platform service fee** | 8% | 6% | 4% | 2% |
| **Max classes** | 5 | 25 | 100 | Unlimited |
| **Max students** | 50 | 300 | 2,000 | Unlimited |
| **Video uploads** | ✗ | 10 | 50 | Unlimited |
| **Storage** | 1 GB | 5 GB | 20 GB | 100 GB |
| **Advanced analytics** | ✗ | ✓ | ✓ | ✓ |
| **Bulk student import** | ✗ | ✓ | ✓ | ✓ |
| **Custom domain** | ✗ | ✗ | ✓ | ✓ |
| **White-label** | ✗ | ✗ | ✓ | ✓ |
| **API access** | ✗ | ✓ | ✓ | ✓ |
| **Custom integrations** | ✗ | ✗ | ✓ | ✓ |
| **Add-ons available** | ✗ | ✓ | ✓ | ✓ |
| **Contract terms** | ✗ | ✗ | ✗ | ✓ |

> ⚠️ **Teacher tier subscription system was deleted (Option A, Jun 2026).**
> The 4-tier TeacherSubscription model and service were fully built but never wired to any
> route, UI, or webhook. Decision: not a confirmed revenue stream. Removed to reduce dead code.
> If teacher subscriptions become a strategic priority, rebuild from scratch against this spec.
>
> **What currently exists for teachers:** payment-mode toggle (commission vs. subscription flat-fee),
> same Stripe flow as vendors, `TeacherSubscriptionStatus` enum inlined into `Teacher.ts`.

**Available Add-ons** (design target, not implemented):
- Extra classes slot pack: +50 AED / 10 classes
- Extra storage: +30 AED / 5 GB
- Extra bandwidth: +20 AED / 10 GB
- Priority listing: +99 AED / month

---

### 3. Schools & Organisations

**Value:** Manage students, teachers, exams, certificates, ERP, portals.

| | **Basic** | **Institute** | **Campus** | **District** |
|---|---|---|---|---|
| **Price / month** | 299 AED | 799 AED | 1,999 AED | Custom |
| **Teacher accounts** | 5 | 25 | 100 | Unlimited |
| **Student accounts** | 100 | 1,000 | 10,000 | Unlimited |
| **Courses / classes** | 10 | 100 | Unlimited | Unlimited |
| **Online examinations** | ✗ | ✓ (basic) | ✓ + proctoring | ✓ + anti-cheat |
| **Certificate generation** | ✗ | ✓ | ✓ | ✓ |
| **Student portal** | ✓ | ✓ | ✓ | ✓ |
| **Parent portal** | ✗ | ✓ | ✓ | ✓ |
| **LMS (courses + quizzes)** | ✓ | ✓ | ✓ | ✓ |
| **Academic calendar** | ✓ | ✓ | ✓ | ✓ |
| **Notice board** | ✓ | ✓ | ✓ | ✓ |
| **Internal messaging** | ✗ | ✓ | ✓ | ✓ |
| **Complaints / feedback** | ✗ | ✓ | ✓ | ✓ |
| **ERP — Finance / HR** | ✗ | ✗ | ✓ | ✓ |
| **ERP — Inventory** | ✗ | ✗ | ✓ | ✓ |
| **ERP — Scheduling** | ✗ | ✓ | ✓ | ✓ |
| **Bulk student import** | ✗ | ✓ | ✓ | ✓ |
| **Analytics & reports** | Basic | Standard | Advanced | Full export + API |
| **API access** | ✗ | ✗ | ✓ | ✓ |
| **Multi-campus** | ✗ | ✗ | ✓ (3 max) | Unlimited |
| **White-label / custom domain** | ✗ | ✗ | ✓ | ✓ |
| **Audit log & compliance** | ✗ | ✓ | ✓ | ✓ |
| **Dedicated account manager** | ✗ | ✗ | ✓ | ✓ |
| **SLA support** | Email | Priority | Dedicated | 24/7 SLA |

> ⚠️ **Not building yet.** SchoolSubscription model does not exist. Deferred until vendor
> subscription system is fully hardened.

---

### 4. Parents & Students (Consumer / Family)

**Value:** Book events, track children, access learning content.

| | **Free** | **Family** | **Premium** |
|---|---|---|---|
| **Price / month** | 0 AED | 29 AED | 79 AED |
| **Event browsing & booking** | ✓ | ✓ | ✓ |
| **Ticket management** | ✓ | ✓ | ✓ |
| **Favourites / wishlist** | ✓ | ✓ | ✓ |
| **Child accounts linked** | 1 | 3 | Unlimited |
| **Student portal access** | ✗ | ✓ | ✓ |
| **Progress tracking** | ✗ | ✓ | ✓ |
| **Certificate access** | ✗ | ✓ | ✓ |
| **LMS content access** | ✗ | ✗ | ✓ |
| **Exam result history** | ✗ | ✓ | ✓ |
| **Booking history & receipts** | Last 3 months | Full | Full |
| **Early-access event bookings** | ✗ | ✗ | ✓ |
| **SMS / push notifications** | ✗ | ✓ | ✓ |
| **Priority customer support** | ✗ | ✗ | ✓ |
| **Reels / content feed** | ✓ (limited) | ✓ | ✓ + early |

> ⚠️ **Not building yet.** ParentSubscription model does not exist. Deferred.

---

## Billing Cycles & Discounts

| Cycle | Discount |
|---|---|
| Monthly | 0% |
| Quarterly | ~10% (3 months for price of 2.7) |
| Yearly | ~20% (12 months for price of 9.6) |

---

## Trial Policy

| Persona | Trial |
|---|---|
| Vendors | 14 days free on Growth plan |
| Teachers | 14 days free on any paid plan |
| Schools | 30 days free on Basic plan |
| Parents/Students | Free tier is permanent |

---

## Add-ons (Cross-persona)

| Add-on | Price | Applies To |
|---|---|---|
| Extra storage (5 GB) | 30 AED/month | Teachers, Schools |
| Extra bandwidth (10 GB) | 20 AED/month | Teachers |
| Priority listing | 99 AED/month | Vendors, Teachers |
| Extra event slots (+5) | 49 AED/month | Vendors (Starter/Growth) |
| Extra employee seat | 29 AED/month | Vendors |
| Extra child account | 9 AED/month | Parents (Family) |
| SMS notification pack (500) | 49 AED/month | Schools |
| Proctoring session credits | 5 AED / session | Schools (Basic/Institute) |

---

## Implementation Status

### ✅ Implemented (live + wired)

| Feature | Location |
|---|---|
| Vendor flat subscription (150 AED/month, single plan) | `backend/src/services/subscription.service.ts` |
| Stripe Checkout + Billing Portal | `createCheckoutSession`, `createBillingPortalSession` |
| Subscription webhooks (checkout.completed, sub.updated/deleted, invoice paid/failed) | `backend/src/services/payment.service.ts` (~497–1316) |
| 7-day grace period logic + vendor event hiding on expiry | `subscription.service.ts` |
| Failed-payment email notification | `payment.service.ts` `handleInvoicePaymentFailed` |
| Cancel-at-period-end banner + grace period banner | `frontend/.../VendorPayoutsDashboard.tsx` |
| Subscription status chip (active / grace / expired) | `VendorPayoutsDashboard.tsx` `renderSubscriptionStatus()` |
| Stripe Connect (vendor + teacher) | `stripe-connect.service.ts`, `teacher.stripe-connect.service.ts` |
| Commission service + hourly backfill cron | `commission.service.ts`, `utils/cron.ts` |
| Subscription expiry safety-net cron (hourly) | `utils/cron.ts` `startSubscriptionExpiryCron` |
| VendorSubscription model | `backend/src/models/VendorSubscription.ts` |
| Vendor Stripe price setup script | `backend/src/scripts/utilities/createVendorSubscriptionPrice.ts` |
| Admin vendor subscription status-toggle endpoint | `routes/admin.vendor.routes.ts` `PUT /:id/subscription-status` |

### ⚠️ Partially Implemented

| Feature | Gap |
|---|---|
| Admin subscription management | Status-toggle only; no full overview table, no MRR/ARR metrics |
| Usage tracking fields (`IUsageTracking`) | Fields exist on VendorSubscription; nothing increments or reads them |
| `requireSubscription(feature)` middleware | Not built; no feature-gating layer at any endpoint |

### 🗑️ Dead / Orphaned (removed Jun 2026)

| What | Decision |
|---|---|
| `TeacherSubscription` model (580 lines, 4-tier, BASIC/STANDARD/PREMIUM/ENTERPRISE) | **Deleted** — never wired to routes, UI, or webhooks. |
| `teacher.subscription.service.ts` (full lifecycle service) | **Deleted** — dead code, never imported anywhere. Teacher controllers used vendor service instead. |
| `getTeacherSubscriptionAnalytics` admin endpoint | **Deleted** — queried the removed collection. |
| `TeacherSubscription` virtual on `Teacher.ts` | **Deleted** — ref to non-existent collection. |
| `TeacherSubscriptionPlan`, `TeacherBillingCycle` enums | **Deleted with model** — unused at call sites. |
| `TeacherSubscriptionStatus` enum | **Inlined into `Teacher.ts`** — still used by live teacher payment/payout controllers. |

### 📋 Planned (next sprints)

| Feature | Priority | Notes |
|---|---|---|
| `requireSubscription(feature)` middleware | P2 | Mirror `requirePhoneVerification.ts`; gate Create Event, Create Venue, Vendor Analytics first |
| Admin subscription overview table | P2 | Aggregate VendorSubscription docs; metrics: active/grace/failed counts, MRR, ARR |
| Usage-reset cron (monthly) | P2 | Only meaningful once enforcement middleware reads the counters |
| School + Parent subscriptions | Deferred | Not building until vendor system is fully hardened |
| Teacher tier subscriptions | Deferred | Rebuild from scratch if teachers become a confirmed revenue stream |

---

## Revenue Model Summary

| Stream | Type | Status |
|---|---|---|
| Vendor commission (PLATFORM_STRIPE mode) | % per ticket | ✅ Live |
| Vendor monthly subscription (CUSTOM_STRIPE mode, 150 AED flat) | Recurring SaaS | ✅ Live |
| Teacher subscription | Recurring SaaS + service fee | 📋 Planned (deleted tier system; rebuild needed) |
| School subscription | Recurring SaaS (B2B) | 📋 Deferred |
| Parent subscription | Recurring SaaS (B2C) | 📋 Deferred |
| Add-ons | Usage-based MRR expansion | 📋 Planned |

---

## Feature-Gate Strategy (when `requireSubscription` is built)

```ts
// Middleware pattern — to implement in backend/src/middleware/requireSubscription.ts:
requireSubscription('vendor.stripeConnect')      // already enforced via paymentMode check
requireSubscription('vendor.createEvent')        // P2 — gate on active subscription
requireSubscription('vendor.analytics.advanced') // P2 — gate on active subscription
requireSubscription('vendor.reels')              // P2 — gate + usage counter
```
