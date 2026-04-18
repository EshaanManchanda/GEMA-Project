import mongoose, { Schema, model, Document } from "mongoose";

export enum PayrollStatus {
  DRAFT = "draft",
  PENDING = "pending",
  APPROVED = "approved",
  PAID = "paid",
  FAILED = "failed",
}

export interface IPayrollRun extends Document {
  schoolId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  status: PayrollStatus;
  totalAmount: number;
  staffCount: number;
  entries: Array<{
    staffId: mongoose.Types.ObjectId;
    baseSalary: number;
    deductions: number;
    bonuses: number;
    netPay: number;
    paid: boolean;
    paidAt?: Date;
  }>;
  processedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: { type: String, enum: Object.values(PayrollStatus), default: PayrollStatus.DRAFT },
    totalAmount: { type: Number, default: 0 },
    staffCount: { type: Number, default: 0 },
    entries: [
      {
        staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        baseSalary: { type: Number, required: true },
        deductions: { type: Number, default: 0 },
        bonuses: { type: Number, default: 0 },
        netPay: { type: Number, required: true },
        paid: { type: Boolean, default: false },
        paidAt: Date,
      },
    ],
    processedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
  },
  { timestamps: true },
);

PayrollRunSchema.index({ schoolId: 1, status: 1, periodStart: -1 });

const PayrollRun = model<IPayrollRun>("PayrollRun", PayrollRunSchema);
export default PayrollRun;
