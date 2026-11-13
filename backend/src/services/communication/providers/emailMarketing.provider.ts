import { createHash } from "node:crypto";
import logger from "../../../config/logger";
import { config } from "../../../config/env";
import {
  getEmailMarketingConfig,
  type EmailMarketingConfig,
} from "../emailMarketingConfig.service";

/** e.g. "us21" — the datacenter part of a Mailchimp API key. */
export const MAILCHIMP_PREFIX_RE = /^[a-z]{2}\d{1,3}$/;
export const MAILCHIMP_AUDIENCE_RE = /^[a-z0-9]+$/i;

const retryable = (status: number) => status === 429 || status >= 500;

function httpFailure(
  what: string,
  status: number,
  body: any,
): EmailMarketingSyncResult {
  return {
    success: false,
    errorCode: `HTTP_${status}`,
    errorMessage: body?.message || body?.detail || `${what} failed (${status})`,
    isRetryable: retryable(status),
    raw: body,
  };
}

function networkFailure(error: any): EmailMarketingSyncResult {
  return {
    success: false,
    errorCode: "NETWORK_ERROR",
    errorMessage: error?.message || "Provider request failed",
    isRetryable: true,
  };
}

export interface EmailMarketingContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  listId?: string;
  /** CITY, CHILD_AGE, ROLE, LAST_BOOKING... Sender: `fields`; Mailchimp: `merge_fields`. */
  mergeFields?: Record<string, string>;
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
 * Sender.net client. Tags map to Sender *groups* (its segmentation model).
 *
 * UNVERIFIED against a live account — confirm before the first real sync:
 *   TODO(sender): base URL/auth (assumed https://api.sender.net/v2, Bearer key)
 *   TODO(sender): POST /subscribers upsert body (firstname/lastname/groups/fields)
 *   TODO(sender): POST /groups {title}, POST|DELETE /subscribers/groups/:id {subscribers:[email]}
 *   TODO(sender): unsubscribe (assumed PATCH /subscribers/:email {subscriber_status:"UNSUBSCRIBED"})
 *   TODO(sender): custom fields used in mergeFields must exist on the account
 */
export class SenderProvider implements EmailMarketingProvider {
  name = "Sender";

  private baseUrl = "https://api.sender.net/v2";
  private apiKey: string;
  private listId: string;
  private groupCache = new Map<string, string>(); // title -> id

  constructor(cfg: EmailMarketingConfig) {
    this.apiKey = cfg.senderApiKey;
    this.listId = cfg.senderListId;
    if (!this.apiKey) {
      throw new Error("Sender credentials not configured (SENDER_API_KEY)");
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async call(method: string, path: string, body?: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data: any = await response.json().catch(() => ({}));
    return { response, data };
  }

  /** Resolve group titles to ids, creating missing groups once. */
  private async groupIds(titles: string[]): Promise<string[]> {
    if (titles.some((t) => !this.groupCache.has(t))) {
      const { response, data } = await this.call("GET", "/groups");
      if (response.ok) {
        for (const g of data?.data ?? []) this.groupCache.set(g.title, g.id);
      }
    }
    const ids: string[] = [];
    for (const title of titles) {
      if (!this.groupCache.has(title)) {
        const { response, data } = await this.call("POST", "/groups", {
          title,
        });
        const id = data?.data?.id;
        if (response.ok && id) this.groupCache.set(title, id);
      }
      const id = this.groupCache.get(title);
      if (id) ids.push(id);
    }
    return ids;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { response } = await this.call("GET", "/groups");
      return response.ok;
    } catch {
      return false;
    }
  }

  async upsertContact(
    input: EmailMarketingContactInput,
  ): Promise<EmailMarketingSyncResult> {
    try {
      const tagIds = await this.groupIds(input.tags ?? []);
      const groups = [input.listId || this.listId, ...tagIds].filter(Boolean);
      const { response, data } = await this.call("POST", "/subscribers", {
        email: input.email,
        firstname: input.firstName,
        lastname: input.lastName,
        phone: input.phone,
        groups,
        fields: input.mergeFields,
      });
      if (!response.ok)
        return httpFailure("Sender upsert", response.status, data);
      return {
        success: true,
        providerContactId: data?.data?.id || data?.id,
        raw: data,
      };
    } catch (error) {
      return networkFailure(error);
    }
  }

  async unsubscribeContact(email: string): Promise<EmailMarketingSyncResult> {
    try {
      const { response, data } = await this.call(
        "PATCH",
        `/subscribers/${encodeURIComponent(email)}`,
        { subscriber_status: "UNSUBSCRIBED" },
      );
      if (!response.ok)
        return httpFailure("Sender unsubscribe", response.status, data);
      return { success: true, raw: data };
    } catch (error) {
      return networkFailure(error);
    }
  }

  async addTags(
    email: string,
    tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    return this.groupOp("POST", email, tags);
  }

  async removeTags(
    email: string,
    tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    return this.groupOp("DELETE", email, tags);
  }

  private async groupOp(
    method: "POST" | "DELETE",
    email: string,
    tags: string[],
  ): Promise<EmailMarketingSyncResult> {
    try {
      for (const id of await this.groupIds(tags)) {
        const { response, data } = await this.call(
          method,
          `/subscribers/groups/${encodeURIComponent(id)}`,
          { subscribers: [email] },
        );
        if (!response.ok)
          return httpFailure("Sender group update", response.status, data);
      }
      return { success: true };
    } catch (error) {
      return networkFailure(error);
    }
  }
}

/** Mailchimp Marketing API v3 over plain fetch (no SDK). */
export class MailchimpProvider implements EmailMarketingProvider {
  name = "Mailchimp";

  private apiKey: string;
  private audienceId: string;
  private baseUrl: string;

  constructor(cfg: EmailMarketingConfig) {
    this.apiKey = cfg.mailchimpApiKey;
    this.audienceId = cfg.mailchimpAudienceId;
    // Mailchimp keys end in "-us21"; the prefix can be derived from the key.
    const prefix =
      cfg.mailchimpServerPrefix || this.apiKey.split("-")[1] || "";
    if (!this.apiKey || !this.audienceId || !prefix) {
      throw new Error(
        "Mailchimp not configured (MAILCHIMP_API_KEY, MAILCHIMP_AUDIENCE_ID, MAILCHIMP_SERVER_PREFIX)",
      );
    }
    // The prefix becomes part of the hostname the API key is sent to, and the
    // audience id part of the path: both must be strictly validated so a bad
    // setting can never redirect the Authorization header to another host.
    if (!MAILCHIMP_PREFIX_RE.test(prefix)) {
      throw new Error("Invalid Mailchimp server prefix (expected e.g. us21)");
    }
    if (!MAILCHIMP_AUDIENCE_RE.test(this.audienceId)) {
      throw new Error("Invalid Mailchimp audience id");
    }
    this.baseUrl = `https://${prefix}.api.mailchimp.com/3.0`;
    if (new URL(this.baseUrl).hostname !== `${prefix}.api.mailchimp.com`) {
      throw new Error("Invalid Mailchimp server prefix");
    }
  }

  /** Mailchimp identifies members by md5(lowercase email). */
  static memberHash(email: string): string {
    return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  }

  private async call(method: string, path: string, body?: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data: any = await response.json().catch(() => ({}));
    return { response, data };
  }

  private memberPath(email: string) {
    return `/lists/${this.audienceId}/members/${MailchimpProvider.memberHash(email)}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { response } = await this.call("GET", "/ping");
      return response.ok;
    } catch {
      return false;
    }
  }

  async upsertContact(
    input: EmailMarketingContactInput,
  ): Promise<EmailMarketingSyncResult> {
    try {
      const merge_fields: Record<string, string> = { ...input.mergeFields };
      if (input.firstName) merge_fields.FNAME = input.firstName;
      if (input.lastName) merge_fields.LNAME = input.lastName;
      if (input.phone) merge_fields.PHONE = input.phone;

      const { response, data } = await this.call(
        "PUT",
        this.memberPath(input.email),
        {
          email_address: input.email,
          // New contacts only: an unsubscribed member is never silently resubscribed here.
          status_if_new: "subscribed",
          merge_fields,
          tags: input.tags,
        },
      );
      if (!response.ok)
        return httpFailure("Mailchimp upsert", response.status, data);
      return { success: true, providerContactId: data?.id, raw: data };
    } catch (error) {
      return networkFailure(error);
    }
  }

  async unsubscribeContact(email: string): Promise<EmailMarketingSyncResult> {
    try {
      const { response, data } = await this.call(
        "PATCH",
        this.memberPath(email),
        { status: "unsubscribed" },
      );
      // Not in the audience = nothing to unsubscribe.
      if (response.status === 404) return { success: true };
      if (!response.ok)
        return httpFailure("Mailchimp unsubscribe", response.status, data);
      return { success: true, raw: data };
    } catch (error) {
      return networkFailure(error);
    }
  }

  private async tagOp(
    email: string,
    tags: string[],
    status: "active" | "inactive",
  ): Promise<EmailMarketingSyncResult> {
    try {
      const { response, data } = await this.call(
        "POST",
        `${this.memberPath(email)}/tags`,
        { tags: tags.map((name) => ({ name, status })) },
      );
      if (!response.ok)
        return httpFailure("Mailchimp tag update", response.status, data);
      return { success: true, raw: data };
    } catch (error) {
      return networkFailure(error);
    }
  }

  addTags(email: string, tags: string[]) {
    return this.tagOp(email, tags, "active");
  }

  removeTags(email: string, tags: string[]) {
    return this.tagOp(email, tags, "inactive");
  }
}

/**
 * Selects the email-marketing provider from env. COMMUNICATION_TEST_MODE
 * always wins — real credentials present locally never result in a real sync.
 */
export async function getEmailMarketingProvider(): Promise<EmailMarketingProvider> {
  if (config.communication.testMode) {
    return new DevEmailMarketingProvider();
  }

  const cfg = await getEmailMarketingConfig();
  try {
    switch (cfg.provider) {
      case "sender":
        return new SenderProvider(cfg);
      case "mailchimp":
        return new MailchimpProvider(cfg);
      default:
        return new DevEmailMarketingProvider();
    }
  } catch (error: any) {
    logger.error(
      `Failed to initialize ${cfg.provider} provider, falling back to dev: ${error.message}`,
    );
    return new DevEmailMarketingProvider();
  }
}
