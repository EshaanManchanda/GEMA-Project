import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import logger from "../config/logger";
import { config } from "../config/env";
import { processCunnektWebhookEvent } from "../services/communication/providers/whatsapp.provider";

/**
 * ⚠️ BEST-EFFORT / UNVERIFIED — Cunnekt's real webhook auth scheme is not
 * confirmed. Assumed: a shared secret sent via header
 * `x-cunnekt-webhook-secret` (NOT HMAC signing, since Cunnekt's public docs
 * don't describe a signing key). Deliberately header-only — a query-string
 * secret would leak into access logs/proxies/browser history.
 * TODO(cunnekt): confirm actual header name / signing scheme and replace
 * this comparison with the real verification once docs/credentials exist.
 */
function isValidWebhookSecret(provided: string | undefined): boolean {
  const expected = config.whatsapp.cunnektWebhookSecret;
  if (!expected || !provided || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export const handleCunnektWebhook = async (req: Request, res: Response) => {
  const provided = req.headers["x-cunnekt-webhook-secret"] as
    | string
    | undefined;

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
