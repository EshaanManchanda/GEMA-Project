import { Worker, Job } from "bullmq";
import mongoose from "mongoose";
import {
  QUEUE_NAMES,
  bullMQConnection,
  QUEUE_PREFIX,
  seatExpiryQueue,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
import logger from "../config/logger";
import Order from "../models/Order";
import Event from "../models/Event";
import { stripe } from "../config/stripe";
import { PaymentService } from "../services/payment.service";

// Seat hold TTL must match booking.controller.ts SEAT_HOLD_TTL (15 min)
const SEAT_HOLD_TTL_MS = 15 * 60 * 1000;

/**
 * True when the order must NOT be released: its Stripe intent succeeded (the
 * order is then marked paid via the webhook handler), is still in flight, or
 * Stripe couldn't be asked. Orders with no real intent are released as before.
 */
export const paidOrUnknown = async (order: { _id: unknown; paymentIntentId?: string }): Promise<boolean> => {
  const piId = order.paymentIntentId;
  if (!piId || !piId.startsWith("pi_")) return false;
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(piId);
  } catch (err: any) {
    // Intent not on the platform account (e.g. vendor's own Stripe keys): nothing to reconcile.
    if (err?.code === "resource_missing") return false;
    logger.warn(`seat-expiry: Stripe lookup failed for order ${order._id}, retrying next sweep`, { message: err?.message });
    return true;
  }
  if (intent.status === "processing" || intent.status === "requires_capture") return true;
  if (intent.status !== "succeeded") return false;

  logger.error(`seat-expiry: order ${order._id} was paid but still pending — reconciling (missed webhook?)`);
  await PaymentService.handlePaymentSucceeded(intent);
  return true;
};

/**
 * Release reserved seats for pending orders that have exceeded the seat hold TTL.
 * Called on a repeating schedule (every 5 min) so abandoned checkouts never
 * permanently block capacity.
 */
const processSeatExpiry = async (_job: Job) => {
  const cutoff = new Date(Date.now() - SEAT_HOLD_TTL_MS);

  // Find pending orders created before the cutoff that still hold reserved seats
  const expiredOrders = await Order.find({
    status: "pending",
    paymentStatus: "pending",
    createdAt: { $lt: cutoff },
  }).lean();

  if (expiredOrders.length === 0) {
    logger.debug("seat-expiry: no expired reservations found");
    return { released: 0 };
  }

  logger.info(
    `seat-expiry: releasing seats for ${expiredOrders.length} expired orders`,
  );

  let released = 0;
  for (const order of expiredOrders) {
    // Never cancel an order the customer actually paid for. If both the client
    // confirm and the webhook were missed, reconcile it here instead.
    if (await paidOrUnknown(order)) continue;

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();
    try {
      for (const item of order.items) {
        if (!item.scheduleId || !item.eventId) continue;

        // Atomically release reserved seats back to available
        await Event.findOneAndUpdate(
          {
            _id: item.eventId,
            "dateSchedule._id": item.scheduleId,
          },
          {
            $inc: {
              "dateSchedule.$.availableSeats": item.quantity,
              "dateSchedule.$.reservedSeats": -item.quantity,
            },
          },
          { session: mongoSession },
        );
      }

      // Mark order cancelled so it won't be picked up again
      await Order.updateOne(
        { _id: order._id },
        { status: "cancelled", paymentStatus: "failed" },
        { session: mongoSession },
      );

      await mongoSession.commitTransaction();
      released++;
    } catch (err) {
      await mongoSession.abortTransaction();
      logger.error(
        `seat-expiry: failed to release seats for order ${order._id}`,
        err,
      );
    } finally {
      mongoSession.endSession();
    }
  }

  logger.info(
    `seat-expiry: released ${released}/${expiredOrders.length} orders`,
  );
  return { released };
};

const seatExpiryWorker = areQueuesEnabled
  ? new Worker(QUEUE_NAMES.SEAT_EXPIRY, processSeatExpiry, {
      prefix: QUEUE_PREFIX, connection: bullMQConnection!,
      concurrency: WORKER_TUNING.SEAT_EXPIRY.CONCURRENCY,
    })
  : null;

if (seatExpiryWorker) {
  seatExpiryWorker.on("completed", (job, result) => {
    logger.debug(`seat-expiry job ${job.id} completed`, result);
  });
  seatExpiryWorker.on("failed", (job, err) => {
    logger.error(`seat-expiry job ${job?.id} failed`, err);
  });
}

// Schedule the repeating sweep job once (idempotent — BullMQ deduplicates by jobId)
if (seatExpiryQueue) {
  seatExpiryQueue
    .add(
      "sweep",
      {},
      {
        jobId: "seat-expiry-recurring",
        repeat: { every: WORKER_TUNING.SEAT_EXPIRY.SWEEP_INTERVAL_MS },
      },
    )
    .catch((err) =>
      logger.error("seat-expiry: failed to schedule sweep job", err),
    );
}

export default seatExpiryWorker;
