import { Response } from "express";

// Types a browser executes when opened directly (SVG can carry <script>).
const ACTIVE_CONTENT = /svg|xml|html/i;

/**
 * Uploaded files are served from the API origin. For active content, add a
 * sandboxing CSP so an embedded script can't run there; <img> embeds still
 * render. Not applied to PDFs: Chrome refuses to render sandboxed PDFs.
 * Returns true when applied.
 */
export const sandboxIfActiveContent = (res: Response, contentType: string): boolean => {
  if (!ACTIVE_CONTENT.test(contentType)) return false;
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return true;
};
