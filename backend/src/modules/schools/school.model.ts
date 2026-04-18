import mongoose, { Schema, model, Document } from "mongoose";

export enum SchoolType {
  PUBLIC = "public",
  PRIVATE = "private",
  CHARTER = "charter",
  INTERNATIONAL = "international",
  HOMESCHOOL = "homeschool",
  TRAINING_CENTER = "training_center",
}

export enum SchoolVerificationStatus {
  VERIFIED = "verified",
  PENDING = "pending",
  UNVERIFIED = "unverified",
  REJECTED = "rejected",
}

export interface ISchool extends Document {
  userId: mongoose.Types.ObjectId | null;
  schoolName: string;
  slug: string;
  schoolType: SchoolType;
  description?: string;
  logo?: string;
  coverImage?: string;
  email: string;
  phone: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  curriculum?: string[];
  gradeLevels?: string[];
  studentCount?: number;
  teacherCount?: number;
  academicYear?: { start: Date; end: Date };
  principalName?: string;
  adminContactPerson?: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  verificationStatus: SchoolVerificationStatus;
  verificationDocuments?: {
    license?: { url: string; uploadedAt: Date; status: string };
    accreditation?: { url: string; uploadedAt: Date; status: string };
  };
  subscription: {
    plan: "free" | "basic" | "premium" | "enterprise";
    status: "active" | "inactive" | "expired" | "trial";
    paidUntil?: Date;
    features: string[];
  };
  settings: {
    allowTeacherSelfRegistration: boolean;
    requireParentApprovalForBookings: boolean;
    autoGenerateCertificates: boolean;
    certificateTemplateId?: mongoose.Types.ObjectId;
    enableLMS: boolean;
    enableERP: boolean;
  };
  stats: {
    totalTeachers: number;
    totalStudents: number;
    totalEvents: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };
  isActive: boolean;
  isSuspended: boolean;
  memberSince: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    schoolName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true },
    description: { type: String, trim: true },
    logo: String,
    coverImage: String,
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    website: String,
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: { lat: Number, lng: Number },
    },
    curriculum: [String],
    gradeLevels: [String],
    studentCount: Number,
    teacherCount: Number,
    academicYear: { start: Date, end: Date },
    principalName: String,
    adminContactPerson: {
      name: String,
      position: String,
      email: String,
      phone: String,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(SchoolVerificationStatus),
      default: SchoolVerificationStatus.PENDING,
    },
    verificationDocuments: {
      license: { url: String, uploadedAt: Date, status: String },
      accreditation: { url: String, uploadedAt: Date, status: String },
    },
    subscription: {
      plan: { type: String, enum: ["free", "basic", "premium", "enterprise"], default: "free" },
      status: { type: String, enum: ["active", "inactive", "expired", "trial"], default: "trial" },
      paidUntil: Date,
      features: [String],
    },
    settings: {
      allowTeacherSelfRegistration: { type: Boolean, default: false },
      requireParentApprovalForBookings: { type: Boolean, default: true },
      autoGenerateCertificates: { type: Boolean, default: false },
      certificateTemplateId: { type: Schema.Types.ObjectId },
      enableLMS: { type: Boolean, default: false },
      enableERP: { type: Boolean, default: false },
    },
    stats: {
      totalTeachers: { type: Number, default: 0 },
      totalStudents: { type: Number, default: 0 },
      totalEvents: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    memberSince: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

SchoolSchema.index({ slug: 1 });
SchoolSchema.index({ schoolType: 1, verificationStatus: 1 });
SchoolSchema.index({ "address.city": 1, "address.country": 1 });
SchoolSchema.index({ isActive: 1, verificationStatus: 1 });

const School = model<ISchool>("School", SchoolSchema);
export default School;
