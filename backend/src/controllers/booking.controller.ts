import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Order, Event, User } from '../models';
import { AppError } from '../middleware';
import { AuthRequest } from '../types';
import { PaymentService } from '../services/payment.service';
import { logger } from '../config';

// @desc    Initiate booking with Stripe payment session
// @route   POST /api/bookings/initiate
// @access  Private
export const initiateBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const { eventId, dateScheduleId, seats, paymentMethod = 'stripe' } = req.body;

    // Validate event exists and is available
    const event = await Event.findOne({
      _id: eventId,
      isApproved: true,
      isDeleted: false,
    });

    if (!event) {
      return next(new AppError('Event not found or not available', 404));
    }

    // Find the specific date schedule
    const schedule = event.dateSchedule.find(
      (s: any) => s._id.toString() === dateScheduleId
    );

    if (!schedule) {
      return next(new AppError('Event schedule not found', 404));
    }

    // Check seat availability
    if (schedule.availableSeats < seats) {
      return next(new AppError(`Only ${schedule.availableSeats} seats available for this date`, 400));
    }

    // Get user information for billing
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Calculate total amount
    const unitPrice = schedule.price || event.price;
    const subtotal = unitPrice * seats;
    const tax = subtotal * 0.05; // 5% tax
    const serviceFee = subtotal * 0.05; // 5% service fee
    const total = subtotal + tax + serviceFee;

    // Create temporary order with pending status
    const tempOrder = new Order({
      userId,
      items: [{
        eventId,
        eventTitle: event.title,
        scheduleDate: schedule.date,
        quantity: seats,
        unitPrice,
        totalPrice: subtotal,
        currency: event.currency,
      }],
      subtotal,
      tax,
      serviceFee: serviceFee,
      total,
      currency: event.currency,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod,
      billingAddress: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        address: user.addresses?.[0]?.street || '',
        city: user.addresses?.[0]?.city || '',
        state: user.addresses?.[0]?.state || '',
        zipCode: user.addresses?.[0]?.zipCode || '',
        country: user.addresses?.[0]?.country || 'UAE',
      },
      source: 'web',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    await tempOrder.save();

    // Create Stripe payment session
    const paymentSession = await PaymentService.createPaymentIntent({
      amount: total, // Keep original amount, conversion happens in service
      currency: event.currency,
      orderId: tempOrder._id.toString(),
      metadata: {
        orderId: tempOrder._id.toString(),
        eventId: eventId,
        scheduleId: dateScheduleId,
        seats: seats.toString(),
        userId: userId,
      },
    });

    // Update order with payment intent ID
    tempOrder.paymentIntentId = paymentSession.paymentIntentId;
    await tempOrder.save();

    logger.info('Booking initiated successfully', {
      orderId: tempOrder._id,
      eventId,
      userId,
      amount: total,
    });

    res.status(201).json({
      success: true,
      message: 'Booking initiated successfully',
      data: {
        bookingId: tempOrder.orderNumber,
        orderId: tempOrder._id,
        paymentIntentId: paymentSession.paymentIntentId,
        clientSecret: paymentSession.clientSecret,
        amount: total,
        currency: event.currency,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });
  } catch (error) {
    logger.error('Error initiating booking:', error);
    return next(new AppError('Failed to initiate booking', 500));
  }
};

// @desc    Confirm booking after successful payment
// @route   POST /api/bookings/confirm
// @access  Private
export const confirmBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    const order = await Order.findById(orderId).populate('items.eventId');
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Verify payment with Stripe
    const paymentIntent = await PaymentService.getPaymentIntent(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return next(new AppError('Payment not confirmed', 400));
    }

    // Update order status
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.confirmedAt = new Date();
    order.transactionId = paymentIntent.id;

    // Reduce available seats for each item
    for (const item of order.items) {
      const event = await Event.findById(item.eventId);
      if (event) {
        const success = event.reduceSeats(item.scheduleDate, item.quantity);
        if (!success) {
          return next(new AppError('Failed to reserve seats', 500));
        }
        await event.save();
      }
    }

    await order.save();

    // Generate tickets (QR codes) - this would be handled by a background job
    // For now, we'll create placeholder ticket data
    const tickets = [];
    for (let i = 0; i < order.items.reduce((sum, item) => sum + item.quantity, 0); i++) {
      tickets.push({
        ticketId: `tkt_${order.orderNumber}_${i + 1}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${order.orderNumber}_${i + 1}&size=200x200`,
      });
    }

    logger.info('Booking confirmed successfully', {
      orderId: order._id,
      transactionId: paymentIntent.id,
    });

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        bookingId: order.orderNumber,
        eventTitle: order.items[0].eventTitle,
        date: order.items[0].scheduleDate,
        seats: order.items.reduce((sum, item) => sum + item.quantity, 0),
        amountPaid: order.total,
        currency: order.currency,
        status: order.status,
        tickets,
      },
    });
  } catch (error) {
    logger.error('Error confirming booking:', error);
    return next(new AppError('Failed to confirm booking', 500));
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
      userId,
    }).populate('items.eventId', 'title images location');

    if (!order) {
      return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        booking: order,
      },
    });
  } catch (error) {
    logger.error('Error fetching booking:', error);
    return next(new AppError('Failed to fetch booking', 500));
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    const order = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
      userId,
    });

    if (!order) {
      return next(new AppError('Booking not found', 404));
    }

    if (order.status === 'cancelled') {
      return next(new AppError('Booking is already cancelled', 400));
    }

    // Calculate refund amount based on cancellation policy
    const refundAmount = order.calculateRefundAmount();
    
    // Cancel the booking
    await order.cancel(reason);

    // Process refund if applicable
    if (refundAmount > 0 && order.paymentIntentId) {
      try {
        await PaymentService.createRefund(
          order.paymentIntentId,
          Math.round(refundAmount * 100), // Convert to cents
          'requested_by_customer'
        );
        
        order.refundAmount = refundAmount;
        order.refundReason = reason || 'Customer request';
        await order.save();
      } catch (refundError) {
        logger.error('Refund processing failed:', refundError);
        // Continue with cancellation even if refund fails
      }
    }

    logger.info('Booking cancelled', {
      orderId: order._id,
      refundAmount,
      reason,
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking: order,
        refundAmount,
      },
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return next(new AppError('Failed to cancel booking', 500));
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { userId };
    if (status) filter.status = status;

    const sortOption: any = {};
    sortOption[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const bookings = await Order.find(filter)
      .populate('items.eventId', 'title images location')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalBookings: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return next(new AppError('Failed to fetch bookings', 500));
  }
};