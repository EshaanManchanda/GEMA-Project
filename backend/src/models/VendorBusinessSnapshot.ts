import mongoose, { Document, Schema } from "mongoose";
import { LEGACY_SNAPSHOT_SCHEMA_VERSION } from "../constants/businessHealth.rules";

/**
 * Frozen, monthly business-health snapshot for a vendor (KBOS Phase 1).
 *
 * Modelled on SearchConsoleHistory.ts — one durable record per
 * (vendor, calendar month) — because a monthly report must be
 * reproducible. PageView has a 90-day TTL and events/reviews mutate, so
 * re-rendering March's numbers in July would silently drift from the PDF
 * already sent to the vendor. This document IS the record; the live
 * business-health view (businessHealth.service.ts) recomputes freely and
 * is what gets frozen into a new snapshot on demand.
 *
 * `scores` stays a fixed, indexed object (not part of the flexible
 * `metrics[]` array) because MongoDB cannot serve the leaderboard sort
 * (`{'scores.overall': -1}`) or history queries from inside an array.
 * Everything else that doesn't need to be queried/sorted directly is a
 * flexible metric entry so new KPIs never require a migration.
 */

export type DimensionKey =
  | "listing"
  | "sales"
  | "marketing"
  | "customer"
  | "operations";

export type ConfidenceLevel = "high" | "medium" | "low";

export type SnapshotStatus = "draft" | "locked" | "archived";

export type RecommendationSeverity = "critical" | "high" | "medium" | "low";

export type MetricSource = "auto" | "manual";

export type TrendDirection = "up" | "down" | "flat";

/** Known metric keys — new keys may still be added without a schema change; see metrics[]. */
export type KnownMetricKey =
  | "totalRevenue"
  | "totalBookings"
  | "totalEvents"
  | "activeEvents"
  | "averageOrderValue"
  | "refundRate"
  | "viewToBookingRate"
  | "totalViews"
  | "averageRating"
  | "totalReviews"
  | "cancellationRate"
  | "checkInRate"
  | "listingPhotoCount"
  | "instagramReach"
  | "facebookReach"
  | "tiktokReach"
  | "youtubeReach"
  | "impressions";

// eslint-disable-next-line @typescript-eslint/ban-types
export type MetricKey = KnownMetricKey | (string & {});

export interface IVendorScores {
  overall: number | null;
  listing: number | null;
  sales: number | null;
  marketing: number | null;
  customer: number | null;
  operations: number | null;
}

export interface IConfidence {
  level: ConfidenceLevel;
  dimensionsScored: number;
  dimensionsTotal: number;
}

export interface IProfileCompletionItem {
  key: string;
  label: string;
  done: boolean;
}

export interface IProfileCompletion {
  percent: number;
  items: IProfileCompletionItem[];
}

export interface IMetricEntry {
  key: MetricKey;
  label: string;
  value: number | null;
  unit?: string;
  source: MetricSource;
  previousValue?: number;
  changePercent?: number;
  direction?: TrendDirection;
}

export interface IRecommendation {
  code: string;
  title: string;
  severity: RecommendationSeverity;
  currentValue: string;
  targetValue: string;
  reason: string;
  estimatedImpact: "high" | "medium" | "low";
  documentationUrl?: string;
}

export interface ITask {
  code: string;
  label: string;
  done: boolean;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
}

export interface ISnapshotNotes {
  vendorVisible?: string;
  internal?: string;
}

export interface IAuditTrailEntry {
  action:
    | "created"
    | "regenerated"
    | "edited"
    | "locked"
    | "reopened"
    | "archived"
    | "downloaded";
  actorId: mongoose.Types.ObjectId;
  at: Date;
  detail?: string;
}

/** Per-event performance leaderboard for the period — top N by revenue, frozen with the rest of the snapshot. */
export interface ITopEventEntry {
  eventId: mongoose.Types.ObjectId;
  title: string;
  coverImage?: string;
  revenue: number;
  orders: number;
  tickets: number;
  viewsAllTime: number;
  averageRating?: number;
}

/**
 * Platform-wide comparative statistics frozen at generation time (KBOS
 * item 007) — auditability/regeneration-determinism, not live data. A
 * missing field means no benchmark was available at generation, never a
 * fabricated 0. See computeVendorHealth's doc-block for why this can
 * legitimately disagree with the live GET /health value.
 */
export interface ISnapshotBenchmarks {
  averageListingPhotoCount?: number;
  capturedAt: Date;
}

export type IntegrityAlgorithm = "hmac-sha256";

/**
 * Tamper-evidence checksum over the immutable content of a snapshot (KBOS
 * item 005) — see snapshotIntegrity.service.ts for what's hashed and why.
 * Absent on legacy docs; absence means "never hashed", not "tampered with"
 * — see verifySnapshotHash's "unhashed" status.
 */
export interface ISnapshotIntegrity {
  algorithm: IntegrityAlgorithm;
  contentHash: string;
  /** schemaVersion at the moment this hash was computed — the sealed field set is schemaVersion-specific. */
  contentVersion: number;
  hashedAt: Date;
  /** Which secret produced this hash — lets a future secret rotation keep old hashes verifiable. */
  keyId: string;
}

/** Period-over-period movement for each score, mirroring IMetricEntry's trend fields but keyed by dimension. */
export interface IScoreTrend {
  previousValue?: number;
  changePercent?: number;
  direction?: TrendDirection;
}

export type IScoreTrends = Partial<
  Record<"overall" | DimensionKey, IScoreTrend>
>;

export interface IVendorBusinessSnapshot extends Document {
  vendorId: mongoose.Types.ObjectId;
  period: string; // "YYYY-MM"
  periodStart: Date;
  periodEnd: Date;

  scores: IVendorScores;
  scoreTrends: IScoreTrends;
  profileCompletion: IProfileCompletion;
  confidence: IConfidence;

  metrics: IMetricEntry[];
  topEvents: ITopEventEntry[];
  recommendations: IRecommendation[];
  tasks: ITask[];

  notes: ISnapshotNotes;
  status: SnapshotStatus;
  rulesetVersion: string;
  reportVersion: string;
  /** Shape of this stored document. No default — absent means legacy (pre-schemaVersion). See snapshotSchemaVersion(). */
  schemaVersion?: number;
  /** Platform benchmarks as they stood at generation time. Absent on legacy docs. */
  benchmarks?: ISnapshotBenchmarks;
  /** Tamper-evidence checksum. Absent on legacy docs — see ISnapshotIntegrity. */
  integrity?: ISnapshotIntegrity;
  auditTrail: IAuditTrailEntry[];

  generatedAt: Date;
  generatedBy: "manual" | "scheduled";
  generatedByUserId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const MetricEntrySchema = new Schema<IMetricEntry>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, default: null },
    unit: String,
    source: { type: String, enum: ["auto", "manual"], required: true },
    previousValue: Number,
    changePercent: Number,
    direction: { type: String, enum: ["up", "down", "flat"] },
  },
  { _id: false },
);

const RecommendationSchema = new Schema<IRecommendation>(
  {
    code: { type: String, required: true },
    title: { type: String, required: true },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    currentValue: { type: String, required: true },
    targetValue: { type: String, required: true },
    reason: { type: String, required: true },
    estimatedImpact: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
    },
    documentationUrl: String,
  },
  { _id: false },
);

const TaskSchema = new Schema<ITask>(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    done: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const TopEventEntrySchema = new Schema<ITopEventEntry>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    title: { type: String, required: true },
    coverImage: String,
    revenue: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    tickets: { type: Number, default: 0 },
    viewsAllTime: { type: Number, default: 0 },
    averageRating: Number,
  },
  { _id: false },
);

const ScoreTrendSchema = new Schema<IScoreTrend>(
  {
    previousValue: Number,
    changePercent: Number,
    direction: { type: String, enum: ["up", "down", "flat"] },
  },
  { _id: false },
);

const AuditTrailEntrySchema = new Schema<IAuditTrailEntry>(
  {
    action: {
      type: String,
      enum: [
        "created",
        "regenerated",
        "edited",
        "locked",
        "reopened",
        "archived",
        "downloaded",
      ],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true, default: Date.now },
    detail: String,
  },
  { _id: false },
);

const VendorBusinessSnapshotSchema = new Schema<IVendorBusinessSnapshot>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    period: { type: String, required: true }, // "YYYY-MM"
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    scores: {
      overall: { type: Number, default: null },
      listing: { type: Number, default: null },
      sales: { type: Number, default: null },
      marketing: { type: Number, default: null },
      customer: { type: Number, default: null },
      operations: { type: Number, default: null },
    },
    scoreTrends: {
      overall: ScoreTrendSchema,
      listing: ScoreTrendSchema,
      sales: ScoreTrendSchema,
      marketing: ScoreTrendSchema,
      customer: ScoreTrendSchema,
      operations: ScoreTrendSchema,
    },
    profileCompletion: {
      percent: { type: Number, default: 0 },
      items: [
        {
          key: { type: String, required: true },
          label: { type: String, required: true },
          done: { type: Boolean, required: true },
          _id: false,
        },
      ],
    },
    confidence: {
      level: { type: String, enum: ["high", "medium", "low"], required: true },
      dimensionsScored: { type: Number, required: true },
      dimensionsTotal: { type: Number, required: true },
    },

    metrics: [MetricEntrySchema],
    topEvents: [TopEventEntrySchema],
    recommendations: [RecommendationSchema],
    tasks: [TaskSchema],

    notes: {
      vendorVisible: { type: String, trim: true, maxlength: 4000 },
      internal: { type: String, trim: true, maxlength: 4000 },
    },
    status: {
      type: String,
      enum: ["draft", "locked", "archived"],
      default: "draft",
    },
    rulesetVersion: { type: String, required: true },
    reportVersion: { type: String, required: true },
    schemaVersion: { type: Number },
    benchmarks: {
      averageListingPhotoCount: Number,
      capturedAt: Date,
      _id: false,
    },
    integrity: {
      algorithm: { type: String, enum: ["hmac-sha256"] },
      contentHash: String,
      contentVersion: Number,
      hashedAt: Date,
      keyId: String,
      _id: false,
    },
    auditTrail: [AuditTrailEntrySchema],

    generatedAt: { type: Date, required: true, default: Date.now },
    generatedBy: {
      type: String,
      enum: ["manual", "scheduled"],
      required: true,
    },
    generatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// One durable record per (vendor, calendar month)
VendorBusinessSnapshotSchema.index(
  { vendorId: 1, period: 1 },
  { unique: true },
);
// Admin leaderboard sort
VendorBusinessSnapshotSchema.index({ "scores.overall": -1 });
// Score-history timeline per vendor
VendorBusinessSnapshotSchema.index({ vendorId: 1, periodStart: 1 });

const VendorBusinessSnapshot = mongoose.model<IVendorBusinessSnapshot>(
  "VendorBusinessSnapshot",
  VendorBusinessSnapshotSchema,
);

export default VendorBusinessSnapshot;

/** Type-safe lookup of a metric entry by key (see MetricKey for known keys). */
export function getMetric(
  snapshot: Pick<IVendorBusinessSnapshot, "metrics">,
  key: MetricKey,
): IMetricEntry | undefined {
  return snapshot.metrics.find((m) => m.key === key);
}

/** Resolves a doc's schema version, inferring LEGACY_SNAPSHOT_SCHEMA_VERSION for pre-schemaVersion docs. Never fabricated — absence means legacy, not "current". */
export function snapshotSchemaVersion(
  doc: Pick<IVendorBusinessSnapshot, "schemaVersion">,
): number {
  return doc.schemaVersion ?? LEGACY_SNAPSHOT_SCHEMA_VERSION;
}
