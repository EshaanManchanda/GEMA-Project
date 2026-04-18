import { Schema, model, Document, Types } from "mongoose";

export interface IEmployee extends Document {
  vendorId?: Types.ObjectId;
  schoolId?: Types.ObjectId;
  userId: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "manager" | "scanner" | "coordinator" | "security" | "admin" | "teacher_assistant" | "librarian" | "counselor";
  permissions: Array<{
    action: string;
    scope: "all" | "assigned";
  }>;
  assignedEvents: Types.ObjectId[];
  assignedVenues: Types.ObjectId[];
  status: "active" | "inactive" | "suspended";
  shiftSchedule?: Array<{
    eventId: Types.ObjectId;
    date: Date;
    startTime: string;
    endTime: string;
    position: string;
    isActive: boolean;
  }>;
  deviceAccess?: Array<{
    deviceId: string;
    deviceName?: string;
    lastAccess?: Date;
    isAuthorized: boolean;
  }>;
  scanHistory?: Array<{
    ticketId: Types.ObjectId;
    scannedAt: Date;
    eventId: Types.ObjectId;
    location: string;
    result: "success" | "invalid" | "duplicate" | "expired";
  }>;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    employeeId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ["manager", "scanner", "coordinator", "security", "admin", "teacher_assistant", "librarian", "counselor"],
      required: true,
    },
    permissions: [
      {
        action: { type: String, required: true },
        scope: { type: String, enum: ["all", "assigned"], required: true },
      },
    ],
    assignedEvents: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    assignedVenues: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    shiftSchedule: [
      {
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        position: { type: String, required: true },
        isActive: { type: Boolean, default: true },
      },
    ],
    deviceAccess: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String },
        lastAccess: { type: Date },
        isAuthorized: { type: Boolean, default: false },
      },
    ],
    scanHistory: [
      {
        ticketId: {
          type: Schema.Types.ObjectId,
          ref: "Ticket",
          required: true,
        },
        scannedAt: { type: Date, default: Date.now },
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
        location: { type: String },
        result: {
          type: String,
          enum: ["success", "invalid", "duplicate", "expired"],
          required: true,
        },
      },
    ],
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },
    hiredAt: { type: Date },
  },
  { timestamps: true },
);

EmployeeSchema.index({ vendorId: 1 });
EmployeeSchema.index({ role: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ assignedEvents: 1 });
EmployeeSchema.index({ vendorId: 1, status: 1 });
EmployeeSchema.index({ vendorId: 1, role: 1 });
EmployeeSchema.index({ vendorId: 1, createdAt: -1 });
EmployeeSchema.index({ vendorId: 1, email: 1 });
EmployeeSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  employeeId: "text",
});

const Employee = model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
