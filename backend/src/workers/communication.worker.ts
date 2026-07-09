import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  areQueuesEnabled,
} from "../config/queue";
import logger from "../config/logger";
import { config } from "../config/env";
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationStatus,
} from "../models/index";
import { getWhatsAppProvider } from "../services/communication/providers/whatsapp.provider";
import { CommunicationJobType } from "../services/communication/communication.service";

export interface CommunicationJobData {
  logId: string;
  jobType: CommunicationJobType;
  to: string;
  templateKey: string;
  providerTemplateName: string;
  languageCode: string;
  vars: Record<string, string | number>;
}

/**
 * Small per-jobType handlers, deliberately not one fat switch body — each
 * function owns exactly one channel/provider call and one CommunicationLog
 * update. Retryability comes from the provider adapter's own
 * `isRetryable` flag (timeouts/5xx => true), never guessed here.
 */

async function handleWhatsAppSend(
  job: Job<CommunicationJobData>,
): Promise<{ success: boolean }> {
  const { logId, to, providerTemplateName, languageCode, vars } = job.data;

  const log = await CommunicationLog.findById(logId);
  if (!log) {
    logger.warn(
      `Communication log ${logId} not found — skipping job ${job.id}`,
    );
    return { success: false };
  }

  const provider = getWhatsAppProvider();
  const result = await provider.sendTemplate({
    to,
    templateName: providerTemplateName,
    languageCode,
    variables: vars,
  });

  if (result.success) {
    log.status = CommunicationStatus.SENT;
    log.providerMessageId = result.providerMessageId;
    log.safeProviderSummary = {
      providerMessageId: result.providerMessageId,
      status: "sent",
    };
    log.sentAt = new Date();
    if (config.communication.logRawProviderResponse && result.raw) {
      log.providerResponse = result.raw;
    }
    await log.save();
    return { success: true };
  }

  log.safeProviderSummary = {
    status: "failed",
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  };
  if (config.communication.logRawProviderResponse && result.raw) {
    log.providerResponse = result.raw;
  }

  if (result.isRetryable) {
    log.retryCount += 1;
    await log.save();
    // Throwing lets BullMQ's exponential backoff (3 attempts) retry the job.
    throw new Error(
      result.errorMessage || "WhatsApp provider send failed (retryable)",
    );
  }

  // Non-retryable provider rejection (bad template, opted-out number, etc.)
  // — mark failed and do NOT throw, so BullMQ doesn't waste attempts on it.
  log.status = CommunicationStatus.FAILED;
  log.errorCode = result.errorCode || "PROVIDER_REJECTED";
  log.errorMessage = result.errorMessage;
  log.failedAt = new Date();
  await log.save();
  return { success: false };
}

async function handleEmailMarketingNotImplemented(
  job: Job<CommunicationJobData>,
): Promise<{ success: boolean }> {
  const { logId } = job.data;
  const log = await CommunicationLog.findById(logId);
  if (log) {
    log.status = CommunicationStatus.FAILED;
    log.errorCode = "NOT_IMPLEMENTED";
    log.errorMessage =
      "Email marketing dispatch is wired in Phase 5 (Sender/Mailchimp provider)";
    log.failedAt = new Date();
    await log.save();
  }
  return { success: false };
}

async function processJob(
  job: Job<CommunicationJobData>,
): Promise<{ success: boolean }> {
  switch (job.data.jobType) {
    case CommunicationJobType.WHATSAPP_TEMPLATE:
    case CommunicationJobType.WHATSAPP_OTP:
      return handleWhatsAppSend(job);

    case CommunicationJobType.EMAIL_MARKETING_SYNC:
    case CommunicationJobType.EMAIL_CAMPAIGN:
      return handleEmailMarketingNotImplemented(job);

    case CommunicationJobType.RETRY_LOG: {
      // Re-dispatch through the same channel the original log used.
      const log = await CommunicationLog.findById(job.data.logId);
      if (log?.channel === CommunicationChannel.WHATSAPP) {
        return handleWhatsAppSend(job);
      }
      return handleEmailMarketingNotImplemented(job);
    }

    default:
      logger.warn(`Unknown communication jobType: ${job.data.jobType}`);
      return { success: false };
  }
}

const communicationWorker = areQueuesEnabled
  ? new Worker<CommunicationJobData>(
      QUEUE_NAMES.NOTIFICATIONS,
      async (job: Job<CommunicationJobData>) => {
        logger.info(`Processing communication job ${job.id}`, {
          jobType: job.data.jobType,
          logId: job.data.logId,
        });
        return processJob(job);
      },
      {
        connection: bullMQConnection,
        concurrency: 3,
      },
    )
  : null;

if (communicationWorker) {
  communicationWorker.on("completed", (job: Job, result: any) => {
    logger.info(`Communication job ${job.id} completed`, {
      jobType: job.data.jobType,
      success: result?.success,
    });
  });

  communicationWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Communication job ${job?.id} failed:`, {
      jobType: job?.data?.jobType,
      logId: job?.data?.logId,
      error: error.message,
    });
  });
}

const gracefulShutdown = async () => {
  if (communicationWorker) {
    logger.info("Shutting down communication worker...");
    await communicationWorker.close();
    logger.info("Communication worker shut down successfully");
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default communicationWorker;
