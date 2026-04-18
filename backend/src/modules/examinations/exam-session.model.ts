import mongoose, { Schema, model, Document } from "mongoose";

export interface IExamSession extends Document {
  examTemplateId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  attemptId: mongoose.Types.ObjectId;
  token: string;
  status: "active" | "completed" | "expired" | "terminated";
  startedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  deviceInfo: {
    browser: string;
    os: string;
    screenResolution: string;
  };
  proctoringData: {
    webcamEnabled: boolean;
    screenShareEnabled: boolean;
    tabSwitchCount: number;
    copyPasteCount: number;
    idleTime: number;
    suspiciousActivityCount: number;
    snapshots: Array<{
      timestamp: Date;
      imageUrl?: string;
      reason: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ExamSessionSchema = new Schema<IExamSession>(
  {
    examTemplateId: { type: Schema.Types.ObjectId, ref: "ExamTemplate", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "ExamAttempt", required: true, unique: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "completed", "expired", "terminated"], default: "active" },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    lastActivityAt: { type: Date, default: Date.now },
    ipAddress: String,
    deviceInfo: {
      browser: String,
      os: String,
      screenResolution: String,
    },
    proctoringData: {
      webcamEnabled: { type: Boolean, default: false },
      screenShareEnabled: { type: Boolean, default: false },
      tabSwitchCount: { type: Number, default: 0 },
      copyPasteCount: { type: Number, default: 0 },
      idleTime: { type: Number, default: 0 },
      suspiciousActivityCount: { type: Number, default: 0 },
      snapshots: [
        {
          timestamp: { type: Date, default: Date.now },
          imageUrl: String,
          reason: String,
        },
      ],
    },
  },
  { timestamps: true },
);

ExamSessionSchema.index({ studentId: 1, status: 1 });
ExamSessionSchema.index({ examTemplateId: 1, status: 1 });
ExamSessionSchema.index({ token: 1 }, { unique: true });
ExamSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ExamSession = model<IExamSession>("ExamSession", ExamSessionSchema);
export default ExamSession;
