import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { AppError } from '../middleware/error';
import { authenticate, authorize } from '../middleware/auth';
import { analyticsService } from '../services/analytics.service';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// @desc    Get dashboard summary
// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Vendor)
router.get('/dashboard', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;
    const summary = await analyticsService.getDashboardSummary(vendorId);

    res.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get event analytics
// @route   GET /api/analytics/events
// @access  Private (Admin, Vendor)
router.get('/events', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await analyticsService.getEventAnalytics(vendorId, dateRange);

    res.status(200).json({
      success: true,
      message: 'Event analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get order analytics
// @route   GET /api/analytics/orders
// @access  Private (Admin, Vendor)
router.get('/orders', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await analyticsService.getOrderAnalytics(vendorId, dateRange);

    res.status(200).json({
      success: true,
      message: 'Order analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get ticket analytics
// @route   GET /api/analytics/tickets
// @access  Private (Admin, Vendor)
router.get('/tickets', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await analyticsService.getTicketAnalytics(vendorId, dateRange);

    res.status(200).json({
      success: true,
      message: 'Ticket analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private (Admin only)
router.get('/users', authorize(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await analyticsService.getUserAnalytics(dateRange);

    res.status(200).json({
      success: true,
      message: 'User analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get venue analytics
// @route   GET /api/analytics/venues
// @access  Private (Admin, Vendor)
router.get('/venues', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;
    const analytics = await analyticsService.getVenueAnalytics(vendorId);

    res.status(200).json({
      success: true,
      message: 'Venue analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get revenue report
// @route   GET /api/analytics/revenue
// @access  Private (Admin, Vendor)
router.get('/revenue', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    const dateRange = {
      start: new Date(startDate as string),
      end: new Date(endDate as string)
    };

    // Get order analytics for the date range
    const analytics = await analyticsService.getOrderAnalytics(vendorId, dateRange);

    // Format response based on groupBy parameter
    let revenueData;
    if (groupBy === 'day') {
      // Would need to implement daily grouping
      revenueData = analytics.ordersByMonth;
    } else {
      revenueData = analytics.ordersByMonth;
    }

    res.status(200).json({
      success: true,
      message: 'Revenue report retrieved successfully',
      data: {
        totalRevenue: analytics.totalRevenue,
        totalOrders: analytics.totalOrders,
        averageOrderValue: analytics.averageOrderValue,
        revenueByPeriod: revenueData,
        currencyBreakdown: analytics.topCurrencies
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get performance report for specific event
// @route   GET /api/analytics/events/:eventId/performance
// @access  Private (Admin, Vendor - must own event)
router.get('/events/:eventId/performance', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    
    // Verify event ownership for vendors
    if (req.user?.role === 'vendor') {
      const Event = require('../models/Event').default;
      const event = await Event.findById(eventId);
      
      if (!event) {
        return next(new AppError('Event not found', 404));
      }
      
      if (event.vendorId.toString() !== req.user._id?.toString()) {
        return next(new AppError('Access denied', 403));
      }
    }

    // Get event-specific analytics
    const Order = require('../models/Order').default;
    const Ticket = require('../models/Ticket').default;
    const Review = require('../models/Review').default;

    const [eventData, orderData, ticketData, reviewData] = await Promise.all([
      // Event details
      require('../models/Event').default.findById(eventId).select('title viewsCount dateSchedule location price currency'),
      
      // Order statistics
      Order.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.eventId': eventId } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$items.totalPrice' },
            totalOrders: { $sum: 1 },
            totalTickets: { $sum: '$items.quantity' },
            avgOrderValue: { $avg: '$items.totalPrice' }
          }
        }
      ]),
      
      // Ticket statistics
      Ticket.aggregate([
        { $match: { eventId } },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            checkedIn: { $sum: { $cond: [{ $eq: ['$checkInDetails.isCheckedIn', true] }, 1, 0] } },
            transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } }
          }
        }
      ]),
      
      // Review statistics
      Review.aggregate([
        { $match: { event: eventId, status: 'approved' } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ])
    ]);

    if (!eventData) {
      return next(new AppError('Event not found', 404));
    }

    const orderStats = orderData[0] || {};
    const ticketStats = ticketData[0] || {};
    const reviewStats = reviewData[0] || {};

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (reviewStats.ratingDistribution) {
      reviewStats.ratingDistribution.forEach((rating: number) => {
        ratingDistribution[rating as keyof typeof ratingDistribution]++;
      });
    }

    const performance = {
      event: {
        id: eventData._id,
        title: eventData.title,
        views: eventData.viewsCount,
        dateSchedule: eventData.dateSchedule,
        location: eventData.location,
        basePrice: eventData.price,
        currency: eventData.currency
      },
      revenue: {
        total: orderStats.totalRevenue || 0,
        orders: orderStats.totalOrders || 0,
        tickets: orderStats.totalTickets || 0,
        averageOrderValue: orderStats.avgOrderValue || 0
      },
      tickets: {
        total: ticketStats.totalTickets || 0,
        checkedIn: ticketStats.checkedIn || 0,
        transferred: ticketStats.transferred || 0,
        checkInRate: ticketStats.totalTickets > 0 ? (ticketStats.checkedIn / ticketStats.totalTickets) * 100 : 0
      },
      reviews: {
        total: reviewStats.totalReviews || 0,
        averageRating: reviewStats.averageRating || 0,
        distribution: ratingDistribution
      }
    };

    res.status(200).json({
      success: true,
      message: 'Event performance retrieved successfully',
      data: performance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Export analytics data
// @route   GET /api/analytics/export
// @access  Private (Admin, Vendor)
router.get('/export', authorize(['admin', 'vendor']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, startDate, endDate, format = 'json' } = req.query;
    const vendorId = req.user?.role === 'vendor' ? req.user._id?.toString() : undefined;

    if (!type || !['events', 'orders', 'tickets', 'users', 'venues'].includes(type as string)) {
      return next(new AppError('Invalid export type', 400));
    }

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    let data;
    switch (type) {
      case 'events':
        data = await analyticsService.getEventAnalytics(vendorId, dateRange);
        break;
      case 'orders':
        data = await analyticsService.getOrderAnalytics(vendorId, dateRange);
        break;
      case 'tickets':
        data = await analyticsService.getTicketAnalytics(vendorId, dateRange);
        break;
      case 'users':
        if (req.user?.role !== 'admin') {
          return next(new AppError('Access denied', 403));
        }
        data = await analyticsService.getUserAnalytics(dateRange);
        break;
      case 'venues':
        data = await analyticsService.getVenueAnalytics(vendorId);
        break;
    }

    // Set appropriate headers for download
    const filename = `${type}-analytics-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      // Would need to implement CSV conversion
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      // For now, return JSON
      res.json(data);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        exportType: type,
        exportDate: new Date(),
        dateRange,
        data
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;