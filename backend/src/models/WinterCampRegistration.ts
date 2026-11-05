import mongoose, { Document, Schema } from "mongoose";

export enum WinterCampStatus {
  PENDING = "pending",
  CONTACTED = "contacted",
  ENROLLED = "enrolled",
  CANCELLED = "cancelled",
}

export interface IWinterCampRegistration extends Document {
  studentName: string;
  studentEmail: string;
  parentEmail: string;
  parentPhone?: string;
  grade: string;
  selectedPrograms: string[];
  interests?: string[];
  message?: string;
  status: WinterCampStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WinterCampRegistrationSchema = new Schema<IWinterCampRegistration>(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    studentEmail: {
      type: String,
      required: [true, "Student email is required"],
      trim: true,
      lowercase: true,
    },
    parentEmail: {
      type: String,
      required: [true, "Parent email is required"],
      trim: true,
      lowercase: true,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    grade: {
      type: String,
      required: [true, "Grade is required"],
      trim: true,
    },
    selectedPrograms: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(WinterCampStatus),
      default: WinterCampStatus.PENDING,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

WinterCampRegistrationSchema.index({ studentEmail: 1 });
WinterCampRegistrationSchema.index({ parentEmail: 1 });
WinterCampRegistrationSchema.index({ status: 1 });
WinterCampRegistrationSchema.index({ createdAt: -1 });

export default mongoose.model<IWinterCampRegistration>(
  "WinterCampRegistration",
  WinterCampRegistrationSchema
);

