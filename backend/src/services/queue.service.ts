import { qrQueue, emailQueue, ticketQueue } from '../config/queue';
import { QRJobData } from '../workers/qr.worker';
import { EmailJobData } from '../workers/email.worker';
import logger from '../config/logger';

/**
 * Queue Service
 * Helper functions to add jobs to various queues
 */

export class QueueService {
  /**
   * Add QR generation job to queue
   */
  static async addQRGenerationJob(data: QRJobData, options?: any) {
    try {
      const job = await qrQueue.add('generate-qr', data, {
        ...options,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.info(`QR generation job added: ${job.id}`, {
        ticketNumber: data.ticketNumber,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add QR generation job:', error);
      throw error;
    }
  }

  /**
   * Add email job to queue
   */
  static async addEmailJob(data: EmailJobData, options?: any) {
    try {
      const job = await emailQueue.add(`send-${data.type}`, data, {
        ...options,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      });

      logger.info(`Email job added: ${job.id}`, {
        type: data.type,
        to: Array.isArray(data.to) ? `${data.to.length} recipients` : data.to,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add email job:', error);
      throw error;
    }
  }

  /**
   * Send verification email (async via queue)
   */
  static async sendVerificationEmail(to: string, firstName: string, otp: string) {
    return this.addEmailJob({
      type: 'verification',
      to,
      templateData: { firstName, otp },
    });
  }

  /**
   * Send password reset email (async via queue)
   */
  static async sendPasswordResetEmail(to: string, firstName: string, resetToken: string) {
    return this.addEmailJob({
      type: 'passwordReset',
      to,
      templateData: { firstName, resetToken },
    });
  }

  /**
   * Send order confirmation email (async via queue)
   */
  static async sendOrderConfirmationEmail(data: {
    to: string;
    firstName: string;
    orderNumber: string;
    orderTotal: number;
    currency: string;
    items: any[];
  }) {
    return this.addEmailJob({
      type: 'orderConfirmation',
      to: data.to,
      templateData: data,
    });
  }

  /**
   * Send ticket email with QR codes (async via queue)
   */
  static async sendTicketEmail(data: {
    to: string;
    firstName: string;
    tickets: any[];
  }) {
    return this.addEmailJob({
      type: 'ticket',
      to: data.to,
      templateData: data,
    });
  }

  /**
   * Generate QR code for ticket (async via queue)
   */
  static async generateTicketQR(data: QRJobData) {
    return this.addQRGenerationJob(data);
  }

  /**
   * Get job status
   */
  static async getJobStatus(queue: any, jobId: string) {
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        status: state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      };
    } catch (error) {
      logger.error('Failed to get job status:', error);
      throw error;
    }
  }
}

export default QueueService;
