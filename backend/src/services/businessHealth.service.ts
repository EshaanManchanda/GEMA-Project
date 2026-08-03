/**
 * Business Health scoring engine (KBOS Phase 1).
 *
 * Every function here is pure: no DB access, no Date.now() (dates are always
 * inputs), no randomness. All I/O (fetching the vendor, events, analytics,
 * reviews, promotion input) happens in businessReport.service.ts, which
 * assembles these plain-object inputs and calls the functions below. This
 * keeps the scoring rules unit-testable in isolation and keeps the "what do
 * we score on" logic in one auditable place.
 *
 * Truthfulness rule (hard requirement): a dimension with no underlying data
 * returns `score: null` and is excluded from the overall weighted mean by
 * computeOverallScore. Never zero-filled, never given a fabricated default.
 * See gema-no-fake-trust-numbers precedent — this applies with more force
 * here because these numbers can end up in a PDF a vendor shows an investor.
 */

import {
  ALL_DIMENSIONS,
  DIMENSION_WEIGHTS,
  CONFIDENCE_HIGH_RATIO,
  CONFIDENCE_MEDIUM_RATIO,
  MIN_LISTING_PHOTOS,
  MIN_DESCRIPTION_LENGTH,
  MIN_SOCIAL_LINKS_FOR_FULL_CREDIT,
  TARGET_REFUND_RATE_PCT,
  WARN_REFUND_RATE_PCT,
  TARGET_VIEW_TO_ORDER_RATE_PCT,
  WARN_VIEW_TO_ORDER_RATE_PCT,
  TARGET_AVERAGE_RATING,
  WARN_AVERAGE_RATING,
  MIN_REVIEW_COUNT_FOR_FULL_CREDIT,
  TARGET_VIEW_TO_BOOKING_RATE_PCT,
  WARN_VIEW_TO_BOOKING_RATE_PCT,
  TARGET_CANCELLATION_RATE_PCT,
  WARN_CANCELLATION_RATE_PCT,
  TARGET_CHECK_IN_RATE_PCT,
  WARN_CHECK_IN_RATE_PCT,
  PROFILE_COMPLETION_ITEMS,
  NEW_VENDOR_MAX_AGE_MONTHS,
  TOP_PERFORMER_MIN_SCORE,
  LOW_PERFORMER_MAX_SCORE,
  DECLINING_DELTA_THRESHOLD,
  GROWING_DELTA_THRESHOLD,
} from "../constants/businessHealth.rules";
import {
  DimensionKey,
  IVendorScores,
  IConfidence,
  IProfileCompletion,
  IRecommendation,
  ITask,
  RecommendationSeverity,
  ISnapshotBenchmarks,
} from "../models/VendorBusinessSnapshot";

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Linear score: value >= good -> 100, value <= bad -> 0, clamped + interpolated between. Handles "lower is better" when bad > good. */
function scoreLinear(value: number, bad: number, good: number): number {
  if (good === bad) return value >= good ? 100 : 0;
  const ratio = (value - bad) / (good - bad);
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

export interface DimensionResult {
  score: number | null;
  facts: Record<string, unknown>;
}

// ─── Listing dimension ──────────────────────────────────────────────────────

export interface ListingEventSignal {
  photoCount: number;
  hasFaq: boolean;
  hasTags: boolean;
  hasSchedule: boolean;
}

export interface VendorProfileSignal {
  hasLogo: boolean;
  hasCoverImage: boolean;
  hasProfileVideo: boolean;
  descriptionLength: number;
  hasBusinessHours: boolean;
  hasWebsite: boolean;
  socialLinkCount: number;
  hasMission: boolean;
  hasVision: boolean;
  hasAwards: boolean;
  hasCertifications: boolean;
  hasGoogleBusinessUrl: boolean;
}

export interface ListingScoreInput {
  profile: VendorProfileSignal;
  events: ListingEventSignal[];
}

/**
 * Blends profile completeness (always computable — a vendor profile always
 * exists) with per-event listing quality (only computable when the vendor
 * has at least one event). With zero events the score is profile
 * completeness alone; this is recorded in facts.eventsScored so callers/
 * tests can tell the two cases apart. Never returns null: an existing
 * vendor profile is always at least a partial signal.
 */
export function computeListingScore(input: ListingScoreInput): DimensionResult {
  const completion = computeProfileCompletion(input.profile);

  if (input.events.length === 0) {
    return {
      score: completion.percent,
      facts: { profileCompletionPercent: completion.percent, eventsScored: 0 },
    };
  }

  const perEventScores = input.events.map((ev) => {
    const photoScore = scoreLinear(ev.photoCount, 0, MIN_LISTING_PHOTOS);
    const faqScore = ev.hasFaq ? 100 : 0;
    const tagsScore = ev.hasTags ? 100 : 0;
    const scheduleScore = ev.hasSchedule ? 100 : 0;
    return (photoScore + faqScore + tagsScore + scheduleScore) / 4;
  });
  const listingQualityAvg =
    perEventScores.reduce((a, b) => a + b, 0) / perEventScores.length;

  const avgPhotoCount =
    input.events.reduce((sum, e) => sum + e.photoCount, 0) /
    input.events.length;

  const score = Math.round(completion.percent * 0.5 + listingQualityAvg * 0.5);

  return {
    score,
    facts: {
      profileCompletionPercent: completion.percent,
      eventsScored: input.events.length,
      averagePhotoCount: Math.round(avgPhotoCount * 10) / 10,
      eventsWithFaq: input.events.filter((e) => e.hasFaq).length,
    },
  };
}

// ─── Profile completion (separate metric — see plan §4) ────────────────────

export function computeProfileCompletion(
  profile: VendorProfileSignal,
): IProfileCompletion {
  const checks: Record<string, boolean> = {
    logo: profile.hasLogo,
    coverImage: profile.hasCoverImage,
    profileVideoUrl: profile.hasProfileVideo,
    description: profile.descriptionLength >= MIN_DESCRIPTION_LENGTH,
    businessHours: profile.hasBusinessHours,
    website: profile.hasWebsite,
    socialMedia: profile.socialLinkCount >= MIN_SOCIAL_LINKS_FOR_FULL_CREDIT,
    mission: profile.hasMission,
    vision: profile.hasVision,
    awards: profile.hasAwards,
    certifications: profile.hasCertifications,
    googleBusinessUrl: profile.hasGoogleBusinessUrl,
  };

  const items = PROFILE_COMPLETION_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    done: checks[item.key] === true,
  }));

  const doneCount = items.filter((i) => i.done).length;
  const percent =
    items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  return { percent, items };
}

// ─── Sales dimension ────────────────────────────────────────────────────────

export interface SalesScoreInput {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  refundRatePct: number;
  viewToOrderRatePct: number;
}

/** Null when there are no orders at all — nothing to score sales performance from. */
export function computeSalesScore(input: SalesScoreInput): DimensionResult {
  if (input.totalOrders === 0) {
    return { score: null, facts: { totalOrders: 0 } };
  }

  const refundScore = scoreLinear(
    input.refundRatePct,
    WARN_REFUND_RATE_PCT,
    TARGET_REFUND_RATE_PCT,
  );
  const conversionScore = scoreLinear(
    input.viewToOrderRatePct,
    WARN_VIEW_TO_ORDER_RATE_PCT,
    TARGET_VIEW_TO_ORDER_RATE_PCT,
  );

  const score = Math.round(refundScore * 0.5 + conversionScore * 0.5);

  return {
    score,
    facts: {
      totalOrders: input.totalOrders,
      totalRevenue: input.totalRevenue,
      averageOrderValue: input.averageOrderValue,
      refundRatePct: input.refundRatePct,
      viewToOrderRatePct: input.viewToOrderRatePct,
    },
  };
}

// ─── Customer dimension ─────────────────────────────────────────────────────

export interface CustomerScoreInput {
  averageRating: number; // 0-5
  totalReviews: number;
}

/** Null when there are no reviews — an average rating of 0 with 0 reviews is "not tracked", not "0/5". */
export function computeCustomerScore(
  input: CustomerScoreInput,
): DimensionResult {
  if (input.totalReviews === 0) {
    return { score: null, facts: { totalReviews: 0 } };
  }

  const ratingScore = scoreLinear(
    input.averageRating,
    WARN_AVERAGE_RATING,
    TARGET_AVERAGE_RATING,
  );
  const volumeScore = scoreLinear(
    input.totalReviews,
    0,
    MIN_REVIEW_COUNT_FOR_FULL_CREDIT,
  );

  const score = Math.round(ratingScore * 0.7 + volumeScore * 0.3);

  return {
    score,
    facts: {
      averageRating: input.averageRating,
      totalReviews: input.totalReviews,
    },
  };
}

// ─── Marketing dimension ────────────────────────────────────────────────────

export interface MarketingScoreInput {
  totalViews: number;
  viewToBookingRatePct: number;
  manualReachProvided: boolean; // true if admin filled in any socialReach/impressions for the period
  totalManualReach?: number;
}

/** Null when there is neither view data nor any manually-entered promotion data for the period. */
export function computeMarketingScore(
  input: MarketingScoreInput,
): DimensionResult {
  if (input.totalViews === 0 && !input.manualReachProvided) {
    return {
      score: null,
      facts: { totalViews: 0, manualReachProvided: false },
    };
  }

  const conversionScore =
    input.totalViews > 0
      ? scoreLinear(
          input.viewToBookingRatePct,
          WARN_VIEW_TO_BOOKING_RATE_PCT,
          TARGET_VIEW_TO_BOOKING_RATE_PCT,
        )
      : null;

  // With no view data but manual reach entered, score on reach presence alone
  // (a defensible partial signal, not a fabricated conversion figure).
  const score = conversionScore ?? (input.manualReachProvided ? 60 : 0);

  return {
    score,
    facts: {
      totalViews: input.totalViews,
      viewToBookingRatePct:
        input.totalViews > 0 ? input.viewToBookingRatePct : null,
      manualReachProvided: input.manualReachProvided,
      totalManualReach: input.totalManualReach ?? null,
    },
  };
}

// ─── Operations dimension ───────────────────────────────────────────────────

export interface OperationsScoreInput {
  totalBookings: number;
  cancelledBookings: number;
  checkInRatePct: number;
}

/** Null when there are no bookings — nothing to compute cancellation/check-in rates from. */
export function computeOperationsScore(
  input: OperationsScoreInput,
): DimensionResult {
  if (input.totalBookings === 0) {
    return { score: null, facts: { totalBookings: 0 } };
  }

  const cancellationRatePct =
    (input.cancelledBookings / input.totalBookings) * 100;
  const cancellationScore = scoreLinear(
    cancellationRatePct,
    WARN_CANCELLATION_RATE_PCT,
    TARGET_CANCELLATION_RATE_PCT,
  );
  const checkInScore = scoreLinear(
    input.checkInRatePct,
    WARN_CHECK_IN_RATE_PCT,
    TARGET_CHECK_IN_RATE_PCT,
  );

  const score = Math.round(cancellationScore * 0.5 + checkInScore * 0.5);

  return {
    score,
    facts: {
      totalBookings: input.totalBookings,
      cancelledBookings: input.cancelledBookings,
      cancellationRatePct: Math.round(cancellationRatePct * 10) / 10,
      checkInRatePct: input.checkInRatePct,
    },
  };
}

// ─── Overall score + confidence ─────────────────────────────────────────────

export function computeOverallScore(
  dimensionScores: Record<DimensionKey, number | null>,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const dim of ALL_DIMENSIONS) {
    const score = dimensionScores[dim];
    if (score === null || score === undefined) continue;
    weightedSum += score * DIMENSION_WEIGHTS[dim];
    weightTotal += DIMENSION_WEIGHTS[dim];
  }
  if (weightTotal === 0) return null;
  return Math.round(weightedSum / weightTotal);
}

export function computeConfidence(
  dimensionScores: Record<DimensionKey, number | null>,
): IConfidence {
  const dimensionsTotal = ALL_DIMENSIONS.length;
  const dimensionsScored = ALL_DIMENSIONS.filter(
    (dim) =>
      dimensionScores[dim] !== null && dimensionScores[dim] !== undefined,
  ).length;
  const ratio = dimensionsTotal === 0 ? 0 : dimensionsScored / dimensionsTotal;

  const level =
    ratio >= CONFIDENCE_HIGH_RATIO
      ? "high"
      : ratio >= CONFIDENCE_MEDIUM_RATIO
        ? "medium"
        : "low";

  return { level, dimensionsScored, dimensionsTotal };
}

export function buildScores(
  dimensionResults: Record<DimensionKey, DimensionResult>,
): IVendorScores {
  const dimensionScores: Record<DimensionKey, number | null> = {
    listing: dimensionResults.listing.score,
    sales: dimensionResults.sales.score,
    marketing: dimensionResults.marketing.score,
    customer: dimensionResults.customer.score,
    operations: dimensionResults.operations.score,
  };
  return {
    overall: computeOverallScore(dimensionScores),
    ...dimensionScores,
  };
}

// ─── Recommendations ────────────────────────────────────────────────────────

export interface RecommendationContext {
  listing: DimensionResult;
  sales: DimensionResult;
  marketing: DimensionResult;
  customer: DimensionResult;
  operations: DimensionResult;
  profileCompletion: IProfileCompletion;
  /**
   * Real, caller-computed platform benchmarks (e.g. average listing photo
   * count across active vendors). Optional — when a benchmark isn't
   * supplied, the recommendation states a plain product standard instead of
   * fabricating a comparative statistic. See businessReport.service.ts.
   */
  benchmarks?: Pick<ISnapshotBenchmarks, "averageListingPhotoCount">;
}

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function impactForSeverity(
  severity: RecommendationSeverity,
): "high" | "medium" | "low" {
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

export function generateRecommendations(
  ctx: RecommendationContext,
): IRecommendation[] {
  const recs: IRecommendation[] = [];
  const push = (
    code: string,
    title: string,
    severity: RecommendationSeverity,
    currentValue: string,
    targetValue: string,
    reason: string,
  ) => {
    recs.push({
      code,
      title,
      severity,
      currentValue,
      targetValue,
      reason,
      estimatedImpact: impactForSeverity(severity),
    });
  };

  // ── Listing ──
  const avgPhotoCount = ctx.listing.facts.averagePhotoCount as
    | number
    | undefined;
  if (avgPhotoCount !== undefined && avgPhotoCount < MIN_LISTING_PHOTOS) {
    const reason = ctx.benchmarks?.averageListingPhotoCount
      ? `Active vendors on Kidrove average ${Math.round(ctx.benchmarks.averageListingPhotoCount)} photos per listing.`
      : `Kidrove recommends at least ${MIN_LISTING_PHOTOS} photos per listing.`;
    push(
      "LISTING_PHOTO_COUNT",
      "Upload more event photos",
      avgPhotoCount < MIN_LISTING_PHOTOS / 2 ? "high" : "medium",
      `${Math.round(avgPhotoCount)} photos (avg)`,
      `${MIN_LISTING_PHOTOS} photos`,
      reason,
    );
  }

  if (!ctx.profileCompletion.items.find((i) => i.key === "logo")?.done) {
    push(
      "LISTING_MISSING_LOGO",
      "Add a business logo",
      "high",
      "Missing",
      "Uploaded",
      "A logo is one of the first things customers check before booking.",
    );
  }
  if (!ctx.profileCompletion.items.find((i) => i.key === "coverImage")?.done) {
    push(
      "LISTING_MISSING_COVER",
      "Add a cover image",
      "medium",
      "Missing",
      "Uploaded",
      "Listings with a cover image get more clicks on the homepage and search results.",
    );
  }
  const descriptionDone = ctx.profileCompletion.items.find(
    (i) => i.key === "description",
  )?.done;
  if (!descriptionDone) {
    push(
      "LISTING_DESCRIPTION_SHORT",
      "Expand your business description",
      "medium",
      "Too short",
      `${MIN_DESCRIPTION_LENGTH}+ characters`,
      "A fuller description helps customers understand what you offer before contacting you.",
    );
  }
  if (!ctx.profileCompletion.items.find((i) => i.key === "socialMedia")?.done) {
    push(
      "LISTING_MISSING_SOCIAL",
      "Connect your social media accounts",
      "low",
      `< ${MIN_SOCIAL_LINKS_FOR_FULL_CREDIT} linked`,
      `${MIN_SOCIAL_LINKS_FOR_FULL_CREDIT}+ linked`,
      "Linked social accounts let customers verify your business before booking.",
    );
  }

  // ── Sales ──
  if (ctx.sales.score !== null) {
    const refundRatePct = ctx.sales.facts.refundRatePct as number;
    if (refundRatePct > TARGET_REFUND_RATE_PCT) {
      push(
        "SALES_HIGH_REFUND_RATE",
        "Reduce your refund rate",
        refundRatePct > WARN_REFUND_RATE_PCT ? "critical" : "high",
        `${refundRatePct}%`,
        `${TARGET_REFUND_RATE_PCT}% or below`,
        "A high refund rate usually points to a mismatch between the listing and what's delivered.",
      );
    }
    const viewToOrderRatePct = ctx.sales.facts.viewToOrderRatePct as number;
    if (viewToOrderRatePct < TARGET_VIEW_TO_ORDER_RATE_PCT) {
      push(
        "SALES_LOW_CONVERSION",
        "Improve your listing's conversion rate",
        viewToOrderRatePct < WARN_VIEW_TO_ORDER_RATE_PCT ? "high" : "medium",
        `${viewToOrderRatePct}%`,
        `${TARGET_VIEW_TO_ORDER_RATE_PCT}%+`,
        "Visitors are viewing your listing but not booking — clearer photos, pricing, and FAQs typically help.",
      );
    }
  }

  // ── Customer ──
  if (ctx.customer.score !== null) {
    const averageRating = ctx.customer.facts.averageRating as number;
    if (averageRating < TARGET_AVERAGE_RATING) {
      push(
        "CUSTOMER_LOW_RATING",
        "Address recent customer feedback",
        averageRating < WARN_AVERAGE_RATING ? "critical" : "medium",
        `${averageRating.toFixed(1)} / 5`,
        `${TARGET_AVERAGE_RATING} / 5`,
        "Rating trends below target are the earliest signal of a service issue worth investigating.",
      );
    }
  }

  // ── Marketing ──
  if (ctx.marketing.score === null) {
    push(
      "MARKETING_NO_SIGNAL",
      "Start tracking marketing activity",
      "medium",
      "Not tracked",
      "Tracked",
      "No views or promotional activity were recorded for this period, so marketing performance can't be assessed yet.",
    );
  } else if (
    ctx.marketing.facts.viewToBookingRatePct !== null &&
    (ctx.marketing.facts.viewToBookingRatePct as number) <
      TARGET_VIEW_TO_BOOKING_RATE_PCT
  ) {
    const rate = ctx.marketing.facts.viewToBookingRatePct as number;
    push(
      "MARKETING_LOW_VIEW_TO_BOOKING",
      "Improve view-to-booking conversion",
      rate < WARN_VIEW_TO_BOOKING_RATE_PCT ? "high" : "medium",
      `${rate}%`,
      `${TARGET_VIEW_TO_BOOKING_RATE_PCT}%+`,
      "A large gap between views and bookings usually means the listing needs stronger photos, pricing clarity, or reviews.",
    );
  }

  // ── Operations ──
  if (ctx.operations.score !== null) {
    const cancellationRatePct = ctx.operations.facts
      .cancellationRatePct as number;
    if (cancellationRatePct > TARGET_CANCELLATION_RATE_PCT) {
      push(
        "OPERATIONS_HIGH_CANCELLATION",
        "Reduce booking cancellations",
        cancellationRatePct > WARN_CANCELLATION_RATE_PCT ? "critical" : "high",
        `${cancellationRatePct}%`,
        `${TARGET_CANCELLATION_RATE_PCT}% or below`,
        "Frequent cancellations hurt both customer trust and your search ranking.",
      );
    }
    const checkInRatePct = ctx.operations.facts.checkInRatePct as number;
    if (checkInRatePct < TARGET_CHECK_IN_RATE_PCT) {
      push(
        "OPERATIONS_LOW_CHECKIN",
        "Improve on-site check-in rate",
        checkInRatePct < WARN_CHECK_IN_RATE_PCT ? "high" : "medium",
        `${checkInRatePct}%`,
        `${TARGET_CHECK_IN_RATE_PCT}%+`,
        "A low check-in rate versus tickets sold often signals scheduling or communication gaps with attendees.",
      );
    }
  }

  return recs.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

/** Tasks inherit the recommendation order (severity-sorted). */
export function generateTasks(recommendations: IRecommendation[]): ITask[] {
  return recommendations.map((r) => ({
    code: r.code,
    label: r.title,
    done: false,
  }));
}

// ─── Trend math ──────────────────────────────────────────────────────────────

export interface TrendResult {
  previousValue?: number;
  changePercent?: number;
  direction?: "up" | "down" | "flat";
}

/**
 * Compares a current metric value against the previous period's value.
 * Returns an empty object (all fields undefined) when there is no previous
 * value to compare against — the UI must render the bare current value with
 * no badge in that case, never a fabricated "+100%" or "0%" baseline.
 */
export function computeTrend(
  currentValue: number | null,
  previousValue: number | null | undefined,
): TrendResult {
  if (
    currentValue === null ||
    previousValue === null ||
    previousValue === undefined
  ) {
    return {};
  }

  if (previousValue === 0) {
    // Avoid dividing by zero; a move from 0 has no meaningful percent change.
    return {
      previousValue,
      direction: currentValue > 0 ? "up" : "flat",
    };
  }

  const changePercent =
    Math.round(
      ((currentValue - previousValue) / Math.abs(previousValue)) * 1000,
    ) / 10;

  return {
    previousValue,
    changePercent,
    direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
  };
}

// ─── Vendor segmentation ────────────────────────────────────────────────────

/**
 * Segmentation is a classification derived from the scores this module
 * produces, so — unlike input-quality checking (promotionInputQuality.
 * service.ts) — it belongs in "the one auditable place for what we judge
 * vendors on" per this module's header. Pure: createdAt/asOf are explicit
 * inputs, no Date.now().
 *
 * Computed on-the-fly by callers (admin.businessReport.controller.ts
 * getOverview), never frozen into a VendorBusinessSnapshot: (1) it needs
 * asOf/vendor-age plus the previous period's snapshot, both already in
 * hand at the call site; (2) a snapshot is a record of measured facts, not
 * a label whose thresholds will be retuned; (3) decisively, freezing it
 * would put these thresholds inside the snapshot integrity hash (see
 * snapshotIntegrity.service.ts), so any future threshold tweak would
 * invalidate every historical checksum.
 */

export type LifecycleSegment =
  | "inactive"
  | "new"
  | "top_performer"
  | "declining"
  | "growing"
  | "steady";

export type PlanSegment = "premium" | "enterprise";

export interface SegmentInput {
  createdAt: Date;
  asOf: Date;
  hasSnapshot: boolean;
  overallScore: number | null;
  overallDelta: number | null;
  /**
   * Optional plan/subscription signal. As of this writing no
   * VendorSubscription documents exist in this deployment, so callers
   * should simply omit these rather than fabricate a tier — see the
   * "no plan supplied" test case. Wired here so the mapping is ready the
   * day tiered subscriptions actually ship; getOverview deliberately does
   * NOT join VendorSubscription or expose plan in the filter UI yet.
   */
  plan?: "basic" | "standard" | "premium" | "enterprise";
  subscriptionActive?: boolean;
}

export interface VendorSegments {
  /** Exactly one — for the UI badge. First-match-wins precedence, see classifyVendorSegments. */
  lifecycle: LifecycleSegment;
  /** Populated only when plan/subscriptionActive are supplied and active — never fabricated. */
  plan?: PlanSegment;
  /** Union of every independent predicate that holds — what filters query against (multi-label). */
  all: string[];
}

function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  // A same-day-of-month comparison would be more precise but isn't worth
  // the complexity here — this only gates a coarse "new vendor" cutoff.
  return months;
}

function planSegment(input: SegmentInput): PlanSegment | undefined {
  if (!input.plan || input.subscriptionActive !== true) return undefined;
  if (input.plan === "premium") return "premium";
  if (input.plan === "enterprise") return "enterprise";
  return undefined;
}

/**
 * Classifies a vendor into exactly one lifecycle badge (first-match-wins)
 * plus the full set of independent predicates that hold (`all`) so a
 * declining top performer can be found under both `top_performer` and
 * `declining` filters while the UI shows one badge.
 */
export function classifyVendorSegments(input: SegmentInput): VendorSegments {
  const all: string[] = [];
  const isInactive = !input.hasSnapshot || input.overallScore === null;
  const isNew =
    !isInactive &&
    monthsBetween(input.createdAt, input.asOf) < NEW_VENDOR_MAX_AGE_MONTHS;
  const isTopPerformer =
    input.overallScore !== null &&
    input.overallScore >= TOP_PERFORMER_MIN_SCORE;
  const isLowPerformer =
    input.overallScore !== null && input.overallScore < LOW_PERFORMER_MAX_SCORE;
  const isDeclining =
    input.overallDelta !== null &&
    input.overallDelta <= DECLINING_DELTA_THRESHOLD;
  const isGrowing =
    input.overallDelta !== null &&
    input.overallDelta >= GROWING_DELTA_THRESHOLD;

  if (isInactive) all.push("inactive");
  if (isNew) all.push("new");
  if (isTopPerformer) all.push("top_performer");
  if (isLowPerformer) all.push("low_performer");
  if (isDeclining) all.push("declining");
  if (isGrowing) all.push("growing");

  const lifecycle: LifecycleSegment = isInactive
    ? "inactive"
    : isNew
      ? "new"
      : isTopPerformer
        ? "top_performer"
        : isDeclining
          ? "declining"
          : isGrowing
            ? "growing"
            : "steady";
  if (lifecycle === "steady") all.push("steady");

  const plan = planSegment(input);
  if (plan) all.push(plan);

  return { lifecycle, plan, all };
}
