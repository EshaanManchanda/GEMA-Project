import logger from "../config/logger";
import {
  bullMQClient,
  areQueuesEnabled,
  failedJobsQueue,
} from "../config/queue";

/**
 * Worker Process Entry Point
 * This file starts all background workers
 */

// Exit gracefully if queues are disabled (check BEFORE importing workers)
if (!areQueuesEnabled) {
  logger.warn("========================================");
  logger.warn("Workers disabled - Redis/queues are not available");
  logger.warn("Background jobs (email, QR generation) will not be processed");
  logger.warn(
    "Set DISABLE_REDIS=false and ensure Redis is running to enable workers",
  );
  logger.warn("========================================");
  process.exit(0);
}

// Import workers only if queues are enabled (avoids Worker instantiation errors)
import qrWorker from "./qr.worker";
import emailWorker from "./email.worker";
import collectionSyncWorker from "./collection-sync.worker";
import payoutWorker from "./payout.worker";
import certificateWorker from "./certificate.worker";
import seatExpiryWorker from "./seat-expiry.worker";

logger.info("Starting background workers...");

if (qrWorker) {
  logger.info("QR Generation Worker: Started");
} else {
  logger.warn("QR Generation Worker: Not initialized");
}

if (emailWorker) {
  logger.info("Email Worker: Started");
} else {
  logger.warn("Email Worker: Not initialized");
}

if (collectionSyncWorker) {
  logger.info("Collection Sync Worker: Started");
} else {
  logger.warn("Collection Sync Worker: Not initialized");
}

if (payoutWorker) {
  logger.info("Payout Worker: Started");
} else {
  logger.warn("Payout Worker: Not initialized");
}

if (certificateWorker) {
  logger.info("Certificate Worker: Started");
} else {
  logger.warn("Certificate Worker: Not initialized");
}

if (seatExpiryWorker) {
  logger.info("Seat Expiry Worker: Started (sweeps every 5 min)");
} else {
  logger.warn("Seat Expiry Worker: Not initialized");
}

// Route permanently-failed jobs to Dead Letter Queue for visibility and manual replay
const workersForDLQ = [
  { worker: qrWorker, name: "qr-generation" },
  { worker: emailWorker, name: "email" },
  { worker: collectionSyncWorker, name: "collection-sync" },
  { worker: payoutWorker, name: "payout" },
  { worker: certificateWorker, name: "certificate-generation" },
  { worker: seatExpiryWorker, name: "seat-expiry" },
];

for (const { worker, name } of workersForDLQ) {
  if (!worker) continue;
  worker.on("failed", async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await failedJobsQueue
        ?.add("dead-letter", {
          originalQueue: name,
          jobName: job.name,
          jobData: job.data,
          error: err.message,
          failedAt: new Date().toISOString(),
        })
        .catch(() => { }); // DLQ write should never crash the worker
    }
  });
}

// Monitor BullMQ Redis connection health
if (bullMQClient) {
  let isConnected = false;
  let reconnectCount = 0;

  bullMQClient.on("connect", () => {
    logger.info("Workers: BullMQ Redis connecting...");
  });

  bullMQClient.on("ready", () => {
    if (!isConnected) {
      logger.info("Workers: BullMQ Redis connected successfully");
    } else {
      logger.info(
        `Workers: BullMQ Redis reconnected after ${reconnectCount} attempts`,
      );
      reconnectCount = 0;
    }
    isConnected = true;
  });

  bullMQClient.on("error", (err) => {
    logger.error("Workers: BullMQ Redis error:", {
      message: err.message,
      code: (err as any).code,
    });
  });

  bullMQClient.on("close", () => {
    if (isConnected) {
      logger.warn(
        "Workers: BullMQ Redis connection closed, will attempt to reconnect...",
      );
      isConnected = false;
    }
  });

  bullMQClient.on("reconnecting", () => {
    reconnectCount++;
    logger.info(
      `Workers: BullMQ Redis reconnecting (attempt ${reconnectCount})...`,
    );
  });

  bullMQClient.on("end", () => {
    logger.warn("Workers: BullMQ Redis connection ended");
    isConnected = false;
  });
}

// Handle uncaught errors
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception in worker process:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection in worker process:", reason);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info("Gracefully shutting down workers...");

  const promises: Promise<void>[] = [];
  if (qrWorker) promises.push(qrWorker.close());
  if (emailWorker) promises.push(emailWorker.close());
  if (collectionSyncWorker) promises.push(collectionSyncWorker.close());
  if (payoutWorker) promises.push(payoutWorker.close());
  if (certificateWorker) promises.push(certificateWorker.close());
  if (seatExpiryWorker) promises.push(seatExpiryWorker.close());

  if (promises.length > 0) {
    await Promise.all(promises);
    logger.info("All workers shut down successfully");
  } else {
    logger.info("No workers to shut down");
  }

  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

logger.info("All workers initialized and running");

// Keep process alive
process.stdin.resume();
