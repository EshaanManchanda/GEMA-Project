import mongoose, { Schema, model, Document } from "mongoose";

export enum LeaveType {
  SICK = "sick",
  ANNUAL = "annual",
  PERSONAL = "personal",
  MATERNITY = "maternity",
  PATERNITY = "paternity",
  UNPAID = "unpaid",
  OTHER = "other",
}

export enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export interface ILeaveRequest extends Document {
  schoolId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    type: { type: String, enum: Object.values(LeaveType), required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: Object.values(LeaveStatus), default: LeaveStatus.PENDING },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true },
);

LeaveRequestSchema.index({ schoolId: 1, staffId: 1, status: 1 });
LeaveRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });

const LeaveRequest = model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
export default LeaveRequest;
