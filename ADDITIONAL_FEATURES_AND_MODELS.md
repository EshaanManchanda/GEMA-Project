# GEMA — Missing Features & Additional Models

> Comprehensive list of features and models NOT yet covered in the platform plan.
> Prioritized by business impact and user value.

---

## Missing Features Summary

| # | Feature | Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | Messaging & Communication System | Critical | High | P0 |
| 2 | Notice Board & Announcements | High | Low | P0 |
| 3 | Examination & Result Card System | High | Medium | P1 |
| 4 | Transport & Fleet Management | Medium | Medium | P1 |
| 5 | Library Management | Medium | Medium | P1 |
| 6 | Complaint & Grievance System | High | Low | P1 |
| 7 | Visitor Management | Medium | Low | P2 |
| 8 | Alumni Management | Low | Medium | P2 |
| 9 | Feedback & Survey System | High | Low | P1 |
| 10 | Waitlist Management | High | Low | P1 |
| 11 | Loyalty & Rewards Program | Medium | Medium | P2 |
| 12 | Referral & Affiliate Expansion | High | Low | P1 |
| 13 | Audit Log & Compliance | Critical | Medium | P0 |
| 14 | Webhook & Integration Hub | High | Medium | P1 |
| 15 | Helpdesk & Support Ticketing | Medium | Medium | P2 |
| 16 | Academic Calendar | High | Low | P1 |
| 17 | Hostel/Dormitory Management | Low | Medium | P3 |
| 18 | Front Office & Inquiry Management | Medium | Medium | P2 |
| 19 | Document Repository | Medium | Low | P2 |
| 20 | Analytics & BI Dashboard | High | High | P1 |

---

## 1. Messaging & Communication System

**Why needed:** Parents need to message teachers, teachers need to message parents, schools need to broadcast to all. Currently no internal communication channel.

### Models

#### Conversation Model

```typescript
// modules/messaging/models/conversation.model.ts

export enum ConversationType {
  DIRECT = "direct",
  GROUP = "group",
  BROADCAST = "broadcast",
  ANNOUNCEMENT = "announcement",
}

export enum ConversationScope {
  SCHOOL = "school",
  COURSE = "course",
  EVENT = "event",
  PLATFORM = "platform",
}

export interface IConversation extends Document {
  type: ConversationType;
  scope: ConversationScope;
  scopeId: mongoose.Types.ObjectId;     // schoolId, courseId, or eventId

  title?: string;
  description?: string;

  // Participants
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    role: "student" | "parent" | "teacher" | "admin" | "staff";
    joinedAt: Date;
    leftAt?: Date;
    isMuted: boolean;
    lastReadAt?: Date;
    unreadCount: number;
  }>;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  messageCount: number;
  lastMessageAt?: Date;
  lastMessagePreview?: string;

  // Settings
  settings: {
    allowReplies: boolean;
    allowAttachments: boolean;
    maxAttachmentSize: number;
    autoArchiveAfterDays: number;
  };

  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Message Model

```typescript
// modules/messaging/models/message.model.ts

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  VIDEO = "video",
  AUDIO = "audio",
  SYSTEM = "system",
  REACTION = "reaction",
}

export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  DELETED = "deleted",
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  replyTo?: mongoose.Types.ObjectId;     // Threaded replies

  type: MessageType;
  content: string;                       // Text or caption

  // Attachments
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    thumbnailUrl?: string;
  }>;

  status: MessageStatus;

  // Delivery tracking
  deliveredTo: Array<{
    userId: mongoose.Types.ObjectId;
    deliveredAt: Date;
  }>;

  readBy: Array<{
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }>;

  // Reactions
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;

  // Moderation
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
```

#### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/messaging/conversations` | all | List user's conversations |
| POST | `/api/messaging/conversations` | all | Create conversation |
| GET | `/api/messaging/conversations/:id` | participant | View conversation |
| GET | `/api/messaging/conversations/:id/messages` | participant | List messages (paginated) |
| POST | `/api/messaging/conversations/:id/messages` | participant | Send message |
| PATCH | `/api/messaging/messages/:id` | sender | Edit message |
| DELETE | `/api/messaging/messages/:id` | sender | Delete message |
| POST | `/api/messaging/messages/:id/reactions` | participant | React to message |
| POST | `/api/messaging/conversations/:id/read` | participant | Mark as read |
| POST | `/api/messaging/conversations/:id/mute` | participant | Mute conversation |
| POST | `/api/messaging/broadcast` | school, admin | Send broadcast message |
| GET | `/api/messaging/unread-count` | all | Unread message count |

---

## 2. Notice Board & Announcements

**Why needed:** Schools need to publish notices (holidays, events, emergencies) visible to all stakeholders. Different from messaging — one-to-many, pinned, categorized.

### Models

#### Notice Model

```typescript
// modules/notices/models/notice.model.ts

export enum NoticePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum NoticeCategory {
  GENERAL = "general",
  ACADEMIC = "academic",
  EXAMINATION = "examination",
  HOLIDAY = "holiday",
  EVENT = "event",
  EMERGENCY = "emergency",
  FEE_REMINDER = "fee_reminder",
  TRANSPORT = "transport",
  MAINTENANCE = "maintenance",
  OTHER = "other",
}

export enum NoticeTarget {
  ALL = "all",
  STUDENTS = "students",
  PARENTS = "parents",
  TEACHERS = "teachers",
  STAFF = "staff",
  SPECIFIC_GRADES = "specific_grades",
  SPECIFIC_SECTIONS = "specific_sections",
}

export interface INotice extends Document {
  schoolId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  title: string;
  content: string;                     // Rich text / HTML
  summary?: string;                    // Short preview

  priority: NoticePriority;
  category: NoticeCategory;
  target: NoticeTarget;
  targetGrades?: string[];
  targetSections?: string[];

  // Timing
  publishAt: Date;
  expireAt?: Date;
  isPinned: boolean;
  pinUntil?: Date;

  // Attachments
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;

  // Distribution
  sentVia: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  // Engagement
  stats: {
    viewsCount: number;
    acknowledgedCount: number;
    emailSentCount: number;
    smsSentCount: number;
  };

  // Acknowledgment
  requireAcknowledgment: boolean;
  acknowledgments: Array<{
    userId: mongoose.Types.ObjectId;
    acknowledgedAt: Date;
  }>;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notices` | all | List notices (filtered by role) |
| POST | `/api/notices` | school, admin | Create notice |
| GET | `/api/notices/:id` | all | View notice |
| PATCH | `/api/notices/:id` | school, admin | Update notice |
| DELETE | `/api/notices/:id` | school, admin | Delete notice |
| POST | `/api/notices/:id/pin` | school, admin | Pin notice |
| POST | `/api/notices/:id/acknowledge` | student, parent, teacher | Acknowledge notice |
| GET | `/api/notices/:id/stats` | school, admin | View notice stats |
| POST | `/api/notices/broadcast` | school, admin | Create + send notice |

---

## 3. Examination & Result Card System

**Why needed:** Schools need formal exam scheduling, hall ticket generation, mark sheets, report cards, transcripts. LMS grading handles assignments but not formal examinations.

### Models

#### Examination Model

```typescript
// modules/examinations/models/examination.model.ts

export enum ExamType {
  UNIT_TEST = "unit_test",
  MID_TERM = "mid_term",
  FINAL = "final",
  QUARTERLY = "quarterly",
  HALF_YEARLY = "half_yearly",
  ANNUAL = "annual",
  PRACTICAL = "practical",
  ORAL = "oral",
  MOCK = "mock",
}

export enum ExamStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  RESULTS_PUBLISHED = "results_published",
  CANCELLED = "cancelled",
}

export interface IExamination extends Document {
  schoolId: mongoose.Types.ObjectId;
  academicYear: string;
  term: string;

  name: string;
  type: ExamType;
  status: ExamStatus;

  // Schedule
  startDate: Date;
  endDate: Date;

  // Grading
  gradingScale: {
    type: "percentage" | "gpa" | "letter" | "custom";
    passingPercentage: number;
    gradeBoundaries: Array<{
      grade: string;
      minScore: number;
      maxScore: number;
      gpa: number;
    }>;
  };

  // Settings
  hallTicketEnabled: boolean;
  resultCardEnabled: boolean;
  publishResultsToParents: boolean;

  // Stats
  stats: {
    totalStudents: number;
    appearedCount: number;
    absentCount: number;
    passedCount: number;
    failedCount: number;
    passPercentage: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Exam Schedule Model

```typescript
// modules/examinations/models/exam-schedule.model.ts

export interface IExamSchedule extends Document {
  examinationId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;

  grade: string;
  section?: string;
  subject: string;

  date: Date;
  startTime: string;
  endTime: string;
  duration: number;                    // Minutes

  room?: string;
  building?: string;
  floor?: number;

  invigilators: mongoose.Types.ObjectId[];
  maxMarks: number;

  // Paper
  paperSet: "A" | "B" | "C";
  paperUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Exam Result Model

```typescript
// modules/examinations/models/exam-result.model.ts

export interface IExamResult extends Document {
  examinationId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;

  // Marks
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  gpa: number;

  // Status
  status: "appeared" | "absent" | "malpractice" | "exempted";
  result: "pass" | "fail" | "compartment";

  // Breakdown (per section/question group)
  breakdown?: Array<{
    section: string;
    marksObtained: number;
    maxMarks: number;
  }>;

  // Teacher remarks
  remarks?: string;
  gradedBy: mongoose.Types.ObjectId;
  gradedAt: Date;

  // Verification
  isPublished: boolean;
  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Report Card Model

```typescript
// modules/examinations/models/report-card.model.ts

export interface IReportCard extends Document {
  schoolId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  academicYear: string;
  term: string;

  // Subject-wise results
  subjects: Array<{
    subject: string;
    examResults: Array<{
      examType: ExamType;
      marksObtained: number;
      maxMarks: number;
      percentage: number;
      grade: string;
    }>;
    totalMarks: number;
    totalMaxMarks: number;
    overallPercentage: number;
    overallGrade: string;
    teacherRemarks: string;
  }>;

  // Overall
  overall: {
    totalMarks: number;
    totalMaxMarks: number;
    percentage: number;
    grade: string;
    gpa: number;
    rank: number;
    totalStudents: number;
    result: "pass" | "fail" | "promoted";
  };

  // Attendance summary
  attendance: {
    totalDays: number;
    present: number;
    absent: number;
    percentage: number;
  };

  // Co-scholastic
  coScholastic: Array<{
    area: string;
    grade: string;
    remarks: string;
  }>;

  // Signatures
  classTeacherRemarks: string;
  principalRemarks: string;
  parentSignature: boolean;

  // Document
  pdfUrl?: string;
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
```

#### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/examinations` | school, teacher, admin | List examinations |
| POST | `/api/examinations` | school, admin | Create examination |
| GET | `/api/examinations/:id` | school, teacher, parent | View examination |
| PATCH | `/api/examinations/:id` | school, admin | Update examination |
| GET | `/api/examinations/:id/schedule` | school, teacher | View exam schedule |
| POST | `/api/examinations/:id/schedule` | school, admin | Create exam schedule |
| GET | `/api/examinations/:id/hall-tickets` | school | Generate hall tickets |
| GET | `/api/examinations/:id/results` | teacher | View all results |
| POST | `/api/examinations/:id/results` | teacher | Bulk enter results |
| PATCH | `/api/examinations/:id/results/:studentId` | teacher | Update result |
| POST | `/api/examinations/:id/results/publish` | school, admin | Publish results |
| GET | `/api/examinations/student/:id/results` | student, parent | Student's results |
| GET | `/api/examinations/student/:id/report-card` | student, parent | View report card |
| POST | `/api/examinations/report-card/generate` | school, admin | Generate report cards |
| GET | `/api/examinations/report-card/:id/download` | student, parent | Download report card |

---

## 4. Transport & Fleet Management

**Why needed:** Schools with bus services need route management, student assignment to routes, tracking, fee collection for transport.

### Models

#### Route Model

```typescript
// modules/transport/models/route.model.ts

export enum RouteStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SEASONAL = "seasonal",
}

export interface IRoute extends Document {
  schoolId: mongoose.Types.ObjectId;
  routeNumber: string;                  // RT-001
  name: string;
  status: RouteStatus;

  type: "pickup" | "drop" | "both";

  // Schedule
  startTime: string;
  endTime: string;

  // Stops
  stops: Array<{
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    arrivalTime: string;
    departureTime: string;
    order: number;
  }>;

  // Vehicle
  vehicleId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  attendantId?: mongoose.Types.ObjectId;

  // Capacity
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;

  // Fee
  monthlyFee: number;
  currency: string;

  // Stats
  stats: {
    studentCount: number;
    onTimePercentage: number;
    totalTrips: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Vehicle Model

```typescript
// modules/transport/models/vehicle.model.ts

export enum VehicleType {
  BUS = "bus",
  VAN = "van",
  CAR = "car",
  MINI_BUS = "mini_bus",
}

export enum VehicleStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  OUT_OF_SERVICE = "out_of_service",
  RETIRED = "retired",
}

export interface IVehicle extends Document {
  schoolId: mongoose.Types.ObjectId;
  vehicleNumber: string;
  type: VehicleType;
  status: VehicleStatus;

  // Details
  make: string;
  model: string;
  year: number;
  color: string;
  capacity: number;

  // Registration
  registrationNumber: string;
  registrationExpiry: Date;
  insuranceNumber: string;
  insuranceExpiry: Date;
  fitnessCertificateExpiry: Date;

  // GPS
  gpsDeviceId?: string;
  gpsEnabled: boolean;

  // Maintenance
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  odometerReading: number;

  // Documents
  documents: Array<{
    type: string;
    url: string;
    expiryDate: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Student Transport Model

```typescript
// modules/transport/models/student-transport.model.ts

export interface IStudentTransport extends Document {
  schoolId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;

  // Pickup
  pickupStopId: mongoose.Types.ObjectId;
  pickupTime: string;

  // Drop
  dropStopId: mongoose.Types.ObjectId;
  dropTime: string;

  // Fee
  monthlyFee: number;
  paymentStatus: "paid" | "unpaid" | "partial";

  // Attendance tracking
  attendance: Array<{
    date: Date;
    morning: { boarded: boolean; time?: Date; stop?: string };
    evening: { boarded: boolean; time?: Date; stop?: string };
  }>;

  isActive: boolean;
  startDate: Date;
  endDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. Library Management

**Why needed:** Schools need book cataloging, issue/return tracking, fine calculation, inventory management.

### Models

#### Book Model

```typescript
// modules/library/models/book.model.ts

export enum BookStatus {
  AVAILABLE = "available",
  ISSUED = "issued",
  RESERVED = "reserved",
  LOST = "lost",
  DAMAGED = "damaged",
  WEED_OUT = "weed_out",
}

export interface IBook extends Document {
  schoolId: mongoose.Types.ObjectId;
  accessionNumber: string;              // Unique per copy
  isbn?: string;
  title: string;
  author: string;
  publisher: string;
  publishYear: number;
  edition?: string;
  category: string;
  subCategory?: string;
  language: string;
  pages: number;

  // Physical
  shelf: string;
  rack: string;
  row: string;

  // Pricing
  price: number;
  currency: string;

  status: BookStatus;
  totalCopies: number;
  availableCopies: number;

  // Tracking
  issuedCount: number;
  lastIssuedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Book Issue Model

```typescript
// modules/library/models/book-issue.model.ts

export enum IssueStatus {
  ISSUED = "issued",
  RETURNED = "returned",
  OVERDUE = "overdue",
  LOST = "lost",
  DAMAGED = "returned_damaged",
}

export interface IBookIssue extends Document {
  schoolId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;    // Librarian

  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;

  status: IssueStatus;

  // Fine
  fine: {
    perDay: number;
    totalDays: number;
    totalAmount: number;
    paid: boolean;
    paidAt?: Date;
    paymentId?: mongoose.Types.ObjectId;
  };

  // Damage
  damage?: {
    description: string;
    fineAmount: number;
    assessedBy: mongoose.Types.ObjectId;
    assessedAt: Date;
  };

  // Renewals
  renewals: number;
  maxRenewals: number;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. Complaint & Grievance System

**Why needed:** Parents and students need a formal channel to raise complaints about facilities, teachers, bullying, safety, etc.

### Models

#### Complaint Model

```typescript
// modules/complaints/models/complaint.model.ts

export enum ComplaintCategory {
  ACADEMIC = "academic",
  BEHAVIORAL = "behavioral",
  BULLYING = "bullying",
  SAFETY = "safety",
  FACILITY = "facility",
  TRANSPORT = "transport",
  FOOD = "food",
  FEE = "fee",
  STAFF = "staff",
  DISCRIMINATION = "discrimination",
  OTHER = "other",
}

export enum ComplaintPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ComplaintStatus {
  OPEN = "open",
  UNDER_REVIEW = "under_review",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REJECTED = "rejected",
  ESCALATED = "escalated",
}

export interface IComplaint extends Document {
  schoolId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;    // Parent or student
  assignedTo?: mongoose.Types.ObjectId; // Staff handling it

  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;

  title: string;
  description: string;

  // Subject
  subject?: {
    type: "teacher" | "staff" | "student" | "facility" | "system" | "other";
    id?: mongoose.Types.ObjectId;
    name: string;
  };

  // Evidence
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;

  // Timeline
  raisedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;

  // Resolution
  resolution?: {
    summary: string;
    actionsTaken: string;
    satisfactionRating?: number;        // 1-5 from complainant
  };

  // Escalation
  escalationHistory: Array<{
    escalatedAt: Date;
    escalatedBy: mongoose.Types.ObjectId;
    escalatedTo: mongoose.Types.ObjectId;
    reason: string;
  }>;

  // SLA
  slaDeadline: Date;
  isOverdue: boolean;

  // Confidentiality
  isConfidential: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

#### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/complaints` | school, parent, student | List complaints |
| POST | `/api/complaints` | parent, student, teacher | Raise complaint |
| GET | `/api/complaints/:id` | involved parties | View complaint |
| PATCH | `/api/complaints/:id` | school, admin | Update complaint |
| POST | `/api/complaints/:id/assign` | school, admin | Assign to staff |
| POST | `/api/complaints/:id/escalate` | all | Escalate complaint |
| POST | `/api/complaints/:id/resolve` | assigned staff | Mark resolved |
| POST | `/api/complaints/:id/rate` | complainant | Rate resolution |
| GET | `/api/complaints/stats` | school, admin | Complaint statistics |

---

## 7. Visitor Management

**Why needed:** Schools need to track who enters the premises — parents, vendors, delivery, interviews.

### Models

#### Visitor Model

```typescript
// modules/visitors/models/visitor.model.ts

export enum VisitorType {
  PARENT = "parent",
  VENDOR = "vendor",
  DELIVERY = "delivery",
  INTERVIEW = "interview",
  OFFICIAL = "official",
  MAINTENANCE = "maintenance",
  OTHER = "other",
}

export enum VisitStatus {
  EXPECTED = "expected",
  CHECKED_IN = "checked_in",
  CHECKED_OUT = "checked_out",
  NO_SHOW = "no_show",
}

export interface IVisitor extends Document {
  schoolId: mongoose.Types.ObjectId;
  visitorType: VisitorType;
  status: VisitStatus;

  // Visitor details
  name: string;
  phone: string;
  email?: string;
  idType?: "passport" | "driver_license" | "national_id" | "other";
  idNumber?: string;
  photo?: string;                    // Photo taken at gate

  // Visit details
  purpose: string;
  personToMeet: mongoose.Types.ObjectId;
  expectedAt: Date;
  actualCheckIn?: Date;
  actualCheckOut?: Date;

  // Gate
  gateNumber: string;
  checkedInBy?: mongoose.Types.ObjectId;
  checkedOutBy?: mongoose.Types.ObjectId;

  // Badge
  badgeNumber?: string;
  badgePrinted: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 8. Alumni Management

**Why needed:** Schools want to maintain relationships with graduates for networking, donations, events, referrals.

### Models

#### Alumni Model

```typescript
// modules/alumni/models/alumni.model.ts

export interface IAlumni extends Document {
  schoolId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;    // If they have an account

  // Personal
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  currentLocation: {
    city: string;
    country: string;
  };

  // Academic
  graduationYear: number;
  grade: string;
  section?: string;

  // Career
  currentOccupation?: string;
  company?: string;
  industry?: string;
  linkedin?: string;

  // Engagement
  interests: string[];
  willingToMentor: boolean;
  willingToDonate: boolean;
  willingToSpeak: boolean;

  // Stats
  eventsAttended: number;
  donationsTotal: number;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 9. Feedback & Survey System

**Why needed:** Schools need structured feedback on courses, teachers, events, facilities. Different from reviews — internal, anonymous, multi-question.

### Models

#### Survey Model

```typescript
// modules/feedback/models/survey.model.ts

export enum SurveyStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  CLOSED = "closed",
}

export enum QuestionType {
  RATING = "rating",
  MULTIPLE_CHOICE = "multiple_choice",
  SINGLE_CHOICE = "single_choice",
  TEXT = "text",
  LONG_TEXT = "long_text",
  SCALE = "scale",                  // 1-10 scale
  NPS = "nps",                      // Net Promoter Score
}

export interface ISurvey extends Document {
  schoolId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: SurveyStatus;

  // Target
  target: {
    type: "all" | "students" | "parents" | "teachers" | "staff" | "custom";
    grades?: string[];
    specificUsers?: mongoose.Types.ObjectId[];
  };

  // Questions
  questions: Array<{
    id: string;
    type: QuestionType;
    text: string;
    required: boolean;
    options?: string[];
    scale?: { min: number; max: number; minLabel: string; maxLabel: string };
    order: number;
  }>;

  // Timing
  openAt: Date;
  closeAt: Date;
  anonymous: boolean;

  // Stats
  stats: {
    sentCount: number;
    responseCount: number;
    responseRate: number;
    averageCompletionTime: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Survey Response Model

```typescript
// modules/feedback/models/survey-response.model.ts

export interface ISurveyResponse extends Document {
  surveyId: mongoose.Types.ObjectId;
  respondentId?: mongoose.Types.ObjectId;  // Null if anonymous
  schoolId: mongoose.Types.ObjectId;

  answers: Array<{
    questionId: string;
    value: string | number | string[];
  }>;

  completedAt: Date;
  timeSpent: number;                // Seconds
  isComplete: boolean;

  createdAt: Date;
}
```

#### Course/Teacher Feedback Model

```typescript
// modules/feedback/models/course-feedback.model.ts

export interface ICourseFeedback extends Document {
  courseId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;

  ratings: {
    content: number;                // 1-5
    teaching: number;
    pace: number;
    materials: number;
    overall: number;
  };

  comments?: string;
  wouldRecommend: boolean;

  // Teacher-specific
  teacherRatings?: {
    knowledge: number;
    communication: number;
    responsiveness: number;
    fairness: number;
  };

  isAnonymous: boolean;
  createdAt: Date;
}
```

---

## 10. Waitlist Management

**Why needed:** When events/courses are full, users should be able to join a waitlist and get auto-notified when spots open.

### Models

#### Waitlist Entry Model

```typescript
// modules/waitlist/models/waitlist.model.ts

export enum WaitlistStatus {
  WAITING = "waiting",
  OFFERED = "offered",
  CONFIRMED = "confirmed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum WaitlistType {
  EVENT = "event",
  COURSE = "course",
}

export interface IWaitlistEntry extends Document {
  type: WaitlistType;
  targetId: mongoose.Types.ObjectId;    // Event ID or Course ID
  userId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;  // If parent booking for child

  position: number;                     // Queue position
  status: WaitlistStatus;

  // Notification
  notifiedAt?: Date;
  notifiedVia: "email" | "sms" | "push";
  expiresAt?: Date;                     // Deadline to confirm

  // Auto-promotion
  autoPromote: boolean;                 // Auto-confirm if spot opens
  paymentMethod?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 11. Loyalty & Rewards Program

**Why needed:** Encourage repeat bookings, referrals, and engagement through points, badges, and tiers.

### Models

#### Loyalty Account Model

```typescript
// modules/loyalty/models/loyalty-account.model.ts

export enum LoyaltyTier {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

export interface ILoyaltyAccount extends Document {
  userId: mongoose.Types.ObjectId;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  tierSince: Date;
  nextTierPoints: number;

  // Earning history
  earningHistory: Array<{
    points: number;
    reason: string;
    referenceType: string;
    referenceId: mongoose.Types.ObjectId;
    earnedAt: Date;
  }>;

  // Redemption history
  redemptionHistory: Array<{
    points: number;
    reward: string;
    redeemedAt: Date;
    status: "pending" | "fulfilled" | "expired";
  }>;

  // Badges
  badges: Array<{
    badgeId: string;
    name: string;
    earnedAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Reward Model

```typescript
// modules/loyalty/models/reward.model.ts

export interface IReward extends Document {
  name: string;
  description: string;
  pointsCost: number;
  type: "discount" | "free_ticket" | "merchandise" | "experience" | "custom";

  // Discount rewards
  discount?: {
    type: "percentage" | "fixed";
    value: number;
    maxDiscount?: number;
    applicableTo: "events" | "courses" | "all";
  };

  // Availability
  totalStock?: number;
  claimedCount: number;
  perUserLimit?: number;

  // Timing
  validFrom: Date;
  validUntil: Date;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 12. Referral & Affiliate Expansion

**Why needed:** Existing affiliate system is basic. Expand to support referral codes, multi-level commissions, school-level referral programs.

### Models

#### Referral Code Model

```typescript
// modules/referrals/models/referral-code.model.ts

export interface IReferralCode extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;                         // Unique, e.g., "JOHN2026"
  type: "user" | "school" | "vendor" | "campaign";

  // Rewards
  referrerReward: {
    type: "points" | "discount" | "cash";
    value: number;
  };
  refereeReward: {
    type: "points" | "discount" | "cash";
    value: number;
  };

  // Limits
  maxUses?: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Referral Tracking Model

```typescript
// modules/referrals/models/referral-tracking.model.ts

export interface IReferralTracking extends Document {
  referrerId: mongoose.Types.ObjectId;
  refereeId: mongoose.Types.ObjectId;
  referralCode: string;

  conversionType: "signup" | "booking" | "enrollment";
  conversionId?: mongoose.Types.ObjectId;  // Booking or enrollment ID

  // Reward
  referrerRewardStatus: "pending" | "granted" | "expired";
  refereeRewardStatus: "pending" | "granted" | "expired";

  // Value
  conversionValue: number;              // Booking amount
  commissionAmount: number;

  createdAt: Date;
}
```

---

## 13. Audit Log & Compliance

**Why needed:** Track every data change for compliance, debugging, and accountability. Critical for schools handling student data.

### Models

#### Audit Log Model

```typescript
// modules/audit/models/audit-log.model.ts

export enum AuditAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  EXPORT = "export",
  IMPORT = "import",
  PERMISSION_CHANGE = "permission_change",
  ROLE_CHANGE = "role_change",
  PAYMENT = "payment",
  REFUND = "refund",
}

export enum AuditSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface IAuditLog extends Document {
  // Actor
  userId: mongoose.Types.ObjectId;
  userRole: string;
  ipAddress: string;
  userAgent: string;

  // Action
  action: AuditAction;
  severity: AuditSeverity;
  resource: string;                   // "User", "Event", "Invoice", etc.
  resourceId: mongoose.Types.ObjectId;

  // Details
  description: string;
  metadata?: Record<string, any>;

  // Changes (for UPDATE actions)
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;

  // Result
  status: "success" | "failure";
  errorMessage?: string;

  // Compliance
  retentionUntil: Date;               // Auto-delete after this date
  isExportable: boolean;

  createdAt: Date;
}
```

#### Data Retention Policy Model

```typescript
// modules/audit/models/retention-policy.model.ts

export interface IRetentionPolicy extends Document {
  schoolId?: mongoose.Types.ObjectId;
  resource: string;
  retentionPeriod: number;            // Days
  autoDelete: boolean;
  anonymizeInstead: boolean;
  exceptions: Array<{
    condition: string;
    extendedPeriod: number;
  }>;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 14. Webhook & Integration Hub

**Why needed:** Third-party integrations (payment gateways, SMS providers, accounting software, CRMs) need webhook endpoints and API key management.

### Models

#### Webhook Model

```typescript
// modules/integrations/models/webhook.model.ts

export enum WebhookStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
  FAILED = "failed",
}

export interface IWebhook extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  name: string;
  url: string;
  status: WebhookStatus;

  // Events to subscribe to
  events: string[];                   // ["booking.created", "payment.completed", etc.]

  // Security
  secret: string;                     // HMAC signing secret
  headers?: Record<string, string>;

  // Retry
  retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    timeoutMs: number;
  };

  // Stats
  stats: {
    totalSent: number;
    totalFailed: number;
    lastSentAt?: Date;
    lastError?: string;
    lastErrorAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### Webhook Delivery Log Model

```typescript
// modules/integrations/models/webhook-delivery.model.ts

export interface IWebhookDelivery extends Document {
  webhookId: mongoose.Types.ObjectId;
  event: string;
  payload: Record<string, any>;

  attempt: number;
  maxAttempts: number;

  status: "pending" | "success" | "failed" | "retrying";
  responseCode?: number;
  responseBody?: string;
  error?: string;

  sentAt: Date;
  respondedAt?: Date;
  nextRetryAt?: Date;

  createdAt: Date;
}
```

#### API Key Model

```typescript
// modules/integrations/models/api-key.model.ts

export interface IApiKey extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  name: string;
  keyHash: string;                    // Never store plain key
  keyPrefix: string;                  // First 8 chars for display

  // Permissions
  scopes: string[];                   // ["read:events", "write:bookings", etc.]
  ipWhitelist?: string[];

  // Usage
  lastUsedAt?: Date;
  usageCount: number;

  // Timing
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 15. Helpdesk & Support Ticketing

**Why needed:** Platform support, school IT support, parent inquiries need a structured ticketing system.

### Models

#### Support Ticket Model

```typescript
// modules/helpdesk/models/support-ticket.model.ts

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  WAITING_CUSTOMER = "waiting_customer",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum TicketCategory {
  TECHNICAL = "technical",
  BILLING = "billing",
  ACCOUNT = "account",
  FEATURE_REQUEST = "feature_request",
  BUG_REPORT = "bug_report",
  GENERAL = "general",
}

export interface ISupportTicket extends Document {
  ticketNumber: string;               // TKT-2026-00001
  schoolId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  subject: string;
  description: string;

  // Assignment
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;

  // Messages
  messages: Array<{
    senderId: mongoose.Types.ObjectId;
    senderType: "user" | "agent" | "system";
    content: string;
    attachments?: string[];
    createdAt: Date;
  }>;

  // Resolution
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolution: string;
  closedAt?: Date;

  // Satisfaction
  satisfactionRating?: number;        // 1-5
  satisfactionComment?: string;

  // SLA
  slaDeadline: Date;
  isOverdue: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 16. Academic Calendar

**Why needed:** Schools need a shared calendar showing holidays, exam dates, events, parent-teacher meetings.

### Models

#### Calendar Event Model

```typescript
// modules/calendar/models/calendar-event.model.ts

export enum CalendarEventType {
  HOLIDAY = "holiday",
  EXAM = "exam",
  EVENT = "event",
  MEETING = "meeting",
  DEADLINE = "deadline",
  ACTIVITY = "activity",
  MAINTENANCE = "maintenance",
  CUSTOM = "custom",
}

export enum CalendarEventVisibility {
  PUBLIC = "public",
  SCHOOL = "school",
  GRADE = "grade",
  PRIVATE = "private",
}

export interface ICalendarEvent extends Document {
  schoolId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: CalendarEventType;
  visibility: CalendarEventVisibility;

  // Timing
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    count?: number;
    until?: Date;
    daysOfWeek?: string[];
  };

  // Target
  targetGrades?: string[];
  targetSections?: string[];

  // Reminders
  reminders: Array<{
    type: "email" | "sms" | "push" | "in_app";
    minutesBefore: number;
  }>;

  color?: string;
  icon?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 17. Hostel/Dormitory Management

**Why needed:** Boarding schools need room allocation, attendance, fee management for hostel residents.

### Models

#### Hostel Model

```typescript
// modules/hostel/models/hostel.model.ts

export enum HostelGender {
  MALE = "male",
  FEMALE = "female",
  CO_ED = "co_ed",
}

export interface IHostel extends Document {
  schoolId: mongoose.Types.ObjectId;
  name: string;
  gender: HostelGender;
  wardenId: mongoose.Types.ObjectId;

  // Capacity
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;

  // Fee
  monthlyFee: number;
  currency: string;

  // Facilities
  facilities: string[];               // ["wifi", "ac", "mess", "laundry", etc.]

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Room Model

```typescript
// modules/hostel/models/room.model.ts

export interface IHostelRoom extends Document {
  hostelId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor: number;
  bedCapacity: number;
  occupiedBeds: number;
  roomType: "single" | "double" | "triple" | "dormitory";

  occupants: Array<{
    studentId: mongoose.Types.ObjectId;
    bedNumber: string;
    checkInDate: Date;
    checkOutDate?: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 18. Front Office & Inquiry Management

**Why needed:** Schools receive inquiries from prospective parents — need CRM-like tracking from inquiry to enrollment.

### Models

#### Inquiry Model

```typescript
// modules/inquiries/models/inquiry.model.ts

export enum InquirySource {
  WEBSITE = "website",
  PHONE = "phone",
  EMAIL = "email",
  WALK_IN = "walk_in",
  REFERRAL = "referral",
  SOCIAL_MEDIA = "social_media",
  ADVERTISEMENT = "advertisement",
  OTHER = "other",
}

export enum InquiryStatus {
  NEW = "new",
  CONTACTED = "contacted",
  INTERESTED = "interested",
  VISIT_SCHEDULED = "visit_scheduled",
  VISIT_COMPLETED = "visit_completed",
  APPLICATION_SUBMITTED = "application_submitted",
  ENROLLED = "enrolled",
  NOT_INTERESTED = "not_interested",
  LOST = "lost",
}

export interface IInquiry extends Document {
  schoolId: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;

  // Parent details
  parentName: string;
  parentEmail: string;
  parentPhone: string;

  // Student details
  studentName: string;
  studentDOB: Date;
  applyingForGrade: string;

  source: InquirySource;
  status: InquiryStatus;

  // Notes
  notes: Array<{
    content: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;

  // Follow-up
  nextFollowUp?: Date;
  lastContactedAt?: Date;

  // Conversion
  convertedToStudentId?: mongoose.Types.ObjectId;
  convertedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 19. Document Repository

**Why needed:** Schools need a centralized place for policies, forms, circulars, syllabus documents.

### Models

#### Document Model

```typescript
// modules/documents/models/document.model.ts

export enum DocumentCategory {
  POLICY = "policy",
  FORM = "form",
  CIRCULAR = "circular",
  SYLLABUS = "syllabus",
  REPORT = "report",
  CERTIFICATE = "certificate",
  GUIDE = "guide",
  OTHER = "other",
}

export interface IDocument extends Document {
  schoolId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: DocumentCategory;

  // File
  fileUrl: string;
  fileType: string;
  fileSize: number;

  // Access
  visibility: "public" | "school" | "grade" | "private";
  targetGrades?: string[];
  targetRoles?: string[];

  // Versioning
  version: number;
  previousVersionId?: mongoose.Types.ObjectId;

  // Metadata
  tags: string[];
  uploadedBy: mongoose.Types.ObjectId;

  // Stats
  downloadCount: number;
  viewCount: number;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 20. Analytics & BI Dashboard

**Why needed:** Cross-platform analytics — enrollment trends, revenue, attendance patterns, course popularity, student performance.

### Models

#### Analytics Snapshot Model

```typescript
// modules/analytics/models/analytics-snapshot.model.ts

export interface IAnalyticsSnapshot extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;

  date: Date;
  granularity: "daily" | "weekly" | "monthly";

  // Enrollment
  enrollment: {
    totalStudents: number;
    newEnrollments: number;
    dropouts: number;
    activeCourses: number;
    activeEvents: number;
  };

  // Revenue
  revenue: {
    totalCollected: number;
    totalInvoiced: number;
    totalOutstanding: number;
    bySource: Record<string, number>;
    byPaymentMethod: Record<string, number>;
  };

  // Attendance
  attendance: {
    studentAttendanceRate: number;
    staffAttendanceRate: number;
    averagePresent: number;
    averageAbsent: number;
  };

  // Academic
  academic: {
    averageGrade: number;
    passPercentage: number;
    courseCompletionRate: number;
    certificateIssued: number;
  };

  // Engagement
  engagement: {
    activeUsers: number;
    messagesSent: number;
    noticesPublished: number;
    complaintsRaised: number;
    complaintsResolved: number;
  };

  createdAt: Date;
}
```

#### Dashboard Widget Model

```typescript
// modules/analytics/models/dashboard-widget.model.ts

export interface IDashboardWidget extends Document {
  schoolId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  title: string;
  type: "chart" | "stat" | "table" | "list" | "calendar";
  dataSource: string;
  config: Record<string, any>;

  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  order: number;
  isVisible: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Prioritized Implementation Roadmap

### Phase 1: Critical (Do First — Weeks 1-4)

| Feature | Why First |
|---|---|
| **Audit Log** | Compliance, debugging, accountability — needed from day 1 |
| **Messaging** | Core communication between all stakeholders |
| **Notice Board** | Schools need this immediately for operations |
| **Waitlist** | Revenue impact — captures demand when events/courses are full |

### Phase 2: High Impact (Weeks 5-8)

| Feature | Why |
|---|---|
| **Examination & Results** | Core school function — parents expect report cards |
| **Feedback & Surveys** | Quality improvement, teacher evaluation |
| **Referral Expansion** | Growth engine — word-of-mouth acquisition |
| **Webhook & Integration Hub** | Third-party extensibility |
| **Academic Calendar** | Shared visibility for all stakeholders |

### Phase 3: Medium Impact (Weeks 9-12)

| Feature | Why |
|---|---|
| **Complaint System** | Trust & safety — formal grievance channel |
| **Transport Management** | Revenue stream + operational necessity |
| **Library Management** | Standard school feature |
| **Analytics & BI** | Data-driven decisions |
| **Helpdesk** | Support operations |

### Phase 4: Nice to Have (Weeks 13+)

| Feature | Why |
|---|---|
| **Visitor Management** | Security — good for larger schools |
| **Loyalty & Rewards** | Retention — works after you have user base |
| **Alumni Management** | Long-term engagement |
| **Hostel Management** | Niche — only for boarding schools |
| **Front Office / CRM** | Sales pipeline — for schools actively recruiting |
| **Document Repository** | Nice to have — can start with simple file storage |

---

## Complete Model Count

| Module | Models | Total |
|---|---|---|
| **Core (existing plan)** | User, School, Student, Parent, Teacher, Employee, Event, Enrollment, etc. | ~30 |
| **ERP** | Invoice, PaymentRecord, FinancialReport, Staff, Attendance, LeaveRequest, PayrollRun, Asset, InventoryItem, Timetable, TimetableEntry, RoomBooking | 12 |
| **LMS** | Course, Module, Lesson, Assignment, Submission, CourseProgress, GradeBook | 7 |
| **Certificates** | CertificateTemplate, CertificateRecord, CertificateBatch, VerificationLog | 4 |
| **Messaging** | Conversation, Message | 2 |
| **Notices** | Notice | 1 |
| **Examinations** | Examination, ExamSchedule, ExamResult, ReportCard | 4 |
| **Transport** | Route, Vehicle, StudentTransport | 3 |
| **Library** | Book, BookIssue | 2 |
| **Complaints** | Complaint | 1 |
| **Visitors** | Visitor | 1 |
| **Alumni** | Alumni | 1 |
| **Feedback** | Survey, SurveyResponse, CourseFeedback | 3 |
| **Waitlist** | WaitlistEntry | 1 |
| **Loyalty** | LoyaltyAccount, Reward | 2 |
| **Referrals** | ReferralCode, ReferralTracking | 2 |
| **Audit** | AuditLog, RetentionPolicy | 2 |
| **Integrations** | Webhook, WebhookDelivery, ApiKey | 3 |
| **Helpdesk** | SupportTicket | 1 |
| **Calendar** | CalendarEvent | 1 |
| **Hostel** | Hostel, HostelRoom | 2 |
| **Inquiries** | Inquiry | 1 |
| **Documents** | Document | 1 |
| **Analytics** | AnalyticsSnapshot, DashboardWidget | 2 |
| **TOTAL** | | **~86 models** |

---

*Created: 2026-04-04*
