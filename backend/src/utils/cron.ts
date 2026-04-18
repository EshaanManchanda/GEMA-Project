import cron from "node-cron";
import { collectionSyncQueue, areQueuesEnabled } from "../config/queue";
import logger from "../config/logger";
import PayoutService from "../modules/payouts/payout.service";
import CommissionService from "../modules/commissions/commission.service";
import { Event } from "../models/index";

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
 * Processes transactions past the 24hr refund window.
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
 * Finds paid orders past the 7-day refund window with no CommissionTransaction
 * and creates both CommissionTransaction and RevenueTransaction for each.
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
