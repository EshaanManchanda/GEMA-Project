import mongoose, { Schema, model, Document } from "mongoose";

export enum AssignmentStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export interface IAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  instructions?: string;
  dueDate: Date;
  maxScore: number;
  attachments?: Array<{ name: string; url: string }>;
  status: AssignmentStatus;
  allowLateSubmission: boolean;
  latePenalty?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    instructions: String,
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, default: 100 },
    attachments: [{ name: String, url: String }],
    status: { type: String, enum: Object.values(AssignmentStatus), default: AssignmentStatus.DRAFT },
    allowLateSubmission: { type: Boolean, default: false },
    latePenalty: Number,
  },
  { timestamps: true },
);

AssignmentSchema.index({ courseId: 1 });
AssignmentSchema.index({ dueDate: 1 });

const Assignment = model<IAssignment>("Assignment", AssignmentSchema);
export default Assignment;
