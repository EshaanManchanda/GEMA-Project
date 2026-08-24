/**
 * Business Report Service (KBOS Phase 1) — the I/O layer.
 *
 * Fetches the vendor, events, orders/tickets analytics, reviews, bookings,
 * and admin-entered promotion input for a period, converts them into the
 * plain-object shapes businessHealth.service.ts's pure functions expect,
 * and assembles/persists VendorBusinessSnapshot documents.
 *
 * Reuses analyticsService for sales/ticket numbers rather than writing new
 * aggregations (see plan §7) — this file's own DB calls are limited to what
 * analyticsService doesn't already expose: vendor profile fields, event
 * listing-quality fields, review stats, and booking cancellation counts.
 */

import mongoose from "mongoose";
import Vendor, { IVendor } from "../models/Vendor";
import Event from "../models/Event";
import Order from "../models/Order";
import Review, { ReviewStatus } from "../models/Review";
import VendorBusinessSnapshot, {
  IVendorBusinessSnapshot,
  DimensionKey,
  IMetricEntry,
  MetricSource,
  ITopEventEntry,
  IScoreTrends,
  ISnapshotBenchmarks,
  ISnapshotIntegrity,
  snapshotSchemaVersion,
} from "../models/VendorBusinessSnapshot";
import {
  buildSealedContent,
  computeSnapshotHash,
} from "./snapshotIntegrity.service";
import { config } from "../config/env";
import VendorPromotionInput from "../models/VendorPromotionInput";
import { analyticsService } from "./analytics.service";
import {
  computeListingScore,
  computeSalesScore,
  computeCustomerScore,
  computeMarketingScore,
  computeOperationsScore,
  computeOverallScore,
  computeConfidence,
  computeProfileCompletion,
  generateRecommendations,
  generateTasks,
  computeTrend,
  VendorProfileSignal,
  ListingEventSignal,
} from "./businessHealth.service";
import {
  RULESET_VERSION,
  REPORT_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
  TEMPLATE_VERSION,
  TOP_EVENTS_LIMIT,
  BENCHMARK_CACHE_TTL_SECONDS,
  BENCHMARK_CACHE_KEY,
} from "../constants/businessHealth.rules";
import { periodToUtcRange, AnalyticsDateRange } from "../utils/dateHelpers";
import { toCsv } from "../utils/csv.utils";
import { AppError } from "../middleware/error";
import logger from "../config/logger";
import cacheService from "./cache.service";
import { invalidateBusinessReportCaches } from "../utils/cache.utils";
import { logReportGeneration } from "./reportObservability.service";
import {
  ReportGenerationOperation,
  ReportGenerationStatus,
  ReportGenerationTrigger,
} from "../models/ReportGenerationLog";

// ─── Period helpers ─────────────────────────────────────────────────────────

export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

/** "YYYY-MM" for the given date (UTC), defaulting to now. Used by the admin overview and the monthly snapshot worker. */
export function periodOfDate(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ─── Vendor health (live computation, no persistence) ──────────────────────

export interface VendorHealthResult {
  vendorId: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  scores: {
    overall: number | null;
    listing: number | null;
    sales: number | null;
    marketing: number | null;
    customer: number | null;
    operations: number | null;
  };
  confidence: ReturnType<typeof computeConfidence>;
  profileCompletion: ReturnType<typeof computeProfileCompletion>;
  metrics: IMetricEntry[];
  topEvents: ITopEventEntry[];
  recommendations: ReturnType<typeof generateRecommendations>;
  tasks: ReturnType<typeof generateTasks>;
  benchmarks: ISnapshotBenchmarks;
}

// ─── Top events leaderboard ─────────────────────────────────────────────────

/**
 * Top N events for the vendor this period, ranked by paid revenue. Frozen
 * into the snapshot at generation time (see generateSnapshot) so a locked
 * report's leaderboard can never silently drift as new orders come in.
 */
async function computeTopEvents(
  eventIds: mongoose.Types.ObjectId[],
  start: Date,
  end: Date,
): Promise<ITopEventEntry[]> {
  if (eventIds.length === 0) return [];

  const revenueByEvent = await Order.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: start, $lte: end },
        "items.eventId": { $in: eventIds },
      },
    },
    { $unwind: "$items" },
    { $match: { "items.eventId": { $in: eventIds } } },
    {
      $group: {
        _id: "$items.eventId",
        revenue: { $sum: "$items.totalPrice" },
        orders: { $sum: 1 },
        tickets: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: TOP_EVENTS_LIMIT },
  ]);

  if (revenueByEvent.length === 0) return [];

  const topEventIds = revenueByEvent.map((r) => r._id);
  const events = await Event.find({ _id: { $in: topEventIds } })
    .select("title images viewsCount averageRating")
    .lean();
  const eventById = new Map(events.map((e) => [e._id.toString(), e]));

  const entries: ITopEventEntry[] = [];
  for (const r of revenueByEvent) {
    const ev = eventById.get(r._id.toString());
    if (!ev) continue;
    entries.push({
      eventId: r._id,
      title: ev.title,
      coverImage: ev.images?.[0],
      revenue: Math.round(r.revenue * 100) / 100,
      orders: r.orders,
      tickets: r.tickets,
      viewsAllTime: ev.viewsCount ?? 0,
      averageRating: ev.averageRating || undefined,
    });
  }
  return entries;
}

// ─── Platform benchmark (real, not fabricated — see businessHealth.service.ts truthfulness rule) ──

/**
 * Average listing photo count across all active, non-deleted events
 * platform-wide. Cached because it's a full collection scan and doesn't
 * meaningfully change between requests — used only to make the
 * LISTING_PHOTO_COUNT recommendation's reason a real comparative statistic
 * instead of a flat product-standard number.
 */
async function getListingPhotoCountBenchmark(): Promise<number | undefined> {
  const cached = await cacheService.get<number>(BENCHMARK_CACHE_KEY);
  if (cached !== null && cached !== undefined) return cached;

  const [result] = await Event.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $project: {
        photoCount: {
          $max: [
            { $size: { $ifNull: ["$imageAssets", []] } },
            { $size: { $ifNull: ["$images", []] } },
          ],
        },
      },
    },
    { $group: { _id: null, avg: { $avg: "$photoCount" } } },
  ]);

  const avg = result?.avg;
  if (typeof avg === "number") {
    await cacheService.set(BENCHMARK_CACHE_KEY, avg, {
      ttl: BENCHMARK_CACHE_TTL_SECONDS,
    });
    return avg;
  }
  return undefined;
}

function vendorProfileSignal(vendor: IVendor): VendorProfileSignal {
  return {
    hasLogo: !!vendor.logo,
    hasCoverImage: !!vendor.coverImage,
    hasProfileVideo: !!vendor.profileVideoUrl,
    descriptionLength: (vendor.description ?? "").length,
    hasBusinessHours:
      !!vendor.businessHours && Object.keys(vendor.businessHours).length > 0,
    hasWebsite: !!(vendor.website || vendor.socialMedia?.website),
    socialLinkCount: [
      vendor.socialMedia?.facebook,
      vendor.socialMedia?.instagram,
      vendor.socialMedia?.twitter,
      vendor.socialMedia?.linkedin,
      vendor.socialMedia?.youtube,
      vendor.socialMedia?.tiktok,
      vendor.socialMedia?.whatsapp,
    ].filter(Boolean).length,
    hasMission: !!vendor.businessProfile?.mission,
    hasVision: !!vendor.businessProfile?.vision,
    hasAwards: (vendor.businessProfile?.awards?.length ?? 0) > 0,
    hasCertifications:
      (vendor.businessProfile?.certifications?.length ?? 0) > 0,
    hasGoogleBusinessUrl: !!vendor.socialMedia?.googleBusinessUrl,
  };
}

function eventListingSignal(ev: {
  images?: string[];
  imageAssets?: mongoose.Types.ObjectId[];
  faqs?: unknown[];
  tags?: string[];
  dateSchedule?: unknown[];
}): ListingEventSignal {
  const photoCount = Math.max(
    ev.imageAssets?.length ?? 0,
    ev.images?.length ?? 0,
  );
  return {
    photoCount,
    hasFaq: (ev.faqs?.length ?? 0) > 0,
    hasTags: (ev.tags?.length ?? 0) > 0,
    hasSchedule: (ev.dateSchedule?.length ?? 0) > 0,
  };
}

/**
 * Compute a vendor's business health for a given period. Pure with respect
 * to the DB (always reads current state) — this is the "live" view served
 * by GET .../health, and is also what generateSnapshot freezes on demand.
 *
 * `options.benchmarks`, when supplied, replays a previously-frozen snapshot
 * (KBOS item 007) instead of fetching the live cached platform benchmark —
 * used by regeneration/replay paths that want deterministic recommendation
 * text. Live GET /health and a frozen snapshot can therefore legitimately
 * disagree on the benchmark number (the platform average moves every hour;
 * a locked snapshot's number is frozen forever). Regenerating a *draft*
 * snapshot always fetches a fresh live benchmark rather than pinning to the
 * old one — regeneration exists to pick up new data.
 */
export async function computeVendorHealth(
  vendorId: string,
  period: string,
  options?: { benchmarks?: ISnapshotBenchmarks },
): Promise<VendorHealthResult> {
  const { start, end } = periodToUtcRange(period);
  const vendorObjId = new mongoose.Types.ObjectId(vendorId);

  const vendor = await Vendor.findById(vendorObjId);
  if (!vendor) throw new AppError("Vendor not found", 404);

  const [
    events,
    orderAnalytics,
    ticketAnalytics,
    eventAnalyticsAllTime,
    reviewAgg,
    bookingAgg,
    promotionInput,
    topEvents,
    listingPhotoBenchmark,
  ] = await Promise.all([
    Event.find({ vendorId: vendorObjId, isDeleted: { $ne: true } })
      .select("images imageAssets faqs tags dateSchedule")
      .lean(),
    analyticsService.getOrderAnalytics(vendorId, {
      start,
      end,
    } as AnalyticsDateRange),
    analyticsService.getTicketAnalytics(vendorId, {
      start,
      end,
    } as AnalyticsDateRange),
    // Views are cumulative (Event.viewsCount is never period-reset), so this
    // is intentionally called without a dateRange — see dateHelpers note.
    analyticsService.getEventAnalytics(vendorId),
    Review.aggregate([
      {
        $match: {
          vendor: vendorObjId,
          status: ReviewStatus.APPROVED,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]),
    // Bookings are ticket purchases (Order.items.quantity), not the `Booking`
    // model — nothing in the real purchase flow ever writes a Booking
    // document (see vendor.service.ts / dashboard-optimized.service.ts for
    // the same pattern), so counting against it always returned 0 and
    // silently zeroed out the whole Operations dimension.
    (async () => {
      const eventIds = await Event.find({ vendorId: vendorObjId }).distinct(
        "_id",
      );
      const [agg] = await Order.aggregate([
        {
          $match: {
            "items.eventId": { $in: eventIds },
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $unwind: "$items" },
        { $match: { "items.eventId": { $in: eventIds } } },
        {
          $group: {
            _id: null,
            totalBookings: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "paid"] },
                  "$items.quantity",
                  0,
                ],
              },
            },
            cancelledBookings: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "cancelled"] },
                  "$items.quantity",
                  0,
                ],
              },
            },
          },
        },
      ]);
      return {
        totalBookings: agg?.totalBookings ?? 0,
        cancelledBookings: agg?.cancelledBookings ?? 0,
      };
    })(),
    VendorPromotionInput.findOne({ vendorId: vendorObjId, period }).lean(),
    (async () => {
      const eventIds = await Event.find({ vendorId: vendorObjId }).distinct(
        "_id",
      );
      return computeTopEvents(eventIds, start, end);
    })(),
    options?.benchmarks
      ? Promise.resolve(options.benchmarks.averageListingPhotoCount)
      : getListingPhotoCountBenchmark(),
  ]);

  const benchmarks: ISnapshotBenchmarks = options?.benchmarks ?? {
    averageListingPhotoCount: listingPhotoBenchmark,
    capturedAt: new Date(),
  };

  // ── Dimension inputs ──
  const listing = computeListingScore({
    profile: vendorProfileSignal(vendor),
    events: events.map(eventListingSignal),
  });

  const sales = computeSalesScore({
    totalOrders: orderAnalytics.totalOrders,
    totalRevenue: orderAnalytics.totalRevenue,
    averageOrderValue: orderAnalytics.averageOrderValue,
    refundRatePct: orderAnalytics.refundRate,
    viewToOrderRatePct: orderAnalytics.viewToOrderRate,
  });

  const reviewStats = reviewAgg[0] ?? { total: 0, avgRating: 0 };
  const customer = computeCustomerScore({
    averageRating: reviewStats.avgRating ?? 0,
    totalReviews: reviewStats.total ?? 0,
  });

  const manualReachTotal = promotionInput?.socialReach
    ? Object.values(promotionInput.socialReach).reduce(
        (sum: number, v) => sum + (typeof v === "number" ? v : 0),
        0,
      )
    : 0;
  const manualReachProvided =
    manualReachTotal > 0 || (promotionInput?.impressions ?? 0) > 0;

  const marketing = computeMarketingScore({
    totalViews: eventAnalyticsAllTime.totalViews,
    viewToBookingRatePct: orderAnalytics.viewToOrderRate,
    manualReachProvided,
    totalManualReach: manualReachProvided ? manualReachTotal : undefined,
  });

  const operations = computeOperationsScore({
    totalBookings: bookingAgg.totalBookings,
    cancelledBookings: bookingAgg.cancelledBookings,
    checkInRatePct: ticketAnalytics.checkInRate,
  });

  const dimensionScores: Record<DimensionKey, number | null> = {
    listing: listing.score,
    sales: sales.score,
    marketing: marketing.score,
    customer: customer.score,
    operations: operations.score,
  };

  const profileCompletion = computeProfileCompletion(
    vendorProfileSignal(vendor),
  );
  const recommendations = generateRecommendations({
    listing,
    sales,
    marketing,
    customer,
    operations,
    profileCompletion,
    benchmarks,
  });
  const tasks = generateTasks(recommendations);

  const metrics = buildMetricEntries({
    orderAnalytics,
    ticketAnalytics,
    reviewStats,
    bookingAgg,
    eventAnalyticsAllTime,
    promotionInput,
    listingFacts: listing.facts,
  });

  return {
    vendorId,
    period,
    periodStart: start,
    periodEnd: end,
    scores: {
      overall: computeOverallScore(dimensionScores),
      ...dimensionScores,
    },
    confidence: computeConfidence(dimensionScores),
    profileCompletion,
    metrics,
    topEvents,
    recommendations,
    tasks,
    benchmarks,
  };
}

function metric(
  key: string,
  label: string,
  value: number | null,
  unit: string | undefined,
  source: MetricSource,
): IMetricEntry {
  return { key, label, value, unit, source };
}

function buildMetricEntries(args: {
  orderAnalytics: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  ticketAnalytics: { checkInRate: number; totalTickets: number };
  reviewStats: { total: number; avgRating: number };
  bookingAgg: { totalBookings: number; cancelledBookings: number };
  eventAnalyticsAllTime: {
    totalViews: number;
    totalEvents: number;
    activeEvents: number;
  };
  promotionInput: {
    socialReach?: Record<string, number>;
    impressions?: number;
  } | null;
  listingFacts: Record<string, unknown>;
}): IMetricEntry[] {
  const entries: IMetricEntry[] = [
    metric(
      "totalRevenue",
      "Revenue",
      args.orderAnalytics.totalRevenue,
      "AED",
      "auto",
    ),
    metric(
      "totalBookings",
      "Bookings",
      args.bookingAgg.totalBookings,
      undefined,
      "auto",
    ),
    metric(
      "totalEvents",
      "Events",
      args.eventAnalyticsAllTime.totalEvents,
      undefined,
      "auto",
    ),
    metric(
      "activeEvents",
      "Active Events",
      args.eventAnalyticsAllTime.activeEvents,
      undefined,
      "auto",
    ),
    metric(
      "averageOrderValue",
      "Average Order Value",
      args.orderAnalytics.averageOrderValue,
      "AED",
      "auto",
    ),
    metric(
      "totalViews",
      "Total Views",
      args.eventAnalyticsAllTime.totalViews,
      undefined,
      "auto",
    ),
    metric(
      "averageRating",
      "Average Rating",
      args.reviewStats.total > 0 ? args.reviewStats.avgRating : null,
      "/5",
      "auto",
    ),
    metric(
      "totalReviews",
      "Total Reviews",
      args.reviewStats.total,
      undefined,
      "auto",
    ),
    metric(
      "cancellationRate",
      "Cancellation Rate",
      args.bookingAgg.totalBookings > 0
        ? Math.round(
            (args.bookingAgg.cancelledBookings /
              args.bookingAgg.totalBookings) *
              1000,
          ) / 10
        : null,
      "%",
      "auto",
    ),
    metric(
      "checkInRate",
      "Check-In Rate",
      args.ticketAnalytics.totalTickets > 0
        ? args.ticketAnalytics.checkInRate
        : null,
      "%",
      "auto",
    ),
    metric(
      "listingPhotoCount",
      "Average Listing Photos",
      (args.listingFacts.averagePhotoCount as number | undefined) ?? null,
      undefined,
      "auto",
    ),
  ];

  if (args.promotionInput?.socialReach) {
    const reach = args.promotionInput.socialReach;
    entries.push(
      metric(
        "instagramReach",
        "Instagram Reach",
        reach.instagram ?? null,
        undefined,
        "manual",
      ),
      metric(
        "facebookReach",
        "Facebook Reach",
        reach.facebook ?? null,
        undefined,
        "manual",
      ),
      metric(
        "tiktokReach",
        "TikTok Reach",
        reach.tiktok ?? null,
        undefined,
        "manual",
      ),
      metric(
        "youtubeReach",
        "YouTube Reach",
        reach.youtube ?? null,
        undefined,
        "manual",
      ),
    );
  }
  if (args.promotionInput?.impressions !== undefined) {
    entries.push(
      metric(
        "impressions",
        "Impressions",
        args.promotionInput.impressions ?? null,
        undefined,
        "manual",
      ),
    );
  }

  return entries;
}

// ─── Snapshot generation (freeze + persist) ─────────────────────────────────

export interface GenerateSnapshotOptions {
  generatedBy: "manual" | "scheduled";
  actorId?: string; // required when generatedBy === "manual"
  /**
   * Observability trigger label — distinguishes admin/vendor/bulk callers
   * that all pass generatedBy: "manual". Defaults from generatedBy when
   * omitted (scheduled -> SCHEDULED, manual -> ADMIN_REQUEST) so existing
   * callers that don't pass this keep working.
   */
  trigger?: ReportGenerationTrigger;
}

function defaultTrigger(
  generatedBy: "manual" | "scheduled",
): ReportGenerationTrigger {
  return generatedBy === "scheduled"
    ? ReportGenerationTrigger.SCHEDULED
    : ReportGenerationTrigger.ADMIN_REQUEST;
}

/**
 * Freeze the current live health computation into a persisted
 * VendorBusinessSnapshot, applying trend deltas against the previous
 * period's snapshot (if any). Throws 409 if the snapshot for this period is
 * already locked — only a draft can be regenerated (see plan §6).
 *
 * Every path through this function writes exactly one ReportGenerationLog
 * row (SKIPPED_LOCKED / SUCCEEDED / FAILED) via logReportGeneration, which
 * itself never throws — observability can't fail the operation it observes.
 */
export async function generateSnapshot(
  vendorId: string,
  period: string,
  options: GenerateSnapshotOptions,
): Promise<InstanceType<typeof VendorBusinessSnapshot>> {
  const start = Date.now();
  const trigger = options.trigger ?? defaultTrigger(options.generatedBy);
  const vendorObjId = new mongoose.Types.ObjectId(vendorId);

  const existing = await VendorBusinessSnapshot.findOne({
    vendorId: vendorObjId,
    period,
  });
  if (existing && existing.status === "locked") {
    await logReportGeneration({
      operation: ReportGenerationOperation.SNAPSHOT_GENERATE,
      status: ReportGenerationStatus.SKIPPED_LOCKED,
      trigger,
      vendorId: vendorObjId,
      period,
      snapshotId: existing._id,
      actorId: options.actorId
        ? new mongoose.Types.ObjectId(options.actorId)
        : undefined,
      durationMs: Date.now() - start,
    });
    throw new AppError(
      "This snapshot is locked. Reopen it before regenerating.",
      409,
    );
  }

  try {
    const computeStart = Date.now();
    const [health, previousSnapshot] = await Promise.all([
      computeVendorHealth(vendorId, period),
      VendorBusinessSnapshot.findOne({
        vendorId: vendorObjId,
        period: previousPeriod(period),
      }).lean(),
    ]);
    const computeMs = Date.now() - computeStart;

    const metricsWithTrend = health.metrics.map((m) => {
      const prev = previousSnapshot?.metrics.find((pm) => pm.key === m.key);
      const trend = computeTrend(m.value, prev?.value);
      return { ...m, ...trend };
    });

    const scoreTrends: IScoreTrends = {};
    (
      [
        "overall",
        "listing",
        "sales",
        "marketing",
        "customer",
        "operations",
      ] as const
    ).forEach((dim) => {
      const trend = computeTrend(
        health.scores[dim],
        previousSnapshot?.scores?.[dim] ?? undefined,
      );
      if (trend.direction) scoreTrends[dim] = trend;
    });

    const actorObjId = options.actorId
      ? new mongoose.Types.ObjectId(options.actorId)
      : undefined;

    const auditEntry = {
      action: existing ? ("regenerated" as const) : ("created" as const),
      actorId: actorObjId ?? vendorObjId, // scheduled runs have no human actor; attribute to the vendor record for traceability
      at: new Date(),
    };

    // Hoisted so the value hashed below and the value written to
    // `generatedAt` are the exact same Date instance — otherwise a
    // microsecond drift between two `new Date()` calls would make every
    // freshly generated snapshot fail its own integrity check.
    const generatedAt = new Date();

    // A missing secret must never take down snapshot generation — that
    // would turn one unset env var into a total outage of the whole
    // feature. Skipping the hash leaves `integrity` unset, which
    // verifySnapshotHash already treats as the legitimate "unhashed"
    // status (never fabricated as "mismatch").
    let integrity: ISnapshotIntegrity | undefined;
    if (config.reportIntegritySecret) {
      const sealedContent = buildSealedContent({
        vendorId: vendorObjId,
        period,
        periodStart: health.periodStart,
        periodEnd: health.periodEnd,
        scores: health.scores,
        scoreTrends,
        profileCompletion: health.profileCompletion,
        confidence: health.confidence,
        metrics: metricsWithTrend,
        topEvents: health.topEvents,
        recommendations: health.recommendations,
        benchmarks: health.benchmarks,
        rulesetVersion: RULESET_VERSION,
        reportVersion: REPORT_VERSION,
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        generatedAt,
        generatedBy: options.generatedBy,
        generatedByUserId: actorObjId,
        tasks: health.tasks,
      });
      integrity = {
        algorithm: "hmac-sha256",
        contentHash: computeSnapshotHash(
          sealedContent,
          config.reportIntegritySecret,
        ),
        contentVersion: SNAPSHOT_SCHEMA_VERSION,
        hashedAt: generatedAt,
        keyId: config.reportIntegrityKeyId,
      };
    } else {
      logger.warn(
        "REPORT_INTEGRITY_SECRET is not set — snapshot generated without an integrity checksum.",
      );
    }

    // $set with an explicit `undefined` value is not a safe way to leave a
    // field absent — the MongoDB driver serializes `undefined` as BSON
    // `null` rather than omitting the key, which Mongoose then casts back
    // into an empty subdocument (truthy, but with every subfield
    // undefined) instead of a genuinely absent `integrity` path. $unset is
    // the only way to guarantee "no integrity block" when the secret is
    // unavailable.
    const versionedFields: Record<string, unknown> = {
      periodStart: health.periodStart,
      periodEnd: health.periodEnd,
      scores: health.scores,
      scoreTrends,
      profileCompletion: health.profileCompletion,
      confidence: health.confidence,
      metrics: metricsWithTrend,
      topEvents: health.topEvents,
      recommendations: health.recommendations,
      tasks: health.tasks,
      benchmarks: health.benchmarks,
      status: "draft",
      rulesetVersion: RULESET_VERSION,
      reportVersion: REPORT_VERSION,
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      generatedAt,
      generatedBy: options.generatedBy,
      generatedByUserId: actorObjId,
    };
    if (integrity) versionedFields.integrity = integrity;

    const doc = await VendorBusinessSnapshot.findOneAndUpdate(
      { vendorId: vendorObjId, period },
      {
        $set: versionedFields,
        ...(integrity ? {} : { $unset: { integrity: "" } }),
        $setOnInsert: {
          vendorId: vendorObjId,
          period,
          notes: {},
        },
        $push: { auditTrail: auditEntry },
      },
      { upsert: true, new: true },
    );

    // Covers all three callers that reach this function (vendor/admin
    // download route's generate-on-first-request, admin manual generate,
    // monthly worker) in one place rather than at each call site.
    await invalidateBusinessReportCaches(vendorId, period);

    await logReportGeneration({
      operation: ReportGenerationOperation.SNAPSHOT_GENERATE,
      status: ReportGenerationStatus.SUCCEEDED,
      trigger,
      vendorId: vendorObjId,
      period,
      snapshotId: doc._id,
      actorId: actorObjId,
      durationMs: Date.now() - start,
      computeMs,
      rulesetVersion: RULESET_VERSION,
    });

    return doc;
  } catch (error) {
    if (error instanceof AppError) throw error;
    await logReportGeneration({
      operation: ReportGenerationOperation.SNAPSHOT_GENERATE,
      status: ReportGenerationStatus.FAILED,
      trigger,
      vendorId: vendorObjId,
      period,
      actorId: options.actorId
        ? new mongoose.Types.ObjectId(options.actorId)
        : undefined,
      durationMs: Date.now() - start,
      errorMessage: (error as Error)?.message,
    });
    throw error;
  }
}

// ─── History ────────────────────────────────────────────────────────────────

export interface SnapshotHistoryEntry {
  period: string;
  periodStart: Date;
  scores: IVendorBusinessSnapshot["scores"];
  confidence: IVendorBusinessSnapshot["confidence"];
  status: IVendorBusinessSnapshot["status"];
}

export async function getSnapshotHistory(
  vendorId: string,
  limit = 24,
): Promise<SnapshotHistoryEntry[]> {
  const docs = await VendorBusinessSnapshot.find({
    vendorId: new mongoose.Types.ObjectId(vendorId),
    status: { $ne: "archived" },
  })
    .select("period periodStart scores confidence status")
    .sort({ periodStart: 1 })
    .limit(limit)
    .lean();

  return docs.map((d) => ({
    period: d.period,
    periodStart: d.periodStart,
    scores: d.scores,
    confidence: d.confidence,
    status: d.status,
  }));
}

// ─── Vendor.stats refresh ────────────────────────────────────────────────────

/**
 * Recompute Vendor.stats (totalEvents, totalBookings, totalRevenue,
 * averageRating, totalReviews) from live, all-time data. Nothing in the
 * codebase currently keeps this cached block up to date (see plan risk
 * notes) — the monthly snapshot worker is the first scheduled owner of this
 * refresh, done as a side effect while it already has each vendor open.
 */
export async function refreshVendorStats(vendorId: string): Promise<void> {
  const vendorObjId = new mongoose.Types.ObjectId(vendorId);

  const [eventAnalytics, orderAnalytics, reviewAgg, eventIds] =
    await Promise.all([
      analyticsService.getEventAnalytics(vendorId),
      analyticsService.getOrderAnalytics(vendorId),
      Review.aggregate([
        { $match: { vendor: vendorObjId, status: ReviewStatus.APPROVED } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ]),
      Event.find({ vendorId: vendorObjId }).distinct("_id"),
    ]);

  // Same real ticket-purchase source as computeVendorHealth's bookingAgg —
  // see the comment there for why this can't be the `Booking` model.
  const [bookingAgg] = await Order.aggregate([
    {
      $match: { "items.eventId": { $in: eventIds }, paymentStatus: "paid" },
    },
    { $unwind: "$items" },
    { $match: { "items.eventId": { $in: eventIds } } },
    { $group: { _id: null, totalBookings: { $sum: "$items.quantity" } } },
  ]);
  const totalBookings = bookingAgg?.totalBookings ?? 0;
  const reviewStats = reviewAgg[0] ?? { total: 0, avgRating: 0 };

  await Vendor.findByIdAndUpdate(vendorObjId, {
    $set: {
      stats: {
        totalEvents: eventAnalytics.totalEvents,
        totalBookings,
        totalRevenue: orderAnalytics.totalRevenue,
        averageRating: Math.round((reviewStats.avgRating ?? 0) * 10) / 10,
        totalReviews: reviewStats.total ?? 0,
        lastCalculatedAt: new Date(),
      },
    },
  });
}

// ─── Report payload (confidentiality boundary) ──────────────────────────────

export interface ReportPayload {
  vendor: {
    businessName: string;
    logo?: string;
    coverImage?: string;
    description?: string;
    website?: string;
    socialMedia?: IVendor["socialMedia"];
    verificationStatus?: string;
    memberSince?: Date;
    allTimeStats?: {
      totalEvents: number;
      totalBookings: number;
      totalRevenue: number;
      averageRating: number;
      totalReviews: number;
    };
  };
  period: string;
  periodStart: Date;
  periodEnd: Date;
  scores: IVendorBusinessSnapshot["scores"];
  scoreTrends: IVendorBusinessSnapshot["scoreTrends"];
  confidence: IVendorBusinessSnapshot["confidence"];
  profileCompletion: IVendorBusinessSnapshot["profileCompletion"];
  metrics: IVendorBusinessSnapshot["metrics"];
  topEvents: IVendorBusinessSnapshot["topEvents"];
  recommendations: IVendorBusinessSnapshot["recommendations"];
  tasks: IVendorBusinessSnapshot["tasks"];
  /** Platform benchmarks as they stood at generation time; absent on legacy snapshots — never fabricated. */
  benchmarks?: IVendorBusinessSnapshot["benchmarks"];
  vendorVisibleNotes?: string;
  rulesetVersion: string;
  reportVersion: string;
  /** Shape of the source snapshot doc; inferred as legacy when absent — see snapshotSchemaVersion(). */
  schemaVersion: number;
  /** PDF/HTML layout version at render time — not persisted on the snapshot, see reportTemplate.service.ts footer. */
  templateVersion: string;
  generatedAt: Date;
}

/**
 * The confidentiality boundary for this feature: every render/export path
 * (PDF, CSV, any future format) must go through this function rather than
 * touching the snapshot document directly. It strips `notes.internal` and
 * `auditTrail` — admin-only commercial context and provenance data that
 * must never reach a vendor-facing document. See plan §5.
 */
export function toReportPayload(
  snapshot: IVendorBusinessSnapshot,
  vendor: Pick<
    IVendor,
    | "businessName"
    | "logo"
    | "coverImage"
    | "description"
    | "website"
    | "socialMedia"
    | "verificationStatus"
    | "createdAt"
    | "stats"
  >,
): ReportPayload {
  return {
    vendor: {
      businessName: vendor.businessName,
      logo: vendor.logo,
      coverImage: vendor.coverImage,
      description: vendor.description,
      website: vendor.website,
      socialMedia: vendor.socialMedia,
      verificationStatus: vendor.verificationStatus,
      memberSince: vendor.createdAt,
      allTimeStats: vendor.stats
        ? {
            totalEvents: vendor.stats.totalEvents,
            totalBookings: vendor.stats.totalBookings,
            totalRevenue: vendor.stats.totalRevenue,
            averageRating: vendor.stats.averageRating,
            totalReviews: vendor.stats.totalReviews,
          }
        : undefined,
    },
    period: snapshot.period,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    scores: snapshot.scores,
    scoreTrends: snapshot.scoreTrends ?? {},
    confidence: snapshot.confidence,
    profileCompletion: snapshot.profileCompletion,
    metrics: snapshot.metrics,
    topEvents: snapshot.topEvents ?? [],
    recommendations: snapshot.recommendations,
    tasks: snapshot.tasks,
    benchmarks: snapshot.benchmarks,
    vendorVisibleNotes: snapshot.notes?.vendorVisible,
    rulesetVersion: snapshot.rulesetVersion,
    reportVersion: snapshot.reportVersion,
    schemaVersion: snapshotSchemaVersion(snapshot),
    templateVersion: TEMPLATE_VERSION,
    generatedAt: snapshot.generatedAt,
  };
}

// ─── CSV renderer ───────────────────────────────────────────────────────────

/** Render a ReportPayload as a multi-section CSV string, mirroring eventReportToCsv's structure. */
export function reportPayloadToCsv(payload: ReportPayload): string {
  const rows: Record<string, unknown>[] = [];

  rows.push({
    Section: "Report Info",
    Field: "Vendor",
    Value: payload.vendor.businessName,
  });
  rows.push({ Section: "", Field: "Period", Value: payload.period });
  rows.push({
    Section: "",
    Field: "Generated At",
    Value: payload.generatedAt.toISOString(),
  });
  rows.push({
    Section: "",
    Field: "Report / Ruleset Version",
    Value: `v${payload.reportVersion} / v${payload.rulesetVersion}`,
  });
  rows.push({});

  const trendCell = (dim: "overall" | DimensionKey): string => {
    const t = payload.scoreTrends?.[dim];
    if (!t?.direction) return "";
    const arrow = t.direction === "up" ? "+" : t.direction === "down" ? "" : "";
    return t.changePercent !== undefined
      ? `${arrow}${t.changePercent}% vs last period`
      : "";
  };

  rows.push({
    Section: "Scores",
    Dimension: "Overall",
    Score: payload.scores.overall ?? "Not tracked",
    Trend: trendCell("overall"),
  });
  rows.push({
    Section: "",
    Dimension: "Listing",
    Score: payload.scores.listing ?? "Not tracked",
    Trend: trendCell("listing"),
  });
  rows.push({
    Section: "",
    Dimension: "Sales",
    Score: payload.scores.sales ?? "Not tracked",
    Trend: trendCell("sales"),
  });
  rows.push({
    Section: "",
    Dimension: "Marketing",
    Score: payload.scores.marketing ?? "Not tracked",
    Trend: trendCell("marketing"),
  });
  rows.push({
    Section: "",
    Dimension: "Customer",
    Score: payload.scores.customer ?? "Not tracked",
    Trend: trendCell("customer"),
  });
  rows.push({
    Section: "",
    Dimension: "Operations",
    Score: payload.scores.operations ?? "Not tracked",
    Trend: trendCell("operations"),
  });
  rows.push({
    Section: "",
    Dimension: "Confidence",
    Score: `${payload.confidence.level} (${payload.confidence.dimensionsScored}/${payload.confidence.dimensionsTotal})`,
  });
  rows.push({});

  rows.push({
    Section: "Profile Completion",
    Field: "Percent",
    Value: `${payload.profileCompletion.percent}%`,
  });
  for (const item of payload.profileCompletion.items) {
    rows.push({
      Section: "",
      Field: item.label,
      Value: item.done ? "Yes" : "No",
    });
  }
  rows.push({});

  rows.push({ Section: "Metrics", Key: "Key", Value: "Value", Trend: "Trend" });
  for (const m of payload.metrics) {
    rows.push({
      Section: "",
      Key: m.label,
      Value: m.value === null ? "Not tracked" : `${m.value}${m.unit ?? ""}`,
      Trend:
        m.direction && m.changePercent !== undefined
          ? `${m.direction === "up" ? "+" : m.direction === "down" ? "" : ""}${m.changePercent}%`
          : "",
    });
  }
  rows.push({});

  if (payload.topEvents.length > 0) {
    rows.push({
      Section: "Top Events",
      Event: "Event",
      Revenue: "Revenue",
      Orders: "Orders",
      Tickets: "Tickets",
      Views: "Views (all-time)",
      Rating: "Rating",
    });
    for (const e of payload.topEvents) {
      rows.push({
        Section: "",
        Event: e.title,
        Revenue: e.revenue,
        Orders: e.orders,
        Tickets: e.tickets,
        Views: e.viewsAllTime,
        Rating: e.averageRating ? e.averageRating.toFixed(1) : "—",
      });
    }
    rows.push({});
  }

  rows.push({
    Section: "Recommendations",
    Severity: "Severity",
    Title: "Title",
    Current: "Current",
    Target: "Target",
    Reason: "Reason",
  });
  for (const r of payload.recommendations) {
    rows.push({
      Section: "",
      Severity: r.severity,
      Title: r.title,
      Current: r.currentValue,
      Target: r.targetValue,
      Reason: r.reason,
    });
  }

  if (payload.tasks.length > 0) {
    rows.push({});
    rows.push({ Section: "Action Items", Status: "Status", Task: "Task" });
    for (const t of payload.tasks) {
      rows.push({
        Section: "",
        Status: t.done ? "Done" : "Open",
        Task: t.label,
      });
    }
  }

  if (payload.vendorVisibleNotes) {
    rows.push({});
    rows.push({
      Section: "Notes",
      Field: "Observations",
      Value: payload.vendorVisibleNotes,
    });
  }

  return toCsv(rows);
}
