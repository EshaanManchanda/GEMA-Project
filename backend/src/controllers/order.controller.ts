import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { Order, Event, Ticket, User, Coupon } from "../models/index";
import AdminRevenueSettings from "../models/AdminRevenueSettings";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import { emailService } from "../services/email.service";
import { CouponService } from "../services/coupon.service";
import logger from "../config/logger";

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Customer only)
export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400, errors.array()));
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { items, billingAddress, notes, couponCode, affiliateCode } =
      req.body;

    // Validate and process order items
    const processedItems = [];
    let subtotal = 0;

    // Extract all unique event IDs (Fix N+1 query - fetch all events in one query)
    const eventIds = [...new Set(items.map((item: any) => item.eventId))];

    // Fetch all events in a single query instead of one per item
    const events = await Event.find({
      _id: { $in: eventIds },
      isApproved: true,
      isDeleted: false,
    });

    // Create a map for quick event lookup by ID
    const eventMap = new Map(
      events.map((event) => [event._id.toString(), event]),
    );

    // Process each item using the pre-fetched events
    for (const item of items) {
      const event = eventMap.get(item.eventId.toString());

      if (!event) {
        return next(
          new AppError(`Event ${item.eventId} not found or not available`, 404),
        );
      }

      // Check if event has available seats for the requested date
      if (
        !event.hasAvailableSeats(new Date(item.scheduleDate), item.quantity)
      ) {
        return next(
          new AppError(
            `Not enough seats available for ${event.title} on ${item.scheduleDate}`,
            400,
          ),
        );
      }

      // Find the correct price for the schedule date
      const schedule = event.dateSchedule.find(
        (s: any) =>
          s.date.toDateString() === new Date(item.scheduleDate).toDateString(),
      );

      if (!schedule) {
        return next(
          new AppError(
            `No schedule found for ${event.title} on ${item.scheduleDate}`,
            400,
          ),
        );
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

    // Get fee rates from AdminRevenueSettings
    const adminSettings = await AdminRevenueSettings.findOne({});
    const serviceFeeRate = adminSettings?.defaultCommissionRate || 5;
    const taxRate = adminSettings?.taxSettings?.vatRate || 5;

    // Calculate fees
    const serviceFee = subtotal * (serviceFeeRate / 100);
    const tax = (subtotal + serviceFee) * (taxRate / 100);

    // Create order (coupon applied after creation so we have the order._id)
    const orderData = {
      userId,
      items: processedItems,
      subtotal,
      tax,
      serviceFee,
      serviceFeeRate,
      taxRate,
      discount: 0,
      couponDiscount: 0,
      currency: processedItems[0].currency,
      billingAddress,
      notes,
      affiliateCode,
      couponCode,
    };

    const order = await Order.create(orderData);

    // Apply coupon discount if provided
    let couponDiscount = 0;
    if (couponCode) {
      try {
        const coupon = await Coupon.findByCode(couponCode);
        if (coupon) {
          const result = await CouponService.applyCoupon(
            coupon._id.toString(),
            order._id.toString(),
            userId,
          );
          couponDiscount = result.discountAmount;
        }
      } catch (couponErr) {
        logger.warn("Coupon application failed, proceeding without discount", {
          couponCode,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private (Customer only)
export const getUserOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
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
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(
          "items.eventId",
          "title category type images location venueType meetingLink",
        )
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
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
export const getOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const order = await Order.findOne({
      _id: id,
      userId,
    }).populate(
      "items.eventId",
      "title category type images location vendorId venueType meetingLink",
    );

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer - own orders only)
export const cancelOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: id,
      userId,
    });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    // Check if order can be cancelled using the model method
    const cancelCheck = order.canBeCancelledByCustomer();
    if (!cancelCheck.canCancel) {
      return next(
        new AppError(cancelCheck.reason || "Order cannot be cancelled", 400),
      );
    }

    // Return seats to events
    for (const item of order.items) {
      const event = await Event.findById(item.eventId);
      if (event) {
        const schedule = event.dateSchedule.find((s: any) => {
          const scheduleDate = s.startDate || s.date;
          if (!scheduleDate || !item.scheduleDate) return false;
          return (
            new Date(scheduleDate).toDateString() ===
            new Date(item.scheduleDate).toDateString()
          );
        });
        if (schedule && !schedule.unlimitedSeats) {
          schedule.availableSeats =
            (schedule.availableSeats || 0) + item.quantity;
          if (schedule.soldSeats !== undefined) {
            schedule.soldSeats = Math.max(
              0,
              schedule.soldSeats - item.quantity,
            );
          }
          await event.save();
        }
      }
    }

    await order.cancel(reason);

    // Send cancellation email
    try {
      const customer = (await User.findById(userId).lean()) as any;
      if (customer) {
        const refundAmount = order.calculateRefundAmount();
        await emailService.sendCancellationConfirmationEmail({
          to: customer.email,
          firstName: customer.firstName,
          orderNumber: order.orderNumber,
          refundAmount,
          nonRefundableAmount: order.total - refundAmount,
          serviceFee: (order as any).serviceFee || 0,
          tax: (order as any).tax || 0,
          currency: order.currency,
          reason: reason || "Customer request",
        });
      }
    } catch (emailError: any) {
      console.error("Failed to send cancellation email:", emailError?.message);
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process payment for order
// @route   POST /api/orders/:id/payment
// @access  Private (Customer - own orders only)
export const processPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { paymentMethod, paymentIntentId } = req.body;

    const order = await Order.findOne({
      _id: id,
      userId,
    });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (order.paymentStatus === "paid") {
      return next(new AppError("Order already paid", 400));
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
            ticketType: "standard",
            status: "active",
            price: item.unitPrice,
            currency: item.currency,
          });
          tickets.push(ticket);
        }
      }

      // Send order confirmation email
      const user = await User.findById(userId);
      if (user) {
        // Populate order with event details for email
        await order.populate("items.eventId", "venueType meetingLink");

        await emailService.sendOrderConfirmationEmail({
          to: user.email,
          firstName: user.firstName,
          orderNumber: order.orderNumber,
          orderTotal: order.total,
          currency: order.currency,
          items: order.items.map((item) => ({
            eventTitle: item.eventTitle,
            quantity: item.quantity,
            price: item.totalPrice,
            date: item.scheduleDate,
            venueType: (item.eventId as any)?.venueType,
            meetingLink: (item.eventId as any)?.meetingLink,
          })),
        });

        // TODO: Send tickets email separately with QR codes
      }

      res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        data: {
          order,
          tickets,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment failed",
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
export const getAdminOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {};

    // Status filters
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999); // Include the entire end date
        filter.createdAt.$lte = endDateTime;
      }
    }

    // Search filter (search across multiple fields)
    if (search) {
      const searchRegex = new RegExp(search as string, "i"); // Case-insensitive
      filter.$or = [
        { orderNumber: searchRegex },
        { "billingAddress.email": searchRegex },
        { "billingAddress.firstName": searchRegex },
        { "billingAddress.lastName": searchRegex },
        { "items.eventTitle": searchRegex },
      ];
    }

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute query with lean() for better performance
    // (billingAddress already contains customer data, no need to populate userId)
    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Admin orders retrieved successfully",
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

// @desc    Get single order by ID (Admin only)
// @route   GET /api/orders/admin/:id
// @access  Private (Admin only)
export const getOrderAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate(
        "items.eventId",
        "title category type images location vendorId venueType meetingLink slug",
      )
      .lean();

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order analytics
// @route   GET /api/orders/admin/analytics
// @access  Private (Admin only)
export const getOrderAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { period = "30" } = req.query;
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
          totalRevenue: { $sum: "$total" },
          avgOrderValue: { $avg: "$total" },
          paidOrders: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          totalTickets: { $sum: "$totalTickets" },
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
      message: "Order analytics retrieved successfully",
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
export const getVendorOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vendorId = req.user?._id || req.user?.id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build match query for vendor's events
    const matchQuery: any = {
      "items.eventVendorId": vendorId,
    };
    if (status) matchQuery.status = status;

    // Build sort query
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute aggregation to find orders containing vendor's events
    const pipeline = [
      {
        $lookup: {
          from: "events",
          localField: "items.eventId",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      {
        $addFields: {
          "items.eventVendorId": {
            $map: {
              input: "$items",
              as: "item",
              in: {
                $let: {
                  vars: {
                    eventDetail: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$eventDetails",
                            cond: { $eq: ["$$this._id", "$$item.eventId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: "$$eventDetail.vendorId",
                },
              },
            },
          },
        },
      },
      {
        $match: {
          "items.eventVendorId": vendorId,
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
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "customer",
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
        },
      },
    ];

    const [orders, totalCount] = await Promise.all([
      Order.aggregate(pipeline),
      Order.aggregate([
        ...pipeline.slice(0, -3), // Remove sort, skip, limit, and lookup
        { $count: "total" },
      ]),
    ]);

    const total = totalCount[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Vendor orders retrieved successfully",
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

// =============================================
// ADMIN ORDER MANAGEMENT FUNCTIONS
// =============================================

// @desc    Confirm order (Admin only)
// @route   POST /api/orders/admin/:id/confirm
// @access  Private (Admin only)
export const confirmOrderAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (order.status === "confirmed") {
      return next(new AppError("Order is already confirmed", 400));
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      return next(new AppError(`Cannot confirm ${order.status} order`, 400));
    }

    // Mark order as confirmed
    await order.confirm();

    res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund order (Admin only)
// @route   POST /api/orders/admin/:id/refund
// @access  Private (Admin only)
export const refundOrderAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (order.paymentStatus !== "paid") {
      return next(new AppError("Cannot refund unpaid order", 400));
    }

    if (order.status === "refunded") {
      return next(new AppError("Order is already refunded", 400));
    }

    // Calculate refund amount if not provided
    const refundAmount = amount || order.calculateRefundAmount();

    if (refundAmount > order.total) {
      return next(new AppError("Refund amount cannot exceed order total", 400));
    }

    // Process refund
    await order.refund(refundAmount, reason);

    // Send refund confirmation email
    try {
      const customer = (await User.findById(order.userId).lean()) as any;
      if (customer) {
        await emailService.sendRefundProcessedEmail({
          to: customer.email,
          firstName: customer.firstName,
          orderNumber: order.orderNumber,
          refundAmount,
          currency: order.currency,
          refundTransactionId: order.paymentIntentId || order.orderNumber,
        });
      }
    } catch (emailError: any) {
      console.error("Failed to send refund email:", emailError?.message);
    }

    res.status(200).json({
      success: true,
      message: "Order refunded successfully",
      data: {
        order,
        refundAmount,
        refundReason: reason,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order (Admin only)
// @route   PUT /api/orders/admin/:id
// @access  Private (Admin only)
export const updateOrderAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating certain protected fields
    const protectedFields = [
      "_id",
      "userId",
      "orderNumber",
      "paymentIntentId",
      "transactionId",
      "createdAt",
    ];
    protectedFields.forEach((field) => delete updateData[field]);

    const order = await Order.findById(id);
    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    // Update order fields
    Object.assign(order, updateData);
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order (Admin only)
// @route   DELETE /api/orders/admin/:id
// @access  Private (Admin only)
export const deleteOrderAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    // Only allow deletion of pending or cancelled orders
    if (order.status === "confirmed" || order.paymentStatus === "paid") {
      return next(
        new AppError(
          "Cannot delete confirmed or paid orders. Please refund or cancel first.",
          400,
        ),
      );
    }

    await Order.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: { orderId: id },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update orders (Admin only)
// @route   PATCH /api/orders/admin/bulk
// @access  Private (Admin only)
export const bulkUpdateOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderIds, action, updateData } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return next(new AppError("Order IDs array is required", 400));
    }

    const orders = await Order.find({ _id: { $in: orderIds } });

    if (orders.length === 0) {
      return next(new AppError("No orders found with provided IDs", 404));
    }

    const results = {
      successful: [] as string[],
      failed: [] as { orderId: string; reason: string }[],
    };

    // Process each order based on action
    for (const order of orders) {
      try {
        switch (action) {
          case "confirm":
            if (order.status === "pending") {
              await order.confirm();
              results.successful.push(order._id.toString());
            } else {
              results.failed.push({
                orderId: order._id.toString(),
                reason: `Order status is ${order.status}, cannot confirm`,
              });
            }
            break;

          case "cancel":
            if (order.status === "pending" || order.status === "confirmed") {
              await order.cancel(
                updateData?.reason || "Bulk cancellation by admin",
              );
              results.successful.push(order._id.toString());
            } else {
              results.failed.push({
                orderId: order._id.toString(),
                reason: `Order status is ${order.status}, cannot cancel`,
              });
            }
            break;

          case "refund":
            if (order.paymentStatus === "paid" && order.status !== "refunded") {
              const refundAmount =
                updateData?.amount || order.calculateRefundAmount();
              await order.refund(
                refundAmount,
                updateData?.reason || "Bulk refund by admin",
              );
              results.successful.push(order._id.toString());
            } else {
              results.failed.push({
                orderId: order._id.toString(),
                reason: `Cannot refund - payment status: ${order.paymentStatus}, order status: ${order.status}`,
              });
            }
            break;

          case "update":
            // Prevent updating protected fields
            const protectedFields = [
              "_id",
              "userId",
              "orderNumber",
              "paymentIntentId",
              "transactionId",
              "createdAt",
            ];
            const safeUpdateData = { ...updateData };
            protectedFields.forEach((field) => delete safeUpdateData[field]);

            Object.assign(order, safeUpdateData);
            await order.save();
            results.successful.push(order._id.toString());
            break;

          default:
            results.failed.push({
              orderId: order._id.toString(),
              reason: `Unknown action: ${action}`,
            });
        }
      } catch (error) {
        results.failed.push({
          orderId: order._id.toString(),
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${action} completed`,
      data: {
        total: orderIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};
