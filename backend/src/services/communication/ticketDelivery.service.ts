import logger from "../../config/logger";
import smsService from "../sms.service";
import { getWhatsAppProvider } from "./providers/whatsapp.provider";
import { resolveTemplate } from "./template.service";
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationCategory,
  CommunicationStatus,
  NotificationTemplateKey,
} from "../../models/index";

export interface TicketDeliveryInput {
  phone: string;
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date | string;
  venue: string;
}

export interface TicketDeliveryResult {
  success: boolean;
  channelUsed: "whatsapp" | "sms";
  providerName: string;
  error?: string;
}

/**
 * Sends a ticket via WhatsApp, falling back to SMS on any failure (missing/
 * disabled template, provider error, network error) — same synchronous
 * pattern as phone OTP delivery, since this backs a "resend ticket" action
 * that must report success/failure within the same request.
 */
export async function sendTicketViaWhatsAppOrSms(
  input: TicketDeliveryInput,
): Promise<TicketDeliveryResult> {
  const vars = {
    ticket_number: input.ticketNumber,
    event_title: input.eventTitle,
    event_date:
      input.eventDate instanceof Date
        ? input.eventDate.toLocaleDateString("en-US", { dateStyle: "medium" })
        : String(input.eventDate),
    venue: input.venue,
  };

  const waResult = await tryWhatsAppTicket(input.phone, vars);
  if (waResult.success) {
    return {
      success: true,
      channelUsed: "whatsapp",
      providerName: waResult.providerName,
    };
  }
  logger.warn(
    `WhatsApp ticket delivery failed for ${input.phone}, falling back to SMS: ${waResult.error}`,
  );

  const smsResult = await smsService.sendTicketViaSMS(
    input.phone,
    input.ticketNumber,
    input.eventTitle,
    input.eventDate,
    input.venue,
  );
  await logAttempt(
    input.phone,
    CommunicationChannel.SMS,
    smsResult.success,
    smsService.getProviderName(),
    smsResult.error,
    smsResult.messageId,
  );

  return {
    success: smsResult.success,
    channelUsed: "sms",
    providerName: smsService.getProviderName(),
    error: smsResult.error,
  };
}

async function tryWhatsAppTicket(
  phone: string,
  vars: Record<string, string>,
): Promise<{ success: boolean; providerName: string; error?: string }> {
  let resolved;
  try {
    resolved = await resolveTemplate(
      NotificationTemplateKey.TICKET_DELIVERY,
      CommunicationChannel.WHATSAPP,
      vars,
      "en",
    );
  } catch (error: any) {
    await logAttempt(
      phone,
      CommunicationChannel.WHATSAPP,
      false,
      "whatsapp",
      error.message,
    );
    return { success: false, providerName: "whatsapp", error: error.message };
  }

  const provider = getWhatsAppProvider();
  const result = await provider.sendTemplate({
    to: phone,
    templateId: resolved.template.providerTemplateName,
    languageCode: resolved.template.languageCode,
    variables: vars,
  });

  await logAttempt(
    phone,
    CommunicationChannel.WHATSAPP,
    result.success,
    provider.name,
    result.errorMessage,
    result.providerMessageId,
  );

  return {
    success: result.success,
    providerName: provider.name,
    error: result.errorMessage,
  };
}

async function logAttempt(
  phone: string,
  channel: CommunicationChannel,
  success: boolean,
  provider: string,
  errorMessage?: string,
  providerMessageId?: string,
): Promise<void> {
  try {
    await CommunicationLog.create({
      channel,
      provider,
      category: CommunicationCategory.TRANSACTIONAL,
      recipientPhone: phone,
      templateKey: NotificationTemplateKey.TICKET_DELIVERY,
      status: success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      sentAt: success ? new Date() : undefined,
      failedAt: success ? undefined : new Date(),
      errorMessage: success ? undefined : errorMessage,
      providerMessageId,
      safeProviderSummary: {
        status: success ? "sent" : "failed",
        errorMessage,
      },
    });
  } catch (error) {
    // Audit-log failures must never block the actual ticket send.
    logger.error("Failed to write ticket-delivery CommunicationLog", error);
  }
}
