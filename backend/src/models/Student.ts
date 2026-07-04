import mongoose, { Document, Schema, Model } from "mongoose";
import User from "./User";

export interface IStudent extends Document {
  parentUserId: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  schoolId?: string;
  grade?: string;
  rollNumber?: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  guardianRelation?: "father" | "mother" | "guardian" | "other";
  emergencyContact?: {
    name: string;
    phone: string;
    relation?: string;
  };
  medicalNotes?: string;
  avatar?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentModel extends Model<IStudent> {
  findByParentEmail(email: string): Promise<IStudent[]>;
}

const studentSchema = new Schema<IStudent>(
  {
    parentUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ["male", "female", "other"] },
    schoolId: { type: String, trim: true },
    grade: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: {
      line1: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    guardianRelation: { type: String, enum: ["father", "mother", "guardian", "other"] },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    medicalNotes: String,
    avatar: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

studentSchema.index({ parentUserId: 1, email: 1 }, { unique: true });
studentSchema.index({ schoolId: 1 }); // school dashboard lookups

studentSchema.statics.findByParentEmail = async function (email: string): Promise<IStudent[]> {
  const parent = await User.findOne({ email: email.toLowerCase().trim() }).select("_id");
  if (!parent) return [];
  return this.find({ parentUserId: parent._id, status: "active" });
};

const Student = mongoose.model<IStudent, IStudentModel>("Student", studentSchema);
export default Student;
