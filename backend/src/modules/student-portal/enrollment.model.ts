import mongoose, { Schema, model, Document } from "mongoose";

export enum EnrollmentType {
  EVENT = "event",
  COURSE = "course",
  CLASS = "class",
  BOOTCAMP = "bootcamp",
  WORKSHOP = "workshop",
}

export enum EnrollmentStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  WAITLISTED = "waitlisted",
}

export interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  type: EnrollmentType;
  referenceId: mongoose.Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  paymentStatus: "pending" | "paid" | "refunded" | "free";
  paymentId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  grade?: {
    score: number;
    maxScore: number;
    letterGrade: string;
    gradedAt: Date;
    gradedBy: mongoose.Types.ObjectId;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: Object.values(EnrollmentType), required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: Object.values(EnrollmentStatus), default: EnrollmentStatus.ACTIVE },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded", "free"], default: "pending" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    attendance: {
      total: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
    },
    grade: {
      score: Number,
      maxScore: Number,
      letterGrade: String,
      gradedAt: Date,
      gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    notes: String,
  },
  { timestamps: true },
);

EnrollmentSchema.index({ studentId: 1, status: 1 });
EnrollmentSchema.index({ studentId: 1, type: 1 });
EnrollmentSchema.index({ referenceId: 1, type: 1 });
EnrollmentSchema.index({ parentId: 1, status: 1 });

const Enrollment = model<IEnrollment>("Enrollment", EnrollmentSchema);
export default Enrollment;
