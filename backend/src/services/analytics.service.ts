import mongoose from 'mongoose';
import { Event, Order, Ticket, User, Venue, Review } from '../models/index';

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
  revenueByEvent: Array<{ eventId: string; title: string; revenue: number; tickets: number }>;
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
  ordersByMonth: Array<{ month: string; count: number; revenue: number }>;
  topCurrencies: Array<{ currency: string; count: number; revenue: number }>;
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
  async getEventAnalytics(vendorId?: string, dateRange?: { start: Date; end: Date }): Promise<EventAnalytics> {
    const matchFilter: any = {};
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
      revenueStats
    ] = await Promise.all([
      Event.countDocuments(matchFilter),
      Event.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$isApproved', false] }, 1, 0] } },
            totalViews: { $sum: '$viewsCount' },
            avgRating: { $avg: '$averageRating' }
          }
        }
      ]),
      Event.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Event.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Event.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      this.getEventRevenueStats(vendorId, dateRange)
    ]);

    return {
      totalEvents,
      activeEvents: eventStats[0]?.active || 0,
      pendingApproval: eventStats[0]?.pending || 0,
      totalViews: eventStats[0]?.totalViews || 0,
      averageRating: eventStats[0]?.avgRating || 0,
      topCategories: categoryStats.map((item: any) => ({ category: item._id, count: item.count })),
      topLocations: locationStats.map((item: any) => ({ city: item._id, count: item.count })),
      eventsByMonth: monthlyStats.map((item: any) => ({ month: item._id, count: item.count })),
      revenueByEvent: revenueStats
    };
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(vendorId?: string, dateRange?: { start: Date; end: Date }): Promise<OrderAnalytics> {
    const matchFilter: any = {};
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // If vendor-specific, need to filter by events belonging to vendor
    let eventIds: mongoose.Types.ObjectId[] = [];
    if (vendorId) {
      const vendorEvents = await Event.find({ vendorId: new mongoose.Types.ObjectId(vendorId) }).select('_id');
      eventIds = vendorEvents.map(event => event._id as mongoose.Types.ObjectId);
      matchFilter['items.eventId'] = { $in: eventIds };
    }

    const [
      totalOrders,
      orderStats,
      statusStats,
      monthlyStats,
      currencyStats
    ] = await Promise.all([
      Order.countDocuments(matchFilter),
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' },
            refundedOrders: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$currency',
            count: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    const stats = orderStats[0] || {};
    const refundRate = totalOrders > 0 ? (stats.refundedOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      totalRevenue: stats.totalRevenue || 0,
      averageOrderValue: stats.avgOrderValue || 0,
      ordersByStatus: statusStats.map((item: any) => ({
        status: item._id,
        count: item.count,
        revenue: item.revenue
      })),
      ordersByMonth: monthlyStats.map((item: any) => ({
        month: item._id,
        count: item.count,
        revenue: item.revenue
      })),
      topCurrencies: currencyStats.map((item: any) => ({
        currency: item._id,
        count: item.count,
        revenue: item.revenue
      })),
      conversionRate: 0, // Would need session tracking to calculate
      refundRate
    };
  }

  /**
   * Get ticket analytics
   */
  async getTicketAnalytics(vendorId?: string, dateRange?: { start: Date; end: Date }): Promise<TicketAnalytics> {
    const matchFilter: any = {};
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // If vendor-specific, need to filter by events belonging to vendor
    if (vendorId) {
      const vendorEvents = await Event.find({ vendorId: new mongoose.Types.ObjectId(vendorId) }).select('_id');
      const eventIds = vendorEvents.map(event => event._id);
      matchFilter.eventId = { $in: eventIds };
    }

    const [
      totalTickets,
      ticketStats,
      typeStats,
      hourlyScans
    ] = await Promise.all([
      Ticket.countDocuments(matchFilter),
      Ticket.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            checkedIn: { $sum: { $cond: [{ $eq: ['$checkInDetails.isCheckedIn', true] }, 1, 0] } },
            transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ]),
      Ticket.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$ticketType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Ticket.aggregate([
        { 
          $match: { 
            ...matchFilter,
            'checkInDetails.isCheckedIn': true,
            'checkInDetails.checkInTime': { $exists: true }
          }
        },
        {
          $group: {
            _id: { $hour: '$checkInDetails.checkInTime' },
            scans: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const stats = ticketStats[0] || {};
    const checkInRate = totalTickets > 0 ? (stats.checkedIn / totalTickets) * 100 : 0;
    const transferRate = totalTickets > 0 ? (stats.transferred / totalTickets) * 100 : 0;

    return {
      totalTickets,
      checkedInTickets: stats.checkedIn || 0,
      transferredTickets: stats.transferred || 0,
      cancelledTickets: stats.cancelled || 0,
      checkInRate,
      transferRate,
      ticketsByType: typeStats.map((item: any) => ({ type: item._id, count: item.count })),
      scansByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        scans: hourlyScans.find((item: any) => item._id === hour)?.scans || 0
      }))
    };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(dateRange?: { start: Date; end: Date }): Promise<UserAnalytics> {
    const matchFilter: any = {};
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const [
      totalUsers,
      userStats,
      roleStats,
      monthlyStats,
      countryStats
    ] = await Promise.all([
      User.countDocuments(matchFilter),
      User.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $ne: ['$status', 'suspended'] }, 1, 0] } },
            verified: { $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] } }
          }
        }
      ]),
      User.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { ...matchFilter, country: { $exists: true, $ne: null } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const stats = userStats[0] || {};
    const verificationRate = totalUsers > 0 ? (stats.verified / totalUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers: stats.active || 0,
      usersByRole: roleStats.map((item: any) => ({ role: item._id, count: item.count })),
      usersByMonth: monthlyStats.map((item: any) => ({ month: item._id, count: item.count })),
      topCountries: countryStats.map((item: any) => ({ country: item._id, count: item.count })),
      verificationRate
    };
  }

  /**
   * Get venue analytics
   */
  async getVenueAnalytics(vendorId?: string): Promise<VenueAnalytics> {
    const matchFilter: any = {};
    if (vendorId) matchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);

    const [
      totalVenues,
      venueStats,
      typeStats,
      cityStats
    ] = await Promise.all([
      Venue.countDocuments(matchFilter),
      Venue.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            avgCapacity: { $avg: '$capacity' }
          }
        }
      ]),
      Venue.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$venueType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Venue.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$address.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const stats = venueStats[0] || {};

    return {
      totalVenues,
      activeVenues: stats.active || 0,
      venuesByType: typeStats.map((item: any) => ({ type: item._id, count: item.count })),
      venuesByCity: cityStats.map((item: any) => ({ city: item._id, count: item.count })),
      averageCapacity: Math.round(stats.avgCapacity || 0),
      utilizationRate: 0 // Would need booking data to calculate
    };
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(vendorId?: string): Promise<DashboardSummary> {
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const [
      currentStats,
      previousStats,
      topEvents
    ] = await Promise.all([
      this.getPeriodStats(vendorId, { start: thisMonth, end: currentDate }),
      this.getPeriodStats(vendorId, { start: lastMonth, end: thisMonth }),
      this.getTopPerformingEvents(vendorId, 5)
    ]);

    const revenueGrowth = previousStats.revenue > 0 
      ? ((currentStats.revenue - previousStats.revenue) / previousStats.revenue) * 100 
      : 0;

    const eventGrowth = previousStats.events > 0 
      ? ((currentStats.events - previousStats.events) / previousStats.events) * 100 
      : 0;

    const userGrowth = previousStats.users > 0 
      ? ((currentStats.users - previousStats.users) / previousStats.users) * 100 
      : 0;

    return {
      totalRevenue: currentStats.revenue,
      totalEvents: currentStats.events,
      totalTicketsSold: currentStats.tickets,
      totalUsers: currentStats.users,
      revenueGrowth,
      eventGrowth,
      userGrowth,
      topPerformingEvents: topEvents
    };
  }

  /**
   * Helper: Get event revenue statistics
   */
  private async getEventRevenueStats(vendorId?: string, dateRange?: { start: Date; end: Date }) {
    const matchFilter: any = {};
    if (vendorId) matchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    return await Event.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'orders',
          let: { eventId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.eventId', '$$eventId'] } } },
            { $group: { _id: null, revenue: { $sum: '$items.totalPrice' }, tickets: { $sum: '$items.quantity' } } }
          ],
          as: 'orderData'
        }
      },
      {
        $project: {
          eventId: '$_id',
          title: '$title',
          revenue: { $ifNull: [{ $arrayElemAt: ['$orderData.revenue', 0] }, 0] },
          tickets: { $ifNull: [{ $arrayElemAt: ['$orderData.tickets', 0] }, 0] }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
  }

  /**
   * Helper: Get period statistics
   */
  private async getPeriodStats(vendorId?: string, dateRange?: { start: Date; end: Date }) {
    const matchFilter: any = {};
    if (dateRange) {
      matchFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    let eventMatchFilter = { ...matchFilter };
    let orderMatchFilter = { ...matchFilter };

    if (vendorId) {
      eventMatchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
      
      // For orders, we need to filter by events belonging to vendor
      const vendorEvents = await Event.find({ vendorId: new mongoose.Types.ObjectId(vendorId) }).select('_id');
      const eventIds = vendorEvents.map(event => event._id);
      orderMatchFilter['items.eventId'] = { $in: eventIds };
    }

    const [eventCount, orderStats, ticketCount, userCount] = await Promise.all([
      Event.countDocuments(eventMatchFilter),
      Order.aggregate([
        { $match: orderMatchFilter },
        { $group: { _id: null, revenue: { $sum: '$total' } } }
      ]),
      Ticket.countDocuments(matchFilter),
      vendorId ? Promise.resolve(0) : User.countDocuments(matchFilter)
    ]);

    return {
      events: eventCount,
      revenue: orderStats[0]?.revenue || 0,
      tickets: ticketCount,
      users: userCount
    };
  }

  /**
   * Helper: Get top performing events
   */
  private async getTopPerformingEvents(vendorId?: string, limit: number = 10) {
    const matchFilter: any = {};
    if (vendorId) matchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);

    return await Event.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'orders',
          let: { eventId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.eventId', '$$eventId'] } } },
            { $group: { _id: null, revenue: { $sum: '$items.totalPrice' }, tickets: { $sum: '$items.quantity' } } }
          ],
          as: 'orderData'
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'event',
          pipeline: [
            { $match: { status: 'approved' } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
          ],
          as: 'reviewData'
        }
      },
      {
        $project: {
          eventId: '$_id',
          title: '$title',
          revenue: { $ifNull: [{ $arrayElemAt: ['$orderData.revenue', 0] }, 0] },
          tickets: { $ifNull: [{ $arrayElemAt: ['$orderData.tickets', 0] }, 0] },
          rating: { $ifNull: [{ $arrayElemAt: ['$reviewData.avgRating', 0] }, 0] }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit }
    ]);
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;