import { Router, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/index";
import { AppError } from "../middleware/error";
import { authenticate, authorize } from "../middleware/auth";
import { analyticsService } from "../services/analytics.service";
import Vendor from "../models/Vendor";
import {
  toCsv,
  analyticsToRows,
  buildExportFilename,
  safeReportFilename,
} from "../utils/csv.utils";
import {
  parseAnalyticsDateRange,
  lastNDaysRange,
  formatUtcPeriodLabel,
} from "../utils/dateHelpers";
import { buildEventReport, ReportRange } from "../services/eventReport.service";
import { renderReportPdf } from "../utils/pdf.utils";
import cacheService from "../services/cache.service";
import { createCustomLimiter } from "../middleware/rateLimiter";
import { EventReportData } from "../services/eventReport.service";
import Event from "../models/Event";
import { trackAnalyticsEvent } from "../controllers/analyticsEvent.controller";

const router = Router();

// Public UX telemetry (eventViewed / similarEventClicked / recentlyViewedClicked) —
// must stay ahead of the authenticate gate below so anonymous visitors are tracked too.
const trackLimiter = createCustomLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: "analytics-track",
});
router.post("/track", trackLimiter, trackAnalyticsEvent);

router.use(authenticate);

/**
 * Resolve vendor profile _id from the logged-in user.
 * Events store event.vendorId = Vendor._id (not User._id).
 */
async function resolveVendorId(req: AuthRequest): Promise<string | undefined> {
  if (req.user?.role !== "vendor") return undefined;
  const userId = req.user._id || req.user.id;
  const profile = await Vendor.findOne({ userId }).select("_id").lean();
  return profile?._id?.toString();
}

// Use shared parseAnalyticsDateRange (UTC day-boundary clamping, consistent defaults)
const parseDateRange = (startDate: any, endDate: any) =>
  parseAnalyticsDateRange(startDate, endDate);

// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Vendor)
router.get(
  "/dashboard",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const summary = await analyticsService.getDashboardSummary(vendorId);
      res.status(200).json({
        success: true,
        message: "Dashboard summary retrieved successfully",
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/events
// @access  Private (Admin, Vendor)
router.get(
  "/events",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getEventAnalytics(
        vendorId,
        dateRange,
      );
      res.status(200).json({
        success: true,
        message: "Event analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/orders
// @access  Private (Admin, Vendor)
router.get(
  "/orders",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getOrderAnalytics(
        vendorId,
        dateRange,
      );
      res.status(200).json({
        success: true,
        message: "Order analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/tickets
// @access  Private (Admin, Vendor)
router.get(
  "/tickets",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getTicketAnalytics(
        vendorId,
        dateRange,
      );
      res.status(200).json({
        success: true,
        message: "Ticket analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/users
// @access  Private (Admin only)
router.get(
  "/users",
  authorize(["admin"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getUserAnalytics(dateRange);
      res.status(200).json({
        success: true,
        message: "User analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/venues
// @access  Private (Admin, Vendor)
router.get(
  "/venues",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const analytics = await analyticsService.getVenueAnalytics(vendorId);
      res.status(200).json({
        success: true,
        message: "Venue analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/revenue
// @access  Private (Admin, Vendor)
router.get(
  "/revenue",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, groupBy = "month" } = req.query;
      if (!startDate || !endDate) {
        return next(new AppError("startDate and endDate are required", 400));
      }
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(startDate, endDate);
      const analytics = await analyticsService.getOrderAnalytics(
        vendorId,
        dateRange,
      );

      // Build period breakdown respecting groupBy
      const revenueByPeriod =
        groupBy === "day"
          ? analytics.ordersByDay || analytics.ordersByMonth
          : analytics.ordersByMonth;

      res.status(200).json({
        success: true,
        message: "Revenue report retrieved successfully",
        data: {
          totalRevenue: analytics.totalRevenue,
          totalOrders: analytics.totalOrders,
          averageOrderValue: analytics.averageOrderValue,
          revenueByPeriod,
          currencyBreakdown: analytics.topCurrencies,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/events/:eventId/performance
// @access  Private (Admin, Vendor)
router.get(
  "/events/:eventId/performance",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return next(new AppError("Invalid event ID", 400));
      }

      const Event = require("../models/Event").default;
      const Order = require("../models/Order").default;
      const Ticket = require("../models/Ticket").default;
      const Review = require("../models/Review").default;
      const Registration = require("../models/Registration").default;

      const eventObjId = new mongoose.Types.ObjectId(eventId);

      // For vendors: verify ownership
      if (req.user?.role === "vendor") {
        const vendorId = await resolveVendorId(req);
        const event = await Event.findById(eventObjId).select("vendorId");
        if (!event) return next(new AppError("Event not found", 404));
        if (event.vendorId.toString() !== vendorId) {
          return next(new AppError("Access denied", 403));
        }
      }

      const [
        eventData,
        orderData,
        ticketData,
        reviewData,
        registrationData,
        dailySales,
      ] = await Promise.all([
        Event.findById(eventObjId).select(
          "title viewsCount dateSchedule location price currency registrationConfig",
        ),
        Order.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $unwind: "$items" },
          { $match: { "items.eventId": eventObjId } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$items.totalPrice" },
              totalOrders: { $sum: 1 },
              totalTickets: { $sum: "$items.quantity" },
              avgOrderValue: { $avg: "$items.totalPrice" },
            },
          },
        ]),
        Ticket.aggregate([
          { $match: { eventId: eventObjId } },
          {
            $group: {
              _id: null,
              totalTickets: { $sum: 1 },
              checkedIn: {
                $sum: {
                  $cond: [{ $eq: ["$checkInDetails.isCheckedIn", true] }, 1, 0],
                },
              },
              transferred: {
                $sum: { $cond: [{ $eq: ["$status", "transferred"] }, 1, 0] },
              },
            },
          },
        ]),
        Review.aggregate([
          { $match: { event: eventObjId, status: "approved" } },
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              averageRating: { $avg: "$rating" },
              ratingDistribution: { $push: "$rating" },
            },
          },
        ]),
        Registration.aggregate([
          { $match: { eventId: eventObjId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $unwind: "$items" },
          { $match: { "items.eventId": eventObjId } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              orders: { $sum: 1 },
              revenue: { $sum: "$items.totalPrice" },
              tickets: { $sum: "$items.quantity" },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      if (!eventData) return next(new AppError("Event not found", 404));

      const orderStats = orderData[0] || {};
      const ticketStats = ticketData[0] || {};
      const reviewStats = reviewData[0] || {};

      const ratingDistribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      (reviewStats.ratingDistribution || []).forEach((r: number) => {
        ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
      });

      const registrationByStatus: Record<string, number> = {};
      let totalRegistrations = 0;
      registrationData.forEach((r: any) => {
        registrationByStatus[r._id] = r.count;
        totalRegistrations += r.count;
      });

      const schedules = eventData.dateSchedule || [];
      const seatStats = schedules.reduce(
        (acc: any, s: any) => {
          if (!s.unlimitedSeats) {
            acc.sold += s.soldSeats || 0;
            acc.total += (s.soldSeats || 0) + (s.availableSeats || 0);
          }
          return acc;
        },
        { sold: 0, total: 0 },
      );

      const conversionRate =
        eventData.viewsCount > 0
          ? Math.round(
              ((orderStats.totalOrders || 0) / eventData.viewsCount) * 10000,
            ) / 100
          : 0;

      const scheduleBreakdown = schedules.map((s: any, idx: number) => ({
        index: idx,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        soldSeats: s.soldSeats || 0,
        availableSeats: s.availableSeats || 0,
        totalCapacity: s.unlimitedSeats
          ? null
          : (s.soldSeats || 0) + (s.availableSeats || 0),
        unlimitedSeats: s.unlimitedSeats || false,
        utilizationRate:
          !s.unlimitedSeats && (s.soldSeats || 0) + (s.availableSeats || 0) > 0
            ? Math.round(
                ((s.soldSeats || 0) /
                  ((s.soldSeats || 0) + (s.availableSeats || 0))) *
                  10000,
              ) / 100
            : null,
      }));

      res.status(200).json({
        success: true,
        message: "Event performance retrieved successfully",
        data: {
          event: {
            id: eventData._id,
            title: eventData.title,
            views: eventData.viewsCount,
            dateSchedule: eventData.dateSchedule,
            location: eventData.location,
            basePrice: eventData.price,
            currency: eventData.currency,
            hasRegistration: eventData.registrationConfig?.enabled || false,
          },
          revenue: {
            total: orderStats.totalRevenue || 0,
            orders: orderStats.totalOrders || 0,
            tickets: orderStats.totalTickets || 0,
            averageOrderValue: orderStats.avgOrderValue || 0,
            conversionRate,
          },
          tickets: {
            total: ticketStats.totalTickets || 0,
            checkedIn: ticketStats.checkedIn || 0,
            transferred: ticketStats.transferred || 0,
            checkInRate:
              ticketStats.totalTickets > 0
                ? Math.round(
                    (ticketStats.checkedIn / ticketStats.totalTickets) * 10000,
                  ) / 100
                : 0,
          },
          seats: {
            sold: seatStats.sold,
            total: seatStats.total,
            utilizationRate:
              seatStats.total > 0
                ? Math.round((seatStats.sold / seatStats.total) * 10000) / 100
                : null,
            hasUnlimitedSeats: schedules.some((s: any) => s.unlimitedSeats),
          },
          reviews: {
            total: reviewStats.totalReviews || 0,
            averageRating: reviewStats.averageRating
              ? Math.round(reviewStats.averageRating * 10) / 10
              : 0,
            distribution: ratingDistribution,
          },
          registrations: {
            total: totalRegistrations,
            byStatus: registrationByStatus,
          },
          salesByDay: dailySales.map((d: any) => ({
            date: d._id,
            orders: d.orders,
            revenue: Math.round(d.revenue * 100) / 100,
            tickets: d.tickets,
          })),
          scheduleBreakdown,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Rate limiter for PDF report generation (Puppeteer is heavy)
const pdfReportLimiter = createCustomLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 PDF requests per window per IP
  message: "Too many report requests. Please wait and try again.",
});

// ─── Event report helpers ─────────────────────────────────────────────────────

/** Build a human-readable period label used in report filenames. */
function rangeToLabel(range: ReportRange): string {
  return range === "7d" ? "last-7-days" : "last-30-days";
}

/**
 * Render an EventReportData object as a multi-section CSV string.
 * Each section has a header row, data rows, and a totals row.
 * Views row is labeled "(all-time)" while other KPIs are labeled per the range.
 */
function eventReportToCsv(report: EventReportData): string {
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

/** Build a self-contained A4 HTML string for the event report PDF. */
function buildEventReportHtml(report: EventReportData): string {
  const rangeLabel = `Last ${report.period.range === "7d" ? "7" : "30"} days`;

  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const kpiCard = (label: string, value: string | number, note?: string) => `
    <div class="kpi-card">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      ${note ? `<div class="kpi-note">${note}</div>` : ""}
    </div>`;

  const statusTableRows = (byStatus: Record<string, number>) => {
    const entries = Object.entries(byStatus);
    if (!entries.length)
      return `<tr><td colspan="2" class="empty">No data in this period</td></tr>`;
    return entries
      .map(([s, n]) => `<tr><td>${s}</td><td>${n}</td></tr>`)
      .join("");
  };

  const ratingBar = (stars: number, count: number, total: number) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="rating-row">
        <span class="stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>`;
  };

  const dailySalesRows = () => {
    if (!report.dailySales.length)
      return `<tr><td colspan="4" class="empty">No data in this period</td></tr>`;
    let totO = 0,
      totR = 0,
      totT = 0;
    const rows = report.dailySales.map((d) => {
      totO += d.orders;
      totR += d.revenue;
      totT += d.tickets;
      return `<tr><td>${d.date}</td><td>${d.orders}</td><td>${d.revenue.toFixed(2)}</td><td>${d.tickets}</td></tr>`;
    });
    rows.push(
      `<tr class="totals-row"><td>TOTAL</td><td>${totO}</td><td>${totR.toFixed(2)}</td><td>${totT}</td></tr>`,
    );
    return rows.join("");
  };

  const recentReviewsSection = () => {
    if (!report.reviews.recent.length)
      return `<p class="empty">No reviews in this period.</p>`;
    return `<table><thead><tr><th>Rating</th><th>Reviewer</th><th>Comment</th><th>Date</th></tr></thead><tbody>
      ${report.reviews.recent
        .map(
          (r) => `<tr>
        <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
        <td>${r.userName ?? "—"}</td>
        <td>${r.comment ?? "—"}</td>
        <td>${r.date}</td>
      </tr>`,
        )
        .join("")}
    </tbody></table>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 0; }
  .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); color: #fff; padding: 20px 24px 16px; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .header .meta { font-size: 9.5px; opacity: 0.8; }
  .period-banner { background: #e8f4f8; border-left: 4px solid #0f3460; padding: 8px 14px; margin: 14px 24px; font-size: 9.5px; color: #0f3460; }
  .period-banner strong { font-weight: 600; }
  .section { margin: 14px 24px; }
  .section-title { font-size: 12px; font-weight: 700; color: #0f3460; border-bottom: 2px solid #0f3460; padding-bottom: 4px; margin-bottom: 10px; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .kpi-card { flex: 1 1 120px; background: #f7f9fc; border: 1px solid #dbe3f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #0f3460; }
  .kpi-label { font-size: 9px; color: #555; margin-top: 2px; }
  .kpi-note { font-size: 8.5px; color: #999; font-style: italic; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
  th { background: #0f3460; color: #fff; padding: 5px 8px; text-align: left; font-weight: 600; }
  td { padding: 4px 8px; border-bottom: 1px solid #eef0f5; }
  tr:nth-child(even) td { background: #f7f9fc; }
  .totals-row td { font-weight: 700; background: #e8f4f8 !important; }
  .empty { color: #999; font-style: italic; text-align: center; padding: 10px; }
  .rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .stars { font-size: 11px; color: #f59e0b; min-width: 70px; }
  .bar-track { flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: #0f3460; border-radius: 4px; }
  .bar-count { min-width: 24px; text-align: right; color: #555; font-size: 9.5px; }
  .two-col { display: flex; gap: 20px; }
  .two-col > div { flex: 1; }
</style>
</head>
<body>

<div class="header">
  <h1>${esc(report.event.title)}</h1>
  <div class="meta">
    ${report.event.location !== "—" ? `${esc(report.event.location)} &nbsp;|&nbsp; ` : ""}Event Report &nbsp;|&nbsp; Generated ${report.generated.at.slice(0, 10)}
  </div>
</div>

<div class="period-banner">
  <strong>Report period:</strong> ${report.period.label} &nbsp;(${rangeLabel}) &nbsp;&mdash;&nbsp;
  Views shown are all-time totals; all other metrics cover the report period above.
</div>

<div class="section">
  <div class="section-title">Key Performance Indicators</div>
  <div class="kpi-grid">
    ${kpiCard("Registrations", report.kpis.registrations, rangeLabel)}
    ${kpiCard("Revenue", `${report.kpis.revenue.toFixed(2)}`, rangeLabel)}
    ${kpiCard("Tickets Sold", report.kpis.ticketsSold, rangeLabel)}
    ${kpiCard("Certificates Issued", report.kpis.certificatesIssued, rangeLabel)}
    ${kpiCard("Reviews", report.kpis.reviews, rangeLabel)}
    ${kpiCard("Total Views", report.event.viewsAllTime, "all-time")}
    ${report.externalBooking.enabled ? kpiCard("Booking Clicks", report.externalBooking.clicksInPeriod, rangeLabel) : ""}
  </div>
</div>

${
  report.externalBooking.enabled
    ? `
<div class="section">
  <div class="section-title">External Booking</div>
  <table>
    <thead><tr><th>Link</th><th>Total Clicks</th><th>Unique Clicks</th><th>CTR (all-time)</th><th>Last Clicked</th></tr></thead>
    <tbody>
      <tr>
        <td style="word-break:break-all">${esc(report.externalBooking.link ?? "—")}</td>
        <td>${report.externalBooking.totalClicks}</td>
        <td>${report.externalBooking.uniqueClicks}</td>
        <td>${report.externalBooking.clickThroughRate}%</td>
        <td>${report.externalBooking.lastClickedAt ? report.externalBooking.lastClickedAt.slice(0, 10) : "—"}</td>
      </tr>
    </tbody>
  </table>
</div>
<div class="period-banner" style="background:#fff7e6;border-left-color:#b45309;color:#7a4d05">
  Booking happens on the external site — registrations, revenue, and certificates below are not tracked on-platform for this event.
</div>`
    : ""
}

<div class="two-col" style="margin:0 24px">
  <div>
    <div class="section-title" style="margin-bottom:8px">Registrations by Status</div>
    <table>
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>
        ${statusTableRows(report.registrations.byStatus)}
        ${report.registrations.total > 0 ? `<tr class="totals-row"><td>TOTAL</td><td>${report.registrations.total}</td></tr>` : ""}
      </tbody>
    </table>
  </div>
  <div>
    <div class="section-title" style="margin-bottom:8px">Certificates by Status</div>
    <table>
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>
        ${statusTableRows(report.certificates.byStatus)}
        ${report.certificates.total > 0 ? `<tr class="totals-row"><td>TOTAL</td><td>${report.certificates.total}</td></tr>` : ""}
      </tbody>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">Reviews — Rating Distribution</div>
  ${
    report.reviews.total === 0
      ? `<p class="empty">No reviews in this period.</p>`
      : `<div style="margin-bottom:10px">
        <div style="font-size:10px;color:#555;margin-bottom:6px">Average: <strong>${report.reviews.averageRating} / 5</strong> &nbsp; (${report.reviews.total} reviews)</div>
        ${[5, 4, 3, 2, 1].map((s) => ratingBar(s, report.reviews.distribution[s] ?? 0, report.reviews.total)).join("")}
       </div>`
  }
  ${recentReviewsSection()}
</div>

<div class="section">
  <div class="section-title">Daily Sales</div>
  <table>
    <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th><th>Tickets</th></tr></thead>
    <tbody>${dailySalesRows()}</tbody>
  </table>
</div>

</body>
</html>`;
}

// @route   GET /api/analytics/events/:eventId/report
// @access  Private (Admin, Vendor-owner)
router.get(
  "/events/:eventId/report",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const format = (req.query.format as string) || "csv";
      const rangeParam = (req.query.range as string) || "7d";

      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return next(new AppError("Invalid event ID", 400));
      }
      if (!["pdf", "csv"].includes(format)) {
        return next(new AppError("format must be pdf or csv", 400));
      }
      const range: ReportRange = rangeParam === "30d" ? "30d" : "7d";

      // Vendor ownership check
      if (req.user?.role === "vendor") {
        const vendorId = await resolveVendorId(req);
        const ev = await Event.findById(eventId).select("vendorId").lean();
        if (!ev) return next(new AppError("Event not found", 404));
        if ((ev as any).vendorId?.toString() !== vendorId) {
          return next(new AppError("Access denied", 403));
        }
      }

      const actorId = (req.user?._id || req.user?.id || "unknown").toString();
      const n = range === "7d" ? 7 : 30;
      const dateRange = lastNDaysRange(n);

      if (format === "pdf") {
        // Apply rate limit for PDF generation
        await new Promise<void>((resolve, reject) => {
          pdfReportLimiter(req, res, (err?: any) =>
            err ? reject(err) : resolve(),
          );
        });

        const cacheKey = `report:event:${eventId}:${range}:pdf`;
        const cached = await cacheService.get<Buffer>(cacheKey);
        if (cached) {
          const buf = Buffer.isBuffer(cached)
            ? cached
            : Buffer.from(cached as any);
          const ev = await Event.findById(eventId)
            .select("title")
            .lean<{ title: string }>();
          const title = ev?.title ?? "event";
          const filename =
            safeReportFilename("event-report", title, range) + ".pdf";
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`,
          );
          return res.send(buf);
        }

        const report = await buildEventReport(
          eventId,
          range,
          actorId,
          dateRange,
        );
        const html = buildEventReportHtml(report);
        const pdfBuffer = await renderReportPdf(html);

        await cacheService.set(cacheKey, pdfBuffer, { ttl: 600 }); // 10 min

        const filename =
          safeReportFilename("event-report", report.event.title, range) +
          ".pdf";
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(pdfBuffer);
      }

      // CSV format (no rate limit; cheap)
      const report = await buildEventReport(eventId, range, actorId, dateRange);
      const csvBody = eventReportToCsv(report);
      const filename =
        safeReportFilename("event-report", report.event.title, range) + ".csv";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      return res.send(csvBody);
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/export
// @access  Private (Admin, Vendor)
router.get(
  "/export",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { type, startDate, endDate, format = "json" } = req.query;
      if (
        !type ||
        !["events", "orders", "tickets", "users", "venues"].includes(
          type as string,
        )
      ) {
        return next(new AppError("Invalid export type", 400));
      }

      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(startDate, endDate);

      let data: any;
      switch (type) {
        case "events":
          data = await analyticsService.getEventAnalytics(vendorId, dateRange);
          break;
        case "orders":
          data = await analyticsService.getOrderAnalytics(vendorId, dateRange);
          break;
        case "tickets":
          data = await analyticsService.getTicketAnalytics(vendorId, dateRange);
          break;
        case "users":
          if (req.user?.role !== "admin")
            return next(new AppError("Access denied", 403));
          data = await analyticsService.getUserAnalytics(dateRange);
          break;
        case "venues":
          data = await analyticsService.getVenueAnalytics(vendorId);
          break;
      }

      const startStr = dateRange?.start?.toISOString().split("T")[0];
      const endStr = dateRange?.end?.toISOString().split("T")[0];
      const filename = buildExportFilename(type as string, startStr, endStr);

      if (format === "csv") {
        const rows = analyticsToRows(data);
        const csvBody = toCsv(rows);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}.csv"`,
        );
        res.send(csvBody);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}.json"`,
        );
        res.json({
          success: true,
          exportType: type,
          exportDate: new Date(),
          dateRange,
          data,
        });
      }
    } catch (error) {
      next(error);
    }
  },
);

export default router;
