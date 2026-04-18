import mongoose, { Schema, model, Document } from "mongoose";

export enum EnrollmentStatus {
  ENROLLED = "enrolled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DROPPED = "dropped",
  EXPIRED = "expired",
}

export interface ICourseEnrollment extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date;
  droppedAt?: Date;
  progress: number;
  currentLesson?: mongoose.Types.ObjectId;
  grade?: {
    score: number;
    maxScore: number;
    letterGrade: string;
    gradedAt: Date;
    gradedBy: mongoose.Types.ObjectId;
  };
  paymentStatus: "pending" | "paid" | "refunded" | "free";
  paymentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CourseEnrollmentSchema = new Schema<ICourseEnrollment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    status: { type: String, enum: Object.values(EnrollmentStatus), default: EnrollmentStatus.ENROLLED },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
    droppedAt: Date,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    currentLesson: { type: Schema.Types.ObjectId, ref: "Lesson" },
    grade: {
      score: Number,
      maxScore: Number,
      letterGrade: String,
      gradedAt: Date,
      gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded", "free"], default: "free" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true },
);

CourseEnrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });
CourseEnrollmentSchema.index({ studentId: 1, status: 1 });
CourseEnrollmentSchema.index({ courseId: 1, status: 1 });

const CourseEnrollment = model<ICourseEnrollment>("CourseEnrollment", CourseEnrollmentSchema);
export default CourseEnrollment;
