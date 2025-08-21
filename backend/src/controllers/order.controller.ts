import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Order, Event, Ticket, User } from '../models';
import { AppError } from '../middleware';
import { AuthRequest } from '../types';
import { emailService } from '../services/email.service';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Customer only)
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const { items, billingAddress, notes, couponCode, affiliateCode } = req.body;

    // Validate and process order items
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const event = await Event.findOne({
        _id: item.eventId,
        isApproved: true,
        isDeleted: false,
      });

      if (!event) {
        return next(new AppError(`Event ${item.eventId} not found or not available`, 404));
      }

      // Check if event has available seats for the requested date
      if (!event.hasAvailableSeats(new Date(item.scheduleDate), item.quantity)) {
        return next(new AppError(`Not enough seats available for ${event.title} on ${item.scheduleDate}`, 400));
      }

      // Find the correct price for the schedule date
      const schedule = event.dateSchedule.find(
        (s: any) => s.date.toDateString() === new Date(item.scheduleDate).toDateString()
      );

      if (!schedule) {
        return next(new AppError(`No schedule found for ${event.title} on ${item.scheduleDate}`, 400));
      }

      const unitPrice = schedule.price;
      const totalPrice = unitPrice * item.quantity;

      processedItems.push({
        eventId: event._id,
        eventTitle: event.title,
        scheduleDate: new Date(item.scheduleDate),
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        currency: event.currency,
      });

      subtotal += totalPrice;
    }

    // TODO: Apply coupon discount if provided
    let couponDiscount = 0;
    if (couponCode) {
      // Implement coupon logic here
    }

    // Calculate tax (implement based on business requirements)
    const taxRate = 0.05; // 5% tax
    const tax = subtotal * taxRate;

    // Create order
    const orderData = {
      userId,
      items: processedItems,
      subtotal,
      tax,
      discount: 0,
      couponDiscount,
      currency: processedItems[0].currency, // Assuming all items have same currency
      billingAddress,
      notes,
      affiliateCode,
      couponCode,
    };

    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private (Customer only)
export const getUserOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { userId };
    if (status) {
      filter.status = status;
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.eventId', 'title category type images')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private (Customer - own orders only)
export const getOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await Order.findOne({
      _id: id,
      userId,
    }).populate('items.eventId', 'title category type images location vendorId');

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer - own orders only)
export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: id,
      userId,
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.status !== 'pending') {
      return next(new AppError('Only pending orders can be cancelled', 400));
    }

    // Return seats to events
    for (const item of order.items) {
      const event = await Event.findById(item.eventId);
      if (event) {
        const schedule = event.dateSchedule.find(
          (s: any) => s.date.toDateString() === item.scheduleDate.toDateString()
        );
        if (schedule) {
          schedule.availableSeats += item.quantity;
          await event.save();
        }
      }
    }

    await order.cancel(reason);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process payment for order
// @route   POST /api/orders/:id/payment
// @access  Private (Customer - own orders only)
export const processPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { paymentMethod, paymentIntentId } = req.body;

    const order = await Order.findOne({
      _id: id,
      userId,
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.paymentStatus === 'paid') {
      return next(new AppError('Order already paid', 400));
    }

    // TODO: Integrate with actual payment gateway (Stripe, PayPal, etc.)
    // This is a placeholder for payment processing logic

    // Simulate payment processing
    const paymentSuccessful = true; // This would come from payment gateway

    if (paymentSuccessful) {
      // Mark order as paid
      await order.markAsPaid(paymentIntentId, paymentMethod);
      
      // Confirm order
      await order.confirm();

      // Reduce available seats from events
      for (const item of order.items) {
        const event = await Event.findById(item.eventId);
        if (event) {
          event.reduceSeats(item.scheduleDate, item.quantity);
          await event.save();
        }
      }

      // Generate tickets for the order
      const tickets = [];
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticket = await Ticket.create({
            eventId: item.eventId,
            userId,
            orderId: order._id,
            eventDate: item.scheduleDate,
            ticketType: 'standard',
            status: 'active',
            price: item.unitPrice,
            currency: item.currency,
          });
          tickets.push(ticket);
        }
      }

      // Send order confirmation email
      const user = await User.findById(userId);
      if (user) {
        await emailService.sendOrderConfirmationEmail({
          to: user.email,
          firstName: user.firstName,
          orderNumber: order.orderNumber,
          orderTotal: order.total,
          currency: order.currency,
          items: order.items.map(item => ({
            eventTitle: item.eventTitle,
            quantity: item.quantity,
            price: item.totalPrice,
            date: item.scheduleDate,
          })),
        });

        // TODO: Send tickets email separately with QR codes
      }

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: { 
          order,
          tickets,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment failed',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Admin functions

// @desc    Get all orders for admin
// @route   GET /api/orders/admin/all
// @access  Private (Admin only)
export const getAdminOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('items.eventId', 'title vendorId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Admin orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order analytics
// @route   GET /api/orders/admin/analytics
// @access  Private (Admin only)
export const getOrderAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          totalTickets: { $sum: '$totalTickets' },
        },
      },
    ]);

    const result = analytics[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      paidOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      totalTickets: 0,
    };

    res.status(200).json({
      success: true,
      message: 'Order analytics retrieved successfully',
      data: { analytics: result, period: `${days} days` },
    });
  } catch (error) {
    next(error);
  }
};

// Vendor functions

// @desc    Get vendor's orders
// @route   GET /api/orders/vendor/my-orders
// @access  Private (Vendor only)
export const getVendorOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendorId = req.user?.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build match query for vendor's events
    const matchQuery: any = {
      'items.eventVendorId': vendorId,
    };
    if (status) matchQuery.status = status;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute aggregation to find orders containing vendor's events
    const pipeline = [
      {
        $lookup: {
          from: 'events',
          localField: 'items.eventId',
          foreignField: '_id',
          as: 'eventDetails',
        },
      },
      {
        $addFields: {
          'items.eventVendorId': {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $let: {
                  vars: {
                    eventDetail: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$eventDetails',
                            cond: { $eq: ['$$this._id', '$$item.eventId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: '$$eventDetail.vendorId',
                },
              },
            },
          },
        },
      },
      {
        $match: {
          'items.eventVendorId': vendorId,
        },
      },
      {
        $sort: sort,
      },
      {
        $skip: skip,
      },
      {
        $limit: limitNum,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'customer',
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
        },
      },
    ];

    const [orders, totalCount] = await Promise.all([
      Order.aggregate(pipeline),
      Order.aggregate([
        ...pipeline.slice(0, -3), // Remove sort, skip, limit, and lookup
        { $count: 'total' },
      ]),
    ]);

    const total = totalCount[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: 'Vendor orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};