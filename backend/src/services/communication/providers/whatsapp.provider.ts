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
  /** Cunnekt's numeric/opaque template ID from their Template List page (NOT a symbolic name). */
  templateId: string;
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
    logger.info("Template ID:", input.templateId, input.languageCode || "en");
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
 * Cunnekt exposes two incompatible API generations (see
 * doc/CUNNEKT_API_GUIDE.md §1). Neither is guessed here — `CUNNEKT_API_VERSION`
 * selects which one this workspace's dashboard actually generates:
 *
 *   - "legacy":  POST {baseUrl}/api/v1/whatsapp/sendtemplate
 *                body { mobile, templateid, overridebot, template: { components } }
 *   - "rest-v1": POST {baseUrl}/restapi/v1/whatsapp/sendtemplate
 *                body { messaging_product, recipient_type, to, type, template: { name, language, components } }
 *
 * `NotificationTemplate.providerTemplateName` is sent as `templateid` in
 * legacy mode and as `template.name` in rest-v1 mode — same DB field, per
 * the field the target API actually expects.
 *
 * ⚠️ Per the guide's §36 production rule, this still has NOT been validated
 * against a real dashboard-generated payload for this account. Before
 * go-live: open the Cunnekt dashboard → template → "API Payload" action,
 * confirm it matches the mode selected here, and correct CUNNEKT_API_VERSION
 * / CUNNEKT_BASE_URL if not.
 *
 * ⚠️ Success-response shape is unconfirmed for both generations (doc §24 —
 * "do not hard-code a guessed field... without a captured response"). The
 * Meta Cloud API shape (`messages[0].id`) is tried first as a best guess,
 * with fallbacks, and the full raw response is always logged/stored so the
 * real field can be identified from a live send.
 */
export class CunnektWhatsAppProvider implements WhatsAppProvider {
  name = "Cunnekt";

  private baseUrl = config.whatsapp.cunnektBaseUrl;
  private apiKey = config.whatsapp.cunnektApiKey;
  private apiVersion = config.whatsapp.cunnektApiVersion;

  constructor() {
    if (!this.apiKey) {
      throw new Error("Cunnekt credentials not configured (CUNNEKT_API_KEY)");
    }
  }

  /**
   * rest-v1 has a documented read endpoint (GET .../whatsapp/templates,
   * doc §13) used as a real connection probe. Legacy has no documented
   * health/list endpoint at all (doc §34) — inventing one would violate the
   * guide's "don't guess" rule, so legacy mode only confirms credentials
   * are configured, not that they're valid.
   */
  async testConnection(): Promise<boolean> {
    if (this.apiVersion === "legacy") {
      logger.warn(
        "Cunnekt legacy API has no documented connection-test endpoint; testConnection() only confirms an API key is configured.",
      );
      return Boolean(this.apiKey);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/restapi/v1/whatsapp/templates`,
        {
          method: "GET",
          headers: { "API-KEY": this.apiKey },
        },
      );
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }

  private buildRequest(input: WhatsAppSendInput): {
    url: string;
    body: Record<string, unknown>;
  } {
    const values = Object.values(input.variables);
    const components =
      values.length > 0
        ? [
            {
              type: "body",
              parameters: values.map((value) => ({
                type: "text",
                text: String(value),
              })),
            },
          ]
        : [];

    if (this.apiVersion === "rest-v1") {
      return {
        url: `${this.baseUrl}/restapi/v1/whatsapp/sendtemplate`,
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.to,
          type: "template",
          template: {
            name: input.templateId,
            language: { code: input.languageCode || "en" },
            components,
          },
        },
      };
    }

    return {
      url: `${this.baseUrl}/api/v1/whatsapp/sendtemplate`,
      body: {
        mobile: input.to,
        templateid: input.templateId,
        overridebot: "no",
        template: { components },
      },
    };
  }

  async sendTemplate(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    try {
      const { url, body } = this.buildRequest(input);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        return {
          success: false,
          errorCode: `HTTP_${response.status}`,
          errorMessage:
            responseBody?.message ||
            responseBody?.error ||
            `Cunnekt send failed (${response.status})`,
          isRetryable,
          raw: responseBody,
        };
      }

      const providerMessageId =
        responseBody?.messages?.[0]?.id ||
        responseBody?.data?.id ||
        responseBody?.messageId ||
        responseBody?.id;

      if (!providerMessageId) {
        logger.warn(
          "Cunnekt send succeeded but no known message-id field was found in the response — webhook status updates for this message won't be able to match it. Inspect raw response to find the real field.",
          { raw: responseBody },
        );
      }

      return {
        success: true,
        providerMessageId,
        raw: responseBody,
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
 * Confirmed against Cunnekt's Postman docs, 2026-07-20 — delivery-status
 * webhooks are Meta WhatsApp Cloud API compatible:
 *   { messaging_product, metadata, statuses: [{ id, status, timestamp, recipient_id, ... }] }
 * with `status` one of "sent" | "delivered" | "read" (confirmed by example)
 * or "failed" (not shown in docs, but standard on the Cloud API — includes
 * an `errors: [{ code, title, message }]` array on the status object).
 * A single webhook call can carry multiple statuses; each is applied
 * independently.
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

async function applyStatusUpdate(status: any): Promise<void> {
  const providerMessageId = status?.id;
  const rawStatus = status?.status;

  if (!providerMessageId || !rawStatus) {
    logger.warn("Cunnekt webhook: status entry missing id/status, ignoring", {
      status,
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
    const firstError = status?.errors?.[0];
    log.errorCode = firstError?.code
      ? String(firstError.code)
      : "PROVIDER_REPORTED_FAILURE";
    log.errorMessage = firstError?.message || firstError?.title;
  }
  await log.save();
}

export async function processCunnektWebhookEvent(payload: any): Promise<void> {
  const statuses = Array.isArray(payload?.statuses) ? payload.statuses : [];

  if (statuses.length === 0) {
    // Incoming user messages (payload.messages) land here too — this handler
    // only tracks outbound delivery status, so those are intentionally ignored.
    logger.info("Cunnekt webhook: no statuses in payload, ignoring", {
      hasMessages: Array.isArray(payload?.messages),
    });
    return;
  }

  for (const status of statuses) {
    await applyStatusUpdate(status);
  }
}
