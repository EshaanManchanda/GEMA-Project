import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import CancellationLog from "./cancellation-log.model";
import { RefundService } from "../../modules/payments/refund.service";
import { emailQueue } from "../../config/queue";
import { emailService } from "../../modules/notifications/email.service";
import logger from "../../config/logger";

const Event = () => mongoose.model("Event");
const Order = () => mongoose.model("Order");
const User = () => mongoose.model("User");

const sendEventCancellationEmail = async (data: {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  orderNumber: string;
  reason: string;
  refundAmount: number;
  nonRefundableAmount: number;
  currency: string;
  serviceFee: number;
  tax: number;
}) => {
  if (emailQueue) {
    await emailQueue.add("eventCancellation", {
      type: "eventCancellation",
      to: data.to,
      templateData: data,
    });
  } else {
    await emailService.sendEventCancellationEmail(data);
  }
};

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const cancelEvent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
      return;
    }

    const event = await Event().findById(id).session(session);
    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    const user = await User().findById(userId).session(session);
    const isAdmin = user?.role === "admin";
    const isVendorOwner = event.vendorId.toString() === userId?.toString();

    if (!isAdmin && !isVendorOwner) {
      res.status(403).json({
        success: false,
        message: "Not authorized to cancel this event",
      });
      return;
    }

    if (!event.isCancellable()) {
      res.status(400).json({
        success: false,
        message:
          "Event cannot be cancelled. It may have already started or been cancelled.",
      });
      return;
    }

    const affectedOrders = await Order().find({
      "items.eventId": id,
      status: { $in: ["confirmed", "pending"] },
      paymentStatus: "paid",
    }).session(session);

    await event.cancelEvent(reason, userId);

    await session.commitTransaction();
    session.endSession();

    const refundResults = await RefundService.batchProcessRefunds(
      id,
      reason,
      userId,
    );

    await Event().findByIdAndUpdate(id, {
      "cancellationNotification.totalAttendees": affectedOrders.length,
      "cancellationNotification.notifiedCount": 0,
      "cancellationNotification.failedCount": 0,
    });

    const notificationPromises = affectedOrders.map(async (order) => {
      try {
        const customer = await User().findById(order.userId).select(
          "email firstName phone",
        );
        if (customer?.email) {
          const tax = order.tax || 0;
          const serviceFee = order.serviceFee || 0;
          await sendEventCancellationEmail({
            to: customer.email,
            firstName: customer.firstName || "Customer",
            eventTitle: event.title,
            eventDate:
              event.dateSchedule[0]?.startDate || event.dateSchedule[0]?.date,
            orderNumber: order.orderNumber,
            reason,
            refundAmount: order.refundAmount || 0,
            nonRefundableAmount: serviceFee + tax,
            currency: order.currency,
            serviceFee,
            tax,
          });
        }
        return { success: true, orderId: order._id };
      } catch (error) {
        logger.error(
          `Failed to queue notification for order ${order._id}:`,
          error,
        );
        return { success: false, orderId: order._id };
      }
    });

    const notificationResults = await Promise.all(notificationPromises);
    const successfulNotifications = notificationResults.filter(
      (r) => r.success,
    ).length;
    const failedNotifications = notificationResults.filter(
      (r) => !r.success,
    ).length;

    await Event().findByIdAndUpdate(id, {
      "cancellationNotification.notified": true,
      "cancellationNotification.notifiedAt": new Date(),
      "cancellationNotification.notifiedCount": successfulNotifications,
      "cancellationNotification.failedCount": failedNotifications,
    });

    res.status(200).json({
      success: true,
      message: "Event cancelled successfully",
      data: {
        eventId: id,
        reason,
        affectedOrders: affectedOrders.length,
        refundSummary: {
          totalOrders: refundResults.totalOrders,
          successfulRefunds: refundResults.successfulRefunds,
          failedRefunds: refundResults.failedRefunds,
          totalRefundAmount: refundResults.totalRefundAmount,
        },
        notifications: {
          queued: successfulNotifications,
          failed: failedNotifications,
        },
      },
    });
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    logger.error("Error cancelling event:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel event",
    });
  }
};

export const getCancellationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event().findById(id)
      .select(
        "title cancellationStatus cancellationReason cancelledAt cancelledBy cancellationNotification",
      )
      .populate("cancelledBy", "firstName lastName email");

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    const refundStats = await CancellationLog.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$refundStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$refundAmount" },
        },
      },
    ]);

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalRefunded: 0,
    };

    refundStats.forEach((stat: any) => {
      if (stat._id in stats) {
        (stats as any)[stat._id] = stat.count;
      }
      if (stat._id === "completed") {
        stats.totalRefunded = stat.totalAmount;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        event: {
          _id: event._id,
          title: event.title,
          cancellationStatus: event.cancellationStatus,
          cancellationReason: event.cancellationReason,
          cancelledAt: event.cancelledAt,
          cancelledBy: event.cancelledBy,
        },
        notifications: event.cancellationNotification,
        refundStats: stats,
      },
    });
  } catch (error: any) {
    logger.error("Error getting cancellation status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get cancellation status",
    });
  }
};

export const getAffectedOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const event = await Event().findById(id);
    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order().find({
      "items.eventId": id,
    })
      .populate("userId", "firstName lastName email phone")
      .select(
        "orderNumber status paymentStatus total currency refundAmount refundStatus createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalOrders = await Order().countDocuments({ "items.eventId": id });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalOrders / Number(limit)),
          totalOrders,
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    logger.error("Error getting affected orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get affected orders",
    });
  }
};

export const retryNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event().findById(id);
    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    if (event.cancellationStatus !== "cancelled") {
      res.status(400).json({
        success: false,
        message: "Event is not cancelled",
      });
      return;
    }

    const failedLogs = await CancellationLog.find({
      eventId: id,
      "notificationStatus.email.status": { $in: ["failed", undefined] },
    });

    let retriedCount = 0;
    let failedCount = 0;

    for (const log of failedLogs) {
      try {
        const customer = await User().findById(log.customerId).select(
          "email firstName phone",
        );
        if (customer?.email) {
          const tax = log.tax || 0;
          const serviceFee = log.serviceFee || 0;
          await sendEventCancellationEmail({
            to: customer.email,
            firstName: customer.firstName || "Customer",
            eventTitle: event.title,
            eventDate:
              event.dateSchedule[0]?.startDate || event.dateSchedule[0]?.date,
            orderNumber: log.metadata?.orderNumber,
            reason: log.reason,
            refundAmount: log.refundAmount,
            nonRefundableAmount: serviceFee + tax,
            currency: log.currency,
            serviceFee,
            tax,
          });

          log.notificationStatus.email = {
            sent: true,
            sentAt: new Date(),
            status: "pending",
          };
          await log.save();

          retriedCount++;
        }
      } catch (error) {
        logger.error(`Failed to retry notification for log ${log._id}:`, error);
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: "Notifications retry completed",
      data: {
        retriedCount,
        failedCount,
      },
    });
  } catch (error: any) {
    logger.error("Error retrying notifications:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retry notifications",
    });
  }
};

export const cancelOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id;

    const order = await Order().findById(id);
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (order.userId.toString() !== userId?.toString()) {
      res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
      return;
    }

    const cancelCheck = order.canBeCancelledByCustomer();
    if (!cancelCheck.canCancel) {
      res.status(400).json({
        success: false,
        message: cancelCheck.reason || "Order cannot be cancelled",
      });
      return;
    }

    const refundResult = await RefundService.processRefund({
      orderId: id,
      reason: reason || "Customer requested cancellation",
      initiatedBy: userId,
      cancellationType: "user_requested",
    });

    if (!refundResult.success) {
      logger.warn(
        `Auto-refund failed for order ${id}: ${refundResult.error}. Proceeding with manual cancellation.`,
      );

      await order.cancel(reason || "Customer requested cancellation");

      const amounts = RefundService.calculateRefundableAmount(
        order,
        "user_requested",
      );
      refundResult.refundAmount = amounts.refundAmount;
      refundResult.nonRefundableAmount = amounts.nonRefundableAmount;
      refundResult.serviceFee = amounts.serviceFee;
      refundResult.tax = amounts.tax;
      refundResult.error = refundResult.error;
    }

    const customer = await User().findById(userId).select("email firstName");
    if (customer?.email) {
      try {
        await emailService.sendCancellationConfirmationEmail({
          to: customer.email,
          firstName: customer.firstName || "Customer",
          orderNumber: order.orderNumber,
          refundAmount: refundResult.refundAmount,
          nonRefundableAmount: refundResult.nonRefundableAmount,
          serviceFee: refundResult.serviceFee,
          tax: refundResult.tax,
          currency: order.currency,
          reason: reason || "Customer requested cancellation",
        });
      } catch (emailError: any) {
        logger.warn(
          "Failed to send cancellation confirmation email:",
          emailError?.message,
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        orderId: id,
        orderNumber: order.orderNumber,
        refundAmount: refundResult.refundAmount,
        nonRefundableAmount: refundResult.nonRefundableAmount,
        serviceFee: refundResult.serviceFee,
        tax: refundResult.tax,
        refundId: refundResult.refundId,
        message: refundResult.error
          ? `Your order has been cancelled. Note: Auto-refund failed (${refundResult.error}). Please contact support if you expect a refund.`
          : `Your refund of ${order.currency} ${refundResult.refundAmount.toFixed(2)} will be processed within 5-10 business days. Fees of ${order.currency} ${refundResult.nonRefundableAmount.toFixed(2)} are non-refundable.`,
      },
    });
  } catch (error: any) {
    logger.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel order",
    });
  }
};

export const getRefundStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const order = await Order().findById(id).select(
      "orderNumber userId status paymentStatus refundStatus refundAmount refundTransactionId refundedAt serviceFee currency cancellationType",
    );

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const user = await User().findById(userId);
    const isAdmin = user?.role === "admin";
    const isOwner = order.userId.toString() === userId?.toString();

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
      return;
    }

    const cancellationLog = await CancellationLog.findOne({
      orderId: id,
    }).select(
      "refundStatus refundProcessedAt refundFailureReason notificationStatus",
    );

    res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundStatus: order.refundStatus || "not_initiated",
        refundAmount: order.refundAmount,
        serviceFee: order.serviceFee,
        serviceFeeRefunded: false,
        currency: order.currency,
        refundTransactionId: order.refundTransactionId,
        refundedAt: order.refundedAt,
        cancellationType: order.cancellationType,
        notifications: cancellationLog?.notificationStatus,
      },
    });
  } catch (error: any) {
    logger.error("Error getting refund status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get refund status",
    });
  }
};
