import cron from 'node-cron';
import { collectionSyncQueue, areQueuesEnabled } from '../config/queue';
import logger from '../config/logger';

/**
 * Collection reconciliation cron job
 * Runs daily at 3 AM UTC to ensure all collections are in sync
 */
export function startCollectionReconciliationCron() {
  if (!areQueuesEnabled || !collectionSyncQueue) {
    logger.warn('Collection reconciliation cron disabled (queues not available)');
    return null;
  }

  // Run daily at 3 AM UTC
  const job = cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Starting scheduled collection reconciliation');

      await collectionSyncQueue.add(
        'reconcileAll',
        { type: 'reconcileAll' },
        {
          jobId: `reconcile-all-${Date.now()}`,
          removeOnComplete: true,
          attempts: 2, // Reduced from 3 to 2 (reconciliation is idempotent)
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute initial delay
          },
        }
      );

      logger.info('Queued collection reconciliation job');

    } catch (error) {
      logger.error('Error scheduling collection reconciliation:', error);
    }
  }, {
    timezone: 'UTC'
  });

  logger.info('Collection reconciliation cron started (daily at 3 AM UTC)');
  return job;
}
