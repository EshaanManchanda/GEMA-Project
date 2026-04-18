import mongoose, { Schema, model, Document } from "mongoose";

export enum SubmissionStatus {
  SUBMITTED = "submitted",
  GRADED = "graded",
  LATE = "late",
  NOT_SUBMITTED = "not_submitted",
}

export interface IAssignmentSubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  content?: string;
  attachments?: Array<{ name: string; url: string }>;
  status: SubmissionStatus;
  submittedAt?: Date;
  score?: number;
  feedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
  isLate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    content: String,
    attachments: [{ name: String, url: String }],
    status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.SUBMITTED },
    submittedAt: Date,
    score: Number,
    feedback: String,
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    gradedAt: Date,
    isLate: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ studentId: 1, status: 1 });

const AssignmentSubmission = model<IAssignmentSubmission>("AssignmentSubmission", AssignmentSubmissionSchema);
export default AssignmentSubmission;
