import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, redisConnection } from '../config/queue';
import logger from '../config/logger';
import { generateQRCode, generateSecureQRData } from '../utils/qrcode';

export interface QRJobData {
  ticketNumber: string;
  eventId: string;
  userId: string;
  vendorId?: string;
  orderNumber?: string;
  validUntil?: Date;
  seatsAllocated?: number;
}

// QR Generation Worker
const qrWorker = new Worker(
  QUEUE_NAMES.QR_GENERATION,
  async (job: Job<QRJobData>) => {
    const { data } = job;

    logger.info(`Processing QR generation for ticket ${data.ticketNumber}`);

    try {
      // Generate secure QR data
      const qrData = generateSecureQRData({
        ticketNumber: data.ticketNumber,
        eventId: data.eventId,
        userId: data.userId,
        vendorId: data.vendorId,
        orderNumber: data.orderNumber,
        validUntil: data.validUntil,
        seatsAllocated: data.seatsAllocated,
      });

      // Generate QR code image
      const qrCodeImage = await generateQRCode(qrData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'high',
      });

      logger.info(`QR code generated successfully for ticket ${data.ticketNumber}`);

      return {
        success: true,
        qrCode: qrData,
        qrCodeImage,
        ticketNumber: data.ticketNumber,
      };
    } catch (error) {
      logger.error(`Failed to generate QR code for ticket ${data.ticketNumber}:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 QR codes concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // per second
    },
  }
);

// Worker event handlers
qrWorker.on('completed', (job: Job, result: any) => {
  logger.info(`QR generation completed for job ${job.id}`, {
    ticketNumber: result.ticketNumber,
    duration: Date.now() - (job.processedOn || Date.now()),
  });
});

qrWorker.on('failed', (job: Job | undefined, error: Error) => {
  logger.error(`QR generation failed for job ${job?.id}:`, {
    error: error.message,
    data: job?.data,
  });
});

qrWorker.on('error', (error: Error) => {
  logger.error('QR worker error:', error);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down QR worker...');
  await qrWorker.close();
  logger.info('QR worker shut down successfully');
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default qrWorker;
