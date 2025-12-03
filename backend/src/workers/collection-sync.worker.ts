import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, bullMQConnection, areQueuesEnabled } from '../config/queue';
import logger from '../config/logger';
import { collectionSyncService } from '../services/collection-sync.service';

export interface CollectionSyncJobData {
  type: 'syncEvent' | 'removeEvent' | 'syncCollection' | 'reconcileAll';
  eventId?: string;
  collectionId?: string;
}

// Collection Sync Worker - only create if queues are enabled
const collectionSyncWorker = areQueuesEnabled ? new Worker(
  QUEUE_NAMES.COLLECTION_SYNC,
  async (job: Job<CollectionSyncJobData>) => {
    const { data } = job;

    logger.info(`Processing collection sync job ${job.id}`, {
      type: data.type,
      eventId: data.eventId,
      collectionId: data.collectionId
    });

    try {
      let result;

      switch (data.type) {
        case 'syncEvent':
          if (!data.eventId) throw new Error('eventId required for syncEvent');
          result = await collectionSyncService.syncEventToCollections(data.eventId);
          break;

        case 'removeEvent':
          if (!data.eventId) throw new Error('eventId required for removeEvent');
          result = await collectionSyncService.removeEventFromCollections(data.eventId);
          break;

        case 'syncCollection':
          if (!data.collectionId) throw new Error('collectionId required for syncCollection');
          result = await collectionSyncService.syncCollection(data.collectionId);
          break;

        case 'reconcileAll':
          result = await collectionSyncService.reconcileAll();
          break;

        default:
          throw new Error(`Unknown job type: ${data.type}`);
      }

      logger.info(`Collection sync job ${job.id} completed`, result);
      return { success: true, ...result };

    } catch (error) {
      logger.error(`Collection sync job ${job.id} failed:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection: bullMQConnection, // Use shared connection
    concurrency: 1, // Single thread to avoid race conditions
    limiter: {
      max: 10, // Max 10 jobs per minute
      duration: 60000
    }
  }
) : null;

// Worker event handlers - only attach if worker was created
if (collectionSyncWorker) {
  collectionSyncWorker.on('completed', (job: Job) => {
    logger.info(`Collection sync completed: ${job.id}`, {
      duration: Date.now() - (job.processedOn || Date.now())
    });
  });

  collectionSyncWorker.on('failed', (job: Job | undefined, error: Error) => {
    logger.error(`Collection sync failed: ${job?.id}`, {
      error: error.message,
      type: job?.data?.type
    });
  });

  collectionSyncWorker.on('error', (error: Error) => {
    // Distinguish connection errors from job processing errors
    const errorMessage = error.message || '';

    if (errorMessage.includes('isn\'t writeable') ||
        errorMessage.includes('enableOfflineQueue') ||
        errorMessage.includes('Connection is closed') ||
        errorMessage.includes('ECONNREFUSED')) {
      logger.warn('Collection sync worker: Redis connection issue detected, waiting for reconnection...', {
        error: errorMessage
      });
      // Don't exit - let retry strategy handle reconnection
    } else {
      logger.error('Collection sync worker error:', error);
    }
  });
}

// Graceful shutdown
const gracefulShutdown = async () => {
  if (collectionSyncWorker) {
    logger.info('Shutting down collection sync worker...');
    await collectionSyncWorker.close();
    logger.info('Collection sync worker shut down');
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default collectionSyncWorker;
