import mongoose, { Schema, model, Document } from "mongoose";

export enum CertificateStatus {
  PENDING = "pending",
  GENERATED = "generated",
  SENT = "sent",
  DOWNLOADED = "downloaded",
}

export interface ICertificateRecord extends Document {
  templateId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  examId?: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;
  certificateNumber: string;
  verificationCode: string;
  variables: Record<string, any>;
  pdfUrl?: string;
  imageUrl?: string;
  status: CertificateStatus;
  sentAt?: Date;
  downloadedAt?: Date;
  verificationUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateRecordSchema = new Schema<ICertificateRecord>(
  {
    templateId: { type: Schema.Types.ObjectId, ref: "CertificateTemplate", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    examId: { type: Schema.Types.ObjectId, ref: "ExamAttempt" },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    certificateNumber: { type: String, required: true, unique: true },
    verificationCode: { type: String, required: true, unique: true, index: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    pdfUrl: String,
    imageUrl: String,
    status: { type: String, enum: Object.values(CertificateStatus), default: CertificateStatus.PENDING },
    sentAt: Date,
    downloadedAt: Date,
    verificationUrl: { type: String, required: true },
  },
  { timestamps: true },
);

CertificateRecordSchema.index({ studentId: 1, status: 1 });
CertificateRecordSchema.index({ eventId: 1, status: 1 });
CertificateRecordSchema.index({ courseId: 1, status: 1 });
CertificateRecordSchema.index({ verificationCode: 1 }, { unique: true });
CertificateRecordSchema.index({ certificateNumber: 1 }, { unique: true });
CertificateRecordSchema.index({ templateId: 1 });

const CertificateRecord = model<ICertificateRecord>("CertificateRecord", CertificateRecordSchema);
export default CertificateRecord;
