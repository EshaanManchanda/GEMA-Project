/**
 * Admin growth reports (/api/admin/traffic/*). Live ranges read the raw
 * PageView / AnalyticsEvent rows (kept 90 days); long-range totals come from
 * AnalyticsDaily, which the nightly rollup writes.
 */
import { PipelineStage, Types } from "mongoose";
import PageView from "../models/PageView";
import AnalyticsEvent from "../models/AnalyticsEvent";
import AnalyticsDaily from "../models/AnalyticsDaily";
import User from "../models/User";
import Event from "../models/Event";
import Order from "../models/Order";
import Vendor from "../models/Vendor";
import { Blog } from "../models/Blog";
import { AUDIENCE_ROLES, HUMAN, VISITOR, trafficStats } from "./analyticsRollup.service";

export interface Range {
  from: Date;
  to: Date;
}

const RAW_RETENTION_DAYS = 90;

/** `?days=N` (1–90, the raw-data window) ending now, plus the equal period before it. */
export const parseRange = (daysParam: unknown): { current: Range; previous: Range; days: number } => {
  const days = Math.min(Math.max(parseInt(String(daysParam)) || 30, 1), RAW_RETENTION_DAYS);
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { current: { from, to }, previous: { from: new Date(from.getTime() - days * 86_400_000), to: from }, days };
};

const evIn = (r: Range, extra: Record<string, unknown> = {}) => ({
  createdAt: { $gte: r.from, $lt: r.to },
  ...extra,
});
const pvIn = (r: Range) => ({ timestamp: { $gte: r.from, $lt: r.to }, ...HUMAN });
const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

/** Distinct visitors that fired an AnalyticsEvent of `type` in the range. */
const distinctActors = async (r: Range, type: string) =>
  (
    await AnalyticsEvent.aggregate<{ n: number }>([
      { $match: evIn(r, { type }) },
      { $group: { _id: { $ifNull: ["$visitorId", "$sessionId"] } } },
      { $count: "n" },
    ])
  )[0]?.n ?? 0;

// ── Overview ────────────────────────────────────────────────────────────────
export async function overview(current: Range, previous: Range) {
  const [now, prev, byDay, monthly] = await Promise.all([
    trafficStats(current.from, current.to),
    trafficStats(previous.from, previous.to),
    PageView.aggregate([
      { $match: pvIn(current) },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          views: { $sum: 1 },
          visitors: { $addToSet: VISITOR },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", views: 1, visitors: { $size: "$visitors" } } },
    ]),
    AnalyticsDaily.find({ period: "month" })
      .sort({ start: -1 })
      .limit(13)
      .select("start visitors sessions views newVisitors registrations -_id")
      .lean(),
  ]);
  const pick = (s: typeof now) => ({
    visitors: s.visitors,
    newVisitors: s.newVisitors,
    returningVisitors: Math.max(s.visitors - s.newVisitors, 0),
    sessions: s.sessions,
    views: s.views,
    pagesPerSession: s.sessions ? Math.round((s.views / s.sessions) * 10) / 10 : 0,
    avgEngagementSec: s.sessions ? Math.round(s.engagementMs / s.sessions / 1000) : 0,
    registrations: s.registrations,
  });
  return {
    totals: pick(now),
    previous: pick(prev),
    byDay,
    byDevice: now.byDevice,
    byBrowser: now.byBrowser,
    byOs: now.byOs,
    byCountry: now.byCountry,
    topPages: now.topPaths,
    monthly: monthly.reverse(),
  };
}

// ── Acquisition ─────────────────────────────────────────────────────────────
export async function acquisition(r: Range) {
  const [channels, regs, campaigns, campaignRegs] = await Promise.all([
    PageView.aggregate([
      { $match: pvIn(r) },
      {
        $group: {
          _id: { $ifNull: ["$channel", "unknown"] },
          views: { $sum: 1 },
          visitors: { $addToSet: VISITOR },
          sessions: { $addToSet: "$sessionId" },
          newVisitors: { $addToSet: { $cond: ["$isNewVisitor", VISITOR, "$$REMOVE"] } },
        },
      },
      {
        $project: {
          _id: 0,
          channel: "$_id",
          views: 1,
          visitors: { $size: "$visitors" },
          sessions: { $size: "$sessions" },
          newVisitors: { $size: "$newVisitors" },
        },
      },
      { $sort: { visitors: -1 } },
    ]),
    User.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: r.from, $lt: r.to }, role: { $in: AUDIENCE_ROLES } } },
      { $group: { _id: { $ifNull: ["$acquisition.channel", "unknown"] }, n: { $sum: 1 } } },
    ]),
    PageView.aggregate([
      { $match: { ...pvIn(r), utmCampaign: { $ne: null } } },
      {
        $group: {
          _id: { source: "$utmSource", medium: "$utmMedium", campaign: "$utmCampaign" },
          visitors: { $addToSet: VISITOR },
          sessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id.source",
          medium: "$_id.medium",
          campaign: "$_id.campaign",
          visitors: { $size: "$visitors" },
          sessions: { $size: "$sessions" },
        },
      },
      { $sort: { visitors: -1 } },
      { $limit: 50 },
    ]),
    User.aggregate<{ _id: string; n: number }>([
      {
        $match: {
          createdAt: { $gte: r.from, $lt: r.to },
          "acquisition.utmCampaign": { $type: "string" },
        },
      },
      { $group: { _id: "$acquisition.utmCampaign", n: { $sum: 1 } } },
    ]),
  ]);

  const regBy = new Map(regs.map((x) => [x._id, x.n]));
  const rows = channels.map((c) => {
    const registrations = regBy.get(c.channel) ?? 0;
    regBy.delete(c.channel);
    return { ...c, registrations, conversionRate: ratio(registrations, c.visitors) };
  });
  // Sign-ups whose channel had no tracked visits (e.g. registered before tracking shipped)
  for (const [channel, registrations] of regBy) {
    rows.push({ channel, views: 0, visitors: 0, sessions: 0, newVisitors: 0, registrations, conversionRate: 0 });
  }
  const campRegs = new Map(campaignRegs.map((x) => [x._id, x.n]));
  return {
    channels: rows,
    campaigns: campaigns.map((c) => ({ ...c, registrations: campRegs.get(c.campaign) ?? 0 })),
  };
}

// ── Funnel ──────────────────────────────────────────────────────────────────
export async function funnel(r: Range) {
  const [visitors, eventViewers, bookingClickers, ordersCreated, ordersPaid] = await Promise.all([
    PageView.aggregate<{ n: number }>([
      { $match: pvIn(r) },
      { $group: { _id: VISITOR } },
      { $count: "n" },
    ]).then((x) => x[0]?.n ?? 0),
    distinctActors(r, "eventViewed"),
    distinctActors(r, "bookingClicked"),
    Order.countDocuments({ createdAt: { $gte: r.from, $lt: r.to } }),
    Order.countDocuments({
      createdAt: { $gte: r.from, $lt: r.to },
      paymentStatus: { $in: ["paid", "free"] },
    }),
  ]);
  const steps = [
    { step: "Visitors", n: visitors },
    { step: "Viewed an event", n: eventViewers },
    { step: "Clicked Book", n: bookingClickers },
    { step: "Started checkout", n: ordersCreated },
    { step: "Booking completed", n: ordersPaid },
  ];
  return {
    steps: steps.map((s, i) => ({ ...s, ofPrevious: i ? ratio(s.n, steps[i - 1].n) : 100 })),
    checkoutAbandonmentRate: ordersCreated ? Math.round((1 - ordersPaid / ordersCreated) * 1000) / 10 : 0,
  };
}

// ── Behaviour ───────────────────────────────────────────────────────────────
export async function behaviour(r: Range) {
  const searchQueries = (zero: boolean): PipelineStage[] => [
    {
      $match: evIn(r, {
        type: "searchPerformed",
        "meta.query": { $type: "string" },
        ...(zero ? { "meta.resultCount": 0 } : {}),
      }),
    },
    { $group: { _id: "$meta.query", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 25 },
    { $project: { _id: 0, query: "$_id", n: 1 } },
  ];

  const [topSearches, zeroResultSearches, filters, searchSessions, exits, actions] = await Promise.all([
    AnalyticsEvent.aggregate(searchQueries(false)),
    AnalyticsEvent.aggregate(searchQueries(true)),
    AnalyticsEvent.aggregate([
      { $match: evIn(r, { type: "filterApplied" }) },
      { $project: { f: { $objectToArray: { $ifNull: ["$meta.filters", {}] } } } },
      { $unwind: "$f" },
      { $group: { _id: { filter: "$f.k", value: "$f.v" }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 40 },
      { $project: { _id: 0, filter: "$_id.filter", value: "$_id.value", n: 1 } },
    ]),
    // Sessions that searched, and how many of them then opened an event
    AnalyticsEvent.aggregate<{ searched: number; clicked: number }>([
      { $match: evIn(r, { type: { $in: ["searchPerformed", "eventViewed"] }, sessionId: { $type: "string" } }) },
      {
        $group: {
          _id: "$sessionId",
          firstSearch: { $min: { $cond: [{ $eq: ["$type", "searchPerformed"] }, "$createdAt", null] } },
          lastView: { $max: { $cond: [{ $eq: ["$type", "eventViewed"] }, "$createdAt", null] } },
        },
      },
      { $match: { firstSearch: { $ne: null } } },
      {
        $group: {
          _id: null,
          searched: { $sum: 1 },
          clicked: { $sum: { $cond: [{ $gt: ["$lastView", "$firstSearch"] }, 1, 0] } },
        },
      },
    ]),
    // Exit page = the last page view of each session
    PageView.aggregate([
      { $match: { ...pvIn(r), sessionId: { $ne: null } } },
      { $sort: { timestamp: 1 } },
      { $group: { _id: "$sessionId", last: { $last: "$path" }, pages: { $sum: 1 } } },
      { $group: { _id: "$last", exits: { $sum: 1 }, bounces: { $sum: { $cond: [{ $eq: ["$pages", 1] }, 1, 0] } } } },
      { $sort: { exits: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, path: "$_id", exits: 1, bounces: 1 } },
    ], { allowDiskUse: true }),
    AnalyticsEvent.aggregate([
      { $match: evIn(r) },
      { $group: { _id: "$type", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $project: { _id: 0, type: "$_id", n: 1 } },
    ]),
  ]);
  const s = searchSessions[0] ?? { searched: 0, clicked: 0 };
  return {
    topSearches,
    zeroResultSearches,
    filters,
    searchToEventRate: ratio(s.clicked, s.searched),
    searchSessions: s.searched,
    exitPages: exits,
    actions,
  };
}

// ── Content (blogs) ─────────────────────────────────────────────────────────
export async function content(r: Range) {
  const [perBlog, shares, blogThenEvent, totalPublished] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: evIn(r, { type: "blogViewed", blogId: { $ne: null } }) },
      { $group: { _id: "$blogId", views: { $sum: 1 }, visitors: { $addToSet: { $ifNull: ["$visitorId", "$sessionId"] } } } },
      { $project: { views: 1, visitors: { $size: "$visitors" } } },
      { $sort: { views: -1 } },
      { $limit: 25 },
      { $lookup: { from: "blogs", localField: "_id", foreignField: "_id", as: "b", pipeline: [{ $project: { title: 1, slug: 1, viewCount: 1, publishedAt: 1 } }] } },
      { $unwind: "$b" },
      { $project: { _id: 0, blogId: "$_id", title: "$b.title", slug: "$b.slug", publishedAt: "$b.publishedAt", lifetimeViews: "$b.viewCount", views: 1, visitors: 1 } },
    ]),
    AnalyticsEvent.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: evIn(r, { type: "blogShared" }) },
      { $group: { _id: "$blogId", n: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate<{ n: number }>([
      { $match: evIn(r, { type: { $in: ["blogViewed", "eventViewed"] }, sessionId: { $type: "string" } }) },
      {
        $group: {
          _id: "$sessionId",
          blog: { $min: { $cond: [{ $eq: ["$type", "blogViewed"] }, "$createdAt", null] } },
          event: { $max: { $cond: [{ $eq: ["$type", "eventViewed"] }, "$createdAt", null] } },
        },
      },
      { $match: { blog: { $ne: null }, $expr: { $gt: ["$event", "$blog"] } } },
      { $count: "n" },
    ]),
    Blog.countDocuments({ status: "published" }),
  ]);
  const shareBy = new Map(shares.map((s) => [String(s._id), s.n]));
  // Blog landing pages: page views + engagement for /blog/* paths
  const landing = await PageView.aggregate([
    { $match: { ...pvIn(r), path: { $regex: "^/blogs?/" } } },
    {
      $group: {
        _id: "$path",
        views: { $sum: 1 },
        organic: { $sum: { $cond: [{ $eq: ["$channel", "organic_search"] }, 1, 0] } },
        engagementMs: { $sum: "$engagementMs" },
      },
    },
    { $sort: { views: -1 } },
    { $limit: 25 },
    { $project: { _id: 0, path: "$_id", views: 1, organic: 1, avgEngagementSec: { $round: [{ $divide: ["$engagementMs", { $max: ["$views", 1] }] }, 0] } } },
  ]);
  return {
    totalPublished,
    blogs: perBlog.map((b) => ({ ...b, shares: shareBy.get(String(b.blogId)) ?? 0 })),
    blogToEventSessions: blogThenEvent[0]?.n ?? 0,
    landingPages: landing.map((l) => ({ ...l, avgEngagementSec: Math.round(l.avgEngagementSec / 1000) })),
  };
}

// ── Events ──────────────────────────────────────────────────────────────────
const LIVE_EVENT = { status: "published", isApproved: true, isDeleted: { $ne: true } };

const eventActivity = (r: Range, groupKey: string): PipelineStage[] => [
  { $match: evIn(r, { eventId: { $ne: null }, type: { $in: ["eventViewed", "bookingClicked", "eventShared", "favouriteAdded", "organiserProfileClicked"] } }) },
  {
    $group: {
      _id: groupKey,
      views: { $sum: { $cond: [{ $eq: ["$type", "eventViewed"] }, 1, 0] } },
      bookingClicks: { $sum: { $cond: [{ $eq: ["$type", "bookingClicked"] }, 1, 0] } },
      shares: { $sum: { $cond: [{ $eq: ["$type", "eventShared"] }, 1, 0] } },
      favourites: { $sum: { $cond: [{ $eq: ["$type", "favouriteAdded"] }, 1, 0] } },
      profileClicks: { $sum: { $cond: [{ $eq: ["$type", "organiserProfileClicked"] }, 1, 0] } },
    },
  },
];

const paidBookingsByEvent = (r: Range) =>
  Order.aggregate<{ _id: Types.ObjectId; bookings: number }>([
    { $match: { createdAt: { $gte: r.from, $lt: r.to }, paymentStatus: { $in: ["paid", "free"] } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.eventId", bookings: { $sum: 1 } } },
  ]);

export async function events(r: Range) {
  const now = new Date();
  const [activity, bookings, statusCounts, byCategory, byCity, viewed] = await Promise.all([
    AnalyticsEvent.aggregate(eventActivity(r, "$eventId")),
    paidBookingsByEvent(r),
    Event.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          live: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "published"] }, "$isApproved"] }, 1, 0] } },
          upcoming: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "published"] }, { $gt: [{ $max: "$dateSchedule.endDate" }, now] }] }, 1, 0],
            },
          },
          expired: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "published"] }, { $lte: [{ $max: "$dateSchedule.endDate" }, now] }] }, 1, 0],
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Event.aggregate([
      { $match: LIVE_EVENT },
      { $group: { _id: "$category", events: { $sum: 1 }, ids: { $push: "$_id" } } },
    ]),
    Event.aggregate([
      { $match: LIVE_EVENT },
      { $group: { _id: { $ifNull: ["$location.city", "Unknown"] }, events: { $sum: 1 } } },
      { $sort: { events: -1 } },
      { $limit: 15 },
      { $project: { _id: 0, city: "$_id", events: 1 } },
    ]),
    AnalyticsEvent.distinct("eventId", evIn(r, { type: "eventViewed" })),
  ]);

  const act = new Map(activity.map((a) => [String(a._id), a]));
  const booked = new Map(bookings.map((b) => [String(b._id), b.bookings]));
  const ids = [...new Set([...act.keys(), ...booked.keys()])];
  const meta = await Event.find({ _id: { $in: ids } })
    .select("title category location.city vendorId")
    .lean();
  const metaBy = new Map(meta.map((e) => [String(e._id), e]));
  const rows = ids
    .map((id) => {
      const a = act.get(id) ?? { views: 0, bookingClicks: 0, shares: 0, favourites: 0, profileClicks: 0 };
      const m = metaBy.get(id);
      return {
        eventId: id,
        title: m?.title ?? "(deleted)",
        category: m?.category ?? null,
        city: m?.location?.city ?? null,
        views: a.views,
        bookingClicks: a.bookingClicks,
        shares: a.shares,
        favourites: a.favourites,
        profileClicks: a.profileClicks,
        bookings: booked.get(id) ?? 0,
      };
    })
    .sort((x, y) => y.views - x.views);

  const viewedSet = new Set(viewed.map(String));
  const categories = byCategory
    .map((c) => {
      const sum = (k: "views" | "bookingClicks" | "bookings") =>
        c.ids.reduce((s: number, id: Types.ObjectId) => s + (k === "bookings" ? booked.get(String(id)) ?? 0 : act.get(String(id))?.[k] ?? 0), 0);
      return { category: c._id ?? "Uncategorised", events: c.events, views: sum("views"), bookingClicks: sum("bookingClicks"), bookings: sum("bookings") };
    })
    .sort((a, b) => b.views - a.views);
  const zeroView = await Event.find({ ...LIVE_EVENT, _id: { $nin: [...viewedSet].map((id) => new Types.ObjectId(id)) } })
    .select("title category createdAt")
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();
  const zeroViewCount = await Event.countDocuments({ ...LIVE_EVENT, _id: { $nin: [...viewedSet].map((id) => new Types.ObjectId(id)) } });

  return {
    counts: statusCounts[0] ?? { total: 0, live: 0, upcoming: 0, expired: 0 },
    topEvents: rows.slice(0, 50),
    categories,
    byCity,
    zeroViewCount,
    zeroViewEvents: zeroView.map((e) => ({ eventId: e._id, title: e.title, category: e.category, createdAt: e.createdAt })),
  };
}

// ── Organisers ──────────────────────────────────────────────────────────────
export async function organisers(r: Range) {
  const [total, newInRange, withLiveEvents, listings, activity, bookings] = await Promise.all([
    Vendor.countDocuments({}),
    Vendor.countDocuments({ createdAt: { $gte: r.from, $lt: r.to } }),
    Event.distinct("vendorId", { ...LIVE_EVENT, vendorId: { $ne: null } }),
    Event.aggregate([
      { $match: { createdAt: { $gte: r.from, $lt: r.to }, isDeleted: { $ne: true } } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", n: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      ...eventActivity(r, "$eventId"),
      { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "e", pipeline: [{ $project: { vendorId: 1 } }] } },
      { $unwind: "$e" },
      { $match: { "e.vendorId": { $ne: null } } },
      {
        $group: {
          _id: "$e.vendorId",
          views: { $sum: "$views" },
          bookingClicks: { $sum: "$bookingClicks" },
          profileClicks: { $sum: "$profileClicks" },
        },
      },
    ]),
    paidBookingsByEvent(r),
  ]);

  const act = new Map(activity.map((a) => [String(a._id), a]));
  const vendorIds = [...act.keys()];
  const vendors = await Vendor.find({ _id: { $in: vendorIds } })
    .select("businessName stats.totalEvents")
    .lean();
  // Paid bookings rolled up to the organiser of each event
  const evVendor = new Map(
    (
      await Event.find({ _id: { $in: bookings.map((b) => b._id) } })
        .select("vendorId")
        .lean()
    ).map((e) => [String(e._id), String(e.vendorId)]),
  );
  const bookedBy = new Map<string, number>();
  for (const b of bookings) {
    const v = evVendor.get(String(b._id));
    if (v) bookedBy.set(v, (bookedBy.get(v) ?? 0) + b.bookings);
  }

  return {
    total,
    newInRange,
    active: withLiveEvents.length,
    inactive: Math.max(total - withLiveEvents.length, 0),
    listingsCreated: listings,
    topOrganisers: vendors
      .map((v) => {
        const a = act.get(String(v._id))!;
        return {
          vendorId: v._id,
          name: v.businessName,
          totalEvents: v.stats?.totalEvents ?? 0,
          views: a.views,
          bookingClicks: a.bookingClicks,
          profileClicks: a.profileClicks,
          bookings: bookedBy.get(String(v._id)) ?? 0,
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 50),
  };
}
