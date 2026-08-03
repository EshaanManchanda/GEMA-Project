/**
 * Promotion Input Quality (KBOS hardening, item 008).
 *
 * Pure, DB-free — mirrors the purity rule in businessHealth.service.ts
 * (dates are always inputs, no Date.now(), no randomness) but is kept in
 * its own module rather than folded into businessHealth.service.ts:
 * checking manual-input plausibility isn't scoring, and this file's own
 * test suite should stay separate from that module's 500+-line one.
 *
 * Two tiers of defense against bad manual data:
 *  - Hard caps (businessReport.validator.ts + VendorPromotionInput schema)
 *    reject physically-impossible values outright.
 *  - This module flags merely-suspicious values (well below the hard caps,
 *    or inconsistent across fields/periods) as non-blocking `warnings` in
 *    the upsert response — following the existing ValidationReport/
 *    ValidationWarning precedent in bulk-data.service.ts /
 *    types/bulk-import.types.ts. Nothing here rejects a save.
 */

import {
  OUTLIER_SOCIAL_REACH_WARN,
  OUTLIER_IMPRESSIONS_WARN,
  OUTLIER_CAMPAIGN_COST_WARN,
  OUTLIER_PERIOD_MULTIPLIER,
} from "../constants/businessHealth.rules";

export interface InputWarning {
  /** Dot/bracket path into the input, e.g. "bannerPlacements[0].clicks" */
  field: string;
  code: string;
  message: string;
  severity: "warning";
  value?: number;
}

export interface PromotionInputSignal {
  socialReach?: {
    instagram?: number;
    facebook?: number;
    tiktok?: number;
    youtube?: number;
  };
  impressions?: number;
  bannerPlacements?: Array<{
    label: string;
    impressions?: number;
    clicks?: number;
    startDate?: Date;
    endDate?: Date;
  }>;
  featuredListings?: Array<{
    eventTitle: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  topPosts?: Array<{
    platform: string;
    reach?: number;
    engagement?: number;
  }>;
  offlineCampaigns?: Array<{
    label: string;
    cost?: number;
    startDate?: Date;
    endDate?: Date;
  }>;
}

function warn(
  field: string,
  code: string,
  message: string,
  value?: number,
): InputWarning {
  return { field, code, message, severity: "warning", value };
}

/**
 * Cross-field sanity and single-period plausibility checks. `periodStart`/
 * `periodEnd` are explicit inputs (not derived from Date.now()) so date-range
 * checks stay pure and testable.
 */
export function checkPromotionInput(
  input: PromotionInputSignal,
  periodStart: Date,
  periodEnd: Date,
): InputWarning[] {
  const warnings: InputWarning[] = [];

  const reach = input.socialReach;
  if (reach) {
    (["instagram", "facebook", "tiktok", "youtube"] as const).forEach(
      (platform) => {
        const value = reach[platform];
        if (value !== undefined && value > OUTLIER_SOCIAL_REACH_WARN) {
          warnings.push(
            warn(
              `socialReach.${platform}`,
              "SOCIAL_REACH_IMPLAUSIBLE",
              `${platform} reach of ${value.toLocaleString()} is unusually high — please double-check this figure.`,
              value,
            ),
          );
        }
      },
    );
  }

  if (
    input.impressions !== undefined &&
    input.impressions > OUTLIER_IMPRESSIONS_WARN
  ) {
    warnings.push(
      warn(
        "impressions",
        "IMPRESSIONS_IMPLAUSIBLE",
        `Impressions of ${input.impressions.toLocaleString()} is unusually high — please double-check this figure.`,
        input.impressions,
      ),
    );
  }

  (input.bannerPlacements ?? []).forEach((banner, i) => {
    if (
      banner.impressions !== undefined &&
      banner.clicks !== undefined &&
      banner.clicks > banner.impressions
    ) {
      warnings.push(
        warn(
          `bannerPlacements[${i}].clicks`,
          "BANNER_CLICKS_EXCEED_IMPRESSIONS",
          `"${banner.label}" has more clicks (${banner.clicks}) than impressions (${banner.impressions}).`,
          banner.clicks,
        ),
      );
    }
    if (dateRangeInverted(banner.startDate, banner.endDate)) {
      warnings.push(
        warn(
          `bannerPlacements[${i}]`,
          "DATE_RANGE_INVERTED",
          `"${banner.label}" has an end date before its start date.`,
        ),
      );
    }
    if (
      placementOutsidePeriod(
        banner.startDate,
        banner.endDate,
        periodStart,
        periodEnd,
      )
    ) {
      warnings.push(
        warn(
          `bannerPlacements[${i}]`,
          "PLACEMENT_OUTSIDE_PERIOD",
          `"${banner.label}" runs outside the ${periodStart.toISOString().slice(0, 7)} reporting period.`,
        ),
      );
    }
  });

  (input.featuredListings ?? []).forEach((listing, i) => {
    if (dateRangeInverted(listing.startDate, listing.endDate)) {
      warnings.push(
        warn(
          `featuredListings[${i}]`,
          "DATE_RANGE_INVERTED",
          `"${listing.eventTitle}" has an end date before its start date.`,
        ),
      );
    }
    if (
      placementOutsidePeriod(
        listing.startDate,
        listing.endDate,
        periodStart,
        periodEnd,
      )
    ) {
      warnings.push(
        warn(
          `featuredListings[${i}]`,
          "PLACEMENT_OUTSIDE_PERIOD",
          `"${listing.eventTitle}" runs outside the ${periodStart.toISOString().slice(0, 7)} reporting period.`,
        ),
      );
    }
  });

  (input.topPosts ?? []).forEach((post, i) => {
    if (
      post.reach !== undefined &&
      post.engagement !== undefined &&
      post.engagement > post.reach
    ) {
      warnings.push(
        warn(
          `topPosts[${i}].engagement`,
          "POST_ENGAGEMENT_EXCEEDS_REACH",
          `A ${post.platform} post has more engagement (${post.engagement}) than reach (${post.reach}).`,
          post.engagement,
        ),
      );
    }
  });

  (input.offlineCampaigns ?? []).forEach((campaign, i) => {
    if (
      campaign.cost !== undefined &&
      campaign.cost > OUTLIER_CAMPAIGN_COST_WARN
    ) {
      warnings.push(
        warn(
          `offlineCampaigns[${i}].cost`,
          "CAMPAIGN_COST_IMPLAUSIBLE",
          `"${campaign.label}" costs ${campaign.cost.toLocaleString()} — please double-check this figure.`,
          campaign.cost,
        ),
      );
    }
    if (dateRangeInverted(campaign.startDate, campaign.endDate)) {
      warnings.push(
        warn(
          `offlineCampaigns[${i}]`,
          "DATE_RANGE_INVERTED",
          `"${campaign.label}" has an end date before its start date.`,
        ),
      );
    }
  });

  return warnings;
}

/**
 * Flags a value more than OUTLIER_PERIOD_MULTIPLIER times the previous
 * period's — catches the "extra zero" typo that absolute caps never will.
 * Returns [] when there is no previous period to compare against — no
 * fabricated baseline, mirroring computeTrend's contract in
 * businessHealth.service.ts.
 */
export function checkPeriodOutliers(
  current: PromotionInputSignal,
  previous: PromotionInputSignal | null,
): InputWarning[] {
  if (!previous) return [];

  const warnings: InputWarning[] = [];

  const jumped = (
    field: string,
    code: string,
    curr?: number,
    prev?: number,
  ) => {
    if (
      curr !== undefined &&
      prev !== undefined &&
      prev > 0 &&
      curr > prev * OUTLIER_PERIOD_MULTIPLIER
    ) {
      warnings.push(
        warn(
          field,
          code,
          `${field} jumped from ${prev.toLocaleString()} to ${curr.toLocaleString()} — more than ${OUTLIER_PERIOD_MULTIPLIER}x the previous period. Please confirm this is correct.`,
          curr,
        ),
      );
    }
  };

  (["instagram", "facebook", "tiktok", "youtube"] as const).forEach(
    (platform) => {
      jumped(
        `socialReach.${platform}`,
        "VALUE_JUMPED_VS_PREVIOUS_PERIOD",
        current.socialReach?.[platform],
        previous.socialReach?.[platform],
      );
    },
  );

  jumped(
    "impressions",
    "VALUE_JUMPED_VS_PREVIOUS_PERIOD",
    current.impressions,
    previous.impressions,
  );

  const sumBannerImpressions = (
    signal: PromotionInputSignal,
  ): number | undefined => {
    const banners = signal.bannerPlacements ?? [];
    if (banners.length === 0) return undefined;
    return banners.reduce((sum, b) => sum + (b.impressions ?? 0), 0);
  };
  jumped(
    "bannerPlacements[].impressions (total)",
    "VALUE_JUMPED_VS_PREVIOUS_PERIOD",
    sumBannerImpressions(current),
    sumBannerImpressions(previous),
  );

  return warnings;
}

function dateRangeInverted(start?: Date, end?: Date): boolean {
  return !!start && !!end && end.getTime() < start.getTime();
}

function placementOutsidePeriod(
  start: Date | undefined,
  end: Date | undefined,
  periodStart: Date,
  periodEnd: Date,
): boolean {
  if (!start && !end) return false;
  if (start && start.getTime() > periodEnd.getTime()) return true;
  if (end && end.getTime() < periodStart.getTime()) return true;
  return false;
}
