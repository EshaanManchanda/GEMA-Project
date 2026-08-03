import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Per-operation observability record for the Business Report system (KBOS
 * hardening, item 002) — generation duration, PDF render time, cache hits,
 * and failures. Modelled on AuditLog.ts (90-day TTL, `{timestamps:
 * {createdAt:true, updatedAt:false}}`) and CommunicationLog.ts (status enum
 * + errorCode/errorMessage).
 *
 * Write path only goes through reportObservability.service.ts's
 * logReportGeneration(), which swallows and logs write failures — this
 * collection must never be able to fail the operation it's observing.
 *
 * Volume is naturally bounded: the PDF/CSV download route is already
 * rate-limited (10 requests / 10 min per client — see
 * businessReportPdfLimiter in analytics.routes.ts), and the monthly worker
 * writes one WORKER_BATCH row per run (not one row per vendor — per-vendor
 * outcomes are already covered by the SNAPSHOT_GENERATE rows that
 * generateSnapshot writes for each vendor it processes).
 */

export enum ReportGenerationOperation {
  SNAPSHOT_GENERATE = "snapshot_generate",
  PDF_RENDER = "pdf_render",
  CSV_RENDER = "csv_render",
  WORKER_BATCH = "worker_batch",
}

export enum ReportGenerationStatus {
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  SKIPPED_LOCKED = "skipped_locked",
  CACHE_HIT = "cache_hit",
}

export enum ReportGenerationTrigger {
  VENDOR_REQUEST = "vendor_request",
  ADMIN_REQUEST = "admin_request",
  SCHEDULED = "scheduled",
  BULK = "bulk",
}

export interface IReportGenerationBatch {
  total: number;
  generated: number;
  skippedLocked: number;
  failed: number;
}

export interface IReportGenerationLog extends Document {
  operation: ReportGenerationOperation;
  status: ReportGenerationStatus;
  trigger: ReportGenerationTrigger;

  vendorId?: Types.ObjectId;
  period?: string; // "YYYY-MM"
  snapshotId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  reportType?: "health" | "promotion";
  format?: "pdf" | "csv";

  durationMs: number;
  computeMs?: number;
  renderMs?: number;
  cacheHit?: boolean;
  pdfBytes?: number;

  rulesetVersion?: string;
  schemaVersion?: number;
  templateVersion?: string;

  jobId?: string;
  batch?: IReportGenerationBatch;

  errorCode?: string;
  errorMessage?: string;

  createdAt: Date;
}

const ReportGenerationBatchSchema = new Schema<IReportGenerationBatch>(
  {
    total: { type: Number, required: true },
    generated: { type: Number, required: true },
    skippedLocked: { type: Number, required: true },
    failed: { type: Number, required: true },
  },
  { _id: false },
);

const ReportGenerationLogSchema = new Schema<IReportGenerationLog>(
  {
    operation: {
      type: String,
      required: true,
      enum: Object.values(ReportGenerationOperation),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ReportGenerationStatus),
    },
    trigger: {
      type: String,
      required: true,
      enum: Object.values(ReportGenerationTrigger),
    },

    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    period: String,
    snapshotId: { type: Schema.Types.ObjectId, ref: "VendorBusinessSnapshot" },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    reportType: { type: String, enum: ["health", "promotion"] },
    format: { type: String, enum: ["pdf", "csv"] },

    durationMs: { type: Number, required: true },
    computeMs: Number,
    renderMs: Number,
    cacheHit: Boolean,
    pdfBytes: Number,

    rulesetVersion: String,
    schemaVersion: Number,
    templateVersion: String,

    jobId: String,
    batch: ReportGenerationBatchSchema,

    errorCode: String,
    errorMessage: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Failure triage — "what's been failing this week"
ReportGenerationLogSchema.index({ operation: 1, status: 1, createdAt: -1 });
// Per-vendor debugging — "why did vendor X's report fail / why is it slow"
ReportGenerationLogSchema.index({ vendorId: 1, createdAt: -1 });
// 90-day TTL, matching AuditLog.ts
ReportGenerationLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 3600 },
);

const ReportGenerationLog = mongoose.model<IReportGenerationLog>(
  "ReportGenerationLog",
  ReportGenerationLogSchema,
);

export default ReportGenerationLog;
