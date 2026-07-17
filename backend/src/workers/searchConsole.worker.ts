import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  searchConsoleSyncQueue,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
import logger from "../config/logger";
import * as gsc from "../services/searchConsole.service";

/**
 * Pull fresh Search Console data for every configured property and persist it
 * durably (SearchConsoleHistory), independent of admins visiting the
 * analytics page. Runs monthly; also invoked directly by the admin "Sync Now"
 * button via the /search-console/sync route (that path doesn't go through
 * this queue — it calls the service function inline for an immediate result).
 */
const processSearchConsoleSync = async (_job: Job) => {
  if (!gsc.isSearchConsoleConfigured()) {
    logger.warn("search-console-sync: not configured, skipping scheduled sync");
    return { skipped: true };
  }

  const results = await gsc.syncAllConfiguredSites("scheduled");
  const failed = results.filter((r) => !r.success);

  if (failed.length > 0) {
    logger.error(
      `search-console-sync: ${failed.length}/${results.length} site(s) failed`,
      failed,
    );
  }
  logger.info(
    `search-console-sync: synced ${results.length - failed.length}/${results.length} site(s)`,
  );

  return { results };
};

const searchConsoleWorker = areQueuesEnabled
  ? new Worker(QUEUE_NAMES.SEARCH_CONSOLE_SYNC, processSearchConsoleSync, {
      connection: bullMQConnection!,
      concurrency: WORKER_TUNING.SEARCH_CONSOLE_SYNC.CONCURRENCY,
    })
  : null;

if (searchConsoleWorker) {
  searchConsoleWorker.on("completed", (job, result) => {
    logger.debug(`search-console-sync job ${job.id} completed`, result);
  });
  searchConsoleWorker.on("failed", (job, err) => {
    logger.error(`search-console-sync job ${job?.id} failed`, err);
  });
}

// Schedule the recurring monthly sync once (idempotent — BullMQ deduplicates
// by jobId). Cron pattern: 03:00 on the 1st of every month, server time.
if (searchConsoleSyncQueue) {
  searchConsoleSyncQueue
    .add(
      "monthly-sync",
      {},
      {
        jobId: "search-console-monthly-sync",
        repeat: { pattern: "0 3 1 * *" },
      },
    )
    .catch((err) =>
      logger.error("search-console-sync: failed to schedule monthly job", err),
    );
}

export default searchConsoleWorker;
