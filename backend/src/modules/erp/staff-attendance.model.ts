import mongoose, { Schema, model, Document } from "mongoose";

export interface IStaffAttendance extends Document {
  schoolId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  date: Date;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  checkIn?: Date;
  checkOut?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["present", "absent", "late", "half_day", "leave"], default: "present" },
    checkIn: Date,
    checkOut: Date,
    notes: String,
  },
  { timestamps: true },
);

StaffAttendanceSchema.index({ schoolId: 1, staffId: 1, date: 1 }, { unique: true });
StaffAttendanceSchema.index({ schoolId: 1, date: -1 });

const StaffAttendance = model<IStaffAttendance>("StaffAttendance", StaffAttendanceSchema);
export default StaffAttendance;
