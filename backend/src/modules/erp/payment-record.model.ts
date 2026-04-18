import mongoose, { Schema, model, Document } from "mongoose";

export interface IPaymentRecord extends Document {
  invoiceId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: "cash" | "card" | "bank_transfer" | "online" | "cheque";
  transactionId?: string;
  paidBy: mongoose.Types.ObjectId;
  paidAt: Date;
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "card", "bank_transfer", "online", "cheque"], required: true },
    transactionId: String,
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paidAt: { type: Date, default: Date.now },
    notes: String,
    receiptUrl: String,
  },
  { timestamps: true },
);

PaymentRecordSchema.index({ invoiceId: 1 });
PaymentRecordSchema.index({ schoolId: 1, paidAt: -1 });
PaymentRecordSchema.index({ studentId: 1 });

const PaymentRecord = model<IPaymentRecord>("PaymentRecord", PaymentRecordSchema);
export default PaymentRecord;
