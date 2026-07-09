import logger from "../../../config/logger";
import { config } from "../../../config/env";
import { CommunicationLog, CommunicationStatus } from "../../../models/index";

export interface WhatsAppSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  /** True for transient failures (timeouts/5xx) the worker should retry. */
  isRetryable?: boolean;
  raw?: any;
}

export interface WhatsAppSendInput {
  to: string; // E.164
  templateName: string;
  languageCode?: string;
  variables: Record<string, string | number>;
}

export interface WhatsAppProvider {
  name: string;
  testConnection(): Promise<boolean>;
  sendTemplate(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}

/**
 * Logs the rendered message instead of calling a real API. Used whenever
 * WHATSAPP_PROVIDER=dev or COMMUNICATION_TEST_MODE=true — local/dev work can
 * never send a real WhatsApp message.
 */
export class DevWhatsAppProvider implements WhatsAppProvider {
  name = "Development";

  async testConnection(): Promise<boolean> {
    return true;
  }

  async sendTemplate(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    logger.info("═══════════════════════════════════════════════════════");
    logger.info("📲 WhatsApp (Development Mode)");
    logger.info("To:", input.to);
    logger.info("Template:", input.templateName, input.languageCode || "en");
    logger.info("Variables:", input.variables);
    logger.info("═══════════════════════════════════════════════════════");

    return {
      success: true,
      providerMessageId: `dev-wa-${Date.now()}`,
    };
  }
}

/**
 * Cunnekt WhatsApp Business API client.
 *
 * ⚠️ BEST-EFFORT / UNVERIFIED — built from Cunnekt's public marketing/docs
 * pages without a live account or API reference in hand. Every assumption
 * below is marked TODO; confirm each against the actual Cunnekt developer
 * docs (https://www.cunnekt.com/developer-api.html) before any real send:
 *
 *   TODO(cunnekt): confirm exact send endpoint path (assumed POST /messages/template)
 *   TODO(cunnekt): confirm auth header (assumed `Authorization: Bearer <CUNNEKT_API_KEY>`)
 *   TODO(cunnekt): confirm request body shape (assumed { from, to, template: { name, language, components } })
 *   TODO(cunnekt): confirm response field for the provider message id (assumed `data.id` or `messageId`)
 *   TODO(cunnekt): confirm which HTTP statuses are transient (assumed 429/5xx = retryable)
 */
export class CunnektWhatsAppProvider implements WhatsAppProvider {
  name = "Cunnekt";

  private baseUrl = config.whatsapp.cunnektBaseUrl;
  private apiKey = config.whatsapp.cunnektApiKey;
  private wabaNumber = config.whatsapp.cunnektWabaNumber;

  constructor() {
    if (!this.apiKey || !this.wabaNumber) {
      throw new Error(
        "Cunnekt credentials not configured (CUNNEKT_API_KEY / CUNNEKT_WABA_NUMBER)",
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // TODO(cunnekt): confirm a real health/account-status endpoint; this is a guess.
      const response = await fetch(`${this.baseUrl}/account`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendTemplate(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/template`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.wabaNumber,
          to: input.to,
          template: {
            name: input.templateName,
            language: input.languageCode || "en",
            // TODO(cunnekt): confirm variable-substitution shape — Meta-style
            // WhatsApp templates use positional `components[].parameters[]`;
            // Cunnekt may wrap this differently.
            components: [
              {
                type: "body",
                parameters: Object.values(input.variables).map((value) => ({
                  type: "text",
                  text: String(value),
                })),
              },
            ],
          },
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        return {
          success: false,
          errorCode: `HTTP_${response.status}`,
          errorMessage:
            body?.message ||
            body?.error ||
            `Cunnekt send failed (${response.status})`,
          isRetryable,
          raw: body,
        };
      }

      return {
        success: true,
        providerMessageId: body?.data?.id || body?.messageId || body?.id,
        raw: body,
      };
    } catch (error: any) {
      // Network-level failures (timeout, DNS, connection reset) are transient.
      return {
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: error.message || "Cunnekt request failed",
        isRetryable: true,
      };
    }
  }
}

/**
 * Selects the WhatsApp provider from env. COMMUNICATION_TEST_MODE always
 * wins — real credentials present locally never result in a real send.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (config.communication.testMode) {
    return new DevWhatsAppProvider();
  }

  switch (config.whatsapp.provider.toLowerCase()) {
    case "cunnekt":
      try {
        return new CunnektWhatsAppProvider();
      } catch (error: any) {
        logger.error(
          `Failed to initialize Cunnekt provider, falling back to dev: ${error.message}`,
        );
        return new DevWhatsAppProvider();
      }

    case "dev":
    case "development":
    default:
      return new DevWhatsAppProvider();
  }
}

/**
 * ⚠️ BEST-EFFORT / UNVERIFIED — Cunnekt's real delivery-webhook payload shape
 * isn't confirmed. Assumed shape: `{ messageId: string, status: "sent"|"delivered"|"read"|"failed", error?: { code, message } }`.
 * TODO(cunnekt): confirm actual field names once real webhook payloads are seen.
 *
 * Status transitions are applied monotonically (never downgraded) since
 * webhooks can arrive out of order or be replayed by the provider.
 */
const STATUS_RANK: Partial<Record<CommunicationStatus, number>> = {
  [CommunicationStatus.QUEUED]: 0,
  [CommunicationStatus.SENT]: 1,
  [CommunicationStatus.DELIVERED]: 2,
  [CommunicationStatus.READ]: 3,
  [CommunicationStatus.FAILED]: 3,
  [CommunicationStatus.BOUNCED]: 3,
};

function mapCunnektStatus(raw: string): CommunicationStatus | null {
  switch (raw?.toLowerCase()) {
    case "sent":
      return CommunicationStatus.SENT;
    case "delivered":
      return CommunicationStatus.DELIVERED;
    case "read":
      return CommunicationStatus.READ;
    case "failed":
    case "undelivered":
      return CommunicationStatus.FAILED;
    default:
      return null;
  }
}

export async function processCunnektWebhookEvent(payload: any): Promise<void> {
  const providerMessageId =
    payload?.messageId || payload?.data?.id || payload?.id;
  const rawStatus = payload?.status || payload?.data?.status;

  if (!providerMessageId || !rawStatus) {
    logger.warn("Cunnekt webhook: payload missing messageId/status, ignoring", {
      payload,
    });
    return;
  }

  const nextStatus = mapCunnektStatus(rawStatus);
  if (!nextStatus) {
    logger.warn(
      `Cunnekt webhook: unrecognized status "${rawStatus}", ignoring`,
    );
    return;
  }

  const log = await CommunicationLog.findOne({ providerMessageId });
  if (!log) {
    logger.warn(
      `Cunnekt webhook: no CommunicationLog for providerMessageId ${providerMessageId}`,
    );
    return;
  }

  const currentRank = STATUS_RANK[log.status] ?? -1;
  const nextRank = STATUS_RANK[nextStatus] ?? -1;
  if (nextRank <= currentRank) {
    // Already at/past this status (replay or out-of-order webhook) — no-op.
    return;
  }

  log.status = nextStatus;
  if (nextStatus === CommunicationStatus.DELIVERED)
    log.deliveredAt = new Date();
  if (nextStatus === CommunicationStatus.READ) log.readAt = new Date();
  if (nextStatus === CommunicationStatus.FAILED) {
    log.failedAt = new Date();
    log.errorCode = payload?.error?.code || "PROVIDER_REPORTED_FAILURE";
    log.errorMessage = payload?.error?.message;
  }
  await log.save();
}
