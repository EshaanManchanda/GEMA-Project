import mongoose, { Schema, model, Document } from "mongoose";

export enum ExamAttemptStatus {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  GRADED = "graded",
  FLAGGED = "flagged",
  TIMED_OUT = "timed_out",
}

export interface IExamAttempt extends Document {
  examTemplateId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  status: ExamAttemptStatus;
  answers: Array<{
    questionId: mongoose.Types.ObjectId;
    answer: string | string[] | Record<string, string>;
    isCorrect?: boolean;
    pointsEarned: number;
    timeSpent?: number;
  }>;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  submittedAt?: Date;
  timeSpent: number;
  attemptNumber: number;
  // Anti-cheat
  tabSwitches: number;
  copyPasteEvents: number;
  webcamSnapshots?: string[];
  screenRecordingUrl?: string;
  flagged: boolean;
  flagReasons: string[];
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    examTemplateId: { type: Schema.Types.ObjectId, ref: "ExamTemplate", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    status: { type: String, enum: Object.values(ExamAttemptStatus), default: ExamAttemptStatus.IN_PROGRESS },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        answer: { type: Schema.Types.Mixed, required: true },
        isCorrect: Boolean,
        pointsEarned: { type: Number, default: 0 },
        timeSpent: Number,
      },
    ],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    timeSpent: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
    tabSwitches: { type: Number, default: 0 },
    copyPasteEvents: { type: Number, default: 0 },
    webcamSnapshots: [String],
    screenRecordingUrl: String,
    flagged: { type: Boolean, default: false },
    flagReasons: [String],
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
);

ExamAttemptSchema.index({ examTemplateId: 1, studentId: 1 }, { unique: true });
ExamAttemptSchema.index({ studentId: 1, status: 1 });
ExamAttemptSchema.index({ courseId: 1, status: 1 });
ExamAttemptSchema.index({ flagged: 1 });
ExamAttemptSchema.index({ startedAt: -1 });

const ExamAttempt = model<IExamAttempt>("ExamAttempt", ExamAttemptSchema);
export default ExamAttempt;
