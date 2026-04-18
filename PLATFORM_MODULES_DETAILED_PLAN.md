# GEMA — New Platform Modules: Detailed Model & Implementation Plan

> Complete data models, relationships, API endpoints, and implementation details for:
> ERP, LMS, Student Portal, Certificate Generator

---

## Table of Contents

1. [ERP Module](#1-erp-module)
   - [Finance Submodule](#11-finance-submodule)
   - [HR Submodule](#12-hr-submodule)
   - [Inventory Submodule](#13-inventory-submodule)
   - [Scheduling Submodule](#14-scheduling-submodule)
2. [LMS Module](#2-lms-module)
   - [Course Management](#21-course-management)
   - [Lesson & Content](#22-lesson--content)
   - [Assignments & Grading](#23-assignments--grading)
   - [Progress & Analytics](#24-progress--analytics)
3. [Student Portal Module](#3-student-portal-module)
   - [Student Dashboard](#31-student-dashboard)
   - [Parent Portal](#32-parent-portal)
   - [Enrollment Management](#33-enrollment-management)
4. [Certificate Generator Module](#4-certificate-generator-module)
   - [Template System](#41-template-system)
   - [Generation Engine](#42-generation-engine)
   - [Verification System](#43-verification-system)
5. [Cross-Module Relationships](#5-cross-module-relationships)
6. [Implementation Order](#6-implementation-order)

---

## 1. ERP Module

### 1.1 Finance Submodule

#### Invoice Model

```typescript
// modules/erp/finance/models/invoice.model.ts

export enum InvoiceType {
  TUITION = "tuition",
  EVENT_FEE = "event_fee",
  TRANSPORT = "transport",
  UNIFORM = "uniform",
  BOOKS = "books",
  ACTIVITY = "activity",
  LATE_FEE = "late_fee",
  CUSTOM = "custom",
}

export enum InvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  VIEWED = "viewed",
  PARTIALLY_PAID = "partially_paid",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum InvoiceFrequency {
  ONE_TIME = "one_time",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  SEMI_ANNUAL = "semi_annual",
  ANNUAL = "annual",
}

export interface IInvoiceItem {
  _id: mongoose.Types.ObjectId;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: {
    type: "percentage" | "fixed";
    value: number;
  };
  taxRate: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;                    // Auto-generated: INV-2026-00001
  schoolId: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;       // For vendor-issued invoices
  studentId?: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;        // Who pays
  eventId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;

  type: InvoiceType;
  status: InvoiceStatus;

  billingPeriod: {
    start: Date;
    end: Date;
  };

  items: IInvoiceItem[];

  // Financials
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;

  // Payment
  dueDate: Date;
  paidAt?: Date;
  overdueAt?: Date;
  paymentMethod?: "stripe" | "bank_transfer" | "cash" | "cheque";
  paymentReference?: string;

  // Recurring
  isRecurring: boolean;
  frequency?: InvoiceFrequency;
  nextInvoiceDate?: Date;
  parentInvoiceId?: mongoose.Types.ObjectId;

  // Notes
  notes?: string;
  internalNotes?: string;                   // Staff-only notes
  termsAndConditions?: string;

  // Attachments
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }>;

  // Audit
  createdBy: mongoose.Types.ObjectId;
  sentAt?: Date;
  viewedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Payment Record Model

```typescript
// modules/erp/finance/models/payment-record.model.ts

export enum PaymentMethod {
  STRIPE = "stripe",
  STRIPE_CONNECT = "stripe_connect",
  BANK_TRANSFER = "bank_transfer",
  CASH = "cash",
  CHEQUE = "cheque",
  ONLINE_TRANSFER = "online_transfer",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
  CHARGEBACK = "chargeback",
}

export interface IPaymentRecord extends Document {
  paymentReference: string;                 // PAY-2026-00001
  invoiceId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;

  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;

  // Gateway-specific
  gatewayResponse: {
    transactionId?: string;                 // Stripe payment intent ID
    chargeId?: string;
    receiptUrl?: string;
    failureCode?: string;
    failureMessage?: string;
    rawResponse?: Record<string, any>;
  };

  // Bank transfer details
  bankTransfer?: {
    bankName: string;
    accountNumber: string;
    referenceNumber: string;
    depositedAt: Date;
    verifiedBy: mongoose.Types.ObjectId;
    verifiedAt: Date;
  };

  // Refund
  refund?: {
    amount: number;
    reason: string;
    processedBy: mongoose.Types.ObjectId;
    processedAt: Date;
    gatewayRefundId?: string;
  };

  // Receipt
  receiptNumber: string;
  receiptUrl?: string;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Financial Report Model

```typescript
// modules/erp/finance/models/financial-report.model.ts

export interface IFinancialReport extends Document {
  schoolId: mongoose.Types.ObjectId;
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";
  period: {
    start: Date;
    end: Date;
  };

  summary: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
    totalRefunded: number;
    collectionRate: number;                 // collected / invoiced * 100
  };

  breakdown: {
    byType: Record<InvoiceType, { invoiced: number; collected: number; outstanding: number }>;
    byGrade: Record<string, { invoiced: number; collected: number; outstanding: number }>;
    byPaymentMethod: Record<PaymentMethod, { count: number; amount: number }>;
    byStatus: Record<InvoiceStatus, { count: number; amount: number }>;
  };

  trends: {
    previousPeriod: { invoiced: number; collected: number };
    growth: { invoiced: number; collected: number };
  };

  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;
}
```

#### Finance API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/erp/finance/invoices` | school, admin | List invoices (filterable) |
| POST | `/api/erp/finance/invoices` | school, admin | Create invoice |
| GET | `/api/erp/finance/invoices/:id` | school, parent, admin | View invoice |
| PATCH | `/api/erp/finance/invoices/:id` | school, admin | Update invoice |
| DELETE | `/api/erp/finance/invoices/:id` | school, admin | Cancel invoice |
| POST | `/api/erp/finance/invoices/:id/send` | school, admin | Send invoice via email |
| POST | `/api/erp/finance/invoices/:id/pay` | parent, student | Pay invoice |
| GET | `/api/erp/finance/invoices/:id/receipt` | parent, school | Download receipt |
| POST | `/api/erp/finance/invoices/bulk` | school, admin | Bulk create invoices |
| POST | `/api/erp/finance/invoices/:id/refund` | school, admin | Process refund |
| GET | `/api/erp/finance/payments` | school, admin | List payments |
| GET | `/api/erp/finance/payments/:id` | school, parent, admin | View payment |
| POST | `/api/erp/finance/reports/generate` | school, admin | Generate financial report |
| GET | `/api/erp/finance/reports/:id` | school, admin | View report |
| GET | `/api/erp/finance/dashboard` | school, admin | Financial dashboard stats |
| GET | `/api/erp/finance/parent/invoices` | parent | Parent's invoices |
| GET | `/api/erp/finance/parent/payments` | parent | Parent's payment history |

---

### 1.2 HR Submodule

#### Staff Model

```typescript
// modules/erp/hr/models/staff.model.ts

export enum StaffType {
  TEACHER = "teacher",
  ADMINISTRATOR = "administrator",
  SUPPORT = "support",
  MAINTENANCE = "maintenance",
  SECURITY = "security",
  TRANSPORT = "transport",
  COUNSELOR = "counselor",
  LIBRARIAN = "librarian",
  NURSE = "nurse",
  IT = "it",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  FREELANCE = "freelance",
  INTERN = "intern",
  SUBSTITUTE = "substitute",
}

export enum StaffStatus {
  ACTIVE = "active",
  ON_LEAVE = "on_leave",
  SUSPENDED = "suspended",
  TERMINATED = "terminated",
  RESIGNED = "resigned",
  RETIRED = "retired",
}

export interface IStaff extends Document {
  userId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  staffId: string;                          // Auto-generated: STF-2026-0001

  // Personal
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  nationality?: string;
  photo?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };

  // Employment
  staffType: StaffType;
  employmentType: EmploymentType;
  status: StaffStatus;
  department?: string;
  designation: string;
  subject?: string[];                       // For teachers
  gradeLevels?: string[];                   // For teachers

  // Dates
  hireDate: Date;
  contractStart: Date;
  contractEnd?: Date;
  probationEnd?: Date;
  noticePeriodDays: number;

  // Compensation
  compensation: {
    baseSalary: number;
    currency: string;
    payFrequency: "monthly" | "biweekly" | "weekly";
    allowances: Array<{
      name: string;
      amount: number;
      type: "fixed" | "percentage";
    }>;
    deductions: Array<{
      name: string;
      amount: number;
      type: "fixed" | "percentage";
    }>;
    bankAccount: {
      bankName: string;
      accountNumber: string;
      iban?: string;
      swiftCode?: string;
    };
  };

  // Qualifications
  qualifications: Array<{
    degree: string;
    institution: string;
    year: number;
    country: string;
    documentUrl?: string;
  }>;

  // Documents
  documents: Array<{
    type: "contract" | "id_proof" | "qualification" | "background_check" | "other";
    name: string;
    url: string;
    expiryDate?: Date;
    uploadedAt: Date;
  }>;

  // Work Schedule
  workSchedule: {
    hoursPerWeek: number;
    schedule: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  };

  // Stats
  stats: {
    totalLeaveDays: number;
    totalPresentDays: number;
    totalAbsentDays: number;
    averageRating: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Attendance Model

```typescript
// modules/erp/hr/models/attendance.model.ts

export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  HALF_DAY = "half_day",
  ON_LEAVE = "on_leave",
  HOLIDAY = "holiday",
  REMOTE = "remote",
}

export interface IStaffAttendance extends Document {
  schoolId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  date: Date;
  status: AttendanceStatus;

  checkIn?: {
    time: Date;
    method: "biometric" | "manual" | "qr_scan" | "gps";
    location?: string;
  };

  checkOut?: {
    time: Date;
    method: "biometric" | "manual" | "qr_scan" | "gps";
    location?: string;
  };

  hoursWorked: number;
  lateMinutes: number;

  notes?: string;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Leave Request Model

```typescript
// modules/erp/hr/models/leave-request.model.ts

export enum LeaveType {
  ANNUAL = "annual",
  SICK = "sick",
  PERSONAL = "personal",
  MATERNITY = "maternity",
  PATERNITY = "paternity",
  BEREAVEMENT = "bereavement",
  UNPAID = "unpaid",
  COMPENSATORY = "compensatory",
  STUDY = "study",
}

export enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export interface ILeaveRequest extends Document {
  schoolId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  leaveType: LeaveType;
  status: LeaveStatus;

  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  supportingDocument?: string;

  // Approval workflow
  appliedAt: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;

  // Handover
  handoverNotes?: string;
  coveringStaffId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Payroll Model

```typescript
// modules/erp/hr/models/payroll.model.ts

export enum PayrollStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PROCESSED = "processed",
  PAID = "paid",
  FAILED = "failed",
}

export interface IPayrollRun extends Document {
  schoolId: mongoose.Types.ObjectId;
  period: {
    start: Date;
    end: Date;
  };
  status: PayrollStatus;

  summary: {
    totalStaff: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalEmployerContributions: number;
  };

  entries: Array<{
    staffId: mongoose.Types.ObjectId;
    baseSalary: number;
    allowances: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
    grossPay: number;
    netPay: number;
    paymentMethod: PaymentMethod;
    paymentStatus: "pending" | "paid" | "failed";
    paymentReference?: string;
    paidAt?: Date;
  }>;

  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### HR API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/erp/hr/staff` | school, admin | List staff |
| POST | `/api/erp/hr/staff` | school, admin | Add staff |
| GET | `/api/erp/hr/staff/:id` | school, admin | View staff profile |
| PATCH | `/api/erp/hr/staff/:id` | school, admin | Update staff |
| DELETE | `/api/erp/hr/staff/:id` | school, admin | Terminate staff |
| GET | `/api/erp/hr/staff/:id/attendance` | school, staff | View attendance |
| POST | `/api/erp/hr/attendance/mark` | school, admin | Mark attendance |
| POST | `/api/erp/hr/attendance/bulk` | school, admin | Bulk mark attendance |
| GET | `/api/erp/hr/leave-requests` | school, staff | List leave requests |
| POST | `/api/erp/hr/leave-requests` | staff | Apply for leave |
| PATCH | `/api/erp/hr/leave-requests/:id/approve` | school, admin | Approve/reject leave |
| GET | `/api/erp/hr/payroll` | school, admin | List payroll runs |
| POST | `/api/erp/hr/payroll/generate` | school, admin | Generate payroll |
| PATCH | `/api/erp/hr/payroll/:id/approve` | school, admin | Approve payroll |
| POST | `/api/erp/hr/payroll/:id/process` | school, admin | Process payments |
| GET | `/api/erp/hr/dashboard` | school, admin | HR dashboard stats |

---

### 1.3 Inventory Submodule

#### Asset Model

```typescript
// modules/erp/inventory/models/asset.model.ts

export enum AssetType {
  ELECTRONICS = "electronics",
  FURNITURE = "furniture",
  VEHICLE = "vehicle",
  EQUIPMENT = "equipment",
  SUPPLIES = "supplies",
  BOOKS = "books",
  SOFTWARE = "software",
  OTHER = "other",
}

export enum AssetStatus {
  AVAILABLE = "available",
  IN_USE = "in_use",
  UNDER_MAINTENANCE = "under_maintenance",
  DAMAGED = "damaged",
  DISPOSED = "disposed",
  LOST = "lost",
}

export interface IAsset extends Document {
  schoolId: mongoose.Types.ObjectId;
  assetTag: string;                         // AST-2026-0001
  name: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;

  // Purchase
  purchaseDate: Date;
  purchaseCost: number;
  vendor?: string;
  invoiceNumber?: string;
  warrantyExpiry?: Date;

  // Details
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  specifications?: Record<string, any>;

  // Assignment
  assignedTo?: {
    staffId: mongoose.Types.ObjectId;
    assignedAt: Date;
    expectedReturnDate?: Date;
  };

  location?: {
    building: string;
    room: string;
    floor: number;
  };

  // Maintenance
  maintenanceHistory: Array<{
    date: Date;
    type: string;
    cost: number;
    performedBy: string;
    notes: string;
  }>;

  // Depreciation
  depreciation: {
    method: "straight_line" | "declining_balance";
    usefulLifeYears: number;
    annualDepreciation: number;
    currentValue: number;
  };

  // Images
  photos: string[];

  createdAt: Date;
  updatedAt: Date;
}
```

#### Inventory Item Model

```typescript
// modules/erp/inventory/models/inventory-item.model.ts

export interface IInventoryItem extends Document {
  schoolId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  category: string;
  description?: string;

  stock: {
    current: number;
    minimum: number;
    maximum: number;
    unit: string;                         // "pieces", "boxes", "liters", etc.
  };

  location: {
    storage: string;
    shelf: string;
    bin: string;
  };

  supplier?: {
    name: string;
    contact: string;
    email: string;
    phone: string;
  };

  costPerUnit: number;
  lastRestockedAt?: Date;
  lastRestockedBy?: mongoose.Types.ObjectId;

  // Alerts
  lowStockAlert: boolean;
  autoReorder: boolean;
  reorderQuantity: number;

  // Transaction log
  transactions: Array<{
    type: "in" | "out" | "adjustment" | "return";
    quantity: number;
    reason: string;
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 1.4 Scheduling Submodule

#### Timetable Model

```typescript
// modules/erp/scheduling/models/timetable.model.ts

export interface ITimetable extends Document {
  schoolId: mongoose.Types.ObjectId;
  name: string;
  academicYear: string;
  term: "term1" | "term2" | "term3" | "full_year";
  isActive: boolean;

  slots: Array<{
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    startTime: string;
    endTime: string;
    periodNumber: number;
    breakAfter: boolean;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

export interface ITimetableEntry extends Document {
  timetableId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;

  grade: string;
  section: string;
  subject: string;
  room?: string;

  day: string;
  periodNumber: number;
  startTime: string;
  endTime: string;

  // Conflicts
  hasConflict: boolean;
  conflictDetails?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Room Booking Model

```typescript
// modules/erp/scheduling/models/room-booking.model.ts

export enum RoomBookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export interface IRoomBooking extends Document {
  schoolId: mongoose.Types.ObjectId;
  room: string;
  bookedBy: mongoose.Types.ObjectId;
  purpose: string;
  status: RoomBookingStatus;

  date: Date;
  startTime: string;
  endTime: string;

  attendees?: number;
  notes?: string;

  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 2. LMS Module

### 2.1 Course Management

#### Course Model

```typescript
// modules/lms/models/course.model.ts

export enum CourseStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  SCHEDULED = "scheduled",
}

export enum CourseType {
  SELF_PACED = "self_paced",
  INSTRUCTOR_LED = "instructor_led",
  BLENDED = "blended",
  LIVE = "live",
}

export enum CourseLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  ALL_LEVELS = "all_levels",
}

export enum CourseCategory {
  MATHEMATICS = "mathematics",
  SCIENCE = "science",
  ENGLISH = "english",
  SOCIAL_STUDIES = "social_studies",
  ART = "art",
  MUSIC = "music",
  PHYSICAL_EDUCATION = "physical_education",
  TECHNOLOGY = "technology",
  LANGUAGE = "language",
  PROFESSIONAL_DEVELOPMENT = "professional_development",
  EXTRACURRICULAR = "extracurricular",
  OTHER = "other",
}

export interface ICoursePrerequisite {
  courseId: mongoose.Types.ObjectId;
  minimumGrade?: string;
  minimumScore?: number;
}

export interface ICourse extends Document {
  schoolId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  code: string;                             // MATH-101, SCI-201
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  thumbnail?: string;
  coverImage?: string;
  promoVideo?: string;

  type: CourseType;
  level: CourseLevel;
  category: CourseCategory;
  tags: string[];
  status: CourseStatus;

  // Academic
  gradeLevel: string;
  subject: string;
  credits: number;
  duration: {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  };

  // Schedule
  schedule: {
    startDate: Date;
    endDate: Date;
    sessions: Array<{
      day: string;
      startTime: string;
      endTime: string;
      room?: string;
    }>;
  };

  // Enrollment
  enrollment: {
    maxStudents?: number;
    minStudents?: number;
    enrolledCount: number;
    waitlistCount: number;
    startDate: Date;
    endDate: Date;
    isOpen: boolean;
    requiresApproval: boolean;
    fee?: number;
    currency?: string;
  };

  // Prerequisites
  prerequisites: ICoursePrerequisite[];

  // Content
  lessonCount: number;
  assignmentCount: number;
  estimatedCompletionHours: number;

  // Assessment
  assessment: {
    hasFinalExam: boolean;
    passingGrade: number;                   // Percentage
    gradingScale: {
      A: { min: number; max: number };
      B: { min: number; max: number };
      C: { min: number; max: number };
      D: { min: number; max: number };
      F: { min: number; max: number };
    };
    weightage: {
      assignments: number;
      quizzes: number;
      projects: number;
      finalExam: number;
      participation: number;
    };
  };

  // Certificate
  certificate: {
    enabled: boolean;
    templateId?: mongoose.Types.ObjectId;
    autoGenerate: boolean;
    minimumCompletion: number;              // Percentage
    minimumGrade: number;                   // Percentage
  };

  // Stats
  stats: {
    totalEnrollments: number;
    completionRate: number;
    averageGrade: number;
    averageRating: number;
    totalReviews: number;
    totalHoursWatched: number;
  };

  // SEO
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  isDeleted: boolean;
  deletedAt?: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Lesson & Content

#### Lesson Model

```typescript
// modules/lms/models/lesson.model.ts

export enum LessonType {
  VIDEO = "video",
  TEXT = "text",
  QUIZ = "quiz",
  ASSIGNMENT = "assignment",
  DISCUSSION = "discussion",
  LIVE_SESSION = "live_session",
  SCORM = "scorm",
  EXTERNAL_LINK = "external_link",
  FILE_DOWNLOAD = "file_download",
}

export enum LessonStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  HIDDEN = "hidden",
}

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: LessonType;
  status: LessonStatus;

  // Ordering
  order: number;
  moduleOrder?: number;

  // Content
  content: {
    videoUrl?: string;
    videoDuration?: number;                 // Seconds
    videoProvider?: "youtube" | "vimeo" | "self_hosted";
    textContent?: string;                   // HTML/Rich text
    quizId?: mongoose.Types.ObjectId;
    assignmentId?: mongoose.Types.ObjectId;
    discussionId?: mongoose.Types.ObjectId;
    fileUrl?: string;
    externalUrl?: string;
    scormUrl?: string;
  };

  // Requirements
  estimatedDuration: number;                // Minutes
  isRequired: boolean;
  unlockAfter?: mongoose.Types.ObjectId;    // Previous lesson ID

  // Engagement
  resources: Array<{
    name: string;
    type: string;
    url: string;
    size?: number;
  }>;

  // Stats
  stats: {
    viewsCount: number;
    completionCount: number;
    averageTimeSpent: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Module Model

```typescript
// modules/lms/models/module.model.ts

export interface IModule extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;

  lessons: mongoose.Types.ObjectId[];
  lessonCount: number;

  // Stats
  stats: {
    averageCompletionTime: number;
    averageScore: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 Assignments & Grading

#### Assignment Model

```typescript
// modules/lms/models/assignment.model.ts

export enum AssignmentType {
  ESSAY = "essay",
  MULTIPLE_CHOICE = "multiple_choice",
  FILE_UPLOAD = "file_upload",
  PROJECT = "project",
  PRESENTATION = "presentation",
  QUIZ = "quiz",
  DISCUSSION = "discussion",
  PRACTICAL = "practical",
}

export enum AssignmentStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CLOSED = "closed",
}

export interface IAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;

  title: string;
  description: string;
  type: AssignmentType;
  status: AssignmentStatus;

  // Instructions
  instructions: string;                     // HTML/Rich text
  rubric?: Array<{
    criterion: string;
    description: string;
    maxScore: number;
  }>;

  // Attachments
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;

  // Grading
  maxScore: number;
  weightage: number;                        // Percentage of final grade
  passingScore: number;
  gradeRelease: "automatic" | "manual";

  // Timing
  publishedAt: Date;
  dueDate: Date;
  lateSubmissionAllowed: boolean;
  latePenalty: {
    enabled: boolean;
    percentagePerDay: number;
    maxLateDays: number;
  };

  // Submission
  submissionType: "individual" | "group";
  maxFileSize?: number;                     // MB
  allowedFileTypes?: string[];
  maxAttempts?: number;

  // Stats
  stats: {
    totalSubmissions: number;
    gradedCount: number;
    averageScore: number;
    onTimeCount: number;
    lateCount: number;
    notSubmittedCount: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Submission Model

```typescript
// modules/lms/models/submission.model.ts

export enum SubmissionStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  GRADED = "graded",
  RESUBMIT_REQUESTED = "resubmit_requested",
  RESUBMITTED = "resubmitted",
  LATE = "late",
  EXCUSED = "excused",
}

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;

  status: SubmissionStatus;
  attemptNumber: number;

  // Content
  content: {
    text?: string;
    files: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
      uploadedAt: Date;
    }>;
    quizAnswers?: Record<string, any>;
  };

  // Timing
  startedAt: Date;
  submittedAt?: Date;
  isLate: boolean;
  latePenaltyApplied?: number;

  // Grading
  grade?: {
    score: number;
    maxScore: number;
    percentage: number;
    letterGrade: string;
    feedback: string;
    rubricScores?: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      feedback: string;
    }>;
    gradedBy: mongoose.Types.ObjectId;
    gradedAt: Date;
  };

  // Teacher feedback
  teacherFeedback?: {
    comment: string;
    audioFeedback?: string;
    videoFeedback?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 2.4 Progress & Analytics

#### Course Progress Model

```typescript
// modules/lms/models/course-progress.model.ts

export enum ProgressStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DROPPED = "dropped",
  ON_HOLD = "on_hold",
}

export interface ILessonProgress {
  lessonId: mongoose.Types.ObjectId;
  status: "not_started" | "in_progress" | "completed";
  startedAt?: Date;
  completedAt?: Date;
  timeSpent: number;                        // Seconds
  lastPosition?: number;                    // Video timestamp or scroll position
}

export interface ICourseProgress extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  status: ProgressStatus;
  enrolledAt: Date;
  completedAt?: Date;
  droppedAt?: Date;

  // Progress tracking
  lessonsCompleted: number;
  totalLessons: number;
  completionPercentage: number;

  lessonProgress: ILessonProgress[];

  // Current position
  currentLessonId?: mongoose.Types.ObjectId;
  lastAccessedAt: Date;

  // Grades
  grades: {
    assignments: Array<{
      assignmentId: mongoose.Types.ObjectId;
      score: number;
      maxScore: number;
      percentage: number;
    }>;
    quizzes: Array<{
      quizId: mongoose.Types.ObjectId;
      score: number;
      maxScore: number;
      percentage: number;
    }>;
    finalExam?: {
      score: number;
      maxScore: number;
      percentage: number;
    };
    overall: number;
    letterGrade: string;
  };

  // Attendance
  attendance: {
    totalSessions: number;
    attended: number;
    absent: number;
    late: number;
  };

  // Certificate
  certificateIssued: boolean;
  certificateId?: mongoose.Types.ObjectId;
  certificateIssuedAt?: Date;

  // Engagement
  totalTimeSpent: number;                   // Seconds
  discussionPosts: number;
  questionsAsked: number;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Grade Book Model

```typescript
// modules/lms/models/grade-book.model.ts

export interface IGradeBook extends Document {
  courseId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  academicTerm: string;

  students: Array<{
    studentId: mongoose.Types.ObjectId;
    grades: Array<{
      category: "assignment" | "quiz" | "project" | "exam" | "participation";
      title: string;
      score: number;
      maxScore: number;
      percentage: number;
      weightage: number;
      date: Date;
    }>;
    overallGrade: number;
    letterGrade: string;
    rank: number;
    attendance: {
      present: number;
      absent: number;
      late: number;
    };
    teacherComment?: string;
  }>;

  published: boolean;
  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

#### LMS API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/courses` | public | List published courses |
| POST | `/api/lms/courses` | school, teacher | Create course |
| GET | `/api/lms/courses/:id` | public | View course details |
| PATCH | `/api/lms/courses/:id` | teacher, school | Update course |
| DELETE | `/api/lms/courses/:id` | teacher, school | Archive course |
| POST | `/api/lms/courses/:id/publish` | teacher | Publish course |
| GET | `/api/lms/courses/:id/lessons` | enrolled | List lessons |
| POST | `/api/lms/courses/:id/lessons` | teacher | Add lesson |
| PATCH | `/api/lms/courses/:id/lessons/:lessonId` | teacher | Update lesson |
| GET | `/api/lms/courses/:id/lessons/:lessonId` | enrolled | View lesson |
| POST | `/api/lms/courses/:id/lessons/:lessonId/complete` | student | Mark complete |
| POST | `/api/lms/courses/:id/enroll` | student, parent | Enroll in course |
| POST | `/api/lms/courses/:id/unenroll` | student, parent | Unenroll |
| GET | `/api/lms/courses/:id/students` | teacher | Enrolled students |
| POST | `/api/lms/courses/:id/assignments` | teacher | Create assignment |
| GET | `/api/lms/courses/:id/assignments` | enrolled | List assignments |
| POST | `/api/lms/courses/:id/assignments/:id/submit` | student | Submit assignment |
| POST | `/api/lms/courses/:id/assignments/:id/grade` | teacher | Grade submission |
| GET | `/api/lms/students/:id/progress` | student, parent, teacher | View progress |
| GET | `/api/lms/students/:id/grades` | student, parent, teacher | View grades |
| GET | `/api/lms/teachers/:id/courses` | teacher | Teacher's courses |
| GET | `/api/lms/gradebook/:courseId` | teacher | View grade book |
| POST | `/api/lms/gradebook/:courseId/publish` | teacher | Publish grades |

---

## 3. Student Portal Module

### 3.1 Student Dashboard

#### Student Dashboard Model (Aggregated View)

```typescript
// modules/student-portal/models/student-dashboard.model.ts

export interface IStudentDashboard {
  student: {
    id: string;
    name: string;
    photo: string;
    grade: string;
    section: string;
    school: string;
  };

  // Current status
  currentCourses: Array<{
    courseId: string;
    title: string;
    progress: number;
    nextLesson: string;
    teacher: string;
  }>;

  // Upcoming
  upcomingEvents: Array<{
    eventId: string;
    title: string;
    date: Date;
    type: string;
    location: string;
  }>;

  upcomingAssignments: Array<{
    assignmentId: string;
    title: string;
    course: string;
    dueDate: Date;
    status: "pending" | "overdue";
  }>;

  // Recent
  recentGrades: Array<{
    assignment: string;
    course: string;
    score: number;
    maxScore: number;
    date: Date;
  }>;

  recentCertificates: Array<{
    certificateId: string;
    title: string;
    issuedAt: Date;
    type: string;
  }>;

  // Attendance
  attendance: {
    thisMonth: { present: number; absent: number; late: number };
    rate: number;
  };

  // Notifications
  unreadNotifications: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    type: string;
    read: boolean;
    createdAt: Date;
  }>;
}
```

### 3.2 Parent Portal

#### Parent Dashboard Model

```typescript
// modules/student-portal/models/parent-dashboard.model.ts

export interface IParentDashboard {
  parent: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };

  children: Array<{
    id: string;
    name: string;
    photo: string;
    grade: string;
    section: string;
    school: string;
    attendance: { rate: number; present: number; absent: number };
    currentCourses: number;
    upcomingAssignments: number;
    recentGrade: { score: number; maxScore: number; course: string };
    certificates: number;
  }>;

  // Financial
  pendingInvoices: Array<{
    invoiceId: string;
    studentName: string;
    amount: number;
    dueDate: Date;
    type: string;
  }>;

  totalOutstanding: number;

  // Upcoming
  upcomingEvents: Array<{
    eventId: string;
    title: string;
    date: Date;
    childName: string;
  }>;

  // Notifications
  unreadNotifications: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    childName: string;
    type: string;
    read: boolean;
    createdAt: Date;
  }>;
}
```

### 3.3 Enrollment Management

#### Enrollment Model

```typescript
// modules/student-portal/models/enrollment.model.ts

export enum EnrollmentType {
  EVENT = "event",
  COURSE = "course",
  WORKSHOP = "workshop",
  BOOTCAMP = "bootcamp",
}

export enum EnrollmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  WAITLISTED = "waitlisted",
  DROPPED = "dropped",
}

export interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;

  type: EnrollmentType;
  targetId: mongoose.Types.ObjectId;      // Event ID or Course ID
  targetType: "event" | "course";

  status: EnrollmentStatus;

  // Payment
  fee: number;
  currency: string;
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded";
  paymentId?: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;

  // Booking details
  bookedBy: mongoose.Types.ObjectId;
  bookedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  // For events
  eventDetails?: {
    ticketNumber: string;
    ticketType: string;
    seatNumber?: string;
    checkInStatus: "not_checked" | "checked_in" | "no_show";
  };

  // For courses
  courseDetails?: {
    enrollmentDate: Date;
    expectedCompletionDate: Date;
    actualCompletionDate?: Date;
    progressPercentage: number;
    finalGrade?: number;
    certificateIssued: boolean;
  };

  // Notes
  notes?: string;
  specialRequirements?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Student Portal API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/portal/student/dashboard` | student | Student dashboard |
| GET | `/api/portal/student/courses` | student | Enrolled courses |
| GET | `/api/portal/student/courses/:id` | student | Course detail + progress |
| GET | `/api/portal/student/courses/:id/lessons` | student | Course lessons |
| GET | `/api/portal/student/assignments` | student | My assignments |
| POST | `/api/portal/student/assignments/:id/submit` | student | Submit assignment |
| GET | `/api/portal/student/grades` | student | My grades |
| GET | `/api/portal/student/attendance` | student | My attendance |
| GET | `/api/portal/student/certificates` | student | My certificates |
| GET | `/api/portal/student/certificates/:id/download` | student | Download certificate |
| GET | `/api/portal/student/schedule` | student | My schedule/timetable |
| GET | `/api/portal/student/enrollments` | student | My enrollments |
| GET | `/api/portal/parent/dashboard` | parent | Parent dashboard |
| GET | `/api/portal/parent/children` | parent | My children |
| GET | `/api/portal/parent/children/:id` | parent | Child profile |
| GET | `/api/portal/parent/children/:id/courses` | parent | Child's courses |
| GET | `/api/portal/parent/children/:id/grades` | parent | Child's grades |
| GET | `/api/portal/parent/children/:id/attendance` | parent | Child's attendance |
| GET | `/api/portal/parent/children/:id/certificates` | parent | Child's certificates |
| POST | `/api/portal/parent/children/:id/book-event` | parent | Book event for child |
| POST | `/api/portal/parent/children/:id/enroll-course` | parent | Enroll child in course |
| GET | `/api/portal/parent/invoices` | parent | My invoices |
| POST | `/api/portal/parent/invoices/:id/pay` | parent | Pay invoice |

---

## 4. Certificate Generator Module

### 4.1 Template System

#### Certificate Template Model

```typescript
// modules/certificates/models/certificate-template.model.ts

export enum CertificateTemplateType {
  ATTENDANCE = "attendance",
  COMPLETION = "completion",
  ACHIEVEMENT = "achievement",
  PARTICIPATION = "participation",
  EXCELLENCE = "excellence",
  GRADUATION = "graduation",
  CUSTOM = "custom",
}

export enum CertificateOrientation {
  LANDSCAPE = "landscape",
  PORTRAIT = "portrait",
}

export enum CertificateSize {
  A4 = "a4",
  A3 = "a3",
  LETTER = "letter",
  LEGAL = "legal",
  CUSTOM = "custom",
}

export interface ITemplateVariable {
  key: string;                              // {{student_name}}, {{event_name}}, etc.
  label: string;
  type: "text" | "date" | "number" | "image" | "signature";
  required: boolean;
  defaultValue?: string;
  dataSource?: "student" | "event" | "course" | "school" | "manual";
  dataField?: string;                       // e.g., "student.firstName", "event.title"
}

export interface ISignatureField {
  id: string;
  label: string;
  title: string;
  imageUrl?: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface ICertificateTemplate extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  name: string;
  description?: string;
  type: CertificateTemplateType;

  // Design
  design: {
    orientation: CertificateOrientation;
    size: CertificateSize;
    customSize?: { width: number; height: number };
    backgroundColor: string;
    backgroundImage?: string;
    borderColor?: string;
    borderWidth?: number;
    fontFamily: string;
    logoUrl?: string;
    sealUrl?: string;
    watermark?: {
      imageUrl: string;
      opacity: number;
      position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
    };
  };

  // Layout sections
  header: {
    enabled: boolean;
    text: string;
    fontSize: number;
    color: string;
    alignment: "left" | "center" | "right";
  };

  title: {
    text: string;
    fontSize: number;
    color: string;
    fontFamily?: string;
    alignment: "left" | "center" | "right";
  };

  body: {
    text: string;                           // Template text with {{variables}}
    fontSize: number;
    color: string;
    alignment: "left" | "center" | "right";
    lineHeight: number;
  };

  footer: {
    enabled: boolean;
    text: string;
    fontSize: number;
    color: string;
  };

  // Variables
  variables: ITemplateVariable[];

  // Signature fields
  signatures: ISignatureField[];

  // QR Code
  qrCode: {
    enabled: boolean;
    position: { x: number; y: number };
    size: number;
    data: string;                           // Verification URL template
  };

  // Usage
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 Generation Engine

#### Certificate Record Model

```typescript
// modules/certificates/models/certificate-record.model.ts

export enum CertificateStatus {
  PENDING = "pending",
  GENERATING = "generating",
  GENERATED = "generated",
  FAILED = "failed",
  SENT = "sent",
  DOWNLOADED = "downloaded",
  REVOKED = "revoked",
}

export interface ICertificateRecord extends Document {
  templateId: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;

  studentId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;

  issuedBy: mongoose.Types.ObjectId;

  // Unique identifiers
  certificateNumber: string;                // CERT-2026-000001
  verificationCode: string;                 // Random hash for QR verification

  // Resolved variables
  resolvedVariables: Record<string, any>;

  // Output
  output: {
    pdfUrl?: string;
    imageUrl?: string;
    fileSize?: number;
    dimensions?: { width: number; height: number };
    generatedAt: Date;
    generatorVersion: string;
  };

  // Status
  status: CertificateStatus;
  error?: string;

  // Distribution
  sentAt?: Date;
  sentVia: "email" | "download" | "print" | "none";
  downloadedAt?: Date;
  downloadCount: number;

  // Verification
  verificationUrl: string;
  verifiedAt?: Date;
  verifiedBy?: string;                      // IP or user agent of verifier

  // Revocation
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revocationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Certificate Batch Model

```typescript
// modules/certificates/models/certificate-batch.model.ts

export enum BatchStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  PARTIAL = "partial",
  FAILED = "failed",
}

export interface ICertificateBatch extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;

  name: string;
  description?: string;

  // Students to generate for
  studentIds: mongoose.Types.ObjectId[];
  totalStudents: number;

  // Variable overrides (if different per student)
  variableOverrides?: Array<{
    studentId: mongoose.Types.ObjectId;
    variables: Record<string, any>;
  }>;

  // Progress
  status: BatchStatus;
  processedCount: number;
  successCount: number;
  failedCount: number;
  errors: Array<{
    studentId: mongoose.Types.ObjectId;
    error: string;
  }>;

  // Timing
  startedAt?: Date;
  completedAt?: Date;

  // Created by
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 Verification System

#### Certificate Verification Model

```typescript
// modules/certificates/models/certificate-verification.model.ts

export interface ICertificateVerificationLog extends Document {
  certificateId: mongoose.Types.ObjectId;
  verificationCode: string;
  verifiedAt: Date;
  verifierIp: string;
  userAgent: string;
  source: "qr_scan" | "manual_entry" | "api";
  result: "valid" | "invalid" | "revoked";
}
```

#### Certificate Generator API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/certificates/templates` | school, vendor, admin | List templates |
| POST | `/api/certificates/templates` | school, vendor, admin | Create template |
| GET | `/api/certificates/templates/:id` | school, vendor, admin | View template |
| PATCH | `/api/certificates/templates/:id` | school, vendor, admin | Update template |
| DELETE | `/api/certificates/templates/:id` | school, vendor, admin | Delete template |
| POST | `/api/certificates/generate` | school, vendor, teacher | Generate single certificate |
| POST | `/api/certificates/generate/bulk` | school, vendor, admin | Bulk generate |
| GET | `/api/certificates/batches` | school, vendor, admin | List batches |
| GET | `/api/certificates/batches/:id` | school, vendor, admin | Batch status |
| GET | `/api/certificates/:id` | student, parent, school, admin | View certificate |
| GET | `/api/certificates/:id/download` | student, parent | Download PDF |
| GET | `/api/certificates/:id/preview` | school, vendor | Preview before generation |
| POST | `/api/certificates/:id/send` | school, vendor | Email certificate |
| POST | `/api/certificates/:id/revoke` | school, vendor, admin | Revoke certificate |
| GET | `/api/certificates/verify/:code` | public | Verify certificate |
| GET | `/api/certificates/student/:studentId` | student, parent | Student's certificates |
| GET | `/api/certificates/event/:eventId` | school, vendor | Event certificates |
| GET | `/api/certificates/course/:courseId` | school, teacher | Course certificates |
| GET | `/api/certificates/stats` | school, vendor, admin | Certificate statistics |
| POST | `/api/certificates/import` | school, vendor, admin | Import existing certificates |

---

## 5. Cross-Module Relationships

### 5.1 Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│    User     │       │    School    │       │    Vendor    │
│             │       │              │       │              │
│ role        │       │ userId       │       │ userId       │
│ schoolId ───┼──────▶│              │       │              │
│ vendorId ───┼───────┼──────────────┼──────▶│              │
│ studentId ──┼───┐   │              │       │              │
│ parentId ───┼───┐   │              │       │              │
│ teacherId ──┼───┐   │              │       │              │
└─────────────┘   │   └──────┬───────┘       └──────┬───────┘
                  │          │                       │
                  │   ┌──────▼───────┐       ┌───────▼───────┐
                  │   │   Teacher    │       │   Employee    │
                  │   │              │       │               │
                  │   │ schoolId ────┼──────▶│ vendorId ─────┼──┐
                  │   │ userId       │       │ userId        │  │
                  │   └──────┬───────┘       └───────────────┘  │
                  │          │                                  │
                  │   ┌──────▼───────┐                          │
                  │   │   Student    │                          │
                  │   │              │                          │
                  │   │ schoolId ────┼──────────────────────────┘
                  │   │ parentIds    │
                  │   │ userId       │
                  │   └──────┬───────┘
                  │          │
                  │   ┌──────▼───────┐
                  │   │    Parent    │
                  │   │              │
                  │   │ studentIds   │
                  │   │ userId       │
                  │   └──────────────┘
                  │
                  │   ┌──────────────────────────────────────────┐
                  │   │                  Event                    │
                  │   │                                           │
                  │   │ vendorId ─────────────────────────────────┼──┐
                  │   │ teacherId ────────────────────────────────┼──┼──┐
                  │   │ schoolId ─────────────────────────────────┼──┼──┼──┐
                  │   └───────────────────────────────────────────┼──┼──┼──┘
                  │                                               │  │  │
                  │   ┌───────────────────────────────────────────┼──┼──┼──┐
                  │   │               Enrollment                   │  │  │  │
                  │   │                                            │  │  │  │
                  │   │ studentId ─────────────────────────────────┼──┘  │  │
                  │   │ parentId ──────────────────────────────────┼─────┘  │
                  │   │ targetId (event/course)                    │        │
                  │   └────────────────────────────────────────────┼────────┘
                  │                                                │
                  │   ┌────────────────────────────────────────────┼───────┐
                  │   │               Booking                       │       │
                  │   │                                             │       │
                  │   │ userId (parent booking)                     │       │
                  │   │ eventId                                     │       │
                  │   └─────────────────────────────────────────────┼───────┘
                  │                                                 │
                  │   ┌─────────────────────────────────────────────┼───────┐
                  │   │              Certificate                    │       │
                  │   │                                             │       │
                  │   │ studentId ──────────────────────────────────┼───────┘
                  │   │ eventId ────────────────────────────────────┘
                  │   │ courseId
                  │   │ templateId
                  │   └─────────────────────────────────────────────┐
                  │                                                 │
                  │   ┌─────────────────────────────────────────────┼───────┐
                  │   │               Course                        │       │
                  │   │                                             │       │
                  │   │ schoolId ───────────────────────────────────┼───────┘
                  │   │ teacherId
                  │   └─────────────────────────────────────────────┘
                  │
                  │   ┌─────────────────────────────────────────────┐
                  │   │              Invoice                        │
                  │   │                                             │
                  │   │ schoolId                                    │
                  │   │ parentId                                    │
                  │   │ studentId                                   │
                  │   │ eventId / courseId                          │
                  │   └─────────────────────────────────────────────┘
                  │
                  │   ┌─────────────────────────────────────────────┐
                  │   │               Staff                         │
                  │   │                                             │
                  │   │ schoolId                                    │
                  │   │ userId                                      │
                  │   └─────────────────────────────────────────────┘
```

### 5.2 Module Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                    Shared Core                           │
│  Auth | Users | Notifications | Media | Settings        │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
   ┌──────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
   │   Events    │ │Booking │ │  Payment   │
   │   Module    │ │ Module │ │  Module    │
   └──────┬──────┘ └───┬────┘ └─────┬──────┘
          │             │             │
          └─────────────┼─────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
   ┌──────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
   │     ERP     │ │  LMS   │ │ Certificate│
   │   Module    │ │ Module │ │  Generator │
   └──────┬──────┘ └───┬────┘ └─────┬──────┘
          │             │             │
          └─────────────┼─────────────┘
                        │
               ┌────────▼────────┐
               │  Student Portal │
               │  (Consumer)     │
               └─────────────────┘
```

---

## 6. Implementation Order

### Sprint 1-2: Foundation (Weeks 1-2)

**Priority: Models + Auth**

1. Create all new models (School, Student, Parent, updated Teacher/Employee/User/Event)
2. Update UserRole enum
3. Create database migration scripts
4. Fix auth bugs (student/user string usage)
5. Create School CRUD API
6. Create Student CRUD API
7. Create Parent CRUD API
8. Update Teacher API to require schoolId

### Sprint 3-4: Certificate Generator (Weeks 3-4)

**Priority: Migrate from WP plugin**

1. Create Certificate Template model + CRUD
2. Create Certificate Record model
3. Create Certificate Batch model
4. Build PDF generation engine (pdf-lib or Playwright)
5. Create QR code embedding
6. Create verification endpoint
7. Create bulk generation endpoint
8. Migrate existing certificates from WP plugin
9. Create admin UI for template builder

### Sprint 5-6: Student Portal (Weeks 5-6)

**Priority: User-facing features**

1. Create Student Dashboard API
2. Create Parent Dashboard API
3. Create Enrollment model + API
4. Create student portal frontend (React app)
5. Create parent portal frontend (React app)
6. Integrate with existing booking flow
7. Integrate with certificate module
8. Create route guards (StudentRoute, ParentRoute)

### Sprint 7-9: LMS Module (Weeks 7-9)

**Priority: Core learning features**

1. Create Course model + CRUD
2. Create Module + Lesson models + CRUD
3. Create Assignment + Submission models + CRUD
4. Create Course Progress model + tracking
5. Create Grade Book model
6. Create LMS API endpoints
7. Create teacher LMS UI (course builder, grading)
8. Create student LMS UI (course viewer, submissions)
9. Integrate with certificate module (auto-generate on completion)

### Sprint 10-12: ERP Module (Weeks 10-12)

**Priority: Business operations**

1. Create Invoice model + CRUD
2. Create Payment Record model
3. Create Staff model + CRUD
4. Create Attendance model + API
5. Create Leave Request model + workflow
6. Create Payroll model + generation
7. Create Asset + Inventory models
8. Create Timetable + Room Booking models
9. Create ERP admin UI
10. Integrate with payment module (Stripe for invoices)
11. Integrate with student portal (parent invoice viewing)

### Sprint 13: Integration & Testing (Week 13)

1. Cross-module integration testing
2. Performance testing
3. Security audit
4. WP plugin migration (Certificate-Generator-v7 → GEMA)
5. WP plugin migration (participant-portal → GEMA)
6. Update chatbot-by-eshaan API calls
7. Documentation
8. Deployment

---

## 7. File Structure

```
backend/src/modules/
├── erp/
│   ├── erp.controller.ts
│   ├── erp.service.ts
│   ├── erp.routes.ts
│   ├── erp.types.ts
│   ├── finance/
│   │   ├── models/
│   │   │   ├── invoice.model.ts
│   │   │   ├── payment-record.model.ts
│   │   │   └── financial-report.model.ts
│   │   ├── services/
│   │   │   ├── invoice.service.ts
│   │   │   ├── payment.service.ts
│   │   │   └── report.service.ts
│   │   └── controllers/
│   │       ├── invoice.controller.ts
│   │       └── payment.controller.ts
│   ├── hr/
│   │   ├── models/
│   │   │   ├── staff.model.ts
│   │   │   ├── attendance.model.ts
│   │   │   ├── leave-request.model.ts
│   │   │   └── payroll.model.ts
│   │   ├── services/
│   │   │   ├── staff.service.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── leave.service.ts
│   │   │   └── payroll.service.ts
│   │   └── controllers/
│   │       ├── staff.controller.ts
│   │       └── attendance.controller.ts
│   ├── inventory/
│   │   ├── models/
│   │   │   ├── asset.model.ts
│   │   │   └── inventory-item.model.ts
│   │   └── services/
│   │       └── inventory.service.ts
│   └── scheduling/
│       ├── models/
│       │   ├── timetable.model.ts
│       │   ├── timetable-entry.model.ts
│       │   └── room-booking.model.ts
│       └── services/
│           └── scheduling.service.ts
│
├── lms/
│   ├── lms.controller.ts
│   ├── lms.service.ts
│   ├── lms.routes.ts
│   ├── lms.types.ts
│   ├── models/
│   │   ├── course.model.ts
│   │   ├── module.model.ts
│   │   ├── lesson.model.ts
│   │   ├── assignment.model.ts
│   │   ├── submission.model.ts
│   │   ├── course-progress.model.ts
│   │   └── grade-book.model.ts
│   ├── services/
│   │   ├── course.service.ts
│   │   ├── lesson.service.ts
│   │   ├── assignment.service.ts
│   │   ├── enrollment.service.ts
│   │   ├── grading.service.ts
│   │   └── progress.service.ts
│   └── controllers/
│       ├── course.controller.ts
│       ├── lesson.controller.ts
│       └── assignment.controller.ts
│
├── student-portal/
│   ├── portal.controller.ts
│   ├── portal.service.ts
│   ├── portal.routes.ts
│   ├── portal.types.ts
│   ├── models/
│   │   └── enrollment.model.ts
│   ├── submodules/
│   │   ├── dashboard/
│   │   │   └── dashboard.service.ts
│   │   ├── enrollments/
│   │   │   └── enrollment.service.ts
│   │   ├── certificates/
│   │   │   └── certificate.service.ts
│   │   ├── attendance/
│   │   │   └── attendance.service.ts
│   │   ├── grades/
│   │   │   └── grade.service.ts
│   │   └── schedule/
│   │       └── schedule.service.ts
│   └── controllers/
│       ├── student.controller.ts
│       └── parent.controller.ts
│
└── certificates/
    ├── certificates.controller.ts
    ├── certificates.service.ts
    ├── certificates.routes.ts
    ├── certificates.types.ts
    ├── models/
    │   ├── certificate-template.model.ts
    │   ├── certificate-record.model.ts
    │   ├── certificate-batch.model.ts
    │   └── certificate-verification-log.model.ts
    ├── services/
    │   ├── template.service.ts
    │   ├── generation.service.ts
    │   ├── bulk-generation.service.ts
    │   ├── email.service.ts
    │   └── export.service.ts
    ├── generators/
    │   ├── pdf.generator.ts
    │   ├── image.generator.ts
    │   └── qr-embedder.ts
    └── controllers/
        ├── template.controller.ts
        ├── generation.controller.ts
        └── verification.controller.ts
```

---

*Created: 2026-04-04*
