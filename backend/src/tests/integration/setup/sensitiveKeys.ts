/**
 * Scanners for "no private data in public responses" tests.
 *
 * Two independent checks, because each catches what the other misses:
 *  - findSensitiveKeys: a key whose NAME marks private data, with a real value
 *  - vendorKeyViolations: an embedded vendor that carries any key outside the
 *    public allowlist, whatever the key is called
 * Tests should also look for seeded canary VALUES in the raw response text, which
 * catches private data that has been renamed or flattened.
 */

const EXACT = new Set(
  [
    "email", "phone", "contactPerson", "taxInformation", "taxId", "businessLicense",
    "taxCertificate", "verificationDocuments", "bankAccountDetails", "paymentSettings",
    "meetingLink", "meetingPassword", "bookingAttachments", "insuranceInfo", "leads",
    "ipAddress", "likedBy", "likedByIPs", "totalRevenue", "totalEarnings", "password",
    "userAgent",
  ].map((k) => k.toLowerCase()),
);
const PREFIX = /^(stripe|subscription|otp)/i;
const SUFFIX = /(token|secret|hash)$/i;

export const isSensitiveKey = (key: string) =>
  EXACT.has(key.toLowerCase()) || PREFIX.test(key) || SUFFIX.test(key);

/** Empty strings, null, empty arrays and empty objects carry nothing to leak. */
const hasValue = (v: unknown): boolean => {
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
};

/** Key paths (e.g. "data.events[0].vendorId.email") that are sensitive and non-empty. */
export function findSensitiveKeys(body: unknown): string[] {
  const hits: string[] = [];
  const visit = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => visit(n, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        const next = path ? `${path}.${k}` : k;
        if (isSensitiveKey(k) && hasValue(v)) hits.push(next);
        else visit(v, next);
      }
    }
  };
  visit(body, "");
  return hits;
}

/** The only vendor fields a public page may receive. */
export const PUBLIC_VENDOR_KEYS = new Set(["_id", "businessName", "logo", "slug", "description", "coverImage"]);

/** Paths of every key inside an embedded `vendorId` object that is not in PUBLIC_VENDOR_KEYS. */
export function vendorKeyViolations(body: unknown): string[] {
  const hits: string[] = [];
  const visit = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => visit(n, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        const next = path ? `${path}.${k}` : k;
        if (k === "vendorId" && v && typeof v === "object" && !Array.isArray(v)) {
          for (const inner of Object.keys(v)) if (!PUBLIC_VENDOR_KEYS.has(inner)) hits.push(`${next}.${inner}`);
        }
        visit(v, next);
      }
    }
  };
  visit(body, "");
  return hits;
}
