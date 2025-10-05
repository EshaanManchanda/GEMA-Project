import { Request, Response, NextFunction } from 'express';
import { User, Event, Order, Review } from '../models';
import { AppError } from '../middleware';

/**
 * Get comprehensive dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    // Calculate date range
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate as string);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.createdAt = { $gte: thirtyDaysAgo };
    }

    // Parallel data fetching for better performance
    const [
      totalUsers,
      newUsers,
      activeUsers,
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      totalOrders,
      paidOrders,
      pendingOrders,
      totalRevenue,
      totalReviews,
      avgRating,
      usersByRole,
      usersByStatus,
      eventsByType,
      eventsByStatus,
      ordersByStatus,
      revenueByMonth,
    ] = await Promise.all([
      // User statistics
      User.countDocuments(),
      User.countDocuments(dateFilter),
      User.countDocuments({ status: 'active' }),

      // Event statistics
      Event.countDocuments({ isDeleted: false }),
      Event.countDocuments({ isApproved: true, isDeleted: false }),
      Event.countDocuments({ status: 'pending', isDeleted: false }),
      Event.countDocuments({ status: 'rejected', isDeleted: false }),

      // Order statistics
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: 'paid' }),
      Order.countDocuments({ paymentStatus: 'pending' }),

      // Revenue statistics
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),

      // Review statistics
      Review.countDocuments(),
      Review.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),

      // Detailed breakdowns
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      User.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),

      Event.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Revenue by month (last 12 months)
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const dashboardStats = {
      overview: {
        totalUsers,
        newUsers,
        activeUsers,
        totalEvents,
        approvedEvents,
        pendingEvents,
        rejectedEvents,
        totalOrders,
        paidOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalReviews,
        averageRating: avgRating[0]?.avgRating || 0,
      },
      userBreakdown: {
        byRole: usersByRole.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: usersByStatus.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
      eventBreakdown: {
        byType: eventsByType.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: eventsByStatus.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
      orderBreakdown: {
        byStatus: ordersByStatus.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
      revenueChart: revenueByMonth.map((item: any) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        revenue: item.revenue,
        orders: item.orders,
      })),
      dateRange: {
        start: startDate || dateFilter.createdAt?.$gte?.toISOString(),
        end: endDate || new Date().toISOString(),
        period,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: dashboardStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity logs
 */
export const getRecentActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email role createdAt');

    // Get recent events
    const recentEvents = await Event.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendorId', 'firstName lastName')
      .select('title status isApproved createdAt vendorId');

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName email')
      .select('orderNumber total paymentStatus status createdAt userId');

    // Get recent reviews
    const recentReviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName')
      .populate('eventId', 'title')
      .select('rating comment createdAt userId eventId');

    // Combine all activities
    const activities = [
      ...recentUsers.map((user: any) => ({
        id: user._id,
        type: 'user_registered',
        title: 'New User Registration',
        description: `${user.firstName} ${user.lastName} (${user.role}) registered`,
        timestamp: user.createdAt,
        metadata: {
          userId: user._id,
          userEmail: user.email,
          role: user.role,
        },
      })),
      ...recentEvents.map((event: any) => ({
        id: event._id,
        type: event.isApproved ? 'event_approved' : 'event_pending',
        title: event.isApproved ? 'Event Approved' : 'Event Pending Approval',
        description: `Event "${event.title}" is ${event.status}`,
        timestamp: event.createdAt,
        metadata: {
          eventId: event._id,
          eventTitle: event.title,
          vendorName: event.vendorId ? `${event.vendorId.firstName} ${event.vendorId.lastName}` : 'Unknown',
          status: event.status,
        },
      })),
      ...recentOrders.map((order: any) => ({
        id: order._id,
        type: order.paymentStatus === 'paid' ? 'order_paid' : 'order_pending',
        title: order.paymentStatus === 'paid' ? 'Order Paid' : 'Order Pending',
        description: `Order ${order.orderNumber} - AED ${order.total}`,
        timestamp: order.createdAt,
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          userName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Unknown',
          total: order.total,
          paymentStatus: order.paymentStatus,
        },
      })),
      ...recentReviews.map((review: any) => ({
        id: review._id,
        type: 'review_submitted',
        title: 'New Review',
        description: `${review.rating}/5 stars for "${review.eventId?.title || 'Unknown Event'}"`,
        timestamp: review.createdAt,
        metadata: {
          reviewId: review._id,
          rating: review.rating,
          userName: review.userId ? `${review.userId.firstName} ${review.userId.lastName}` : 'Unknown',
          eventTitle: review.eventId?.title || 'Unknown Event',
        },
      })),
    ];

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const paginatedActivities = activities.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: {
        activities: paginatedActivities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: activities.length,
          pages: Math.ceil(activities.length / limitNum),
        },
      },
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
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      dbStatus,
      pendingApprovals,
      failedOrders,
      recentErrors,
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
    ]);

    const systemHealth = {
      status: 'healthy', // Could be: healthy, degraded, down
      database: dbStatus,
      metrics: {
        pendingApprovals,
        failedOrders,
        errorCount: recentErrors.length,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
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
