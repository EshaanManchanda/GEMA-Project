import { Router, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../types/index";
import { AppError } from "../../middleware/error";
import { authenticate, authorize } from "../../middleware/auth";
import { analyticsService } from "./analytics.service";
import { Vendor } from "../../models/index";
import { UserRole } from "../../models/index";

const router = Router();

router.use(authenticate);

/**
 * Resolve vendor profile _id from the logged-in user.
 * Events store event.vendorId = Vendor._id (not User._id).
 */
async function resolveVendorId(req: AuthRequest): Promise<string | undefined> {
  if (req.user?.role !== UserRole.VENDOR) return undefined;
  const userId = req.user._id || req.user.id;
  const profile = await Vendor.findOne({ userId }).select("_id").lean();
  return profile?._id?.toString();
}

function parseDateRange(startDate: any, endDate: any) {
  if (!startDate || !endDate) return undefined;
  return {
    start: new Date(startDate as string),
    end: new Date(endDate as string),
  };
}

// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Vendor)
router.get(
  "/dashboard",
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
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
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getEventAnalytics(vendorId, dateRange);
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
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getOrderAnalytics(vendorId, dateRange);
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
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(req.query.startDate, req.query.endDate);
      const analytics = await analyticsService.getTicketAnalytics(vendorId, dateRange);
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
  authorize([UserRole.ADMIN]),
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
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
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
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, groupBy = "month" } = req.query;
      if (!startDate || !endDate) {
        return next(new AppError("startDate and endDate are required", 400));
      }
      const vendorId = await resolveVendorId(req);
      const dateRange = parseDateRange(startDate, endDate);
      const analytics = await analyticsService.getOrderAnalytics(vendorId, dateRange);

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
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return next(new AppError("Invalid event ID", 400));
      }

      const Event = require("../../models/Event").default;
      const Order = require("../../models/Order").default;
      const Ticket = require("../../models/Ticket").default;
      const Review = require("../../models/Review").default;
      const Registration = require("../../models/Registration").default;

      const eventObjId = new mongoose.Types.ObjectId(eventId);

      // For vendors: verify ownership
      if (req.user?.role === UserRole.VENDOR) {
        const vendorId = await resolveVendorId(req);
        const event = await Event.findById(eventObjId).select("vendorId");
        if (!event) return next(new AppError("Event not found", 404));
        if (event.vendorId.toString() !== vendorId) {
          return next(new AppError("Access denied", 403));
        }
      }

      const [eventData, orderData, ticketData, reviewData, registrationData] =
        await Promise.all([
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
                  $sum: { $cond: [{ $eq: ["$checkInDetails.isCheckedIn", true] }, 1, 0] },
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
        ]);

      if (!eventData) return next(new AppError("Event not found", 404));

      const orderStats = orderData[0] || {};
      const ticketStats = ticketData[0] || {};
      const reviewStats = reviewData[0] || {};

      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
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
          ? Math.round(((orderStats.totalOrders || 0) / eventData.viewsCount) * 10000) / 100
          : 0;

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
                ? Math.round((ticketStats.checkedIn / ticketStats.totalTickets) * 10000) / 100
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
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   GET /api/analytics/export
// @access  Private (Admin, Vendor)
router.get(
  "/export",
  authorize([UserRole.ADMIN, UserRole.VENDOR]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { type, startDate, endDate, format = "json" } = req.query;
      if (
        !type ||
        !["events", "orders", "tickets", "users", "venues"].includes(type as string)
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
          if (req.user?.role !== UserRole.ADMIN) return next(new AppError("Access denied", 403));
          data = await analyticsService.getUserAnalytics(dateRange);
          break;
        case "venues":
          data = await analyticsService.getVenueAnalytics(vendorId);
          break;
      }

      const filename = `${type}-analytics-${new Date().toISOString().split("T")[0]}`;
      res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.${format}"`);
      res.json({ success: true, exportType: type, exportDate: new Date(), dateRange, data });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
