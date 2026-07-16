import cron from "node-cron";
import mongoose from "mongoose";
import { collectionSyncQueue, areQueuesEnabled } from "../config/queue";
import logger from "../config/logger";
import PayoutService from "../services/payout.service";
import CommissionService from "../services/commission.service";
import subscriptionService from "../services/subscription.service";
import Event from "../models/Event";
import AdminRevenueSettings, {
  PayoutFrequency,
} from "../models/AdminRevenueSettings";

// Placeholder actor id for cron-generated records with no human admin —
// mirrors the SYSTEM_USER_ID convention used by scripts/migrate-cloudinary-assets.ts.
// Mongoose refs are not FK-enforced, so this is safe even though no User doc exists
// with this id; admin UI should display it as "System" when populate returns null.
const SYSTEM_ACTOR_ID = new mongoose.Types.ObjectId("000000000000000000000000");

/**
 * Collection reconciliation cron job
 * Runs daily at 3 AM UTC to ensure all collections are in sync
 */
export function startCollectionReconciliationCron() {
  if (!areQueuesEnabled || !collectionSyncQueue) {
    logger.warn(
      "Collection reconciliation cron disabled (queues not available)",
    );
    return null;
  }

  // Run daily at 3 AM UTC
  const job = cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        logger.info("Starting scheduled collection reconciliation");

        await collectionSyncQueue.add(
          "reconcileAll",
          { type: "reconcileAll" },
          {
            jobId: `reconcile-all-${Date.now()}`,
            removeOnComplete: true,
            attempts: 2, // Reduced from 3 to 2 (reconciliation is idempotent)
            backoff: {
              type: "exponential",
              delay: 60000, // 1 minute initial delay
            },
          },
        );

        logger.info("Queued collection reconciliation job");
      } catch (error) {
        logger.error("Error scheduling collection reconciliation:", error);
      }
    },
    {
      timezone: "UTC",
    },
  );

  logger.info("Collection reconciliation cron started (daily at 3 AM UTC)");
  return job;
}

/**
 * Payout eligibility cron — runs hourly.
 * Processes transactions past the admin-configured payout hold window
 * (AdminRevenueSettings.payoutHoldHours, default 24h). No-ops when
 * payoutFrequency is "monthly" — settlement is handled by
 * startMonthlyPayoutBatchCron instead. See PayoutService.processPendingEligiblePayouts.
 */
export function startPayoutEligibilityCron() {
  const job = cron.schedule(
    "0 * * * *",
    async () => {
      try {
        logger.info("Running payout eligibility check");
        await PayoutService.processPendingEligiblePayouts();
      } catch (error) {
        logger.error("Payout eligibility cron failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  logger.info("Payout eligibility cron started (hourly)");
  return job;
}

/**
 * Scheduled bank payout cron — runs daily at 6 AM UTC.
 * Creates Payout request docs for bank-scheduled vendors.
 */
export function startScheduledPayoutCron() {
  const job = cron.schedule(
    "0 6 * * *",
    async () => {
      try {
        logger.info("Running scheduled bank payout processing");
        await PayoutService.processScheduledBankPayouts();
      } catch (error) {
        logger.error("Scheduled payout cron failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  logger.info("Scheduled bank payout cron started (daily at 6 AM UTC)");
  return job;
}

/**
 * Commission backfill cron — runs every hour at :30.
 * Safety net for the webhook path (payment.service.ts handlePaymentSucceeded
 * calls commission.service directly on payment success — this should normally
 * find nothing). Finds paid orders past the admin-configured payout hold
 * window with no CommissionTransaction and creates both CommissionTransaction
 * and RevenueTransaction for each.
 */
export function startCommissionBackfillCron() {
  const job = cron.schedule(
    "30 * * * *",
    async () => {
      try {
        const result = await CommissionService.processUncommissionedOrders();
        if (result.processed > 0 || result.failed > 0) {
          logger.info(
            `Commission backfill: processed=${result.processed}, failed=${result.failed}`,
          );
        }
      } catch (error) {
        logger.error("Commission backfill cron failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  logger.info("Commission backfill cron started (every hour at :30)");
  return job;
}

/**
 * Subscription expiry safety-net cron — runs every hour.
 * Catches expired vendor subscriptions that Stripe webhooks may have missed.
 * Stripe webhooks are the primary path; this is the fallback to prevent
 * subscriptions staying active forever on webhook failure.
 */
export function startSubscriptionExpiryCron() {
  const job = cron.schedule(
    "0 * * * *",
    async () => {
      try {
        await subscriptionService.processExpiredSubscriptions();
      } catch (error) {
        logger.error("Subscription expiry cron failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  logger.info("Subscription expiry cron started (hourly)");
  return job;
}

/**
 * Promotion expiry cron — runs daily at midnight UTC.
 * Clears promotionTier, featuredUntil, promotionPaidAt from expired events
 * and resets isFeatured to false.
 */
export function startPromotionExpiryCron() {
  const job = cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        logger.info("Running promotion expiry cleanup");
        const result = await Event.updateMany(
          {
            featuredUntil: { $lt: new Date() },
            promotionTier: { $exists: true },
          },
          {
            $unset: {
              promotionTier: "",
              featuredUntil: "",
              promotionPaidAt: "",
            },
            $set: { isFeatured: false },
          },
        );
        logger.info(`Promotion expiry: cleared ${result.modifiedCount} events`);
      } catch (error) {
        logger.error("Promotion expiry cron failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  logger.info("Promotion expiry cron started (daily at midnight UTC)");
  return job;
}

/**
 * Monthly payout batch cron — runs daily at 7 AM UTC, but only acts when
 * AdminRevenueSettings.payoutFrequency === "monthly" AND today's date matches
 * monthlyPayoutDay. Generates DRAFT VendorPayoutBatch docs for the previous
 * full calendar month via PayoutService.generateMonthlyPayoutBatches().
 *
 * Never auto-approves or auto-marks-paid — batches always land in DRAFT for
 * admin review, regardless of autoPayoutEnabled (that flag is reserved for a
 * future fully-automated flow and is not read here).
 */
export function startMonthlyPayoutBatchCron() {
  const job = cron.schedule(
    "0 7 * * *",
    async () => {
      try {
        const settings = await AdminRevenueSettings.getCurrentSettings();
        if (!settings || settings.payoutFrequency !== PayoutFrequency.MONTHLY) {
          return;
        }

        const monthlyPayoutDay = (settings as any).monthlyPayoutDay ?? 5;
        const now = new Date();
        if (now.getDate() !== monthlyPayoutDay) {
          return;
        }

        const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const periodEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );

        logger.info(
          `Generating monthly payout batches for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
        );
        const result = await PayoutService.generateMonthlyPayoutBatches(
          periodStart,
          periodEnd,
          SYSTEM_ACTOR_ID,
        );
        logger.info(
          `Monthly payout batch cron: created=${result.created.length}, skipped=${result.skipped.length}`,
        );
      } catch (error) {
        logger.error("Monthly payout batch cron failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  logger.info(
    "Monthly payout batch cron started (daily at 7 AM UTC, gated by payoutFrequency + monthlyPayoutDay)",
  );
  return job;
}
