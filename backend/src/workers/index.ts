import { Worker } from "bullmq";
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
import certificateWorker, {
  closeCertificateBrowser,
} from "./certificate.worker";
import seatExpiryWorker from "./seat-expiry.worker";
import communicationWorker from "./communication.worker";
import automationWorker from "./automation.worker";
import searchConsoleWorker from "./searchConsole.worker";

/**
 * Single source of truth for every worker this process manages. Adding a
 * worker means adding one entry here — logging, DLQ routing, and graceful
 * shutdown all derive from this list instead of being hand-maintained in
 * four separate places.
 */
interface WorkerEntry {
  /** DLQ routing key, used as `originalQueue` on dead-lettered jobs */
  dlqName: string;
  worker: Worker | null;
  startupMessage: string;
}

const WORKERS: WorkerEntry[] = [
  {
    dlqName: "qr-generation",
    worker: qrWorker,
    startupMessage: "QR Generation Worker",
  },
  { dlqName: "email", worker: emailWorker, startupMessage: "Email Worker" },
  {
    dlqName: "collection-sync",
    worker: collectionSyncWorker,
    startupMessage: "Collection Sync Worker",
  },
  { dlqName: "payout", worker: payoutWorker, startupMessage: "Payout Worker" },
  {
    dlqName: "certificate-generation",
    worker: certificateWorker,
    startupMessage: "Certificate Worker",
  },
  {
    dlqName: "seat-expiry",
    worker: seatExpiryWorker,
    startupMessage: "Seat Expiry Worker (sweeps every 5 min)",
  },
  {
    dlqName: "communication",
    worker: communicationWorker,
    startupMessage: "Communication Worker (WhatsApp/email-marketing)",
  },
  {
    dlqName: "automation",
    worker: automationWorker,
    startupMessage:
      "Automation Worker (review-request sweep every 6h, event reminders every 15min)",
  },
  {
    dlqName: "search-console-sync",
    worker: searchConsoleWorker,
    startupMessage: "Search Console Worker (monthly sync, 1st @ 03:00)",
  },
];

logger.info("Starting background workers...");

for (const { worker, startupMessage } of WORKERS) {
  if (worker) {
    logger.info(`${startupMessage}: Started`);
  } else {
    logger.warn(`${startupMessage}: Not initialized`);
  }
}

// Route permanently-failed jobs to Dead Letter Queue for visibility and manual replay
for (const { worker, dlqName } of WORKERS) {
  if (!worker) continue;
  worker.on("failed", async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await failedJobsQueue
        ?.add("dead-letter", {
          originalQueue: dlqName,
          jobName: job.name,
          jobData: job.data,
          error: err.message,
          failedAt: new Date().toISOString(),
        })
        .catch(() => {}); // DLQ write should never crash the worker
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

// Graceful shutdown — the sole owner of SIGINT/SIGTERM for every worker.
// Individual worker modules must not register their own shutdown handlers.
const gracefulShutdown = async () => {
  logger.info("Gracefully shutting down workers...");

  const promises: Promise<void>[] = WORKERS.filter((w) => w.worker).map((w) =>
    w.worker!.close(),
  );
  promises.push(closeCertificateBrowser());

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
