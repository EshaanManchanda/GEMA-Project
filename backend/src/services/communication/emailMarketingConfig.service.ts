import EmailMarketingSettings from "../../models/EmailMarketingSettings";
import { config } from "../../config/env";
import { decryptField, encryptField } from "../../utils/encryption";
import { AppError } from "../../middleware/error";

export type EmailMarketingProviderName = "dev" | "sender" | "mailchimp";

/** Fully-resolved (decrypted) config the provider adapters consume. */
export interface EmailMarketingConfig {
  provider: EmailMarketingProviderName;
  senderApiKey: string;
  senderListId: string;
  senderWebhookSecret: string;
  mailchimpApiKey: string;
  mailchimpServerPrefix: string;
  mailchimpAudienceId: string;
  mailchimpWebhookSecret: string;
}

const SECRET_FIELDS = [
  "senderApiKey",
  "senderWebhookSecret",
  "mailchimpApiKey",
  "mailchimpWebhookSecret",
] as const;
const PLAIN_FIELDS = [
  "senderListId",
  "mailchimpServerPrefix",
  "mailchimpAudienceId",
] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

const PROVIDERS: EmailMarketingProviderName[] = ["dev", "sender", "mailchimp"];

// ponytail: 30s in-process cache; a multi-instance deploy sees a change within 30s.
const TTL_MS = 30_000;
let cache: { at: number; value: EmailMarketingConfig } | null = null;

export function invalidateEmailMarketingConfig(): void {
  cache = null;
}

function safeDecrypt(value: string): string {
  try {
    return value ? decryptField(value) : "";
  } catch {
    return ""; // wrong/missing FIELD_ENCRYPTION_KEY → treat as unset, env fallback applies
  }
}

/** DB value wins when set; otherwise the env var. */
export async function getEmailMarketingConfig(): Promise<EmailMarketingConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const env = config.emailMarketing;
  const db = await EmailMarketingSettings.getSettings();
  const pick = (dbVal: string, envVal: string) => dbVal || envVal || "";

  const rawProvider = (db.provider || env.provider || "dev").toLowerCase();
  const value: EmailMarketingConfig = {
    provider: PROVIDERS.includes(rawProvider as EmailMarketingProviderName)
      ? (rawProvider as EmailMarketingProviderName)
      : "dev",
    senderApiKey: pick(safeDecrypt(db.senderApiKey), env.senderApiKey),
    senderListId: pick(db.senderListId, env.senderListId),
    senderWebhookSecret: pick(
      safeDecrypt(db.senderWebhookSecret),
      env.senderWebhookSecret,
    ),
    mailchimpApiKey: pick(safeDecrypt(db.mailchimpApiKey), env.mailchimpApiKey),
    mailchimpServerPrefix: pick(
      db.mailchimpServerPrefix,
      env.mailchimpServerPrefix,
    ),
    mailchimpAudienceId: pick(
      db.mailchimpAudienceId,
      env.mailchimpAudienceId,
    ),
    mailchimpWebhookSecret: pick(
      safeDecrypt(db.mailchimpWebhookSecret),
      env.mailchimpWebhookSecret,
    ),
  };
  cache = { at: Date.now(), value };
  return value;
}

export interface EmailMarketingSettingsView {
  provider: EmailMarketingProviderName;
  /** Where the active provider value comes from. */
  providerSource: "database" | "environment" | "default";
  plain: Record<(typeof PLAIN_FIELDS)[number], string>;
  /** Secrets are never returned — only whether one is set and where from. */
  secrets: Record<SecretField, { isSet: boolean; source: "database" | "environment" | "none" }>;
}

export async function getEmailMarketingSettingsView(): Promise<EmailMarketingSettingsView> {
  const db = await EmailMarketingSettings.getSettings();
  const resolved = await getEmailMarketingConfig();
  const env = config.emailMarketing;

  const secrets = {} as EmailMarketingSettingsView["secrets"];
  for (const f of SECRET_FIELDS) {
    secrets[f] = db[f]
      ? { isSet: true, source: "database" }
      : env[f]
        ? { isSet: true, source: "environment" }
        : { isSet: false, source: "none" };
  }

  return {
    provider: resolved.provider,
    providerSource: db.provider
      ? "database"
      : env.provider
        ? "environment"
        : "default",
    plain: {
      senderListId: resolved.senderListId,
      mailchimpServerPrefix: resolved.mailchimpServerPrefix,
      mailchimpAudienceId: resolved.mailchimpAudienceId,
    },
    secrets,
  };
}

export interface EmailMarketingSettingsPatch {
  provider?: string;
  senderListId?: string;
  mailchimpServerPrefix?: string;
  mailchimpAudienceId?: string;
  /** Omitted/empty = keep current. A string = replace. `null` = clear (revert to env). */
  senderApiKey?: string | null;
  senderWebhookSecret?: string | null;
  mailchimpApiKey?: string | null;
  mailchimpWebhookSecret?: string | null;
}

export async function saveEmailMarketingSettings(
  patch: EmailMarketingSettingsPatch,
): Promise<EmailMarketingSettingsView> {
  const db = await EmailMarketingSettings.getSettings();

  if (patch.provider !== undefined) {
    const p = String(patch.provider).toLowerCase();
    if (p && !PROVIDERS.includes(p as EmailMarketingProviderName)) {
      throw new AppError("provider must be dev, sender or mailchimp", 400);
    }
    db.provider = p as any;
  }
  for (const f of PLAIN_FIELDS) {
    if (patch[f] !== undefined) db[f] = String(patch[f]).trim();
  }
  for (const f of SECRET_FIELDS) {
    const v = patch[f];
    if (v === null) {
      db[f] = "";
    } else if (typeof v === "string" && v.trim()) {
      try {
        db[f] = encryptField(v.trim());
      } catch (e: any) {
        throw new AppError(
          e.message || "Cannot encrypt secret (FIELD_ENCRYPTION_KEY missing)",
          400,
        );
      }
    }
  }

  await db.save();
  invalidateEmailMarketingConfig();
  return getEmailMarketingSettingsView();
}
