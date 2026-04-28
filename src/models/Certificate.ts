import mongoose, { Document, Schema } from "mongoose";

// ─── Template ────────────────────────────────────────────────────────────────

export interface ITemplateAsset {
  type: "image" | "font";
  name?: string;
  url: string;
}

export interface ITemplateFont {
  name: string;
  url: string;
  weight?: string;
}

export interface ITemplateField {
  key: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  color?: string;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  type?: "text" | "qr" | "image";
}

export interface ITemplate extends Document {
  name: string;
  slug: string;
  description?: string;
  mode: "html" | "visual";
  html?: string;
  css?: string;
  backgroundImageUrl?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  fields?: ITemplateField[];
  assets?: ITemplateAsset[];
  fonts?: ITemplateFont[];
  defaultOptions?: {
    pageSize?: string;
    orientation?: "portrait" | "landscape";
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
  };
  version: number;
  active: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String,
    mode: { type: String, enum: ["html", "visual"], default: "html" },
    html: String,
    css: String,
    backgroundImageUrl: String,
    canvasWidth: Number,
    canvasHeight: Number,
    fields: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: Number,
        fontSize: Number,
        fontWeight: { type: String, enum: ["normal", "bold"] },
        color: String,
        fontFamily: String,
        textAlign: { type: String, enum: ["left", "center", "right"] },
        type: { type: String, enum: ["text", "qr", "image"], default: "text" },
      },
    ],
    assets: [{ type: { type: String, enum: ["image", "font"] }, name: String, url: String }],
    fonts: [{ name: String, url: String, weight: String }],
    defaultOptions: {
      pageSize: { type: String, default: "A4" },
      orientation: { type: String, enum: ["portrait", "landscape"], default: "landscape" },
      margins: { top: Number, right: Number, bottom: Number, left: Number },
    },
    version: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Template = mongoose.model<ITemplate>("CertTemplate", templateSchema);

// ─── TemplateVersion ──────────────────────────────────────────────────────────

export interface ITemplateVersion extends Document {
  templateId: mongoose.Types.ObjectId;
  html: string;
  css?: string;
  version: number;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const templateVersionSchema = new Schema<ITemplateVersion>(
  {
    templateId: { type: Schema.Types.ObjectId, ref: "CertTemplate", required: true, index: true },
    html: { type: String, required: true },
    css: String,
    version: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const TemplateVersion = mongoose.model<ITemplateVersion>("CertTemplateVersion", templateVersionSchema);

// ─── SerialCounter ────────────────────────────────────────────────────────────

export interface ISerialCounter extends Document {
  key: string;
  next: number;
  prefix?: string;
  format?: string;
  updatedAt: Date;
}

const serialCounterSchema = new Schema<ISerialCounter>(
  {
    key: { type: String, required: true, unique: true },
    next: { type: Number, default: 1 },
    prefix: { type: String, default: "CERT" },
    format: { type: String, default: "YYYY-{{seq}}" },
  },
  { timestamps: true },
);

export const SerialCounter = mongoose.model<ISerialCounter>("SerialCounter", serialCounterSchema);

// ─── Certificate ─────────────────────────────────────────────────────────────

export type CertificateStatus = "pending" | "generating" | "generated" | "emailed" | "failed" | "revoked";

export interface ICertificateHistory {
  event: string;
  actor?: mongoose.Types.ObjectId;
  at: Date;
  meta?: Record<string, any>;
}

export interface ICertificate extends Document {
  serialNumber: string;
  templateId?: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reviewId?: mongoose.Types.ObjectId;
  recipient: { name: string; email: string; meta?: Record<string, any> };
  context?: { courseId?: string; studentId?: string; customRef?: string };
  data: Record<string, any>;
  status: CertificateStatus;
  pdfUrl?: string;
  pdfStoragePath?: string;
  previewImageUrl?: string;
  qrData?: string;
  qrCodeUrl?: string;
  issuedBy?: mongoose.Types.ObjectId;
  issuedAt?: Date;
  failureReason?: string;
  history: ICertificateHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    serialNumber: { type: String, unique: true, sparse: true },
    templateId: { type: Schema.Types.ObjectId, ref: "CertTemplate" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review" },
    recipient: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      meta: { type: Schema.Types.Mixed },
    },
    context: {
      courseId: String,
      studentId: String,
      customRef: String,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "generating", "generated", "emailed", "failed", "revoked"],
      default: "pending",
    },
    pdfUrl: String,
    pdfStoragePath: String,
    previewImageUrl: String,
    qrData: String,
    qrCodeUrl: String,
    issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
    issuedAt: Date,
    failureReason: String,
    history: [
      {
        event: { type: String, required: true },
        actor: { type: Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        meta: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true },
);

certificateSchema.index({ eventId: 1 });
certificateSchema.index({ userId: 1 });
certificateSchema.index({ reviewId: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ "recipient.email": 1 });
certificateSchema.index({ serialNumber: 1 });
certificateSchema.index({ issuedAt: -1 });

const Certificate = mongoose.model<ICertificate>("Certificate", certificateSchema);
export default Certificate;

// ─── CertificateRequest ───────────────────────────────────────────────────────

export type CertRequestStatus = "queued" | "in_progress" | "completed" | "failed";
export type CertRequestType = "single" | "bulk";

export interface ICertificateRequest extends Document {
  type: CertRequestType;
  templateId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  inputs: Array<{
    recipientName: string;
    recipientEmail: string;
    userId?: string;
    data?: Record<string, any>;
  }>;
  options: {
    sendEmail?: boolean;
    skipStorage?: boolean;
  };
  status: CertRequestStatus;
  progress: { total: number; processed: number; failed: number };
  jobId?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const certRequestSchema = new Schema<ICertificateRequest>(
  {
    type: { type: String, enum: ["single", "bulk"], required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "CertTemplate", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    inputs: [
      {
        recipientName: { type: String, required: true },
        recipientEmail: { type: String, required: true },
        userId: String,
        data: { type: Schema.Types.Mixed },
      },
    ],
    options: {
      sendEmail: { type: Boolean, default: false },
      skipStorage: { type: Boolean, default: false },
    },
    status: { type: String, enum: ["queued", "in_progress", "completed", "failed"], default: "queued" },
    progress: {
      total: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    jobId: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

certRequestSchema.index({ eventId: 1 });
certRequestSchema.index({ status: 1 });
certRequestSchema.index({ createdBy: 1 });

export const CertificateRequest = mongoose.model<ICertificateRequest>("CertificateRequest", certRequestSchema);

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface IAuditLog extends Document {
  action: string;
  entityType: string;
  entityId: string;
  actor?: mongoose.Types.ObjectId;
  meta?: Record<string, any>;
  at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    meta: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export const AuditLog = mongoose.model<IAuditLog>("CertAuditLog", auditLogSchema);
