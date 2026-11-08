import mongoose, { Document, Schema } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum GCCGradeCategory {
  CAT_2 = "Young Authors",       // Grades 3–5
  CAT_3 = "Creative Voices",     // Grades 6–8
  CAT_4 = "Emerging Writers",    // Grades 9–12
}

export enum GCCGrade {
  GRADE_3 = "Grade 3",
  GRADE_4 = "Grade 4",
  GRADE_5 = "Grade 5",
  GRADE_6 = "Grade 6",
  GRADE_7 = "Grade 7",
  GRADE_8 = "Grade 8",
  GRADE_9 = "Grade 9",
  GRADE_10 = "Grade 10",
  GRADE_11 = "Grade 11",
  GRADE_12 = "Grade 12",
}

export enum GCCCountry {
  BAHRAIN = "Bahrain",
  KUWAIT = "Kuwait",
  OMAN = "Oman",
  QATAR = "Qatar",
  SAUDI_ARABIA = "Saudi Arabia",
  UAE = "United Arab Emirates",
}

export enum GCCRegistrationType {
  INDIVIDUAL = "individual",
  SCHOOL_BULK = "school_bulk",
}

export enum GCCSubmissionStatus {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  WINNER = "winner",
  DISQUALIFIED = "disqualified",
  REJECTED = "rejected",
}

export enum GCCStoryPermission {
  YES = "yes",
  NO = "no",
}

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IGCCParticipantDetails {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: number;
  grade: string;
  category: string;
  gender?: string;
  country: string;
  city?: string;
  schoolName: string;
}

export interface IGCCStoryDetails {
  title: string;
  description?: string;
  themePillar?: string;
  wordCount?: number;
  storyContent?: string;
}

export interface IGCCStoryUpload {
  storyUrl: string;
  storyPublicId?: string;
  storyOriginalName: string;
  storyMimetype: string;
  storySize: number;
  uploadedAt: Date;
}

export interface IGCCDeclarations {
  agreeTerms: boolean;
  originalityDeclaration: boolean;
  writtenShortStoryDeclaration: boolean;
}

export interface IGCCConsentSection {
  parentGuardianConsent: boolean;
  storyDisplayPermission: GCCStoryPermission;
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface IGCCSubmission extends Document {
  registrationType: GCCRegistrationType;
  participant: IGCCParticipantDetails;
  story?: Partial<IGCCStoryDetails>;
  storyUpload?: Partial<IGCCStoryUpload>;
  declarations: IGCCDeclarations;
  consent: IGCCConsentSection;
  status: GCCSubmissionStatus;
  paymentStatus: "pending" | "paid" | "failed";
  paymentAmount: number; // in AED: 50 for individual, 40 for bulk (or local equivalent)
  currency: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  adminNotes?: string;
  medal?: "gold" | "silver" | "bronze" | "overall_best" | "special_recognition";
  certificateTemplateId?: string;
  schoolBulkRef?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    submittedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const gccSubmissionSchema = new Schema<IGCCSubmission>(
  {
    registrationType: {
      type: String,
      enum: Object.values(GCCRegistrationType),
      default: GCCRegistrationType.INDIVIDUAL,
      required: true,
    },
    participant: {
      parentName: {
        type: String,
        required: [true, "Parent/Guardian name is required"],
        trim: true,
        maxlength: [150, "Name cannot exceed 150 characters"],
      },
      parentEmail: {
        type: String,
        required: [true, "Parent/Guardian email is required"],
        lowercase: true,
        trim: true,
        validate: {
          validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          message: "Please provide a valid email address",
        },
      },
      parentPhone: {
        type: String,
        required: [true, "Parent/Guardian phone number is required"],
        trim: true,
      },
      studentFullName: {
        type: String,
        required: [true, "Student full name is required"],
        trim: true,
        maxlength: [150, "Student name cannot exceed 150 characters"],
      },
      studentAge: {
        type: Number,
        required: [true, "Student age is required"],
        min: [3, "Student must be at least 3 years old"],
        max: [20, "Student must be at most 20 years old"],
      },
      grade: {
        type: String,
        required: [true, "Grade is required"],
      },
      category: {
        type: String,
        required: [true, "Competition category is required"],
      },
      gender: {
        type: String,
        enum: ["Male", "Female", "Prefer not to say"],
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        default: "United Arab Emirates",
      },
      city: {
        type: String,
        required: false,
        trim: true,
      },
      schoolName: {
        type: String,
        required: [true, "School name is required"],
        trim: true,
        maxlength: [200, "School name cannot exceed 200 characters"],
      },
    },
    story: {
      title: {
        type: String,
        trim: true,
        maxlength: [200, "Story title cannot exceed 200 characters"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"],
      },
      themePillar: {
        type: String,
        trim: true,
      },
      wordCount: {
        type: Number,
      },
      storyContent: {
        type: String,
        trim: true,
      },
    },
    storyUpload: {
      storyUrl: {
        type: String,
        trim: true,
      },
      storyPublicId: {
        type: String,
        trim: true,
      },
      storyOriginalName: {
        type: String,
        trim: true,
      },
      storyMimetype: {
        type: String,
        trim: true,
      },
      storySize: {
        type: Number,
      },
      uploadedAt: {
        type: Date,
      },
    },
    declarations: {
      agreeTerms: {
        type: Boolean,
        required: [true, "Agreement to terms is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must agree to the competition terms and rules",
        },
      },
      originalityDeclaration: {
        type: Boolean,
        required: [true, "Originality declaration is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must declare that the story is completely original and student-written",
        },
      },
      writtenShortStoryDeclaration: {
        type: Boolean,
        default: true,
      },
    },
    consent: {
      parentGuardianConsent: {
        type: Boolean,
        required: [true, "Parent/Guardian consent is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "Parent or guardian consent is mandatory",
        },
      },
      storyDisplayPermission: {
        type: String,
        enum: Object.values(GCCStoryPermission),
        default: GCCStoryPermission.YES,
      },
      nameDisplayPermission: {
        type: Boolean,
        default: true,
      },
      competitionUpdatesConsent: {
        type: Boolean,
        required: [true, "Competition updates consent is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must agree to receive competition communications",
        },
      },
      marketingConsent: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: Object.values(GCCSubmissionStatus),
      default: GCCSubmissionStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentAmount: {
      type: Number,
      default: 50,
    },
    currency: {
      type: String,
      default: "AED",
    },
    paymentIntentId: {
      type: String,
      trim: true,
    },
    checkoutSessionId: {
      type: String,
      trim: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    medal: {
      type: String,
      enum: ["gold", "silver", "bronze", "overall_best", "special_recognition"],
    },
    certificateTemplateId: {
      type: String,
      trim: true,
    },
    schoolBulkRef: {
      type: String,
      trim: true,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      submittedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

gccSubmissionSchema.index({ "participant.parentEmail": 1 });
gccSubmissionSchema.index({ "participant.country": 1 });
gccSubmissionSchema.index({ "participant.grade": 1 });
gccSubmissionSchema.index({ "participant.category": 1 });
gccSubmissionSchema.index({ status: 1, createdAt: -1 });
gccSubmissionSchema.index({ paymentStatus: 1 });
gccSubmissionSchema.index({ createdAt: -1 });

// ─── Virtual ──────────────────────────────────────────────────────────────────

gccSubmissionSchema.virtual("submissionRef").get(function () {
  return `GCC2027-${this._id.toString().slice(-8).toUpperCase()}`;
});

// ─── Model ────────────────────────────────────────────────────────────────────

const GCCSubmission = mongoose.model<IGCCSubmission>(
  "GCCSubmission",
  gccSubmissionSchema
);

export default GCCSubmission;

