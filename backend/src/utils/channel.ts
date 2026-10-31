/**
 * Visitor attribution helpers shared by the public tracking endpoints and
 * sign-up. Everything here receives client-supplied values — callers pass the
 * raw body field, these functions do the type/length checks.
 */

export const CHANNELS = [
  "paid",
  "organic_search",
  "social",
  "whatsapp",
  "email",
  "referral",
  "direct",
] as const;
export type Channel = (typeof CHANNELS)[number];

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPath?: string;
  paidClick?: boolean;
}

export const str = (v: unknown, max = 200): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

/** Pull a validated attribution object out of an untrusted request body field. */
export const parseAttribution = (raw: unknown): Attribution => {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    utmSource: str(a.utmSource, 100)?.toLowerCase(),
    utmMedium: str(a.utmMedium, 100)?.toLowerCase(),
    utmCampaign: str(a.utmCampaign, 150),
    referrer: str(a.referrer, 500),
    landingPath: str(a.landingPath, 500),
    paidClick: a.paidClick === true,
  };
};

const host = (url?: string): string => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia)\./;
const SOCIAL =
  /(^|\.)(facebook|fb|instagram|tiktok|twitter|x|t|linkedin|lnkd|pinterest|snapchat|youtube|reddit|threads)\.(com|co|in|net|me)$/;
const WHATSAPP = /(^|\.)(whatsapp\.com|wa\.me)$/;
const MAIL = /(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/;

/**
 * Bucket a visit into a marketing channel. UTM tags win over the referrer
 * because shared links (WhatsApp, email) usually arrive with no referrer.
 * `ownHost` keeps internal navigation from counting as a referral.
 */
export const classifyChannel = (a: Attribution, ownHost = ""): Channel => {
  const src = a.utmSource ?? "";
  const med = a.utmMedium ?? "";
  if (a.paidClick || /^(cpc|ppc|paid|paidsocial|paid_social|display|cpm)$/.test(med)) return "paid";
  if (/whatsapp/.test(src) || med === "whatsapp") return "whatsapp";
  if (med === "email" || med === "newsletter" || /mail|newsletter/.test(src)) return "email";
  if (med === "social" || /^(facebook|fb|instagram|ig|tiktok|twitter|x|linkedin|snapchat|youtube)$/.test(src)) return "social";
  if (med === "organic") return "organic_search";

  const h = host(a.referrer);
  if (!h || (ownHost && (h === ownHost || h.endsWith(`.${ownHost}`)))) {
    return src ? "referral" : "direct";
  }
  if (WHATSAPP.test(h)) return "whatsapp";
  if (MAIL.test(h)) return "email";
  if (SEARCH.test(h)) return "organic_search";
  if (SOCIAL.test(h) || h === "l.facebook.com" || h === "lm.facebook.com") return "social";
  return "referral";
};

/** Our own frontend host, so internal navigation never counts as a referral. */
export const OWN_HOST = (() => {
  try {
    return new URL(process.env.FRONTEND_URL || "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
})();

/** First-touch attribution saved on a new User; undefined when nothing was sent. */
export const toAcquisition = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return undefined;
  const a = parseAttribution(raw);
  return {
    visitorId: str((raw as Record<string, unknown>).visitorId, 100),
    channel: classifyChannel(a, OWN_HOST),
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    referrer: a.referrer,
    landingPath: a.landingPath,
    at: new Date(),
  };
};

export type Device = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

export const parseUserAgent = (ua: string) => {
  const device: Device = !ua
    ? "unknown"
    : /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(ua)
      ? "bot"
      : /tablet|ipad/i.test(ua)
        ? "tablet"
        : /mobile|android|iphone/i.test(ua)
          ? "mobile"
          : "desktop";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /samsungbrowser/i.test(ua)
        ? "Samsung Internet"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /chrome|crios/i.test(ua)
            ? "Chrome"
            : /safari/i.test(ua)
              ? "Safari"
              : "Other";
  const os = /iphone|ipad|ipod/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os x|macintosh/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "Other";
  return { device, browser, os };
};
