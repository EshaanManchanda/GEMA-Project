/**
 * promotionInputQuality.service.ts — manual-input data-quality tests.
 *
 * No mocks needed: pure functions, plain-object in/out (see module header).
 * Two things matter most across this file:
 *
 *  1. Warnings are non-blocking hints, not rejections — every case here is
 *     about whether a warning fires, never about throwing.
 *  2. checkPeriodOutliers must never fabricate a baseline: no previous
 *     period means no warnings, mirroring computeTrend's contract.
 */

import {
  checkPromotionInput,
  checkPeriodOutliers,
  PromotionInputSignal,
} from "../../../services/promotionInputQuality.service";
import {
  OUTLIER_SOCIAL_REACH_WARN,
  OUTLIER_IMPRESSIONS_WARN,
  OUTLIER_CAMPAIGN_COST_WARN,
  OUTLIER_PERIOD_MULTIPLIER,
} from "../../../constants/businessHealth.rules";

const PERIOD_START = new Date("2026-07-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-07-31T23:59:59.999Z");

describe("checkPromotionInput", () => {
  it("returns no warnings for a fully plausible input", () => {
    const input: PromotionInputSignal = {
      socialReach: { instagram: 5000, facebook: 3000 },
      impressions: 10000,
      bannerPlacements: [
        { label: "Homepage banner", impressions: 1000, clicks: 50 },
      ],
      topPosts: [{ platform: "instagram", reach: 2000, engagement: 100 }],
      offlineCampaigns: [{ label: "School visit", cost: 500 }],
    };
    expect(checkPromotionInput(input, PERIOD_START, PERIOD_END)).toEqual([]);
  });

  it("flags clicks exceeding impressions on a banner placement", () => {
    const input: PromotionInputSignal = {
      bannerPlacements: [
        { label: "Suspicious banner", impressions: 10, clicks: 500 },
      ],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("BANNER_CLICKS_EXCEED_IMPRESSIONS");
    expect(warnings[0].field).toBe("bannerPlacements[0].clicks");
  });

  it("does not flag when clicks equal impressions (boundary)", () => {
    const input: PromotionInputSignal = {
      bannerPlacements: [
        { label: "Boundary banner", impressions: 100, clicks: 100 },
      ],
    };
    expect(checkPromotionInput(input, PERIOD_START, PERIOD_END)).toEqual([]);
  });

  it("flags engagement exceeding reach on a top post", () => {
    const input: PromotionInputSignal = {
      topPosts: [{ platform: "instagram", reach: 100, engagement: 500 }],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("POST_ENGAGEMENT_EXCEEDS_REACH");
  });

  it("does not flag when engagement equals reach (boundary)", () => {
    const input: PromotionInputSignal = {
      topPosts: [{ platform: "instagram", reach: 100, engagement: 100 }],
    };
    expect(checkPromotionInput(input, PERIOD_START, PERIOD_END)).toEqual([]);
  });

  it("flags social reach above the outlier threshold", () => {
    const input: PromotionInputSignal = {
      socialReach: { instagram: OUTLIER_SOCIAL_REACH_WARN + 1 },
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "SOCIAL_REACH_IMPLAUSIBLE")).toBe(
      true,
    );
  });

  it("does not flag social reach exactly at the outlier threshold (boundary)", () => {
    const input: PromotionInputSignal = {
      socialReach: { instagram: OUTLIER_SOCIAL_REACH_WARN },
    };
    expect(checkPromotionInput(input, PERIOD_START, PERIOD_END)).toEqual([]);
  });

  it("flags impressions above the outlier threshold", () => {
    const input: PromotionInputSignal = {
      impressions: OUTLIER_IMPRESSIONS_WARN + 1,
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "IMPRESSIONS_IMPLAUSIBLE")).toBe(
      true,
    );
  });

  it("flags an offline campaign cost above the outlier threshold", () => {
    const input: PromotionInputSignal = {
      offlineCampaigns: [
        { label: "Billboard", cost: OUTLIER_CAMPAIGN_COST_WARN + 1 },
      ],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "CAMPAIGN_COST_IMPLAUSIBLE")).toBe(
      true,
    );
  });

  it("flags an inverted date range on an offline campaign", () => {
    const input: PromotionInputSignal = {
      offlineCampaigns: [
        {
          label: "Backwards campaign",
          startDate: new Date("2026-07-20"),
          endDate: new Date("2026-07-10"),
        },
      ],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "DATE_RANGE_INVERTED")).toBe(true);
  });

  it("flags an inverted date range on a banner placement", () => {
    const input: PromotionInputSignal = {
      bannerPlacements: [
        {
          label: "Backwards banner",
          startDate: new Date("2026-07-20"),
          endDate: new Date("2026-07-10"),
        },
      ],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "DATE_RANGE_INVERTED")).toBe(true);
  });

  it("flags a banner placement running entirely outside the reporting period", () => {
    const input: PromotionInputSignal = {
      bannerPlacements: [
        {
          label: "Wrong month banner",
          startDate: new Date("2026-05-01"),
          endDate: new Date("2026-05-15"),
        },
      ],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "PLACEMENT_OUTSIDE_PERIOD")).toBe(
      true,
    );
  });

  it("does not flag a banner placement that overlaps the reporting period", () => {
    const input: PromotionInputSignal = {
      bannerPlacements: [
        {
          label: "Straddling banner",
          startDate: new Date("2026-06-25"),
          endDate: new Date("2026-07-05"),
        },
      ],
    };
    const warnings = checkPromotionInput(input, PERIOD_START, PERIOD_END);
    expect(warnings.some((w) => w.code === "PLACEMENT_OUTSIDE_PERIOD")).toBe(
      false,
    );
  });
});

describe("checkPeriodOutliers", () => {
  it("emits no warnings when there is no previous period to compare against", () => {
    const current: PromotionInputSignal = { impressions: 1_000_000 };
    expect(checkPeriodOutliers(current, null)).toEqual([]);
  });

  it(`flags a ${OUTLIER_PERIOD_MULTIPLIER}x+ month-over-month jump in impressions`, () => {
    const previous: PromotionInputSignal = { impressions: 1000 };
    const current: PromotionInputSignal = {
      impressions: 1000 * OUTLIER_PERIOD_MULTIPLIER + 1,
    };
    const warnings = checkPeriodOutliers(current, previous);
    expect(
      warnings.some((w) => w.code === "VALUE_JUMPED_VS_PREVIOUS_PERIOD"),
    ).toBe(true);
  });

  it("does not flag a 2x month-over-month jump", () => {
    const previous: PromotionInputSignal = { impressions: 1000 };
    const current: PromotionInputSignal = { impressions: 2000 };
    expect(checkPeriodOutliers(current, previous)).toEqual([]);
  });

  it("does not flag exactly at the multiplier boundary", () => {
    const previous: PromotionInputSignal = { impressions: 1000 };
    const current: PromotionInputSignal = {
      impressions: 1000 * OUTLIER_PERIOD_MULTIPLIER,
    };
    expect(checkPeriodOutliers(current, previous)).toEqual([]);
  });

  it("does not flag when the previous period's value was zero (avoids a divide-by-zero-shaped false positive)", () => {
    const previous: PromotionInputSignal = { impressions: 0 };
    const current: PromotionInputSignal = { impressions: 1_000_000 };
    expect(checkPeriodOutliers(current, previous)).toEqual([]);
  });

  it("flags a jump in total banner impressions across placements", () => {
    const previous: PromotionInputSignal = {
      bannerPlacements: [{ label: "A", impressions: 100 }],
    };
    const current: PromotionInputSignal = {
      bannerPlacements: [
        { label: "A", impressions: 500 },
        { label: "B", impressions: 2000 },
      ],
    };
    const warnings = checkPeriodOutliers(current, previous);
    expect(
      warnings.some(
        (w) =>
          w.code === "VALUE_JUMPED_VS_PREVIOUS_PERIOD" &&
          w.field.includes("bannerPlacements"),
      ),
    ).toBe(true);
  });
});
