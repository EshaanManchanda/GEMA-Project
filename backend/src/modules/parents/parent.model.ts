import mongoose, { Schema, model, Document } from "mongoose";

export interface IParent extends Document {
  userId: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  firstName: string;
  lastName: string;
  phone: string;
  photo?: string;
  relationshipToStudents: Array<{
    studentId: mongoose.Types.ObjectId;
    relationship: "father" | "mother" | "guardian" | "other";
    isPrimary: boolean;
    hasBookingPermission: boolean;
    hasViewAccess: boolean;
  }>;
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      bookingConfirmation: boolean;
      eventReminders: boolean;
      certificateReady: boolean;
      attendanceAlerts: boolean;
      gradeReports: boolean;
    };
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  stats: {
    totalBookings: number;
    totalSpent: number;
    childrenEnrolled: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    photo: String,
    relationshipToStudents: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
        relationship: { type: String, enum: ["father", "mother", "guardian", "other"], default: "guardian" },
        isPrimary: { type: Boolean, default: false },
        hasBookingPermission: { type: Boolean, default: true },
        hasViewAccess: { type: Boolean, default: true },
      },
    ],
    preferences: {
      language: { type: String, default: "en" },
      currency: { type: String, default: "AED" },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        bookingConfirmation: { type: Boolean, default: true },
        eventReminders: { type: Boolean, default: true },
        certificateReady: { type: Boolean, default: true },
        attendanceAlerts: { type: Boolean, default: true },
        gradeReports: { type: Boolean, default: true },
      },
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    stats: {
      totalBookings: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      childrenEnrolled: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ParentSchema.index({ userId: 1 });
ParentSchema.index({ studentIds: 1 });

const Parent = model<IParent>("Parent", ParentSchema);
export default Parent;
