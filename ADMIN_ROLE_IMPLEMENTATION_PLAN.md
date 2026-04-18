# Admin Role — Complete Implementation Plan

> Platform administrator with broad operational access across all platform domains.
> **Created:** 2026-04-04 | **Status:** Partially Implemented — Gaps Identified

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Current State Assessment](#2-current-state-assessment)
3. [Backend Implementation Plan](#3-backend-implementation-plan)
4. [Frontend Implementation Plan](#4-frontend-implementation-plan)
5. [Permission System Upgrade](#5-permission-system-upgrade)
6. [API Endpoints](#6-api-endpoints)
7. [Dashboard Architecture](#7-dashboard-architecture)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Role Overview

### 1.1 What is Admin?

The Admin is the second-highest role in the GEMA platform (below Super Admin). Unlike sub-role admins (moderator, blog_writer, etc.) who have narrow scopes, the Admin has **broad operational access** across most platform domains.

**Admin Can:**
- Manage all vendors, schools, teachers, students, users
- Approve/reject events, schools, vendors
- View and manage payouts, commissions, revenue
- Moderate content (reviews, complaints)
- Manage system settings
- View all analytics and export data
- Manage blogs, media, banners, popups, announcements
- Run bulk import/export operations

**Admin Cannot:**
- Create or manage other admin accounts (Super Admin only)
- Access platform-level system settings (Super Admin only)
- Run database migrations (Super Admin only)
- Impersonate users (Super Admin only)
- Manage feature flags (Super Admin only)
- View full audit logs (Super Admin only)

### 1.2 Role Definition

```typescript
UserRole.ADMIN = "admin"
```

### 1.3 Admin vs Super Admin vs Sub-Roles

| Capability | Super Admin | Admin | Moderator | Blog Writer | Support Agent | Content Manager | Finance Manager |
|---|---|---|---|---|---|---|---|
| Manage admins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Platform settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System health | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature flags | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit logs (full) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage vendors | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage schools | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage events | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage payouts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage commissions | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View revenue | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Moderate reviews | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage blogs | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage media | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Handle tickets | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage students | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Current State Assessment

### 2.1 What Exists ✅

**Backend (28 files in modules/admin/):**
- `admin-role.model.ts` — AdminRole model with AdminRoleType enum
- `super-admin-profile.model.ts` — Super admin profile
- `audit-log.model.ts` — Audit logging
- `feature-flag.model.ts` — Feature flags
- `api-key.model.ts` — API keys
- `super-admin.controller.ts` — 18 handlers (super admin only)
- `super-admin.service.ts` — Full super admin service
- `super-admin.routes.ts` — 21 super admin endpoints
- `admin-vendors.controller.ts` — 8 vendor management handlers
- `admin-teachers.controller.ts` — 11 teacher management handlers
- `admin-moderation.controller.ts` — 5 moderation handlers
- `admin-payouts.controller.ts` — 14 vendor payout handlers
- `admin-commissions.controller.ts` — 22 commission handlers
- `admin-teacher-payouts.controller.ts` — 14 teacher payout handlers
- `admin-teacher-revenue.controller.ts` — 11 revenue handlers
- `admin-bulk-import.controller.ts` — 5 bulk import handlers
- `bulk-data.service.ts` — Bulk import/export service
- 7 route files registered at `/api/admin/*`

**Frontend (49 admin pages):**
- `AdminDashboardPage.tsx` — Main dashboard
- `AdminEventsPage.tsx`, `AdminEventDetailPage.tsx`, `AdminEditEventPage.tsx`
- `AdminUsersPage.tsx`, `AdminUserEditPage.tsx`
- `AdminVendorsPage.tsx`
- `AdminTeachersPage.tsx`, `AdminTeachingEventsPage.tsx`, `AdminTeachingEditEventPage.tsx`
- `AdminOrdersPage.tsx`, `AdminOrderDetailPage.tsx`
- `AdminPayoutsPage.tsx`
- `AdminCommissionsPage.tsx`, `AdminCommissionTransactionDetailPage.tsx`
- `AdminCouponsPage.tsx`
- `AdminCategoriesPage.tsx`
- `AdminCollectionsPage.tsx`
- `AdminBlogsPage.tsx`, `AdminBlogEditPage.tsx`, `AdminBlogCategoriesPage.tsx`
- `AdminSettingsPage.tsx`
- `AdminMediaPage.tsx`
- `AdminAnalyticsPage.tsx`
- `AdminReviewsPage.tsx`
- `AdminBannersPage.tsx`
- `AdminPopupsPage.tsx`
- `AdminAnnouncementsPage.tsx`
- `AdminSEOPage.tsx`
- `AdminAffiliateAnalyticsPage.tsx`
- `AdminSubmissionsPage.tsx`
- `BulkImportPage.tsx`
- `EmployeeManagement.tsx`
- `ReelsManagementPage.tsx`
- `AdminPartnershipsPage.tsx`
- Plus 5 sub-role dashboards (moderator, blog_writer, support_agent, content_manager, finance_manager)
- Plus 7 super admin pages

**Admin Routes (37 registered):**
All at `/admin/*` with `requiredRole="admin"` or specific sub-roles.

### 2.2 What's Missing ❌

**Backend Gaps:**
1. No admin LMS management (courses, lessons, quizzes, assignments)
2. No admin examination oversight
3. No admin certificate oversight
4. No admin student portal management
5. No admin ERP management (finance, HR, inventory, scheduling)
6. No admin messaging oversight
7. No admin notices/complaints/feedback management
8. No admin calendar management
9. No admin integrations management (webhooks, API keys for non-super-admin)
10. No admin search/index management
11. No admin registration management
12. No admin check-in management
13. Audit logging has hardcoded IP ("127.0.0.1") and user agent ("internal")

**Frontend Gaps:**
1. **No admin feature hooks/services** — Only `superAdmin` hooks exist. All 49 admin pages fetch data through ad-hoc patterns or direct API calls.
2. **No admin shared components** — No reusable admin table, admin stat card, admin filter bar, admin sidebar
3. **No admin layout/shell** — No dedicated admin layout with sidebar navigation
4. **No admin navigation** — Admin sidebar/navigation is missing or inline
5. **No permission-based route guards** — Only role-based (`requiredRole="admin"`), no `requirePermission()` usage
6. **No admin loading/error boundaries** specific to admin context
7. **No admin dashboard widgets** as reusable components

**Permission Gaps:**
1. ADMIN role has only 21 permissions (vs Super Admin's 68+)
2. Missing: `event:create`, `event:publish`
3. Missing: all `booking:*`, `payment:*`, `payout:*`, `commission:*`, `revenue:*`
4. Missing: all `blog:*`, `media:*`, `banners:*`, `popups:*`, `announcements:*`, `reels:*`, `homepage:*`, `seo_content:*`
5. Missing: `certificate:*`, `course:*`, `ticket:*`, `invoice:*`, `report:view`
6. 75 places use `authorize([UserRole.ADMIN])` — role-based, not permission-based
7. RBAC system with 50+ permissions exists but is largely unused

---

## 3. Backend Implementation Plan

### 3.1 Expand Admin Permissions

Update `shared/permissions/role-permissions.ts` to give ADMIN role broader permissions:

```typescript
[UserRole.ADMIN]: [
  // Platform
  Permission.PLATFORM_USERS_MANAGE,
  Permission.PLATFORM_ADMINS_MANAGE,

  // Events (full access)
  Permission.EVENT_CREATE, Permission.EVENT_READ, Permission.EVENT_UPDATE,
  Permission.EVENT_DELETE, Permission.EVENT_PUBLISH, Permission.EVENT_APPROVE,
  Permission.EVENT_REJECT, Permission.EVENT_FEATURE,

  // Bookings
  Permission.BOOKING_CREATE, Permission.BOOKING_READ, Permission.BOOKING_CANCEL,
  Permission.BOOKING_REFUND,

  // Students
  Permission.STUDENT_CREATE, Permission.STUDENT_READ, Permission.STUDENT_UPDATE,
  Permission.STUDENT_DELETE, Permission.STUDENT_BULK_IMPORT,

  // Certificates
  Permission.CERTIFICATE_GENERATE, Permission.CERTIFICATE_READ,
  Permission.CERTIFICATE_DOWNLOAD, Permission.CERTIFICATE_BULK_SEND,

  // Payments & Revenue
  Permission.PAYMENT_CREATE, Permission.PAYMENT_READ, Permission.PAYMENT_REFUND,
  Permission.PAYOUT_APPROVE, Permission.PAYOUT_READ,
  Permission.COMMISSION_READ, Permission.COMMISSION_MANAGE,
  Permission.REVENUE_READ, Permission.REVENUE_EXPORT,

  // LMS
  Permission.COURSE_CREATE, Permission.COURSE_READ, Permission.COURSE_ENROLL,
  Permission.GRADE_ASSIGN, Permission.ATTENDANCE_MARK,

  // ERP
  Permission.INVOICE_CREATE, Permission.INVOICE_READ,
  Permission.REPORT_VIEW, Permission.SETTINGS_MANAGE,

  // Content — Blogs
  Permission.BLOG_CREATE, Permission.BLOG_READ, Permission.BLOG_UPDATE,
  Permission.BLOG_DELETE, Permission.BLOG_PUBLISH,
  Permission.BLOG_CATEGORIES_MANAGE, Permission.BLOG_COMMENTS_MODERATE,

  // Content — Media
  Permission.MEDIA_UPLOAD, Permission.MEDIA_READ, Permission.MEDIA_DELETE,
  Permission.BANNERS_MANAGE, Permission.POPUPS_MANAGE,
  Permission.ANNOUNCEMENTS_MANAGE, Permission.REELS_MANAGE,
  Permission.HOMEPAGE_MANAGE, Permission.SEO_CONTENT_MANAGE,

  // Schools & Vendors
  Permission.SCHOOL_APPROVE, Permission.SCHOOL_REJECT,
  Permission.VENDOR_APPROVE, Permission.VENDOR_REJECT,

  // Reviews & Complaints
  Permission.REVIEW_MODERATE,
  Permission.COMPLAINT_READ, Permission.COMPLAINT_MANAGE,

  // Support
  Permission.TICKET_READ, Permission.TICKET_MANAGE,

  // Analytics
  Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
],
```

### 3.2 New Backend Modules to Create

| Module | Files | Endpoints | Priority |
|---|---|---|---|
| `admin-lms/` | controller, service, routes | Course oversight, lesson management, quiz review, assignment grading | P1 |
| `admin-examinations/` | controller, service, routes | Exam oversight, proctoring review, analytics | P1 |
| `admin-certificates/` | controller, service, routes | Certificate oversight, template management, bulk operations | P1 |
| `admin-students/` | controller, service, routes | Student oversight, enrollment management, attendance | P1 |
| `admin-erp/` | controller, service, routes | Finance overview, HR management, inventory, scheduling | P2 |
| `admin-messaging/` | controller, service, routes | Message oversight, notification management | P2 |
| `admin-complaints/` | controller, service, routes | Complaint management, resolution tracking | P2 |
| `admin-calendar/` | controller, service, routes | Academic calendar management | P3 |

### 3.3 Fix Existing Issues

1. **Audit logging** — Replace hardcoded IP/user agent with actual request data
2. **Permission middleware** — Migrate `authorize([UserRole.ADMIN])` to `requirePermission(Permission.X)`
3. **Role inheritance** — Ensure ADMIN can access all sub-role endpoints
4. **Error handling** — Standardize error responses across all admin endpoints
5. **Pagination** — Ensure all list endpoints support pagination
6. **Rate limiting** — Add stricter rate limits for admin endpoints

---

## 4. Frontend Implementation Plan

### 4.1 Admin Feature Modules (Create hooks + services)

For each admin domain, create a feature module with React Query hooks:

```
frontend/src/features/admin/
├── hooks/
│   ├── useSuperAdmin.ts          # ✅ EXISTS
│   ├── useAdminVendors.ts        # TODO
│   ├── useAdminTeachers.ts       # TODO
│   ├── useAdminEvents.ts         # TODO
│   ├── useAdminUsers.ts          # TODO
│   ├── useAdminOrders.ts         # TODO
│   ├── useAdminPayouts.ts        # TODO
│   ├── useAdminCommissions.ts    # TODO
│   ├── useAdminModeration.ts     # TODO
│   ├── useAdminBlogs.ts          # TODO
│   ├── useAdminMedia.ts          # TODO
│   ├── useAdminAnalytics.ts      # TODO
│   ├── useAdminSettings.ts       # TODO
│   ├── useAdminBulkImport.ts     # TODO
│   ├── useAdminLMS.ts            # TODO
│   ├── useAdminCertificates.ts   # TODO
│   └── useAdminStudents.ts       # TODO
├── services/
│   ├── superAdmin.service.ts     # ✅ EXISTS
│   ├── adminVendors.service.ts   # TODO
│   ├── adminTeachers.service.ts  # TODO
│   ├── adminEvents.service.ts    # TODO
│   ├── adminUsers.service.ts     # TODO
│   ├── adminOrders.service.ts    # TODO
│   ├── adminPayouts.service.ts   # TODO
│   ├── adminCommissions.service.ts # TODO
│   ├── adminModeration.service.ts # TODO
│   ├── adminBlogs.service.ts     # TODO
│   ├── adminMedia.service.ts     # TODO
│   ├── adminAnalytics.service.ts # TODO
│   ├── adminSettings.service.ts  # TODO
│   ├── adminBulkImport.service.ts # TODO
│   ├── adminLMS.service.ts       # TODO
│   ├── adminCertificates.service.ts # TODO
│   └── adminStudents.service.ts  # TODO
└── types/
    └── admin.types.ts            # TODO — Shared admin types
```

### 4.2 Shared Admin Components

```
frontend/src/shared/components/admin/
├── AdminLayout.tsx               # Main admin shell with sidebar
├── AdminSidebar.tsx              # Role-aware sidebar navigation
├── AdminHeader.tsx               # Admin header with breadcrumbs
├── AdminDataTable.tsx            # Reusable data table with sorting, filtering, pagination
├── AdminStatCard.tsx             # Dashboard stat card with trend indicator
├── AdminFilterBar.tsx            # Reusable filter bar
├── AdminActionMenu.tsx           # Row action menu (edit, delete, suspend, etc.)
├── AdminStatusBadge.tsx          # Status badge (active, pending, suspended, etc.)
├── AdminEmptyState.tsx           # Empty state with action button
├── AdminPageHeader.tsx           # Page header with title, description, actions
├── AdminConfirmDialog.tsx        # Confirmation dialog for destructive actions
├── AdminExportButton.tsx         # Export to CSV/PDF button
└── AdminBulkActionsBar.tsx       # Bulk actions bar for multi-select
```

### 4.3 Admin Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  GEMA Admin Panel                              [🔔] [👤 Admin] │
├──────────┬──────────────────────────────────────────────────────┤
│          │  Breadcrumbs: Admin > Vendors                        │
│ Sidebar  │                                                      │
│          │  Page Title            [Action Button]               │
│ 📊 Dash  │                                                      │
│ 👥 Users │  ┌──────────────────────────────────────────────┐   │
│ 🏢 Vendors│ │  Filter Bar: [Search] [Status] [Date] [Apply] │   │
│ 🏫 Schools│  └──────────────────────────────────────────────┘   │
│ 📅 Events │                                                      │
│ 💰 Revenue│  ┌──────────────────────────────────────────────┐   │
│ 📝 Content│ │                                              │   │
│ 🔧 System │ │           Admin Data Table                   │   │
│ 📋 Reports│ │  ┌───┬──────┬────────┬────────┬───────────┐ │   │
│ ⚙️ Settings│ │  │ ☐ │ Name │ Status │ Date   │ Actions   │ │   │
│          │ │  ├───┼──────┼────────┼────────┼───────────┤ │   │
│          │ │  │ ☐ │ ...  │ Active │ ...    │ [⋮]       │ │   │
│          │ │  └───┴──────┴────────┴────────┴───────────┘ │   │
│          │ │                                              │   │
│          │ │  Pagination: ← 1 2 3 ... 10 →               │   │
│          │ └──────────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────────┘
```

### 4.4 Admin Navigation Structure

```typescript
const adminNavItems = [
  { icon: '📊', label: 'Dashboard', path: '/admin', permission: null },
  { icon: '👥', label: 'Users', path: '/admin/users', permission: 'platform:users_manage' },
  { icon: '🏢', label: 'Vendors', path: '/admin/vendors', permission: 'vendor:approve' },
  { icon: '🏫', label: 'Schools', path: '/admin/schools', permission: 'school:approve' },
  { icon: '👨‍🏫', label: 'Teachers', path: '/admin/teachers', permission: null },
  { icon: '🎓', label: 'Students', path: '/admin/students', permission: 'student:read' },
  { icon: '📅', label: 'Events', path: '/admin/events', permission: 'event:read' },
  { icon: '📦', label: 'Orders', path: '/admin/orders', permission: 'booking:read' },
  { icon: '💰', label: 'Revenue', path: '/admin/revenue', permission: 'revenue:read' },
  { icon: '💸', label: 'Payouts', path: '/admin/payouts', permission: 'payout:approve' },
  { icon: '📊', label: 'Commissions', path: '/admin/commissions', permission: 'commission:read' },
  { icon: '📝', label: 'Content', path: '/admin/blogs', permission: 'blog:read' },
  { icon: '🖼️', label: 'Media', path: '/admin/media', permission: 'media:read' },
  { icon: '🎨', label: 'Banners', path: '/admin/banners', permission: 'banners:manage' },
  { icon: '📢', label: 'Popups', path: '/admin/popups', permission: 'popups:manage' },
  { icon: '🎬', label: 'Reels', path: '/admin/reels', permission: 'reels:manage' },
  { icon: '⭐', label: 'Reviews', path: '/admin/reviews', permission: 'review:moderate' },
  { icon: '📈', label: 'Analytics', path: '/admin/analytics', permission: 'analytics:read' },
  { icon: '🎫', label: 'Coupons', path: '/admin/coupons', permission: null },
  { icon: '📂', label: 'Categories', path: '/admin/categories', permission: null },
  { icon: '📁', label: 'Collections', path: '/admin/collections', permission: null },
  { icon: '🔧', label: 'Settings', path: '/admin/settings', permission: 'settings:manage' },
  { icon: '📥', label: 'Bulk Import', path: '/admin/bulk-import', permission: null },
  { icon: '👥', label: 'Employees', path: '/admin/employees', permission: null },
];
```

---

## 5. Permission System Upgrade

### 5.1 Current State

- 50+ permissions defined in `shared/permissions/permissions.ts`
- `ROLE_PERMISSIONS` mapping exists but is only used in `requirePermission()` middleware
- 75 route definitions use `authorize([UserRole.ADMIN])` — role-based, not permission-based
- `requirePermission()` middleware exists but is not used in any route definitions

### 5.2 Migration Plan

**Phase 1: Add missing permissions to ADMIN role**
- Update `role-permissions.ts` with expanded ADMIN permissions (see §3.1)

**Phase 2: Create permission-based route guards**
```typescript
// Instead of:
router.get('/events', authenticate, authorize([UserRole.ADMIN]), getEvents);

// Use:
router.get('/events', authenticate, requirePermission(Permission.EVENT_READ), getEvents);
```

**Phase 3: Create frontend permission hook**
```typescript
export function useHasPermission(permission: Permission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
  return permissions.includes(permission);
}
```

**Phase 4: Update admin navigation to use permissions**
```typescript
const filteredNavItems = adminNavItems.filter(
  item => !item.permission || useHasPermission(item.permission)
);
```

---

## 6. API Endpoints

### 6.1 Existing Admin Endpoints (21 prefixes)

| Prefix | Module | Count | Status |
|---|---|---|---|
| `/api/admin/users` | users/admin-users.routes | ~8 | ✅ Working |
| `/api/admin/employees` | employees/admin-employees.routes | ~6 | ✅ Working |
| `/api/admin/events` | events/admin-events.routes | ~10 | ✅ Working |
| `/api/admin/venues` | venues/admin-venue.routes | ~6 | ✅ Working |
| `/api/admin/vendors` | admin/admin-vendors.routes | ~8 | ✅ Working |
| `/api/admin/teachers` | admin/admin-teachers.routes | ~11 | ✅ Working |
| `/api/admin/dashboard` | analytics/admin-dashboard.routes | ~4 | ✅ Working |
| `/api/admin/moderation` | admin/admin-moderation.routes | ~5 | ✅ Working |
| `/api/admin` (payouts) | admin/admin-payouts.routes | ~14 | ✅ Working |
| `/api/admin` (commissions) | admin/admin-commissions.routes | ~22 | ✅ Working |
| `/api/admin` (settings) | settings/admin-settings.routes | ~6 | ✅ Working |
| `/api/admin/collections` | collections/admin-collections.routes | ~4 | ✅ Working |
| `/api/admin/reels` | content/admin-reels.routes | ~4 | ✅ Working |
| `/api/admin/blogs` | content/blog.routes | ~8 | ✅ Working |
| `/api/admin/revenue` | admin/admin-teacher-revenue.routes | ~11 | ✅ Working |
| `/api/admin` (stats) | analytics/admin-stats.routes | ~4 | ✅ Working |
| `/api/admin/bulk-import` | admin/admin-bulk-import.routes | ~5 | ✅ Working |
| `/api/admin/teachers/payouts` | admin/admin-teacher-payouts.routes | ~14 | ✅ Working |
| `/api/admin/teacher-revenue` | admin/admin-teacher-revenue.routes | ~11 | ✅ Working |
| `/api/chatbot` | routes/index.ts (inline) | ~2 | ✅ Working |
| `/api/super-admin` | admin/super-admin.routes | ~21 | ✅ Working |

**Total: ~180+ admin endpoints currently registered.**

### 6.2 New Admin Endpoints to Create

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/admin/lms/courses` | `course:read` | List all courses |
| GET | `/api/admin/lms/courses/:id` | `course:read` | Course details |
| PUT | `/api/admin/lms/courses/:id` | `course:create` | Update course |
| GET | `/api/admin/lms/enrollments` | `course:enroll` | List all enrollments |
| GET | `/api/admin/examinations` | `event:read` | List all exams |
| GET | `/api/admin/examinations/:id/analytics` | `analytics:read` | Exam analytics |
| GET | `/api/admin/certificates` | `certificate:read` | List all certificates |
| POST | `/api/admin/certificates/generate` | `certificate:generate` | Generate certificate |
| GET | `/api/admin/students` | `student:read` | List all students |
| GET | `/api/admin/students/:id` | `student:read` | Student details |
| PUT | `/api/admin/students/:id` | `student:update` | Update student |
| GET | `/api/admin/erp/finance` | `revenue:read` | Finance overview |
| GET | `/api/admin/erp/hr` | `platform:users_manage` | HR overview |
| GET | `/api/admin/complaints` | `complaint:manage` | List complaints |
| PUT | `/api/admin/complaints/:id` | `complaint:manage` | Update complaint |
| GET | `/api/admin/calendar` | `event:read` | Academic calendar |
| PUT | `/api/admin/calendar` | `event:create` | Update calendar |

---

## 7. Dashboard Architecture

### 7.1 Admin Dashboard Components

```
AdminDashboardPage
├── PageHeader (title, description, date range picker)
├── StatsGrid (4-6 StatCards)
│   ├── Total Users (with growth %)
│   ├── Active Events (with trend)
│   ├── Revenue (30d, with chart sparkline)
│   ├── Pending Approvals (events, schools, vendors)
│   ├── Open Tickets (support)
│   └── System Health (status badge)
├── RevenueChart (30-day line chart)
├── QuickActionsGrid (6-8 action buttons)
├── RecentActivityFeed (last 10 audit logs)
├── PendingApprovalsTable (events, schools, vendors)
└── TopPerformersTable (top vendors, top teachers)
```

### 7.2 Admin Layout Component

```tsx
// shared/components/admin/AdminLayout.tsx
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navItems = useAdminNavigation(); // Filtered by permissions

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar items={navItems} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Expand ADMIN permissions in `role-permissions.ts`
- [ ] Create `AdminLayout` component with sidebar
- [ ] Create `AdminSidebar` with role-aware navigation
- [ ] Create shared admin components (DataTable, StatCard, FilterBar, etc.)
- [ ] Create `useHasPermission()` hook
- [ ] Create `admin.types.ts` shared types
- [ ] Fix audit logging (replace hardcoded IP/user agent)

### Phase 2: Feature Hooks & Services (Week 3-4)
- [ ] Create `adminVendors.service.ts` + `useAdminVendors.ts`
- [ ] Create `adminTeachers.service.ts` + `useAdminTeachers.ts`
- [ ] Create `adminEvents.service.ts` + `useAdminEvents.ts`
- [ ] Create `adminUsers.service.ts` + `useAdminUsers.ts`
- [ ] Create `adminOrders.service.ts` + `useAdminOrders.ts`
- [ ] Create `adminPayouts.service.ts` + `useAdminPayouts.ts`
- [ ] Create `adminCommissions.service.ts` + `useAdminCommissions.ts`
- [ ] Create `adminModeration.service.ts` + `useAdminModeration.ts`
- [ ] Create `adminBlogs.service.ts` + `useAdminBlogs.ts`
- [ ] Create `adminMedia.service.ts` + `useAdminMedia.ts`
- [ ] Create `adminAnalytics.service.ts` + `useAdminAnalytics.ts`
- [ ] Create `adminSettings.service.ts` + `useAdminSettings.ts`
- [ ] Create `adminBulkImport.service.ts` + `useAdminBulkImport.ts`

### Phase 3: New Backend Modules (Week 5-6)
- [ ] Create `admin-lms/` module (courses, enrollments oversight)
- [ ] Create `admin-examinations/` module (exam oversight)
- [ ] Create `admin-certificates/` module (certificate oversight)
- [ ] Create `admin-students/` module (student oversight)
- [ ] Create `admin-complaints/` module (complaint management)
- [ ] Create `admin-calendar/` module (calendar management)
- [ ] Register all new routes in `routes/index.ts`

### Phase 4: Frontend Feature Pages (Week 7-8)
- [ ] Migrate existing admin pages to use new feature hooks
- [ ] Create LMS admin pages (courses, enrollments)
- [ ] Create Examinations admin pages
- [ ] Create Certificates admin pages
- [ ] Create Students admin pages
- [ ] Create Complaints admin pages
- [ ] Create Calendar admin pages
- [ ] Add permission-based route guards to all admin routes

### Phase 5: Migration to Permission-Based Auth (Week 9-10)
- [ ] Replace all `authorize([UserRole.ADMIN])` with `requirePermission(Permission.X)`
- [ ] Update frontend navigation to filter by permissions
- [ ] Add permission checks in UI components (show/hide buttons based on permissions)
- [ ] Test all authorization paths
- [ ] Create permission documentation

### Phase 6: Polish & Testing (Week 11-12)
- [ ] Responsive design for all admin pages
- [ ] Dark mode support
- [ ] Loading states + skeleton screens
- [ ] Error boundaries for all admin pages
- [ ] Export functionality (CSV/PDF) for all data tables
- [ ] Bulk actions for all list pages
- [ ] Unit tests for all admin hooks
- [ ] Integration tests for admin API endpoints
- [ ] E2E tests for critical admin workflows

---

## Appendix: File Structure

### Backend — New Files to Create

```
backend/src/modules/admin/
├── admin-lms/
│   ├── admin-lms.controller.ts
│   ├── admin-lms.service.ts
│   └── admin-lms.routes.ts
├── admin-examinations/
│   ├── admin-examinations.controller.ts
│   ├── admin-examinations.service.ts
│   └── admin-examinations.routes.ts
├── admin-certificates/
│   ├── admin-certificates.controller.ts
│   ├── admin-certificates.service.ts
│   └── admin-certificates.routes.ts
├── admin-students/
│   ├── admin-students.controller.ts
│   ├── admin-students.service.ts
│   └── admin-students.routes.ts
├── admin-complaints/
│   ├── admin-complaints.controller.ts
│   ├── admin-complaints.service.ts
│   └── admin-complaints.routes.ts
└── admin-calendar/
    ├── admin-calendar.controller.ts
    ├── admin-calendar.service.ts
    └── admin-calendar.routes.ts
```

### Frontend — New Files to Create

```
frontend/src/
├── features/admin/
│   ├── hooks/
│   │   ├── useAdminVendors.ts
│   │   ├── useAdminTeachers.ts
│   │   ├── useAdminEvents.ts
│   │   ├── useAdminUsers.ts
│   │   ├── useAdminOrders.ts
│   │   ├── useAdminPayouts.ts
│   │   ├── useAdminCommissions.ts
│   │   ├── useAdminModeration.ts
│   │   ├── useAdminBlogs.ts
│   │   ├── useAdminMedia.ts
│   │   ├── useAdminAnalytics.ts
│   │   ├── useAdminSettings.ts
│   │   ├── useAdminBulkImport.ts
│   │   ├── useAdminLMS.ts
│   │   ├── useAdminCertificates.ts
│   │   └── useAdminStudents.ts
│   ├── services/
│   │   ├── adminVendors.service.ts
│   │   ├── adminTeachers.service.ts
│   │   ├── adminEvents.service.ts
│   │   ├── adminUsers.service.ts
│   │   ├── adminOrders.service.ts
│   │   ├── adminPayouts.service.ts
│   │   ├── adminCommissions.service.ts
│   │   ├── adminModeration.service.ts
│   │   ├── adminBlogs.service.ts
│   │   ├── adminMedia.service.ts
│   │   ├── adminAnalytics.service.ts
│   │   ├── adminSettings.service.ts
│   │   ├── adminBulkImport.service.ts
│   │   ├── adminLMS.service.ts
│   │   ├── adminCertificates.service.ts
│   │   └── adminStudents.service.ts
│   └── types/
│       └── admin.types.ts
├── shared/components/admin/
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx
│   ├── AdminHeader.tsx
│   ├── AdminDataTable.tsx
│   ├── AdminStatCard.tsx
│   ├── AdminFilterBar.tsx
│   ├── AdminActionMenu.tsx
│   ├── AdminStatusBadge.tsx
│   ├── AdminEmptyState.tsx
│   ├── AdminPageHeader.tsx
│   ├── AdminConfirmDialog.tsx
│   ├── AdminExportButton.tsx
│   └── AdminBulkActionsBar.tsx
└── app/routes/
    └── admin.routes.tsx          # Updated with permission-based guards
```

---

**Document Version:** 1.0
**Last Updated:** 2026-04-04
**Status:** Plan Complete — Ready for Implementation
**Next Action:** Begin Phase 1 (Foundation — expand permissions, create admin layout + shared components)
