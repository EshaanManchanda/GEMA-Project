import logger from "../config/logger";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Explicitly reject these types — the /api/media/file/:uuid route returns a 200 OK
// SVG placeholder for missing/access-denied/Cloudinary-error assets, so a 200 status
// alone is NOT a reliable signal that the file is valid.
const REJECTED_MIME_PREFIXES = ["text/", "image/svg"];

function isMimeRejected(mime: string): boolean {
  return REJECTED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a remote URL into a nodemailer-compatible attachment object.
 *
 * Safe to use for any URL (including /api/media/file/:uuid which 302-redirects to
 * Cloudinary). Node's global `fetch` follows redirects automatically.
 *
 * Guarantees:
 *  - Retries up to 3 times on network/5xx errors (back-off: 1 s / 2 s / 4 s).
 *  - Rejects text/html and image/svg+xml (200 placeholder trap).
 *  - Rejects zero-byte and >10 MB payloads.
 *  - Logs size + content-type for every resolved attachment (useful for diagnosing
 *    future corruption: wrong type / zero-byte / failed download / oversized PDF).
 *  - Returns null on any failure — never throws, so callers stay non-blocking.
 *
 * Usage:
 *   const att = await downloadFileAsAttachment(pdfUrl, "Certificate-Jane-Doe.pdf", { expectedType: "application/pdf" });
 *   // in nodemailer: attachments: att ? [att] : undefined
 *
 * IMPORTANT: Never pass a remote URL to nodemailer's `path:` field.
 *            `path:` is for local filesystem paths only.
 */
export async function downloadFileAsAttachment(
  url: string,
  filename: string,
  opts: { expectedType?: string } = {},
): Promise<{ filename: string; content: Buffer; contentType: string } | null> {
  const MAX_RETRIES = 3;
  const DELAYS_MS = [1000, 2000, 4000];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        const msg = `HTTP ${response.status} ${response.statusText}`;
        if (attempt < MAX_RETRIES) {
          logger.warn(`[emailAttachment] fetch failed (attempt ${attempt}/${MAX_RETRIES}): ${msg}`, { url });
          await sleep(DELAYS_MS[attempt - 1]);
          continue;
        }
        logger.warn(`[emailAttachment] fetch failed after ${MAX_RETRIES} attempts: ${msg}`, { url, filename });
        return null;
      }

      const rawContentType = response.headers.get("content-type") || "";
      const contentType = rawContentType.split(";")[0].trim().toLowerCase();

      // Reject HTML / SVG — these are 200-placeholder responses, not real files
      if (isMimeRejected(contentType)) {
        logger.warn(`[emailAttachment] rejected MIME "${contentType}" (likely a placeholder/error page)`, {
          url,
          filename,
        });
        return null;
      }

      // Enforce expected type when specified (allow octet-stream as generic fallback)
      if (
        opts.expectedType &&
        contentType !== opts.expectedType &&
        contentType !== "application/octet-stream"
      ) {
        logger.warn(
          `[emailAttachment] unexpected MIME "${contentType}" (expected "${opts.expectedType}")`,
          { url, filename },
        );
        return null;
      }

      const content = Buffer.from(await response.arrayBuffer());

      if (content.length === 0) {
        logger.warn(`[emailAttachment] zero-byte response`, { url, filename });
        return null;
      }

      if (content.length > MAX_ATTACHMENT_BYTES) {
        logger.warn(
          `[emailAttachment] oversized (${content.length} bytes > ${MAX_ATTACHMENT_BYTES} limit)`,
          { url, filename },
        );
        return null;
      }

      const resolvedType = opts.expectedType || contentType || "application/octet-stream";
      logger.info(`[emailAttachment] resolved`, { url, filename, contentType: resolvedType, size: content.length });

      return { filename, content, contentType: resolvedType };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (attempt < MAX_RETRIES) {
        logger.warn(`[emailAttachment] network error (attempt ${attempt}/${MAX_RETRIES}): ${msg}`, { url });
        await sleep(DELAYS_MS[attempt - 1]);
      } else {
        logger.warn(`[emailAttachment] gave up after ${MAX_RETRIES} attempts: ${msg}`, { url, filename });
      }
    }
  }

  return null;
}

/**
 * Build a safe PDF filename from a human name and optional fallback serial/id.
 * Strips non-ASCII and shell-unsafe chars, collapses whitespace to hyphens, caps length.
 *
 * Examples:
 *   safePdfFilename("Jane Doe", "CERT-001")  → "Certificate-Jane-Doe.pdf"
 *   safePdfFilename("", "CERT-001")           → "Certificate-CERT-001.pdf"
 *   safePdfFilename("", "")                   → "Certificate.pdf"
 */
export function safePdfFilename(recipientName: string | undefined | null, fallback?: string | null): string {
  const name = (recipientName ?? "").replace(/[^a-zA-Z0-9 _\-]/g, "").replace(/\s+/g, "-").slice(0, 60);
  if (name) return `Certificate-${name}.pdf`;
  const fb = (fallback ?? "").replace(/[^a-zA-Z0-9 _\-]/g, "").replace(/\s+/g, "-").slice(0, 40);
  if (fb) return `Certificate-${fb}.pdf`;
  return "Certificate.pdf";
}
