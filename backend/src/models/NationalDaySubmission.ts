import mongoose, { Document, Schema } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum GradeCategory {
  CAT_1 = "Little Artists", // Kindergarten – Grade 2
  CAT_2 = "Young Creators", // Grades 3–5
  CAT_3 = "Creative Visionaries", // Grades 6–8
  CAT_4 = "Emerging Artists", // Grades 9–12
}

export enum NationalDayGrade {
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

export enum NationalDayMedium {
  PENCIL = "Pencil Drawing / Sketching",
  CRAYONS_PASTELS = "Crayons / Oil Pastels",
  WATERCOLOUR = "Watercolours",
  ACRYLIC = "Acrylics",
  MIXED_TRADITIONAL = "Mixed Traditional Media",
  OTHER_TRADITIONAL = "Other Traditional Medium",
}

export enum NationalDayThemePillar {
  HERITAGE = "Heritage & Traditions",
  UAE_TODAY = "The UAE Today",
  UNITY = "Unity & National Pride",
  TOMORROW = "The UAE of Tomorrow",
}

export enum RegistrationType {
  INDIVIDUAL = "individual",
  SCHOOL_BULK = "school_bulk",
}

export enum SubmissionStatus {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  WINNER = "winner",
  DISQUALIFIED = "disqualified",
  REJECTED = "rejected",
}

export enum ArtworkPermission {
  YES = "yes",
  NO = "no",
}

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IParticipantDetails {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: number;
  grade: string;
  category: string; // Little Artists, Young Creators, etc.
  gender?: string;
  schoolName: string;
  schoolEmirate: string;
}

export interface IArtworkDetails {
  title: string;
  description: string;
  medium: string;
  themePillar: string;
}

export interface IArtworkUpload {
  artworkUrl: string;
  artworkPublicId?: string;
  artworkOriginalName: string;
  artworkSize: number;
  artworkMimetype: string;
}

export interface IDeclarations {
  agreeTerms: boolean;
  traditionalOnlyDeclaration: boolean; // No AI, purely handmade
  originalityDeclaration: boolean;
}

export interface IConsentSection {
  parentGuardianConsent: boolean;
  artworkDisplayPermission: ArtworkPermission;
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface INationalDaySubmission extends Document {
  registrationType: RegistrationType;
  participant: IParticipantDetails;
  artwork: IArtworkDetails;
  artworkUpload: IArtworkUpload;
  declarations: IDeclarations;
  consent: IConsentSection;
  status: SubmissionStatus;
  paymentStatus: "pending" | "paid" | "failed";
  paymentAmount: number; // in AED: 35 for individual, 25 for bulk
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

const nationalDaySubmissionSchema = new Schema<INationalDaySubmission>(
  {
    registrationType: {
      type: String,
      enum: Object.values(RegistrationType),
      default: RegistrationType.INDIVIDUAL,
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
        required: [true, "Parent/Guardian mobile number is required"],
        trim: true,
        maxlength: [30, "Phone number too long"],
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
        max: [20, "Student cannot be older than 20 years old"],
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
        trim: true,
      },
      schoolName: {
        type: String,
        required: [true, "School name is required"],
        trim: true,
        maxlength: [200, "School name cannot exceed 200 characters"],
      },
      schoolEmirate: {
        type: String,
        required: [true, "School emirate is required"],
      },
    },

    artwork: {
      title: {
        type: String,
        required: [true, "Artwork title is required"],
        trim: true,
        maxlength: [200, "Artwork title cannot exceed 200 characters"],
      },
      description: {
        type: String,
        required: [true, "Artwork description is required"],
        trim: true,
        maxlength: [1000, "Artwork description cannot exceed 1000 characters"],
      },
      medium: {
        type: String,
        required: [true, "Artwork medium is required"],
      },
      themePillar: {
        type: String,
        default: "Heritage & Traditions",
      },
    },

    artworkUpload: {
      artworkUrl: {
        type: String,
        required: [true, "Artwork image is required"],
      },
      artworkPublicId: {
        type: String,
      },
      artworkOriginalName: {
        type: String,
        required: [true, "Original file name is required"],
      },
      artworkSize: {
        type: Number,
        required: [true, "File size is required"],
      },
      artworkMimetype: {
        type: String,
        required: [true, "MIME type is required"],
        enum: {
          values: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
          message: "Only JPG, PNG or WEBP images are supported",
        },
      },
    },

    declarations: {
      agreeTerms: {
        type: Boolean,
        required: [true, "Terms agreement is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must agree to the Terms & Conditions",
        },
      },
      traditionalOnlyDeclaration: {
        type: Boolean,
        required: [true, "Traditional artwork declaration is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "Artwork must be 100% created by the student without AI tools",
        },
      },
      originalityDeclaration: {
        type: Boolean,
        required: [true, "Originality declaration is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must declare this is the student's original artwork",
        },
      },
    },

    consent: {
      parentGuardianConsent: {
        type: Boolean,
        required: [true, "Parent/Guardian consent is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "Parent or Guardian must give consent",
        },
      },
      artworkDisplayPermission: {
        type: String,
        enum: Object.values(ArtworkPermission),
        default: ArtworkPermission.YES,
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
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentAmount: {
      type: Number,
      default: 35, // AED 35 for individual
    },
    currency: {
      type: String,
      default: "AED",
    },
    paymentIntentId: {
      type: String,
      sparse: true,
    },
    checkoutSessionId: {
      type: String,
      sparse: true,
    },
    adminNotes: {
      type: String,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
    medal: {
      type: String,
    },
    certificateTemplateId: {
      type: String,
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
  }
);

nationalDaySubmissionSchema.index({ "participant.parentEmail": 1 });
nationalDaySubmissionSchema.index({ "participant.schoolEmirate": 1 });
nationalDaySubmissionSchema.index({ "participant.category": 1 });
nationalDaySubmissionSchema.index({ status: 1, createdAt: -1 });
nationalDaySubmissionSchema.index({ checkoutSessionId: 1 }, { sparse: true });

nationalDaySubmissionSchema.virtual("submissionRef").get(function () {
  return `UAE2026-${this._id.toString().slice(-8).toUpperCase()}`;
});

nationalDaySubmissionSchema.set("toJSON", { virtuals: true });
nationalDaySubmissionSchema.set("toObject", { virtuals: true });

const NationalDaySubmission = mongoose.model<INationalDaySubmission>(
  "NationalDaySubmission",
  nationalDaySubmissionSchema
);

export default NationalDaySubmission;
