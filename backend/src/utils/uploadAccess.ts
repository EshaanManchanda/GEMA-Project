/**
 * Access rules for files served from the local upload folder (GET /api/uploads/files/*).
 * Private files (certificates, booking attachments, ...) are fetched by their owner, an admin, or
 * through a server-signed expiring link, never anonymously. See routes/upload.routes.ts.
 */
import crypto from "crypto";
import path from "path";
import { config } from "../config/env";

// ponytail: an explicit private list, not a public allowlist, because the production upload folder
// is not inventoried yet (T3a on the server). Add a folder here when a new writer stores private
// files locally; switch to an allowlist once the server's folders are known.
const PRIVATE_CATEGORIES = new Set([
  "certificates",
  "booking-attachments",
  "registrations",
  "tickets",
  "documents",
]);

const DEFAULT_TTL_SECONDS = 7 * 24 * 3600;
const LOCAL_UPLOAD_URL =
  /^((?:https?:\/\/[^/?#]+)?\/api\/uploads\/files\/)([^?#]+)$/;

/** `rel` is the path under the upload folder, forward slashes, e.g. `certificates/a.pdf`. */
export const isPrivateUploadPath = (rel: string): boolean =>
  PRIVATE_CATEGORIES.has(rel.replace(/^\/+/, "").split("/")[0].toLowerCase());

// Derived from the JWT secret with a domain prefix so no new secret has to be provisioned and a
// signature can never be confused with anything else signed by that secret.
const mac = (rel: string, exp: number): string =>
  crypto
    .createHmac("sha256", config.jwtSecret)
    .update(`upload-link\n${rel}\n${exp}`)
    .digest("hex");

export function signUploadPath(
  rel: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  now: number = Date.now(),
): { exp: number; sig: string } {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return { exp, sig: mac(rel, exp) };
}

export function verifyUploadSignature(
  rel: string,
  exp: number,
  sig: string,
  now: number = Date.now(),
): boolean {
  if (!Number.isInteger(exp) || exp <= now / 1000) return false;
  if (typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  return crypto.timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(mac(rel, exp), "hex"),
  );
}

/**
 * Adds `?exp&sig` to a link to a private local upload (relative or absolute). Anything else
 * (public files, Cloudinary urls, empty values, odd paths) is returned unchanged.
 */
export function signedUploadUrl(
  url: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  now: number = Date.now(),
): string {
  const match = LOCAL_UPLOAD_URL.exec(url ?? "");
  if (!match) return url;
  const rel = match[2];
  if (path.posix.normalize(rel) !== rel || !isPrivateUploadPath(rel))
    return url;
  const { exp, sig } = signUploadPath(rel, ttlSeconds, now);
  return `${url}?exp=${exp}&sig=${sig}`;
}
