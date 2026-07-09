import {
  CommunicationLog,
  ICommunicationLog,
  CommunicationChannel,
  CommunicationCategory,
  CommunicationStatus,
} from "../../models/index";
import { communicationQueue } from "../../config/queue";
import { config } from "../../config/env";
import { sanitizeToE164 } from "../../utils/phoneValidation";
import { resolveTemplate } from "./template.service";
import logger from "../../config/logger";

/**
 * Strict job types for the communication worker (Phase 2). Keeping this a
 * closed enum — rather than letting the worker infer intent from
 * channel/category — is deliberate: it stops the worker from growing into a
 * messy catch-all switch statement.
 */
export enum CommunicationJobType {
  WHATSAPP_TEMPLATE = "whatsapp_template",
  WHATSAPP_OTP = "whatsapp_otp",
  EMAIL_MARKETING_SYNC = "email_marketing_sync",
  EMAIL_CAMPAIGN = "email_campaign",
  RETRY_LOG = "retry_log",
}

/**
 * Error codes that must NEVER be retried — the failure is inherent to the
 * request, not transient. Provider timeouts/5xx (no explicit code, or a code
 * outside this set) are retryable.
 */
export const NON_RETRYABLE_ERROR_CODES = new Set([
  "INVALID_PHONE",
  "TEMPLATE_MISSING",
  "TEMPLATE_DISABLED",
  "UNSUBSCRIBED",
  "CONSENT_DENIED",
  "MISSING_VARIABLES",
  "QUEUE_DISABLED",
]);

export interface DispatchRefs {
  userId?: string;
  eventId?: string;
  bookingId?: string;
  orderId?: string;
  certificateId?: string;
  campaignId?: string;
}

export interface DispatchInput {
  jobType: CommunicationJobType;
  channel: CommunicationChannel;
  category: CommunicationCategory;
  templateKey: string;
  /** Phone (any format — normalized to E.164 here) for whatsapp/sms; email address otherwise. */
  to: string;
  vars: Record<string, string | number>;
  languageCode?: string;
  /**
   * Required (and must be `true`) when category === MARKETING. Transactional/
   * OTP/admin_alert templates bypass this — the caller passes nothing.
   * Resolving *whose* consent applies (User.marketingConsent vs
   * NewsletterSubscriber.preferences) is the caller's job, not dispatch's.
   */
  consent?: boolean;
  refs?: DispatchRefs;
  /**
   * Dedupe key. If omitted, derived as `${templateKey}:${bookingId ?? orderId ?? userId ?? "-"}:${to}`.
   * A second dispatch() with the same key against an in-flight/successful log
   * is a no-op — this is what prevents duplicate booking confirmations/reminders.
   */
  idempotencyKey?: string;
}

function buildIdempotencyKey(input: DispatchInput): string {
  if (input.idempotencyKey) return input.idempotencyKey;
  const { refs = {} } = input;
  const scopeId = refs.bookingId ?? refs.orderId ?? refs.userId ?? "-";
  return `${input.templateKey}:${scopeId}:${input.to}`;
}

const IN_FLIGHT_OR_DONE = new Set([
  CommunicationStatus.QUEUED,
  CommunicationStatus.SENT,
  CommunicationStatus.DELIVERED,
  CommunicationStatus.READ,
]);

async function failLog(
  idempotencyKey: string,
  base: Partial<ICommunicationLog>,
  errorCode: string,
  errorMessage: string,
): Promise<ICommunicationLog> {
  return CommunicationLog.findOneAndUpdate(
    { idempotencyKey },
    {
      $set: {
        ...base,
        status: CommunicationStatus.FAILED,
        errorCode,
        errorMessage,
        failedAt: new Date(),
      },
      $setOnInsert: { idempotencyKey, retryCount: 0 },
    },
    { upsert: true, new: true },
  );
}

/**
 * Single entry point for every outbound communication. Never calls a
 * provider directly and never throws for expected failure modes (missing
 * template, missing variables, invalid phone, consent denied) — those are
 * persisted as a `failed` CommunicationLog for admin visibility instead, so
 * trigger call-sites can fire-and-forget without try/catch ceremony.
 */
export async function dispatch(
  input: DispatchInput,
): Promise<ICommunicationLog> {
  const idempotencyKey = buildIdempotencyKey(input);
  const refs = input.refs || {};

  const baseFields: Partial<ICommunicationLog> = {
    channel: input.channel,
    provider:
      input.channel === CommunicationChannel.EMAIL_MARKETING
        ? config.emailMarketing.provider
        : config.whatsapp.provider,
    category: input.category,
    userId: refs.userId as any,
    eventId: refs.eventId as any,
    bookingId: refs.bookingId as any,
    orderId: refs.orderId as any,
    certificateId: refs.certificateId as any,
    templateKey: input.templateKey,
    campaignId: refs.campaignId,
  };

  // Idempotency short-circuit: an in-flight or already-successful send is a no-op.
  const existing = await CommunicationLog.findOne({ idempotencyKey });
  if (existing && IN_FLIGHT_OR_DONE.has(existing.status)) {
    return existing;
  }

  // Marketing templates never ride the transactional/otp bypass.
  if (
    input.category === CommunicationCategory.MARKETING &&
    input.consent !== true
  ) {
    return failLog(
      idempotencyKey,
      baseFields,
      "CONSENT_DENIED",
      "Marketing consent not granted for this recipient",
    );
  }

  let resolved;
  try {
    resolved = await resolveTemplate(
      input.templateKey,
      input.channel,
      input.vars,
      input.languageCode,
    );
  } catch (error: any) {
    return failLog(
      idempotencyKey,
      baseFields,
      /disabled/i.test(error.message)
        ? "TEMPLATE_DISABLED"
        : "MISSING_VARIABLES",
      error.message || "Template resolution failed",
    );
  }

  // Normalize recipient — phone for whatsapp/sms, email otherwise.
  let recipientPhone: string | undefined;
  let recipientEmail: string | undefined;
  if (
    input.channel === CommunicationChannel.WHATSAPP ||
    input.channel === CommunicationChannel.SMS
  ) {
    const e164 = sanitizeToE164(input.to);
    if (!e164) {
      return failLog(
        idempotencyKey,
        baseFields,
        "INVALID_PHONE",
        `"${input.to}" is not a valid phone number`,
      );
    }
    recipientPhone = e164;
  } else {
    recipientEmail = input.to.trim().toLowerCase();
  }

  if (!communicationQueue) {
    logger.warn(
      `Communication queue disabled — dropping dispatch for ${input.templateKey} to ${input.to}`,
    );
    return failLog(
      idempotencyKey,
      baseFields,
      "QUEUE_DISABLED",
      "Communication queue is disabled (Redis unavailable)",
    );
  }

  const log = await CommunicationLog.findOneAndUpdate(
    { idempotencyKey },
    {
      $set: {
        ...baseFields,
        recipientPhone,
        recipientEmail,
        providerTemplateName: resolved.template.providerTemplateName,
        templateSnapshot: resolved.rendered,
        vars: input.vars,
        status: CommunicationStatus.QUEUED,
        queuedAt: new Date(),
      },
      $setOnInsert: { idempotencyKey, retryCount: 0 },
    },
    { upsert: true, new: true },
  );

  await communicationQueue.add(input.jobType, {
    logId: log._id.toString(),
    jobType: input.jobType,
    to: recipientPhone || recipientEmail,
    templateKey: input.templateKey,
    providerTemplateName: resolved.template.providerTemplateName,
    languageCode: input.languageCode || "en",
    vars: input.vars,
  });

  return log;
}

/**
 * Re-enqueue a failed log — used by the admin `logs/:id/retry` endpoint.
 * Refuses to retry non-retryable failure classes (per NON_RETRYABLE_ERROR_CODES).
 */
export async function retryLog(logId: string): Promise<ICommunicationLog> {
  const log = await CommunicationLog.findById(logId);
  if (!log) {
    throw new Error("Communication log not found");
  }
  if (log.errorCode && NON_RETRYABLE_ERROR_CODES.has(log.errorCode)) {
    throw new Error(
      `Log ${logId} failed with non-retryable error "${log.errorCode}" — cannot retry`,
    );
  }
  if (!communicationQueue) {
    throw new Error("Communication queue is disabled");
  }

  log.status = CommunicationStatus.QUEUED;
  log.retryCount += 1;
  log.errorCode = undefined;
  log.errorMessage = undefined;
  await log.save();

  await communicationQueue.add(CommunicationJobType.RETRY_LOG, {
    logId: log._id.toString(),
    jobType: CommunicationJobType.RETRY_LOG,
    to: log.recipientPhone || log.recipientEmail,
    templateKey: log.templateKey,
    providerTemplateName: log.providerTemplateName,
    languageCode: "en",
    vars: log.vars || {},
  });

  return log;
}
