import qrWorker from './qr.worker';
import emailWorker from './email.worker';
import logger from '../config/logger';

/**
 * Worker Process Entry Point
 * This file starts all background workers
 */

logger.info('Starting background workers...');

logger.info('QR Generation Worker: Started');
logger.info('Email Worker: Started');

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception in worker process:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection in worker process:', reason);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Gracefully shutting down workers...');

  await Promise.all([qrWorker.close(), emailWorker.close()]);

  logger.info('All workers shut down successfully');
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

logger.info('All workers initialized and running');

// Keep process alive
process.stdin.resume();
