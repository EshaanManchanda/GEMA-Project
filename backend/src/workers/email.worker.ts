import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, redisConnection } from '../config/queue';
import logger from '../config/logger';
import { EmailService } from '../services/email.service';

export interface EmailJobData {
  type: 'verification' | 'passwordReset' | 'orderConfirmation' | 'ticket' | 'generic';
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
          result = await EmailService.sendVerificationEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            otp: data.templateData.otp,
          });
          break;

        case 'passwordReset':
          result = await EmailService.sendPasswordResetEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            resetToken: data.templateData.resetToken,
          });
          break;

        case 'orderConfirmation':
          result = await EmailService.sendOrderConfirmationEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            orderNumber: data.templateData.orderNumber,
            orderTotal: data.templateData.orderTotal,
            currency: data.templateData.currency,
            items: data.templateData.items,
          });
          break;

        case 'ticket':
          result = await EmailService.sendTicketEmail({
            to: data.to as string,
            firstName: data.templateData.firstName,
            tickets: data.templateData.tickets,
          });
          break;

        case 'generic':
        default:
          result = await EmailService.sendEmail({
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
    concurrency: 5, // Process 5 emails concurrently (be careful with email provider limits)
    limiter: {
      max: 50, // Max 50 emails
      duration: 60000, // per minute (respect email provider limits)
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
