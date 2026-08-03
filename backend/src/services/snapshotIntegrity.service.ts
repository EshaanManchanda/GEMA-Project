/**
 * Snapshot integrity checksum (KBOS item 005) — pure, DB-free, same
 * single-responsibility reasoning as promotionInputQuality.service.ts:
 * this is a cross-cutting concern (tamper-evidence), not scoring, so it
 * doesn't belong in businessHealth.service.ts.
 *
 * HMAC-SHA256 rather than plain SHA-256 (per explicit product decision):
 * a bare hash lets anyone with DB write access edit content and recompute
 * a matching hash in the same operation, so it proves nothing. Keying on a
 * server secret (never sent to the client, never derivable from the
 * document) makes "the hash matches" mean something.
 *
 * The hash is written exactly once, at generation (see generateSnapshot in
 * businessReport.service.ts) and never recomputed after. Only fields that
 * can never legitimately change post-generation are sealed — see
 * buildSealedContent's doc-block for the exact field list and why each
 * exclusion is safe.
 */

import { createHmac } from "crypto";
import mongoose from "mongoose";
import {
  IVendorScores,
  IScoreTrends,
  IProfileCompletion,
  IConfidence,
  IMetricEntry,
  ITopEventEntry,
  IRecommendation,
  ISnapshotBenchmarks,
  ITask,
  ISnapshotIntegrity,
  IVendorBusinessSnapshot,
  snapshotSchemaVersion,
} from "../models/VendorBusinessSnapshot";

// ─── Sealed content ─────────────────────────────────────────────────────────

/**
 * The exact set of fields hashed. Everything else on a snapshot document —
 * `notes` (both fields), `status`, `auditTrail`, `tasks[].done` /
 * `completedAt` / `completedBy`, Mongoose bookkeeping (`_id`, `__v`,
 * `createdAt`, `updatedAt`), and `integrity` itself — is a legitimate
 * post-generation workflow mutation and is deliberately excluded. If any
 * code path could legitimately recompute the hash after generation, "the
 * hash matches" would stop meaning anything.
 */
export interface SealedContentSource {
  vendorId: mongoose.Types.ObjectId | string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  scores: IVendorScores;
  scoreTrends?: IScoreTrends;
  profileCompletion: IProfileCompletion;
  confidence: IConfidence;
  metrics: IMetricEntry[];
  topEvents?: ITopEventEntry[];
  recommendations: IRecommendation[];
  benchmarks?: ISnapshotBenchmarks;
  rulesetVersion: string;
  reportVersion: string;
  /** Resolved schemaVersion (see snapshotSchemaVersion) — the sealed field set is specific to this shape. */
  schemaVersion: number;
  generatedAt: Date;
  generatedBy: string;
  generatedByUserId?: mongoose.Types.ObjectId | string;
  /** Only `.code`/`.label` are sealed — `.done`/`.completedAt`/`.completedBy` are workflow state, not content. */
  tasks: Array<Pick<ITask, "code" | "label">>;
}

export type SealedContent = Record<string, unknown>;

/** Explicit field-by-field projection — never JSON.stringify a Mongoose doc directly (BSON/schema key order isn't deterministic). */
export function buildSealedContent(source: SealedContentSource): SealedContent {
  return {
    vendorId: source.vendorId,
    period: source.period,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    scores: source.scores,
    scoreTrends: source.scoreTrends ?? {},
    profileCompletion: source.profileCompletion,
    confidence: source.confidence,
    metrics: source.metrics,
    topEvents: source.topEvents ?? [],
    recommendations: source.recommendations,
    benchmarks: source.benchmarks,
    rulesetVersion: source.rulesetVersion,
    reportVersion: source.reportVersion,
    schemaVersion: source.schemaVersion,
    generatedAt: source.generatedAt,
    generatedBy: source.generatedBy,
    generatedByUserId: source.generatedByUserId,
    tasks: source.tasks.map((t) => ({ code: t.code, label: t.label })),
  };
}

// ─── Canonicalization ───────────────────────────────────────────────────────

function isObjectId(value: unknown): value is mongoose.Types.ObjectId {
  return value instanceof mongoose.Types.ObjectId;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !isObjectId(value)
  );
}

/**
 * Mongoose subdocuments (each element of a metrics/topEvents/recommendations
 * DocumentArray, or a nested subdoc like `scores`) carry internal
 * bookkeeping (`$__`, a `$parent` back-reference to the root document, …)
 * as enumerable own properties. Recursing into one with a plain
 * `Object.keys` walk follows that back-reference straight into a cycle —
 * `.toObject()` strips all of that and returns a clean plain object.
 */
function hasToObject(value: unknown): value is { toObject: () => unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toObject?: unknown }).toObject === "function"
  );
}

/**
 * Deterministic string form of a value for hashing. The three landmines
 * this specifically avoids:
 *  - Key order (schema order vs BSON order vs literal order all differ) —
 *    object keys are recursively sorted.
 *  - `undefined` vs `null` (Mongoose optionals, `metric()`'s `unit:
 *    undefined`, conditionally-assigned `scoreTrends` keys) — `undefined`
 *    keys are dropped entirely, `null` is preserved, so the two never
 *    collide.
 *  - Dates vs their ISO strings hashing differently — Dates are always
 *    rendered via `.toISOString()`.
 * Arrays are never sorted — `recommendations` (severity-sorted), `topEvents`
 * (revenue-sorted), and `metrics` (literal order) all carry meaning in
 * their order.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "null"; // only reachable from an array slot; object keys are filtered before recursing
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (isObjectId(value)) return JSON.stringify(value.toString());
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  }
  if (hasToObject(value)) {
    return canonicalize(value.toObject());
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// ─── Hashing ─────────────────────────────────────────────────────────────

export function computeSnapshotHash(
  sealed: SealedContent,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(canonicalize(sealed))
    .digest("hex");
}

// ─── Verification ───────────────────────────────────────────────────────────

export type IntegrityStatus = "verified" | "mismatch" | "unhashed";

export interface VerifyResult {
  status: IntegrityStatus;
  expected?: string;
  actual?: string;
}

/**
 * Not run inside toReportPayload (keeps that function sync/pure/easy to
 * unit-test with hand-built fixtures) — call this at the two read points
 * that matter: the report-download route and getSnapshot. A legacy
 * snapshot with no `integrity` block returns `"unhashed"`, never
 * `"mismatch"` — absence of a hash is not evidence of tampering.
 */
export function verifySnapshotHash(
  doc: SealedContentSource & { integrity?: ISnapshotIntegrity },
  secret: string,
): VerifyResult {
  // Checking `contentHash` specifically (not just truthiness of
  // `doc.integrity`) matters because Mongoose auto-initializes an unset
  // nested-object schema path to `{}` in-process — `minimize` only hides
  // that from JSON output, so `!doc.integrity` alone never catches a
  // genuinely-never-hashed document coming from a real query.
  if (!doc.integrity?.contentHash) return { status: "unhashed" };

  const sealed = buildSealedContent(doc);
  const actual = computeSnapshotHash(sealed, secret);
  const expected = doc.integrity.contentHash;

  return {
    status: actual === expected ? "verified" : "mismatch",
    expected,
    actual,
  };
}

/**
 * Convenience wrapper for the two real call sites (report-download route,
 * getSnapshot) — projects an actual persisted document into
 * SealedContentSource, resolving `schemaVersion` the same way
 * `toReportPayload` does (via `snapshotSchemaVersion`) so a legacy-shaped
 * doc's absent field doesn't need special-casing at every caller.
 */
export function verifySnapshot(
  doc: IVendorBusinessSnapshot,
  secret: string,
): VerifyResult {
  return verifySnapshotHash(
    {
      vendorId: doc.vendorId,
      period: doc.period,
      periodStart: doc.periodStart,
      periodEnd: doc.periodEnd,
      scores: doc.scores,
      scoreTrends: doc.scoreTrends,
      profileCompletion: doc.profileCompletion,
      confidence: doc.confidence,
      metrics: doc.metrics,
      topEvents: doc.topEvents,
      recommendations: doc.recommendations,
      benchmarks: doc.benchmarks,
      rulesetVersion: doc.rulesetVersion,
      reportVersion: doc.reportVersion,
      schemaVersion: snapshotSchemaVersion(doc),
      generatedAt: doc.generatedAt,
      generatedBy: doc.generatedBy,
      generatedByUserId: doc.generatedByUserId,
      tasks: doc.tasks,
      integrity: doc.integrity,
    },
    secret,
  );
}
