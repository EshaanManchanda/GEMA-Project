import mongoose, { Schema, model, Document } from "mongoose";

export interface ICertificateVerificationLog extends Document {
  certificateId: mongoose.Types.ObjectId;
  verificationCode: string;
  verifiedBy: string;
  verifiedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
  createdAt: Date;
}

const CertificateVerificationLogSchema = new Schema<ICertificateVerificationLog>(
  {
    certificateId: { type: Schema.Types.ObjectId, ref: "CertificateRecord" },
    verificationCode: { type: String, required: true, index: true },
    verifiedBy: { type: String, required: true },
    verifiedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    isValid: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CertificateVerificationLogSchema.index({ verificationCode: 1, verifiedAt: -1 });
CertificateVerificationLogSchema.index({ certificateId: 1 });

const CertificateVerificationLog = model<ICertificateVerificationLog>("CertificateVerificationLog", CertificateVerificationLogSchema);
export default CertificateVerificationLog;
