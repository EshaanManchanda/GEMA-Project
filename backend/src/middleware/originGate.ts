import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

// Safe methods (GET/HEAD/OPTIONS) are allowed for health checks, curl, monitoring.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Server-to-server callers (Stripe, Cunnekt, Sender/Mailchimp) never send an
// Origin header. They prove who they are another way (Stripe signature, secret
// in the path), so this browser-only gate must not apply to them. Keep this in
// step with the raw-body mounts in bodyParsers.ts and routes/index.ts.
const ORIGINLESS_WEBHOOKS = /^\/api\/(payments\/webhook(\/|$)|webhooks\/)/;

/**
 * Block state-changing requests that arrive with no Origin header. Browsers
 * always send one on cross-site writes, so a request without it has no
 * legitimate browser use-case.
 */
export const requireOriginForStateChanges =
  ({ enforce }: { enforce: boolean }) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (
      enforce &&
      !req.headers.origin &&
      !SAFE_METHODS.has(req.method) &&
      !ORIGINLESS_WEBHOOKS.test(req.path)
    ) {
      logger.warn("[CORS] Blocked no-origin state-changing request in production", {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    next();
  };
