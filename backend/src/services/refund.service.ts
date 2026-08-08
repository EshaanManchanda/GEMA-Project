import { Order, Event, User } from "../models/index";
import CancellationLog from "../models/CancellationLog";
import { PaymentService } from "./payment.service";
import { convertToStripeAmount } from "../config/stripe";
import logger from "../config/logger";
import mongoose from "mongoose";
import {
  dispatch,
  CommunicationJobType,
} from "./communication/communication.service";
import {
  CommunicationChannel,
  CommunicationCategory,
  NotificationTemplateKey,
} from "../models/index";

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundAmount: number;
  nonRefundableAmount: number;
  // @deprecated legacy — only non-zero on orders that predate service-fee
  // removal; those are the only orders where anything is non-refundable.
  serviceFee: number;
  vat: number;
  error?: string;
}

export interface ProcessRefundOptions {
  orderId: string;
  reason: string;
  initiatedBy: mongoose.Types.ObjectId;
  cancellationType: "user_requested" | "event_cancelled" | "admin_cancelled";
}

export interface BatchRefundResult {
  totalOrders: number;
  successfulRefunds: number;
  failedRefunds: number;
  totalRefundAmount: number;
  results: Array<{
    orderId: string;
    success: boolean;
    refundAmount?: number;
    error?: string;
  }>;
}

export class RefundService {
  /**
   * Calculate refund amount for an order based on cancellation type.
   *
   * Policy: ticket price (subtotal - couponDiscount) AND VAT are refundable
   * — if the sale is reversed, the tax charged on it is reversed too. Only
   * `serviceFee` is withheld, and only on legacy orders that predate
   * service-fee removal (see plan: VAT rename + service-fee removal, Phase
   * 7) — it's always 0 on new orders, so `nonRefundableAmount` is 0 for
   * every order created after that change.
   */
  static calculateRefundableAmount(
    order: any,
    cancellationType: string,
  ): {
    refundAmount: number;
    nonRefundableAmount: number;
    serviceFee: number;
    vat: number;
  } {
    if (order.paymentStatus !== "paid") {
      return { refundAmount: 0, nonRefundableAmount: 0, serviceFee: 0, vat: 0 };
    }

    // Legacy-only — 0 on every order created after service-fee removal.
    const serviceFee = order.serviceFee || 0;
    const vat = order.vat || 0;

    // Ticket price = subtotal - any coupon discount
    const ticketPrice = order.subtotal - (order.couponDiscount || 0);

    // Only the legacy service fee is withheld; VAT is refunded along with
    // the ticket price.
    const nonRefundableAmount = serviceFee;

    return {
      refundAmount: Math.max(0, ticketPrice + vat),
      nonRefundableAmount,
      serviceFee,
      vat,
    };
  }

  /**
   * Process a refund for an order
   */
  static async processRefund(
    options: ProcessRefundOptions,
  ): Promise<RefundResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId, reason, initiatedBy, cancellationType } = options;

      // Find the order
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      // Check if order can be refunded
      if (order.status === "refunded") {
        throw new Error("Order has already been refunded");
      }

      if (order.paymentStatus !== "paid") {
        throw new Error("Order has not been paid");
      }

      // For user-requested cancellations, check the 24-hour rule
      if (cancellationType === "user_requested") {
        const cancelCheck = order.canBeCancelledByCustomer();
        if (!cancelCheck.canCancel) {
          throw new Error(cancelCheck.reason || "Order cannot be cancelled");
        }
      }

      // Calculate refund amount
      const { refundAmount, nonRefundableAmount, serviceFee, vat } =
        this.calculateRefundableAmount(order, cancellationType);

      if (refundAmount <= 0) {
        throw new Error("No refundable amount");
      }

      // Process refund via Stripe if payment was made
      let refundId: string | undefined;
      if (order.paymentIntentId) {
        try {
          // Update order status to processing
          order.refundStatus = "processing";
          await order.save({ session });

          // Convert to Stripe amount (cents)
          const stripeAmount = convertToStripeAmount(
            refundAmount,
            order.currency,
          );

          const stripeRefund = await PaymentService.createRefund(
            order.paymentIntentId,
            stripeAmount,
            "requested_by_customer",
          );

          refundId = stripeRefund.id;

          // Update order with refund details
          order.status = "refunded";
          order.paymentStatus = "refunded";
          order.refundStatus = "completed";
          order.refundAmount = refundAmount;
          order.refundReason = reason;
          order.refundTransactionId = refundId;
          order.refundedAt = new Date();
          order.cancellationType = cancellationType;
          order.serviceFeeRefunded = false;

          await order.save({ session });
        } catch (stripeError: any) {
          // Mark refund as failed
          order.refundStatus = "failed";
          await order.save({ session });

          logger.error("Stripe refund failed:", stripeError);
          throw new Error(`Stripe refund failed: ${stripeError.message}`);
        }
      } else {
        // No payment intent (e.g., free order or test), just update status
        order.status = "refunded";
        order.paymentStatus = "refunded";
        order.refundStatus = "completed";
        order.refundAmount = refundAmount;
        order.refundReason = reason;
        order.refundedAt = new Date();
        order.cancellationType = cancellationType;
        order.serviceFeeRefunded = false;

        await order.save({ session });
      }

      // Get customer info for logging
      const customer = await User.findById(order.userId)
        .select("email phone firstName lastName")
        .session(session);

      // Create cancellation log
      await CancellationLog.create(
        [
          {
            orderId: order._id,
            eventId: order.items[0]?.eventId,
            userId: initiatedBy,
            customerId: order.userId,
            type: "order_cancellation",
            cancellationType,
            reason,
            originalAmount: order.total,
            refundAmount,
            serviceFee,
            vat,
            currency: order.currency,
            refundStatus: "completed",
            refundTransactionId: refundId,
            refundProcessedAt: new Date(),
            metadata: {
              orderNumber: order.orderNumber,
              customerEmail: customer?.email,
              customerPhone: customer?.phone,
              eventTitle: order.items[0]?.eventTitle,
            },
          },
        ],
        { session },
      );

      // Return seats to the event
      for (const item of order.items) {
        const event = await Event.findById(item.eventId).session(session);
        if (event) {
          const schedule = event.dateSchedule.find((s: any) => {
            const scheduleDate = s.startDate || s.date;
            return (
              scheduleDate &&
              new Date(scheduleDate).toDateString() ===
                new Date(item.scheduleDate).toDateString()
            );
          });

          if (schedule && !schedule.unlimitedSeats) {
            schedule.availableSeats += item.quantity;
            if (schedule.soldSeats !== undefined) {
              schedule.soldSeats = Math.max(
                0,
                schedule.soldSeats - item.quantity,
              );
            }
            await event.save({ session });
          }
        }
      }

      await session.commitTransaction();

      logger.info(`Refund processed successfully for order ${orderId}`, {
        refundId,
        refundAmount,
        nonRefundableAmount,
        serviceFee,
        vat,
        cancellationType,
      });

      // WhatsApp notifications (fire-and-forget, queued — refund is already
      // committed above, a notification failure must never undo it).
      if (customer?.phone) {
        if (cancellationType === "event_cancelled") {
          dispatch({
            jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
            channel: CommunicationChannel.WHATSAPP,
            category: CommunicationCategory.TRANSACTIONAL,
            templateKey: NotificationTemplateKey.EVENT_CANCELLED,
            to: customer.phone,
            vars: {
              customer_name: customer.firstName || "there",
              event_title: order.items[0]?.eventTitle || "your event",
              booking_id: order.orderNumber,
            },
            refs: { userId: order.userId.toString(), orderId: order._id.toString() },
          }).catch((err) =>
            logger.error(`WhatsApp event_cancelled dispatch failed for order ${orderId}:`, err),
          );
        }

        dispatch({
          jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
          channel: CommunicationChannel.WHATSAPP,
          category: CommunicationCategory.TRANSACTIONAL,
          templateKey: NotificationTemplateKey.REFUND_PROCESSED,
          to: customer.phone,
          vars: {
            customer_name: customer.firstName || "there",
            amount: `${order.currency} ${refundAmount}`,
            order_id: order.orderNumber,
          },
          refs: { userId: order.userId.toString(), orderId: order._id.toString() },
        }).catch((err) =>
          logger.error(`WhatsApp refund_processed dispatch failed for order ${orderId}:`, err),
        );
      }

      return {
        success: true,
        refundId,
        refundAmount,
        nonRefundableAmount,
        serviceFee,
        vat,
      };
    } catch (error: any) {
      await session.abortTransaction();
      logger.error("Refund processing failed:", error);

      return {
        success: false,
        refundAmount: 0,
        nonRefundableAmount: 0,
        serviceFee: 0,
        vat: 0,
        error: error.message,
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Process refunds for all orders of a cancelled event
   */
  static async batchProcessRefunds(
    eventId: string,
    reason: string,
    initiatedBy: mongoose.Types.ObjectId,
  ): Promise<BatchRefundResult> {
    // Find all confirmed/paid orders for this event
    const orders = await Order.find({
      "items.eventId": eventId,
      status: { $in: ["confirmed", "pending"] },
      paymentStatus: "paid",
    });

    const results: BatchRefundResult = {
      totalOrders: orders.length,
      successfulRefunds: 0,
      failedRefunds: 0,
      totalRefundAmount: 0,
      results: [],
    };

    for (const order of orders) {
      const refundResult = await this.processRefund({
        orderId: order._id.toString(),
        reason,
        initiatedBy,
        cancellationType: "event_cancelled",
      });

      results.results.push({
        orderId: order._id.toString(),
        success: refundResult.success,
        refundAmount: refundResult.refundAmount,
        error: refundResult.error,
      });

      if (refundResult.success) {
        results.successfulRefunds++;
        results.totalRefundAmount += refundResult.refundAmount;
      } else {
        results.failedRefunds++;
      }
    }

    logger.info(`Batch refund completed for event ${eventId}`, {
      totalOrders: results.totalOrders,
      successfulRefunds: results.successfulRefunds,
      failedRefunds: results.failedRefunds,
      totalRefundAmount: results.totalRefundAmount,
    });

    return results;
  }

  /**
   * Get refund status for an order
   */
  static async getRefundStatus(orderId: string): Promise<{
    status: string;
    refundAmount?: number;
    refundTransactionId?: string;
    refundedAt?: Date;
    serviceFee?: number;
  } | null> {
    const order = await Order.findById(orderId).select(
      "refundStatus refundAmount refundTransactionId refundedAt serviceFee",
    );

    if (!order) {
      return null;
    }

    return {
      status: order.refundStatus || "not_initiated",
      refundAmount: order.refundAmount,
      refundTransactionId: order.refundTransactionId,
      refundedAt: order.refundedAt,
      serviceFee: order.serviceFee,
    };
  }

  /**
   * Retry a failed refund
   */
  static async retryFailedRefund(
    cancellationLogId: string,
  ): Promise<RefundResult> {
    const log = await CancellationLog.findById(cancellationLogId);
    if (!log || log.refundStatus !== "failed") {
      return {
        success: false,
        refundAmount: 0,
        nonRefundableAmount: 0,
        serviceFee: 0,
        vat: 0,
        error: "Invalid or non-failed cancellation log",
      };
    }

    // Retry the refund
    return this.processRefund({
      orderId: log.orderId!.toString(),
      reason: log.reason,
      initiatedBy: log.userId,
      cancellationType: log.cancellationType,
    });
  }
}

export default RefundService;
