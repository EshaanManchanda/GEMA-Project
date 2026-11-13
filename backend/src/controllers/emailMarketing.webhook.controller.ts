import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import { safeEqual } from "../utils/safeCompare";
import User from "../models/User";
import NewsletterSubscriber from "../models/NewsletterSubscriber";
import { getEmailMarketingConfig } from "../services/communication/emailMarketingConfig.service";

/**
 * Inbound opt-outs from Sender/Mailchimp (someone clicked "unsubscribe" in a
 * campaign, or the address hard-bounced / was cleaned). Kidrove must mirror
 * these locally or its next sync would quietly resubscribe the person.
 *
 * Auth: neither provider signs webhooks, so — like Cunnekt — the shared secret
 * is a path segment of the URL registered with the provider:
 *   /api/webhooks/email-marketing/:provider/:secret
 * (server.ts redacts it from access logs; csrf.ts exempts the prefix).
 */
function secretMatches(provided: string | undefined, expected: string): boolean {
  return safeEqual(provided, expected);
}

interface OptOutEvent {
  email: string;
  reason: string;
}

/** Mailchimp posts form data: type=unsubscribe|cleaned, data[email], data[reason]. */
function parseMailchimp(body: any): OptOutEvent | null {
  const type = String(body?.type ?? "");
  const email = body?.data?.email;
  if ((type === "unsubscribe" || type === "cleaned") && email) {
    return { email, reason: `mailchimp:${type}:${body.data.reason ?? ""}` };
  }
  return null;
}

/**
 * TODO(sender): payload shape unverified against a live account. Parsed
 * tolerantly: any event name that mentions unsubscribe/bounce/spam counts.
 */
function parseSender(body: any): OptOutEvent | null {
  const event = String(body?.event ?? body?.type ?? body?.topic ?? "");
  const email = body?.data?.email ?? body?.email ?? body?.subscriber?.email;
  if (email && /unsubscri|bounc|spam|complain/i.test(event)) {
    return { email, reason: `sender:${event}` };
  }
  return null;
}

async function applyOptOut({ email, reason }: OptOutEvent): Promise<void> {
  const lower = String(email).trim().toLowerCase();

  const subscriber = await NewsletterSubscriber.findOne({
    email: lower,
    isActive: true,
  });
  // Local-only: the provider already knows, so no outbound sync (no echo loop).
  if (subscriber) await subscriber.unsubscribe(reason);

  await User.updateOne(
    { email: lower },
    {
      $unset: { marketingOptInAt: 1 },
      $set: { "preferences.notifications.marketing": false },
    },
  );
}

export const handleEmailMarketingWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { provider, secret } = req.params;
    const cfg = await getEmailMarketingConfig();

    const expected =
      provider === "mailchimp"
        ? cfg.mailchimpWebhookSecret
        : provider === "sender"
          ? cfg.senderWebhookSecret
          : "";
    if (!secretMatches(secret, expected)) {
      logger.warn(`Email marketing webhook rejected (${provider}): bad secret`);
      return res.status(401).json({ received: false });
    }

    const event =
      provider === "mailchimp" ? parseMailchimp(req.body) : parseSender(req.body);
    // Subscribes/profile updates/etc. need no action here — Kidrove is the source of truth.
    if (event) await applyOptOut(event);

    // 200 only after the opt-out is persisted; a failure falls through to the
    // error handler (5xx) so the provider can retry rather than lose it.
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

/** Mailchimp GETs the URL when the webhook is registered and expects a 200. */
export const pingEmailMarketingWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { provider, secret } = req.params;
    const cfg = await getEmailMarketingConfig();
    const expected =
      provider === "mailchimp"
        ? cfg.mailchimpWebhookSecret
        : provider === "sender"
          ? cfg.senderWebhookSecret
          : "";
    if (!secretMatches(secret, expected)) return res.status(401).end();
    return res.status(200).json({ ok: true });
  } catch (error) {
    // Express 4 doesn't catch async throws: without this the request would hang.
    next(error);
  }
};
