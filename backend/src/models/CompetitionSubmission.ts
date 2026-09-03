import mongoose, { Document, Schema } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum Grade {
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

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  PREFER_NOT_TO_SAY = "Prefer not to say",
}

export enum SchoolEmirate {
  ABU_DHABI = "Abu Dhabi",
  DUBAI = "Dubai",
  SHARJAH = "Sharjah",
  AJMAN = "Ajman",
  UMM_AL_QUWAIN = "Umm Al Quwain",
  RAS_AL_KHAIMAH = "Ras Al Khaimah",
  FUJAIRAH = "Fujairah",
}

export enum AiTool {
  CANVA_AI = "Canva AI / Canva Magic Media",
  GOOGLE_GEMINI = "Google Gemini",
  CHATGPT = "ChatGPT",
  ADOBE_FIREFLY = "Adobe Firefly",
  MICROSOFT_DESIGNER = "Microsoft Designer / Copilot",
  MIDJOURNEY = "Midjourney",
  CLAUDE = "Claude",
  DALL_E = "DALL-E",
  FIGMA = "Figma",
  OTHER_CREATIVE = "Other AI creative tool",
}

export enum CreationType {
  AI_ASSISTED = "AI Assisted",
  AI_CREATED = "AI Created",
  AI_CREATED_HUMAN_EDITED = "AI Created + Human Edited",
  AI_USED_BY_PARENT_TEACHER = "AI Used by Parent/Teacher",
}

export enum ChangesAfterGeneration {
  NO_CHANGES = "No changes",
  SMALL_CHANGES = "I made small changes",
  SIGNIFICANT_CHANGES = "I made significant changes",
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
  grade: Grade;
  cohort?: string;
  gender?: Gender;
  schoolName: string;
  schoolEmirate: SchoolEmirate;
}

export interface IArtworkDetails {
  title: string;
  description: string; // max 100 words
}

export interface IAiCreation {
  tools: string[]; // AiTool values + custom
  otherToolName?: string;
  creationType: CreationType;
  mainPrompt: string;
  additionalPrompts?: string[];
  changesAfterGeneration: ChangesAfterGeneration;
  changesDescription?: string;
}

export interface IArtworkUpload {
  artworkUrl: string; // Cloudinary URL
  artworkPublicId: string;
  artworkOriginalName: string;
  artworkSize: number;
  artworkMimetype: string;
}

export interface IDeclarations {
  agreeTerms: boolean;
  responsibleAiDeclaration: boolean;
  originalityDeclaration: boolean;
}

export interface IConsentSection {
  parentGuardianConsent: boolean;
  artworkDisplayPermission: ArtworkPermission;
  nameDisplayPermission: boolean; // true = show name, false = don't show
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface ICompetitionSubmission extends Document {
  participant: IParticipantDetails;
  artwork: IArtworkDetails;
  aiCreation: IAiCreation;
  artworkUpload: IArtworkUpload;
  declarations: IDeclarations;
  consent: IConsentSection;
  status: SubmissionStatus;
  paymentStatus: "pending" | "paid" | "failed";
  paymentIntentId?: string;
  checkoutSessionId?: string;
  adminNotes?: string;
  medal?: string;
  certificateTemplateId?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    submittedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const competitionSubmissionSchema = new Schema<ICompetitionSubmission>(
  {
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
        maxlength: [150, "Name cannot exceed 150 characters"],
      },
      studentAge: {
        type: Number,
        required: [true, "Student age is required"],
        min: [4, "Age must be at least 4"],
        max: [20, "Age must be at most 20"],
      },
      grade: {
        type: String,
        required: [true, "Grade is required"],
        enum: {
          values: Object.values(Grade),
          message: "Invalid grade selection",
        },
      },
      cohort: {
        type: String,
        trim: true,
      },
      gender: {
        type: String,
        enum: {
          values: Object.values(Gender),
          message: "Invalid gender selection",
        },
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
        enum: {
          values: Object.values(SchoolEmirate),
          message: "Invalid emirate selection",
        },
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
    },

    aiCreation: {
      tools: {
        type: [String],
        required: [true, "At least one AI tool must be selected"],
        validate: {
          validator: (v: string[]) => v.length > 0,
          message: "At least one AI tool must be selected",
        },
      },
      otherToolName: {
        type: String,
        trim: true,
        maxlength: [200, "Tool name cannot exceed 200 characters"],
      },
      creationType: {
        type: String,
        required: [true, "Creation type is required"],
        enum: {
          values: Object.values(CreationType),
          message: "Invalid creation type selection",
        },
      },
      mainPrompt: {
        type: String,
        required: [true, "Main AI prompt is required"],
        trim: true,
        maxlength: [5000, "Main prompt cannot exceed 5000 characters"],
      },
      additionalPrompts: {
        type: [String],
        default: [],
        validate: {
          validator: (v: string[]) => v.length <= 3,
          message: "Maximum 3 additional prompts allowed",
        },
      },
      changesAfterGeneration: {
        type: String,
        required: [true, "Please indicate changes made after AI generation"],
        enum: {
          values: Object.values(ChangesAfterGeneration),
          message: "Invalid changes selection",
        },
      },
      changesDescription: {
        type: String,
        trim: true,
        maxlength: [1000, "Changes description cannot exceed 1000 characters"],
      },
    },

    artworkUpload: {
      artworkUrl: {
        type: String,
        required: [true, "Artwork file is required"],
      },
      artworkPublicId: {
        type: String,
        required: [true, "Artwork public ID is required"],
      },
      artworkOriginalName: {
        type: String,
        required: true,
      },
      artworkSize: {
        type: Number,
        required: true,
      },
      artworkMimetype: {
        type: String,
        required: true,
      },
    },

    declarations: {
      agreeTerms: {
        type: Boolean,
        required: [true, "You must agree to the terms and conditions"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must agree to the terms and conditions",
        },
      },
      responsibleAiDeclaration: {
        type: Boolean,
        required: [true, "Responsible AI declaration is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must confirm the Responsible AI declaration",
        },
      },
      originalityDeclaration: {
        type: Boolean,
        required: [true, "Originality declaration is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "You must confirm the Originality declaration",
        },
      },
    },

    consent: {
      parentGuardianConsent: {
        type: Boolean,
        required: [true, "Parent/Guardian consent is required"],
        validate: {
          validator: (v: boolean) => v === true,
          message: "Parent/Guardian must give consent",
        },
      },
      artworkDisplayPermission: {
        type: String,
        required: [true, "Artwork display permission is required"],
        enum: {
          values: Object.values(ArtworkPermission),
          message: "Invalid artwork display permission",
        },
      },
      nameDisplayPermission: {
        type: Boolean,
        required: true,
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
      index: true,
    },

    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentIntentId: {
      type: String,
    },
    checkoutSessionId: {
      type: String,
    },
    medal: { type: String },
    certificateTemplateId: { type: String },

    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      submittedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

competitionSubmissionSchema.index({ "participant.parentEmail": 1 });
competitionSubmissionSchema.index({ "participant.schoolEmirate": 1 });
competitionSubmissionSchema.index({ "participant.grade": 1 });
competitionSubmissionSchema.index({ status: 1, createdAt: -1 });
competitionSubmissionSchema.index({ createdAt: -1 });

// ─── Virtual ─────────────────────────────────────────────────────────────────

competitionSubmissionSchema.virtual("submissionRef").get(function () {
  return `KAC2026-${this._id.toString().slice(-8).toUpperCase()}`;
});

// ─── Model ────────────────────────────────────────────────────────────────────

const CompetitionSubmission = mongoose.model<ICompetitionSubmission>(
  "CompetitionSubmission",
  competitionSubmissionSchema,
);

export default CompetitionSubmission;
