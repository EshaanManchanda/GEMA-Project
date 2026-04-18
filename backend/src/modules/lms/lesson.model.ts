import mongoose, { Schema, model, Document } from "mongoose";

export enum LessonType {
  VIDEO = "video",
  TEXT = "text",
  PDF = "pdf",
  QUIZ = "quiz",
  ASSIGNMENT = "assignment",
  LIVE = "live",
}

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: LessonType;
  content: {
    videoUrl?: string;
    videoDuration?: number;
    textContent?: string;
    pdfUrl?: string;
    liveUrl?: string;
    liveScheduledAt?: Date;
  };
  order: number;
  isPreview: boolean;
  isPublished: boolean;
  duration?: number;
  resources?: Array<{ name: string; url: string; type: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: "Module" },
    title: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: Object.values(LessonType), required: true },
    content: {
      videoUrl: String,
      videoDuration: Number,
      textContent: String,
      pdfUrl: String,
      liveUrl: String,
      liveScheduledAt: Date,
    },
    order: { type: Number, required: true },
    isPreview: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    duration: Number,
    resources: [{ name: String, url: String, type: String }],
  },
  { timestamps: true },
);

LessonSchema.index({ courseId: 1, order: 1 });
LessonSchema.index({ moduleId: 1, order: 1 });

const Lesson = model<ILesson>("Lesson", LessonSchema);
export default Lesson;
