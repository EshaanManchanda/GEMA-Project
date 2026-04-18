import mongoose, { Schema, model, Document } from "mongoose";

export interface IFinancialReport extends Document {
  schoolId: mongoose.Types.ObjectId;
  type: "monthly" | "quarterly" | "annual" | "custom";
  periodStart: Date;
  periodEnd: Date;
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    invoicesIssued: number;
    invoicesPaid: number;
    invoicesOverdue: number;
    revenueByType: Record<string, number>;
    revenueByMonth: Array<{ month: string; amount: number }>;
  };
  generatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FinancialReportSchema = new Schema<IFinancialReport>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    type: { type: String, enum: ["monthly", "quarterly", "annual", "custom"], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    data: {
      totalRevenue: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      netProfit: { type: Number, default: 0 },
      invoicesIssued: { type: Number, default: 0 },
      invoicesPaid: { type: Number, default: 0 },
      invoicesOverdue: { type: Number, default: 0 },
      revenueByType: { type: Schema.Types.Mixed, default: {} },
      revenueByMonth: [{ month: String, amount: Number }],
    },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

FinancialReportSchema.index({ schoolId: 1, type: 1, periodStart: -1 });

const FinancialReport = model<IFinancialReport>("FinancialReport", FinancialReportSchema);
export default FinancialReport;
