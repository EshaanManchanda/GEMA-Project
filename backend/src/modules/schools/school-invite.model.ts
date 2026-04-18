import mongoose, { Schema, model, Document } from "mongoose";

export interface ISchoolInvite extends Document {
  schoolId: mongoose.Types.ObjectId;
  email: string;
  role: "teacher" | "employee" | "student" | "parent";
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  metadata?: {
    grade?: string;
    section?: string;
    subject?: string;
    parentId?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SchoolInviteSchema = new Schema<ISchoolInvite>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["teacher", "employee", "student", "parent"], required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: Date,
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    metadata: {
      grade: String,
      section: String,
      subject: String,
      parentId: { type: Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: true },
);

SchoolInviteSchema.index({ email: 1, role: 1 });
SchoolInviteSchema.index({ token: 1 }, { unique: true });
SchoolInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SchoolInvite = model<ISchoolInvite>("SchoolInvite", SchoolInviteSchema);
export default SchoolInvite;
