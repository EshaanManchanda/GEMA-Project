import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  areQueuesEnabled,
} from "../config/queue";
import logger from "../config/logger";
import PayoutService from "../services/payout.service";
import RevenueTransaction from "../models/RevenueTransaction";

export interface StripePayoutJobData {
  type: "process-stripe-payout";
  vendorId: string;
  transactionIds: string[];
  amount: number;
}

export interface BankPayoutRequestJobData {
  type: "create-bank-payout-request";
  vendorId: string;
  transactionIds: string[];
  amount: number;
}

export interface AffiliatePayoutJobData {
  type: "process-affiliate-payout";
  affiliateId: string;
}

export type PayoutJobData = StripePayoutJobData | BankPayoutRequestJobData | AffiliatePayoutJobData;

const payoutWorker = areQueuesEnabled
  ? new Worker(
      QUEUE_NAMES.PAYOUT,
      async (job: Job<PayoutJobData>) => {
        const { data } = job;

        logger.info(`Processing payout job ${job.id}`, {
          type: data.type,
          vendorId: (data as any).vendorId,
          amount: (data as any).amount,
        });

        switch (data.type) {
          case "process-stripe-payout": {
            const result = await PayoutService.processVendorPayout(
              data.vendorId,
              data.transactionIds,
              "stripe",
            );

            if (!result.success) {
              throw new Error(result.error || "Stripe payout failed");
            }

            logger.info(`Stripe payout completed for vendor ${data.vendorId}`, {
              payoutId: result.payoutId,
              amount: data.amount,
            });

            return { success: true, payoutId: result.payoutId };
          }

          case "create-bank-payout-request": {
            const result = await PayoutService.createPayoutRequest(
              data.vendorId,
              data.amount,
            );

            if (!result.success) {
              throw new Error(result.error || "Bank payout request failed");
            }

            logger.info(
              `Bank payout request created for vendor ${data.vendorId}`,
              {
                payoutId: result.payout?.id,
                amount: data.amount,
              },
            );

            return { success: true, payoutId: result.payout?.id };
          }

          case "process-affiliate-payout": {
            await PayoutService.processAffiliatePayouts(data.affiliateId);
            logger.info(`Affiliate payout completed: ${data.affiliateId}`);
            return { success: true };
          }

          default:
            throw new Error(`Unknown payout job type: ${(data as any).type}`);
        }
      },
      {
        connection: bullMQConnection,
        concurrency: 2, // Low concurrency — payout jobs touch Stripe API
      },
    )
  : null;

if (payoutWorker) {
  payoutWorker.on("completed", (job: Job, result: any) => {
    logger.info(`Payout job ${job.id} completed`, {
      type: job.data.type,
      vendorId: job.data.vendorId,
      payoutId: result.payoutId,
    });
  });

  payoutWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Payout job ${job?.id} failed:`, {
      type: job?.data?.type,
      vendorId: job?.data?.vendorId,
      error: error.message,
    });
  });

  payoutWorker.on("error", (error: Error) => {
    const msg = error.message || "";
    if (
      msg.includes("isn't writeable") ||
      msg.includes("Connection is closed") ||
      msg.includes("ECONNREFUSED")
    ) {
      logger.warn(
        "Payout worker: Redis connection issue, waiting for reconnection...",
        { error: msg },
      );
    } else {
      logger.error("Payout worker error:", error);
    }
  });
}

const gracefulShutdown = async () => {
  if (payoutWorker) {
    logger.info("Shutting down payout worker...");
    await payoutWorker.close();
    logger.info("Payout worker shut down successfully");
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default payoutWorker;
