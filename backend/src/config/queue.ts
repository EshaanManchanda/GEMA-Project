import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { redisClient, isRedisEnabled } from './redis';
import logger from './logger';

// Check if queues should be disabled
const areQueuesDisabled = !isRedisEnabled || process.env.DISABLE_REDIS === 'true';

if (areQueuesDisabled) {
  logger.warn('Queues are disabled because Redis is not available');
}

// Redis connection options for BullMQ
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10), // Use separate DB for queues
  tls: process.env.REDIS_TLS === 'true' ? {
    // Set to false for self-signed certs, true for production with valid certs
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  } : undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  enableOfflineQueue: false,
};

// Queue configuration
const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Define queue names
export const QUEUE_NAMES = {
  QR_GENERATION: 'qr-generation',
  EMAIL: 'email',
  TICKET_GENERATION: 'ticket-generation',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

// QR Code Generation Queue
export const qrQueue = areQueuesDisabled ? null : new Queue(QUEUE_NAMES.QR_GENERATION, queueConfig);

// Email Queue
export const emailQueue = areQueuesDisabled ? null : new Queue(QUEUE_NAMES.EMAIL, queueConfig);

// Ticket Generation Queue
export const ticketQueue = areQueuesDisabled ? null : new Queue(QUEUE_NAMES.TICKET_GENERATION, queueConfig);

// Analytics Queue
export const analyticsQueue = areQueuesDisabled ? null : new Queue(QUEUE_NAMES.ANALYTICS, queueConfig);

// Notifications Queue
export const notificationsQueue = areQueuesDisabled ? null : new Queue(QUEUE_NAMES.NOTIFICATIONS, queueConfig);

// Queue Events for monitoring (only if queues are enabled)
const qrQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.QR_GENERATION, { connection: redisConnection });
const emailQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.EMAIL, { connection: redisConnection });
const ticketQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.TICKET_GENERATION, { connection: redisConnection });

// Event listeners for monitoring (only if queue events are enabled)
if (qrQueueEvents) {
  qrQueueEvents.on('completed', ({ jobId }) => {
    logger.info(`QR generation job ${jobId} completed`);
  });

  qrQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`QR generation job ${jobId} failed: ${failedReason}`);
  });
}

if (emailQueueEvents) {
  emailQueueEvents.on('completed', ({ jobId }) => {
    logger.info(`Email job ${jobId} completed`);
  });

  emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Email job ${jobId} failed: ${failedReason}`);
  });
}

if (ticketQueueEvents) {
  ticketQueueEvents.on('completed', ({ jobId }) => {
    logger.info(`Ticket generation job ${jobId} completed`);
  });

  ticketQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Ticket generation job ${jobId} failed: ${failedReason}`);
  });
}

// Graceful shutdown
const gracefulShutdown = async () => {
  if (areQueuesDisabled) {
    logger.info('No queues to close (queues are disabled)');
    return;
  }

  logger.info('Closing queues...');

  const closePromises = [
    qrQueue?.close(),
    emailQueue?.close(),
    ticketQueue?.close(),
    analyticsQueue?.close(),
    notificationsQueue?.close(),
    qrQueueEvents?.close(),
    emailQueueEvents?.close(),
    ticketQueueEvents?.close(),
  ].filter(Boolean);

  await Promise.all(closePromises);

  logger.info('All queues closed');
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

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
    }))
  );

  return stats;
}

// Export flag for other modules to check queue availability
export const areQueuesEnabled = !areQueuesDisabled;
