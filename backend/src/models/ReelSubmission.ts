import mongoose, { Document, Schema } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ReelGradeCategory {
  CAT_1 = "Little Reel Creators",    // Kindergarten – Grade 2 (Up to 30s)
  CAT_2 = "Young Reel Makers",       // Grades 3–5 (30–45s)
  CAT_3 = "Creative Storytellers",   // Grades 6–8 (30–60s)
  CAT_4 = "Emerging Filmmakers",     // Grades 9–12 (30–60s)
}

export enum ReelGrade {
  KINDERGARTEN = "Kindergarten",
  GRADE_1 = "Grade 1",
  GRADE_2 = "Grade 2",
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

export enum ReelCountry {
  BAHRAIN = "Bahrain",
  KUWAIT = "Kuwait",
  OMAN = "Oman",
  QATAR = "Qatar",
  SAUDI_ARABIA = "Saudi Arabia",
  UAE = "United Arab Emirates",
}

export enum ReelRegistrationType {
  INDIVIDUAL = "individual",
  SCHOOL_BULK = "school_bulk",
}

export enum ReelSubmissionStatus {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  WINNER = "winner",
  DISQUALIFIED = "disqualified",
  REJECTED = "rejected",
}

export enum ReelVideoPermission {
  YES = "yes",
  NO = "no",
}

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IReelParticipantDetails {
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

export interface IReelVideoDetails {
  title: string;
  description?: string;
  momentTheme?: string;
  durationSeconds?: number;
  videoUrl?: string;
  videoDriveLink?: string;
  deviceUsed?: string;
}

export interface IReelDeclarations {
  agreeTerms: boolean;
  originalityDeclaration: boolean;
  mobileCapturedDeclaration: boolean;
  musicConsentDeclaration: boolean;
  privacyPermissionDeclaration: boolean;
}

export interface IReelConsentSection {
  parentGuardianConsent: boolean;
  reelDisplayPermission: ReelVideoPermission;
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface IReelSubmission extends Document {
  registrationType: ReelRegistrationType;
  participant: IReelParticipantDetails;
  reel?: Partial<IReelVideoDetails>;
  declarations: IReelDeclarations;
  consent: IReelConsentSection;
  status: ReelSubmissionStatus;
  paymentStatus: "pending" | "paid" | "failed";
  paymentAmount: number; // in AED: 50 for individual, 40 for bulk
  currency: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  adminNotes?: string;
  medal?: "gold" | "silver" | "bronze" | "special_recognition" | "creative_excellence";
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

const reelSubmissionSchema = new Schema<IReelSubmission>(
  {
    registrationType: {
      type: String,
      enum: Object.values(ReelRegistrationType),
      default: ReelRegistrationType.INDIVIDUAL,
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
    reel: {
      title: {
        type: String,
        trim: true,
        maxlength: [200, "Reel title cannot exceed 200 characters"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"],
      },
      momentTheme: {
        type: String,
        trim: true,
      },
      durationSeconds: {
        type: Number,
      },
      videoUrl: {
        type: String,
        trim: true,
      },
      videoDriveLink: {
        type: String,
        trim: true,
      },
      deviceUsed: {
        type: String,
        trim: true,
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
          message: "You must declare that the video is completely original and student-captured",
        },
      },
      mobileCapturedDeclaration: {
        type: Boolean,
        default: true,
      },
      musicConsentDeclaration: {
        type: Boolean,
        default: true,
      },
      privacyPermissionDeclaration: {
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
      reelDisplayPermission: {
        type: String,
        enum: Object.values(ReelVideoPermission),
        default: ReelVideoPermission.YES,
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
      enum: Object.values(ReelSubmissionStatus),
      default: ReelSubmissionStatus.PENDING,
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
      enum: ["gold", "silver", "bronze", "special_recognition", "creative_excellence"],
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

reelSubmissionSchema.index({ "participant.parentEmail": 1 });
reelSubmissionSchema.index({ "participant.country": 1 });
reelSubmissionSchema.index({ "participant.grade": 1 });
reelSubmissionSchema.index({ "participant.category": 1 });
reelSubmissionSchema.index({ status: 1, createdAt: -1 });
reelSubmissionSchema.index({ paymentStatus: 1 });
reelSubmissionSchema.index({ createdAt: -1 });

// ─── Virtual ──────────────────────────────────────────────────────────────────

reelSubmissionSchema.virtual("submissionRef").get(function () {
  return `REEL2027-${this._id.toString().slice(-8).toUpperCase()}`;
});

// ─── Model ────────────────────────────────────────────────────────────────────

const ReelSubmission = mongoose.model<IReelSubmission>(
  "ReelSubmission",
  reelSubmissionSchema
);

export default ReelSubmission;

