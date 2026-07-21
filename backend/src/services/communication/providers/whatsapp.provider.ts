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

/** True when a Cunnekt API key looks like a real credential, not empty or a
 * leftover placeholder (`your_key_here`, `changeme`, etc). Used to decide
 * between a real send and a clean CONFIGURATION_ERROR — never a silent
 * "success" — when credentials aren't actually configured. */
function isUsableKey(key: string | undefined | null): boolean {
  if (!key || !key.trim()) return false;
  return !/^(your_|changeme|placeholder|xxx)/i.test(key.trim());
}

let hasWarnedAboutDeprecatedApiVersion = false;

/**
 * `CUNNEKT_API_VERSION` used to select between "legacy" and a fabricated,
 * never-confirmed "rest-v1" generation. That second generation has been
 * removed (see CunnektWhatsAppProvider's class doc comment) — the field is
 * now a no-op, kept only so an existing `.env` doesn't error. Warn once at
 * startup if it's set to anything other than unset/"legacy" so a stale
 * `rest-v1` value doesn't silently go unnoticed.
 */
function warnIfDeprecatedApiVersionSet(): void {
  if (hasWarnedAboutDeprecatedApiVersion) return;
  const value = config.whatsapp.cunnektApiVersion;
  if (value && value !== "legacy") {
    hasWarnedAboutDeprecatedApiVersion = true;
    logger.warn(
      `CUNNEKT_API_VERSION="${value}" is deprecated and ignored — Cunnekt only has one confirmed send API (POST {CUNNEKT_BASE_URL}/sendnotification). Remove this env var; it no longer selects any behavior.`,
    );
  }
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
 * Returned by getWhatsAppProvider() instead of a real send whenever
 * WHATSAPP_PROVIDER=cunnekt but CUNNEKT_API_KEY is missing/placeholder AND
 * COMMUNICATION_TEST_MODE is not explicitly true. A broken production
 * config must fail loudly (CONFIGURATION_ERROR, log marked FAILED) — it
 * must NEVER silently simulate a successful send via the dev provider.
 * Real dev-mode fake sends only happen through COMMUNICATION_TEST_MODE=true.
 */
export class MisconfiguredWhatsAppProvider implements WhatsAppProvider {
  name = "Misconfigured";

  constructor(private readonly reason: string) {}

  async testConnection(): Promise<boolean> {
    return false;
  }

  async sendTemplate(_input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    logger.error(`WhatsApp send blocked — ${this.reason}`);
    return {
      success: false,
      errorCode: "CONFIGURATION_ERROR",
      errorMessage: this.reason,
      isRetryable: false,
    };
  }
}

/**
 * Cunnekt WhatsApp Business API client.
 *
 * CUNNEKT_BASE_URL is the *full* base as shown on Cunnekt's own dashboard
 * ("API Setting" page), which already includes the version segment, e.g.
 * `https://app2.cunnekt.com/v1`. Endpoint paths below are appended directly
 * to that base, not re-prefixed with their own version segment.
 *
 * CONFIRMED against Cunnekt's real "Template Sending API" documentation
 * (plain, with-variables, with-media-header, and carousel examples all
 * share this endpoint):
 *
 *   POST {baseUrl}/sendnotification
 *   headers: { "API-KEY": <key> }
 *   body:   { mobile, templateid }                          — no variables
 *           { mobile, templateid, template: { components } } — with variables
 *
 * `template.components` is an array of `{ type, parameters }` blocks:
 *   - `{ type: "body", parameters: [{ type: "text", text }, ...] }` fills
 *     `{{1}}, {{2}}, ...` in the template body, positionally.
 *   - `{ type: "header", parameters: [{ type: "image"|"document"|"video",
 *     image|document|video: { link, filename? } }] }` fills a media header
 *     — NOT implemented here (no current NotificationTemplate uses a media
 *     header); extend `buildRequest()`/`WhatsAppSendInput` if one is added.
 *   - Omit the `body` block entirely when the template has no body
 *     variables (per the docs); omit `template` entirely when there's
 *     nothing in it at all.
 *
 * `NotificationTemplate.providerTemplateName` is sent as `templateid`.
 *
 * A previously-guessed second "rest-v1" generation (`/restapi/whatsapp/...`,
 * a Meta-Cloud-API-style body) was removed — nothing across every real
 * Cunnekt doc seen supports it existing at all; it was never confirmed and
 * risked silently routing a real send into an endpoint that doesn't exist.
 * `CUNNEKT_API_VERSION` is now a no-op, kept only for `.env` compatibility.
 *
 * ⚠️ Success-response shape is still unconfirmed — Cunnekt's docs don't show
 * one. The Meta Cloud API shape (`messages[0].id`) is tried first as a best
 * guess, with fallbacks, and the full raw response is always logged/stored
 * so the real field can be identified from a live send.
 */
export class CunnektWhatsAppProvider implements WhatsAppProvider {
  name = "Cunnekt";

  private baseUrl = config.whatsapp.cunnektBaseUrl;
  private apiKey = config.whatsapp.cunnektApiKey;

  constructor() {
    // Secondary guard — getWhatsAppProvider() already checks isUsableKey()
    // before constructing this class, so this should be unreachable via
    // that path, but keeps direct instantiation safe too.
    if (!isUsableKey(this.apiKey)) {
      throw new Error(
        "Cunnekt API key missing or still a placeholder (CUNNEKT_API_KEY)",
      );
    }
    warnIfDeprecatedApiVersionSet();
  }

  /**
   * Cunnekt's confirmed docs (sendnotification + getmediafile) don't include
   * a health/connection-test endpoint — inventing one would violate the
   * "don't guess" rule, so this only confirms an API key is configured, not
   * that it's valid.
   */
  async testConnection(): Promise<boolean> {
    logger.warn(
      "Cunnekt API has no documented connection-test endpoint; testConnection() only confirms an API key is configured.",
    );
    return isUsableKey(this.apiKey);
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

    // CONFIRMED against Cunnekt's real "Template Sending API" docs (both the
    // plain and the with-media/variables samples). `template` is omitted
    // entirely when there's nothing to put in it (no header, no body
    // variables), matching the docs' plain `{ mobile, templateid }` example
    // exactly. No `overridebot` field — that was an earlier unconfirmed
    // guess, not part of the real payload.
    return {
      url: `${this.baseUrl}/sendnotification`,
      body: {
        mobile: input.to,
        templateid: input.templateId,
        ...(components.length > 0 ? { template: { components } } : {}),
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
      if (!isUsableKey(config.whatsapp.cunnektApiKey)) {
        // COMMUNICATION_TEST_MODE already won above — this is a real
        // (non-test) environment with no usable Cunnekt key. Fail clearly
        // instead of quietly falling back to a fake "sent".
        return new MisconfiguredWhatsAppProvider(
          "Cunnekt API key missing or still a placeholder (CUNNEKT_API_KEY) — set a real key from the Cunnekt dashboard",
        );
      }
      try {
        return new CunnektWhatsAppProvider();
      } catch (error: any) {
        return new MisconfiguredWhatsAppProvider(
          `Failed to initialize Cunnekt provider: ${error.message}`,
        );
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
