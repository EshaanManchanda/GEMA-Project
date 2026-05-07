import { Worker, Job, Queue } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  emailQueue as configEmailQueue,
  areQueuesEnabled,
} from "../config/queue";
import logger from "../config/logger";
import { emailService } from "../services/email.service";
import { emailRateLimiter } from "../utils/email-rate-limiter";

// Re-export the email queue for use by other modules
export const emailQueue = configEmailQueue;

export interface EmailJobData {
  type:
    | "verification"
    | "passwordReset"
    | "orderConfirmation"
    | "ticket"
    | "generic"
    | "cancellationConfirmation"
    | "eventCancellation"
    | "refundProcessed"
    | "refundFailed";
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  // Type-specific data
  templateData?: any;
}

// Email Worker - only create if queues are enabled
const emailWorker = areQueuesEnabled
  ? new Worker(
      QUEUE_NAMES.EMAIL,
      async (job: Job<EmailJobData>) => {
        const { data } = job;

        logger.info(`Processing email job ${job.id}`, {
          type: data.type,
          to: Array.isArray(data.to) ? data.to.length + " recipients" : data.to,
        });

        try {
          // Check rate limit before sending
          const rateLimitCheck = await emailRateLimiter.checkLimit();

          if (!rateLimitCheck.allowed) {
            logger.warn(`Email rate limit exceeded for job ${job.id}`, {
              remaining: rateLimitCheck.remaining,
              retryAfter: rateLimitCheck.retryAfter,
            });

            // Delay job and retry (BullMQ will automatically retry)
            throw new Error(
              `Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}ms`,
            );
          }

          let result;

          switch (data.type) {
            case "verification":
              result = await emailService.sendVerificationEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                otp: data.templateData.otp,
              });
              break;

            case "passwordReset":
              result = await emailService.sendPasswordResetEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                resetOTP: data.templateData.resetOTP,
              });
              break;

            case "orderConfirmation":
              result = await emailService.sendOrderConfirmationEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                orderNumber: data.templateData.orderNumber,
                orderTotal: data.templateData.orderTotal,
                currency: data.templateData.currency,
                items: data.templateData.items,
              });
              break;

            case "ticket":
              result = await emailService.sendTicketsEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                tickets: data.templateData.tickets,
              });
              break;

            case "cancellationConfirmation":
              result = await emailService.sendCancellationConfirmationEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                orderNumber: data.templateData.orderNumber,
                refundAmount: data.templateData.refundAmount,
                nonRefundableAmount: data.templateData.nonRefundableAmount,
                serviceFee: data.templateData.serviceFee,
                tax: data.templateData.tax,
                currency: data.templateData.currency,
                reason: data.templateData.reason,
              });
              break;

            case "eventCancellation":
              result = await emailService.sendEventCancellationEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                eventTitle: data.templateData.eventTitle,
                eventDate: data.templateData.eventDate,
                orderNumber: data.templateData.orderNumber,
                reason: data.templateData.reason,
                refundAmount: data.templateData.refundAmount,
                nonRefundableAmount: data.templateData.nonRefundableAmount,
                currency: data.templateData.currency,
                serviceFee: data.templateData.serviceFee,
                tax: data.templateData.tax,
              });
              break;

            case "refundProcessed":
              result = await emailService.sendRefundProcessedEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                orderNumber: data.templateData.orderNumber,
                refundAmount: data.templateData.refundAmount,
                currency: data.templateData.currency,
                refundTransactionId: data.templateData.refundTransactionId,
              });
              break;

            case "refundFailed":
              result = await emailService.sendRefundFailedEmail({
                to: data.to as string,
                firstName: data.templateData.firstName,
                orderNumber: data.templateData.orderNumber,
                refundAmount: data.templateData.refundAmount,
                currency: data.templateData.currency,
              });
              break;

            case "generic":
            default:
              result = await emailService.sendEmail({
                to: data.to,
                subject: data.subject || "Notification",
                html: data.html,
                text: data.text,
                attachments: data.attachments,
              });
              break;
          }

          logger.info(`Email sent successfully for job ${job.id}`);

          // Consume rate limit token after successful send
          await emailRateLimiter.consume();

          // Log current rate limit status periodically (every 10th email)
          if (job.id && parseInt(job.id) % 10 === 0) {
            const status = await emailRateLimiter.getStatus();
            logger.debug("Email rate limit status", {
              current: status.current,
              remaining: status.remaining,
            });
          }

          return {
            success: true,
            messageId: result,
            type: data.type,
          };
        } catch (error) {
          logger.error(`Failed to send email for job ${job.id}:`, error);
          throw error; // Will trigger retry
        }
      },
      {
        connection: bullMQConnection, // Use shared connection
        concurrency: 2, // OPTIMIZED for KVM1 single core: reduced from 5 to 2
        limiter: {
          max: 30, // Reduced from 50 for single core (respects email provider limits)
          duration: 60000, // per minute
        },
      },
    )
  : null;

// Worker event handlers - only attach if worker was created
if (emailWorker) {
  emailWorker.on("completed", (job: Job, result: any) => {
    logger.info(`Email sent for job ${job.id}`, {
      type: result.type,
      messageId: result.messageId,
      duration: Date.now() - (job.processedOn || Date.now()),
    });
  });

  emailWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Email failed for job ${job?.id}:`, {
      error: error.message,
      type: job?.data?.type,
      to: job?.data?.to,
    });
  });

  emailWorker.on("error", (error: Error) => {
    // Distinguish connection errors from job processing errors
    const errorMessage = error.message || "";

    if (
      errorMessage.includes("isn't writeable") ||
      errorMessage.includes("enableOfflineQueue") ||
      errorMessage.includes("Connection is closed") ||
      errorMessage.includes("ECONNREFUSED")
    ) {
      logger.warn(
        "Email worker: Redis connection issue detected, waiting for reconnection...",
        {
          error: errorMessage,
        },
      );
      // Don't exit - let retry strategy handle reconnection
    } else {
      logger.error("Email worker error:", error);
    }
  });
}

// Graceful shutdown
const gracefulShutdown = async () => {
  if (emailWorker) {
    logger.info("Shutting down email worker...");
    await emailWorker.close();
    logger.info("Email worker shut down successfully");
  } else {
    logger.info("Email worker was not initialized (Redis disabled)");
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default emailWorker;
