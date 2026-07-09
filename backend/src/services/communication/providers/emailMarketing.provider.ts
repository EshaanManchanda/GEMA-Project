import logger from "../../../config/logger";
import { config } from "../../../config/env";

export interface EmailMarketingContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  listId?: string;
}

export interface EmailMarketingSyncResult {
  success: boolean;
  providerContactId?: string;
  errorCode?: string;
  errorMessage?: string;
  isRetryable?: boolean;
  raw?: any;
}

export interface EmailMarketingProvider {
  name: string;
  testConnection(): Promise<boolean>;
  upsertContact(
    input: EmailMarketingContactInput,
  ): Promise<EmailMarketingSyncResult>;
  unsubscribeContact(email: string): Promise<EmailMarketingSyncResult>;
  addTags(email: string, tags: string[]): Promise<EmailMarketingSyncResult>;
  removeTags(email: string, tags: string[]): Promise<EmailMarketingSyncResult>;
}

/**
 * Logs the operation instead of calling a real API. Used whenever
 * EMAIL_MARKETING_PROVIDER=dev or COMMUNICATION_TEST_MODE=true.
 */
export class DevEmailMarketingProvider implements EmailMarketingProvider {
  name = "Development";

  async testConnection(): Promise<boolean> {
    return true;
  }

  async upsertContact(
    input: EmailMarketingContactInput,
  ): Promise<EmailMarketingSyncResult> {
    logger.info("📧 Email marketing upsertContact (Development Mode):", input);
    return { success: true, providerContactId: `dev-contact-${Date.now()}` };
  }

  async unsubscribeContact(email: string): Promise<EmailMarketingSyncResult> {
    logger.info("📧 Email marketing unsubscribe (Development Mode):", email);
    return { success: true };
  }

  async addTags(
    email: string,
    tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    logger.info("📧 Email marketing addTags (Development Mode):", email, tags);
    return { success: true };
  }

  async removeTags(
    email: string,
    tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    logger.info(
      "📧 Email marketing removeTags (Development Mode):",
      email,
      tags,
    );
    return { success: true };
  }
}

/**
 * Sender.net contact/audience client.
 *
 * ⚠️ BEST-EFFORT / UNVERIFIED — built from Sender's publicly documented REST
 * shape without a live account or API reference in hand. Every assumption
 * below is marked TODO; confirm each against the real Sender API docs
 * (https://api.sender.net) before any real sync:
 *
 *   TODO(sender): confirm base URL / version (assumed https://api.sender.net/v2)
 *   TODO(sender): confirm auth header (assumed `Authorization: Bearer <SENDER_API_KEY>`)
 *   TODO(sender): confirm subscriber upsert endpoint + body shape (assumed POST /subscribers)
 *   TODO(sender): confirm custom-field keys ("phone", "tags") exist on the account
 *   TODO(sender): confirm unsubscribe endpoint/method (assumed PATCH /subscribers/:email)
 *   TODO(sender): confirm which HTTP statuses are transient (assumed 429/5xx = retryable)
 */
export class SenderProvider implements EmailMarketingProvider {
  name = "Sender";

  private baseUrl = "https://api.sender.net/v2";
  private apiKey = config.emailMarketing.senderApiKey;
  private listId = config.emailMarketing.senderListId;

  constructor() {
    if (!this.apiKey) {
      throw new Error("Sender credentials not configured (SENDER_API_KEY)");
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // TODO(sender): confirm a real health endpoint; using the groups list
      // endpoint as a proxy for "credentials are valid".
      const response = await fetch(`${this.baseUrl}/groups`, {
        method: "GET",
        headers: this.headers(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async upsertContact(
    input: EmailMarketingContactInput,
  ): Promise<EmailMarketingSyncResult> {
    try {
      const response = await fetch(`${this.baseUrl}/subscribers`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          email: input.email,
          firstname: input.firstName,
          lastname: input.lastName,
          groups: [input.listId || this.listId].filter(Boolean),
          fields: {
            phone: input.phone,
            tags: (input.tags || []).join(","),
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
            body?.message || `Sender upsert failed (${response.status})`,
          isRetryable,
          raw: body,
        };
      }

      return {
        success: true,
        providerContactId: body?.data?.id || body?.id,
        raw: body,
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: error.message || "Sender request failed",
        isRetryable: true,
      };
    }
  }

  async unsubscribeContact(email: string): Promise<EmailMarketingSyncResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscribers/${encodeURIComponent(email)}`,
        {
          method: "PATCH",
          headers: this.headers(),
          body: JSON.stringify({ subscription_status: "unsubscribed" }),
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        return {
          success: false,
          errorCode: `HTTP_${response.status}`,
          errorMessage:
            body?.message || `Sender unsubscribe failed (${response.status})`,
          isRetryable,
          raw: body,
        };
      }

      return { success: true, raw: body };
    } catch (error: any) {
      return {
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: error.message || "Sender request failed",
        isRetryable: true,
      };
    }
  }

  async addTags(
    email: string,
    tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    // TODO(sender): Sender's audience model is group-based, not free-form
    // tags — this re-upserts the contact with tags folded into a custom
    // field rather than calling a dedicated tagging endpoint.
    return this.upsertContact({ email, tags });
  }

  async removeTags(
    email: string,
    _tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    return this.upsertContact({ email, tags: [] });
  }
}

/**
 * Selects the email-marketing provider from env. COMMUNICATION_TEST_MODE
 * always wins — real credentials present locally never result in a real sync.
 */
export function getEmailMarketingProvider(): EmailMarketingProvider {
  if (config.communication.testMode) {
    return new DevEmailMarketingProvider();
  }

  switch (config.emailMarketing.provider.toLowerCase()) {
    case "sender":
      try {
        return new SenderProvider();
      } catch (error: any) {
        logger.error(
          `Failed to initialize Sender provider, falling back to dev: ${error.message}`,
        );
        return new DevEmailMarketingProvider();
      }

    case "dev":
    case "development":
    default:
      return new DevEmailMarketingProvider();
  }
}
