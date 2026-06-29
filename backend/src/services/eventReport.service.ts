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
import { AnalyticsDateRange, formatUtcPeriodLabel } from "../utils/dateHelpers";
import { AppError } from "../middleware/error";

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
  ] = await Promise.all([
    // 1. Event metadata
    Event.findById(eventObjId)
      .select("title viewsCount location")
      .lean<{ _id: mongoose.Types.ObjectId; title: string; viewsCount?: number; location?: { city?: string; country?: string } }>(),

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
  };
}
