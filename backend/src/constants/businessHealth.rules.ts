/**
 * Named thresholds, weights, and rule definitions for the Business
 * Optimization / Report Center — the scoring engine
 * (businessHealth.service.ts) and manual-input limits/outlier thresholds
 * (promotionInputQuality.service.ts).
 *
 * Everything that could otherwise be a magic number in these services
 * lives here, per the repo's code-quality rules. Bump RULESET_VERSION
 * whenever a scoring threshold or weight changes — snapshots stamp the
 * version they were computed under (see VendorBusinessSnapshot.rulesetVersion)
 * so a ruleset change can never retroactively alter an already-delivered
 * report. The manual-input limits below are validation-only and don't
 * affect scoring, so they don't require a RULESET_VERSION bump.
 */

import { DimensionKey } from "../models/VendorBusinessSnapshot";

export const RULESET_VERSION = "1.0";
export const REPORT_VERSION = "1.0";

/**
 * Shape of the stored VendorBusinessSnapshot document. Bump when a field is
 * added/removed from the schema. No Mongoose `default` is set on
 * `schemaVersion` — an absent value means the doc predates this field and is
 * treated as LEGACY_SNAPSHOT_SCHEMA_VERSION (see snapshotSchemaVersion()).
 * Never backfilled: a backfill would touch every doc and invalidate every
 * integrity checksum written before it.
 */
export const SNAPSHOT_SCHEMA_VERSION = 2;
export const LEGACY_SNAPSHOT_SCHEMA_VERSION = 1;
/** PDF/HTML layout version — stamped onto ReportPayload at render time only, never persisted on the snapshot. See reportTemplate.service.ts footer. */
export const TEMPLATE_VERSION = "1.0";

// ─── Listing / profile ─────────────────────────────────────────────────────

export const MIN_LISTING_PHOTOS = 20;
export const MIN_DESCRIPTION_LENGTH = 100;
export const MIN_SOCIAL_LINKS_FOR_FULL_CREDIT = 2;

// ─── Sales ──────────────────────────────────────────────────────────────────

export const TARGET_REFUND_RATE_PCT = 5;
export const WARN_REFUND_RATE_PCT = 10;
export const TARGET_VIEW_TO_ORDER_RATE_PCT = 3;
export const WARN_VIEW_TO_ORDER_RATE_PCT = 1;

// ─── Customer ───────────────────────────────────────────────────────────────

export const TARGET_AVERAGE_RATING = 4.5;
export const WARN_AVERAGE_RATING = 3.5;
export const MIN_REVIEW_COUNT_FOR_FULL_CREDIT = 10;

// ─── Marketing ──────────────────────────────────────────────────────────────

export const TARGET_VIEW_TO_BOOKING_RATE_PCT = 5;
export const WARN_VIEW_TO_BOOKING_RATE_PCT = 2;

// ─── Operations ─────────────────────────────────────────────────────────────

export const TARGET_CANCELLATION_RATE_PCT = 5;
export const WARN_CANCELLATION_RATE_PCT = 15;
export const TARGET_CHECK_IN_RATE_PCT = 80;
export const WARN_CHECK_IN_RATE_PCT = 50;

// ─── Overall score ──────────────────────────────────────────────────────────

/** Weighted mean is taken over non-null dimensions only — see computeOverallScore. */
export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  listing: 0.2,
  sales: 0.25,
  marketing: 0.2,
  customer: 0.2,
  operations: 0.15,
};

export const ALL_DIMENSIONS: DimensionKey[] = [
  "listing",
  "sales",
  "marketing",
  "customer",
  "operations",
];

// ─── Confidence ─────────────────────────────────────────────────────────────

/** dimensionsScored / dimensionsTotal >= this ratio -> "high" confidence. */
export const CONFIDENCE_HIGH_RATIO = 0.8;
/** dimensionsScored / dimensionsTotal >= this ratio (and below HIGH) -> "medium". Below this -> "low". */
export const CONFIDENCE_MEDIUM_RATIO = 0.6;

// ─── Top events leaderboard ─────────────────────────────────────────────────

export const TOP_EVENTS_LIMIT = 5;

// ─── Platform benchmarks (cached — see businessReport.service.ts) ─────────

/** How long the platform-wide average-listing-photo-count benchmark is cached before recomputing. */
export const BENCHMARK_CACHE_TTL_SECONDS = 60 * 60;
export const BENCHMARK_CACHE_KEY =
  "business-report:benchmark:avg-listing-photo-count";

// ─── Snapshot integrity (snapshotIntegrity.service.ts) ─────────────────────

/**
 * Block a PDF/CSV download with 409 when the integrity checksum doesn't
 * match for a `locked` snapshot (a delivery promise, so a mismatch is
 * genuinely suspicious). A `draft` snapshot is expected to still churn and
 * is always allow-with-log regardless of this flag. Named constant so the
 * blocking behavior is flippable without a code change.
 */
export const INTEGRITY_MISMATCH_BLOCKS_LOCKED_DOWNLOAD = true;

// ─── Manual-input hard limits (validators + Mongoose schema) ───────────────
// Values physically impossible or absurd for a single vendor/period. See
// promotionInputQuality.service.ts for the softer outlier/warning layer.

export const MAX_SOCIAL_REACH = 500_000_000;
export const MAX_IMPRESSIONS = 1_000_000_000;
export const MAX_BANNER_IMPRESSIONS = 500_000_000;
export const MAX_POST_REACH = 500_000_000;
export const MAX_CAMPAIGN_COST = 10_000_000;
export const MAX_LABEL_LENGTH = 200;
export const MAX_BANNER_PLACEMENTS = 50;
export const MAX_FEATURED_LISTINGS = 50;
export const MAX_TOP_POSTS = 50;
export const MAX_OFFLINE_CAMPAIGNS = 50;

// ─── Manual-input outlier warnings (promotionInputQuality.service.ts) ──────
// Well below the hard limits above — crossing one of these doesn't reject
// the save, it just flags the value for a human to double-check.

export const OUTLIER_SOCIAL_REACH_WARN = 50_000_000;
export const OUTLIER_IMPRESSIONS_WARN = 100_000_000;
export const OUTLIER_CAMPAIGN_COST_WARN = 1_000_000;
/** A value more than this many times the previous period's is flagged as a likely typo (e.g. an extra zero). */
export const OUTLIER_PERIOD_MULTIPLIER = 10;

// ─── Vendor segmentation (classifyVendorSegments in businessHealth.service.ts) ──

/** Younger than this (in months) -> "new" lifecycle segment, regardless of score/delta. */
export const NEW_VENDOR_MAX_AGE_MONTHS = 3;
export const TOP_PERFORMER_MIN_SCORE = 80;
export const LOW_PERFORMER_MAX_SCORE = 50;
/** overallDelta <= this -> "declining". Intentionally more negative than a bare "< 0" so a 1-point wobble doesn't trigger it. */
export const DECLINING_DELTA_THRESHOLD = -5;
export const GROWING_DELTA_THRESHOLD = 5;

// ─── Profile completion checklist ──────────────────────────────────────────

export const PROFILE_COMPLETION_ITEMS: Array<{ key: string; label: string }> = [
  { key: "logo", label: "Logo" },
  { key: "coverImage", label: "Cover Image" },
  { key: "profileVideoUrl", label: "Video" },
  { key: "description", label: "Description" },
  { key: "businessHours", label: "Business Hours" },
  { key: "website", label: "Website" },
  { key: "socialMedia", label: "Social Links" },
  { key: "mission", label: "Mission" },
  { key: "vision", label: "Vision" },
  { key: "awards", label: "Awards" },
  { key: "certifications", label: "Certifications" },
  { key: "googleBusinessUrl", label: "Google Business" },
];
