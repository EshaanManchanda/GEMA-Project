import { PipelineStage } from "mongoose";
import PageView from "../models/PageView";
import AnalyticsEvent from "../models/AnalyticsEvent";
import AnalyticsDaily, { ICount } from "../models/AnalyticsDaily";
import User, { UserRole } from "../models/User";
import logger from "../config/logger";

/** A visitor is the persistent browser id; older rows only have the tab session. */
export const VISITOR = { $ifNull: ["$visitorId", "$sessionId"] };
export const HUMAN = { device: { $ne: "bot" } };

/** Accounts that count as audience registrations (staff accounts excluded). */
export const AUDIENCE_ROLES = [
  UserRole.CUSTOMER,
  UserRole.PARENT,
  UserRole.STUDENT,
  UserRole.VENDOR,
  UserRole.TEACHER,
];

const countBy = (field: string, limit = 20): PipelineStage.FacetPipelineStage[] => [
  { $group: { _id: { $ifNull: [field, "unknown"] }, n: { $sum: 1 } } },
  { $sort: { n: -1, _id: 1 } }, // tie-break so re-runs give identical rows
  { $limit: limit },
  { $project: { _id: 0, key: { $toString: "$_id" }, n: 1 } },
];

/**
 * Traffic totals for [from, to), straight from the raw collections. Used by
 * the nightly rollup and by the admin dashboards for live (≤ 90 day) ranges.
 */
export async function trafficStats(from: Date, to: Date) {
  const match = { timestamp: { $gte: from, $lt: to }, ...HUMAN };
  const [pv] = await PageView.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              views: { $sum: 1 },
              visitors: { $addToSet: VISITOR },
              sessions: { $addToSet: "$sessionId" },
              newVisitors: {
                $addToSet: { $cond: ["$isNewVisitor", VISITOR, "$$REMOVE"] },
              },
              engagementMs: { $sum: "$engagementMs" },
            },
          },
          {
            $project: {
              _id: 0,
              views: 1,
              engagementMs: 1,
              visitors: { $size: "$visitors" },
              sessions: { $size: "$sessions" },
              newVisitors: { $size: "$newVisitors" },
            },
          },
        ],
        byChannel: [
          // one row per visitor+channel so the number reads as "visitors"
          { $group: { _id: { c: "$channel", v: VISITOR } } },
          ...countBy("$_id.c", 10),
        ],
        byDevice: countBy("$device", 10),
        byBrowser: countBy("$browser", 10),
        byOs: countBy("$os", 10),
        byCountry: countBy("$country", 20),
        topPaths: countBy("$path", 20),
      },
    },
  ]);

  const evMatch = { createdAt: { $gte: from, $lt: to } };
  const [events, topSearches, zeroResultSearches, regs] = await Promise.all([
    AnalyticsEvent.aggregate<ICount>([{ $match: evMatch }, ...countBy("$type", 30)]),
    AnalyticsEvent.aggregate<ICount>([
      { $match: { ...evMatch, type: "searchPerformed", "meta.query": { $type: "string" } } },
      ...countBy("$meta.query", 20),
    ]),
    AnalyticsEvent.aggregate<ICount>([
      { $match: { ...evMatch, type: "searchPerformed", "meta.query": { $type: "string" }, "meta.resultCount": 0 } },
      ...countBy("$meta.query", 20),
    ]),
    User.aggregate<ICount>([
      { $match: { createdAt: { $gte: from, $lt: to }, role: { $in: AUDIENCE_ROLES } } },
      ...countBy("$acquisition.channel", 10),
    ]),
  ]);

  const totals = pv?.totals?.[0] ?? {
    views: 0,
    visitors: 0,
    sessions: 0,
    newVisitors: 0,
    engagementMs: 0,
  };
  return {
    ...totals,
    byChannel: pv?.byChannel ?? [],
    byDevice: pv?.byDevice ?? [],
    byBrowser: pv?.byBrowser ?? [],
    byOs: pv?.byOs ?? [],
    byCountry: pv?.byCountry ?? [],
    topPaths: pv?.topPaths ?? [],
    events,
    topSearches,
    zeroResultSearches,
    registrations: regs.reduce((s, r) => s + r.n, 0),
    registrationsByChannel: regs,
  };
}

const utcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const utcMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

async function save(period: "day" | "month", start: Date, end: Date) {
  const stats = await trafficStats(start, end);
  await AnalyticsDaily.updateOne(
    { period, start },
    { $set: { ...stats, computedAt: new Date() } },
    { upsert: true },
  );
  return stats;
}

/** Recompute one UTC day, and the month it belongs to. Safe to re-run. */
export async function rollupDay(date: Date) {
  const start = utcDay(date);
  const end = new Date(start.getTime() + 86_400_000);
  const day = await save("day", start, end);
  const mStart = utcMonth(start);
  const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1));
  await save("month", mStart, mEnd);
  return day;
}

/**
 * Fill any day in the raw-data window (last 90 days) that has no row yet.
 * Runs with every nightly job, so a fresh deploy backfills itself.
 */
export async function backfillMissingDays(days = 89) {
  const today = utcDay(new Date());
  const since = new Date(today.getTime() - days * 86_400_000);
  const have = new Set(
    (await AnalyticsDaily.find({ period: "day", start: { $gte: since } }).select("start").lean()).map(
      (d) => d.start.getTime(),
    ),
  );
  let filled = 0;
  for (let t = since.getTime(); t < today.getTime(); t += 86_400_000) {
    if (!have.has(t)) {
      await rollupDay(new Date(t));
      filled++;
    }
  }
  if (filled) logger.info(`analytics-rollup: backfilled ${filled} day(s)`);
  return filled;
}

/** Nightly job body: yesterday (final) and today (partial), plus any gaps. */
export async function runNightlyRollup() {
  const now = new Date();
  await rollupDay(new Date(now.getTime() - 86_400_000));
  await rollupDay(now);
  await backfillMissingDays();
}
