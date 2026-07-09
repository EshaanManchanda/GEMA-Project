import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  automationQueue,
  areQueuesEnabled,
} from "../config/queue";
import logger from "../config/logger";
import Event from "../models/Event";
import Order from "../models/Order";
import User from "../models/User";
import {
  dispatch,
  CommunicationJobType,
} from "../services/communication/communication.service";
import {
  CommunicationChannel,
  CommunicationCategory,
  NotificationTemplateKey,
} from "../models/index";

const REVIEW_WINDOW_START_HOURS = 48; // events that ended up to 48h ago
const REVIEW_WINDOW_END_HOURS = 12; // ...but at least 12h ago (give the event time to actually finish)

/**
 * Finds events whose schedule ended 12-48h ago, and sends a one-time
 * "leave a review" WhatsApp message to every customer with a confirmed
 * order for that event. Sweep runs every 6h; the window overlaps between
 * runs on purpose — dispatch()'s idempotencyKey (per orderId+eventId) is
 * what actually prevents duplicate sends, not the window boundaries.
 */
async function processReviewRequestSweep(_job: Job): Promise<{ sent: number }> {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - REVIEW_WINDOW_START_HOURS * 60 * 60 * 1000,
  );
  const windowEnd = new Date(
    now.getTime() - REVIEW_WINDOW_END_HOURS * 60 * 60 * 1000,
  );

  const events = await Event.find({
    status: "published",
    "dateSchedule.endDate": { $gte: windowStart, $lte: windowEnd },
  })
    .select("_id title dateSchedule")
    .lean();

  if (events.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;
  for (const event of events) {
    const orders = await Order.find({
      "items.eventId": event._id,
      status: "confirmed",
    })
      .select("_id userId")
      .lean();

    for (const order of orders) {
      const user = await User.findById(order.userId)
        .select("firstName phone")
        .lean();
      if (!user?.phone) continue;

      const frontendUrl = process.env.FRONTEND_URL || "https://kidrove.com";

      try {
        await dispatch({
          jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
          channel: CommunicationChannel.WHATSAPP,
          category: CommunicationCategory.TRANSACTIONAL,
          templateKey: NotificationTemplateKey.EVENT_REVIEW_REQUEST,
          to: user.phone,
          vars: {
            customer_name: user.firstName || "there",
            event_title: event.title,
            review_link: `${frontendUrl}/events/${event._id}/review`,
          },
          refs: {
            userId: order.userId.toString(),
            eventId: event._id.toString(),
          },
          idempotencyKey: `review_request:${order._id.toString()}:${event._id.toString()}`,
        });
        sent += 1;
      } catch (error) {
        logger.error(
          `automation: review-request dispatch failed for order ${order._id}`,
          error,
        );
      }
    }
  }

  return { sent };
}

const automationWorker = areQueuesEnabled
  ? new Worker(
      QUEUE_NAMES.AUTOMATION,
      async (job: Job) => {
        switch (job.name) {
          case "review-request-sweep":
            return processReviewRequestSweep(job);
          default:
            logger.warn(`automation: unknown job name ${job.name}`);
            return { sent: 0 };
        }
      },
      { connection: bullMQConnection, concurrency: 1 },
    )
  : null;

if (automationWorker) {
  automationWorker.on("completed", (job, result) => {
    logger.info(`automation job ${job.id} (${job.name}) completed`, result);
  });
  automationWorker.on("failed", (job, err) => {
    logger.error(`automation job ${job?.id} (${job?.name}) failed`, err);
  });
}

// Schedule the repeating sweep once (idempotent — BullMQ deduplicates by jobId)
if (automationQueue) {
  automationQueue
    .add(
      "review-request-sweep",
      {},
      {
        jobId: "review-request-sweep-recurring",
        repeat: { every: 6 * 60 * 60 * 1000 }, // every 6 hours
      },
    )
    .catch((err) =>
      logger.error("automation: failed to schedule review-request sweep", err),
    );
}

const gracefulShutdown = async () => {
  if (automationWorker) {
    logger.info("Shutting down automation worker...");
    await automationWorker.close();
    logger.info("Automation worker shut down successfully");
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default automationWorker;
