import { qrQueue, emailQueue, ticketQueue } from "../config/queue";
import { QRJobData } from "../workers/qr.worker";
import { EmailJobData } from "../workers/email.worker";
import { emailService } from "./email.service";
import logger from "../config/logger";

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
      const job = await qrQueue.add("generate-qr", data, {
        ...options,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      });

      logger.info(`QR generation job added: ${job.id}`, {
        ticketNumber: data.ticketNumber,
      });

      return job;
    } catch (error) {
      logger.error("Failed to add QR generation job:", error);
      throw error;
    }
  }

  /**
   * Add email job to queue — falls back to direct send if Redis unavailable
   */
  static async addEmailJob(data: EmailJobData, options?: any) {
    // If queue is unavailable, send directly
    if (!emailQueue) {
      logger.warn(`Email queue unavailable — sending ${data.type} directly`);
      return QueueService.sendEmailDirect(data);
    }

    try {
      const job = await emailQueue.add(`send-${data.type}`, data, {
        ...options,
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
      });

      logger.info(`Email job added: ${job.id}`, {
        type: data.type,
        to: Array.isArray(data.to) ? `${data.to.length} recipients` : data.to,
      });

      return job;
    } catch (error) {
      logger.error(
        "Failed to add email job, falling back to direct send:",
        error,
      );
      return QueueService.sendEmailDirect(data);
    }
  }

  /**
   * Direct email send without queue (fallback)
   */
  private static async sendEmailDirect(data: EmailJobData) {
    const d = data.templateData || {};
    switch (data.type) {
      case "verification":
        return emailService.sendVerificationEmail({
          to: data.to as string,
          firstName: d.firstName,
          otp: d.otp,
        });
      case "passwordReset":
        return emailService.sendPasswordResetEmail({
          to: data.to as string,
          firstName: d.firstName,
          resetOTP: d.resetOTP,
        });
      case "orderConfirmation":
        return emailService.sendOrderConfirmationEmail({
          to: data.to as string,
          firstName: d.firstName,
          orderNumber: d.orderNumber,
          orderTotal: d.orderTotal,
          currency: d.currency,
          isFreeEvent: d.isFreeEvent,
          attachments: data.attachments,
          items: d.items,
        });
      case "ticket":
        return emailService.sendTicketsEmail({
          to: data.to as string,
          firstName: d.firstName,
          tickets: d.tickets,
        });
      case "cancellationConfirmation":
        return emailService.sendCancellationConfirmationEmail({
          to: data.to as string,
          firstName: d.firstName,
          orderNumber: d.orderNumber,
          refundAmount: d.refundAmount,
          nonRefundableAmount: d.nonRefundableAmount,
          serviceFee: d.serviceFee,
          tax: d.tax,
          currency: d.currency,
          reason: d.reason,
        });
      case "eventCancellation":
        return emailService.sendEventCancellationEmail({
          to: data.to as string,
          firstName: d.firstName,
          eventTitle: d.eventTitle,
          eventDate: d.eventDate,
          orderNumber: d.orderNumber,
          reason: d.reason,
          refundAmount: d.refundAmount,
          nonRefundableAmount: d.nonRefundableAmount,
          currency: d.currency,
          serviceFee: d.serviceFee,
          tax: d.tax,
        });
      case "refundProcessed":
        return emailService.sendRefundProcessedEmail({
          to: data.to as string,
          firstName: d.firstName,
          orderNumber: d.orderNumber,
          refundAmount: d.refundAmount,
          currency: d.currency,
          refundTransactionId: d.refundTransactionId,
        });
      case "refundFailed":
        return emailService.sendRefundFailedEmail({
          to: data.to as string,
          firstName: d.firstName,
          orderNumber: d.orderNumber,
          refundAmount: d.refundAmount,
          currency: d.currency,
        });
      default:
        return emailService.sendEmail({
          to: data.to,
          subject: data.subject || "Notification",
          html: data.html,
          text: data.text,
        });
    }
  }

  /**
   * Send verification email (async via queue)
   */
  static async sendVerificationEmail(
    to: string,
    firstName: string,
    otp: string,
  ) {
    return this.addEmailJob({
      type: "verification",
      to,
      templateData: { firstName, otp },
    });
  }

  /**
   * Send password reset email (async via queue)
   */
  static async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetOTP: string,
  ) {
    return this.addEmailJob({
      type: "passwordReset",
      to,
      templateData: { firstName, resetOTP },
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
      type: "orderConfirmation",
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
      type: "ticket",
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
        return { status: "not_found" };
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
      logger.error("Failed to get job status:", error);
      throw error;
    }
  }
}

export default QueueService;
