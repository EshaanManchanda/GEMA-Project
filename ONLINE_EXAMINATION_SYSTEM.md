# GEMA — Online Examination System (SpeedExam Integration)

> Complete online examination platform integrated into the GEMA ecosystem.
> Covers exam creation, proctoring, question banks, monetization, analytics, and certificates.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GEMA Examination Platform                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Exam Maker  │  │ Question     │  │  Exam Taker Interface    │  │
│  │  (Teacher)   │  │ Bank         │  │  (Student)               │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│  ┌──────▼─────────────────▼────────────────────────▼─────────────┐  │
│  │                  Examination Core Engine                       │  │
│  │                                                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐   │  │
│  │  │  Proctor   │  │  Anti-     │  │  Real-time Sync        │   │  │
│  │  │  System    │  │  Cheating  │  │  (WebSocket)           │   │  │
│  │  └────────────┘  └────────────┘  └────────────────────────┘   │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │                                      │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │              Analytics & Reporting Engine                       │  │
│  │                                                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐   │  │
│  │  │  Detailed  │  │ Printable  │  │  Performance           │   │  │
│  │  │  Analysis  │  │ Reports    │  │  Dashboards            │   │  │
│  │  └────────────┘  └────────────┘  └────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Monetization & Distribution                        │  │
│  │                                                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐   │  │
│  │  │  Sell      │  │  Self      │  │  Certificate           │   │  │
│  │  │  Exams     │  │  Register  │  │  Generation            │   │  │
│  │  └────────────┘  └────────────┘  └────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. Exam Template Model

```typescript
// modules/examinations/models/exam-template.model.ts

export enum ExamTemplateType {
  QUIZ = "quiz",
  TEST = "test",
  EXAM = "exam",
  CERTIFICATION = "certification",
  PRACTICE = "practice",
  MOCK = "mock",
  ASSESSMENT = "assessment",
}

export enum ExamDeliveryMode {
  ONLINE = "online",
  OFFLINE = "offline",
  HYBRID = "hybrid",
}

export enum ExamAccessMode {
  OPEN = "open",
  REGISTRATION_REQUIRED = "registration_required",
  INVITATION_ONLY = "invitation_only",
  PAID = "paid",
  SUBSCRIPTION = "subscription",
}

export enum QuestionSelectionMode {
  FIXED = "fixed",
  RANDOM = "random",
  ADAPTIVE = "adaptive",
}

export enum ResultDisplayMode {
  IMMEDIATE = "immediate",
  AFTER_DEADLINE = "after_deadline",
  MANUAL = "manual",
  NEVER = "never",
}

export interface IExamTemplate extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;

  // Basic Info
  code: string;                           // EXM-2026-00001
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;

  type: ExamTemplateType;
  deliveryMode: ExamDeliveryMode;
  accessMode: ExamAccessMode;

  // Pricing (for paid exams)
  pricing: {
    isPaid: boolean;
    amount: number;
    currency: string;
    stripeProductId?: string;
    stripePriceId?: string;
    discount?: {
      type: "percentage" | "fixed";
      value: number;
      validUntil?: Date;
    };
  };

  // Timing
  duration: {
    minutes: number;
    gracePeriodMinutes: number;           // Extra time after deadline
  };

  availability: {
    startDate: Date;
    endDate: Date;
    timezone: string;
  };

  // Question Selection
  questionSelection: {
    mode: QuestionSelectionMode;
    totalQuestions: number;
    sections?: Array<{
      name: string;
      questionCount: number;
      categoryIds: mongoose.Types.ObjectId[];
      difficultyRange: { min: number; max: number };
    }>;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };

  // Scoring
  scoring: {
    pointsPerQuestion: number;
    negativeMarking: boolean;
    negativePoints: number;
    partialCredit: boolean;
    passingScore: number;                 // Percentage
    maxAttempts: number;
    cooldownBetweenAttempts: number;      // Hours
  };

  // Results
  results: {
    displayMode: ResultDisplayMode;
    showCorrectAnswers: boolean;
    showExplanation: boolean;
    showScore: boolean;
    showRanking: boolean;
    publishAt?: Date;
  };

  // Proctoring
  proctoring: {
    enabled: boolean;
    level: "none" | "basic" | "moderate" | "strict";
    settings: {
      webcamRequired: boolean;
      screenRecording: boolean;
      tabSwitchLimit: number;
      copyPasteBlocked: boolean;
      rightClickBlocked: boolean;
      fullscreenRequired: boolean;
      aiProctoring: boolean;
      suspiciousActivityThreshold: number;
      autoSubmitOnViolation: boolean;
      allowedWebsites?: string[];
      allowedApplications?: string[];
    };
  };

  // Navigation
  navigation: {
    allowBacktrack: boolean;
    allowSkip: boolean;
    showQuestionPalette: boolean;
    showTimer: boolean;
    warnBeforeSubmit: boolean;
  };

  // Appearance
  appearance: {
    theme: string;
    primaryColor: string;
    logoUrl?: string;
    customCss?: string;
    language: string;
  };

  // Certificate
  certificate: {
    enabled: boolean;
    templateId?: mongoose.Types.ObjectId;
    autoGenerate: boolean;
    minimumScore: number;
  };

  // Stats
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    passRate: number;
    averageTimeTaken: number;
    revenue: number;
  };

  // SEO
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  isActive: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Question Bank Model

```typescript
// modules/examinations/models/question-bank.model.ts

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  SINGLE_CHOICE = "single_choice",
  TRUE_FALSE = "true_false",
  FILL_IN_BLANK = "fill_in_blank",
  SHORT_ANSWER = "short_answer",
  ESSAY = "essay",
  MATCHING = "matching",
  ORDERING = "ordering",
  DRAG_DROP = "drag_drop",
  HOTSPOT = "hotspot",
  CODE_EDITOR = "code_editor",
  FILE_UPLOAD = "file_upload",
  AUDIO_RESPONSE = "audio_response",
  VIDEO_RESPONSE = "video_response",
}

export enum DifficultyLevel {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert",
}

export interface IQuestionBank extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  tags: string[];

  // Questions
  questions: Array<{
    _id: mongoose.Types.ObjectId;
    type: QuestionType;
    difficulty: DifficultyLevel;
    points: number;
    estimatedTime: number;              // Seconds
    // ... question content (see Question model below)
  }>;

  // Stats
  stats: {
    totalQuestions: number;
    byType: Record<QuestionType, number>;
    byDifficulty: Record<DifficultyLevel, number>;
    averageDifficulty: number;
    usageCount: number;
  };

  // Sharing
  isPublic: boolean;
  sharedWith: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Question Model

```typescript
// modules/examinations/models/question.model.ts

export interface IQuestion extends Document {
  bankId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  type: QuestionType;
  difficulty: DifficultyLevel;
  points: number;
  estimatedTime: number;

  // Content
  content: {
    text: string;                       // Question text (HTML/Rich text)
    media?: Array<{
      type: "image" | "video" | "audio" | "code";
      url: string;
      caption?: string;
    }>;
    codeSnippet?: {
      language: string;
      code: string;
    };
  };

  // Options (for MCQ, Single Choice, True/False)
  options?: Array<{
    id: string;
    text: string;
    media?: { type: string; url: string };
    isCorrect: boolean;
    explanation?: string;
  }>;

  // Fill in the blank
  fillInBlank?: {
    answers: string[];                  // Acceptable answers
    caseSensitive: boolean;
    acceptSynonyms: boolean;
  };

  // Short answer
  shortAnswer?: {
    keywords: string[];
    minLength: number;
    maxLength: number;
    rubric: string;
  };

  // Essay
  essay?: {
    minLength: number;
    maxLength: number;
    rubric: Array<{
      criterion: string;
      maxScore: number;
      description: string;
    }>;
  };

  // Matching
  matching?: {
    pairs: Array<{
      left: string;
      right: string;
    }>;
    shuffleRight: boolean;
  };

  // Ordering
  ordering?: {
    items: string[];
    correctOrder: number[];
  };

  // Hotspot
  hotspot?: {
    imageUrl: string;
    regions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      isCorrect: boolean;
    }>;
  };

  // Code editor
  codeEditor?: {
    language: string;
    starterCode: string;
    testCases: Array<{
      input: string;
      expectedOutput: string;
    }>;
    timeLimit: number;                  // ms
    memoryLimit: number;                // MB
  };

  // Metadata
  explanation: string;                  // Why the answer is correct
  references?: string[];
  tags: string[];
  category: string;
  subCategory?: string;

  // Usage tracking
  stats: {
    timesUsed: number;
    correctAnswerRate: number;
    averageTimeTaken: number;
    flaggedCount: number;
  };

  // Moderation
  isReviewed: boolean;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Exam Attempt Model

```typescript
// modules/examinations/models/exam-attempt.model.ts

export enum AttemptStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  GRADED = "graded",
  REVIEWED = "reviewed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  FLAGGED = "flagged",
}

export interface IExamAttempt extends Document {
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;

  status: AttemptStatus;
  attemptNumber: number;

  // Timing
  startedAt: Date;
  submittedAt?: Date;
  deadlineAt: Date;
  timeTaken: number;                    // Seconds
  timeRemaining: number;                // Seconds (at submission)

  // Answers
  answers: Array<{
    questionId: mongoose.Types.ObjectId;
    questionType: QuestionType;
    answer: any;                        // Varies by question type
    isCorrect?: boolean;
    pointsAwarded?: number;
    timeSpent: number;                  // Seconds on this question
    flagged: boolean;
    markedForReview: boolean;
    visited: boolean;
  }>;

  // Scoring
  scoring: {
    totalPoints: number;
    earnedPoints: number;
    negativePoints: number;
    percentage: number;
    grade: string;
    passed: boolean;
    rank?: number;
    percentile?: number;
  };

  // Proctoring data
  proctoring: {
    webcamEnabled: boolean;
    webcamSnapshots: Array<{
      timestamp: Date;
      imageUrl: string;
      flags: string[];
    }>;
    screenRecordingUrl?: string;
    tabSwitches: number;
    tabSwitchTimes: Date[];
    copyPasteAttempts: number;
    rightClickAttempts: number;
    fullscreenExits: number;
    suspiciousActivities: Array<{
      type: string;
      timestamp: Date;
      severity: "low" | "medium" | "high";
      details: string;
    }>;
    aiProctoringScore?: number;         // 0-100 trust score
    autoSubmitted: boolean;
    autoSubmitReason?: string;
  };

  // Navigation
  navigation: {
    currentQuestionIndex: number;
    questionsVisited: number;
    questionsAnswered: number;
    questionsFlagged: number;
    questionsMarkedForReview: number;
  };

  // Grading
  grading: {
    autoGraded: boolean;
    autoGradedAt?: Date;
    manuallyGraded: boolean;
    manuallyGradedBy?: mongoose.Types.ObjectId;
    manuallyGradedAt?: Date;
    manualAdjustments: Array<{
      questionId: mongoose.Types.ObjectId;
      originalPoints: number;
      adjustedPoints: number;
      reason: string;
      gradedBy: mongoose.Types.ObjectId;
    }>;
    finalScore: number;
    finalGrade: string;
  };

  // Certificate
  certificateIssued: boolean;
  certificateId?: mongoose.Types.ObjectId;

  // Metadata
  deviceInfo: {
    browser: string;
    os: string;
    screenResolution: string;
    ipAddress: string;
    userAgent: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 5. Exam Session Model (Real-time)

```typescript
// modules/examinations/models/exam-session.model.ts

export interface IExamSession extends Document {
  attemptId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;

  // Real-time state
  isActive: boolean;
  lastHeartbeat: Date;
  connectionId: string;                 // WebSocket connection ID

  // Current position
  currentQuestionIndex: number;
  timeRemaining: number;

  // Proctoring stream
  proctoring: {
    webcamStreamId?: string;
    screenStreamId?: string;
    isFullscreen: boolean;
    tabVisible: boolean;
    lastActivity: Date;
    activityLog: Array<{
      type: string;
      timestamp: Date;
      details: string;
    }>;
  };

  // Auto-save
  lastAutoSave: Date;
  saveVersion: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### 6. Exam Invitation Model

```typescript
// modules/examinations/models/exam-invitation.model.ts

export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  EXPIRED = "expired",
  COMPLETED = "completed",
}

export interface IExamInvitation extends Document {
  examId: mongoose.Types.ObjectId;
  email: string;
  studentId?: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;

  status: InvitationStatus;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;

  // Metadata
  message?: string;
  customDeadline?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### 7. Exam Analytics Model

```typescript
// modules/examinations/models/exam-analytics.model.ts

export interface IExamAnalytics extends Document {
  examId: mongoose.Types.ObjectId;
  schoolId?: mongoose.Types.ObjectId;

  // Overall stats
  overall: {
    totalAttempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    averageScore: number;
    medianScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    averageTimeTaken: number;
    dropoutRate: number;
  };

  // Question-level analytics
  questionAnalytics: Array<{
    questionId: mongoose.Types.ObjectId;
    timesPresented: number;
    timesAnswered: number;
    timesCorrect: number;
    correctRate: number;
    averageTimeTaken: number;
    discriminationIndex: number;        // How well it distinguishes high/low performers
    difficultyIndex: number;
    mostCommonWrongAnswer?: string;
  }>;

  // Score distribution
  scoreDistribution: Array<{
    range: string;                      // "0-20", "21-40", etc.
    count: number;
    percentage: number;
  }>;

  // Time analysis
  timeAnalysis: {
    averageTimePerQuestion: Array<{
      questionId: mongoose.Types.ObjectId;
      averageSeconds: number;
    }>;
    timeSpentDistribution: {
      fast: number;                     // < 50% of avg
      normal: number;                   // 50-150% of avg
      slow: number;                     // > 150% of avg
    };
  };

  // Proctoring summary
  proctoringSummary: {
    totalViolations: number;
    violationsByType: Record<string, number>;
    autoSubmittedCount: number;
    flaggedAttempts: number;
  };

  // Revenue (for paid exams)
  revenue: {
    totalRevenue: number;
    totalPurchases: number;
    refundCount: number;
    refundAmount: number;
  };

  generatedAt: Date;
  updatedAt: Date;
}
```

### 8. Exam Review Model

```typescript
// modules/examinations/models/exam-review.model.ts

export interface IExamReview extends Document {
  attemptId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;

  // Review request
  requestedAt: Date;
  reason: string;
  questions: Array<{
    questionId: mongoose.Types.ObjectId;
    studentAnswer: any;
    studentArgument: string;
  }>;

  // Review outcome
  status: "pending" | "under_review" | "accepted" | "rejected" | "partial";
  reviewedAt?: Date;
  outcome: {
    summary: string;
    scoreChange: number;
    questionChanges: Array<{
      questionId: mongoose.Types.ObjectId;
      originalScore: number;
      newScore: number;
      reason: string;
    }>;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Endpoints

### Exam Template Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/exams/templates` | all | List exam templates |
| POST | `/api/exams/templates` | teacher, school, admin | Create exam |
| GET | `/api/exams/templates/:id` | all | View exam details |
| PATCH | `/api/exams/templates/:id` | teacher, school | Update exam |
| DELETE | `/api/exams/templates/:id` | teacher, school | Delete exam |
| POST | `/api/exams/templates/:id/publish` | teacher | Publish exam |
| POST | `/api/exams/templates/:id/duplicate` | teacher | Duplicate exam |
| POST | `/api/exams/templates/:id/preview` | teacher | Preview exam |
| GET | `/api/exams/templates/:id/analytics` | teacher, school | Exam analytics |
| GET | `/api/exams/templates/:id/attempts` | teacher | List attempts |
| POST | `/api/exams/templates/:id/bulk-invite` | teacher | Bulk invite students |

### Question Bank Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/exams/question-banks` | teacher, school | List question banks |
| POST | `/api/exams/question-banks` | teacher, school | Create question bank |
| GET | `/api/exams/question-banks/:id` | teacher | View question bank |
| PATCH | `/api/exams/question-banks/:id` | teacher | Update question bank |
| DELETE | `/api/exams/question-banks/:id` | teacher | Delete question bank |
| POST | `/api/exams/question-banks/:id/import` | teacher | Import questions (CSV/JSON) |
| POST | `/api/exams/question-banks/:id/export` | teacher | Export questions |

### Question Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/exams/questions` | teacher | List questions |
| POST | `/api/exams/questions` | teacher | Create question |
| GET | `/api/exams/questions/:id` | teacher | View question |
| PATCH | `/api/exams/questions/:id` | teacher | Update question |
| DELETE | `/api/exams/questions/:id` | teacher | Delete question |
| POST | `/api/exams/questions/bulk` | teacher | Bulk create questions |
| POST | `/api/exams/questions/:id/flag` | student | Flag question |
| GET | `/api/exams/questions/random` | teacher | Get random questions |

### Exam Attempt Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/exams/templates/:id/start` | student | Start exam attempt |
| GET | `/api/exams/attempts/:id` | student, teacher | View attempt |
| POST | `/api/exams/attempts/:id/answer` | student | Submit answer |
| POST | `/api/exams/attempts/:id/submit` | student | Submit exam |
| POST | `/api/exams/attempts/:id/pause` | student | Pause exam (if allowed) |
| POST | `/api/exams/attempts/:id/resume` | student | Resume exam |
| GET | `/api/exams/attempts/:id/results` | student, teacher | View results |
| POST | `/api/exams/attempts/:id/review` | student | Request review |
| GET | `/api/exams/student/:id/attempts` | student, parent | Student's attempts |

### Exam Session (WebSocket) Endpoints

| Event | Direction | Description |
|---|---|---|
| `exam:join` | Client → Server | Join exam session |
| `exam:leave` | Client → Server | Leave exam session |
| `exam:heartbeat` | Client → Server | Keep-alive heartbeat |
| `exam:answer` | Client → Server | Save answer in real-time |
| `exam:timer` | Server → Client | Timer updates |
| `exam:proctoring:snapshot` | Client → Server | Webcam snapshot |
| `exam:proctoring:alert` | Server → Client | Proctoring alert |
| `exam:proctoring:violation` | Server → Client | Violation warning |
| `exam:autosave` | Server → Client | Auto-save confirmation |
| `exam:submit` | Server → Client | Auto-submit notification |
| `exam:time-up` | Server → Client | Time's up notification |
| `exam:monitor:join` | Client → Server | Proctor joins monitoring |
| `exam:monitor:student` | Server → Client | Student data for proctor |

### Payment Endpoints (Sell Exams)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/exams/templates/:id/purchase` | student | Purchase exam access |
| POST | `/api/exams/payments/webhook` | public | Stripe webhook |
| GET | `/api/exams/payments/:id/receipt` | student | Payment receipt |
| POST | `/api/exams/payments/:id/refund` | school, admin | Refund payment |

### Certificate Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/exams/certificates/generate` | system | Auto-generate on pass |
| GET | `/api/exams/certificates/:id` | student | View certificate |
| GET | `/api/exams/certificates/:id/download` | student | Download PDF |
| GET | `/api/exams/certificates/verify/:code` | public | Verify certificate |

---

## Real-Time Architecture

### WebSocket Events Flow

```
Student Browser                    GEMA Server                    Proctor Dashboard
     │                                 │                              │
     │──── exam:join ─────────────────▶│                              │
     │                                 │──── exam:monitor:student ─────▶│
     │◀─── exam:timer ────────────────│                              │
     │                                 │                              │
     │──── exam:answer ───────────────▶│                              │
     │◀─── exam:autosave ─────────────│                              │
     │                                 │                              │
     │──── exam:proctoring:snapshot ──▶│                              │
     │                                 │──── exam:monitor:student ─────▶│
     │                                 │                              │
     │◀─── exam:proctoring:alert ─────│                              │
     │                                 │                              │
     │──── exam:heartbeat ────────────▶│                              │
     │                                 │                              │
     │◀─── exam:time-up ──────────────│                              │
     │──── exam:submit ───────────────▶│                              │
     │                                 │                              │
```

### Anti-Cheating Detection

```typescript
// modules/examinations/services/anti-cheat.service.ts

export class AntiCheatService {
  // Browser-level detection
  detectTabSwitch() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.reportViolation('tab_switch', 'medium');
      }
    });
  }

  detectCopyPaste() {
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      this.reportViolation('copy_attempt', 'low');
    });
    document.addEventListener('paste', (e) => {
      e.preventDefault();
      this.reportViolation('paste_attempt', 'low');
    });
  }

  detectRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.reportViolation('right_click', 'low');
    });
  }

  detectDevTools() {
    const threshold = 160;
    setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        this.reportViolation('devtools_detected', 'high');
      }
    }, 1000);
  }

  enforceFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {
      this.reportViolation('fullscreen_denied', 'medium');
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        this.reportViolation('fullscreen_exit', 'medium');
      }
    });
  }

  // Server-side analysis
  analyzeSuspiciousPattern(attempt: IExamAttempt) {
    const violations = attempt.proctoring.suspiciousActivities;
    const tabSwitches = attempt.proctoring.tabSwitches;

    // Auto-submit if too many violations
    if (tabSwitches >= attempt.exam.proctoring.settings.tabSwitchLimit) {
      return { action: 'auto_submit', reason: 'Too many tab switches' };
    }

    if (violations.filter(v => v.severity === 'high').length >= 3) {
      return { action: 'auto_submit', reason: 'Multiple high-severity violations' };
    }

    // Flag for review
    if (violations.length >= 5) {
      return { action: 'flag_for_review', reason: 'Suspicious activity pattern' };
    }

    return { action: 'continue' };
  }
}
```

### Webcam Proctoring

```typescript
// modules/examinations/services/webcam.service.ts

export class WebcamService {
  async startWebcapture(attemptId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 320, height: 240 },
      audio: false,
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.style.display = 'none';
    document.body.appendChild(video);

    // Capture snapshot every 10 seconds
    setInterval(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'snapshot.jpg');
        formData.append('attemptId', attemptId);
        formData.append('timestamp', new Date().toISOString());

        await fetch('/api/exams/proctoring/snapshot', {
          method: 'POST',
          body: formData,
        });
      }, 'image/jpeg', 0.7);
    }, 10000);
  }
}
```

---

## Frontend Components

### Exam Taker Interface

```
frontend/src/apps/student/components/exam-taker/
├── ExamTaker.tsx                    # Main exam container
├── ExamHeader.tsx                   # Timer, progress, submit button
├── QuestionPalette.tsx              # Question navigation grid
├── QuestionRenderer.tsx             # Renders question by type
├── question-types/
│   ├── MultipleChoiceQuestion.tsx
│   ├── SingleChoiceQuestion.tsx
│   ├── TrueFalseQuestion.tsx
│   ├── FillInBlankQuestion.tsx
│   ├── ShortAnswerQuestion.tsx
│   ├── EssayQuestion.tsx
│   ├── MatchingQuestion.tsx
│   ├── OrderingQuestion.tsx
│   ├── DragDropQuestion.tsx
│   ├── HotspotQuestion.tsx
│   ├── CodeEditorQuestion.tsx
│   └── FileUploadQuestion.tsx
├── ProctoringOverlay.tsx            # Fullscreen enforcement
├── WebcamCapture.tsx                # Webcam snapshot component
├── Timer.tsx                        # Countdown timer with warnings
├── AutoSaveIndicator.tsx            # Save status indicator
├── SubmitConfirmation.tsx           # Submit exam modal
├── ExamResults.tsx                  # Results display
└── CertificateViewer.tsx            # Certificate display
```

### Exam Maker Interface

```
frontend/src/apps/teacher/components/exam-maker/
├── ExamMaker.tsx                    # Main exam creation wizard
├── steps/
│   ├── BasicInfoStep.tsx            # Title, description, type
│   ├── TimingStep.tsx               # Duration, availability
│   ├── QuestionsStep.tsx            # Question selection/creation
│   ├── ScoringStep.tsx              # Points, negative marking
│   ├── ProctoringStep.tsx           # Proctoring settings
│   ├── AppearanceStep.tsx           # Theme, branding
│   ├── ResultsStep.tsx              # Result display settings
│   └── ReviewStep.tsx               # Final review
├── QuestionEditor.tsx               # Question creation/editing
├── QuestionPreview.tsx              # Question preview
├── QuestionBankSelector.tsx         # Select from question bank
├── BulkQuestionImport.tsx           # CSV/JSON import
└── ExamPreview.tsx                  # Full exam preview
```

### Proctor Dashboard

```
frontend/src/apps/teacher/components/proctor-dashboard/
├── ProctorDashboard.tsx             # Main proctor view
├── StudentGrid.tsx                  # Grid of all active students
├── StudentCard.tsx                  # Individual student card
├── StudentDetail.tsx                # Detailed student view
├── WebcamFeed.tsx                   # Live webcam feed
├── ScreenShare.tsx                  # Screen sharing view
├── ViolationLog.tsx                 # Violation timeline
├── AlertPanel.tsx                   # Real-time alerts
└── ProctorControls.tsx              # Proctor actions
```

---

## Implementation Priority

### Phase 1: MVP (Weeks 1-3)

| Feature | Models | Why First |
|---|---|---|
| Exam Template CRUD | ExamTemplate | Core entity |
| Question Bank | QuestionBank, Question | Need questions to create exams |
| Basic Exam Taking | ExamAttempt | Students need to take exams |
| Auto-grading (MCQ, T/F) | — | Immediate feedback |

### Phase 2: Proctoring & Security (Weeks 4-5)

| Feature | Models | Why |
|---|---|---|
| Anti-cheat detection | ExamAttempt.proctoring | Academic integrity |
| Tab switch monitoring | ExamSession | Basic proctoring |
| Webcam snapshots | ExamAttempt.proctoring | Visual monitoring |
| Fullscreen enforcement | — | Prevent cheating |

### Phase 3: Monetization & Certificates (Weeks 6-7)

| Feature | Models | Why |
|---|---|---|
| Paid exams | ExamTemplate.pricing | Revenue stream |
| Stripe integration | Payment (existing) | Payment processing |
| Certificate generation | Certificate (existing) | Completion proof |
| Self-registration | User (existing) | Open access |

### Phase 4: Advanced Features (Weeks 8-10)

| Feature | Models | Why |
|---|---|---|
| Essay/manual grading | ExamAttempt.grading | Complex question types |
| Exam reviews | ExamReview | Dispute resolution |
| Advanced analytics | ExamAnalytics | Performance insights |
| Real-time proctoring | ExamSession | Live monitoring |
| Multi-language | ExamTemplate.appearance | Global reach |

### Phase 5: Polish & Scale (Weeks 11-12)

| Feature | Why |
|---|---|
| Bulk question import | Teacher productivity |
| Exam templates library | Reusability |
| SMS notifications | Student engagement |
| Theme builder | Branding |
| Printable reports | Offline access |
| AI proctoring | Automated integrity |

---

## Integration with Existing GEMA Modules

### With LMS Module
- Courses can contain exams as assessment tools
- Exam scores feed into course grades
- Course completion can require passing an exam

### With Certificate Generator
- Auto-generate certificates on exam pass
- Certificate templates linked to exam templates
- QR verification for exam certificates

### With Student Portal
- Students see upcoming exams in dashboard
- Exam results visible in student portal
- Certificate downloads from student portal

### With Parent Portal
- Parents see children's exam schedules
- Parents receive exam result notifications
- Parents can purchase exam access for children

### With ERP Finance
- Exam purchases generate invoices
- Exam revenue tracked in financial reports
- Refunds processed through payment module

### With Messaging
- Exam reminders sent via messaging
- Proctor alerts sent to teachers
- Result notifications to students/parents

---

## Tech Stack Recommendations

### Frontend
| Library | Purpose |
|---|---|
| `socket.io-client` | Real-time exam sync, proctoring |
| `react-hook-form` | Exam creation forms |
| `@monaco-editor/react` | Code editor questions |
| `react-dnd` | Drag-drop questions |
| `recharts` | Analytics visualization |
| `react-pdf` | Printable reports |
| `react-i18next` | Multi-language |
| `react-webcam` | Webcam capture |
| `screenfull` | Fullscreen API |

### Backend
| Library | Purpose |
|---|---|
| `socket.io` | WebSocket server |
| `stripe` | Payment processing |
| `nodemailer` | Email notifications |
| `twilio` | SMS notifications |
| `pdf-lib` | Certificate generation |
| `bullmq` | Exam processing queue |
| `aws-sdk` | S3 for question media |
| `sharp` | Image processing (webcam) |

### Database
| Feature | Implementation |
|---|---|
| Question indexing | Compound indexes on type, difficulty, category |
| Exam attempt sharding | Partition by examId for large exams |
| Real-time sessions | TTL index on lastHeartbeat (auto-cleanup) |
| Analytics aggregation | Pre-computed snapshots, not real-time queries |

---

## Database Indexes

```typescript
// ExamTemplate indexes
ExamTemplateSchema.index({ schoolId: 1, isActive: 1 });
ExamTemplateSchema.index({ teacherId: 1, isPublished: 1 });
ExamTemplateSchema.index({ courseId: 1, type: 1 });
ExamTemplateSchema.index({ accessMode: 1, pricing.isPaid: 1 });
ExamTemplateSchema.index({ 'availability.startDate': 1, 'availability.endDate': 1 });
ExamTemplateSchema.index({ slug: 1 }, { unique: true });

// Question indexes
QuestionSchema.index({ bankId: 1, type: 1 });
QuestionSchema.index({ bankId: 1, difficulty: 1 });
QuestionSchema.index({ category: 1, subCategory: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ isDeleted: 1, isReviewed: 1 });

// ExamAttempt indexes
ExamAttemptSchema.index({ examId: 1, studentId: 1 });
ExamAttemptSchema.index({ examId: 1, status: 1 });
ExamAttemptSchema.index({ studentId: 1, status: 1 });
ExamAttemptSchema.index({ schoolId: 1, status: 1 });
ExamAttemptSchema.index({ 'scoring.percentage': -1 });
ExamAttemptSchema.index({ deadlineAt: 1 }, { expireAfterSeconds: 0 });

// ExamSession indexes
ExamSessionSchema.index({ attemptId: 1 }, { unique: true });
ExamSessionSchema.index({ isActive: 1, lastHeartbeat: 1 });
ExamSessionSchema.index({ examId: 1, isActive: 1 });

// ExamAnalytics indexes
ExamAnalyticsSchema.index({ examId: 1 }, { unique: true });
ExamAnalyticsSchema.index({ schoolId: 1, generatedAt: -1 });
```

---

*Created: 2026-04-04*
