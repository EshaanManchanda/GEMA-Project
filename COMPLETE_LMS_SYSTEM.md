# GEMA — Complete LMS System (LearnDash + Tutor LMS + Examination)

> Comprehensive LMS specification combining LearnDash, Tutor LMS, and SpeedExam features.
> Covers course creation, content delivery, assessments, community, monetization, and analytics.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GEMA LMS Platform                                   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Course Management Layer                             │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐   │  │
│  │  │  Course     │  │  Module &   │  │  Content Delivery          │   │  │
│  │  │  Builder    │  │  Lesson Mgr │  │  (Video, Text, PDF, Live)  │   │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────────────┘   │  │
│  └───────────────────────────────────┬─────────────────────────────────┘  │
│                                      │                                     │
│  ┌───────────────────────────────────▼─────────────────────────────────┐  │
│  │                    Assessment & Grading Layer                        │  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐  │  │
│  │  │  Quiz       │  │ Assignment  │  │  Gradebook &               │  │  │
│  │  │  Engine     │  │  Manager    │  │  Analytics                 │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────────────┘  │  │
│  └───────────────────────────────────┬─────────────────────────────────┘  │
│                                      │                                     │
│  ┌───────────────────────────────────▼─────────────────────────────────┐  │
│  │                    Engagement & Community Layer                      │  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐  │  │
│  │  │  Q&A Forum  │  │ Discussion  │  │  Notifications &           │  │  │
│  │  │             │  │  Threads    │  │  Messaging                 │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────────────┘  │  │
│  └───────────────────────────────────┬─────────────────────────────────┘  │
│                                      │                                     │
│  ┌───────────────────────────────────▼─────────────────────────────────┐  │
│  │                    Monetization & Access Layer                       │  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐  │  │
│  │  │  Payments   │  │  Coupons &  │  │  Subscription &            │  │  │
│  │  │  (Stripe)   │  │  Discounts  │  │  Revenue Share             │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Certification & Completion                        │  │
│  │                                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐  │  │
│  │  │ Certificate │  │  Badges &   │  │  Completion Tracking &     │  │  │
│  │  │  Generator  │  │  Achievements│  │  Drip-Feed                 │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Data Models

### 1. Enhanced Course Model

```typescript
// modules/lms/models/course.model.ts

export enum CourseStatus {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  SCHEDULED = "scheduled",
  PRIVATE = "private",
}

export enum CourseType {
  SELF_PACED = "self_paced",
  INSTRUCTOR_LED = "instructor_led",
  BLENDED = "blended",
  LIVE = "live",
  COHORT = "cohort",
}

export enum CourseLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  ALL_LEVELS = "all_levels",
}

export enum EnrollmentType {
  OPEN = "open",
  APPROVAL_REQUIRED = "approval_required",
  INVITATION_ONLY = "invitation_only",
  CLOSED = "closed",
}

export enum DripFeedMode {
  NONE = "none",
  INTERVAL = "interval",            // X days after enrollment
  SCHEDULED = "scheduled",          // Specific date
  AFTER_PREREQUISITE = "after_prerequisite",
}

export interface ICourseInstructor {
  userId: mongoose.Types.ObjectId;
  role: "primary" | "co_instructor" | "teaching_assistant";
  revenueShare: number;             // Percentage
  joinedAt: Date;
}

export interface ICourse extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;

  // Basic Info
  code: string;                     // CRS-101
  title: string;
  slug: string;
  subtitle?: string;
  description: string;              // Rich text
  thumbnail?: string;
  coverImage?: string;
  promoVideo?: {
    url: string;
    provider: "youtube" | "vimeo" | "self_hosted";
    duration: number;
  };

  // Classification
  type: CourseType;
  level: CourseLevel;
  category: mongoose.Types.ObjectId;
  subCategories: mongoose.Types.ObjectId[];
  tags: string[];
  language: string;
  status: CourseStatus;

  // Instructors
  instructors: ICourseInstructor[];

  // Pricing
  pricing: {
    isFree: boolean;
    price: number;
    compareAtPrice?: number;        // Original price (for discounts)
    currency: string;
    subscription?: {
      enabled: boolean;
      interval: "monthly" | "quarterly" | "yearly";
      intervalCount: number;
      trialDays: number;
    };
  };

  // Duration
  duration: {
    totalHours: number;
    weeks: number;
    hoursPerWeek: number;
  };

  // Schedule (for instructor-led/cohort)
  schedule?: {
    startDate: Date;
    endDate: Date;
    sessions: Array<{
      day: string;
      startTime: string;
      endTime: string;
      room?: string;
      meetingUrl?: string;
    }>;
  };

  // Enrollment
  enrollment: {
    type: EnrollmentType;
    maxStudents?: number;
    minStudents?: number;
    enrolledCount: number;
    waitlistCount: number;
    startDate: Date;
    endDate: Date;
    isOpen: boolean;
    requiresApproval: boolean;
  };

  // Prerequisites
  prerequisites: {
    courses: mongoose.Types.ObjectId[];
    exams: mongoose.Types.ObjectId[];
    minimumGrade?: number;
    description?: string;
  };

  // Drip Feed
  dripFeed: {
    mode: DripFeedMode;
    intervalDays?: number;
    scheduledDates?: Array<{
      moduleId: mongoose.Types.ObjectId;
      releaseDate: Date;
    }>;
  };

  // Content Structure
  content: {
    moduleCount: number;
    lessonCount: number;
    quizCount: number;
    assignmentCount: number;
    resourceCount: number;
  };

  // Assessment
  assessment: {
    hasFinalExam: boolean;
    finalExamId?: mongoose.Types.ObjectId;
    passingGrade: number;           // Percentage
    gradingScale: {
      A: { min: number; max: number; label?: string };
      B: { min: number; max: number; label?: string };
      C: { min: number; max: number; label?: string };
      D: { min: number; max: number; label?: string };
      F: { min: number; max: number; label?: string };
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
    minimumCompletion: number;      // Percentage
    minimumGrade: number;
  };

  // Community
  community: {
    discussionsEnabled: boolean;
    qaEnabled: boolean;
    peerReviewEnabled: boolean;
  };

  // Appearance
  appearance: {
    theme: string;
    primaryColor: string;
    customCss?: string;
    showProgressBar: boolean;
    showInstructorBio: boolean;
    showStudentCount: boolean;
  };

  // Reviews
  reviews: {
    enabled: boolean;
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };

  // Stats
  stats: {
    totalEnrollments: number;
    activeStudents: number;
    completionRate: number;
    averageGrade: number;
    totalRevenue: number;
    refundCount: number;
    totalHoursWatched: number;
    lastUpdated: Date;
  };

  // SEO
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };

  // Visibility
  isFeatured: boolean;
  isBestseller: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Module Model

```typescript
// modules/lms/models/module.model.ts

export interface IModule extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  order: number;

  // Content
  lessons: mongoose.Types.ObjectId[];
  quizzes: mongoose.Types.ObjectId[];
  assignments: mongoose.Types.ObjectId[];

  // Counts
  lessonCount: number;
  quizCount: number;
  assignmentCount: number;
  totalDuration: number;            // Minutes

  // Drip feed
  dripFeed?: {
    releaseMode: DripFeedMode;
    releaseDate?: Date;
    intervalDays?: number;
  };

  // Prerequisites
  prerequisites?: {
    moduleIds: mongoose.Types.ObjectId[];
    minimumQuizScore?: number;
  };

  // Stats
  stats: {
    averageCompletionTime: number;
    averageScore: number;
    completionRate: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Lesson Model (Enhanced)

```typescript
// modules/lms/models/lesson.model.ts

export enum LessonType {
  VIDEO = "video",
  TEXT = "text",
  AUDIO = "audio",
  PDF = "pdf",
  SCORM = "scorm",
  H5P = "h5p",
  EXTERNAL_LINK = "external_link",
  LIVE_SESSION = "live_session",
  FILE_DOWNLOAD = "file_download",
  PRESENTATION = "presentation",
  CODE_EXAMPLE = "code_example",
}

export enum LessonStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  HIDDEN = "hidden",
  PREVIEW = "preview",              // Free preview
}

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: LessonType;
  status: LessonStatus;

  // Ordering
  order: number;
  moduleOrder: number;

  // Content
  content: {
    // Video
    videoUrl?: string;
    videoDuration?: number;         // Seconds
    videoProvider?: "youtube" | "vimeo" | "self_hosted" | "wistia";
    videoCaptions?: Array<{
      language: string;
      url: string;
    }>;
    videoTranscript?: string;

    // Text
    textContent?: string;           // HTML/Rich text

    // Audio
    audioUrl?: string;
    audioDuration?: number;

    // PDF
    pdfUrl?: string;
    pageCount?: number;

    // SCORM/H5P
    scormUrl?: string;
    h5pEmbedUrl?: string;

    // External
    externalUrl?: string;

    // Live
    liveMeetingUrl?: string;
    liveProvider?: "zoom" | "google_meet" | "teams" | "custom";
    liveStartTime?: Date;
    liveEndTime?: Date;
    liveRecordingUrl?: string;

    // File
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
  };

  // Requirements
  estimatedDuration: number;        // Minutes
  isRequired: boolean;
  isPreview: boolean;               // Free preview for non-enrolled users
  unlockAfter?: mongoose.Types.ObjectId;  // Previous lesson ID

  // Resources
  resources: Array<{
    name: string;
    description?: string;
    type: "pdf" | "doc" | "xls" | "zip" | "image" | "link" | "other";
    url: string;
    size?: number;
    downloadCount: number;
  }>;

  // Engagement
  completionCriteria: {
    videoWatched: boolean;
    videoWatchPercentage: number;   // e.g., 90%
    textRead: boolean;
    quizPassed: boolean;
    assignmentSubmitted: boolean;
  };

  // Stats
  stats: {
    viewsCount: number;
    completionCount: number;
    completionRate: number;
    averageTimeSpent: number;
    averageRating: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Course Enrollment Model

```typescript
// modules/lms/models/course-enrollment.model.ts

export enum EnrollmentStatus {
  ENROLLED = "enrolled",
  ACTIVE = "active",
  COMPLETED = "completed",
  DROPPED = "dropped",
  EXPIRED = "expired",
  REFUNDED = "refunded",
  WAITLISTED = "waitlisted",
  PENDING_APPROVAL = "pending_approval",
}

export interface ICourseEnrollment extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;

  status: EnrollmentStatus;

  // Payment
  payment: {
    amount: number;
    currency: string;
    method: "free" | "stripe" | "paypal" | "coupon" | "subscription" | "manual";
    transactionId?: string;
    invoiceId?: mongoose.Types.ObjectId;
    paidAt?: Date;
    refundedAt?: Date;
    refundAmount?: number;
  };

  // Coupon
  coupon?: {
    code: string;
    discountAmount: number;
    discountType: "percentage" | "fixed";
  };

  // Timing
  enrolledAt: Date;
  enrolledBy: mongoose.Types.ObjectId;  // Who enrolled them (self or admin)
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  expiresAt?: Date;                 // For subscription-based access
  completedAt?: Date;
  droppedAt?: Date;

  // Progress
  progress: {
    lessonsCompleted: number;
    totalLessons: number;
    quizzesCompleted: number;
    totalQuizzes: number;
    assignmentsCompleted: number;
    totalAssignments: number;
    percentage: number;
    currentModuleId?: mongoose.Types.ObjectId;
    currentLessonId?: mongoose.Types.ObjectId;
    lastAccessedAt: Date;
  };

  // Drip feed state
  dripFeed: {
    unlockedModules: mongoose.Types.ObjectId[];
    nextUnlockDate?: Date;
  };

  // Certificate
  certificateIssued: boolean;
  certificateId?: mongoose.Types.ObjectId;
  certificateIssuedAt?: Date;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### 5. Quiz Model (Enhanced)

```typescript
// modules/lms/models/quiz.model.ts

export enum QuizType {
  GRADED = "graded",
  PRACTICE = "practice",
  SURVEY = "survey",
}

export enum QuizDisplayMode {
  ONE_PER_PAGE = "one_per_page",
  ALL_AT_ONCE = "all_at_once",
  QUESTION_BY_QUESTION = "question_by_question",
}

export enum QuizLimitBy {
  NONE = "none",
  ATTEMPTS = "attempts",
  DURATION = "duration",
  BOTH = "both",
}

export enum QuizResultDisplay {
  IMMEDIATELY = "immediately",
  AFTER_SUBMIT = "after_submit",
  AFTER_GRADED = "after_graded",
  SPECIFIC_DATE = "specific_date",
  NEVER = "never",
}

export enum QuizRetakeMode {
  UNLIMITED = "unlimited",
  FIXED = "fixed",
  UNTIL_PASS = "until_pass",
}

export interface IQuiz extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  title: string;
  slug: string;
  description?: string;

  type: QuizType;
  displayMode: QuizDisplayMode;

  // Questions
  questionSource: {
    mode: "manual" | "random" | "question_bank";
    questions?: mongoose.Types.ObjectId[];
    bankId?: mongoose.Types.ObjectId;
    bankCategories?: mongoose.Types.ObjectId[];
    questionCount: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };

  // Limits
  limits: {
    mode: QuizLimitBy;
    maxAttempts: number;
    timeLimit: number;              // Minutes (0 = unlimited)
  };

  // Retake
  retake: {
    mode: QuizRetakeMode;
    maxAttempts: number;
    waitingPeriod: number;          // Hours between attempts
  };

  // Scoring
  scoring: {
    pointsPerQuestion: number;
    negativeMarking: boolean;
    negativePoints: number;
    passingPercentage: number;
    partialCredit: boolean;
  };

  // Result display
  resultDisplay: {
    mode: QuizResultDisplay;
    showCorrectAnswers: boolean;
    showExplanation: boolean;
    showScore: boolean;
    showRanking: boolean;
    publishDate?: Date;
  };

  // Navigation
  navigation: {
    allowBacktrack: boolean;
    allowSkip: boolean;
    showQuestionPalette: boolean;
    showTimer: boolean;
    warnBeforeSubmit: boolean;
    autoSubmitOnTimeout: boolean;
  };

  // Prerequisites
  prerequisites: {
    requiredLessons: mongoose.Types.ObjectId[];
    requiredQuizzes: Array<{
      quizId: mongoose.Types.ObjectId;
      minimumScore: number;
    }>;
  };

  // Stats
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    passRate: number;
    averageTimeTaken: number;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. Quiz Attempt Model

```typescript
// modules/lms/models/quiz-attempt.model.ts

export enum QuizAttemptStatus {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  GRADED = "graded",
  TIMED_OUT = "timed_out",
}

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;

  status: QuizAttemptStatus;
  attemptNumber: number;

  // Timing
  startedAt: Date;
  submittedAt?: Date;
  timeLimit: number;
  timeTaken: number;                // Seconds
  timedOut: boolean;

  // Answers
  answers: Array<{
    questionId: mongoose.Types.ObjectId;
    answer: any;
    isCorrect?: boolean;
    pointsAwarded?: number;
    timeSpent: number;
  }>;

  // Scoring
  scoring: {
    totalPoints: number;
    earnedPoints: number;
    negativePoints: number;
    percentage: number;
    passed: boolean;
    grade: string;
  };

  // Review
  review: {
    reviewed: boolean;
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    adjustments: Array<{
      questionId: mongoose.Types.ObjectId;
      originalPoints: number;
      adjustedPoints: number;
      reason: string;
    }>;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 7. Assignment Model (Enhanced)

```typescript
// modules/lms/models/assignment.model.ts

export enum AssignmentType {
  FILE_UPLOAD = "file_upload",
  TEXT_SUBMISSION = "text_submission",
  QUIZ = "quiz",
  PROJECT = "project",
  PRESENTATION = "presentation",
  GROUP_WORK = "group_work",
  PRACTICAL = "practical",
  PORTFOLIO = "portfolio",
}

export enum AssignmentStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CLOSED = "closed",
}

export interface IAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;

  title: string;
  slug: string;
  description: string;              // Rich text
  type: AssignmentType;
  status: AssignmentStatus;

  // Instructions
  instructions: string;             // Rich text
  rubric: Array<{
    criterion: string;
    description: string;
    maxScore: number;
    weightage: number;
  }>;

  // Attachments
  attachments: Array<{
    name: string;
    description?: string;
    url: string;
    type: string;
    size: number;
  }>;

  // Grading
  grading: {
    maxScore: number;
    passingScore: number;
    weightage: number;              // Percentage of final grade
    gradeRelease: "automatic" | "manual" | "scheduled";
    releaseDate?: Date;
    allowResubmission: boolean;
    maxResubmissions: number;
  };

  // Submission
  submission: {
    type: "individual" | "group";
    groupSize?: number;
    maxFileSize: number;            // MB
    allowedFileTypes: string[];
    maxFiles: number;
    maxAttempts: number;
    textSubmissionAllowed: boolean;
    textMinLength?: number;
    textMaxLength?: number;
  };

  // Timing
  publishedAt: Date;
  dueDate: Date;
  lateSubmission: {
    allowed: boolean;
    penaltyPerDay: number;          // Percentage
    maxLateDays: number;
    hardDeadline?: Date;            // Absolute deadline
  };

  // Peer review
  peerReview?: {
    enabled: boolean;
    reviewsPerSubmission: number;
    rubric: Array<{
      criterion: string;
      maxScore: number;
    }>;
    anonymous: boolean;
  };

  // Stats
  stats: {
    totalSubmissions: number;
    gradedCount: number;
    pendingCount: number;
    lateCount: number;
    notSubmittedCount: number;
    averageScore: number;
    onTimeCount: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 8. Assignment Submission Model

```typescript
// modules/lms/models/assignment-submission.model.ts

export enum SubmissionStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  GRADED = "graded",
  RESUBMIT_REQUESTED = "resubmit_requested",
  RESUBMITTED = "resubmitted",
  LATE = "late",
  EXCUSED = "excused",
  NOT_SUBMITTED = "not_submitted",
}

export interface IAssignmentSubmission extends Document {
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
    links?: string[];
  };

  // Group submission
  group?: {
    groupId: string;
    members: mongoose.Types.ObjectId[];
    submittedBy: mongoose.Types.ObjectId;
  };

  // Timing
  startedAt: Date;
  submittedAt?: Date;
  isLate: boolean;
  latePenaltyApplied: number;       // Percentage

  // Grading
  grade?: {
    score: number;
    maxScore: number;
    percentage: number;
    letterGrade: string;
    rubricScores: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      feedback: string;
    }>;
    overallFeedback: string;
    gradedBy: mongoose.Types.ObjectId;
    gradedAt: Date;
  };

  // Teacher feedback
  feedback: {
    comment: string;
    audioFeedback?: string;
    videoFeedback?: string;
    annotations?: Array<{
      fileId: string;
      page: number;
      x: number;
      y: number;
      comment: string;
    }>;
  };

  // Resubmission
  resubmission?: {
    requested: boolean;
    reason: string;
    requestedAt: Date;
    requestedBy: mongoose.Types.ObjectId;
    deadline: Date;
  };

  // Plagiarism
  plagiarism?: {
    checked: boolean;
    score: number;                  // Percentage similarity
    reportUrl?: string;
    checkedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 9. Course Progress Model (Enhanced)

```typescript
// modules/lms/models/course-progress.model.ts

export enum ProgressStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DROPPED = "dropped",
  ON_HOLD = "on_hold",
  EXPIRED = "expired",
}

export interface ILessonProgress {
  lessonId: mongoose.Types.ObjectId;
  status: "not_started" | "in_progress" | "completed";
  startedAt?: Date;
  completedAt?: Date;
  timeSpent: number;                // Seconds
  lastPosition?: number;            // Video timestamp or scroll %
  videoWatchPercentage?: number;
}

export interface IQuizProgress {
  quizId: mongoose.Types.ObjectId;
  bestAttemptId?: mongoose.Types.ObjectId;
  bestScore: number;
  attempts: number;
  passed: boolean;
  completedAt?: Date;
}

export interface IAssignmentProgress {
  assignmentId: mongoose.Types.ObjectId;
  submissionId?: mongoose.Types.ObjectId;
  status: SubmissionStatus;
  score?: number;
  gradedAt?: Date;
}

export interface ICourseProgress extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  status: ProgressStatus;
  enrolledAt: Date;
  completedAt?: Date;
  droppedAt?: Date;
  expiresAt?: Date;

  // Overall progress
  progress: {
    lessonsCompleted: number;
    totalLessons: number;
    quizzesCompleted: number;
    totalQuizzes: number;
    assignmentsCompleted: number;
    totalAssignments: number;
    percentage: number;
  };

  // Detailed progress
  lessonProgress: ILessonProgress[];
  quizProgress: IQuizProgress[];
  assignmentProgress: IAssignmentProgress[];

  // Current position
  currentModuleId?: mongoose.Types.ObjectId;
  currentLessonId?: mongoose.Types.ObjectId;
  lastAccessedAt: Date;

  // Grades
  grades: {
    assignments: {
      total: number;
      earned: number;
      percentage: number;
      weightage: number;
    };
    quizzes: {
      total: number;
      earned: number;
      percentage: number;
      weightage: number;
    };
    finalExam?: {
      score: number;
      maxScore: number;
      percentage: number;
      weightage: number;
    };
    participation: {
      score: number;
      maxScore: number;
      weightage: number;
    };
    overall: number;
    letterGrade: string;
    passed: boolean;
  };

  // Attendance (for instructor-led)
  attendance?: {
    totalSessions: number;
    attended: number;
    absent: number;
    late: number;
    percentage: number;
  };

  // Certificate
  certificateIssued: boolean;
  certificateId?: mongoose.Types.ObjectId;
  certificateIssuedAt?: Date;

  // Engagement
  totalTimeSpent: number;           // Seconds
  discussionPosts: number;
  questionsAsked: number;
  resourcesDownloaded: number;
  lastActivityAt: Date;

  // Streak
  streak: {
    current: number;                // Consecutive days
    longest: number;
    lastActiveDate: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 10. Course Category Model

```typescript
// modules/lms/models/course-category.model.ts

export interface ICourseCategory extends Document {
  schoolId?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentCategoryId?: mongoose.Types.ObjectId;
  order: number;
  courseCount: number;
  isActive: boolean;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 11. Course Review Model

```typescript
// modules/lms/models/course-review.model.ts

export interface ICourseReview extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;

  rating: number;                   // 1-5
  title?: string;
  content: string;

  // Sub-ratings
  subRatings?: {
    content: number;
    instructor: number;
    value: number;
    difficulty: number;
  };

  // Helpful votes
  helpful: {
    yes: number;
    no: number;
  };

  // Instructor response
  instructorResponse?: {
    content: string;
    respondedAt: Date;
  };

  // Moderation
  isApproved: boolean;
  isFeatured: boolean;
  status: "pending" | "approved" | "rejected";

  createdAt: Date;
  updatedAt: Date;
}
```

### 12. Q&A Forum Model

```typescript
// modules/lms/models/course-qa.model.ts

export enum QAStatus {
  OPEN = "open",
  ANSWERED = "answered",
  CLOSED = "closed",
  HIDDEN = "hidden",
}

export interface IQAQuestion extends Document {
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  title: string;
  content: string;
  status: QAStatus;

  // Tags
  tags: string[];

  // Engagement
  views: number;
  followers: mongoose.Types.ObjectId[];

  // Best answer
  bestAnswerId?: mongoose.Types.ObjectId;

  // Moderation
  isPinned: boolean;
  isHidden: boolean;
  hiddenBy?: mongoose.Types.ObjectId;
  hiddenReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface IQAAnswer extends Document {
  questionId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorRole: "student" | "instructor" | "admin";

  content: string;
  isBestAnswer: boolean;

  // Engagement
  helpful: {
    yes: number;
    no: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 13. Course Discussion Model

```typescript
// modules/lms/models/course-discussion.model.ts

export interface IDiscussionThread extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;

  title: string;
  content: string;

  type: "general" | "lesson_specific" | "announcement" | "study_group";

  // Engagement
  replyCount: number;
  views: number;
  followers: mongoose.Types.ObjectId[];
  lastReplyAt?: Date;
  lastReplyBy?: mongoose.Types.ObjectId;

  // Moderation
  isPinned: boolean;
  isLocked: boolean;
  lockedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscussionReply extends Document {
  threadId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  replyTo?: mongoose.Types.ObjectId;  // Nested replies

  content: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### 14. Badge & Achievement Model

```typescript
// modules/lms/models/badge.model.ts

export enum BadgeType {
  COURSE_COMPLETION = "course_completion",
  QUIZ_PERFECT_SCORE = "quiz_perfect_score",
  ASSIGNMENT_EXCELLENCE = "assignment_excellence",
  STREAK = "streak",
  EARLY_BIRD = "early_bird",
  TOP_PERFORMER = "top_performer",
  HELPFUL_PEER = "helpful_peer",
  CUSTOM = "custom",
}

export interface IBadge extends Document {
  schoolId?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: BadgeType;
  icon: string;                     // URL or SVG
  color: string;

  // Criteria
  criteria: {
    type: string;
    condition: Record<string, any>;
  };

  // Rarity
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";

  isActive: boolean;
  awardedCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IAchievement extends Document {
  userId: mongoose.Types.ObjectId;
  badgeId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;

  awardedAt: Date;
  awardedBy: "system" | "instructor" | "admin";

  // Metadata
  metadata: Record<string, any>;

  createdAt: Date;
}
```

### 15. Wishlist Model

```typescript
// modules/lms/models/wishlist.model.ts

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;

  addedAt: Date;
  priceAtAddition: number;
  currentPrice: number;

  // Notifications
  priceDropNotified: boolean;
  enrollmentReminderSent: boolean;

  createdAt: Date;
}
```

### 16. Gradebook Model

```typescript
// modules/lms/models/gradebook.model.ts

export interface IGradebook extends Document {
  courseId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  academicTerm: string;

  students: Array<{
    studentId: mongoose.Types.ObjectId;
    enrollmentId: mongoose.Types.ObjectId;

    grades: Array<{
      category: "assignment" | "quiz" | "project" | "exam" | "participation";
      title: string;
      itemId: mongoose.Types.ObjectId;
      score: number;
      maxScore: number;
      percentage: number;
      weightage: number;
      date: Date;
      gradedBy: mongoose.Types.ObjectId;
    }>;

    overall: {
      totalEarned: number;
      totalPossible: number;
      percentage: number;
      letterGrade: string;
      rank: number;
    };

    attendance: {
      present: number;
      absent: number;
      late: number;
      percentage: number;
    };

    teacherComment?: string;
    parentNotified: boolean;
    parentNotifiedAt?: Date;
  }>;

  published: boolean;
  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### 17. Coupon Model

```typescript
// modules/lms/models/course-coupon.model.ts

export enum CouponType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
  FREE = "free",
}

export enum CouponAppliesTo {
  ALL_COURSES = "all_courses",
  SPECIFIC_COURSES = "specific_courses",
  SPECIFIC_CATEGORIES = "specific_categories",
}

export interface ICourseCoupon extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  code: string;
  type: CouponType;
  value: number;

  appliesTo: CouponAppliesTo;
  courseIds?: mongoose.Types.ObjectId[];
  categoryIds?: mongoose.Types.ObjectId[];

  // Limits
  maxUses: number;
  usedCount: number;
  maxUsesPerUser: number;

  // Timing
  validFrom: Date;
  validUntil: Date;

  // Minimum purchase
  minimumAmount?: number;

  // User restrictions
  applicableTo: "new_users" | "existing_users" | "all_users";

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Complete API Endpoints

### Course Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/courses` | public | List courses (filterable, paginated) |
| POST | `/api/lms/courses` | teacher, school, admin | Create course |
| GET | `/api/lms/courses/:id` | public | View course details |
| PATCH | `/api/lms/courses/:id` | teacher, school | Update course |
| DELETE | `/api/lms/courses/:id` | teacher, school | Archive course |
| POST | `/api/lms/courses/:id/publish` | teacher | Publish course |
| POST | `/api/lms/courses/:id/duplicate` | teacher | Duplicate course |
| GET | `/api/lms/courses/:id/preview` | public | Preview (free lessons) |
| POST | `/api/lms/courses/:id/feature` | admin | Feature course |
| GET | `/api/lms/courses/featured` | public | Featured courses |
| GET | `/api/lms/courses/bestsellers` | public | Bestselling courses |
| GET | `/api/lms/courses/categories` | public | List categories |
| POST | `/api/lms/courses/categories` | admin | Create category |
| GET | `/api/lms/courses/search` | public | Search courses |

### Module & Lesson Management

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/lms/courses/:id/modules` | teacher | Add module |
| PATCH | `/api/lms/courses/:id/modules/:moduleId` | teacher | Update module |
| DELETE | `/api/lms/courses/:id/modules/:moduleId` | teacher | Delete module |
| POST | `/api/lms/courses/:id/modules/:moduleId/lessons` | teacher | Add lesson |
| PATCH | `/api/lms/courses/:id/lessons/:lessonId` | teacher | Update lesson |
| DELETE | `/api/lms/courses/:id/lessons/:lessonId` | teacher | Delete lesson |
| GET | `/api/lms/courses/:id/lessons/:lessonId` | enrolled | View lesson |
| POST | `/api/lms/courses/:id/lessons/:lessonId/complete` | student | Mark complete |
| POST | `/api/lms/courses/:id/lessons/:lessonId/resources/:resourceId/download` | enrolled | Download resource |

### Enrollment

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/lms/courses/:id/enroll` | student, parent | Enroll in course |
| POST | `/api/lms/courses/:id/enroll/bulk` | school, admin | Bulk enroll students |
| GET | `/api/lms/courses/:id/students` | teacher | List enrolled students |
| POST | `/api/lms/courses/:id/approve/:studentId` | teacher | Approve enrollment |
| POST | `/api/lms/courses/:id/unenroll` | student, admin | Unenroll |
| GET | `/api/lms/student/courses` | student | My courses |
| GET | `/api/lms/parent/children/:id/courses` | parent | Child's courses |
| GET | `/api/lms/teacher/courses` | teacher | My teaching courses |

### Quizzes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/lms/courses/:id/quizzes` | teacher | Create quiz |
| PATCH | `/api/lms/courses/:id/quizzes/:quizId` | teacher | Update quiz |
| DELETE | `/api/lms/courses/:id/quizzes/:quizId` | teacher | Delete quiz |
| POST | `/api/lms/quizzes/:id/start` | student | Start quiz |
| POST | `/api/lms/quizzes/:id/submit` | student | Submit quiz |
| GET | `/api/lms/quizzes/:id/results` | student, teacher | View results |
| POST | `/api/lms/quizzes/:id/grade` | teacher | Grade essay questions |
| GET | `/api/lms/quizzes/:id/analytics` | teacher | Quiz analytics |

### Assignments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/lms/courses/:id/assignments` | teacher | Create assignment |
| PATCH | `/api/lms/courses/:id/assignments/:assignmentId` | teacher | Update assignment |
| GET | `/api/lms/courses/:id/assignments` | enrolled | List assignments |
| POST | `/api/lms/assignments/:id/submit` | student | Submit assignment |
| GET | `/api/lms/assignments/:id/submissions` | teacher | View all submissions |
| PATCH | `/api/lms/assignments/:id/submissions/:submissionId/grade` | teacher | Grade submission |
| POST | `/api/lms/assignments/:id/submissions/:submissionId/resubmit` | student | Request resubmission |

### Q&A Forum

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/courses/:id/qa` | enrolled | List questions |
| POST | `/api/lms/courses/:id/qa` | enrolled | Ask question |
| GET | `/api/lms/courses/:id/qa/:questionId` | enrolled | View question |
| POST | `/api/lms/courses/:id/qa/:questionId/answers` | enrolled | Answer question |
| POST | `/api/lms/courses/:id/qa/:questionId/answers/:answerId/best` | asker | Mark best answer |
| POST | `/api/lms/courses/:id/qa/:questionId/follow` | enrolled | Follow question |

### Discussions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/courses/:id/discussions` | enrolled | List threads |
| POST | `/api/lms/courses/:id/discussions` | enrolled | Create thread |
| GET | `/api/lms/courses/:id/discussions/:threadId` | enrolled | View thread |
| POST | `/api/lms/courses/:id/discussions/:threadId/replies` | enrolled | Reply |
| POST | `/api/lms/courses/:id/discussions/:threadId/pin` | teacher | Pin thread |
| POST | `/api/lms/courses/:id/discussions/:threadId/lock` | teacher | Lock thread |

### Reviews & Ratings

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/lms/courses/:id/reviews` | enrolled | Write review |
| GET | `/api/lms/courses/:id/reviews` | public | List reviews |
| PATCH | `/api/lms/courses/:id/reviews/:reviewId` | author | Update review |
| DELETE | `/api/lms/courses/:id/reviews/:reviewId` | author | Delete review |
| POST | `/api/lms/courses/:id/reviews/:reviewId/respond` | teacher | Instructor response |
| POST | `/api/lms/courses/:id/reviews/:reviewId/helpful` | enrolled | Mark helpful |

### Wishlist

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/wishlist` | student | My wishlist |
| POST | `/api/lms/wishlist/:courseId` | student | Add to wishlist |
| DELETE | `/api/lms/wishlist/:courseId` | student | Remove from wishlist |

### Coupons & Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/lms/coupons` | school, admin | Create coupon |
| GET | `/api/lms/coupons` | school, admin | List coupons |
| POST | `/api/lms/coupons/validate` | all | Validate coupon |
| POST | `/api/lms/courses/:id/checkout` | student | Purchase course |
| POST | `/api/lms/payments/webhook` | public | Stripe webhook |

### Progress & Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/student/progress` | student | My progress |
| GET | `/api/lms/courses/:id/progress` | teacher | Course progress overview |
| GET | `/api/lms/courses/:id/progress/:studentId` | teacher | Student progress |
| GET | `/api/lms/courses/:id/analytics` | teacher | Course analytics |
| GET | `/api/lms/courses/:id/gradebook` | teacher | Grade book |
| POST | `/api/lms/courses/:id/gradebook/publish` | teacher | Publish grades |
| GET | `/api/lms/student/grades` | student | My grades |
| GET | `/api/lms/parent/children/:id/grades` | parent | Child's grades |

### Certificates & Badges

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/lms/student/certificates` | student | My certificates |
| GET | `/api/lms/student/certificates/:id/download` | student | Download certificate |
| GET | `/api/lms/certificates/verify/:code` | public | Verify certificate |
| GET | `/api/lms/student/badges` | student | My badges |
| GET | `/api/lms/badges` | public | Available badges |

---

## Frontend Component Structure

```
frontend/src/apps/
├── student/
│   ├── components/
│   │   ├── course-catalog/
│   │   │   ├── CourseGrid.tsx
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseFilters.tsx
│   │   │   ├── CourseSearch.tsx
│   │   │   └── CategoryBrowser.tsx
│   │   ├── course-player/
│   │   │   ├── CoursePlayer.tsx
│   │   │   ├── LessonViewer.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── LessonSidebar.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── ResourceDownload.tsx
│   │   │   └── LessonNavigation.tsx
│   │   ├── quiz-taker/
│   │   │   ├── QuizTaker.tsx
│   │   │   ├── QuestionRenderer.tsx
│   │   │   ├── QuizTimer.tsx
│   │   │   ├── QuestionPalette.tsx
│   │   │   └── QuizResults.tsx
│   │   ├── assignment-submission/
│   │   │   ├── AssignmentViewer.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   ├── TextEditor.tsx
│   │   │   └── SubmissionStatus.tsx
│   │   ├── qa-forum/
│   │   │   ├── QAList.tsx
│   │   │   ├── QuestionDetail.tsx
│   │   │   ├── AnswerForm.tsx
│   │   │   └── AnswerCard.tsx
│   │   └── student-dashboard/
│   │       ├── DashboardOverview.tsx
│   │       ├── MyCourses.tsx
│   │       ├── ProgressChart.tsx
│   │       ├── UpcomingDeadlines.tsx
│   │       ├── RecentGrades.tsx
│   │       └── BadgesDisplay.tsx
│   └── pages/
│       ├── CourseCatalogPage.tsx
│       ├── CourseDetailPage.tsx
│       ├── CoursePlayerPage.tsx
│       ├── QuizPage.tsx
│       ├── AssignmentPage.tsx
│       ├── DashboardPage.tsx
│       ├── CertificatesPage.tsx
│       └── WishlistPage.tsx
│
├── teacher/
│   ├── components/
│   │   ├── course-builder/
│   │   │   ├── CourseBuilder.tsx
│   │   │   ├── ModuleEditor.tsx
│   │   │   ├── LessonEditor.tsx
│   │   │   ├── DragDropReorder.tsx
│   │   │   ├── VideoUploader.tsx
│   │   │   ├── RichTextEditor.tsx
│   │   │   └── CoursePreview.tsx
│   │   ├── quiz-builder/
│   │   │   ├── QuizBuilder.tsx
│   │   │   ├── QuestionEditor.tsx
│   │   │   ├── QuestionBankSelector.tsx
│   │   │   └── QuizSettings.tsx
│   │   ├── assignment-builder/
│   │   │   ├── AssignmentBuilder.tsx
│   │   │   ├── RubricEditor.tsx
│   │   │   └── SubmissionGrader.tsx
│   │   ├── gradebook/
│   │   │   ├── GradebookTable.tsx
│   │   │   ├── GradeEntry.tsx
│   │   │   └── GradeDistribution.tsx
│   │   ├── analytics/
│   │   │   ├── CourseAnalytics.tsx
│   │   │   ├── StudentProgressChart.tsx
│   │   │   ├── QuizAnalytics.tsx
│   │   │   └── RevenueChart.tsx
│   │   └── teacher-dashboard/
│   │       ├── DashboardOverview.tsx
│   │       ├── MyCourses.tsx
│   │       ├── RecentSubmissions.tsx
│   │       ├── PendingReviews.tsx
│   │       └── EarningsChart.tsx
│   └── pages/
│       ├── CourseBuilderPage.tsx
│       ├── CourseEditPage.tsx
│       ├── QuizBuilderPage.tsx
│       ├── AssignmentBuilderPage.tsx
│       ├── GradebookPage.tsx
│       ├── AnalyticsPage.tsx
│       ├── SubmissionsPage.tsx
│       └── DashboardPage.tsx
│
└── shared/
    └── components/
        ├── certificate-viewer/
        ├── discussion-thread/
        ├── review-form/
        ├── coupon-input/
        └── progress-indicator/
```

---

## Implementation Priority

### Phase 1: MVP (Weeks 1-4)

| Feature | Models | Why First |
|---|---|---|
| Course CRUD | Course, Module, Lesson | Core entity |
| Lesson types (video, text, PDF) | Lesson | Basic content delivery |
| Enrollment system | CourseEnrollment | Students need access |
| Progress tracking | CourseProgress | Track completion |
| Basic quiz (MCQ, T/F) | Quiz, QuizAttempt | Assessment |
| Student dashboard | — | User-facing entry point |

### Phase 2: Assignments & Grading (Weeks 5-7)

| Feature | Models | Why |
|---|---|---|
| Assignment creation | Assignment | Teacher tools |
| File submission | AssignmentSubmission | Student submissions |
| Manual grading | AssignmentSubmission.grade | Teacher grading |
| Gradebook | Gradebook | Centralized grades |
| Teacher dashboard | — | Instructor entry point |

### Phase 3: Monetization & Community (Weeks 8-10)

| Feature | Models | Why |
|---|---|---|
| Paid courses | Course.pricing | Revenue |
| Stripe checkout | Payment (existing) | Payment processing |
| Coupons | CourseCoupon | Discounts |
| Q&A Forum | QAQuestion, QAAnswer | Community |
| Discussions | DiscussionThread, DiscussionReply | Engagement |
| Reviews | CourseReview | Social proof |

### Phase 4: Advanced Features (Weeks 11-14)

| Feature | Models | Why |
|---|---|---|
| Drip-feed content | Course.dripFeed, Module.dripFeed | Controlled release |
| Prerequisites | Course.prerequisites | Learning paths |
| Certificates | Certificate (existing) | Completion proof |
| Badges & achievements | Badge, Achievement | Gamification |
| Wishlist | Wishlist | Conversion tool |
| Multi-instructor | Course.instructors | Revenue share |
| Peer review | Assignment.peerReview | Collaborative learning |

### Phase 5: Polish & Scale (Weeks 15-16)

| Feature | Why |
|---|---|
| SCORM/H5P support | Industry standard content |
| Live sessions (Zoom integration) | Synchronous learning |
| Video captions & transcripts | Accessibility |
| Bulk enrollment (CSV import) | Admin productivity |
| Email notifications | Engagement |
| Export reports (CSV/PDF) | Offline access |
| Plagiarism detection | Academic integrity |

---

## Integration with Existing GEMA Modules

### With Examination System
- Courses can have final exams from the examination module
- Exam scores feed into course grades
- Course completion can require passing a final exam

### With Certificate Generator
- Auto-generate certificates on course completion
- Certificate templates linked to courses
- QR verification for course certificates

### With Student Portal
- Courses visible in student dashboard
- Progress, grades, certificates in student portal
- Course enrollment from student portal

### With Parent Portal
- Parents see children's course enrollments
- Parents see course grades and progress
- Parents can purchase courses for children

### With ERP Finance
- Course purchases generate invoices
- Course revenue tracked in financial reports
- Instructor revenue share calculated

### With Messaging
- Course announcements via messaging
- Q&A notifications
- Grade release notifications

### With Events Module
- Live course sessions as events
- Course launch events
- Graduation ceremonies as events

---

## Tech Stack Recommendations

### Frontend
| Library | Purpose |
|---|---|
| `react-player` | Video player with progress tracking |
| `react-quill` or `@tiptap/react` | Rich text editor (lessons, discussions) |
| `react-dropzone` | File upload for assignments |
| `react-pdf` | PDF viewer and certificate generation |
| `socket.io-client` | Real-time Q&A, live sessions |
| `@dnd-kit/core` | Drag-drop for course builder |
| `recharts` | Analytics visualization |
| `react-i18next` | Multi-language |
| `react-syntax-highlighter` | Code examples in lessons |

### Backend
| Library | Purpose |
|---|---|
| `multer` | File uploads (videos, documents) |
| `stripe` | Payment processing |
| `nodemailer` | Email notifications |
| `pdf-lib` | Certificate generation |
| `bullmq` | Background jobs (certificate generation, emails) |
| `socket.io` | Real-time Q&A, live sessions |
| `aws-sdk` or `@google-cloud/storage` | Cloud storage |
| `sharp` | Image processing (thumbnails) |

---

*Created: 2026-04-04*
