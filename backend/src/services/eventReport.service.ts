/**
 * Event Report Service
 *
 * Single source of truth for per-event report data.
 * Both the CSV and PDF renderers consume the EventReportData object returned
 * by buildEventReport — aggregation runs once and both formats receive
 * identical numbers.
 */

import mongoose from "mongoose";
import Event from "../models/Event";
import Order from "../models/Order";
import Ticket from "../models/Ticket";
import Review from "../models/Review";
import Registration from "../models/Registration";
import Certificate from "../models/Certificate";
import AffiliateEventClick from "../models/AffiliateEventClick";
import { AnalyticsDateRange, formatUtcPeriodLabel } from "../utils/dateHelpers";
import { AppError } from "../middleware/error";
import { toCsv } from "../utils/csv.utils";

// ─── Public contract ──────────────────────────────────────────────────────────

export type ReportRange = "7d" | "30d";

export interface EventReportKpis {
  registrations: number;
  revenue: number;
  ticketsSold: number;
  certificatesIssued: number;
  reviews: number;
}

export interface EventReportRegistrations {
  total: number;
  byStatus: Record<string, number>;
}

export interface EventReportReview {
  rating: number;
  comment?: string;
  userName?: string;
  date: string;
}

export interface EventReportReviews {
  total: number;
  averageRating: number;
  distribution: Record<number, number>;
  recent: EventReportReview[];
}

export interface EventReportCertificates {
  total: number;
  byStatus: Record<string, number>;
}

export interface EventReportSalesDay {
  date: string;
  orders: number;
  revenue: number;
  tickets: number;
}

export interface EventReportExternalBooking {
  enabled: boolean;
  link?: string;
  totalClicks: number;
  uniqueClicks: number;
  clicksInPeriod: number;
  lastClickedAt?: string;
  /** % of all-time viewers who clicked through to the external link (all-time totalClicks / viewsAllTime). */
  clickThroughRate: number;
}

export interface EventReportData {
  event: {
    id: string;
    title: string;
    location: string;
    viewsAllTime: number;
  };
  period: {
    range: ReportRange;
    startUtc: string;
    endUtc: string;
    label: string;
  };
  generated: {
    by: string;
    at: string;
  };
  kpis: EventReportKpis;
  registrations: EventReportRegistrations;
  reviews: EventReportReviews;
  certificates: EventReportCertificates;
  dailySales: EventReportSalesDay[];
  externalBooking: EventReportExternalBooking;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Aggregate all data needed for an event report in a single pass.
 *
 * @param eventId  - Event ObjectId string
 * @param range    - Which pre-defined period to use (currently "7d" or "30d")
 * @param actorId  - Admin/vendor user ID for the "generated.by" field
 * @param dateRange - Computed date range (start/end, UTC day boundaries)
 */
export async function buildEventReport(
  eventId: string,
  range: ReportRange,
  actorId: string,
  dateRange: AnalyticsDateRange,
): Promise<EventReportData> {
  const eventObjId = new mongoose.Types.ObjectId(eventId);
  const { start, end } = dateRange;

  // ── Fetch event meta + all aggregations in parallel ──
  const [
    eventDoc,
    orderStats,
    dailySalesRaw,
    ticketStats,
    reviewStats,
    recentReviews,
    registrationData,
    certStats,
    externalBookingClicksInPeriod,
  ] = await Promise.all([
    // 1. Event metadata
    Event.findById(eventObjId)
      .select("title viewsCount location externalBookingLink affiliateClickTracking")
      .lean<{
        _id: mongoose.Types.ObjectId;
        title: string;
        viewsCount?: number;
        location?: { city?: string; country?: string };
        externalBookingLink?: string;
        affiliateClickTracking?: { totalClicks: number; uniqueClicks: number; lastClickedAt?: Date };
      }>(),

    // 2. Revenue + orders for the window
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.eventId": eventObjId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$items.totalPrice" },
          totalOrders: { $sum: 1 },
          totalTickets: { $sum: "$items.quantity" },
        },
      },
    ]),

    // 3. Daily sales breakdown
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.eventId": eventObjId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$items.totalPrice" },
          tickets: { $sum: "$items.quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 4. Ticket check-in stats (all-time for this event; windowed makes less sense)
    Ticket.aggregate([
      { $match: { eventId: eventObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $eq: ["$checkInDetails.isCheckedIn", true] }, 1, 0] } },
        },
      },
    ]),

    // 5. Review summary (approved, last-N-days)
    Review.aggregate([
      { $match: { event: eventObjId, status: "approved", createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          distribution: { $push: "$rating" },
        },
      },
    ]),

    // 6. Recent reviews (up to 5, for PDF detail section)
    Review.find({
      event: eventObjId,
      status: "approved",
      createdAt: { $gte: start, $lte: end },
    })
      .select("rating comment user createdAt")
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean<Array<{ rating: number; comment?: string; user?: any; createdAt: Date }>>(),

    // 7. Registrations by status (last-N-days)
    Registration.aggregate([
      { $match: { eventId: eventObjId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // 8. Certificates issued (last-N-days, keyed by issuedAt)
    Certificate.aggregate([
      {
        $match: {
          eventId: eventObjId,
          $or: [
            { issuedAt: { $gte: start, $lte: end } },
            { createdAt: { $gte: start, $lte: end } },
          ],
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // 9. External booking button clicks within the report period
    AffiliateEventClick.countDocuments({
      eventId: eventObjId,
      clickedAt: { $gte: start, $lte: end },
    }),
  ]);

  if (!eventDoc) throw new AppError("Event not found", 404);

  // ── Coerce raw aggregation results ──

  const orders = orderStats[0] ?? { totalRevenue: 0, totalOrders: 0, totalTickets: 0 };
  const tickets = ticketStats[0] ?? { total: 0, checkedIn: 0 };
  const reviewAgg = reviewStats[0] ?? { total: 0, averageRating: 0, distribution: [] };

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (reviewAgg.distribution as number[]).forEach((r) => {
    ratingDistribution[r] = (ratingDistribution[r] ?? 0) + 1;
  });

  const registrationByStatus: Record<string, number> = {};
  let totalRegistrations = 0;
  for (const r of registrationData) {
    registrationByStatus[r._id] = r.count;
    totalRegistrations += r.count;
  }

  const certByStatus: Record<string, number> = {};
  let totalCerts = 0;
  for (const c of certStats) {
    certByStatus[c._id] = c.count;
    totalCerts += c.count;
  }

  const locationParts = [eventDoc.location?.city, eventDoc.location?.country].filter(Boolean);
  const locationStr = locationParts.length ? locationParts.join(", ") : "—";

  const recent: EventReportReview[] = recentReviews.map((r) => ({
    rating: r.rating,
    comment: r.comment,
    userName: r.user ? `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() : undefined,
    date: r.createdAt.toISOString().split("T")[0],
  }));

  return {
    event: {
      id: eventDoc._id.toString(),
      title: eventDoc.title,
      location: locationStr,
      viewsAllTime: eventDoc.viewsCount ?? 0,
    },
    period: {
      range,
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      label: formatUtcPeriodLabel(start, end),
    },
    generated: {
      by: actorId,
      at: new Date().toISOString(),
    },
    kpis: {
      registrations: totalRegistrations,
      revenue: Math.round(orders.totalRevenue * 100) / 100,
      ticketsSold: orders.totalTickets,
      certificatesIssued: totalCerts,
      reviews: reviewAgg.total,
    },
    registrations: {
      total: totalRegistrations,
      byStatus: registrationByStatus,
    },
    reviews: {
      total: reviewAgg.total,
      averageRating: Math.round((reviewAgg.averageRating ?? 0) * 10) / 10,
      distribution: ratingDistribution,
      recent,
    },
    certificates: {
      total: totalCerts,
      byStatus: certByStatus,
    },
    dailySales: dailySalesRaw.map((d: any) => ({
      date: d._id,
      orders: d.orders,
      revenue: Math.round(d.revenue * 100) / 100,
      tickets: d.tickets,
    })),
    externalBooking: {
      enabled: !!eventDoc.externalBookingLink,
      link: eventDoc.externalBookingLink,
      totalClicks: eventDoc.affiliateClickTracking?.totalClicks ?? 0,
      uniqueClicks: eventDoc.affiliateClickTracking?.uniqueClicks ?? 0,
      clicksInPeriod: externalBookingClicksInPeriod,
      lastClickedAt: eventDoc.affiliateClickTracking?.lastClickedAt?.toISOString(),
      clickThroughRate:
        eventDoc.viewsCount && eventDoc.viewsCount > 0
          ? Math.round(
              ((eventDoc.affiliateClickTracking?.totalClicks ?? 0) / eventDoc.viewsCount) * 1000,
            ) / 10
          : 0,
    },
  };
}

// ─── CSV renderer ─────────────────────────────────────────────────────────────

/**
 * Render an EventReportData object as a multi-section CSV string.
 * Each section has a header row, data rows, and a totals row.
 * Views row is labeled "(all-time)" while other KPIs are labeled per the range.
 *
 * Extracted from routes/analytics.routes.ts (formerly a private, unreusable
 * function) so the new business-report endpoints can reuse the same CSV
 * building blocks alongside toCsv().
 */
export function eventReportToCsv(report: EventReportData): string {
  const rangeLabel = `(last ${report.period.range === "7d" ? "7" : "30"} days)`;
  const rows: Record<string, unknown>[] = [];

  // ── Section 1: Report info ──
  rows.push({
    Section: "Report Info",
    Field: "Event",
    Value: report.event.title,
  });
  rows.push({ Section: "", Field: "Location", Value: report.event.location });
  rows.push({
    Section: "",
    Field: "Report Period",
    Value: report.period.label,
  });
  rows.push({ Section: "", Field: "Generated At", Value: report.generated.at });
  rows.push({});

  // ── Section 2: KPIs ──
  rows.push({
    Section: "KPIs",
    Field: `Registrations ${rangeLabel}`,
    Value: report.kpis.registrations,
  });
  rows.push({
    Section: "",
    Field: `Revenue ${rangeLabel}`,
    Value: report.kpis.revenue,
  });
  rows.push({
    Section: "",
    Field: `Tickets Sold ${rangeLabel}`,
    Value: report.kpis.ticketsSold,
  });
  rows.push({
    Section: "",
    Field: `Certificates Issued ${rangeLabel}`,
    Value: report.kpis.certificatesIssued,
  });
  rows.push({
    Section: "",
    Field: `Reviews ${rangeLabel}`,
    Value: report.kpis.reviews,
  });
  rows.push({
    Section: "",
    Field: "Total Views (all-time)",
    Value: report.event.viewsAllTime,
  });
  rows.push({});

  // ── Section 2b: External Booking ──
  if (report.externalBooking.enabled) {
    rows.push({
      Section: "External Booking",
      Field: "Link",
      Value: report.externalBooking.link ?? "",
    });
    rows.push({
      Section: "",
      Field: `Button Clicks ${rangeLabel}`,
      Value: report.externalBooking.clicksInPeriod,
    });
    rows.push({
      Section: "",
      Field: "Total Clicks (all-time)",
      Value: report.externalBooking.totalClicks,
    });
    rows.push({
      Section: "",
      Field: "Unique Clicks (all-time)",
      Value: report.externalBooking.uniqueClicks,
    });
    rows.push({
      Section: "",
      Field: "Click-Through Rate (all-time)",
      Value: `${report.externalBooking.clickThroughRate}%`,
    });
    rows.push({
      Section: "",
      Field: "Last Clicked",
      Value: report.externalBooking.lastClickedAt ?? "—",
    });
    rows.push({});
    rows.push({
      Section: "",
      Field: "Note",
      Value:
        "Booking happens on the external site — registrations, revenue, and certificates below are not tracked on-platform for this event.",
    });
    rows.push({});
  }

  // ── Section 3: Registrations by status ──
  rows.push({ Section: "Registrations by Status", Status: "", Count: "" });
  for (const [status, count] of Object.entries(report.registrations.byStatus)) {
    rows.push({ Section: "", Status: status, Count: count });
  }
  rows.push({
    Section: "",
    Status: "TOTAL",
    Count: report.registrations.total,
  });
  rows.push({});

  // ── Section 4: Reviews ──
  rows.push({
    Section: "Reviews",
    Field: "Average Rating",
    Value: report.reviews.averageRating,
  });
  rows.push({
    Section: "",
    Field: "Total Reviews",
    Value: report.reviews.total,
  });
  for (const [stars, n] of Object.entries(report.reviews.distribution)) {
    rows.push({ Section: "", Field: `${stars}-star`, Value: n });
  }
  rows.push({});

  if (report.reviews.recent.length > 0) {
    rows.push({
      Section: "Recent Reviews",
      Rating: "Rating",
      Comment: "Comment",
      Reviewer: "Reviewer",
      Date: "Date",
    });
    for (const r of report.reviews.recent) {
      rows.push({
        Section: "",
        Rating: r.rating,
        Comment: r.comment ?? "",
        Reviewer: r.userName ?? "",
        Date: r.date,
      });
    }
    rows.push({});
  }

  // ── Section 5: Certificates by status ──
  rows.push({ Section: "Certificates by Status", Status: "", Count: "" });
  for (const [status, count] of Object.entries(report.certificates.byStatus)) {
    rows.push({ Section: "", Status: status, Count: count });
  }
  rows.push({ Section: "", Status: "TOTAL", Count: report.certificates.total });
  rows.push({});

  // ── Section 6: Daily sales ──
  if (report.dailySales.length > 0) {
    rows.push({
      Section: "Daily Sales",
      Date: "Date",
      Orders: "Orders",
      Revenue: "Revenue",
      Tickets: "Tickets",
    });
    let totOrders = 0,
      totRevenue = 0,
      totTickets = 0;
    for (const d of report.dailySales) {
      rows.push({
        Section: "",
        Date: d.date,
        Orders: d.orders,
        Revenue: d.revenue,
        Tickets: d.tickets,
      });
      totOrders += d.orders;
      totRevenue += d.revenue;
      totTickets += d.tickets;
    }
    rows.push({
      Section: "",
      Date: "TOTAL",
      Orders: totOrders,
      Revenue: Math.round(totRevenue * 100) / 100,
      Tickets: totTickets,
    });
  } else {
    rows.push({
      Section: "Daily Sales",
      Date: "No data in this period",
      Orders: "",
      Revenue: "",
      Tickets: "",
    });
  }

  return toCsv(rows);
}
