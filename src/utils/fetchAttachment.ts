import axios from "axios";
import logger from "../config/logger";

// Allowlisted Cloudinary CDN hostname — the only host we will fetch from.
const ALLOWED_FETCH_HOSTNAME = "res.cloudinary.com";

/**
 * Validate that a URL is safe to fetch for use as an email attachment.
 * Rejects anything that isn't an https:// URL from the Cloudinary CDN hostname.
 * This prevents SSRF if a stored URL is ever tampered with.
 */
function isSafeCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === ALLOWED_FETCH_HOSTNAME
    );
  } catch {
    return false;
  }
}

/**
 * Fetch a remote file (Cloudinary CDN only) into a Buffer for use as an email attachment.
 * Returns null on any error, disallowed URL, or if the file exceeds maxBytes — never throws.
 * Callers must treat null as "skip this attachment" and keep the email flowing.
 */
export async function fetchFileAsBuffer(
  url: string,
  maxBytes: number,
): Promise<Buffer | null> {
  if (!url) return null;

  // SSRF guard: only fetch from the Cloudinary CDN over HTTPS
  if (!isSafeCloudinaryUrl(url)) {
    logger.warn(
      `[fetchAttachment] Rejected non-Cloudinary URL (SSRF guard): ${url}`,
    );
    return null;
  }

  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 15_000, // 15s max per file
      maxContentLength: maxBytes,
      maxRedirects: 0, // No redirects — re-validation would be needed at each hop
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const buf = Buffer.from(response.data);

    if (buf.length > maxBytes) {
      logger.warn(
        `[fetchAttachment] File too large after download (${buf.length} > ${maxBytes} bytes): ${url}`,
      );
      return null;
    }

    return buf;
  } catch (err: any) {
    logger.warn(
      `[fetchAttachment] Failed to fetch attachment from ${url}: ${err?.message || err}`,
    );
    return null;
  }
}
