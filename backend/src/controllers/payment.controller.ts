import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { PaymentService } from '../services/payment.service';
import CommissionService from '../services/commission.service';
import { Order, User } from '../models/index';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types/index';
import { config } from '../config/index';

// @desc    Create payment intent for order
// @route   POST /api/payments/create-intent
// @access  Private (Customer only)
export const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    const { orderId } = req.body;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Verify order belongs to user and is payable
    const order = await Order.findOne({
      _id: orderId,
      userId,
      paymentStatus: 'pending',
    });

    if (!order) {
      return next(new AppError('Order not found or not payable', 404));
    }

    // Get user details for Stripe customer
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Create or get Stripe customer
    const customer = await PaymentService.createOrGetCustomer(
      user.email,
      `${user.firstName} ${user.lastName}`,
      userId
    );

    // Create payment intent
    const { clientSecret, paymentIntentId } = await PaymentService.createPaymentIntent({
      amount: order.total,
      currency: order.currency,
      orderId: (order._id as any).toString(),
      customerId: customer.id,
      metadata: {
        userId: userId,
        userEmail: user.email,
        orderNumber: order.orderNumber,
      },
    });

    // Update order with payment intent ID
    order.paymentIntentId = paymentIntentId;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret,
        paymentIntentId,
        amount: order.total,
        currency: order.currency,
        customerId: customer.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private (Customer only)
export const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Find order by payment intent ID
    const order = await Order.findOne({
      paymentIntentId,
      userId,
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Confirm payment with Stripe
    const paymentIntent = await PaymentService.confirmPaymentIntent(
      paymentIntentId,
      paymentMethodId
    );

    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      // Payment successful - this will also be handled by webhook
      await order.markAsPaid(paymentIntentId, 'stripe');
      await order.confirm(); // This will automatically generate tickets

      // Calculate commission for this order
      try {
        await CommissionService.calculateCommissionForOrder(order._id.toString());
        console.log(`✅ Commission calculated for order ${order._id}`);
      } catch (commissionError) {
        console.error(`⚠️  Failed to calculate commission for order ${order._id}:`, commissionError);
        // Continue anyway - don't fail the payment confirmation
      }

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          order,
          paymentStatus: paymentIntent.status,
        },
      });
    } else if (paymentIntent.status === 'requires_action') {
      // Additional authentication required (3D Secure, etc.)
      res.status(200).json({
        success: true,
        message: 'Additional authentication required',
        data: {
          paymentStatus: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
        },
      });
    } else {
      // Payment failed or pending
      res.status(400).json({
        success: false,
        message: 'Payment could not be confirmed',
        data: {
          paymentStatus: paymentIntent.status,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel payment intent
// @route   POST /api/payments/cancel
// @access  Private (Customer only)
export const cancelPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    const { paymentIntentId } = req.body;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Verify order belongs to user
    const order = await Order.findOne({
      paymentIntentId,
      userId,
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Cancel payment intent
    const paymentIntent = await PaymentService.cancelPaymentIntent(paymentIntentId);

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      data: {
        paymentStatus: paymentIntent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process refund
// @route   POST /api/payments/refund
// @access  Private (Admin only)
export const processRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    const { orderId, amount, reason } = req.body;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (order.paymentStatus !== 'paid') {
      return next(new AppError('Order is not paid, cannot refund', 400));
    }

    if (!order.paymentIntentId) {
      return next(new AppError('No payment intent found for this order', 400));
    }

    // Process refund
    const refundAmount = amount || order.total;
    const stripeRefund = await PaymentService.createRefund(
      order.paymentIntentId,
      refundAmount,
      reason
    );

    // Update order
    await order.refund(refundAmount, reason);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund: stripeRefund,
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer payment methods
// @route   GET /api/payments/payment-methods
// @access  Private (Customer only)
export const getPaymentMethods = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Get or create Stripe customer
    const customer = await PaymentService.createOrGetCustomer(
      user.email,
      `${user.firstName} ${user.lastName}`,
      userId
    );

    // Get payment methods
    const paymentMethods = await PaymentService.getCustomerPaymentMethods(customer.id);

    res.status(200).json({
      success: true,
      message: 'Payment methods retrieved successfully',
      data: {
        paymentMethods,
        customerId: customer.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove payment method
// @route   DELETE /api/payments/payment-methods/:id
// @access  Private (Customer only)
export const removePaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    // Detach payment method
    await PaymentService.detachPaymentMethod(id);

    res.status(200).json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Stripe webhooks
// @route   POST /api/payments/webhook
// @access  Public (Stripe only)
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return next(new AppError('Missing Stripe signature', 400));
    }

    // Process webhook event
    await PaymentService.processWebhookEvent(req.body, signature);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

// @desc    Get Stripe publishable key
// @route   GET /api/payments/config
// @access  Public
export const getStripeConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        publishableKey: config.stripe.publishableKey,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment analytics (Admin only)
// @route   GET /api/payments/admin/analytics
// @access  Private (Admin only)
export const getPaymentAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          dailyRevenue: { $sum: '$total' },
          dailyOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    // Calculate totals
    const totals = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment analytics retrieved successfully',
      data: {
        dailyStats: analytics,
        totals: totals[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
        period: `${days} days`,
      },
    });
  } catch (error) {
    next(error);
  }
};