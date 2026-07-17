import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
import logger from "../config/logger";
import { generateQRCode, generateSecureQRData } from "../utils/qrcode";
import { isRedisConnectionError } from "../utils/redisError.util";

export interface QRJobData {
  ticketNumber: string;
  eventId: string;
  userId: string;
  vendorId?: string;
  orderNumber?: string;
  validUntil?: Date;
  seatsAllocated?: number;
}

// QR Generation Worker - only create if queues are enabled
const qrWorker = areQueuesEnabled
  ? new Worker(
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
            errorCorrectionLevel: "high",
          });

          logger.info(
            `QR code generated successfully for ticket ${data.ticketNumber}`,
          );

          return {
            success: true,
            qrCode: qrData,
            qrCodeImage,
            ticketNumber: data.ticketNumber,
          };
        } catch (error) {
          logger.error(
            `Failed to generate QR code for ticket ${data.ticketNumber}:`,
            error,
          );
          throw error; // Will trigger retry
        }
      },
      {
        connection: bullMQConnection, // Use shared connection
        concurrency: WORKER_TUNING.QR_GENERATION.CONCURRENCY,
        limiter: {
          max: WORKER_TUNING.QR_GENERATION.RATE_LIMIT_MAX,
          duration: WORKER_TUNING.QR_GENERATION.RATE_LIMIT_DURATION_MS,
        },
      },
    )
  : null;

// Worker event handlers - only attach if worker was created
if (qrWorker) {
  qrWorker.on("completed", (job: Job, result: any) => {
    logger.info(`QR generation completed for job ${job.id}`, {
      ticketNumber: result.ticketNumber,
      duration: Date.now() - (job.processedOn || Date.now()),
    });
  });

  qrWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`QR generation failed for job ${job?.id}:`, {
      error: error.message,
      data: job?.data,
    });
  });

  qrWorker.on("error", (error: Error) => {
    // Distinguish connection errors from job processing errors
    if (isRedisConnectionError(error)) {
      logger.warn(
        "QR worker: Redis connection issue detected, waiting for reconnection...",
        { error: error.message },
      );
      // Don't exit - let retry strategy handle reconnection
    } else {
      logger.error("QR worker error:", error);
    }
  });
}

// Shutdown is owned by workers/index.ts, which closes every worker once.

export default qrWorker;
