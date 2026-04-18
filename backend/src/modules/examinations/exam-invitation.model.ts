import mongoose, { Schema, model, Document } from "mongoose";

export interface IExamInvitation extends Document {
  examTemplateId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  email: string;
  token: string;
  status: "pending" | "accepted" | "completed" | "expired";
  expiresAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  invitedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamInvitationSchema = new Schema<IExamInvitation>(
  {
    examTemplateId: { type: Schema.Types.ObjectId, ref: "ExamTemplate", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    email: { type: String, required: true, lowercase: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "accepted", "completed", "expired"], default: "pending" },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
    completedAt: Date,
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: String,
  },
  { timestamps: true },
);

ExamInvitationSchema.index({ examTemplateId: 1, studentId: 1 }, { unique: true });
ExamInvitationSchema.index({ email: 1, status: 1 });
ExamInvitationSchema.index({ token: 1 }, { unique: true });

const ExamInvitation = model<IExamInvitation>("ExamInvitation", ExamInvitationSchema);
export default ExamInvitation;
