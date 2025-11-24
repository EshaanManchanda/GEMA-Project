import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { redisClient, isRedisEnabled } from './redis';
import logger from './logger';

// Check if queues should be disabled
const areQueuesDisabled = !isRedisEnabled || process.env.DISABLE_REDIS === 'true';

if (areQueuesDisabled) {
  logger.warn('Queues are disabled because Redis is not available');
}

// Redis connection options for BullMQ with connection pooling
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_QUEUE_DB || '0', 10), // Use DB 0 (some Redis instances don't support multiple DBs)
  tls: process.env.REDIS_TLS === 'true' ? {
    // Set to false for self-signed certs, true for production with valid certs
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  } : undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  enableOfflineQueue: false,
  // Connection pooling to prevent connection exhaustion
  lazyConnect: false,
  // Reduce connection timeout for faster failure
  connectTimeout: 5000,
};

// Queue configuration (optimized for KVM1 - reduced retention for lower memory usage)
const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
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

// Queue Events DISABLED to reduce Redis connections (each QueueEvents = 1 connection)
// Workers already handle logging, so these are redundant
// If monitoring is needed, re-enable selectively or use a dedicated monitoring service
// const qrQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.QR_GENERATION, { connection: redisConnection });
// const emailQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.EMAIL, { connection: redisConnection });
// const ticketQueueEvents = areQueuesDisabled ? null : new QueueEvents(QUEUE_NAMES.TICKET_GENERATION, { connection: redisConnection });

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
