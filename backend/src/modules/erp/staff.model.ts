import mongoose, { Schema, model, Document } from "mongoose";

export interface IStaff extends Document {
  schoolId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department?: string;
  position: string;
  hireDate: Date;
  terminationDate?: Date;
  salary: number;
  currency: string;
  isActive: boolean;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    employeeId: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    department: String,
    position: { type: String, required: true },
    hireDate: { type: Date, required: true },
    terminationDate: Date,
    salary: { type: Number, default: 0 },
    currency: { type: String, default: "AED" },
    isActive: { type: Boolean, default: true },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
  },
  { timestamps: true },
);

StaffSchema.index({ schoolId: 1, isActive: 1 });
StaffSchema.index({ employeeId: 1 });
StaffSchema.index({ email: 1 });

const Staff = model<IStaff>("Staff", StaffSchema);
export default Staff;
