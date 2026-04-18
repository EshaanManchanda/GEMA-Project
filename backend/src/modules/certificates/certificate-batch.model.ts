import mongoose, { Schema, model, Document } from "mongoose";

export enum BatchStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  PARTIAL = "partial",
}

export interface ICertificateBatch extends Document {
  templateId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: BatchStatus;
  totalCertificates: number;
  generatedCertificates: number;
  failedCertificates: number;
  studentIds: mongoose.Types.ObjectId[];
  eventId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  variables: Record<string, any>;
  errorLog?: Array<{
    studentId: mongoose.Types.ObjectId;
    error: string;
    timestamp: Date;
  }>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateBatchSchema = new Schema<ICertificateBatch>(
  {
    templateId: { type: Schema.Types.ObjectId, ref: "CertificateTemplate", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    status: { type: String, enum: Object.values(BatchStatus), default: BatchStatus.PENDING },
    totalCertificates: { type: Number, default: 0 },
    generatedCertificates: { type: Number, default: 0 },
    failedCertificates: { type: Number, default: 0 },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    variables: { type: Schema.Types.Mixed, default: {} },
    errorLog: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "Student" },
        error: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

CertificateBatchSchema.index({ createdBy: 1, status: 1 });
CertificateBatchSchema.index({ eventId: 1 });
CertificateBatchSchema.index({ courseId: 1 });
CertificateBatchSchema.index({ status: 1 });

const CertificateBatch = model<ICertificateBatch>("CertificateBatch", CertificateBatchSchema);
export default CertificateBatch;
