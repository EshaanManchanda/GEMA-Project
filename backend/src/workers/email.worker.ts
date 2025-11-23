import { Worker, Job, Queue } from 'bullmq';
import { QUEUE_NAMES, redisConnection, emailQueue as configEmailQueue } from '../config/queue';
import logger from '../config/logger';
import { emailService } from '../services/email.service';

// Re-export the email queue for use by other modules
export const emailQueue = configEmailQueue;

export interface EmailJobData {
  type: 'verification' | 'passwordReset' | 'orderConfirmation' | 'ticket' | 'generic' |
        'cancellationConfirmation' | 'eventCancellation' | 'refundProcessed' | 'refundFailed';
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

// Email Worker
const emailWorker = new Worker(
  QUEUE_NAMES.EMAIL,
  async (job: Job<EmailJobData>) => {
    const { data } = job;

    logger.info(`Processing email job ${job.id}`, {
      type: data.type,
      to: Array.isArray(data.to) ? data.to.length + ' recipients' : data.to,
    });

    try {
      let result;

      switch (data.type) {
        case 'verification':
          result = await emailService.sendVerificationEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            otp: data.templateData.otp,
          });
          break;

        case 'passwordReset':
          result = await emailService.sendPasswordResetEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            resetOTP: data.templateData.resetOTP,
          });
          break;

        case 'orderConfirmation':
          result = await emailService.sendOrderConfirmationEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            orderNumber: data.templateData.orderNumber,
            orderTotal: data.templateData.orderTotal,
            currency: data.templateData.currency,
            items: data.templateData.items,
          });
          break;

        case 'ticket':
          result = await emailService.sendTicketsEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            tickets: data.templateData.tickets,
          });
          break;

        case 'cancellationConfirmation':
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

        case 'eventCancellation':
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

        case 'refundProcessed':
          result = await emailService.sendRefundProcessedEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            orderNumber: data.templateData.orderNumber,
            refundAmount: data.templateData.refundAmount,
            currency: data.templateData.currency,
            refundTransactionId: data.templateData.refundTransactionId,
          });
          break;

        case 'refundFailed':
          result = await emailService.sendRefundFailedEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            orderNumber: data.templateData.orderNumber,
            refundAmount: data.templateData.refundAmount,
            currency: data.templateData.currency,
          });
          break;

        case 'generic':
        default:
          result = await emailService.sendEmail({
            to: data.to,
            subject: data.subject || 'Notification',
            html: data.html,
            text: data.text,
            attachments: data.attachments,
          });
          break;
      }

      logger.info(`Email sent successfully for job ${job.id}`);

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
    connection: redisConnection,
    concurrency: 2, // OPTIMIZED for KVM1 single core: reduced from 5 to 2
    limiter: {
      max: 30, // Reduced from 50 for single core (respects email provider limits)
      duration: 60000, // per minute
    },
  }
);

// Worker event handlers
emailWorker.on('completed', (job: Job, result: any) => {
  logger.info(`Email sent for job ${job.id}`, {
    type: result.type,
    messageId: result.messageId,
    duration: Date.now() - (job.processedOn || Date.now()),
  });
});

emailWorker.on('failed', (job: Job | undefined, error: Error) => {
  logger.error(`Email failed for job ${job?.id}:`, {
    error: error.message,
    type: job?.data?.type,
    to: job?.data?.to,
  });
});

emailWorker.on('error', (error: Error) => {
  logger.error('Email worker error:', error);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down email worker...');
  await emailWorker.close();
  logger.info('Email worker shut down successfully');
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default emailWorker;
