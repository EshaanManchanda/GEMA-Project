import mongoose, { Schema, model, Document } from "mongoose";

export enum NoticePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface INotice extends Document {
  schoolId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  priority: NoticePriority;
  targetAudience: "all" | "students" | "parents" | "teachers" | "staff" | "vendors";
  startDate: Date;
  endDate?: Date;
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  attachments?: Array<{ url: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    priority: { type: String, enum: Object.values(NoticePriority), default: NoticePriority.MEDIUM },
    targetAudience: { type: String, enum: ["all", "students", "parents", "teachers", "staff", "vendors"], default: "all" },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachments: [{ url: String, name: String }],
  },
  { timestamps: true },
);

NoticeSchema.index({ schoolId: 1, isPublished: 1, startDate: -1 });
NoticeSchema.index({ targetAudience: 1, isPublished: 1 });

const Notice = model<INotice>("Notice", NoticeSchema);
export default Notice;
