import mongoose, { Schema, model, Document } from "mongoose";

export enum CourseStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum CoursePricingType {
  FREE = "free",
  PAID = "paid",
  SUBSCRIPTION = "subscription",
}

export interface ICourse extends Document {
  schoolId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  category: string;
  gradeLevel: string;
  credits: number;
  duration: { weeks: number; hoursPerWeek: number };
  status: CourseStatus;
  pricing: {
    type: CoursePricingType;
    amount?: number;
    currency?: string;
  };
  enrollment: {
    maxStudents?: number;
    enrolledCount: number;
    startDate: Date;
    endDate: Date;
    enrollmentOpen: boolean;
  };
  stats: {
    averageGrade: number;
    completionRate: number;
    totalStudents: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    thumbnail: String,
    category: { type: String, required: true },
    gradeLevel: { type: String, required: true },
    credits: { type: Number, default: 0 },
    duration: {
      weeks: { type: Number, default: 0 },
      hoursPerWeek: { type: Number, default: 0 },
    },
    status: { type: String, enum: Object.values(CourseStatus), default: CourseStatus.DRAFT },
    pricing: {
      type: { type: String, enum: Object.values(CoursePricingType), default: CoursePricingType.FREE },
      amount: Number,
      currency: { type: String, default: "AED" },
    },
    enrollment: {
      maxStudents: Number,
      enrolledCount: { type: Number, default: 0 },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      enrollmentOpen: { type: Boolean, default: true },
    },
    stats: {
      averageGrade: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      totalStudents: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

CourseSchema.index({ teacherId: 1, status: 1 });
CourseSchema.index({ schoolId: 1, status: 1 });
CourseSchema.index({ category: 1, status: 1 });
CourseSchema.index({ gradeLevel: 1, status: 1 });
CourseSchema.index({ slug: 1 });

const Course = model<ICourse>("Course", CourseSchema);
export default Course;
