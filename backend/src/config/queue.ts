import { Queue, Worker, QueueEvents, Job } from "bullmq";
import Redis from "ioredis";
import { isRedisEnabled } from "./redis";
import logger from "./logger";

// Check if queues should be disabled
const areQueuesDisabled =
  !isRedisEnabled || process.env.DISABLE_REDIS === "true";

if (areQueuesDisabled) {
  logger.warn("Queues are disabled because Redis is not available");
}

// IMPORTANT: BullMQ Connection Sharing Strategy
// Create a separate BullMQ-specific Redis client shared across ALL queues and workers
// This is separate from the cache client because BullMQ requires maxRetriesPerRequest: null
// Result: 2 total connections (1 for cache + 1 shared for all BullMQ) instead of 8-10!

export const bullMQClient = areQueuesDisabled
  ? null
  : new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),

    // BullMQ requirements
    maxRetriesPerRequest: null, // REQUIRED by BullMQ - cannot use redisClient which has maxRetriesPerRequest: 3
    enableReadyCheck: false,
    enableOfflineQueue: false,

    // Connection optimization
    lazyConnect: false,
    enableAutoPipelining: true, // Better performance with shared connection

    // Reconnection strategy - never give up, use exponential backoff
    retryStrategy(times: number) {
      const maxDelay = 30000; // 30 seconds max delay
      const baseDelay = 1000; // Start at 1 second
      const jitter = Math.random() * 500; // Add randomness to prevent thundering herd

      // Exponential backoff: delay = baseDelay * 2^times, capped at maxDelay
      const delay = Math.min(
        baseDelay * Math.pow(2, Math.min(times, 5)) + jitter,
        maxDelay,
      );

      if (times > 50) {
        logger.error(
          `BullMQ Redis: Still reconnecting after ${times} attempts. Check Redis server status.`,
        );
      } else if (times > 10) {
        logger.warn(
          `BullMQ Redis reconnecting... Attempt ${times}, delay: ${Math.round(delay)}ms`,
        );
      } else {
        logger.info(
          `BullMQ Redis reconnecting... Attempt ${times}, delay: ${Math.round(delay)}ms`,
        );
      }

      return delay; // Keep trying indefinitely
    },

    // Connection timeout
    connectTimeout: 5000,
    keepAlive: 30000,

    // TLS for production
    tls:
      process.env.REDIS_TLS === "true"
        ? {
          rejectUnauthorized:
            process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
        }
        : undefined,
  });

// Event handlers for BullMQ client
if (bullMQClient) {
  bullMQClient.on("connect", () => {
    logger.info("BullMQ Redis: Connecting...");
  });

  bullMQClient.on("ready", () => {
    logger.info("BullMQ Redis: Connected and ready");
  });

  bullMQClient.on("error", (err) => {
    logger.error("BullMQ Redis error:", err);
  });

  bullMQClient.on("close", () => {
    logger.warn("BullMQ Redis: Connection closed");
  });

  bullMQClient.on("reconnecting", (time: number) => {
    logger.info(`BullMQ Redis: Reconnecting in ${time}ms...`);
  });

  // Check Redis eviction policy (critical for BullMQ)
  bullMQClient.on("ready", async () => {
    try {
      const result = await bullMQClient.config("GET", "maxmemory-policy");
      const policy = result[1]; // Result is ['maxmemory-policy', 'value']

      if (policy !== "noeviction") {
        logger.error(
          `CRITICAL: Redis eviction policy is "${policy}" but MUST be "noeviction" for BullMQ!\n` +
          `This can cause job data corruption and worker failures.\n` +
          `Fix: redis-cli CONFIG SET maxmemory-policy noeviction\n` +
          `See backend/REDIS_CONFIG.md for detailed instructions.`,
        );
      } else {
        logger.info("Redis eviction policy check: OK (noeviction)");
      }
    } catch (error) {
      logger.warn("Could not check Redis eviction policy:", error);
    }
  });
}

// Share the BullMQ client across all queues/workers
export const bullMQConnection = bullMQClient;

// Queue configuration (optimized for KVM1 - reduced retention for lower memory usage)
const queueConfig = {
  connection: bullMQConnection, // Use shared connection!
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // OPTIMIZED: Keep completed jobs for 1 hour only (reduced from 24h)
      count: 100, // OPTIMIZED: Keep max 100 recent jobs (reduced from 1000)
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 1 day (reduced from 7 days) for debugging
    },
  },
};

// Define queue names
export const QUEUE_NAMES = {
  QR_GENERATION: "qr-generation",
  EMAIL: "email",
  TICKET_GENERATION: "ticket-generation",
  ANALYTICS: "analytics",
  NOTIFICATIONS: "notifications",
  COLLECTION_SYNC: "collection-sync",
  PAYOUT: "payout",
  FAILED_JOBS: "failed-jobs",
  CERTIFICATE_GENERATION: "certificate-generation",
  SEAT_EXPIRY: "seat-expiry",
} as const;

// QR Code Generation Queue
export const qrQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.QR_GENERATION, queueConfig);

// Email Queue
export const emailQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.EMAIL, queueConfig);

// Ticket Generation Queue
export const ticketQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.TICKET_GENERATION, queueConfig);

// Analytics Queue
export const analyticsQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.ANALYTICS, queueConfig);

// Notifications Queue
export const notificationsQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.NOTIFICATIONS, queueConfig);

// Collection Sync Queue
export const collectionSyncQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.COLLECTION_SYNC, queueConfig);

// Payout Queue
export const payoutQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.PAYOUT, queueConfig);

// Certificate Generation Queue
export const certificateQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.CERTIFICATE_GENERATION, queueConfig);

// Dead Letter Queue — receives permanently failed jobs for visibility and manual replay
export const failedJobsQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.FAILED_JOBS, queueConfig);

// Seat Expiry Queue — sweeps abandoned pending orders and releases reserved seats
export const seatExpiryQueue = areQueuesDisabled
  ? null
  : new Queue(QUEUE_NAMES.SEAT_EXPIRY, queueConfig);

// Queue Events DISABLED to reduce Redis connections (each QueueEvents = 1 connection)
// Workers already handle logging, so these are redundant
// If monitoring is needed, re-enable selectively or use a dedicated monitoring service
// const qrQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.QR_GENERATION, { connection: redisConnection });
// const emailQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.EMAIL, { connection: redisConnection });
// const ticketQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.TICKET_GENERATION, { connection: redisConnection });

// Graceful shutdown
const gracefulShutdown = async () => {
  if (areQueuesDisabled) {
    logger.info("No queues to close (queues are disabled)");
    return;
  }

  logger.info("Closing queues...");

  const closePromises = [
    qrQueue?.close(),
    emailQueue?.close(),
    ticketQueue?.close(),
    analyticsQueue?.close(),
    notificationsQueue?.close(),
    collectionSyncQueue?.close(),
    certificateQueue?.close(),
    payoutQueue?.close(),
    failedJobsQueue?.close(),
  ].filter(Boolean);

  await Promise.all(closePromises);

  logger.info("All queues closed");
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Export utility functions
export async function getQueueStats(queueName: string) {
  if (areQueuesDisabled) {
    return null;
  }

  const queue = getQueueByName(queueName);
  if (!queue) return null;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

function getQueueByName(name: string): Queue | null {
  if (areQueuesDisabled) {
    return null;
  }

  switch (name) {
    case QUEUE_NAMES.QR_GENERATION:
      return qrQueue;
    case QUEUE_NAMES.EMAIL:
      return emailQueue;
    case QUEUE_NAMES.TICKET_GENERATION:
      return ticketQueue;
    case QUEUE_NAMES.ANALYTICS:
      return analyticsQueue;
    case QUEUE_NAMES.NOTIFICATIONS:
      return notificationsQueue;
    case QUEUE_NAMES.COLLECTION_SYNC:
      return collectionSyncQueue;
    case QUEUE_NAMES.CERTIFICATE_GENERATION:
      return certificateQueue;
    case QUEUE_NAMES.PAYOUT:
      return payoutQueue;
    case QUEUE_NAMES.FAILED_JOBS:
      return failedJobsQueue;
    default:
      return null;
  }
}

export async function getAllQueuesStats() {
  if (areQueuesDisabled) {
    return [];
  }

  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map(async (queueName) => ({
      name: queueName,
      stats: await getQueueStats(queueName),
    })),
  );

  return stats;
}

// Export flag for other modules to check queue availability
export const areQueuesEnabled = !areQueuesDisabled;
