import mongoose, { Schema, model, Document } from "mongoose";

export interface IExamReview extends Document {
  examAttemptId: mongoose.Types.ObjectId;
  examTemplateId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  originalScore: number;
  adjustedScore?: number;
  feedback?: string;
  status: "pending" | "reviewed" | "disputed" | "resolved";
  disputeReason?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamReviewSchema = new Schema<IExamReview>(
  {
    examAttemptId: { type: Schema.Types.ObjectId, ref: "ExamAttempt", required: true, unique: true },
    examTemplateId: { type: Schema.Types.ObjectId, ref: "ExamTemplate", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalScore: { type: Number, required: true },
    adjustedScore: Number,
    feedback: String,
    status: { type: String, enum: ["pending", "reviewed", "disputed", "resolved"], default: "pending" },
    disputeReason: String,
    resolution: String,
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

ExamReviewSchema.index({ examTemplateId: 1, status: 1 });
ExamReviewSchema.index({ studentId: 1 });
ExamReviewSchema.index({ reviewerId: 1, status: 1 });

const ExamReview = model<IExamReview>("ExamReview", ExamReviewSchema);
export default ExamReview;
