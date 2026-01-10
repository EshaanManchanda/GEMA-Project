import { Request, Response, NextFunction } from 'express';
import {
  User, Event, Order, Review, Booking, Ticket, Payment,
  Category, Venue, Blog, // Notification, // Commented out - notification system disabled
  Affiliate, Coupon, RevenueTransaction, AdminRevenueSettings,
  AdvertisingCampaign, VendorSubscription, CheckinLog
} from '../models/index';
import { AppError } from '../middleware/index';
import { cacheService } from '../services/cache.service';
import { dashboardOptimizedService } from '../services/dashboard-optimized.service';
import { CacheGroups } from '../utils/cache-groups.utils';

/**
 * Get comprehensive dashboard statistics
 *
 * OPTIMIZATION: Aggressive caching (5 minutes TTL) to handle 40+ parallel database queries
 * Critical for KVM1 single-core performance
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    // Generate cache key based on query parameters
    const cacheKey = `admin:dashboard:stats:${startDate || 'default'}:${endDate || 'default'}:${period}`;

    // Try to get cached data first (HUGE performance improvement!)
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        cached: true,
        data: cached
      });
      return;
    }

    // Calculate date range using optimized date arithmetic
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    let dateFilter: any = {};
    let previousPeriodFilter: any = {};

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate as string);
    } else {
      // Default to last 30 days (optimized date calculation)
      const thirtyDaysAgo = new Date(now - 30 * DAY_MS);
      const sixtyDaysAgo = new Date(now - 60 * DAY_MS);

      dateFilter.createdAt = { $gte: thirtyDaysAgo };
      previousPeriodFilter.createdAt = { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo };
    }

    // OPTIMIZED: Use aggregation pipelines (40+ queries → 5 aggregations)
    const stats = await dashboardOptimizedService.getAllStats({
      dateFilter,
      previousPeriodFilter
    });

    // Extract stats for backward compatibility with existing response structure
    const {
      totalUsers,
      newUsers,
      previousPeriodUsers,
      activeUsers,
      usersByRole,
      usersByStatus,
      userGrowthTrend,
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      eventsByType,
      eventsByStatus,
      eventsByCategory,
      totalEventViews,
      eventApprovalRateData,
      totalOrders,
      newOrders,
      previousPeriodOrders,
      paidOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue,
      previousPeriodRevenue,
      ordersByStatus,
      ordersByPaymentStatus,
      revenueByMonth,
      recentOrders,
      topEventsByRevenue,
      averageOrderValue,
      platformCommission,
      vendorPayouts,
      refundAmount,
      netRevenue,
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
      totalRevenueTransactions
    } = stats;

    // Lightweight supplementary queries (only what's not in optimized service)
    const [
      topPerformingCategories,
      topPerformingVenues,
      revenueByEventType,
      repeatCustomerRate,
      totalNotifications,
    ] = await Promise.all([
      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', revenue: { $sum: '$price' }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Venue.aggregate([
        { $group: { _id: '$_id', name: { $first: '$name' }, eventCount: { $sum: 1 } } },
        { $sort: { eventCount: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'events', localField: 'items.eventId', foreignField: '_id', as: 'events' } },
        { $unwind: '$events' },
        { $group: { _id: '$events.type', revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),
      User.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        { $match: { 'orders.1': { $exists: true } } },
        { $count: 'repeatCustomers' },
      ]),
      // Notification system disabled, return 0
      Promise.resolve(0),
    ]);

    // System health metrics (lightweight)
    const systemUptime = {
      uptime: Math.floor(process.uptime()),
      status: 'healthy'
    };
    const errorRate = 0; // Placeholder - implement with APM tool
    const responseTime = 0; // Placeholder - implement with APM tool
    const databasePerformance = 'good'; // Placeholder - implement with MongoDB Atlas metrics

    // Calculate growth percentages
    const userGrowthRate = previousPeriodUsers > 0
      ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100
      : 0;

    const revenueGrowthRate = previousPeriodRevenue > 0
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0;

    const ordersGrowthRate = previousPeriodOrders > 0
      ? ((newOrders - previousPeriodOrders) / previousPeriodOrders) * 100
      : 0;

    // Calculate additional metrics
    const conversionRate = totalUsers > 0 ? (paidOrders / totalUsers) * 100 : 0;
    const customerRetentionRate = totalUsers > 0 ? (repeatCustomerRate[0]?.repeatCustomers / totalUsers) * 100 : 0;
    const eventApprovalRate = totalEvents > 0 ? (approvedEvents / totalEvents) * 100 : 0;

    const dashboardStats = {
      overview: {
        totalUsers,
        newUsers,
        previousPeriodUsers,
        userGrowthRate: Math.round(userGrowthRate * 100) / 100,
        activeUsers,
        totalEvents,
        approvedEvents,
        pendingEvents,
        rejectedEvents,
        eventApprovalRate: Math.round(eventApprovalRate * 100) / 100,
        totalOrders,
        newOrders,
        previousPeriodOrders,
        ordersGrowthRate: Math.round(ordersGrowthRate * 100) / 100,
        paidOrders,
        pendingOrders,
        cancelledOrders,
        totalRevenue,
        previousPeriodRevenue,
        revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
        totalReviews,
        averageRating: Math.round(avgRating * 100) / 100,
        totalEventViews,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        customerRetentionRate: Math.round(customerRetentionRate * 100) / 100,
      },

      userBreakdown: {
        byRole: usersByRole.reduce((acc: any, item: any) => {
          acc[item.role] = item.count;
          return acc;
        }, {}),
        byStatus: usersByStatus.reduce((acc: any, item: any) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
      },

      eventBreakdown: {
        byType: eventsByType.reduce((acc: any, item: any) => {
          acc[item.type] = item.count;
          return acc;
        }, {}),
        byStatus: eventsByStatus.reduce((acc: any, item: any) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        byCategory: eventsByCategory.reduce((acc: any, item: any) => {
          acc[item.category] = item.count;
          return acc;
        }, {}),
      },

      orderBreakdown: {
        byStatus: ordersByStatus.reduce((acc: any, item: any) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        byPaymentStatus: ordersByPaymentStatus.reduce((acc: any, item: any) => {
          acc[item.paymentStatus] = item.count;
          return acc;
        }, {}),
      },

      financialMetrics: {
        platformCommission,
        vendorPayouts,
        refundAmount,
        netRevenue,
        revenueByEventType: revenueByEventType.reduce((acc: any, item: any) => {
          acc[item._id] = item.revenue;
          return acc;
        }, {}),
      },
      
      performanceMetrics: {
        topPerformingCategories: topPerformingCategories.map((item: any) => ({
          category: item._id,
          revenue: item.revenue,
          eventCount: item.count,
        })),
        topPerformingVenues: topPerformingVenues.map((item: any) => ({
          venueId: item._id,
          venueName: item.name,
          eventCount: item.eventCount,
        })),
        userGrowthTrend: userGrowthTrend.map((item: any) => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          count: item.count,
        })),
      },
      
      additionalMetrics: {
        totalBookings,
        totalTickets,
        totalPayments,
        totalCategories,
        totalVenues,
        totalBlogs,
        totalNotifications,
        totalAffiliates,
        activeCoupons,
        totalRevenueTransactions,
      },

      recentOrders: recentOrders.map((order: any) => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: order.userId ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() : 'Guest',
        customerEmail: order.userId?.email || 'N/A',
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      })),

      topEvents: topEventsByRevenue.map((item: any) => ({
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        eventType: item.eventType,
        totalBookings: item.totalBookings,
        totalRevenue: item.totalRevenue,
      })),
      
      revenueChart: revenueByMonth.map((item: any) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        revenue: item.revenue,
        orders: item.orders,
      })),
      
      systemHealth: {
        uptime: systemUptime.uptime,
        status: systemUptime.status,
        errorRate,
        responseTime,
        databasePerformance,
      },
      
      dateRange: {
        start: startDate || dateFilter.createdAt?.$gte?.toISOString(),
        end: endDate || new Date().toISOString(),
        period,
      },
    };

    // Cache the result for 5 minutes (300 seconds)
    // This dramatically reduces load - 40+ queries cached!
    await cacheService.set(cacheKey, dashboardStats, { ttl: 300 });

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      cached: false,
      data: dashboardStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity logs
 *
 * OPTIMIZATION: Caching (2 minutes TTL) for recent activity
 * Reduces 9+ parallel queries per request
 */
export const getRecentActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', type } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key based on query parameters
    const cacheKey = `admin:activity:${page}:${limit}:${type || 'all'}`;

    // Try to get cached data first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        cached: true,
        data: cached
      });
      return;
    }

    // Get recent activities from multiple sources
    const [
      recentUsers,
      recentEvents,
      recentOrders,
      recentReviews,
      recentBookings,
      recentTickets,
      recentPayments,
      // recentNotifications, // Commented out - notification system disabled
      recentBlogs,
      recentAffiliates,
    ] = await Promise.all([
      // Recent users
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('firstName lastName email role status createdAt'),

      // Recent events
      Event.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('vendorId', 'firstName lastName email')
        .select('title status isApproved createdAt vendorId type category'),

      // Recent orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email')
        .select('orderNumber total paymentStatus status createdAt userId'),

      // Recent reviews
      Review.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName')
        .populate('eventId', 'title')
        .select('rating comment createdAt userId eventId'),

      // Recent bookings
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName')
        .populate('eventId', 'title')
        .select('status createdAt userId eventId'),

      // Recent tickets
      Ticket.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName')
        .populate('eventId', 'title')
        .select('status createdAt userId eventId'),

      // Recent payments
      Payment.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName')
        .select('amount status method createdAt userId'),

      // Recent notifications - Commented out - notification system disabled
      // Notification.find()
      //   .sort({ createdAt: -1 })
      //   .limit(10)
      //   .populate('userId', 'firstName lastName')
      //   .select('title message type createdAt userId'),

      // Recent blogs
      Blog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('authorId', 'firstName lastName')
        .select('title status createdAt authorId'),

      // Recent affiliates
      Affiliate.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName')
        .select('code status commission createdAt userId'),
    ]);

    // Combine all activities with enhanced metadata
    const activities = [
      ...recentUsers.map((user: any) => ({
        id: user._id,
        type: 'user_registered',
        title: 'New User Registration',
        description: `${user.firstName} ${user.lastName} (${user.role}) registered`,
        timestamp: user.createdAt,
        priority: user.role === 'admin' ? 'high' : 'normal',
        metadata: {
          userId: user._id,
          userEmail: user.email,
          role: user.role,
          status: user.status,
        },
      })),
      
      ...recentEvents.map((event: any) => ({
        id: event._id,
        type: event.isApproved ? 'event_approved' : 'event_pending',
        title: event.isApproved ? 'Event Approved' : 'Event Pending Approval',
        description: `Event "${event.title}" (${event.type}) is ${event.status}`,
        timestamp: event.createdAt,
        priority: event.status === 'pending' ? 'high' : 'normal',
        metadata: {
          eventId: event._id,
          eventTitle: event.title,
          eventType: event.type,
          eventCategory: event.category,
          vendorName: event.vendorId ? `${event.vendorId.firstName} ${event.vendorId.lastName}` : 'Unknown',
          vendorEmail: event.vendorId?.email || 'Unknown',
          status: event.status,
        },
      })),
      
      ...recentOrders.map((order: any) => ({
        id: order._id,
        type: order.paymentStatus === 'paid' ? 'order_paid' : 'order_pending',
        title: order.paymentStatus === 'paid' ? 'Order Completed' : 'Order Pending Payment',
        description: `Order ${order.orderNumber} - AED ${order.total}`,
        timestamp: order.createdAt,
        priority: order.paymentStatus === 'paid' ? 'normal' : 'high',
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          userName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Unknown',
          userEmail: order.userId?.email || 'Unknown',
          total: order.total,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
        },
      })),
      
      ...recentReviews.map((review: any) => ({
        id: review._id,
        type: 'review_submitted',
        title: 'New Review Submitted',
        description: `${review.rating}/5 stars for "${review.eventId?.title || 'Unknown Event'}"`,
        timestamp: review.createdAt,
        priority: review.rating <= 2 ? 'high' : 'normal',
        metadata: {
          reviewId: review._id,
          rating: review.rating,
          userName: review.userId ? `${review.userId.firstName} ${review.userId.lastName}` : 'Unknown',
          eventTitle: review.eventId?.title || 'Unknown Event',
          comment: review.comment,
        },
      })),
      
      ...recentBookings.map((booking: any) => ({
        id: booking._id,
        type: 'booking_created',
        title: 'New Booking',
        description: `Booking for "${booking.eventId?.title || 'Unknown Event'}"`,
        timestamp: booking.createdAt,
        priority: 'normal',
        metadata: {
          bookingId: booking._id,
          userName: booking.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : 'Unknown',
          eventTitle: booking.eventId?.title || 'Unknown Event',
          status: booking.status,
        },
      })),
      
      ...recentTickets.map((ticket: any) => ({
        id: ticket._id,
        type: 'ticket_generated',
        title: 'Ticket Generated',
        description: `Ticket for "${ticket.eventId?.title || 'Unknown Event'}"`,
        timestamp: ticket.createdAt,
        priority: 'normal',
        metadata: {
          ticketId: ticket._id,
          userName: ticket.userId ? `${ticket.userId.firstName} ${ticket.userId.lastName}` : 'Unknown',
          eventTitle: ticket.eventId?.title || 'Unknown Event',
          status: ticket.status,
        },
      })),
      
      ...recentPayments.map((payment: any) => ({
        id: payment._id,
        type: payment.status === 'completed' ? 'payment_completed' : 'payment_failed',
        title: payment.status === 'completed' ? 'Payment Completed' : 'Payment Failed',
        description: `Payment of AED ${payment.amount} via ${payment.method}`,
        timestamp: payment.createdAt,
        priority: payment.status === 'failed' ? 'high' : 'normal',
        metadata: {
          paymentId: payment._id,
          userName: payment.userId ? `${payment.userId.firstName} ${payment.userId.lastName}` : 'Unknown',
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
        },
      })),

      // Commented out - notification system disabled
      // ...recentNotifications.map((notification: any) => ({
      //   id: notification._id,
      //   type: 'notification_sent',
      //   title: 'Notification Sent',
      //   description: `"${notification.title}" sent to user`,
      //   timestamp: notification.createdAt,
      //   priority: 'normal',
      //   metadata: {
      //     notificationId: notification._id,
      //     userName: notification.userId ? `${notification.userId.firstName} ${notification.userId.lastName}` : 'Unknown',
      //     title: notification.title,
      //     type: notification.type,
      //   },
      // })),

      ...recentBlogs.map((blog: any) => ({
        id: blog._id,
        type: 'blog_published',
        title: 'Blog Published',
        description: `"${blog.title}" published`,
        timestamp: blog.createdAt,
        priority: 'normal',
        metadata: {
          blogId: blog._id,
          authorName: blog.authorId ? `${blog.authorId.firstName} ${blog.authorId.lastName}` : 'Unknown',
          title: blog.title,
          status: blog.status,
        },
      })),
      
      ...recentAffiliates.map((affiliate: any) => ({
        id: affiliate._id,
        type: 'affiliate_registered',
        title: 'New Affiliate',
        description: `Affiliate "${affiliate.code}" registered`,
        timestamp: affiliate.createdAt,
        priority: 'normal',
        metadata: {
          affiliateId: affiliate._id,
          userName: affiliate.userId ? `${affiliate.userId.firstName} ${affiliate.userId.lastName}` : 'Unknown',
          code: affiliate.code,
          commission: affiliate.commission,
          status: affiliate.status,
        },
      })),
    ];

    // Filter by type if specified
    const filteredActivities = type 
      ? activities.filter(activity => activity.type === type)
      : activities;

    // Sort by timestamp (most recent first)
    filteredActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const paginatedActivities = filteredActivities.slice(skip, skip + limitNum);

    // Get activity summary
    const activitySummary = {
      total: filteredActivities.length,
      byType: filteredActivities.reduce((acc: any, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
      }, {}),
      byPriority: filteredActivities.reduce((acc: any, activity) => {
        acc[activity.priority] = (acc[activity.priority] || 0) + 1;
        return acc;
      }, {}),
    };

    const responseData = {
      activities: paginatedActivities,
      summary: activitySummary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredActivities.length,
        pages: Math.ceil(filteredActivities.length / limitNum),
      },
    };

    // Cache the result for 2 minutes (120 seconds)
    // Short TTL since activity data changes frequently
    await cacheService.set(cacheKey, responseData, { ttl: 120 });

    res.status(200).json({
      success: true,
      message: 'Recent activity retrieved successfully',
      cached: false,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top performers (users, vendors, events)
 */
export const getTopPerformers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Top vendors by revenue
    const topVendors = await Order.aggregate([
      {
        $match: { paymentStatus: 'paid' },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'items.eventId',
          foreignField: '_id',
          as: 'events',
        },
      },
      {
        $unwind: '$events',
      },
      {
        $group: {
          _id: '$events.vendorId',
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: '$vendor',
      },
      {
        $project: {
          vendorId: '$_id',
          vendorName: { $concat: ['$vendor.firstName', ' ', '$vendor.lastName'] },
          vendorEmail: '$vendor.email',
          totalRevenue: 1,
          totalOrders: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    // Top events by bookings
    const topEvents = await Order.aggregate([
      {
        $match: { paymentStatus: 'paid' },
      },
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: '$items.eventId',
          totalBookings: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event',
        },
      },
      {
        $unwind: '$event',
      },
      {
        $project: {
          eventId: '$_id',
          eventTitle: '$event.title',
          eventType: '$event.type',
          totalBookings: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 },
    ]);

    // Most active customers
    const topCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: '$customer',
      },
      {
        $project: {
          customerId: '$_id',
          customerName: { $concat: ['$customer.firstName', ' ', '$customer.lastName'] },
          customerEmail: '$customer.email',
          totalOrders: 1,
          totalSpent: 1,
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      message: 'Top performers retrieved successfully',
      data: {
        topVendors,
        topEvents,
        topCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive analytics and insights
 */
/**
 * Get advanced analytics
 *
 * OPTIMIZATION: Aggressive caching (15 minutes TTL) due to 40+ complex aggregations
 * Critical for KVM1 single-core performance
 */
export const getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { period = '30d', metric } = req.query;

    // Generate cache key based on query parameters
    const cacheKey = `admin:analytics:${period}:${metric || 'all'}`;

    // Try to get cached data first (CRITICAL for performance!)
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        cached: true,
        data: cached
      });
      return;
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      // User analytics
      userRegistrations,
      userRetention,
      userEngagement,
      
      // Event analytics
      eventPerformance,
      categoryPerformance,
      venuePerformance,
      
      // Revenue analytics
      revenueTrends,
      paymentMethods,
      refundAnalytics,
      
      // Engagement analytics
      reviewAnalytics,
      bookingAnalytics,
      ticketAnalytics,
      
      // Geographic analytics
      locationAnalytics,
      cityAnalytics,
      
      // Time-based analytics
      hourlyActivity,
      dailyActivity,
      weeklyActivity,
      monthlyActivity,
      
      // Conversion analytics
      conversionFunnel,
      dropOffPoints,
      
      // Customer analytics
      customerSegments,
      lifetimeValue,
      churnRate,
    ] = await Promise.all([
      // User analytics
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
            roles: { $push: '$role' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      
      User.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        { $match: { 'orders.1': { $exists: true } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      
      User.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'userId', as: 'reviews' } },
        { $lookup: { from: 'bookings', localField: '_id', foreignField: 'userId', as: 'bookings' } },
        {
          $project: {
            engagementScore: {
              $add: [
                { $multiply: [{ $size: '$orders' }, 2] },
                { $multiply: [{ $size: '$reviews' }, 1] },
                { $multiply: [{ $size: '$bookings' }, 1.5] },
              ],
            },
          },
        },
        { $group: { _id: null, avgEngagement: { $avg: '$engagementScore' } } },
      ]),
      
      // Event analytics
      Event.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: startDate } } },
        {
          $lookup: { from: 'orders', localField: '_id', foreignField: 'items.eventId', as: 'orders' },
        },
        {
          $project: {
            title: 1,
            type: 1,
            category: 1,
            price: 1,
            viewsCount: 1,
            reviewCount: 1,
            averageRating: 1,
            orderCount: { $size: '$orders' },
            revenue: { $sum: '$orders.total' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 20 },
      ]),
      
      Event.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: { from: 'orders', localField: '_id', foreignField: 'items.eventId', as: 'orders' },
        },
        {
          $group: {
            _id: '$category',
            eventCount: { $sum: 1 },
            totalRevenue: { $sum: { $sum: '$orders.total' } },
            avgRating: { $avg: '$averageRating' },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),
      
      Event.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$location.city',
            eventCount: { $sum: 1 },
            avgPrice: { $avg: '$price' },
          },
        },
        { $sort: { eventCount: -1 } },
        { $limit: 10 },
      ]),
      
      // Revenue analytics
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } },
        { $sort: { total: -1 } },
      ]),
      
      Order.aggregate([
        { $match: { status: 'refunded', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            refundCount: { $sum: 1 },
            refundAmount: { $sum: '$total' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      
      // Engagement analytics
      Review.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      
      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      
      Ticket.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      
      // Geographic analytics
      Event.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$location.city',
            eventCount: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            totalRevenue: { $sum: '$price' },
          },
        },
        { $sort: { eventCount: -1 } },
        { $limit: 20 },
      ]),
      
      Event.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$location.city',
            eventCount: { $sum: 1 },
          },
        },
        { $sort: { eventCount: -1 } },
        { $limit: 10 },
      ]),
      
      // Time-based analytics
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $week: '$createdAt' },
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      
      // Conversion analytics
      User.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        {
          $project: {
            hasOrders: { $gt: [{ $size: '$orders' }, 0] },
            orderCount: { $size: '$orders' },
          },
        },
        {
          $group: {
            _id: '$hasOrders',
            count: { $sum: 1 },
          },
        },
      ]),
      
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      
      // Customer analytics
      User.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        {
          $project: {
            totalSpent: { $sum: '$orders.total' },
            orderCount: { $size: '$orders' },
            avgOrderValue: { $avg: '$orders.total' },
            lastOrderDate: { $max: '$orders.createdAt' },
          },
        },
        {
          $bucket: {
            groupBy: '$totalSpent',
            boundaries: [0, 100, 500, 1000, 5000, 10000],
            default: '10000+',
            output: {
              count: { $sum: 1 },
              avgOrderValue: { $avg: '$avgOrderValue' },
            },
          },
        },
      ]),
      
      User.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        {
          $project: {
            totalSpent: { $sum: '$orders.total' },
            orderCount: { $size: '$orders' },
          },
        },
        { $group: { _id: null, avgLifetimeValue: { $avg: '$totalSpent' } } },
      ]),
      
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
        { $match: { orders: { $size: 0 } } },
        { $count: 'churnedUsers' },
      ]),
    ]);

    const analytics = {
      period,
      startDate,
      endDate: now,
      
      userAnalytics: {
        registrations: userRegistrations,
        retention: userRetention[0]?.count || 0,
        engagement: userEngagement[0]?.avgEngagement || 0,
      },
      
      eventAnalytics: {
        topPerforming: eventPerformance,
        categoryPerformance,
        venuePerformance,
      },
      
      revenueAnalytics: {
        trends: revenueTrends,
        paymentMethods,
        refunds: refundAnalytics,
      },
      
      engagementAnalytics: {
        reviews: reviewAnalytics,
        bookings: bookingAnalytics,
        tickets: ticketAnalytics,
      },
      
      geographicAnalytics: {
        locations: locationAnalytics,
        topCities: cityAnalytics,
      },
      
      timeAnalytics: {
        hourly: hourlyActivity,
        daily: dailyActivity,
        weekly: weeklyActivity,
        monthly: monthlyActivity,
      },
      
      conversionAnalytics: {
        funnel: conversionFunnel,
        dropOffs: dropOffPoints,
      },
      
      customerAnalytics: {
        segments: customerSegments,
        lifetimeValue: lifetimeValue[0]?.avgLifetimeValue || 0,
        churnRate: churnRate[0]?.churnedUsers || 0,
      },
    };

    // Cache the result for 15 minutes (900 seconds)
    // Longer TTL than dashboard since analytics change less frequently
    await cacheService.set(cacheKey, analytics, { ttl: 900 });

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      cached: false,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      dbStatus,
      pendingApprovals,
      failedOrders,
      recentErrors,
      systemMetrics,
      performanceMetrics,
    ] = await Promise.all([
      // Database connection status
      Promise.resolve({ status: 'connected', latency: 0 }),

      // Pending approvals count
      Event.countDocuments({ status: 'pending', isDeleted: false }),

      // Failed orders count (last 24 hours)
      Order.countDocuments({
        paymentStatus: 'failed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),

      // Recent errors (placeholder - would integrate with error logging service)
      Promise.resolve([]),
      
      // System metrics
      Promise.resolve({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      }),
      
      // Performance metrics
      Promise.resolve({
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        availability: 99.9,
      }),
    ]);

    const systemHealth = {
      status: 'healthy', // Could be: healthy, degraded, down
      database: dbStatus,
      metrics: {
        pendingApprovals,
        failedOrders,
        errorCount: recentErrors.length,
      },
      system: systemMetrics,
      performance: performanceMetrics,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      message: 'System health retrieved successfully',
      data: systemHealth,
    });
  } catch (error) {
    next(error);
  }
};
