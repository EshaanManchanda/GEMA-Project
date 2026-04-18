import mongoose, { Schema, model, Document } from "mongoose";

export enum EnrollmentStatus {
  ACTIVE = "active",
  GRADUATED = "graduated",
  TRANSFERRED = "transferred",
  WITHDRAWN = "withdrawn",
  SUSPENDED = "suspended",
}

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  parentIds: mongoose.Types.ObjectId[];
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender?: "male" | "female" | "other";
  photo?: string;
  studentId: string;
  grade: string;
  section?: string;
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate: Date;
  graduationDate?: Date;
  medicalInfo?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    emergencyContact: { name: string; phone: string; relationship: string };
  };
  academicRecord?: Array<{
    academicYear: string;
    grade: string;
    section: string;
    gpa?: number;
    attendance: { present: number; absent: number; late: number };
    conduct: string;
  }>;
  stats: {
    totalEventsAttended: number;
    totalCertificatesEarned: number;
    totalCoursesCompleted: number;
    totalHoursLearned: number;
  };
  lmsProfile?: {
    currentCourses: mongoose.Types.ObjectId[];
    completedCourses: mongoose.Types.ObjectId[];
    totalCredits: number;
    gpa: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    parentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    photo: String,
    studentId: { type: String, required: true },
    grade: { type: String, required: true },
    section: String,
    enrollmentStatus: { type: String, enum: Object.values(EnrollmentStatus), default: EnrollmentStatus.ACTIVE },
    enrollmentDate: { type: Date, default: Date.now },
    graduationDate: Date,
    medicalInfo: {
      allergies: [String],
      conditions: [String],
      medications: [String],
      emergencyContact: { name: String, phone: String, relationship: String },
    },
    academicRecord: [
      {
        academicYear: String,
        grade: String,
        section: String,
        gpa: Number,
        attendance: { present: Number, absent: Number, late: Number },
        conduct: String,
      },
    ],
    stats: {
      totalEventsAttended: { type: Number, default: 0 },
      totalCertificatesEarned: { type: Number, default: 0 },
      totalCoursesCompleted: { type: Number, default: 0 },
      totalHoursLearned: { type: Number, default: 0 },
    },
    lmsProfile: {
      currentCourses: [{ type: Schema.Types.ObjectId }],
      completedCourses: [{ type: Schema.Types.ObjectId }],
      totalCredits: { type: Number, default: 0 },
      gpa: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

StudentSchema.index({ schoolId: 1, grade: 1 });
StudentSchema.index({ schoolId: 1, enrollmentStatus: 1 });
StudentSchema.index({ userId: 1 });
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ parentIds: 1 });

const Student = model<IStudent>("Student", StudentSchema);
export default Student;
