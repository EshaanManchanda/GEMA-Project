import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import logger from "../config/logger";
import { config } from "../config/env";
import { processCunnektWebhookEvent } from "../services/communication/providers/whatsapp.provider";

/**
 * Cunnekt's docs describe no request signing or secret header — the "API
 * Setting" page just takes a Webhook URL to call, with no way to configure
 * outbound headers on their side. So the shared secret is embedded as a path
 * segment in the URL registered with Cunnekt (`/api/webhooks/cunnekt/:secret`).
 *
 * ⚠️ A URL-embedded secret lands in access logs the same as a query string
 * would (a path segment gets no special treatment) — this is a known,
 * accepted tradeoff given Cunnekt offers no header-based alternative.
 * Mitigations in place: `morgan.token("url", ...)` in server.ts redacts this
 * path before it reaches app-level logs; comparison below is constant-time
 * (`timingSafeEqual`) so timing can't leak the secret byte-by-byte. Still
 * exposed: any reverse proxy (nginx/etc.) sitting in front of this app logs
 * its own access log independently — redact this path there too, and rotate
 * `CUNNEKT_WEBHOOK_SECRET` if that hasn't been done.
 */
function isValidWebhookSecret(provided: string | undefined): boolean {
  const expected = config.whatsapp.cunnektWebhookSecret;
  if (!expected || !provided || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export const handleCunnektWebhook = async (req: Request, res: Response) => {
  const provided = req.params.secret;

  if (!isValidWebhookSecret(provided)) {
    logger.warn("Cunnekt webhook rejected: secret mismatch or not configured");
    return res.status(401).json({ received: false });
  }

  // Ack fast — Cunnekt should not retry on our processing time/errors.
  res.status(200).json({ received: true });

  let payload: any;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch (error) {
    logger.error("Cunnekt webhook: failed to parse raw body", error);
    return;
  }

  processCunnektWebhookEvent(payload).catch((error) => {
    logger.error("Cunnekt webhook: async processing error", error);
  });
};
