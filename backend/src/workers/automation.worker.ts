import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  automationQueue,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
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
  const frontendUrl = process.env.FRONTEND_URL || "https://kidrove.com";

  for (const event of events) {
    const orders = await Order.find({
      "items.eventId": event._id,
      status: "confirmed",
    })
      .select("_id userId")
      .lean();

    if (orders.length === 0) continue;

    const users = await User.find({
      _id: { $in: orders.map((o) => o.userId) },
    })
      .select("firstName phone")
      .lean();
    const usersById = new Map(users.map((u) => [u._id.toString(), u]));

    for (const order of orders) {
      const user = usersById.get(order.userId.toString());
      if (!user?.phone) continue;

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

interface ReminderWindowConfig {
  hoursBefore: number;
  templateKey: NotificationTemplateKey;
  jobName: string;
}

const REMINDER_WINDOWS: ReminderWindowConfig[] = [
  {
    hoursBefore: 24,
    templateKey: NotificationTemplateKey.EVENT_REMINDER_24H,
    jobName: "event-reminder-24h-sweep",
  },
  {
    hoursBefore: 2,
    templateKey: NotificationTemplateKey.EVENT_REMINDER_2H,
    jobName: "event-reminder-2h-sweep",
  },
];
// Sweep runs every 15 min; a ±20 min window around the exact target time
// guarantees every schedule is caught by at least one run even with sweep
// jitter, while dispatch()'s idempotencyKey (per order+event+templateKey)
// is what actually prevents a duplicate send across the overlap.
const REMINDER_WINDOW_HALF_WIDTH_MS = 20 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Finds events with a schedule starting ~24h or ~2h from now and sends a
 * one-time WhatsApp reminder to every customer with a confirmed order for
 * that specific schedule date. Two windows share this implementation since
 * they're structurally identical — only the lookahead and template differ.
 */
async function processEventReminderSweep(
  { hoursBefore, templateKey }: ReminderWindowConfig,
  _job: Job,
): Promise<{ sent: number }> {
  const now = new Date();
  const target = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
  const windowStart = new Date(
    target.getTime() - REMINDER_WINDOW_HALF_WIDTH_MS,
  );
  const windowEnd = new Date(target.getTime() + REMINDER_WINDOW_HALF_WIDTH_MS);

  const events = await Event.find({
    status: "published",
    $or: [
      { "dateSchedule.startDate": { $gte: windowStart, $lte: windowEnd } },
      { "dateSchedule.date": { $gte: windowStart, $lte: windowEnd } },
    ],
  })
    .select("_id title venueType meetingLink location dateSchedule")
    .lean();

  if (events.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;

  for (const event of events as any[]) {
    const matchingSchedules = (event.dateSchedule || []).filter((s: any) => {
      const scheduleDate = s.startDate || s.date;
      if (!scheduleDate) return false;
      const t = new Date(scheduleDate).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });
    if (matchingSchedules.length === 0) continue;

    const locationOrLink =
      event.venueType === "Online"
        ? event.meetingLink || "Online event — link in your ticket"
        : event.location?.address ||
          event.location?.city ||
          "See your ticket for details";

    for (const schedule of matchingSchedules) {
      const scheduleDate = new Date(schedule.startDate || schedule.date);
      const dayStart = startOfDay(scheduleDate);
      const dayEnd = endOfDay(scheduleDate);

      const orders = await Order.find({
        "items.eventId": event._id,
        status: "confirmed",
        "items.scheduleDate": { $gte: dayStart, $lte: dayEnd },
      })
        .select("_id userId")
        .lean();

      if (orders.length === 0) continue;

      const users = await User.find({
        _id: { $in: orders.map((o) => o.userId) },
      })
        .select("firstName phone")
        .lean();
      const usersById = new Map(users.map((u) => [u._id.toString(), u]));

      for (const order of orders) {
        const user = usersById.get(order.userId.toString());
        if (!user?.phone) continue;

        try {
          await dispatch({
            jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
            channel: CommunicationChannel.WHATSAPP,
            category: CommunicationCategory.TRANSACTIONAL,
            templateKey,
            to: user.phone,
            vars: {
              customer_name: user.firstName || "there",
              event_title: event.title,
              event_date: formatEventDate(scheduleDate),
              event_time: schedule.startTime || "TBD",
              location_or_link: locationOrLink,
            },
            refs: {
              userId: order.userId.toString(),
              eventId: event._id.toString(),
            },
            idempotencyKey: `${templateKey}:${order._id.toString()}:${event._id.toString()}:${dayStart.toISOString().slice(0, 10)}`,
          });
          sent += 1;
        } catch (error) {
          logger.error(
            `automation: ${templateKey} dispatch failed for order ${order._id}`,
            error,
          );
        }
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
          case "event-reminder-24h-sweep":
            return processEventReminderSweep(REMINDER_WINDOWS[0], job);
          case "event-reminder-2h-sweep":
            return processEventReminderSweep(REMINDER_WINDOWS[1], job);
          default:
            logger.warn(`automation: unknown job name ${job.name}`);
            return { sent: 0 };
        }
      },
      {
        connection: bullMQConnection,
        concurrency: WORKER_TUNING.AUTOMATION.CONCURRENCY,
      },
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
        repeat: {
          every: WORKER_TUNING.AUTOMATION.REVIEW_REQUEST_SWEEP_INTERVAL_MS,
        },
      },
    )
    .catch((err) =>
      logger.error("automation: failed to schedule review-request sweep", err),
    );

  for (const { jobName } of REMINDER_WINDOWS) {
    automationQueue
      .add(
        jobName,
        {},
        {
          jobId: `${jobName}-recurring`,
          repeat: {
            every: WORKER_TUNING.AUTOMATION.REMINDER_SWEEP_INTERVAL_MS,
          },
        },
      )
      .catch((err) =>
        logger.error(`automation: failed to schedule ${jobName}`, err),
      );
  }
}

// Shutdown is owned by workers/index.ts, which closes every worker once.

export default automationWorker;
