# Super Admin Role — Complete Implementation Plan

> Full platform owner with unrestricted access to all data, settings, and operations.
> **Created:** 2026-04-04 | **Status:** Foundation Complete, Full Implementation Pending

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Implementation](#3-frontend-implementation)
4. [API Endpoints](#4-api-endpoints)
5. [Permissions Matrix](#5-permissions-matrix)
6. [Dashboard Layout](#6-dashboard-layout)
7. [Security Considerations](#7-security-considerations)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Role Overview

### 1.1 What is Super Admin?

The Super Admin is the highest-privileged role in the GEMA platform. Unlike regular admins who have scoped permissions, the Super Admin has:

- **Unrestricted access** to all platform data and operations
- **Ability to manage other admins** — create, modify, delete admin accounts
- **Platform-level settings** — system configuration, feature flags, integrations
- **Audit trail access** — view all platform activity logs
- **Database operations** — run migrations, manage backups
- **Emergency controls** — suspend users, vendors, schools; override any operation

### 1.2 Role Definition

```typescript
export enum UserRole {
  SUPER_ADMIN = "super_admin",  // ← Full platform owner
  // ... 13 other roles
}
```

**Key Distinction from Admin:**
| Capability | Super Admin | Admin |
|---|---|---|
| Manage other admins | ✅ | ❌ |
| Platform settings | ✅ | ❌ |
| System configuration | ✅ | ❌ |
| Audit logs | ✅ Full | ❌ |
| Database operations | ✅ | ❌ |
| Feature flags | ✅ | ❌ |
| API key management | ✅ | ❌ |
| View all revenue | ✅ | ✅ |
| Manage vendors | ✅ | ✅ |
| Manage schools | ✅ | ✅ |
| Manage events | ✅ | ✅ |
| Manage users | ✅ | ✅ |

---

## 2. Backend Implementation

### 2.1 Models

#### Super Admin Profile Model (extends User)

```typescript
// modules/admin/super-admin-profile.model.ts
export interface ISuperAdminProfile extends Document {
  userId: mongoose.Types.ObjectId;
  // Security
  twoFactorEnabled: boolean;
  backupCodes: string[];
  lastPasswordChange: Date;
  sessionLimit: number;
  // Activity
  lastLoginAt: Date;
  lastLoginIP: string;
  loginHistory: Array<{
    ip: string;
    userAgent: string;
    timestamp: Date;
    location?: string;
  }>;
  // Preferences
  dashboardLayout: Record<string, any>;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    securityAlerts: boolean;
    systemAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Admin Role Model (already created)

```typescript
// modules/admin/admin-role.model.ts
export interface IAdminRole extends Document {
  userId: mongoose.Types.ObjectId;
  role: AdminRoleType;  // admin, moderator, blog_writer, etc.
  assignedBy: mongoose.Types.ObjectId;  // Super Admin who assigned
  assignedAt: Date;
  customPermissions?: Permission[];
  revokedPermissions?: Permission[];
  scope: {
    eventCategories?: string[];
    blogCategories?: string[];
    regions?: string[];
  };
  isActive: boolean;
  expiresAt?: Date;
  notes?: string;
}
```

### 2.2 Services

#### Super Admin Service

```typescript
// modules/admin/super-admin.service.ts
class SuperAdminService {
  // Admin Management
  async createAdminRole(input: CreateAdminRoleInput): Promise<IAdminRole>;
  async updateAdminRole(id: string, input: UpdateAdminRoleInput): Promise<IAdminRole>;
  async deleteAdminRole(id: string): Promise<void>;
  async listAllAdmins(query: AdminQuery): Promise<{ admins: IAdminRole[]; total: number }>;
  async suspendAdmin(id: string, reason: string): Promise<IAdminRole>;
  async reinstateAdmin(id: string): Promise<IAdminRole>;

  // Platform Settings
  async getSystemSettings(): Promise<ISystemSettings>;
  async updateSystemSettings(input: Partial<ISystemSettings>): Promise<ISystemSettings>;
  async getFeatureFlags(): Promise<IFeatureFlags>;
  async updateFeatureFlag(key: string, value: boolean): Promise<void>;

  // System Operations
  async getSystemHealth(): Promise<SystemHealth>;
  async getDatabaseStats(): Promise<DatabaseStats>;
  async runMigration(migrationName: string): Promise<MigrationResult>;
  async getAuditLogs(query: AuditQuery): Promise<{ logs: IAuditLog[]; total: number }>;
  async exportData(type: string, filters: any): Promise<{ url: string }>;

  // User Management (elevated)
  async impersonateUser(userId: string, adminId: string): Promise<{ token: string }>;
  async forceLogoutUser(userId: string): Promise<void>;
  async bulkSuspendUsers(userIds: string[], reason: string): Promise<number>;

  // API & Integrations
  async generateApiKey(adminId: string, scopes: string[]): Promise<IApiKey>;
  async revokeApiKey(keyId: string): Promise<void>;
  async listApiKeys(adminId: string): Promise<IApiKey[]>;
  async testIntegration(integrationType: string, config: any): Promise<{ success: boolean }>;
}
```

### 2.3 Controllers

#### Super Admin Controller

```typescript
// modules/admin/super-admin.controller.ts
// Thin controllers — max 200 lines each, delegate to services

// Admin Management
export const createAdminRole = catchAsync(async (req, res) => { ... });
export const listAllAdmins = catchAsync(async (req, res) => { ... });
export const updateAdminRole = catchAsync(async (req, res) => { ... });
export const deleteAdminRole = catchAsync(async (req, res) => { ... });
export const suspendAdmin = catchAsync(async (req, res) => { ... });

// Platform Settings
export const getSystemSettings = catchAsync(async (req, res) => { ... });
export const updateSystemSettings = catchAsync(async (req, res) => { ... });
export const getFeatureFlags = catchAsync(async (req, res) => { ... });
export const updateFeatureFlag = catchAsync(async (req, res) => { ... });

// System Operations
export const getSystemHealth = catchAsync(async (req, res) => { ... });
export const getDatabaseStats = catchAsync(async (req, res) => { ... });
export const runMigration = catchAsync(async (req, res) => { ... });
export const getAuditLogs = catchAsync(async (req, res) => { ... });

// User Management
export const impersonateUser = catchAsync(async (req, res) => { ... });
export const forceLogoutUser = catchAsync(async (req, res) => { ... });
export const bulkSuspendUsers = catchAsync(async (req, res) => { ... });

// API Management
export const generateApiKey = catchAsync(async (req, res) => { ... });
export const revokeApiKey = catchAsync(async (req, res) => { ... });
export const listApiKeys = catchAsync(async (req, res) => { ... });
```

### 2.4 Routes

```typescript
// modules/admin/super-admin.routes.ts
const router = Router();

// All routes require super_admin role
router.use(authenticate, authorize([UserRole.SUPER_ADMIN]));

// Admin Management
router.post('/admin-roles', validateCreateAdminRole, createAdminRole);
router.get('/admin-roles', listAllAdmins);
router.put('/admin-roles/:id', validateUpdateAdminRole, updateAdminRole);
router.delete('/admin-roles/:id', deleteAdminRole);
router.post('/admin-roles/:id/suspend', suspendAdmin);
router.post('/admin-roles/:id/reinstate', reinstateAdmin);

// Platform Settings
router.get('/settings/system', getSystemSettings);
router.put('/settings/system', updateSystemSettings);
router.get('/settings/feature-flags', getFeatureFlags);
router.put('/settings/feature-flags/:key', updateFeatureFlag);

// System Operations
router.get('/system/health', getSystemHealth);
router.get('/system/database-stats', getDatabaseStats);
router.post('/system/migrations/:name', runMigration);
router.get('/system/audit-logs', getAuditLogs);

// User Management (elevated)
router.post('/users/:id/impersonate', impersonateUser);
router.post('/users/:id/force-logout', forceLogoutUser);
router.post('/users/bulk-suspend', bulkSuspendUsers);

// API Management
router.post('/api-keys', generateApiKey);
router.get('/api-keys', listApiKeys);
router.delete('/api-keys/:id', revokeApiKey);
```

### 2.5 Middleware

#### Super Admin Guard

```typescript
// shared/middleware/super-admin-guard.ts
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (req.user.role !== UserRole.SUPER_ADMIN) {
    return next(new AppError('Super admin access required', 403));
  }
  next();
};
```

#### Audit Logger for Super Admin Actions

```typescript
// shared/middleware/super-admin-audit.ts
export const auditSuperAdminAction = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    res.json = function (body) {
      await AuditLog.create({
        actorId: req.user._id,
        actorRole: req.user.role,
        action,
        resource: req.originalUrl,
        method: req.method,
        requestBody: sanitizeSensitiveData(req.body),
        responseBody: sanitizeSensitiveData(body),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });
      return originalSend.call(this, body);
    };
    next();
  };
};
```

---

## 3. Frontend Implementation

### 3.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  GEMA Admin Panel                                    [🔔] [👤] │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  📊 Overview          Super Admin Dashboard                    │
│  👥 Admin Roles       Welcome back, [Name]                      │
│  🏢 Vendors           ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  🏫 Schools           │ 1.2K │ │  456 │ │  89  │ │  AED │     │
│  👤 Users             │Users │ │Events│ │School│ │ 245K │     │
│  📅 Events            └──────┘ └──────┘ └──────┘ └──────┘     │
│  💰 Revenue           ┌──────────────────────────────────────┐ │
│  🔧 System            │ 📈 Revenue Chart (30 days)           │ │
│  🔐 Security          │                                      │ │
│  📋 Audit Logs        └──────────────────────────────────────┘ │
│  🔑 API Keys          ┌─────────────┐ ┌─────────────┐         │
│  ⚙️ Feature Flags    │ Recent      │ │ System      │         │
│  🚨 Alerts           │ Activities  │ │ Health      │         │
│                      └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Page Structure

```
pages/admin/
├── SuperAdminDashboardPage.tsx    # Main dashboard with system overview
├── AdminManagementPage.tsx        # CRUD for admin roles
├── AdminRoleDetailPage.tsx        # View/edit specific admin role
├── SystemSettingsPage.tsx         # Platform-wide settings
├── FeatureFlagsPage.tsx           # Toggle feature flags
├── SystemHealthPage.tsx           # Server health, DB stats, queues
├── AuditLogsPage.tsx              # Platform audit trail
├── ApiKeysPage.tsx                # API key management
├── ImpersonateUserPage.tsx        # User impersonation tool
└── BulkActionsPage.tsx            # Bulk user/vendor/school operations
```

### 3.3 Components

#### SuperAdminDashboardPage

```tsx
// pages/admin/SuperAdminDashboardPage.tsx
export function SuperAdminDashboardPage() {
  const { data: stats, isLoading } = useSystemStats();
  const { data: health } = useSystemHealth();
  const { data: recentActivity } = useRecentAuditLogs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader title="Super Admin Dashboard" description="Platform overview and system controls" />

      {/* System Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users />} label="Total Users" value={stats?.totalUsers} change={stats?.userGrowth} />
        <StatCard icon={<Calendar />} label="Total Events" value={stats?.totalEvents} change={stats?.eventGrowth} />
        <StatCard icon={<DollarSign />} label="Total Revenue" value={stats?.totalRevenue} change={stats?.revenueGrowth} />
        <StatCard icon={<Activity />} label="System Health" value={health?.status} />
      </div>

      {/* Revenue Chart */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Revenue (30 days)</h2>
        <RevenueChart data={stats?.revenueData} />
      </Card>

      {/* System Health + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthCard health={health} />
        <RecentActivityCard activities={recentActivity} />
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickActionButton icon={<UserPlus />} label="Create Admin" link="/admin/admin-roles/new" />
          <QuickActionButton icon={<Shield />} label="Feature Flags" link="/admin/feature-flags" />
          <QuickActionButton icon={<Database />} label="System Health" link="/admin/system-health" />
          <QuickActionButton icon={<UserCog />} label="Impersonate" link="/admin/impersonate" />
        </div>
      </Card>
    </div>
  );
}
```

#### AdminManagementPage

```tsx
// pages/admin/AdminManagementPage.tsx
export function AdminManagementPage() {
  const { data: admins, isLoading } = useAdminRoles();
  const createAdmin = useCreateAdminRole();
  const deleteAdmin = useDeleteAdminRole();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Admin Management"
        description="Manage platform administrators and their permissions"
        actions={<Button leftIcon={<Plus />} onClick={() => setOpenCreateModal(true)}>Create Admin</Button>}
      />

      <DataTable
        headers={['Admin', 'Role', 'Permissions', 'Status', 'Assigned By', 'Actions']}
        data={admins}
        columns={[
          { render: (admin) => <AdminCell admin={admin} /> },
          { render: (admin) => <RoleBadge role={admin.role} /> },
          { render: (admin) => <PermissionCount permissions={admin.customPermissions?.length || 0} /> },
          { render: (admin) => <StatusBadge active={admin.isActive} expiresAt={admin.expiresAt} /> },
          { render: (admin) => <UserCell user={admin.assignedBy} /> },
          { render: (admin) => <ActionMenu onEdit={() => editAdmin(admin)} onDelete={() => deleteAdmin.mutate(admin._id)} onSuspend={() => suspendAdmin(admin._id)} /> },
        ]}
      />
    </div>
  );
}
```

### 3.4 Feature Hooks

```typescript
// features/admin/hooks/useSuperAdmin.ts
export function useSystemStats() {
  return useQuery({ queryKey: ['super-admin', 'stats'], queryFn: () => superAdminAPI.getSystemStats() });
}

export function useSystemHealth() {
  return useQuery({ queryKey: ['super-admin', 'health'], queryFn: () => superAdminAPI.getSystemHealth() });
}

export function useAdminRoles() {
  return useQuery({ queryKey: ['super-admin', 'admin-roles'], queryFn: () => superAdminAPI.getAdminRoles() });
}

export function useCreateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => superAdminAPI.createAdminRole(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'admin-roles'] }),
  });
}

export function useAuditLogs(params) {
  return useQuery({ queryKey: ['super-admin', 'audit-logs', params], queryFn: () => superAdminAPI.getAuditLogs(params) });
}

export function useImpersonateUser() {
  return useMutation({ mutationFn: ({ userId }) => superAdminAPI.impersonateUser(userId) });
}
```

### 3.5 Routes

```typescript
// app/routes/super-admin.routes.tsx
export const superAdminRoutes = (
  <>
    <Route path="admin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
      <Route index element={<S><SuperAdminDashboardPage /></S>} />
      <Route path="dashboard" element={<S><SuperAdminDashboardPage /></S>} />
      <Route path="admin-roles" element={<S><AdminManagementPage /></S>} />
      <Route path="admin-roles/new" element={<S><CreateAdminRolePage /></S>} />
      <Route path="admin-roles/:id" element={<S><AdminRoleDetailPage /></S>} />
      <Route path="admin-roles/:id/edit" element={<S><EditAdminRolePage /></S>} />
      <Route path="settings" element={<S><SystemSettingsPage /></S>} />
      <Route path="feature-flags" element={<S><FeatureFlagsPage /></S>} />
      <Route path="system-health" element={<S><SystemHealthPage /></S>} />
      <Route path="audit-logs" element={<S><AuditLogsPage /></S>} />
      <Route path="api-keys" element={<S><ApiKeysPage /></S>} />
      <Route path="impersonate" element={<S><ImpersonateUserPage /></S>} />
      <Route path="bulk-actions" element={<S><BulkActionsPage /></S>} />
    </Route>
  </>
);
```

---

## 4. API Endpoints

### 4.1 Admin Management

| Method | Path | Description |
|---|---|---|
| GET | `/api/super-admin/admin-roles` | List all admin roles |
| POST | `/api/super-admin/admin-roles` | Create new admin role |
| GET | `/api/super-admin/admin-roles/:id` | Get admin role details |
| PUT | `/api/super-admin/admin-roles/:id` | Update admin role |
| DELETE | `/api/super-admin/admin-roles/:id` | Delete admin role |
| POST | `/api/super-admin/admin-roles/:id/suspend` | Suspend admin |
| POST | `/api/super-admin/admin-roles/:id/reinstate` | Reinstate admin |

### 4.2 Platform Settings

| Method | Path | Description |
|---|---|---|
| GET | `/api/super-admin/settings/system` | Get system settings |
| PUT | `/api/super-admin/settings/system` | Update system settings |
| GET | `/api/super-admin/settings/feature-flags` | Get all feature flags |
| PUT | `/api/super-admin/settings/feature-flags/:key` | Toggle feature flag |

### 4.3 System Operations

| Method | Path | Description |
|---|---|---|
| GET | `/api/super-admin/system/health` | System health check |
| GET | `/api/super-admin/system/database-stats` | Database statistics |
| POST | `/api/super-admin/system/migrations/:name` | Run migration |
| GET | `/api/super-admin/system/audit-logs` | View audit logs |

### 4.4 User Management (Elevated)

| Method | Path | Description |
|---|---|---|
| POST | `/api/super-admin/users/:id/impersonate` | Impersonate user |
| POST | `/api/super-admin/users/:id/force-logout` | Force user logout |
| POST | `/api/super-admin/users/bulk-suspend` | Bulk suspend users |

### 4.5 API Management

| Method | Path | Description |
|---|---|---|
| POST | `/api/super-admin/api-keys` | Generate API key |
| GET | `/api/super-admin/api-keys` | List API keys |
| DELETE | `/api/super-admin/api-keys/:id` | Revoke API key |

---

## 5. Permissions Matrix

### 5.1 Super Admin — All Permissions

```typescript
[UserRole.SUPER_ADMIN]: Object.values(Permission),  // Everything
```

### 5.2 Permission Breakdown

| Domain | Permissions | Count |
|---|---|---|
| Platform | `platform:settings`, `platform:users_manage`, `platform:admins_manage` | 3 |
| Events | `event:*` (create, read, update, delete, publish, approve, reject, feature) | 8 |
| Bookings | `booking:*` (create, read, cancel, refund) | 4 |
| Students | `student:*` (create, read, update, delete, bulk_import) | 5 |
| Certificates | `certificate:*` (generate, read, download, bulk_send) | 4 |
| Payments | `payment:*`, `payout:*`, `commission:*`, `revenue:*` | 9 |
| LMS | `course:*`, `grade:assign`, `attendance:mark` | 5 |
| ERP | `invoice:*`, `report:view`, `settings:manage` | 4 |
| Content | `blog:*`, `media:*`, `banners:*`, `popups:*`, `announcements:*`, `reels:*`, `homepage:*`, `seo_content:*` | 15 |
| Schools/Vendors | `school:*`, `vendor:*` | 4 |
| Reviews/Complaints | `review:moderate`, `complaint:*` | 3 |
| Support | `ticket:*` | 2 |
| Analytics | `analytics:*` | 2 |
| **Total** | | **68+** |

---

## 6. Dashboard Layout

### 6.1 Navigation Structure

```
Super Admin Navigation
├── 📊 Dashboard              — System overview, stats, charts
├── 👥 Admin Management       — CRUD admin roles, permissions
│   ├── All Admins
│   ├── Create Admin
│   └── Permission Templates
├── 🏢 Vendors                — Manage all vendors
├── 🏫 Schools                — Manage all schools
├── 👤 Users                  — Platform-wide user management
├── 📅 Events                 — All events across platform
├── 💰 Revenue                — Financial overview
│   ├── Revenue Dashboard
│   ├── Payouts
│   ├── Commissions
│   └── Reports
├── 🔧 System                 — System operations
│   ├── System Health
│   ├── Database Stats
│   ├── Feature Flags
│   └── Migrations
├── 🔐 Security               — Security controls
│   ├── API Keys
│   ├── Audit Logs
│   ├── Session Management
│   └── IP Whitelist
├── 📋 Activity               — Platform activity
│   ├── Audit Trail
│   ├── Login History
│   └── Error Logs
└── ⚙️ Settings               — Platform settings
    ├── General
    ├── Email/SMS
    ├── Payment Gateways
    └── Integrations
```

### 6.2 Dashboard Widgets

| Widget | Data Source | Refresh |
|---|---|---|
| Total Users | User.countDocuments() | 5 min |
| Active Events | Event.countDocuments({ status: 'active' }) | 5 min |
| Revenue (30d) | RevenueTransaction.aggregate() | 15 min |
| System Health | Health check endpoint | 1 min |
| Recent Activities | AuditLog.find().limit(10) | Real-time |
| Queue Status | BullMQ queue.getJobCounts() | 1 min |
| Error Rate | Error logs aggregation | 5 min |
| Pending Approvals | Events/Schools/Vendors with pending status | Real-time |

---

## 7. Security Considerations

### 7.1 Authentication

- **Mandatory 2FA** — Super admin accounts require two-factor authentication
- **Session limits** — Maximum 3 concurrent sessions per super admin
- **IP whitelisting** — Optional IP restriction for super admin access
- **Backup codes** — Generated during 2FA setup, stored encrypted

### 7.2 Authorization

- **No privilege escalation** — Super admin cannot create another super admin
- **Audit all actions** — Every super admin action is logged with full context
- **Impersonation logging** — User impersonation is logged with start/end times
- **Time-limited sessions** — Super admin sessions expire after 4 hours of inactivity

### 7.3 Data Protection

- **Sensitive data masking** — Passwords, tokens, PII masked in audit logs
- **Export restrictions** — Data exports require additional confirmation
- **Bulk operation limits** — Max 1000 users per bulk operation
- **Soft deletes only** — Super admin cannot hard delete platform data

### 7.4 Emergency Controls

- **Kill switch** — Ability to suspend all vendor/school operations
- **Maintenance mode** — Toggle platform-wide maintenance mode
- **Emergency logout** — Force logout all users platform-wide
- **Database backup trigger** — Manual backup before dangerous operations

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `SuperAdminProfile` model
- [ ] Create `super-admin.service.ts` with core methods
- [ ] Create `super-admin.controller.ts` with thin handlers
- [ ] Create `super-admin.routes.ts` with all endpoints
- [ ] Add `requireSuperAdmin` middleware
- [ ] Add audit logging middleware for super admin actions
- [ ] Create seed script for initial super admin account

### Phase 2: Admin Management (Week 2)
- [ ] Admin role CRUD API endpoints
- [ ] Admin role assignment with scope restrictions
- [ ] Admin suspension/reinstatement
- [ ] Permission templates for admin sub-roles
- [ ] Frontend: AdminManagementPage with data table
- [ ] Frontend: CreateAdminRolePage with form
- [ ] Frontend: AdminRoleDetailPage

### Phase 3: System Operations (Week 3)
- [ ] System health check endpoint
- [ ] Database statistics endpoint
- [ ] Feature flags CRUD
- [ ] Migration runner endpoint
- [ ] Audit logs endpoint with filtering
- [ ] Frontend: SystemHealthPage with charts
- [ ] Frontend: FeatureFlagsPage with toggles
- [ ] Frontend: AuditLogsPage with filters

### Phase 4: Elevated Operations (Week 4)
- [ ] User impersonation with audit trail
- [ ] Force logout endpoint
- [ ] Bulk suspend users
- [ ] API key management
- [ ] Frontend: ImpersonateUserPage
- [ ] Frontend: ApiKeysPage
- [ ] Frontend: BulkActionsPage

### Phase 5: Dashboard & Polish (Week 5)
- [ ] SuperAdminDashboardPage with all widgets
- [ ] Real-time stats via WebSocket
- [ ] Revenue charts
- [ ] System health monitoring
- [ ] Quick actions panel
- [ ] Responsive design
- [ ] Dark mode support
- [ ] Loading states + error boundaries

### Phase 6: Security Hardening (Week 6)
- [ ] 2FA enforcement for super admin
- [ ] Session management
- [ ] IP whitelisting
- [ ] Audit log export
- [ ] Emergency controls
- [ ] Penetration testing
- [ ] Security audit

---

## Appendix: File Structure

### Backend

```
backend/src/modules/admin/
├── super-admin-profile.model.ts      # Super admin profile schema
├── admin-role.model.ts               # Admin role schema (existing)
├── super-admin.service.ts            # Super admin business logic
├── super-admin.controller.ts         # Thin HTTP handlers
├── super-admin.routes.ts             # Route definitions
├── super-admin.validator.ts          # Request validation
├── super-admin.types.ts              # TypeScript types
├── audit-log.model.ts                # Audit log schema
├── feature-flag.model.ts             # Feature flag schema
└── index.ts                          # Barrel export
```

### Frontend

```
frontend/src/
├── pages/admin/
│   ├── SuperAdminDashboardPage.tsx   # Main dashboard
│   ├── AdminManagementPage.tsx       # Admin CRUD
│   ├── AdminRoleDetailPage.tsx       # Admin details
│   ├── CreateAdminRolePage.tsx       # Create admin form
│   ├── SystemSettingsPage.tsx        # Platform settings
│   ├── FeatureFlagsPage.tsx          # Feature toggles
│   ├── SystemHealthPage.tsx          # Health monitoring
│   ├── AuditLogsPage.tsx             # Audit trail
│   ├── ApiKeysPage.tsx               # API key management
│   ├── ImpersonateUserPage.tsx       # User impersonation
│   └── BulkActionsPage.tsx           # Bulk operations
├── features/admin/
│   ├── hooks/
│   │   └── useSuperAdmin.ts          # React Query hooks
│   ├── services/
│   │   └── superAdmin.service.ts     # API service layer
│   └── types/
│       └── superAdmin.types.ts       # TypeScript types
└── app/routes/
    └── super-admin.routes.tsx        # Route configuration
```

---

**Document Version:** 1.0
**Last Updated:** 2026-04-04
**Status:** Plan Complete — Ready for Implementation
**Next Action:** Begin Phase 1 (Foundation)
