import mongoose from "mongoose";
import { Event, Order, Ticket, User, Review } from "../models/index";

// =============================================================================
// ANALYTICS TERMINOLOGY CONTRACT
// =============================================================================
// These definitions apply to every analytics surface (global, per-event, CSV).
// When adding new metrics, document them here first to prevent formula drift.
//
//  orderRevenue          — $sum of Order.total for paid orders.
//                          Order-level aggregate. May span multiple events,
//                          includes discounts, fees, taxes. Used for period/
//                          trend totals in getDashboardSummary / getPeriodStats.
//
//  eventAttributedRevenue — $sum of items.totalPrice for paid order items
//                          matched to a specific event. The canonical
//                          per-event / top-events revenue figure.
//                          Used in: getEventRevenueStats, getTopPerformingEvents,
//                          per-event performance handler, dashboard topEvents.
//
//  refundAmount          — $sum of Order.refundAmount where status="refunded".
//                          Sourced from paymentRouting or refundAmount field.
//
//  netRevenue            — eventAttributedRevenue − refundAmount (or
//                          orderRevenue − refundAmount for order-level surfaces).
//                          Explicitly noted per surface to avoid ambiguity.
//
//  platformCommission    — $sum of paymentRouting.platformCommission (paid orders).
//  vendorPayout          — $sum of paymentRouting.vendorPayout (paid orders).
//
//  viewToOrderRate       — (confirmed/paid orders ÷ total event views) × 100.
//                          Funnel metric: how many views convert to a purchase.
//                          Formerly "conversionRate" in OrderAnalytics —
//                          that name is deprecated; use viewToOrderRate.
//
//  userPurchaseRate      — (paid orders ÷ total users) × 100.
//                          Audience metric: what fraction of users ever bought.
//                          Previously also called "conversionRate" in dashboard
//                          stats — renamed to avoid collision with viewToOrderRate.
//
// Reference fixture for tests:
//   One paid Order with:
//     - 2 event items (different eventIds), each with items.totalPrice set
//     - a discount applied at order level
//     - status="refunded" + refundAmount set
//     - paymentRouting.platformCommission and .vendorPayout set
//   All surfaces must agree on eventAttributedRevenue for each event item.
// =============================================================================

// Analytics interfaces
export interface EventAnalytics {
  totalEvents: number;
  activeEvents: number;
  pendingApproval: number;
  totalViews: number;
  averageRating: number;
  topCategories: Array<{ category: string; count: number }>;
  topLocations: Array<{ city: string; count: number }>;
  eventsByMonth: Array<{ month: string; count: number }>;
  revenueByEvent: Array<{
    eventId: string;
    title: string;
    revenue: number;
    tickets: number;
  }>;
}

export interface OrderAnalytics {
  totalOrders: number;
  /** orderRevenue: $sum of Order.total (paid). Order-level; may span multiple events. */
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
  ordersByMonth: Array<{ month: string; count: number; revenue: number }>;
  ordersByDay?: Array<{ day: string; count: number; revenue: number }>;
  topCurrencies: Array<{ currency: string; count: number; revenue: number }>;
  /** viewToOrderRate: confirmed/paid orders ÷ event views × 100. Funnel metric. */
  viewToOrderRate: number;
  /** @deprecated Use viewToOrderRate. Kept for one release for backward compat. */
  conversionRate: number;
  refundRate: number;
}

export interface TicketAnalytics {
  totalTickets: number;
  checkedInTickets: number;
  transferredTickets: number;
  cancelledTickets: number;
  checkInRate: number;
  transferRate: number;
  ticketsByType: Array<{ type: string; count: number }>;
  scansByHour: Array<{ hour: number; scans: number }>;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Array<{ role: string; count: number }>;
  usersByMonth: Array<{ month: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  verificationRate: number;
}

export interface VenueAnalytics {
  totalVenues: number;
  activeVenues: number;
  venuesByType: Array<{ type: string; count: number }>;
  venuesByCity: Array<{ city: string; count: number }>;
  averageCapacity: number;
  utilizationRate: number;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalUsers: number;
  revenueGrowth: number;
  eventGrowth: number;
  userGrowth: number;
  topPerformingEvents: Array<{
    eventId: string;
    title: string;
    revenue: number;
    tickets: number;
    rating: number;
  }>;
}

class AnalyticsService {
  /**
   * Get comprehensive event analytics
   */
  async getEventAnalytics(
    vendorId?: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<EventAnalytics> {
    const matchFilter: any = { isDeleted: { $ne: true } };
    if (vendorId) matchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const [
      totalEvents,
      eventStats,
      categoryStats,
      locationStats,
      monthlyStats,
      revenueStats,
    ] = await Promise.all([
      Event.countDocuments(matchFilter),
      Event.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ["$isApproved", true] }, 1, 0] } },
            pending: {
              $sum: { $cond: [{ $eq: ["$isApproved", false] }, 1, 0] },
            },
            totalViews: { $sum: "$viewsCount" },
            avgRating: { $avg: "$averageRating" },
          },
        },
      ]),
      Event.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Event.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$location.city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Event.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.getEventRevenueStats(vendorId, dateRange),
    ]);

    return {
      totalEvents,
      activeEvents: eventStats[0]?.active || 0,
      pendingApproval: eventStats[0]?.pending || 0,
      totalViews: eventStats[0]?.totalViews || 0,
      averageRating: eventStats[0]?.avgRating || 0,
      topCategories: categoryStats.map((item: any) => ({
        category: item._id,
        count: item.count,
      })),
      topLocations: locationStats.map((item: any) => ({
        city: item._id,
        count: item.count,
      })),
      eventsByMonth: monthlyStats.map((item: any) => ({
        month: item._id,
        count: item.count,
      })),
      revenueByEvent: revenueStats,
    };
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(
    vendorId?: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<OrderAnalytics> {
    const baseFilter: any = {};
    if (dateRange) {
      baseFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const eventMatchFilter: any = {};
    if (vendorId) {
      eventMatchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
      const vendorEvents = await Event.find(eventMatchFilter).select("_id");
      const eventIds = vendorEvents.map(
        (event) => event._id as mongoose.Types.ObjectId,
      );
      baseFilter["items.eventId"] = { $in: eventIds };
    }

    // Only count paid orders for revenue
    const paidFilter = { ...baseFilter, paymentStatus: "paid" };

    const [
      totalOrders,
      orderStats,
      statusStats,
      monthlyStats,
      dailyStats,
      currencyStats,
      viewStats,
    ] = await Promise.all([
      Order.countDocuments(baseFilter),
      Order.aggregate([
        { $match: paidFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            avgOrderValue: { $avg: "$total" },
            refundedOrders: {
              $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
            },
          },
        },
      ]),
      Order.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        { $match: paidFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: paidFilter },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: paidFilter },
        {
          $group: {
            _id: "$currency",
            count: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Event.aggregate([
        { $match: vendorId ? { ...eventMatchFilter, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } } },
        { $group: { _id: null, totalViews: { $sum: "$viewsCount" } } },
      ]),
    ]);

    const stats = orderStats[0] || {};
    const totalViews = viewStats[0]?.totalViews || 0;
    const refundRate =
      totalOrders > 0 ? (stats.refundedOrders / totalOrders) * 100 : 0;
    // Confirmed (paid) orders as a share of total event views
    const confirmedOrderCount =
      statusStats.find((s: any) => s._id === "confirmed")?.count || 0;
    const computedConversionRate =
      totalViews > 0 ? (confirmedOrderCount / totalViews) * 100 : 0;

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      totalOrders,
      totalRevenue: round2(stats.totalRevenue || 0),
      averageOrderValue: round2(stats.avgOrderValue || 0),
      ordersByStatus: statusStats.map((item: any) => ({
        status: item._id,
        count: item.count,
        revenue: item.revenue,
      })),
      ordersByMonth: monthlyStats.map((item: any) => ({
        month: item._id,
        count: item.count,
        revenue: Math.round(item.revenue * 100) / 100,
      })),
      ordersByDay: dailyStats.map((item: any) => ({
        day: item._id,
        count: item.count,
        revenue: Math.round(item.revenue * 100) / 100,
      })),
      topCurrencies: currencyStats.map((item: any) => ({
        currency: item._id,
        count: item.count,
        revenue: item.revenue,
      })),
      /** viewToOrderRate: confirmed paid orders / total event views × 100 */
      viewToOrderRate: Math.round(computedConversionRate * 100) / 100,
      /** @deprecated alias for viewToOrderRate — remove after one release */
      conversionRate: Math.round(computedConversionRate * 100) / 100,
      refundRate,
    };
  }

  /**
   * Get ticket analytics
   */
  async getTicketAnalytics(
    vendorId?: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<TicketAnalytics> {
    const matchFilter: any = {};
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // If vendor-specific, need to filter by events belonging to vendor
    if (vendorId) {
      const vendorEvents = await Event.find({
        vendorId: new mongoose.Types.ObjectId(vendorId),
      }).select("_id");
      const eventIds = vendorEvents.map((event) => event._id);
      matchFilter.eventId = { $in: eventIds };
    }

    const [totalTickets, ticketStats, typeStats, hourlyScans] =
      await Promise.all([
        Ticket.countDocuments(matchFilter),
        Ticket.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: null,
              checkedIn: {
                $sum: {
                  $cond: [{ $eq: ["$checkInDetails.isCheckedIn", true] }, 1, 0],
                },
              },
              transferred: {
                $sum: { $cond: [{ $eq: ["$status", "transferred"] }, 1, 0] },
              },
              cancelled: {
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
              },
            },
          },
        ]),
        Ticket.aggregate([
          { $match: matchFilter },
          { $group: { _id: "$ticketType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Ticket.aggregate([
          {
            $match: {
              ...matchFilter,
              "checkInDetails.isCheckedIn": true,
              "checkInDetails.checkInTime": { $exists: true },
            },
          },
          {
            $group: {
              _id: { $hour: "$checkInDetails.checkInTime" },
              scans: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const stats = ticketStats[0] || {};
    const checkInRate =
      totalTickets > 0 ? (stats.checkedIn / totalTickets) * 100 : 0;
    const transferRate =
      totalTickets > 0 ? (stats.transferred / totalTickets) * 100 : 0;

    return {
      totalTickets,
      checkedInTickets: stats.checkedIn || 0,
      transferredTickets: stats.transferred || 0,
      cancelledTickets: stats.cancelled || 0,
      checkInRate,
      transferRate,
      ticketsByType: typeStats.map((item: any) => ({
        type: item._id,
        count: item.count,
      })),
      scansByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        scans: hourlyScans.find((item: any) => item._id === hour)?.scans || 0,
      })),
    };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<UserAnalytics> {
    const matchFilter: any = {};
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const [totalUsers, userStats, roleStats, monthlyStats, countryStats] =
      await Promise.all([
        User.countDocuments(matchFilter),
        User.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: null,
              active: {
                $sum: { $cond: [{ $ne: ["$status", "suspended"] }, 1, 0] },
              },
              verified: {
                $sum: { $cond: [{ $eq: ["$isEmailVerified", true] }, 1, 0] },
              },
            },
          },
        ]),
        User.aggregate([
          { $match: matchFilter },
          { $group: { _id: "$role", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        User.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        User.aggregate([
          { $match: { ...matchFilter, country: { $exists: true, $ne: null } } },
          { $group: { _id: "$country", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

    const stats = userStats[0] || {};
    const verificationRate =
      totalUsers > 0 ? (stats.verified / totalUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers: stats.active || 0,
      usersByRole: roleStats.map((item: any) => ({
        role: item._id,
        count: item.count,
      })),
      usersByMonth: monthlyStats.map((item: any) => ({
        month: item._id,
        count: item.count,
      })),
      topCountries: countryStats.map((item: any) => ({
        country: item._id,
        count: item.count,
      })),
      verificationRate,
    };
  }

  /**
   * Get venue analytics
   */
  async getVenueAnalytics(vendorId?: string): Promise<VenueAnalytics> {
    const matchFilter: any = { isDeleted: { $ne: true } };
    if (vendorId) matchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);

    // "Venues" = offline/physical events in this system
    const venueFilter = { ...matchFilter, venueType: "Offline" };

    const [totalVenues, venueStats, typeStats, cityStats, seatStats] =
      await Promise.all([
        Event.countDocuments(venueFilter),
        Event.aggregate([
          { $match: venueFilter },
          {
            $group: {
              _id: null,
              active: {
                $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
              },
              avgCapacity: { $avg: "$capacity" },
            },
          },
        ]),
        Event.aggregate([
          { $match: venueFilter },
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Event.aggregate([
          { $match: venueFilter },
          { $group: { _id: "$location.city", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        // Seat utilization from dateSchedule
        Event.aggregate([
          { $match: venueFilter },
          { $unwind: "$dateSchedule" },
          { $match: { "dateSchedule.unlimitedSeats": { $ne: true } } },
          {
            $group: {
              _id: null,
              soldSeats: { $sum: "$dateSchedule.soldSeats" },
              totalSeats: {
                $sum: {
                  $add: [
                    { $ifNull: ["$dateSchedule.soldSeats", 0] },
                    { $ifNull: ["$dateSchedule.availableSeats", 0] },
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const stats = venueStats[0] || {};
    const seats = seatStats[0] || {};
    const utilizationRate =
      seats.totalSeats > 0
        ? Math.round((seats.soldSeats / seats.totalSeats) * 10000) / 100
        : 0;

    return {
      totalVenues,
      activeVenues: stats.active || 0,
      venuesByType: typeStats.map((item: any) => ({
        type: item._id,
        count: item.count,
      })),
      venuesByCity: cityStats.map((item: any) => ({
        city: item._id,
        count: item.count,
      })),
      averageCapacity: Math.round(stats.avgCapacity || 0),
      utilizationRate,
    };
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(vendorId?: string): Promise<DashboardSummary> {
    const currentDate = new Date();
    const lastMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    const thisMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    const [allTimeStats, currentMonthStats, previousMonthStats, topEvents] =
      await Promise.all([
        this.getPeriodStats(vendorId), // all-time
        this.getPeriodStats(vendorId, { start: thisMonth, end: currentDate }), // this month
        this.getPeriodStats(vendorId, { start: lastMonth, end: thisMonth }), // last month
        this.getTopPerformingEvents(vendorId, 5),
      ]);

    const revenueGrowth =
      previousMonthStats.revenue > 0
        ? ((currentMonthStats.revenue - previousMonthStats.revenue) /
            previousMonthStats.revenue) *
          100
        : 0;

    const eventGrowth =
      previousMonthStats.events > 0
        ? ((currentMonthStats.events - previousMonthStats.events) /
            previousMonthStats.events) *
          100
        : 0;

    const userGrowth =
      previousMonthStats.users > 0
        ? ((currentMonthStats.users - previousMonthStats.users) /
            previousMonthStats.users) *
          100
        : 0;

    return {
      totalRevenue: allTimeStats.revenue,
      totalEvents: allTimeStats.events,
      totalTicketsSold: allTimeStats.tickets,
      totalUsers: allTimeStats.users,
      revenueGrowth,
      eventGrowth,
      userGrowth,
      topPerformingEvents: topEvents,
    };
  }

  /**
   * Helper: Get event revenue statistics
   * Starts from Orders (not Events) to avoid O(events × orders) correlated $lookup
   * that exceeds MongoDB's 100 MB aggregation memory limit on large datasets.
   */
  private async getEventRevenueStats(
    vendorId?: string,
    dateRange?: { start: Date; end: Date },
  ) {
    const eventPostMatch: any = { "event.isDeleted": { $ne: true } };
    if (vendorId) {
      eventPostMatch["event.vendorId"] = new mongoose.Types.ObjectId(vendorId);
    }
    if (dateRange) {
      eventPostMatch["event.createdAt"] = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    return await Order.aggregate(
      [
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.eventId",
            revenue: { $sum: "$items.totalPrice" },
            tickets: { $sum: "$items.quantity" },
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: { path: "$event", preserveNullAndEmptyArrays: false } },
        { $match: eventPostMatch },
        {
          $project: {
            eventId: "$_id",
            title: "$event.title",
            revenue: 1,
            tickets: 1,
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ],
      { allowDiskUse: true },
    );
  }

  /**
   * Helper: Get period statistics
   */
  private async getPeriodStats(
    vendorId?: string,
    dateRange?: { start: Date; end: Date },
  ) {
    const dateFilter: any = {};
    if (dateRange) {
      dateFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const eventMatchFilter: any = { ...dateFilter, isDeleted: { $ne: true } };
    const orderMatchFilter: any = { ...dateFilter, paymentStatus: "paid" };
    const ticketMatchFilter: any = { ...dateFilter };

    if (vendorId) {
      eventMatchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);

      const vendorEvents = await Event.find({
        vendorId: new mongoose.Types.ObjectId(vendorId),
      }).select("_id");
      const eventIds = vendorEvents.map((event) => event._id);
      orderMatchFilter["items.eventId"] = { $in: eventIds };
      ticketMatchFilter.eventId = { $in: eventIds };
    }

    const [eventCount, orderStats, ticketCount, userCount] = await Promise.all([
      Event.countDocuments(eventMatchFilter),
      Order.aggregate([
        { $match: orderMatchFilter },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]),
      Ticket.countDocuments(ticketMatchFilter),
      vendorId ? Promise.resolve(0) : User.countDocuments(dateFilter),
    ]);

    return {
      events: eventCount,
      revenue: orderStats[0]?.revenue || 0,
      tickets: ticketCount,
      users: userCount,
    };
  }

  /**
   * Helper: Get top performing events
   * Starts from Orders (not Events) to avoid O(events × orders) correlated $lookup.
   */
  private async getTopPerformingEvents(vendorId?: string, limit: number = 10) {
    const eventPostMatch: any = { "event.isDeleted": { $ne: true } };
    if (vendorId) {
      eventPostMatch["event.vendorId"] = new mongoose.Types.ObjectId(vendorId);
    }

    return await Order.aggregate(
      [
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.eventId",
            revenue: { $sum: "$items.totalPrice" },
            tickets: { $sum: "$items.quantity" },
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: { path: "$event", preserveNullAndEmptyArrays: false } },
        { $match: eventPostMatch },
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "event",
            pipeline: [
              { $match: { status: "approved" } },
              { $group: { _id: null, avgRating: { $avg: "$rating" } } },
            ],
            as: "reviewData",
          },
        },
        {
          $project: {
            eventId: "$_id",
            title: "$event.title",
            revenue: 1,
            tickets: 1,
            rating: {
              $ifNull: [{ $arrayElemAt: ["$reviewData.avgRating", 0] }, 0],
            },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
      ],
      { allowDiskUse: true },
    );
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
