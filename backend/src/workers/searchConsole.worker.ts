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
 * analytics page. Runs once a month, on the 15th — no sync happens just from
 * loading the analytics page. Also invoked directly by the admin "Sync Now"
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
// by jobId). Cron pattern: 03:00 on the 15th of every month, server time —
// the only automatic sync; everything else is the admin "Sync Now" button.
//
// BullMQ keys repeatable jobs by jobId + repeat options together, so changing
// the pattern alone (as happened when this moved from the 1st to the 15th)
// leaves the old schedule registered rather than replacing it. Sweep any
// repeatable job under this jobId with a stale pattern before (re)adding the
// current one, so redeploys self-heal instead of firing both schedules.
const MONTHLY_SYNC_JOB_ID = "search-console-monthly-sync";
const MONTHLY_SYNC_CRON = "0 3 15 * *";

if (searchConsoleSyncQueue) {
  searchConsoleSyncQueue
    .getRepeatableJobs()
    .then((jobs) =>
      Promise.all(
        jobs
          .filter((j) => j.id === MONTHLY_SYNC_JOB_ID && j.pattern !== MONTHLY_SYNC_CRON)
          .map((j) => searchConsoleSyncQueue!.removeRepeatableByKey(j.key)),
      ),
    )
    .then(() =>
      searchConsoleSyncQueue!.add(
        "monthly-sync",
        {},
        {
          jobId: MONTHLY_SYNC_JOB_ID,
          repeat: { pattern: MONTHLY_SYNC_CRON },
        },
      ),
    )
    .catch((err) =>
      logger.error("search-console-sync: failed to schedule monthly job", err),
    );
}

export default searchConsoleWorker;
