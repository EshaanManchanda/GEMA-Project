/**
 * businessHealth.service.ts — pure scoring engine tests.
 *
 * No mocks needed: every function under test takes plain-object input and
 * returns plain-object output (see the module header for why it's built
 * this way). Two assertions matter most across this file:
 *
 *  1. A vendor with no reviews and no analytics data returns `score: null`
 *     for those dimensions, is excluded from the overall mean, and reports
 *     reduced confidence — the truthfulness rule.
 *  2. Recommendation `reason` never fabricates a comparative statistic when
 *     no benchmark was supplied.
 */

import {
  computeListingScore,
  computeProfileCompletion,
  computeSalesScore,
  computeCustomerScore,
  computeMarketingScore,
  computeOperationsScore,
  computeOverallScore,
  computeConfidence,
  generateRecommendations,
  generateTasks,
  computeTrend,
  classifyVendorSegments,
  SegmentInput,
  VendorProfileSignal,
  ListingEventSignal,
} from "../../../services/businessHealth.service";
import {
  MIN_LISTING_PHOTOS,
  MIN_DESCRIPTION_LENGTH,
  TARGET_REFUND_RATE_PCT,
  WARN_REFUND_RATE_PCT,
  TARGET_AVERAGE_RATING,
  WARN_AVERAGE_RATING,
  TARGET_CANCELLATION_RATE_PCT,
  WARN_CANCELLATION_RATE_PCT,
  TARGET_CHECK_IN_RATE_PCT,
  NEW_VENDOR_MAX_AGE_MONTHS,
  TOP_PERFORMER_MIN_SCORE,
  LOW_PERFORMER_MAX_SCORE,
  DECLINING_DELTA_THRESHOLD,
  GROWING_DELTA_THRESHOLD,
} from "../../../constants/businessHealth.rules";
import { DimensionKey } from "../../../models/VendorBusinessSnapshot";

const EMPTY_PROFILE: VendorProfileSignal = {
  hasLogo: false,
  hasCoverImage: false,
  hasProfileVideo: false,
  descriptionLength: 0,
  hasBusinessHours: false,
  hasWebsite: false,
  socialLinkCount: 0,
  hasMission: false,
  hasVision: false,
  hasAwards: false,
  hasCertifications: false,
  hasGoogleBusinessUrl: false,
};

const FULL_PROFILE: VendorProfileSignal = {
  hasLogo: true,
  hasCoverImage: true,
  hasProfileVideo: true,
  descriptionLength: MIN_DESCRIPTION_LENGTH + 50,
  hasBusinessHours: true,
  hasWebsite: true,
  socialLinkCount: 3,
  hasMission: true,
  hasVision: true,
  hasAwards: true,
  hasCertifications: true,
  hasGoogleBusinessUrl: true,
};

describe("computeProfileCompletion", () => {
  it("is 0% for a fully empty profile", () => {
    expect(computeProfileCompletion(EMPTY_PROFILE).percent).toBe(0);
  });

  it("is 100% for a fully filled profile", () => {
    expect(computeProfileCompletion(FULL_PROFILE).percent).toBe(100);
  });

  it("marks each checklist item done/not-done independently", () => {
    const result = computeProfileCompletion({
      ...EMPTY_PROFILE,
      hasLogo: true,
    });
    const logoItem = result.items.find((i) => i.key === "logo");
    const coverItem = result.items.find((i) => i.key === "coverImage");
    expect(logoItem?.done).toBe(true);
    expect(coverItem?.done).toBe(false);
  });
});

describe("computeListingScore", () => {
  it("falls back to profile-completion-only when the vendor has zero events", () => {
    const result = computeListingScore({ profile: FULL_PROFILE, events: [] });
    expect(result.score).toBe(100);
    expect(result.facts.eventsScored).toBe(0);
  });

  it("never returns null — a vendor profile always exists as a signal", () => {
    const result = computeListingScore({ profile: EMPTY_PROFILE, events: [] });
    expect(result.score).not.toBeNull();
  });

  it("scores low listing quality when events have few photos and no metadata", () => {
    const events: ListingEventSignal[] = [
      { photoCount: 1, hasFaq: false, hasTags: false, hasSchedule: false },
    ];
    const result = computeListingScore({ profile: EMPTY_PROFILE, events });
    expect(result.score).toBeLessThan(20);
  });

  it("scores high listing quality at/above the photo target with full metadata", () => {
    const events: ListingEventSignal[] = [
      {
        photoCount: MIN_LISTING_PHOTOS,
        hasFaq: true,
        hasTags: true,
        hasSchedule: true,
      },
    ];
    const result = computeListingScore({ profile: FULL_PROFILE, events });
    expect(result.score).toBe(100);
  });

  it("averages photo count across multiple events into facts", () => {
    const events: ListingEventSignal[] = [
      { photoCount: 10, hasFaq: true, hasTags: true, hasSchedule: true },
      { photoCount: 20, hasFaq: true, hasTags: true, hasSchedule: true },
    ];
    const result = computeListingScore({ profile: EMPTY_PROFILE, events });
    expect(result.facts.averagePhotoCount).toBe(15);
  });
});

describe("computeSalesScore", () => {
  it("returns null with reduced signal when there are no orders (truthfulness rule)", () => {
    const result = computeSalesScore({
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      refundRatePct: 0,
      viewToOrderRatePct: 0,
    });
    expect(result.score).toBeNull();
  });

  it("scores at minimum when refund rate is at/above the warn threshold", () => {
    const result = computeSalesScore({
      totalOrders: 10,
      totalRevenue: 1000,
      averageOrderValue: 100,
      refundRatePct: WARN_REFUND_RATE_PCT,
      viewToOrderRatePct: 0,
    });
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it("scores at maximum when refund rate is at/below target and conversion is at/above target", () => {
    const result = computeSalesScore({
      totalOrders: 10,
      totalRevenue: 1000,
      averageOrderValue: 100,
      refundRatePct: TARGET_REFUND_RATE_PCT,
      viewToOrderRatePct: 10,
    });
    expect(result.score).toBe(100);
  });
});

describe("computeCustomerScore", () => {
  it("returns null with zero reviews (truthfulness rule)", () => {
    const result = computeCustomerScore({ averageRating: 0, totalReviews: 0 });
    expect(result.score).toBeNull();
  });

  it("scores low at/below the warn rating threshold", () => {
    const result = computeCustomerScore({
      averageRating: WARN_AVERAGE_RATING,
      totalReviews: 1,
    });
    expect(result.score).toBeLessThanOrEqual(35);
  });

  it("scores high at/above the target rating with sufficient review volume", () => {
    const result = computeCustomerScore({
      averageRating: TARGET_AVERAGE_RATING,
      totalReviews: 50,
    });
    expect(result.score).toBe(100);
  });
});

describe("computeMarketingScore", () => {
  it("returns null with zero views and no manual promotion data (truthfulness rule)", () => {
    const result = computeMarketingScore({
      totalViews: 0,
      viewToBookingRatePct: 0,
      manualReachProvided: false,
    });
    expect(result.score).toBeNull();
  });

  it("gives partial credit for manual reach even with zero platform views", () => {
    const result = computeMarketingScore({
      totalViews: 0,
      viewToBookingRatePct: 0,
      manualReachProvided: true,
      totalManualReach: 5000,
    });
    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
  });

  it("scores on view-to-booking conversion when view data exists", () => {
    const result = computeMarketingScore({
      totalViews: 1000,
      viewToBookingRatePct: 10,
      manualReachProvided: false,
    });
    expect(result.score).toBe(100);
  });
});

describe("computeOperationsScore", () => {
  it("returns null with zero bookings (truthfulness rule)", () => {
    const result = computeOperationsScore({
      totalBookings: 0,
      cancelledBookings: 0,
      checkInRatePct: 0,
    });
    expect(result.score).toBeNull();
  });

  it("scores low with high cancellation and low check-in rate", () => {
    const result = computeOperationsScore({
      totalBookings: 100,
      cancelledBookings: WARN_CANCELLATION_RATE_PCT,
      checkInRatePct: 0,
    });
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it("scores at maximum with no cancellations and full check-in rate", () => {
    const result = computeOperationsScore({
      totalBookings: 100,
      cancelledBookings: 0,
      checkInRatePct: TARGET_CHECK_IN_RATE_PCT,
    });
    expect(result.score).toBe(100);
  });
});

describe("computeOverallScore + computeConfidence (truthfulness rule)", () => {
  it("excludes null dimensions from the weighted mean entirely", () => {
    const allHigh: Record<DimensionKey, number | null> = {
      listing: 100,
      sales: 100,
      marketing: 100,
      customer: 100,
      operations: 100,
    };
    const withNulls: Record<DimensionKey, number | null> = {
      listing: 100,
      sales: null,
      marketing: null,
      customer: 100,
      operations: null,
    };
    // If nulls were zero-filled, the overall score would drop sharply.
    // Excluded correctly, the remaining dimensions (both 100) average to 100.
    expect(computeOverallScore(allHigh)).toBe(100);
    expect(computeOverallScore(withNulls)).toBe(100);
  });

  it("returns null overall when every dimension is null", () => {
    const allNull: Record<DimensionKey, number | null> = {
      listing: null,
      sales: null,
      marketing: null,
      customer: null,
      operations: null,
    };
    expect(computeOverallScore(allNull)).toBeNull();
  });

  it("reports reduced confidence when a vendor has no reviews and no analytics data", () => {
    // Mirrors a brand-new vendor: listing scores (profile always exists),
    // but sales/marketing/customer/operations have no underlying data yet.
    const scores: Record<DimensionKey, number | null> = {
      listing: 40,
      sales: null,
      marketing: null,
      customer: null,
      operations: null,
    };
    const confidence = computeConfidence(scores);
    expect(confidence.dimensionsScored).toBe(1);
    expect(confidence.dimensionsTotal).toBe(5);
    expect(confidence.level).toBe("low");
  });

  it("reports high confidence when all dimensions are scored", () => {
    const scores: Record<DimensionKey, number | null> = {
      listing: 80,
      sales: 80,
      marketing: 80,
      customer: 80,
      operations: 80,
    };
    expect(computeConfidence(scores).level).toBe("high");
  });
});

describe("generateRecommendations", () => {
  const baseCtx = {
    listing: computeListingScore({ profile: FULL_PROFILE, events: [] }),
    sales: computeSalesScore({
      totalOrders: 10,
      totalRevenue: 1000,
      averageOrderValue: 100,
      refundRatePct: TARGET_REFUND_RATE_PCT,
      viewToOrderRatePct: 10,
    }),
    marketing: computeMarketingScore({
      totalViews: 1000,
      viewToBookingRatePct: 10,
      manualReachProvided: false,
    }),
    customer: computeCustomerScore({
      averageRating: TARGET_AVERAGE_RATING,
      totalReviews: 50,
    }),
    operations: computeOperationsScore({
      totalBookings: 100,
      cancelledBookings: 0,
      checkInRatePct: TARGET_CHECK_IN_RATE_PCT,
    }),
    profileCompletion: computeProfileCompletion(FULL_PROFILE),
  };

  it("produces no recommendations when every dimension is already at target", () => {
    expect(generateRecommendations(baseCtx)).toEqual([]);
  });

  it("fires LISTING_MISSING_LOGO when the logo checklist item is not done", () => {
    const ctx = {
      ...baseCtx,
      profileCompletion: computeProfileCompletion({
        ...FULL_PROFILE,
        hasLogo: false,
      }),
    };
    const recs = generateRecommendations(ctx);
    expect(recs.some((r) => r.code === "LISTING_MISSING_LOGO")).toBe(true);
  });

  it("fires SALES_HIGH_REFUND_RATE exactly at the boundary above target, not at target", () => {
    const atTarget = generateRecommendations({
      ...baseCtx,
      sales: computeSalesScore({
        totalOrders: 10,
        totalRevenue: 1000,
        averageOrderValue: 100,
        refundRatePct: TARGET_REFUND_RATE_PCT,
        viewToOrderRatePct: 10,
      }),
    });
    expect(atTarget.some((r) => r.code === "SALES_HIGH_REFUND_RATE")).toBe(
      false,
    );

    const aboveTarget = generateRecommendations({
      ...baseCtx,
      sales: computeSalesScore({
        totalOrders: 10,
        totalRevenue: 1000,
        averageOrderValue: 100,
        refundRatePct: TARGET_REFUND_RATE_PCT + 1,
        viewToOrderRatePct: 10,
      }),
    });
    expect(aboveTarget.some((r) => r.code === "SALES_HIGH_REFUND_RATE")).toBe(
      true,
    );
  });

  it("escalates SALES_HIGH_REFUND_RATE to critical once past the warn threshold", () => {
    const recs = generateRecommendations({
      ...baseCtx,
      sales: computeSalesScore({
        totalOrders: 10,
        totalRevenue: 1000,
        averageOrderValue: 100,
        refundRatePct: WARN_REFUND_RATE_PCT + 1,
        viewToOrderRatePct: 10,
      }),
    });
    const rec = recs.find((r) => r.code === "SALES_HIGH_REFUND_RATE");
    expect(rec?.severity).toBe("critical");
  });

  it("fires MARKETING_NO_SIGNAL when the marketing dimension is null", () => {
    const recs = generateRecommendations({
      ...baseCtx,
      marketing: computeMarketingScore({
        totalViews: 0,
        viewToBookingRatePct: 0,
        manualReachProvided: false,
      }),
    });
    expect(recs.some((r) => r.code === "MARKETING_NO_SIGNAL")).toBe(true);
  });

  it("orders recommendations by severity (critical -> high -> medium -> low)", () => {
    const recs = generateRecommendations({
      ...baseCtx,
      sales: computeSalesScore({
        totalOrders: 10,
        totalRevenue: 1000,
        averageOrderValue: 100,
        refundRatePct: WARN_REFUND_RATE_PCT + 5, // critical
        viewToOrderRatePct: 10,
      }),
      profileCompletion: computeProfileCompletion({
        ...FULL_PROFILE,
        hasLogo: false, // high
        socialLinkCount: 0, // low
      }),
    });
    const severities = recs.map((r) => r.severity);
    const rank: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const sorted = [...severities].sort((a, b) => rank[a] - rank[b]);
    expect(severities).toEqual(sorted);
  });

  it("uses a plain product-standard reason when no benchmark is supplied, never fabricating a statistic", () => {
    const recs = generateRecommendations({
      ...baseCtx,
      listing: computeListingScore({
        profile: FULL_PROFILE,
        events: [
          { photoCount: 1, hasFaq: true, hasTags: true, hasSchedule: true },
        ],
      }),
    });
    const rec = recs.find((r) => r.code === "LISTING_PHOTO_COUNT");
    expect(rec?.reason).toContain("Kidrove recommends");
    expect(rec?.reason).not.toMatch(/average \d+ photos per listing/);
  });

  it("uses the supplied real benchmark in the reason when provided", () => {
    const recs = generateRecommendations({
      ...baseCtx,
      listing: computeListingScore({
        profile: FULL_PROFILE,
        events: [
          { photoCount: 1, hasFaq: true, hasTags: true, hasSchedule: true },
        ],
      }),
      benchmarks: { averageListingPhotoCount: 23 },
    });
    const rec = recs.find((r) => r.code === "LISTING_PHOTO_COUNT");
    expect(rec?.reason).toContain("23 photos per listing");
  });
});

describe("generateTasks", () => {
  it("creates one not-done task per recommendation, preserving order", () => {
    const recs = generateRecommendations({
      listing: computeListingScore({ profile: EMPTY_PROFILE, events: [] }),
      sales: computeSalesScore({
        totalOrders: 10,
        totalRevenue: 1000,
        averageOrderValue: 100,
        refundRatePct: WARN_REFUND_RATE_PCT + 1,
        viewToOrderRatePct: 0.1,
      }),
      marketing: computeMarketingScore({
        totalViews: 0,
        viewToBookingRatePct: 0,
        manualReachProvided: false,
      }),
      customer: computeCustomerScore({ averageRating: 2, totalReviews: 3 }),
      operations: computeOperationsScore({
        totalBookings: 10,
        cancelledBookings: 5,
        checkInRatePct: 10,
      }),
      profileCompletion: computeProfileCompletion(EMPTY_PROFILE),
    });
    const tasks = generateTasks(recs);
    expect(tasks.length).toBe(recs.length);
    expect(tasks.every((t) => t.done === false)).toBe(true);
    expect(tasks.map((t) => t.code)).toEqual(recs.map((r) => r.code));
  });
});

describe("computeTrend", () => {
  it("returns no badge fields when there is no previous snapshot (no fake baseline)", () => {
    const trend = computeTrend(128, undefined);
    expect(trend.previousValue).toBeUndefined();
    expect(trend.changePercent).toBeUndefined();
    expect(trend.direction).toBeUndefined();
  });

  it("returns no badge fields when the current value is null", () => {
    const trend = computeTrend(null, 100);
    expect(trend).toEqual({});
  });

  it("computes a positive percent change and 'up' direction", () => {
    const trend = computeTrend(120, 100);
    expect(trend.changePercent).toBe(20);
    expect(trend.direction).toBe("up");
  });

  it("computes a negative percent change and 'down' direction", () => {
    const trend = computeTrend(80, 100);
    expect(trend.changePercent).toBe(-20);
    expect(trend.direction).toBe("down");
  });

  it("reports 'flat' when the value is unchanged", () => {
    const trend = computeTrend(100, 100);
    expect(trend.changePercent).toBe(0);
    expect(trend.direction).toBe("flat");
  });

  it("handles a previous value of zero without dividing by zero", () => {
    const trend = computeTrend(50, 0);
    expect(trend.previousValue).toBe(0);
    expect(trend.direction).toBe("up");
    expect(trend.changePercent).toBeUndefined();
  });
});

describe("classifyVendorSegments", () => {
  const ASOF = new Date("2026-07-15T00:00:00.000Z");
  const OLD_VENDOR = new Date("2020-01-01T00:00:00.000Z");

  const base: SegmentInput = {
    createdAt: OLD_VENDOR,
    asOf: ASOF,
    hasSnapshot: true,
    overallScore: 65,
    overallDelta: 0,
  };

  it("classifies a vendor with no snapshot as inactive", () => {
    const result = classifyVendorSegments({
      ...base,
      hasSnapshot: false,
      overallScore: null,
    });
    expect(result.lifecycle).toBe("inactive");
    expect(result.all).toContain("inactive");
  });

  it("classifies a vendor with a snapshot but all-null overall score as inactive", () => {
    const result = classifyVendorSegments({
      ...base,
      hasSnapshot: true,
      overallScore: null,
    });
    expect(result.lifecycle).toBe("inactive");
  });

  it("classifies a vendor younger than the age threshold as new, regardless of delta", () => {
    const recentlyJoined = new Date(ASOF);
    recentlyJoined.setMonth(
      recentlyJoined.getMonth() - (NEW_VENDOR_MAX_AGE_MONTHS - 1),
    );
    const result = classifyVendorSegments({
      ...base,
      createdAt: recentlyJoined,
      overallScore: 20, // would otherwise be a low performer
      overallDelta: -50, // would otherwise be declining
    });
    expect(result.lifecycle).toBe("new");
  });

  it("does not classify a vendor at exactly the age threshold as new (boundary)", () => {
    const boundary = new Date(ASOF);
    boundary.setMonth(boundary.getMonth() - NEW_VENDOR_MAX_AGE_MONTHS);
    const result = classifyVendorSegments({ ...base, createdAt: boundary });
    expect(result.lifecycle).not.toBe("new");
  });

  it("classifies a vendor at or above the top-performer threshold as top_performer", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: TOP_PERFORMER_MIN_SCORE,
    });
    expect(result.lifecycle).toBe("top_performer");
    expect(result.all).toContain("top_performer");
  });

  it("puts a declining top performer in both segments in all[], with top_performer as the badge", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: 85,
      overallDelta: DECLINING_DELTA_THRESHOLD,
    });
    expect(result.lifecycle).toBe("top_performer");
    expect(result.all).toContain("top_performer");
    expect(result.all).toContain("declining");
  });

  it("classifies a vendor at or below the declining threshold as declining (when not a top performer)", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: 60,
      overallDelta: DECLINING_DELTA_THRESHOLD,
    });
    expect(result.lifecycle).toBe("declining");
  });

  it("does not classify a 1-point drop as declining (tighter than a bare '< 0' check)", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: 60,
      overallDelta: -1,
    });
    expect(result.lifecycle).not.toBe("declining");
    expect(result.all).not.toContain("declining");
  });

  it("classifies a vendor at or above the growing threshold as growing", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: 60,
      overallDelta: GROWING_DELTA_THRESHOLD,
    });
    expect(result.lifecycle).toBe("growing");
  });

  it("falls back to steady when no predicate fires", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: 60,
      overallDelta: 1,
    });
    expect(result.lifecycle).toBe("steady");
    expect(result.all).toContain("steady");
  });

  it("includes low_performer in all[] but never as the lifecycle badge", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: LOW_PERFORMER_MAX_SCORE - 1,
    });
    expect(result.all).toContain("low_performer");
    expect(result.lifecycle).not.toBe("low_performer" as any);
  });

  it("does not flag exactly at the low-performer threshold as low_performer (boundary)", () => {
    const result = classifyVendorSegments({
      ...base,
      overallScore: LOW_PERFORMER_MAX_SCORE,
    });
    expect(result.all).not.toContain("low_performer");
  });

  it("returns no plan segment when no subscription data is supplied — no fabricated tier", () => {
    const result = classifyVendorSegments(base);
    expect(result.plan).toBeUndefined();
    expect(result.all).not.toContain("premium");
    expect(result.all).not.toContain("enterprise");
  });

  it("does not classify an inactive-status premium subscription as premium", () => {
    const result = classifyVendorSegments({
      ...base,
      plan: "premium",
      subscriptionActive: false,
    });
    expect(result.plan).toBeUndefined();
  });

  it("classifies an active premium subscription as premium", () => {
    const result = classifyVendorSegments({
      ...base,
      plan: "premium",
      subscriptionActive: true,
    });
    expect(result.plan).toBe("premium");
    expect(result.all).toContain("premium");
  });
});
