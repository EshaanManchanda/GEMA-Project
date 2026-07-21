import logger from "../../config/logger";
import { config } from "../../config/env";
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationStatus,
} from "../../models/index";
import {
  getWhatsAppProvider,
  WhatsAppSendResult,
} from "./providers/whatsapp.provider";
import { CommunicationJobType } from "./communication.service";

/**
 * Shared delivery runner used by BOTH the BullMQ communication worker and
 * the inline (no-Redis, dev-only) fallback in communication.service.ts's
 * dispatch(). Keeping the per-jobType logic here — rather than duplicated
 * in worker + service — means the two call sites can never drift.
 */

export interface CommunicationJobData {
  logId: string;
  jobType: CommunicationJobType;
  to: string;
  templateKey: string;
  providerTemplateName: string;
  languageCode: string;
  vars: Record<string, string | number>;
}

export interface DeliveryResult {
  success: boolean;
  status: CommunicationStatus;
  providerMessageId?: string;
  errorCode?: string;
  /** True when the failure is transient and, in queue mode, would be retried by BullMQ. */
  retryable: boolean;
}

export interface RunCommunicationJobOptions {
  /**
   * true (default, worker mode) = throw on retryable failure so BullMQ's
   * backoff picks it up. false (inline/no-queue mode) = never throw — this
   * attempt is final, mark the log FAILED and return the result instead.
   */
  allowThrowOnRetryable?: boolean;
  /** Timeout for the provider call itself. Default 10s — keeps the inline
   * (synchronous, request-blocking) path from hanging the admin request
   * when a provider is slow/unreachable. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** Statuses past which a log must never be re-sent — protects against a
 * BullMQ retry racing a manual "Retry" click (or either racing itself). */
const TERMINAL_SENT_STATUSES = new Set<CommunicationStatus>([
  CommunicationStatus.SENT,
  CommunicationStatus.DELIVERED,
  CommunicationStatus.READ,
]);

/**
 * Races the provider call against a timeout. Resolves (never rejects) with
 * a retryable WhatsAppSendResult on timeout, so callers don't need a
 * separate catch path for "provider took too long" vs "provider errored".
 */
async function sendWithTimeout(
  job: CommunicationJobData,
  timeoutMs: number,
): Promise<WhatsAppSendResult> {
  const provider = getWhatsAppProvider();

  let timer: NodeJS.Timeout;
  const timeoutResult = new Promise<WhatsAppSendResult>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        success: false,
        errorCode: "PROVIDER_TIMEOUT",
        errorMessage: `${provider.name} did not respond within ${timeoutMs}ms`,
        isRetryable: true,
      });
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      provider.sendTemplate({
        to: job.to,
        templateId: job.providerTemplateName,
        languageCode: job.languageCode,
        variables: job.vars,
      }),
      timeoutResult,
    ]);
  } catch (error: any) {
    // Providers are expected to catch their own errors and resolve with a
    // failure result (see whatsapp.provider.ts) — this is a last-resort
    // guard against a provider implementation that throws instead.
    return {
      success: false,
      errorCode: "PROVIDER_ERROR",
      errorMessage: error?.message || "WhatsApp provider call failed",
      isRetryable: true,
    };
  } finally {
    clearTimeout(timer!);
  }
}

async function handleWhatsAppJob(
  job: CommunicationJobData,
  opts: Required<RunCommunicationJobOptions>,
): Promise<DeliveryResult> {
  const log = await CommunicationLog.findById(job.logId);
  if (!log) {
    logger.warn(`Communication log ${job.logId} not found — skipping job`);
    return {
      success: false,
      status: CommunicationStatus.FAILED,
      errorCode: "LOG_NOT_FOUND",
      retryable: false,
    };
  }

  // Idempotency: a log already sent/delivered/read must never be re-sent,
  // whether this call came from a BullMQ retry or a manual "Retry" click.
  if (TERMINAL_SENT_STATUSES.has(log.status)) {
    return {
      success: true,
      status: log.status,
      providerMessageId: log.providerMessageId,
      retryable: false,
    };
  }

  const result = await sendWithTimeout(job, opts.timeoutMs);

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
    return {
      success: true,
      status: CommunicationStatus.SENT,
      providerMessageId: result.providerMessageId,
      retryable: false,
    };
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

    if (opts.allowThrowOnRetryable) {
      await log.save();
      // Throwing lets BullMQ's exponential backoff (3 attempts) retry the job.
      throw new Error(
        result.errorMessage || "WhatsApp provider send failed (retryable)",
      );
    }

    // Inline mode — no queue to retry through, this attempt is final.
    log.status = CommunicationStatus.FAILED;
    log.errorCode = result.errorCode || "PROVIDER_ERROR";
    log.errorMessage = result.errorMessage;
    log.failedAt = new Date();
    await log.save();
    return {
      success: false,
      status: CommunicationStatus.FAILED,
      errorCode: log.errorCode,
      retryable: true,
    };
  }

  // Non-retryable provider rejection (bad template, opted-out number,
  // config error, etc.) — mark failed, never throw/retry.
  log.status = CommunicationStatus.FAILED;
  log.errorCode = result.errorCode || "PROVIDER_REJECTED";
  log.errorMessage = result.errorMessage;
  log.failedAt = new Date();
  await log.save();
  return {
    success: false,
    status: CommunicationStatus.FAILED,
    errorCode: log.errorCode,
    retryable: false,
  };
}

async function handleEmailMarketingJob(
  job: CommunicationJobData,
): Promise<DeliveryResult> {
  const log = await CommunicationLog.findById(job.logId);
  if (!log) {
    return {
      success: false,
      status: CommunicationStatus.FAILED,
      errorCode: "LOG_NOT_FOUND",
      retryable: false,
    };
  }
  if (TERMINAL_SENT_STATUSES.has(log.status)) {
    return {
      success: true,
      status: log.status,
      providerMessageId: log.providerMessageId,
      retryable: false,
    };
  }

  log.status = CommunicationStatus.FAILED;
  log.errorCode = "NOT_IMPLEMENTED";
  log.errorMessage =
    "Email marketing dispatch is wired in Phase 5 (Sender/Mailchimp provider)";
  log.failedAt = new Date();
  await log.save();
  return {
    success: false,
    status: CommunicationStatus.FAILED,
    errorCode: "NOT_IMPLEMENTED",
    retryable: false,
  };
}

/**
 * Single entry point for actually delivering one communication job —
 * called by the BullMQ worker (queue mode) and directly by dispatch()
 * when the queue is unavailable (inline mode, dev-only — see
 * communication.service.ts).
 */
export async function runCommunicationJob(
  job: CommunicationJobData,
  opts: RunCommunicationJobOptions = {},
): Promise<DeliveryResult> {
  const resolvedOpts: Required<RunCommunicationJobOptions> = {
    allowThrowOnRetryable: opts.allowThrowOnRetryable ?? true,
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  switch (job.jobType) {
    case CommunicationJobType.WHATSAPP_TEMPLATE:
    case CommunicationJobType.WHATSAPP_OTP:
      return handleWhatsAppJob(job, resolvedOpts);

    case CommunicationJobType.EMAIL_MARKETING_SYNC:
    case CommunicationJobType.EMAIL_CAMPAIGN:
      return handleEmailMarketingJob(job);

    case CommunicationJobType.RETRY_LOG: {
      // Re-dispatch through the same channel the original log used.
      const log = await CommunicationLog.findById(job.logId);
      if (log?.channel === CommunicationChannel.WHATSAPP) {
        return handleWhatsAppJob(job, resolvedOpts);
      }
      return handleEmailMarketingJob(job);
    }

    default:
      logger.warn(`Unknown communication jobType: ${job.jobType}`);
      return {
        success: false,
        status: CommunicationStatus.FAILED,
        errorCode: "UNKNOWN_JOB_TYPE",
        retryable: false,
      };
  }
}
