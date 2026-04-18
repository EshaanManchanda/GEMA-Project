# GEMA — Authentication, Roles & Platform Expansion Plan

> Complete redesign of the role system to support: **customer/student/parent, vendor, employee, school, teacher**
> Plus integration of ERP, LMS, Student Portal, and Certificate Generator into the GEMA platform.
> **Last Updated: 2026-04-04 (Post-Implementation)**

---

## Current State — UPDATED

| Aspect | Status | Notes |
|---|---|---|
| **Roles** | ✅ 14 roles implemented | SUPER_ADMIN, ADMIN, MODERATOR, BLOG_WRITER, SUPPORT_AGENT, CONTENT_MANAGER, FINANCE_MANAGER, CUSTOMER, VENDOR, EMPLOYEE, SCHOOL, TEACHER, STUDENT, PARENT |
| **Employee** | ✅ Works under Vendor OR School | vendorId optional, schoolId added |
| **Teacher** | ✅ Linked to School | schoolId added to Teacher model |
| **School** | ✅ First-class entity | School model + CRUD API + invites |
| **Student/Parent** | ✅ Backend models created | Student + Parent models + CRUD APIs |
| **Auth bugs** | ✅ Fixed | `"student"` → UserRole.STUDENT, `"user"` → UserRole.CUSTOMER |
| **"superadmin"** | ✅ Fixed | Replaced with UserRole.SUPER_ADMIN in all route files |
| **Auth methods** | ✅ JWT + Firebase + role switching | `/auth/switch-role`, `/auth/available-roles` endpoints |
| **Permissions** | ✅ RBAC implemented | 50+ permissions, `requirePermission()` middleware |
| **Certificate Generator** | ❌ Still WP plugin | Phase 2 — needs migration to GEMA module |
| **Student Portal** | ❌ Still WP plugin | Phase 3 — needs migration to GEMA module |

### Architecture — COMPLETED
| Metric | Before | After |
|---|---|---|
| Flat controllers/ | 63 files | 0 (deleted) |
| Flat services/ | 40 files | 0 (deleted) |
| Flat models/ | 51 files | 1 barrel (index.ts) |
| Modules | 0 | 35 modules (291 files) |
| TypeScript errors | 101 | 0 |

---

## 1. New Role Architecture

### 1.1 Role Hierarchy

```
Super Admin (full platform access)
├── Admin (platform operations)
│   ├── Moderator (content approval)
│   │   ├── Approve/reject events
│   │   ├── Approve/reject schools
│   │   ├── Approve/reject vendors
│   │   └── Moderate reviews & complaints
│   ├── Blog Writer (content management)
│   │   ├── Write/edit/publish blogs
│   │   ├── Manage blog categories
│   │   ├── Manage blog comments
│   │   └── Manage SEO content
│   ├── Support Agent (helpdesk)
│   │   ├── Manage support tickets
│   │   ├── Handle complaints
│   │   └── Manage user inquiries
│   ├── Content Manager (media & pages)
│   │   ├── Manage banners & popups
│   │   ├── Manage homepage sections
│   │   ├── Manage announcements
│   │   └── Manage reels & media
│   └── Finance Manager (revenue)
│       ├── View revenue reports
│       ├── Manage payouts
│       ├── Manage commissions
│       └── Export financial data
├── Vendor (event organizer)
│   └── Employee (works under vendor)
│       ├── Manager
│       ├── Scanner
│       ├── Coordinator
│       └── Security
├── School (educational institution)
│   └── Teacher (works under school)
│       └── Employee (school staff — optional)
├── Customer (general public / event attendee)
├── Student (enrolled in events/courses)
│   └── linked to: Parent (guardian)
└── Parent (guardian of students)
    └── linked to: Student(s)
```

### 1.2 Role Definitions

| Role | Description | Can | Cannot |
|---|---|---|---|
| **super_admin** | Full platform owner | Everything — manage admins, platform settings, view all data | — |
| **admin** | Platform administrator | Manage vendors, schools, users, events, system settings | Manage other admins, delete platform |
| **moderator** | Content approver | Approve/reject events, schools, vendors, moderate reviews/complaints | Create content, manage payments, system settings |
| **blog_writer** | Blog/content writer | Write, edit, publish blogs, manage blog categories/comments, SEO content | Manage events, users, payments, system settings |
| **support_agent** | Customer support | Manage support tickets, handle complaints, respond to inquiries | Manage events, users, payments, system settings |
| **content_manager** | Media & page manager | Manage banners, popups, homepage, announcements, reels, media | Write blogs, manage events, users, payments |
| **finance_manager** | Revenue manager | View revenue reports, manage payouts, manage commissions, export data | Manage events, users, blogs, system settings |
| **vendor** | Event organizer/business | Create/manage events, manage employees, view own analytics | Access other vendors' data, admin settings |
| **employee** | Vendor staff member | Check-in tickets, manage assigned events, scan QR codes | Create events, access payments |
| **school** | Educational institution | Manage teachers, view school-wide analytics, bulk student registration | Create public events (unless also a vendor) |
| **teacher** | Educator (under a school) | Create educational events, manage own bookings, view own earnings | Access school-wide data, manage other teachers |
| **customer** | General public / event attendee | Browse events, book tickets, leave reviews, manage favorites | Create events, access admin/vendor dashboards |
| **student** | Enrolled participant | View enrolled events, download certificates, view attendance | Book events (parent does this), access admin |
| **parent** | Guardian of students | Book events for children, view children's certificates/attendance, manage student profiles | Access other parents' data |

### 1.3 Role vs Profile Distinction

**Critical design decision:** A single User can have MULTIPLE roles/profiles.

```
User: john@school.ae
├── Role: "school" (School profile)
│   └── School: "Dubai International Academy"
└── Role: "customer" (also books events personally)

User: sarah@parent.com
├── Role: "parent" (Parent profile)
│   └── Children: [Student A, Student B]
└── Role: "customer" (also books events for herself)

User: mike@vendor.com
├── Role: "vendor" (Vendor profile)
│   └── Vendor: "Adventure Sports Co"
└── Role: "teacher" (also teaches on weekends)
    └── School: "Dubai International Academy"
```

**Implementation:** Use a **primary role** on User + **separate profile models** for each entity type.

---

## 2. New & Updated Data Models

### 2.1 Updated UserRole Enum

```typescript
// models/User.ts
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  BLOG_WRITER = "blog_writer",
  SUPPORT_AGENT = "support_agent",
  CONTENT_MANAGER = "content_manager",
  FINANCE_MANAGER = "finance_manager",
  CUSTOMER = "customer",
  VENDOR = "vendor",
  EMPLOYEE = "employee",
  SCHOOL = "school",
  TEACHER = "teacher",
  STUDENT = "student",
  PARENT = "parent",
}
```

### 2.2 New School Model

```typescript
// models/School.ts
export enum SchoolType {
  PUBLIC = "public",
  PRIVATE = "private",
  CHARTER = "charter",
  INTERNATIONAL = "international",
  HOMESCHOOL = "homeschool",
  TRAINING_CENTER = "training_center",
}

export enum SchoolVerificationStatus {
  VERIFIED = "verified",
  PENDING = "pending",
  UNVERIFIED = "unverified",
  REJECTED = "rejected",
}

export interface ISchool extends Document {
  userId: mongoose.Types.ObjectId;        // Links to User with role: "school"
  schoolName: string;
  schoolType: SchoolType;
  description?: string;
  logo?: string;
  coverImage?: string;

  // Contact
  email: string;
  phone: string;
  website?: string;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };

  // Academic
  curriculum?: string[];                  // ["IB", "British", "American", "CBSE", etc.]
  gradeLevels?: string[];                 // ["KG", "Grade 1", ..., "Grade 12"]
  studentCount?: number;
  teacherCount?: number;
  academicYear?: { start: Date; end: Date };

  // Admin
  principalName?: string;
  adminContactPerson?: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };

  // Verification
  verificationStatus: SchoolVerificationStatus;
  verificationDocuments?: {
    license?: { url: string; uploadedAt: Date; status: string };
    accreditation?: { url: string; uploadedAt: Date; status: string };
  };

  // Subscription
  subscription: {
    plan: "free" | "basic" | "premium" | "enterprise";
    status: "active" | "inactive" | "expired" | "trial";
    paidUntil?: Date;
    features: string[];
  };

  // Settings
  settings: {
    allowTeacherSelfRegistration: boolean;
    requireParentApprovalForBookings: boolean;
    autoGenerateCertificates: boolean;
    certificateTemplateId?: mongoose.Types.ObjectId;
    enableLMS: boolean;
    enableERP: boolean;
  };

  // Stats
  stats: {
    totalTeachers: number;
    totalStudents: number;
    totalEvents: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };

  isActive: boolean;
  isSuspended: boolean;
  slug: string;
  memberSince: Date;
}
```

### 2.3 Updated Teacher Model — Add schoolId

```diff
// models/Teacher.ts
export interface ITeacher extends Document {
  userId: mongoose.Types.ObjectId;
+ schoolId: mongoose.Types.ObjectId;      // NEW — links to School
  // ... existing fields ...
}
```

```diff
TeacherSchema = new Schema<ITeacher>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
+ schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
  // ... rest unchanged ...
});

+ TeacherSchema.index({ schoolId: 1, verificationStatus: 1 });
+ TeacherSchema.index({ schoolId: 1, isActive: 1 });
```

### 2.4 New Student Model

```typescript
// models/Student.ts
export enum EnrollmentStatus {
  ACTIVE = "active",
  GRADUATED = "graduated",
  TRANSFERRED = "transferred",
  WITHDRAWN = "withdrawn",
  SUSPENDED = "suspended",
}

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;         // Links to User with role: "student"
  schoolId: mongoose.Types.ObjectId;       // Primary school affiliation
  parentIds: mongoose.Types.ObjectId[];    // Links to Parent users

  // Personal
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender?: "male" | "female" | "other";
  photo?: string;

  // Academic
  studentId: string;                       // School-assigned ID
  grade: string;                           // "Grade 5", "KG2", etc.
  section?: string;                        // "A", "B", etc.
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate: Date;
  graduationDate?: Date;

  // Medical
  medicalInfo?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };

  // Academic Record
  academicRecord?: Array<{
    academicYear: string;
    grade: string;
    section: string;
    gpa?: number;
    attendance: {
      present: number;
      absent: number;
      late: number;
    };
    conduct: string;
  }>;

  // Event Participation
  stats: {
    totalEventsAttended: number;
    totalCertificatesEarned: number;
    totalCoursesCompleted: number;
    totalHoursLearned: number;
  };

  // LMS
  lmsProfile?: {
    currentCourses: mongoose.Types.ObjectId[];
    completedCourses: mongoose.Types.ObjectId[];
    totalCredits: number;
    gpa: number;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.5 New Parent Model

```typescript
// models/Parent.ts
export interface IParent extends Document {
  userId: mongoose.Types.ObjectId;         // Links to User with role: "parent"
  studentIds: mongoose.Types.ObjectId[];   // Links to Student profiles

  // Personal
  firstName: string;
  lastName: string;
  phone: string;
  photo?: string;

  // Relationship
  relationshipToStudents: Array<{
    studentId: mongoose.Types.ObjectId;
    relationship: "father" | "mother" | "guardian" | "other";
    isPrimary: boolean;
    hasBookingPermission: boolean;
    hasViewAccess: boolean;
  }>;

  // Preferences
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      bookingConfirmation: boolean;
      eventReminders: boolean;
      certificateReady: boolean;
      attendanceAlerts: boolean;
      gradeReports: boolean;
    };
  };

  // Billing
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Stats
  stats: {
    totalBookings: number;
    totalSpent: number;
    childrenEnrolled: number;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.6 Updated Employee Model — Add schoolEmployee option

```diff
// models/Employee.ts
export interface IEmployee extends Document {
  vendorId?: Types.ObjectId;              // Make optional — can work under vendor OR school
+ schoolId?: Types.ObjectId;              // NEW — for school staff
  userId: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
- role: "manager" | "scanner" | "coordinator" | "security";
+ role: "manager" | "scanner" | "coordinator" | "security" | "admin" | "teacher_assistant" | "librarian" | "counselor";
  // ... rest unchanged ...
}
```

### 2.7 Updated Event Model — Add schoolId

```diff
// models/Event.ts
export interface IEvent extends Document {
  vendorId?: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
+ schoolId?: mongoose.Types.ObjectId;     // NEW — for school-hosted events
  // ... existing fields ...
}
```

### 2.8 Updated User Model — Add schoolId, parentId, studentId references

```diff
// models/User.ts
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  BLOG_WRITER = "blog_writer",
  SUPPORT_AGENT = "support_agent",
  CONTENT_MANAGER = "content_manager",
  FINANCE_MANAGER = "finance_manager",
  CUSTOMER = "customer",
  VENDOR = "vendor",
  EMPLOYEE = "employee",
  SCHOOL = "school",
  TEACHER = "teacher",
  STUDENT = "student",
  PARENT = "parent",
}

export interface IUser extends Document {
  // ... existing fields ...
+ // Profile references (only one will be populated based on role)
+ vendorId?: mongoose.Types.ObjectId;
+ schoolId?: mongoose.Types.ObjectId;
+ teacherProfileId?: mongoose.Types.ObjectId;
+ employeeProfileId?: mongoose.Types.ObjectId;
+ studentProfileId?: mongoose.Types.ObjectId;
+ parentProfileId?: mongoose.Types.ObjectId;
}
```

### 2.9 Admin Sub-Role Model

```typescript
// models/AdminRole.ts

export enum AdminRoleType {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  BLOG_WRITER = "blog_writer",
  SUPPORT_AGENT = "support_agent",
  CONTENT_MANAGER = "content_manager",
  FINANCE_MANAGER = "finance_manager",
}

export interface IAdminRole extends Document {
  userId: mongoose.Types.ObjectId;
  role: AdminRoleType;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;

  // Custom permissions (override defaults)
  customPermissions?: Permission[];
  revokedPermissions?: Permission[];

  // Scope (what they can access)
  scope: {
    eventCategories?: string[];         // Moderator: only moderate specific categories
    blogCategories?: string[];          // Blog writer: only write in specific categories
    ticketCategories?: string[];        // Support agent: only handle specific ticket types
    regions?: string[];                 // Finance manager: only view specific regions
  };

  // Status
  isActive: boolean;
  expiresAt?: Date;                     // Temporary roles
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Authentication Improvements

### 3.1 Multi-Role Login

Users with multiple profiles need role switching after login:

```
POST /api/auth/login
→ Returns: { user, roles: ["customer", "parent"], activeRole: "customer" }

POST /api/auth/switch-role
Body: { role: "parent" }
→ Returns: { user, activeRole: "parent", dashboardUrl: "/parent/dashboard" }
```

### 3.2 Registration Flows

| Flow | Endpoint | Creates |
|---|---|---|
| Public registration | `POST /api/auth/register` | User (role: customer) |
| Student registration | `POST /api/auth/register/student` | User (role: student) + Student profile |
| Parent registration | `POST /api/auth/register/parent` | User (role: parent) + Parent profile |
| School registration | `POST /api/auth/register/school` | User (role: school) + School profile (pending approval) |
| Teacher registration (self) | `POST /api/auth/register/teacher` | User (role: teacher) + Teacher profile (pending school approval) |
| Teacher registration (school invites) | `POST /api/auth/invite/teacher` | Invite email → Teacher creates account |
| Student bulk import | `POST /api/admin/schools/:id/students/bulk` | CSV import → Users + Student profiles |
| Vendor registration | `POST /api/auth/register/vendor` | User (role: vendor) + Vendor profile (pending approval) |
| Employee creation | `POST /api/vendors/employees` | User (role: employee) + Employee profile |

### 3.3 School Invite System

```typescript
// models/SchoolInvite.ts
export interface ISchoolInvite extends Document {
  schoolId: mongoose.Types.ObjectId;
  email: string;
  role: "teacher" | "employee" | "student" | "parent";
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  metadata?: {
    grade?: string;
    section?: string;
    subject?: string;
    parentId?: mongoose.Types.ObjectId;
  };
}
```

### 3.4 OAuth2 / SSO (Future)

```
POST /api/auth/oauth/:provider
→ Google, Microsoft, Apple SSO for schools using Google Workspace / Microsoft 365

POST /api/auth/saml
→ SAML 2.0 for enterprise school districts
```

### 3.5 API Key Auth (for WP plugins)

```
POST /api/auth/api-key
→ Generate API key for WP plugins to call GEMA backend
Header: X-API-Key: <key>
```

---

## 4. Permission System Upgrade

### 4.1 From Simple Roles to RBAC

Current: `authorize(["admin", "vendor"])` — flat role check

Target: **Role-Based Access Control** with granular permissions:

```typescript
// shared/permissions.ts
export enum Permission {
  // Platform Management
  PLATFORM_SETTINGS = "platform:settings",
  PLATFORM_USERS_MANAGE = "platform:users_manage",
  PLATFORM_ADMINS_MANAGE = "platform:admins_manage",

  // Events
  EVENT_CREATE = "event:create",
  EVENT_READ = "event:read",
  EVENT_UPDATE = "event:update",
  EVENT_DELETE = "event:delete",
  EVENT_PUBLISH = "event:publish",
  EVENT_APPROVE = "event:approve",
  EVENT_REJECT = "event:reject",
  EVENT_FEATURE = "event:feature",

  // Bookings
  BOOKING_CREATE = "booking:create",
  BOOKING_READ = "booking:read",
  BOOKING_CANCEL = "booking:cancel",
  BOOKING_REFUND = "booking:refund",

  // Students
  STUDENT_CREATE = "student:create",
  STUDENT_READ = "student:read",
  STUDENT_UPDATE = "student:update",
  STUDENT_DELETE = "student:delete",
  STUDENT_BULK_IMPORT = "student:bulk_import",

  // Certificates
  CERTIFICATE_GENERATE = "certificate:generate",
  CERTIFICATE_READ = "certificate:read",
  CERTIFICATE_DOWNLOAD = "certificate:download",
  CERTIFICATE_BULK_SEND = "certificate:bulk_send",

  // Payments
  PAYMENT_CREATE = "payment:create",
  PAYMENT_READ = "payment:read",
  PAYMENT_REFUND = "payment:refund",
  PAYOUT_APPROVE = "payout:approve",
  PAYOUT_READ = "payout:read",
  COMMISSION_READ = "commission:read",
  COMMISSION_MANAGE = "commission:manage",
  REVENUE_READ = "revenue:read",
  REVENUE_EXPORT = "revenue:export",

  // LMS
  COURSE_CREATE = "course:create",
  COURSE_READ = "course:read",
  COURSE_ENROLL = "course:enroll",
  GRADE_ASSIGN = "grade:assign",
  ATTENDANCE_MARK = "attendance:mark",

  // ERP
  INVOICE_CREATE = "invoice:create",
  INVOICE_READ = "invoice:read",
  REPORT_VIEW = "report:view",
  SETTINGS_MANAGE = "settings:manage",

  // Content — Blogs
  BLOG_CREATE = "blog:create",
  BLOG_READ = "blog:read",
  BLOG_UPDATE = "blog:update",
  BLOG_DELETE = "blog:delete",
  BLOG_PUBLISH = "blog:publish",
  BLOG_CATEGORIES_MANAGE = "blog:categories_manage",
  BLOG_COMMENTS_MODERATE = "blog:comments_moderate",

  // Content — Media
  MEDIA_UPLOAD = "media:upload",
  MEDIA_READ = "media:read",
  MEDIA_DELETE = "media:delete",
  BANNERS_MANAGE = "banners:manage",
  POPUPS_MANAGE = "popups:manage",
  ANNOUNCEMENTS_MANAGE = "announcements:manage",
  REELS_MANAGE = "reels:manage",
  HOMEPAGE_MANAGE = "homepage:manage",
  SEO_CONTENT_MANAGE = "seo_content:manage",

  // Schools & Vendors
  SCHOOL_APPROVE = "school:approve",
  SCHOOL_REJECT = "school:reject",
  VENDOR_APPROVE = "vendor:approve",
  VENDOR_REJECT = "vendor:reject",

  // Reviews & Complaints
  REVIEW_MODERATE = "review:moderate",
  COMPLAINT_READ = "complaint:read",
  COMPLAINT_MANAGE = "complaint:manage",

  // Support
  TICKET_READ = "ticket:read",
  TICKET_MANAGE = "ticket:manage",

  // Analytics
  ANALYTICS_READ = "analytics:read",
  ANALYTICS_EXPORT = "analytics:export",
}

// Role → Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Admin sub-roles
  [UserRole.SUPER_ADMIN]: Object.values(Permission),  // Everything
  [UserRole.ADMIN]: [
    Permission.PLATFORM_USERS_MANAGE,
    Permission.EVENT_READ, Permission.EVENT_UPDATE, Permission.EVENT_DELETE, Permission.EVENT_FEATURE,
    Permission.EVENT_APPROVE, Permission.EVENT_REJECT,
    Permission.SCHOOL_APPROVE, Permission.SCHOOL_REJECT,
    Permission.VENDOR_APPROVE, Permission.VENDOR_REJECT,
    Permission.STUDENT_CREATE, Permission.STUDENT_READ, Permission.STUDENT_UPDATE, Permission.STUDENT_DELETE, Permission.STUDENT_BULK_IMPORT,
    Permission.SETTINGS_MANAGE,
    Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
    Permission.REVIEW_MODERATE,
    Permission.COMPLAINT_MANAGE,
  ],
  [UserRole.MODERATOR]: [
    Permission.EVENT_READ, Permission.EVENT_APPROVE, Permission.EVENT_REJECT,
    Permission.SCHOOL_APPROVE, Permission.SCHOOL_REJECT,
    Permission.VENDOR_APPROVE, Permission.VENDOR_REJECT,
    Permission.REVIEW_MODERATE,
    Permission.COMPLAINT_READ, Permission.COMPLAINT_MANAGE,
    Permission.BLOG_COMMENTS_MODERATE,
  ],
  [UserRole.BLOG_WRITER]: [
    Permission.BLOG_CREATE, Permission.BLOG_READ, Permission.BLOG_UPDATE, Permission.BLOG_DELETE, Permission.BLOG_PUBLISH,
    Permission.BLOG_CATEGORIES_MANAGE,
    Permission.BLOG_COMMENTS_MODERATE,
    Permission.SEO_CONTENT_MANAGE,
    Permission.MEDIA_UPLOAD, Permission.MEDIA_READ,
  ],
  [UserRole.SUPPORT_AGENT]: [
    Permission.TICKET_READ, Permission.TICKET_MANAGE,
    Permission.COMPLAINT_READ, Permission.COMPLAINT_MANAGE,
    Permission.STUDENT_READ,
    Permission.BOOKING_READ,
    Permission.EVENT_READ,
  ],
  [UserRole.CONTENT_MANAGER]: [
    Permission.BANNERS_MANAGE, Permission.POPUPS_MANAGE,
    Permission.ANNOUNCEMENTS_MANAGE, Permission.REELS_MANAGE,
    Permission.HOMEPAGE_MANAGE,
    Permission.MEDIA_UPLOAD, Permission.MEDIA_READ, Permission.MEDIA_DELETE,
    Permission.BLOG_READ,
  ],
  [UserRole.FINANCE_MANAGER]: [
    Permission.PAYOUT_READ, Permission.PAYOUT_APPROVE,
    Permission.COMMISSION_READ, Permission.COMMISSION_MANAGE,
    Permission.REVENUE_READ, Permission.REVENUE_EXPORT,
    Permission.PAYMENT_READ, Permission.PAYMENT_REFUND,
    Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
    Permission.REPORT_VIEW,
  ],

  // External roles
  [UserRole.VENDOR]: [
    Permission.EVENT_CREATE, Permission.EVENT_READ, Permission.EVENT_UPDATE, Permission.EVENT_DELETE, Permission.EVENT_PUBLISH,
    Permission.BOOKING_READ, Permission.BOOKING_CANCEL,
    Permission.PAYMENT_READ,
    Permission.STUDENT_READ,
    Permission.CERTIFICATE_GENERATE, Permission.CERTIFICATE_READ, Permission.CERTIFICATE_BULK_SEND,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.SCHOOL]: [
    Permission.EVENT_CREATE, Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.STUDENT_CREATE, Permission.STUDENT_READ, Permission.STUDENT_UPDATE, Permission.STUDENT_BULK_IMPORT,
    Permission.CERTIFICATE_GENERATE, Permission.CERTIFICATE_READ, Permission.CERTIFICATE_BULK_SEND,
    Permission.REPORT_VIEW,
    Permission.COURSE_CREATE, Permission.COURSE_READ,
  ],
  [UserRole.TEACHER]: [
    Permission.EVENT_CREATE, Permission.EVENT_READ, Permission.EVENT_UPDATE,
    Permission.STUDENT_READ,
    Permission.CERTIFICATE_GENERATE, Permission.CERTIFICATE_READ,
    Permission.COURSE_CREATE, Permission.COURSE_READ,
    Permission.ATTENDANCE_MARK, Permission.GRADE_ASSIGN,
  ],
  [UserRole.EMPLOYEE]: [
    Permission.EVENT_READ,
    Permission.BOOKING_READ,
    Permission.STUDENT_READ,
  ],
  [UserRole.STUDENT]: [
    Permission.EVENT_READ,
    Permission.BOOKING_READ,
    Permission.CERTIFICATE_READ, Permission.CERTIFICATE_DOWNLOAD,
    Permission.COURSE_READ,
  ],
  [UserRole.PARENT]: [
    Permission.EVENT_READ,
    Permission.BOOKING_CREATE, Permission.BOOKING_READ, Permission.BOOKING_CANCEL,
    Permission.STUDENT_READ,
    Permission.CERTIFICATE_READ, Permission.CERTIFICATE_DOWNLOAD,
    Permission.PAYMENT_CREATE, Permission.PAYMENT_READ,
  ],
  [UserRole.CUSTOMER]: [
    Permission.EVENT_READ,
    Permission.BOOKING_CREATE, Permission.BOOKING_READ, Permission.BOOKING_CANCEL,
    Permission.CERTIFICATE_READ, Permission.CERTIFICATE_DOWNLOAD,
  ],
};
```

### 4.2 Updated Auth Middleware

```typescript
// middleware/permission.ts
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const userPermissions = ROLE_PERMISSIONS[req.user.role as UserRole] || [];

    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
    if (!hasPermission) {
      return next(new AppError("Not authorized to perform this action", 403));
    }

    next();
  };
};

// Usage:
// router.post('/events', authenticate, requirePermission(Permission.EVENT_CREATE), createEvent);
// router.get('/students/:id', authenticate, requirePermission(Permission.STUDENT_READ), getStudent);
```

### 4.3 Scope-Based Access

For data isolation (teachers only see their own students, etc.):

```typescript
// middleware/scope.ts
export const scopeToOwner = (resourceField: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role === UserRole.ADMIN) return next(); // Admins see everything

    const resource = await Model.findById(req.params.id);
    if (!resource) return next(new AppError("Resource not found", 404));

    // Check ownership
    const isOwner = (
      resource.userId?.toString() === req.user._id.toString() ||
      resource.vendorId?.toString() === req.user.vendorId?.toString() ||
      resource.schoolId?.toString() === req.user.schoolId?.toString() ||
      resource.teacherId?.toString() === req.user.teacherProfileId?.toString()
    );

    if (!isOwner) return next(new AppError("Not authorized to access this resource", 403));

    req.resource = resource;
    next();
  };
};
```

---

## 5. Platform Integration: ERP, LMS, Student Portal, Certificate Generator

### 5.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GEMA Platform (MERN)                           │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Event   │  │ Booking  │  │   Payment    │  │   Vendor Mgmt     │   │
│  │  Module  │  │  Module  │  │   Module     │  │   Module          │   │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘   │
│       │              │               │                    │              │
│  ┌────▼──────────────▼───────────────▼────────────────────▼──────────┐  │
│  │                    Shared Core Layer                               │  │
│  │  Auth | Users | Notifications | Media | Settings | Analytics       │  │
│  └────────────────────────────┬──────────────────────────────────────┘  │
│                               │                                         │
│  ┌────────────────────────────▼──────────────────────────────────────┐  │
│  │                  NEW MODULES                                       │  │
│  │                                                                   │  │
│  │  ┌────────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │    ERP     │  │   LMS    │  │  Student     │  │ Certificate│  │  │
│  │  │  Module    │  │  Module  │  │  Portal      │  │  Generator │  │  │
│  │  └────────────┘  └──────────┘  └──────────────┘  └────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 ERP Module

**Purpose:** School/business resource management — finance, HR, inventory, scheduling.

```
backend/src/modules/erp/
├── erp.controller.ts
├── erp.service.ts
├── erp.routes.ts
├── erp.types.ts
├── submodules/
│   ├── finance/
│   │   ├── invoice.model.ts
│   │   ├── invoice.service.ts
│   │   ├── payment-record.model.ts
│   │   └── financial-report.service.ts
│   ├── hr/
│   │   ├── staff.model.ts
│   │   ├── attendance.model.ts
│   │   ├── payroll.service.ts
│   │   └── leave-request.model.ts
│   ├── inventory/
│   │   ├── asset.model.ts
│   │   ├── inventory-item.model.ts
│   │   └── procurement.service.ts
│   └── scheduling/
│       ├── timetable.model.ts
│       ├── room-booking.model.ts
│       └── schedule-conflict.service.ts
└── index.ts
```

**Key Models:**

```typescript
// modules/erp/finance/invoice.model.ts
export interface IInvoice extends Document {
  schoolId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  type: "tuition" | "event" | "transport" | "uniform" | "other";
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: Date;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
}

// modules/erp/hr/attendance.model.ts
export interface IStaffAttendance extends Document {
  schoolId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  checkIn?: Date;
  checkOut?: Date;
  notes?: string;
}
```

**API Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/erp/schools/:id/invoices` | school, admin | List invoices |
| POST | `/api/erp/schools/:id/invoices` | school | Create invoice |
| GET | `/api/erp/schools/:id/invoices/:invoiceId` | school, parent | View invoice |
| POST | `/api/erp/schools/:id/invoices/:invoiceId/pay` | parent | Pay invoice |
| GET | `/api/erp/schools/:id/staff` | school, admin | List staff |
| POST | `/api/erp/schools/:id/staff/attendance` | school | Mark attendance |
| GET | `/api/erp/schools/:id/reports/financial` | school, admin | Financial report |
| GET | `/api/erp/schools/:id/timetable` | school, teacher, student | View timetable |

### 5.3 LMS Module

**Purpose:** Learning Management System — courses, lessons, assignments, grades, progress.

```
backend/src/modules/lms/
├── lms.controller.ts
├── lms.service.ts
├── lms.routes.ts
├── lms.types.ts
├── models/
│   ├── course.model.ts
│   ├── lesson.model.ts
│   ├── assignment.model.ts
│   ├── submission.model.ts
│   ├── grade.model.ts
│   ├── progress.model.ts
│   └── certificate-template.model.ts
├── services/
│   ├── course.service.ts
│   ├── enrollment.service.ts
│   ├── grading.service.ts
│   └── progress.service.ts
└── index.ts
```

**Key Models:**

```typescript
// modules/lms/models/course.model.ts
export interface ICourse extends Document {
  schoolId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  category: string;
  gradeLevel: string;
  credits: number;
  duration: { weeks: number; hoursPerWeek: number };
  status: "draft" | "published" | "archived";
  pricing: {
    type: "free" | "paid" | "subscription";
    amount?: number;
    currency?: string;
  };
  enrollment: {
    maxStudents?: number;
    enrolledCount: number;
    startDate: Date;
    endDate: Date;
    enrollmentOpen: boolean;
  };
  stats: {
    averageGrade: number;
    completionRate: number;
    totalStudents: number;
  };
}

// modules/lms/models/progress.model.ts
export interface ICourseProgress extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: "not_started" | "in_progress" | "completed" | "dropped";
  enrolledAt: Date;
  completedAt?: Date;
  lessonsCompleted: number;
  totalLessons: number;
  currentLesson?: mongoose.Types.ObjectId;
  grade?: {
    score: number;
    maxScore: number;
    letterGrade: string;
    gradedAt: Date;
    gradedBy: mongoose.Types.ObjectId;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
  };
}
```

**API Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/courses` | public | List published courses |
| POST | `/api/lms/courses` | school, teacher | Create course |
| GET | `/api/lms/courses/:id` | public | View course |
| POST | `/api/lms/courses/:id/enroll` | student, parent | Enroll in course |
| GET | `/api/lms/courses/:id/lessons` | enrolled | View lessons |
| POST | `/api/lms/courses/:id/lessons/:lessonId/complete` | student | Mark lesson complete |
| POST | `/api/lms/courses/:id/assignments` | teacher | Create assignment |
| POST | `/api/lms/courses/:id/assignments/:id/submit` | student | Submit assignment |
| POST | `/api/lms/courses/:id/assignments/:id/grade` | teacher | Grade submission |
| GET | `/api/lms/students/:id/progress` | student, parent, teacher | View progress |
| GET | `/api/lms/teachers/:id/courses` | teacher | Teacher's courses |

### 5.4 Student Portal Module

**Purpose:** Student/parent-facing portal — dashboard, enrollments, certificates, attendance, grades.

```
backend/src/modules/student-portal/
├── portal.controller.ts
├── portal.service.ts
├── portal.routes.ts
├── portal.types.ts
├── submodules/
│   ├── dashboard/
│   │   └── dashboard.service.ts     # Aggregated student/parent view
│   ├── enrollments/
│   │   └── enrollment.service.ts    # Event + course enrollments
│   ├── certificates/
│   │   └── certificate.service.ts   # View/download certificates
│   ├── attendance/
│   │   └── attendance.service.ts    # Attendance history
│   ├── grades/
│   │   └── grade.service.ts         # Grade reports
│   └── schedule/
│       └── schedule.service.ts      # Timetable, upcoming events
└── index.ts
```

**API Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/portal/student/dashboard` | student | Student dashboard |
| GET | `/api/portal/parent/dashboard` | parent | Parent dashboard (all children) |
| GET | `/api/portal/student/enrollments` | student | My enrollments |
| GET | `/api/portal/parent/children` | parent | My children |
| GET | `/api/portal/parent/children/:id/enrollments` | parent | Child's enrollments |
| GET | `/api/portal/student/certificates` | student | My certificates |
| GET | `/api/portal/parent/children/:id/certificates` | parent | Child's certificates |
| GET | `/api/portal/student/attendance` | student | My attendance |
| GET | `/api/portal/parent/children/:id/attendance` | parent | Child's attendance |
| GET | `/api/portal/student/grades` | student | My grades |
| GET | `/api/portal/parent/children/:id/grades` | parent | Child's grades |
| GET | `/api/portal/student/schedule` | student | My schedule |
| POST | `/api/portal/parent/children/:id/book-event` | parent | Book event for child |

### 5.5 Certificate Generator Module

**Purpose:** Migrate Certificate-Generator-v7 WP plugin into GEMA as a native module.

```
backend/src/modules/certificates/
├── certificates.controller.ts
├── certificates.service.ts
├── certificates.routes.ts
├── certificates.types.ts
├── models/
│   ├── certificate-template.model.ts
│   ├── certificate-record.model.ts
│   └── certificate-batch.model.ts
├── services/
│   ├── template.service.ts        # Template CRUD, variables
│   ├── generation.service.ts      # PDF generation (FPDF/Playwright)
│   ├── bulk-generation.service.ts # Bulk certificate creation
│   ├── email.service.ts           # Email certificates
│   └── export.service.ts          # CSV/PDF export
├── generators/
│   ├── pdf.generator.ts           # FPDF-based PDF generation
│   ├── image.generator.ts         # PNG/JPG certificate
│   └── qr-embedder.ts             # Embed verification QR code
└── index.ts
```

**Key Models:**

```typescript
// modules/certificates/models/certificate-template.model.ts
export interface ICertificateTemplate extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: "attendance" | "completion" | "achievement" | "participation" | "excellence";
  design: {
    layout: string;              // Template identifier
    backgroundColor?: string;
    borderColor?: string;
    logoUrl?: string;
    sealUrl?: string;
    signatureFields: Array<{
      label: string;
      title: string;
      imageUrl?: string;
    }>;
  };
  variables: Array<{
    key: string;                 // {{student_name}}, {{event_name}}, etc.
    label: string;
    type: "text" | "date" | "number" | "image";
    required: boolean;
  }>;
  isActive: boolean;
  usageCount: number;
}

// modules/certificates/models/certificate-record.model.ts
export interface ICertificateRecord extends Document {
  templateId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;  // User who issued it
  certificateNumber: string;          // Unique cert number
  verificationCode: string;           // For QR code verification
  variables: Record<string, any>;     // Resolved template variables
  pdfUrl?: string;
  imageUrl?: string;
  status: "pending" | "generated" | "sent" | "downloaded";
  sentAt?: Date;
  downloadedAt?: Date;
  verificationUrl: string;            // Public URL for verification
}
```

**API Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/certificates/templates` | school, vendor, admin | List templates |
| POST | `/api/certificates/templates` | school, vendor, admin | Create template |
| GET | `/api/certificates/templates/:id` | school, vendor, admin | View template |
| POST | `/api/certificates/generate` | school, vendor, teacher | Generate single certificate |
| POST | `/api/certificates/generate/bulk` | school, vendor, admin | Bulk generate |
| GET | `/api/certificates/:id` | student, parent, admin | View certificate |
| GET | `/api/certificates/:id/download` | student, parent | Download PDF |
| GET | `/api/certificates/verify/:code` | public | Verify certificate (QR scan) |
| POST | `/api/certificates/:id/send` | school, vendor | Email certificate |
| GET | `/api/certificates/stats` | school, vendor, admin | Certificate statistics |

---

## 6. Frontend Architecture for New Modules

### 6.1 New Route Namespaces

```
/                          → Public + Customer
/customer/*                → Customer dashboard
/student/*                 → Student portal (guarded: student role)
/parent/*                  → Parent portal (guarded: parent role)
/vendor/*                  → Vendor dashboard (unchanged)
/teacher/*                 → Teacher dashboard (updated: under school)
/school/*                  → School admin dashboard (NEW)
/employee/*                → Employee portal (updated: vendor + school employees)
/admin/*                   → Platform admin (unchanged)
```

### 6.2 New Frontend Apps

```
frontend/
├── src/
│   ├── apps/                    # Multi-app architecture
│   │   ├── public/              # Public site (events, blogs, etc.)
│   │   ├── customer/            # Customer dashboard
│   │   ├── student/             # Student portal (NEW)
│   │   ├── parent/              # Parent portal (NEW)
│   │   ├── vendor/              → Vendor dashboard (existing)
│   │   ├── teacher/             → Teacher dashboard (existing, updated)
│   │   ├── school/              → School admin (NEW)
│   │   ├── employee/            → Employee portal (existing, updated)
│   │   └── admin/               → Platform admin (existing)
│   ├── shared/                  → Shared components, services, utils
│   └── features/                → Feature modules (events, bookings, payments, etc.)
```

### 6.3 New Route Guards

```typescript
// app/routes/guards/StudentRoute.tsx
export const StudentRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== UserRole.STUDENT) return <Navigate to="/login" />;
  return <>{children}</>;
};

// app/routes/guards/ParentRoute.tsx
export const ParentRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== UserRole.PARENT) return <Navigate to="/login" />;
  return <>{children}</>;
};

// app/routes/guards/SchoolRoute.tsx
export const SchoolRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== UserRole.SCHOOL) return <Navigate to="/login" />;
  return <>{children}</>;
};
```

---

## 7. Migration Strategy — UPDATED

### Phase 1: Foundation ✅ COMPLETED (April 4, 2026)

1. ✅ **Update UserRole enum** — added 9 new roles (SUPER_ADMIN, MODERATOR, BLOG_WRITER, SUPPORT_AGENT, CONTENT_MANAGER, FINANCE_MANAGER, SCHOOL, STUDENT, PARENT)
2. ✅ **Fix auth bugs** — `"student"` → UserRole.STUDENT, `"user"` → UserRole.CUSTOMER, `"superadmin"` → UserRole.SUPER_ADMIN
3. ✅ **Create School model** — with all fields, SchoolInvite model, CRUD API
4. ✅ **Create Student model** — with schoolId, parentIds, academic record, CRUD API
5. ✅ **Create Parent model** — with studentIds, relationship mapping, CRUD API
6. ✅ **Update Teacher model** — added `schoolId` field + indexes
7. ✅ **Update User model** — added 6 profile reference fields (vendorId, schoolId, teacherProfileId, employeeProfileId, studentProfileId, parentProfileId)
8. ✅ **Update Employee model** — made `vendorId` optional, added `schoolId`, expanded role options
9. ✅ **Update Event model** — added `schoolId` field
10. ✅ **Create database migration script** — `scripts/migrations/add-new-roles-and-schools.ts`

### Phase 2: Auth & Registration ✅ COMPLETED (April 4, 2026)

1. ✅ **Student registration endpoint** — `POST /api/auth/register/student`
2. ✅ **Parent registration endpoint** — `POST /api/auth/register/parent`
3. ✅ **School registration** — `POST /api/schools/` (with pending approval)
4. ✅ **School invite system** — `POST /api/schools/:id/invites`, `POST /api/schools/invites/accept`
5. ✅ **Role switching** — `POST /api/auth/switch-role`, `GET /api/auth/available-roles`
6. ✅ **RBAC permission system** — 50+ permissions, `requirePermission()` middleware
7. ✅ **scopeToOwner middleware** — data isolation by ownership

### Phase 3: Architecture Migration ✅ COMPLETED (April 4, 2026)

1. ✅ **Modular monolith** — 35 modules created from flat structure
2. ✅ **Delete flat directories** — controllers/ and services/ deleted
3. ✅ **Barrel exports** — models/index.ts and routes/index.ts re-export from modules/
4. ✅ **registerModules()** — server.ts uses modular route registration
5. ✅ **TypeScript** — 0 compilation errors
6. ✅ **No duplicate files** — every file in exactly one location

### Remaining Phases (Unchanged)
2. **School invite system** — invite teachers, students, parents
3. **Multi-role login** — return available roles, support role switching
4. **Updated route guards** — StudentRoute, ParentRoute, SchoolRoute
5. **Updated frontend role types** — add new roles to `roleRedirect.ts`
6. **Admin user management** — CRUD for new role types

### Phase 3: Permission System (1 week)

1. **Create Permission enum** — all permissions listed above
2. **Create ROLE_PERMISSIONS mapping** — role → permissions
3. **Create requirePermission middleware** — replace authorize() calls
4. **Create scopeToOwner middleware** — data isolation
5. **Update all existing routes** — use new permission system
6. **Test all authorization paths** — ensure no regressions

### Phase 4: Certificate Generator Module (2 weeks)

1. **Create certificate models** — template, record, batch
2. **Migrate FPDF logic** — from WP plugin to Node.js (use pdf-lib or Playwright)
3. **Create certificate API** — CRUD, generate, bulk, email, verify
4. **Create admin UI** — template builder, bulk generation, stats
5. **Create student portal UI** — view/download certificates
6. **Create verification endpoint** — public QR code verification
7. **Migrate existing certificates** — WP plugin data → GEMA database

### Phase 5: Student Portal Module (2 weeks)

1. **Create student portal API** — dashboard, enrollments, certificates, attendance, grades
2. **Create parent portal API** — children management, booking for children
3. **Create student portal UI** — dashboard, schedule, certificates
4. **Create parent portal UI** — children dashboard, booking, certificates
5. **Integrate with existing booking flow** — parent can book for children
6. **Integrate with certificate module** — student/parent can view certificates

### Phase 6: LMS Module (3-4 weeks)

1. **Create LMS models** — course, lesson, assignment, submission, grade, progress
2. **Create LMS API** — course CRUD, enrollment, lessons, assignments, grading
3. **Create LMS UI (teacher)** — course builder, lesson management, grading
4. **Create LMS UI (student)** — course catalog, lesson viewer, assignment submission
5. **Create LMS UI (school admin)** — course oversight, teacher assignments
6. **Integrate with event system** — courses as a special event type
7. **Integrate with certificate module** — auto-generate completion certificates

### Phase 7: ERP Module (3-4 weeks)

1. **Create ERP finance models** — invoice, payment record
2. **Create ERP HR models** — staff, attendance, payroll, leave
3. **Create ERP API** — invoicing, payments, staff management, reports
4. **Create ERP UI (school admin)** — dashboard, finance, HR, reports
5. **Create ERP UI (parent)** — invoice viewing, payment
6. **Integrate with payment module** — Stripe for invoice payments
7. **Integrate with student portal** — attendance, grades visible to parents

### Phase 8: WP Plugin Migration (2 weeks)

1. **Certificate-Generator-v7** → GEMA certificate module
   - Migrate template data
   - Migrate certificate records
   - Keep WP plugin as thin frontend that calls GEMA API
2. **participant-portal** → GEMA student portal
   - Migrate to GEMA frontend student/parent apps
   - Keep WP plugin as redirect to GEMA portal
3. **chatbot-by-eshaan** → Update API calls to new endpoints
4. **wp-dynamic-tags-v4** → Update to pull from GEMA API

---

## 8. Database Migration Script

```typescript
// scripts/migrations/add-new-roles.ts

// 1. Add new roles to UserRole enum (code change, not DB)

// 2. Create default schools for existing teachers without schoolId
const teachersWithoutSchool = await Teacher.find({ schoolId: { $exists: false } });
for (const teacher of teachersWithoutSchool) {
  // Option A: Create a placeholder school
  const school = await School.create({
    userId: null, // No user yet
    schoolName: `${teacher.fullName} (Independent)`,
    schoolType: SchoolType.TRAINING_CENTER,
    email: teacher.email,
    phone: teacher.phone,
    address: teacher.address,
    verificationStatus: SchoolVerificationStatus.VERIFIED,
    isActive: true,
    settings: {
      allowTeacherSelfRegistration: true,
      requireParentApprovalForBookings: false,
      autoGenerateCertificates: false,
      enableLMS: false,
      enableERP: false,
    },
    memberSince: teacher.memberSince,
  });

  teacher.schoolId = school._id;
  await teacher.save();
}

// 3. Create Student profiles for existing users who have booked educational events
const educationalBookings = await Booking.find({
  eventType: { $in: ["course", "class", "bootcamp", "masterclass", "workshop"] }
});

// 4. Create Parent profiles for users who have booked for others
// (detect by analyzing booking patterns)

// 5. Update User model with profile references
const allUsers = await User.find();
for (const user of allUsers) {
  switch (user.role) {
    case UserRole.VENDOR:
      const vendor = await Vendor.findOne({ userId: user._id });
      if (vendor) user.vendorId = vendor._id;
      break;
    case UserRole.SCHOOL:
      const school = await School.findOne({ userId: user._id });
      if (school) user.schoolId = school._id;
      break;
    case UserRole.TEACHER:
      const teacher = await Teacher.findOne({ userId: user._id });
      if (teacher) user.teacherProfileId = teacher._id;
      break;
    // ... etc
  }
  await user.save();
}
```

---

## 9. API Compatibility Layer

For WP plugins that currently call the old API:

```typescript
// routes/api-compat.ts
// Maintain backward compatibility during migration

// Old: POST /api/events (vendor creates event)
// New: Same endpoint, works as-is

// Old: POST /ai_chatbot_cert_status (WP plugin cert lookup)
// New: Proxy to /api/certificates/verify

// Old: cg_sync_to_dynamic_tags() (WP hook)
// New: Webhook from GEMA when certificate is generated
```

---

## 10. Quick Wins ✅ COMPLETED

All quick wins completed on April 4, 2026:

1. ✅ **Auth bugs fixed** — `teacher.controller.ts:583` → UserRole.STUDENT, `teacher.service.ts:594` → UserRole.CUSTOMER
2. ✅ **Role usage standardized** — 13 route files converted from string roles to UserRole enum
3. ✅ **Root artifacts cleaned** — PDFs, zips, JSON dumps moved to `doc/`
4. ✅ **Architecture migrated** — 35 modules, 0 flat directories, 0 TS errors

---

*Created: 2026-04-04 | Updated: 2026-04-04 (Post-Implementation)*
