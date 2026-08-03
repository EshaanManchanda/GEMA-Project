import { Router, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/index";
import { AppError } from "../middleware/error";
import { authenticate, authorize } from "../middleware/auth";
import { analyticsService } from "../services/analytics.service";
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
import {
  buildEventReport,
  eventReportToCsv,
  ReportRange,
} from "../services/eventReport.service";
import {
  buildEventReportHtml,
  buildBusinessHealthHtml,
  buildPromotionSnapshotHtml,
} from "../services/reportTemplate.service";
import { renderReportPdf } from "../utils/pdf.utils";
import cacheService from "../services/cache.service";
import { invalidateBusinessReportCaches } from "../utils/cache.utils";
import { logReportGeneration } from "../services/reportObservability.service";
import {
  ReportGenerationOperation,
  ReportGenerationStatus,
  ReportGenerationTrigger,
} from "../models/ReportGenerationLog";
import { createCustomLimiter } from "../middleware/rateLimiter";
import Event from "../models/Event";
import { trackAnalyticsEvent } from "../controllers/analyticsEvent.controller";
import { resolveVendorId } from "../utils/vendorResolve";
import Vendor from "../models/Vendor";
import VendorSubscription from "../models/VendorSubscription";
import VendorBusinessSnapshot from "../models/VendorBusinessSnapshot";
import VendorPromotionInput from "../models/VendorPromotionInput";
import {
  computeVendorHealth,
  generateSnapshot,
  getSnapshotHistory,
  toReportPayload,
  reportPayloadToCsv,
  periodOfDate,
} from "../services/businessReport.service";
import settingsService from "../services/settings.service";
import { verifySnapshot } from "../services/snapshotIntegrity.service";
import { config } from "../config/env";
import logger from "../config/logger";
import { INTEGRITY_MISMATCH_BLOCKS_LOCKED_DOWNLOAD } from "../constants/businessHealth.rules";

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

// resolveVendorId (User -> Vendor profile _id lookup) now lives in
// utils/vendorResolve.ts so other report routes can reuse it.

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

// eventReportToCsv and buildEventReportHtml were extracted to
// services/eventReport.service.ts and services/reportTemplate.service.ts
// respectively (see imports above) to make them reusable outside this route file.

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

// ─── Business Optimization / Report Center (KBOS Phase 1) ─────────────────────

/**
 * Admin never gated. A vendor is gated by both the app-wide kill switch
 * (SystemSettings.businessReportsEnabled) and their subscription's
 * advancedAnalytics flag — but most vendors are on the platform_stripe
 * payment mode and never have a VendorSubscription document at all (that
 * model is specific to the custom-Stripe subscription flow). Treating
 * "no subscription document" as gated would lock out the majority of
 * vendors by default, which defeats the point of a soft entitlement flag —
 * so a missing document is treated as ungated, and only an explicit
 * `advancedAnalytics: false` on a real subscription restricts access.
 */
async function assertBusinessReportsAccess(req: AuthRequest): Promise<void> {
  if (req.user?.role === "admin") return;

  const enabled = await settingsService.areBusinessReportsEnabled();
  if (!enabled) {
    throw new AppError("Business reports are currently unavailable", 503);
  }

  const vendorId = await resolveVendorId(req);
  const subscription = await VendorSubscription.findOne({ vendorId })
    .select("planFeatures.advancedAnalytics")
    .lean();
  if (subscription && subscription.planFeatures?.advancedAnalytics === false) {
    throw new AppError("Business reports are not included in your plan", 403);
  }
}

/** Vendors may only access their own vendorId; admins may access any. */
async function assertVendorOwnership(
  req: AuthRequest,
  vendorId: string,
): Promise<void> {
  if (req.user?.role === "admin") return;
  const ownVendorId = await resolveVendorId(req);
  if (!ownVendorId || ownVendorId !== vendorId) {
    throw new AppError("Access denied", 403);
  }
}

const businessReportPdfLimiter = createCustomLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many report requests. Please wait and try again.",
});

// @route   GET /api/insights/vendors/:vendorId/health
// @access  Private (Admin, Vendor-self)
router.get(
  "/vendors/:vendorId/health",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { vendorId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }
      await assertVendorOwnership(req, vendorId);
      await assertBusinessReportsAccess(req);

      const period = (req.query.period as string) || periodOfDate();
      const health = await computeVendorHealth(vendorId, period);

      res.status(200).json({
        success: true,
        message: "Vendor business health retrieved successfully",
        data: health,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/insights/vendors/:vendorId/health/history
// @access  Private (Admin, Vendor-self)
router.get(
  "/vendors/:vendorId/health/history",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { vendorId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }
      await assertVendorOwnership(req, vendorId);
      await assertBusinessReportsAccess(req);

      const limit = Math.min(
        Math.max(parseInt((req.query.limit as string) ?? "24", 10), 1),
        60,
      );
      const history = await getSnapshotHistory(vendorId, limit);

      res.status(200).json({
        success: true,
        message: "Vendor business health history retrieved successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PATCH /api/insights/vendors/:vendorId/tasks/:taskCode
// @access  Private (Admin, Vendor-self)
router.patch(
  "/vendors/:vendorId/tasks/:taskCode",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { vendorId, taskCode } = req.params;
      const { done } = req.body as { done?: boolean };
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }
      if (typeof done !== "boolean") {
        return next(new AppError("done must be a boolean", 400));
      }
      await assertVendorOwnership(req, vendorId);
      await assertBusinessReportsAccess(req);

      const period = (req.query.period as string) || periodOfDate();
      const actorId = (req.user?._id || req.user?.id)?.toString();

      const snapshot = await VendorBusinessSnapshot.findOne({
        vendorId,
        period,
      });
      if (!snapshot) {
        return next(
          new AppError("No snapshot exists for this period yet", 404),
        );
      }
      const task = snapshot.tasks.find((t) => t.code === taskCode);
      if (!task) return next(new AppError("Task not found", 404));

      task.done = done;
      task.completedAt = done ? new Date() : undefined;
      task.completedBy =
        done && actorId
          ? new mongoose.Types.ObjectId(actorId as string)
          : undefined;
      await snapshot.save();
      await invalidateBusinessReportCaches(vendorId, period);

      res.status(200).json({
        success: true,
        message: "Task updated successfully",
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/insights/vendors/:vendorId/report
// @access  Private (Admin, Vendor-self)
router.get(
  "/vendors/:vendorId/report",
  authorize(["admin", "vendor"]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const requestStart = Date.now();
      const requestTrigger =
        req.user?.role === "admin"
          ? ReportGenerationTrigger.ADMIN_REQUEST
          : ReportGenerationTrigger.VENDOR_REQUEST;
      const { vendorId } = req.params;
      const period = req.query.period as string;
      const type = ((req.query.type as string) || "health") as
        | "promotion"
        | "health";
      const format = ((req.query.format as string) || "pdf") as "pdf" | "csv";

      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }
      if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        return next(
          new AppError('period is required in "YYYY-MM" format', 400),
        );
      }
      if (!["promotion", "health"].includes(type)) {
        return next(new AppError("type must be promotion or health", 400));
      }
      if (!["pdf", "csv"].includes(format)) {
        return next(new AppError("format must be pdf or csv", 400));
      }

      await assertVendorOwnership(req, vendorId);
      await assertBusinessReportsAccess(req);

      const vendor = await Vendor.findById(vendorId).select(
        "businessName logo coverImage description website socialMedia verificationStatus createdAt stats",
      );
      if (!vendor) return next(new AppError("Vendor not found", 404));

      let snapshot = await VendorBusinessSnapshot.findOne({ vendorId, period });
      if (!snapshot) {
        // First request for this period generates and freezes it, mirroring
        // how the existing event report builds on first request.
        const actorId = (req.user?._id || req.user?.id)?.toString();
        snapshot = await generateSnapshot(vendorId, period, {
          generatedBy: "manual",
          actorId,
          trigger: requestTrigger,
        });
      }

      const integrity = verifySnapshot(snapshot, config.reportIntegritySecret);
      if (integrity.status === "mismatch") {
        logger.error(
          `Business report snapshot integrity mismatch for vendor ${vendorId} (${period})`,
          integrity,
        );
        await logReportGeneration({
          operation: ReportGenerationOperation.PDF_RENDER,
          status: ReportGenerationStatus.FAILED,
          trigger: requestTrigger,
          vendorId: new mongoose.Types.ObjectId(vendorId),
          period,
          snapshotId: snapshot._id,
          reportType: type,
          format,
          durationMs: Date.now() - requestStart,
          errorCode: "INTEGRITY_MISMATCH",
          errorMessage: "Snapshot content hash does not match stored checksum.",
        });
        if (
          snapshot.status === "locked" &&
          INTEGRITY_MISMATCH_BLOCKS_LOCKED_DOWNLOAD
        ) {
          return next(
            new AppError(
              "This snapshot failed its integrity check and cannot be downloaded. Contact support.",
              409,
            ),
          );
        }
      }

      const payload = toReportPayload(snapshot, vendor);

      if (format === "csv") {
        const csvBody = reportPayloadToCsv(payload);
        const filename =
          safeReportFilename("business-report", vendor.businessName, period) +
          ".csv";
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        await logReportGeneration({
          operation: ReportGenerationOperation.CSV_RENDER,
          status: ReportGenerationStatus.SUCCEEDED,
          trigger: requestTrigger,
          vendorId: new mongoose.Types.ObjectId(vendorId),
          period,
          snapshotId: snapshot._id,
          reportType: type,
          format: "csv",
          durationMs: Date.now() - requestStart,
        });
        return res.send(csvBody);
      }

      // PDF format
      await new Promise<void>((resolve, reject) => {
        businessReportPdfLimiter(req, res, (err?: any) =>
          err ? reject(err) : resolve(),
        );
      });

      // Content-addressed: keying on the integrity hash (rather than, say,
      // snapshot.updatedAt) means regeneration automatically mints a new
      // key and stale entries just expire via the existing 600s TTL — no
      // reliance on remembering to call invalidateBusinessReportCaches at
      // every future mutation site. updatedAt specifically would be a trap:
      // the download path itself calls snapshot.save() below to push a
      // "downloaded" audit entry, which would mint a new cache key on every
      // single download and permanently zero out the hit rate. A legacy
      // snapshot with no integrity block falls back to a fixed "legacy" tag
      // (still content-invalidated by the 003a helper on mutation).
      const contentTag =
        snapshot.integrity?.contentHash?.slice(0, 16) ?? "legacy";
      const cacheKey = `report:business:${vendorId}:${period}:${type}:${contentTag}:pdf`;
      const cached = await cacheService.get<Buffer>(cacheKey);
      const filename =
        safeReportFilename("business-report", vendor.businessName, period) +
        ".pdf";

      if (cached) {
        const buf = Buffer.isBuffer(cached)
          ? cached
          : Buffer.from(cached as any);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        await logReportGeneration({
          operation: ReportGenerationOperation.PDF_RENDER,
          status: ReportGenerationStatus.CACHE_HIT,
          trigger: requestTrigger,
          vendorId: new mongoose.Types.ObjectId(vendorId),
          period,
          snapshotId: snapshot._id,
          reportType: type,
          format: "pdf",
          cacheHit: true,
          durationMs: Date.now() - requestStart,
        });
        return res.send(buf);
      }

      let html: string;
      if (type === "promotion") {
        const promotionInput = await VendorPromotionInput.findOne({
          vendorId,
          period,
        });
        html = buildPromotionSnapshotHtml(payload, promotionInput);
      } else {
        html = buildBusinessHealthHtml(payload);
      }
      const renderStart = Date.now();
      const pdfBuffer = await renderReportPdf(html);
      const renderMs = Date.now() - renderStart;
      await cacheService.set(cacheKey, pdfBuffer, { ttl: 600 });
      await logReportGeneration({
        operation: ReportGenerationOperation.PDF_RENDER,
        status: ReportGenerationStatus.SUCCEEDED,
        trigger: requestTrigger,
        vendorId: new mongoose.Types.ObjectId(vendorId),
        period,
        snapshotId: snapshot._id,
        reportType: type,
        format: "pdf",
        cacheHit: false,
        pdfBytes: pdfBuffer.length,
        durationMs: Date.now() - requestStart,
        renderMs,
      });

      snapshot.auditTrail.push({
        action: "downloaded",
        actorId:
          req.user?._id || req.user?.id
            ? new mongoose.Types.ObjectId(
                (req.user?._id || req.user?.id) as string,
              )
            : snapshot.vendorId,
        at: new Date(),
        detail: `${type} pdf`,
      });
      await snapshot.save();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
