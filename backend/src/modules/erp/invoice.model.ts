import mongoose, { Schema, model, Document } from "mongoose";

export enum InvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum InvoiceType {
  TUITION = "tuition",
  EVENT = "event",
  TRANSPORT = "transport",
  UNIFORM = "uniform",
  OTHER = "other",
}

export interface IInvoice extends Document {
  schoolId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  type: InvoiceType;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    invoiceNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(InvoiceType), required: true },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.DRAFT },
    dueDate: { type: Date, required: true },
    paidAt: Date,
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
  },
  { timestamps: true },
);

InvoiceSchema.index({ schoolId: 1, status: 1 });
InvoiceSchema.index({ studentId: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

const Invoice = model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;
