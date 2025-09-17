import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Order, Event, User, Ticket } from '../models';
import { AppError } from '../middleware';
import { AuthRequest } from '../types';
import { PaymentService } from '../services/payment.service';
import { logger } from '../config';
import { generateQRCode, generateSecureQRData } from '../utils/qrcode';
import { TicketGenerationService } from '../services/ticketGeneration.service';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate a unique ticket number
const generateUniqueTicketNumber = async (): Promise<string> => {
  let ticketNumber: string = '';
  let isUnique = false;
  while (!isUnique) {
    ticketNumber = uuidv4();
    const existingTicket = await Ticket.findOne({ ticketNumber });
    if (!existingTicket) {
      isUnique = true;
    }
  }
  return ticketNumber;
};

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

    // Get schedule date (handle both legacy 'date' field and new 'startDate' field)
    const scheduleDate = schedule.startDate || schedule.date;
    if (!scheduleDate) {
      logger.error('Schedule date is missing from schedule object', {
        scheduleId: dateScheduleId,
        schedule: {
          _id: schedule._id,
          date: schedule.date,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          availableSeats: schedule.availableSeats
        }
      });
      return next(new AppError('Schedule date is invalid', 400));
    }

    // Validate that scheduleDate is a valid date
    const parsedScheduleDate = new Date(scheduleDate);
    if (isNaN(parsedScheduleDate.getTime())) {
      logger.error('Schedule date is not a valid date', {
        scheduleId: dateScheduleId,
        scheduleDate,
        scheduleType: typeof scheduleDate
      });
      return next(new AppError('Schedule date format is invalid', 400));
    }

    logger.info('Schedule date validation passed', {
      scheduleId: dateScheduleId,
      scheduleDate: parsedScheduleDate.toISOString(),
      originalScheduleDate: scheduleDate
    });

    // Check seat availability
    if (schedule.availableSeats < seats) {
      return next(new AppError(`Only ${schedule.availableSeats} seats available for this date`, 400));
    }

    // Get user information for billing
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Get payment routing info to determine if service fee applies
    const paymentRouting = await PaymentService.getPaymentRouting(event.vendorId.toString(), 0); // Amount doesn't matter for routing decision

    // Calculate total amount based on vendor payment setup
    const unitPrice = schedule.price || event.price;
    const subtotal = unitPrice * seats;
    const tax = subtotal * 0.05; // 5% tax

    // Service fee only applies if using platform Stripe
    const serviceFee = paymentRouting.usesVendorStripe ? 0 : (subtotal * 0.05); // 5% service fee for platform payments
    const total = subtotal + tax + serviceFee;

    // Create temporary order with pending status
    const tempOrder = new Order({
      userId,
      items: [{
        eventId,
        eventTitle: event.title,
        scheduleDate: parsedScheduleDate,
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
      paymentRouting: {
        usesVendorStripe: paymentRouting.usesVendorStripe,
        vendorStripeAccountId: paymentRouting.vendorStripeAccountId,
        platformCommission: paymentRouting.platformCommission,
        vendorPayout: paymentRouting.vendorPayout,
        stripeApplicationFee: 0, // Will be set if using Stripe Connect
      },
      billingAddress: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || user.email, // Use email as fallback for phone
        address: user.addresses?.[0]?.street || 'TBD',
        city: user.addresses?.[0]?.city || 'TBD',
        state: user.addresses?.[0]?.state || 'TBD',
        zipCode: user.addresses?.[0]?.zipCode || '00000',
        country: user.addresses?.[0]?.country || 'UAE',
      },
      source: 'web',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    await tempOrder.save();

    // Create payment session based on payment method
    let paymentSession: any;

    if (paymentMethod === 'test') {
      // For test payments, create a mock payment session
      paymentSession = {
        paymentIntentId: `test_pi_${tempOrder._id}`,
        clientSecret: `test_pi_${tempOrder._id}_secret`,
      };
    } else {
      // Create Stripe payment session for real payments
      paymentSession = await PaymentService.createPaymentIntent({
        amount: total, // Keep original amount, conversion happens in service
        currency: event.currency,
        orderId: tempOrder._id.toString(),
        vendorId: event.vendorId.toString(), // Add vendor ID for routing
        metadata: {
          orderId: tempOrder._id.toString(),
          eventId: eventId,
          scheduleId: dateScheduleId,
          seats: seats.toString(),
          userId: userId,
        },
      });
    }

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

    // Verify payment based on payment method
    let paymentIntent: any;

    if (paymentIntentId.startsWith('test_pi_')) {
      // For test payments, create a mock successful payment intent
      paymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
      };
    } else {
      // Verify payment with Stripe for real payments
      paymentIntent = await PaymentService.getPaymentIntent(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return next(new AppError('Payment not confirmed', 400));
      }
    }

    // Update order status
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.confirmedAt = new Date();
    order.transactionId = paymentIntent.id;

    // Reduce available seats for each item
    for (const item of order.items) {
      // Validate order item data before processing
      if (!item.eventId) {
        logger.error('Order item missing eventId', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          item
        });
        return next(new AppError('Invalid order data: missing event ID', 500));
      }

      if (!item.scheduleDate || !(item.scheduleDate instanceof Date) || isNaN(item.scheduleDate.getTime())) {
        logger.error('Order item has invalid scheduleDate', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          eventId: item.eventId,
          scheduleDate: item.scheduleDate,
          scheduleDateType: typeof item.scheduleDate,
          isDateInstance: item.scheduleDate instanceof Date
        });
        return next(new AppError('Invalid order data: missing or invalid schedule date', 500));
      }

      if (!item.quantity || item.quantity <= 0) {
        logger.error('Order item has invalid quantity', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          eventId: item.eventId,
          quantity: item.quantity
        });
        return next(new AppError('Invalid order data: invalid quantity', 500));
      }

      const event = await Event.findById(item.eventId);
      if (!event) {
        logger.error('Event not found for order item', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          eventId: item.eventId
        });
        return next(new AppError(`Event not found for order item: ${item.eventId}`, 404));
      }

      logger.info('Attempting to reduce seats', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        eventId: item.eventId,
        eventTitle: event.title,
        scheduleDate: item.scheduleDate.toISOString(),
        quantity: item.quantity,
        dateScheduleCount: event.dateSchedule.length
      });

      const success = event.reduceSeats(item.scheduleDate, item.quantity);
      if (!success) {
        logger.error('Failed to reduce seats for booking', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          eventId: item.eventId,
          eventTitle: event.title,
          scheduleDate: item.scheduleDate.toISOString(),
          quantity: item.quantity,
          dateSchedule: event.dateSchedule.map((s: any) => ({
            _id: s._id,
            date: s.date,
            startDate: s.startDate,
            endDate: s.endDate,
            availableSeats: s.availableSeats,
            soldSeats: s.soldSeats
          }))
        });
        return next(new AppError(`Failed to reserve ${item.quantity} seats for ${event.title} on ${item.scheduleDate.toDateString()}`, 500));
      }

      logger.info('Successfully reduced seats', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        eventId: item.eventId,
        eventTitle: event.title,
        scheduleDate: item.scheduleDate.toISOString(),
        quantity: item.quantity
      });

      await event.save();
    }

    await order.save();

    // Generate tickets using the centralized service
    logger.info('Starting ticket generation process using TicketGenerationService', {
      orderId: order._id,
      orderNumber: order.orderNumber
    });

    const ticketResult = await TicketGenerationService.generateTicketsForOrder(order._id.toString(), {
      sendEmail: true,
      skipExisting: false
    });

    const tickets = ticketResult.tickets.map(ticket => ({
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      qrCodeUrl: ticket.qrCodeImage,
      status: ticket.status,
    }));

    if (!ticketResult.success && ticketResult.errors.length > 0) {
      logger.warn('Some tickets failed to generate', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        errors: ticketResult.errors,
        successfulTickets: ticketResult.totalGenerated
      });
    } else {
      logger.info('Ticket generation completed successfully', {
        orderId: order._id,
        totalTicketsGenerated: ticketResult.totalGenerated
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