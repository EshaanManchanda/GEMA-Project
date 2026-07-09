import logger from "../../config/logger";
import { OTP_EXPIRY_MINUTES } from "../../utils/otp";
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

export type OtpChannel = "whatsapp" | "sms";

export interface OtpDeliveryResult {
  success: boolean;
  channelUsed: OtpChannel;
  providerName: string;
  error?: string;
}

/**
 * Sends the phone-verification OTP, preferring WhatsApp and falling back to
 * SMS on any WhatsApp failure (missing/disabled template, provider error,
 * network error) — a user without WhatsApp is never blocked from verifying.
 *
 * This is a synchronous send (not routed through the queued dispatch()
 * path) because the caller needs an immediate success/fail to decide
 * whether to fall back within the same request. Every attempt is still
 * written to CommunicationLog for admin visibility.
 */
export async function sendPhoneOtp(
  phone: string,
  otp: string,
  preferredChannel: OtpChannel = "whatsapp",
): Promise<OtpDeliveryResult> {
  if (preferredChannel === "whatsapp") {
    const waResult = await tryWhatsAppOtp(phone, otp);
    if (waResult.success) {
      return waResult;
    }
    logger.warn(
      `WhatsApp OTP failed for ${phone}, falling back to SMS: ${waResult.error}`,
    );
  }

  const smsResult = await smsService.sendVerificationOTP(phone, otp);
  await logOtpAttempt(
    phone,
    "sms",
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

async function tryWhatsAppOtp(
  phone: string,
  otp: string,
): Promise<OtpDeliveryResult> {
  const vars = { otp_code: otp, expiry_minutes: OTP_EXPIRY_MINUTES };

  let resolved;
  try {
    resolved = await resolveTemplate(
      NotificationTemplateKey.PHONE_VERIFICATION_OTP,
      CommunicationChannel.WHATSAPP,
      vars,
      "en",
    );
  } catch (error: any) {
    await logOtpAttempt(phone, "whatsapp", false, "whatsapp", error.message);
    return {
      success: false,
      channelUsed: "whatsapp",
      providerName: "whatsapp",
      error: error.message,
    };
  }

  const provider = getWhatsAppProvider();
  const result = await provider.sendTemplate({
    to: phone,
    templateName: resolved.template.providerTemplateName,
    languageCode: resolved.template.languageCode,
    variables: vars,
  });

  await logOtpAttempt(
    phone,
    "whatsapp",
    result.success,
    provider.name,
    result.errorMessage,
    result.providerMessageId,
  );

  return {
    success: result.success,
    channelUsed: "whatsapp",
    providerName: provider.name,
    error: result.errorMessage,
  };
}

async function logOtpAttempt(
  phone: string,
  channel: OtpChannel,
  success: boolean,
  provider: string,
  errorMessage?: string,
  providerMessageId?: string,
): Promise<void> {
  try {
    await CommunicationLog.create({
      channel:
        channel === "whatsapp"
          ? CommunicationChannel.WHATSAPP
          : CommunicationChannel.SMS,
      provider,
      category: CommunicationCategory.OTP,
      recipientPhone: phone,
      templateKey: NotificationTemplateKey.PHONE_VERIFICATION_OTP,
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
    // Audit-log failures must never block the actual OTP send/verify flow.
    logger.error("Failed to write OTP CommunicationLog", error);
  }
}
