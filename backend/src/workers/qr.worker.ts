import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  areQueuesEnabled,
} from "../config/queue";
import logger from "../config/logger";
import { generateQRCode, generateSecureQRData } from "../utils/qrcode";

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
        concurrency: 2, // OPTIMIZED for KVM1 single core: reduced from 10 to 2
        limiter: {
          max: 50, // Reduced from 100 for single core
          duration: 1000, // per second
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
    const errorMessage = error.message || "";

    if (
      errorMessage.includes("isn't writeable") ||
      errorMessage.includes("enableOfflineQueue") ||
      errorMessage.includes("Connection is closed") ||
      errorMessage.includes("ECONNREFUSED")
    ) {
      logger.warn(
        "QR worker: Redis connection issue detected, waiting for reconnection...",
        {
          error: errorMessage,
        },
      );
      // Don't exit - let retry strategy handle reconnection
    } else {
      logger.error("QR worker error:", error);
    }
  });
}

// Graceful shutdown
const gracefulShutdown = async () => {
  if (qrWorker) {
    logger.info("Shutting down QR worker...");
    await qrWorker.close();
    logger.info("QR worker shut down successfully");
  } else {
    logger.info("QR worker was not initialized (Redis disabled)");
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default qrWorker;
