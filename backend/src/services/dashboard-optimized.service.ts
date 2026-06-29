import {
  User,
  Event,
  Order,
  Review,
  Booking,
  Ticket,
  Payment,
  Category,
  Blog,
  Affiliate,
  Coupon,
  RevenueTransaction,
} from "../models/index";

/**
 * Optimized Dashboard Service
 * Consolidates 40+ queries into 5 efficient aggregation pipelines using $facet
 */

interface DashboardFilters {
  dateFilter: any;
  previousPeriodFilter: any;
}

export class DashboardOptimizedService {
  /**
   * Get comprehensive user statistics in a single aggregation
   */
  async getUserStats(filters: DashboardFilters) {
    const userStats = await User.aggregate([
      {
        $facet: {
          // Basic counts
          total: [{ $count: "count" }],
          new: [{ $match: filters.dateFilter }, { $count: "count" }],
          previousPeriod: [
            { $match: filters.previousPeriodFilter },
            { $count: "count" },
          ],
          active: [{ $match: { status: "active" } }, { $count: "count" }],

          // Group by role
          byRole: [
            { $group: { _id: "$role", count: { $sum: 1 } } },
            { $project: { role: "$_id", count: 1, _id: 0 } },
          ],

          // Group by status
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } },
          ],

          // Growth trend by month (last 12 months)
          growthTrend: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(
                    new Date().setMonth(new Date().getMonth() - 12),
                  ),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);

    return {
      totalUsers: userStats[0].total[0]?.count || 0,
      newUsers: userStats[0].new[0]?.count || 0,
      previousPeriodUsers: userStats[0].previousPeriod[0]?.count || 0,
      activeUsers: userStats[0].active[0]?.count || 0,
      usersByRole: userStats[0].byRole,
      usersByStatus: userStats[0].byStatus,
      userGrowthTrend: userStats[0].growthTrend,
    };
  }

  /**
   * Get comprehensive event statistics in a single aggregation
   */
  async getEventStats(filters: DashboardFilters) {
    const eventStats = await Event.aggregate([
      {
        $facet: {
          // Basic counts
          total: [{ $match: { isDeleted: false } }, { $count: "count" }],
          approved: [
            { $match: { isApproved: true, isDeleted: false } },
            { $count: "count" },
          ],
          pending: [
            { $match: { status: "pending", isDeleted: false } },
            { $count: "count" },
          ],
          rejected: [
            { $match: { status: "rejected", isDeleted: false } },
            { $count: "count" },
          ],

          // Group by type
          byType: [
            { $match: { isDeleted: false } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $project: { type: "$_id", count: 1, _id: 0 } },
          ],

          // Group by status
          byStatus: [
            { $match: { isDeleted: false } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } },
          ],

          // Group by category
          byCategory: [
            { $match: { isDeleted: false } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $project: { category: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],

          // Total views
          totalViews: [
            { $match: { isDeleted: false } },
            { $group: { _id: null, totalViews: { $sum: "$viewsCount" } } },
          ],

          // Approval rate over time
          approvalRate: [
            {
              $match: {
                isDeleted: false,
                createdAt: {
                  $gte: new Date(
                    new Date().setMonth(new Date().getMonth() - 6),
                  ),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                total: { $sum: 1 },
                approved: {
                  $sum: { $cond: [{ $eq: ["$isApproved", true] }, 1, 0] },
                },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);

    return {
      totalEvents: eventStats[0].total[0]?.count || 0,
      approvedEvents: eventStats[0].approved[0]?.count || 0,
      pendingEvents: eventStats[0].pending[0]?.count || 0,
      rejectedEvents: eventStats[0].rejected[0]?.count || 0,
      eventsByType: eventStats[0].byType,
      eventsByStatus: eventStats[0].byStatus,
      eventsByCategory: eventStats[0].byCategory,
      totalEventViews: eventStats[0].totalViews[0]?.totalViews || 0,
      eventApprovalRateData: eventStats[0].approvalRate,
    };
  }

  /**
   * Get comprehensive order and revenue statistics in a single aggregation
   */
  async getOrderStats(filters: DashboardFilters) {
    const orderStats = await Order.aggregate([
      {
        $facet: {
          // Basic counts
          total: [{ $count: "count" }],
          new: [{ $match: filters.dateFilter }, { $count: "count" }],
          previousPeriod: [
            { $match: filters.previousPeriodFilter },
            { $count: "count" },
          ],
          paid: [{ $match: { paymentStatus: "paid" } }, { $count: "count" }],
          pending: [
            { $match: { paymentStatus: "pending" } },
            { $count: "count" },
          ],
          cancelled: [{ $match: { status: "cancelled" } }, { $count: "count" }],

          // Revenue calculations
          totalRevenue: [
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, total: { $sum: "$total" } } },
          ],
          previousRevenue: [
            {
              $match: {
                paymentStatus: "paid",
                ...filters.previousPeriodFilter,
              },
            },
            { $group: { _id: null, total: { $sum: "$total" } } },
          ],

          // Group by status
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } },
          ],

          // Group by payment status
          byPaymentStatus: [
            { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
            { $project: { paymentStatus: "$_id", count: 1, _id: 0 } },
          ],

          // Revenue by month (last 12 months)
          revenueByMonth: [
            {
              $match: {
                paymentStatus: "paid",
                createdAt: {
                  $gte: new Date(
                    new Date().setMonth(new Date().getMonth() - 12),
                  ),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],

          // Recent orders with basic info
          recentOrders: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                orderNumber: 1,
                total: 1,
                paymentStatus: 1,
                status: 1,
                createdAt: 1,
                userId: 1,
              },
            },
          ],

          // Top events by revenue — uses eventAttributedRevenue ($sum items.totalPrice)
          // NOT unitPrice*quantity (ignores item-level discounts applied at checkout).
          // Must match per-event handler and getEventRevenueStats. See terminology contract.
          topEventsByRevenue: [
            { $match: { paymentStatus: "paid" } },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.eventId",
                totalRevenue: {
                  $sum: "$items.totalPrice",
                },
                totalBookings: { $sum: "$items.quantity" },
              },
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
          ],

          // Average order value
          averageOrderValue: [
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, avgValue: { $avg: "$total" } } },
          ],

          // Financial metrics
          platformCommission: [
            {
              $match: { paymentStatus: "paid" },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$paymentRouting.platformCommission" },
              },
            },
          ],
          vendorPayouts: [
            {
              $match: { paymentStatus: "paid" },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$paymentRouting.vendorPayout" },
              },
            },
          ],
          refundAmount: [
            {
              $match: { status: "refunded" },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$refundAmount" },
              },
            },
          ],
        },
      },
    ]);

    const stats = orderStats[0];
    const totalRevenue = stats.totalRevenue[0]?.total || 0;
    const platformCommission = stats.platformCommission[0]?.total || 0;
    const vendorPayouts = stats.vendorPayouts[0]?.total || 0;
    const refundAmount = stats.refundAmount[0]?.total || 0;

    return {
      totalOrders: stats.total[0]?.count || 0,
      newOrders: stats.new[0]?.count || 0,
      previousPeriodOrders: stats.previousPeriod[0]?.count || 0,
      paidOrders: stats.paid[0]?.count || 0,
      pendingOrders: stats.pending[0]?.count || 0,
      cancelledOrders: stats.cancelled[0]?.count || 0,
      totalRevenue,
      previousPeriodRevenue: stats.previousRevenue[0]?.total || 0,
      ordersByStatus: stats.byStatus,
      ordersByPaymentStatus: stats.byPaymentStatus,
      revenueByMonth: stats.revenueByMonth,
      recentOrders: stats.recentOrders,
      topEventsByRevenue: stats.topEventsByRevenue,
      averageOrderValue: stats.averageOrderValue[0]?.avgValue || 0,
      platformCommission,
      vendorPayouts,
      refundAmount,
      netRevenue: totalRevenue - refundAmount,
    };
  }

  /**
   * Get simple counts for other models in parallel
   */
  async getSimpleCounts() {
    const [
      totalReviews,
      avgRating,
      totalBookings,
      totalTickets,
      totalPayments,
      totalCategories,
      totalVenues,
      totalBlogs,
      totalAffiliates,
      activeCoupons,
      totalRevenueTransactions,
    ] = await Promise.all([
      Review.countDocuments(),
      Review.aggregate([
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]),
      Booking.countDocuments(),
      Ticket.countDocuments(),
      Payment.countDocuments(),
      Category.countDocuments(),
      Event.countDocuments({ type: "Venue" }),
      Blog.countDocuments(),
      Affiliate.countDocuments(),
      Coupon.countDocuments({ isActive: true }),
      RevenueTransaction.countDocuments(),
    ]);

    return {
      totalReviews,
      avgRating: avgRating[0]?.avgRating || 0,
      totalBookings,
      totalTickets,
      totalPayments,
      totalCategories,
      totalVenues,
      totalBlogs,
      totalAffiliates,
      activeCoupons,
      totalRevenueTransactions,
    };
  }

  /**
   * Get all dashboard stats optimized (40+ queries → 5 aggregations)
   */
  async getAllStats(filters: DashboardFilters) {
    // Run all aggregations in parallel
    const [userStats, eventStats, orderStats, simpleCounts] = await Promise.all(
      [
        this.getUserStats(filters),
        this.getEventStats(filters),
        this.getOrderStats(filters),
        this.getSimpleCounts(),
      ],
    );

    return {
      ...userStats,
      ...eventStats,
      ...orderStats,
      ...simpleCounts,
    };
  }
}

export const dashboardOptimizedService = new DashboardOptimizedService();
