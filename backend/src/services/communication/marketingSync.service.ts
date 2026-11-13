import { Types } from "mongoose";
import User from "../../models/User";
import Order from "../../models/Order";
import Event from "../../models/Event";
import NewsletterSubscriber from "../../models/NewsletterSubscriber";
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationCategory,
  CommunicationStatus,
} from "../../models/index";
import { communicationQueue } from "../../config/queue";
import logger from "../../config/logger";
import { getEmailMarketingConfig } from "./emailMarketingConfig.service";
import { runCommunicationJob } from "./deliver.service";
import {
  CommunicationJobType,
  isInlineDeliveryAllowed,
} from "./communication.service";

/**
 * Contact sync to the email-marketing provider (Sender/Mailchimp). Deliberately
 * NOT built on dispatch(): that path needs a NotificationTemplate and applies
 * marketing gates (consent, admin "email notifications" toggle) that must never
 * block an unsubscribe — an opt-out always has to reach the provider.
 *
 * Callers own the consent decision for upserts (see syncUserToMarketing /
 * NewsletterService). Never throws: a provider or queue outage must not break
 * the user-facing request that triggered the sync.
 */
export type ContactSyncOp =
  | {
      action: "upsert";
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      tags?: string[];
      mergeFields?: Record<string, string>;
      userId?: string;
    }
  | { action: "unsubscribe"; email: string; userId?: string };

/**
 * Sync a registered user — ONLY with an explicit, verified opt-in
 * (User.marketingOptInAt + verified email + notifications.marketing not
 * switched off). Builds the full tag set from purchase history so the upsert
 * is authoritative. Safe to call from any trigger; no-op when not eligible.
 */
export async function syncUserToMarketing(userId: string): Promise<void> {
  try {
    const user = await User.findById(userId).select(
      "email firstName lastName phone role isEmailVerified marketingOptInAt preferences addresses",
    );
    if (
      !user ||
      !user.isEmailVerified ||
      !user.marketingOptInAt ||
      user.preferences?.notifications?.marketing === false
    ) {
      return;
    }

    const orders = await Order.find({
      userId: user._id,
      paymentStatus: "paid",
      status: { $ne: "refunded" },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("items.eventId createdAt")
      .lean();

    const eventIds = orders.flatMap((o: any) =>
      (o.items ?? []).map((i: any) => i.eventId),
    );
    const categories: string[] = eventIds.length
      ? await Event.distinct("category", { _id: { $in: eventIds } })
      : [];

    const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");
    const tags = [`role:${user.role}`];
    if (orders.length) tags.push("customer");
    for (const c of categories) if (c) tags.push(`booked:${slug(c)}`);

    const mergeFields: Record<string, string> = { ROLE: user.role };
    const city = (user.addresses?.find((a) => a.isDefault) ?? user.addresses?.[0])
      ?.city;
    if (city) mergeFields.CITY = city;
    if (orders[0]) {
      mergeFields.LAST_BOOKING = new Date((orders[0] as any).createdAt)
        .toISOString()
        .slice(0, 10);
    }

    await enqueueContactSync({
      action: "upsert",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      tags,
      mergeFields,
      userId: user._id.toString(),
    });
  } catch (error) {
    logger.error("syncUserToMarketing failed:", error);
  }
}

/** Queue a sync of an ACTIVE newsletter subscriber (caller guarantees active). */
export async function syncSubscriberToMarketing(s: {
  email: string;
  name?: string;
  city?: string;
  ageOfChildren?: string;
  tags?: string[];
}): Promise<void> {
  const mergeFields: Record<string, string> = {};
  if (s.city) mergeFields.CITY = s.city;
  if (s.ageOfChildren) mergeFields.CHILD_AGE = s.ageOfChildren;

  await enqueueContactSync({
    action: "upsert",
    email: s.email,
    firstName: s.name,
    tags: ["newsletter", ...(s.tags ?? [])],
    mergeFields,
  });
}

// ponytail: one backfill at a time per process; use a queue job if this must survive restarts.
let backfillRunning = false;

/**
 * Re-sync everyone with a valid consent basis: active newsletter subscribers
 * and verified users with an explicit opt-in. Idempotent (upserts). Returns
 * false if a run is already in progress.
 */
export function startMarketingBackfill(): boolean {
  if (backfillRunning) return false;
  backfillRunning = true;

  void (async () => {
    let subscribers = 0;
    let users = 0;
    try {
      for await (const s of NewsletterSubscriber.find({ isActive: true }).cursor()) {
        await syncSubscriberToMarketing(s);
        subscribers++;
      }
      for await (const u of User.find({
        marketingOptInAt: { $exists: true },
        isEmailVerified: true,
      })
        .select("_id")
        .cursor()) {
        await syncUserToMarketing(String(u._id));
        users++;
      }
      logger.info(`Marketing backfill queued ${subscribers} subscribers, ${users} users`);
    } catch (error) {
      logger.error("Marketing backfill failed:", error);
    } finally {
      backfillRunning = false;
    }
  })();

  return true;
}

/**
 * Propagate a registered user's opt-out. Skipped while they still have an
 * active newsletter subscription — that is a separate, still-valid consent.
 */
export async function unsubscribeUserFromMarketing(user: {
  _id: unknown;
  email: string;
}): Promise<void> {
  try {
    if (await NewsletterSubscriber.exists({ email: user.email.toLowerCase(), isActive: true })) {
      return;
    }
    await enqueueContactSync({
      action: "unsubscribe",
      email: user.email,
      userId: String(user._id),
    });
  } catch (error) {
    logger.error("unsubscribeUserFromMarketing failed:", error);
  }
}

export async function enqueueContactSync(op: ContactSyncOp): Promise<void> {
  try {
    const email = op.email.trim().toLowerCase();
    const { provider } = await getEmailMarketingConfig();
    const { action, email: _e, userId, ...vars } = op;

    const log = await CommunicationLog.create({
      channel: CommunicationChannel.EMAIL_MARKETING,
      provider,
      category: CommunicationCategory.MARKETING,
      templateKey: `contact-sync:${action}`,
      recipientEmail: email,
      userId: userId && Types.ObjectId.isValid(userId) ? userId : undefined,
      vars: { action, ...vars },
      status: CommunicationStatus.QUEUED,
      // Every op is its own row; upserts are idempotent at the provider.
      idempotencyKey: `contact-sync:${action}:${email}:${new Types.ObjectId()}`,
    });

    const jobData = {
      logId: log._id.toString(),
      jobType: CommunicationJobType.EMAIL_MARKETING_SYNC,
      to: email,
      templateKey: log.templateKey!,
      providerTemplateName: "",
      languageCode: "en",
      vars: {},
    };

    if (communicationQueue) {
      await communicationQueue.add(jobData.jobType, jobData);
    } else if (isInlineDeliveryAllowed()) {
      await runCommunicationJob(jobData, { allowThrowOnRetryable: false });
    } else {
      log.status = CommunicationStatus.FAILED;
      log.errorCode = "QUEUE_DISABLED";
      log.errorMessage = "Communication queue is disabled (Redis unavailable)";
      log.failedAt = new Date();
      await log.save();
    }
  } catch (error) {
    logger.error("Email marketing sync enqueue failed:", error);
  }
}
