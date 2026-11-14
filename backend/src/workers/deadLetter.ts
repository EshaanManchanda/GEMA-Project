import type { Queue } from "bullmq";
import logger from "../config/logger";

/**
 * The "failed-jobs" dead-letter queue has no consumer, so its entries sit in `wait` until something removes them,
 * and nothing did. Each holds the whole payload of a job that failed all its attempts. Redis filled up (it has a
 * maxmemory with noeviction) and a full Redis turns every BullMQ worker into a busy loop. These helpers keep the
 * queue small: bounded payloads, a seven day life, and a cap on the number of entries.
 */
const DLQ_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const DLQ_MAX_ENTRIES = 1000;
const DLQ_MAX_PAYLOAD_BYTES = 20_000;
const CLEAN_BATCH = 500;
const TRIM_EVERY_MS = 3_600_000;

/** The payload as is when it is small (so a job can still be replayed by hand), otherwise a short summary. */
export function snapshotJobData(
  data: unknown,
  maxBytes = DLQ_MAX_PAYLOAD_BYTES,
): unknown {
  if (data === undefined || data === null) return data;
  let json: string;
  try {
    json = JSON.stringify(data);
  } catch {
    return { unserialisable: true };
  }
  if (json === undefined || json.length <= maxBytes) return data;
  return { truncated: true, bytes: json.length, preview: json.slice(0, 2000) };
}

/** Removes dead-letter entries older than a week, then the oldest ones beyond the cap. Never throws. */
export async function trimDeadLetterQueue(
  queue: Queue | null,
  {
    maxAgeMs = DLQ_MAX_AGE_MS,
    maxEntries = DLQ_MAX_ENTRIES,
  }: { maxAgeMs?: number; maxEntries?: number } = {},
): Promise<number> {
  if (!queue) return 0;
  let removed = 0;
  try {
    for (;;) {
      const ids = await queue.clean(maxAgeMs, CLEAN_BATCH, "wait");
      removed += ids.length;
      if (ids.length < CLEAN_BATCH) break;
    }
    const over = (await queue.getWaitingCount()) - maxEntries;
    if (over > 0) {
      // asc = true: the oldest first (the waiting list is newest-first by default)
      for (const job of await queue.getJobs(["wait"], 0, over - 1, true)) {
        try {
          await job.remove();
          removed++;
        } catch (err) {
          logger.warn(
            `dead-letter trim: could not remove ${job.id}: ${(err as Error).message}`,
          );
        }
      }
    }
  } catch (err) {
    logger.warn(`dead-letter trim failed: ${(err as Error).message}`);
  }
  if (removed) logger.info(`dead-letter queue: removed ${removed} old entries`);
  return removed;
}

/** Trims once now and then every hour. Returns a function that stops it. */
export function startDeadLetterTrimmer(
  queue: Queue | null,
  everyMs = TRIM_EVERY_MS,
  trim: typeof trimDeadLetterQueue = trimDeadLetterQueue,
): () => void {
  if (!queue) return () => undefined;
  void trim(queue);
  const timer = setInterval(() => void trim(queue), everyMs);
  timer.unref?.(); // never keep the process alive just to trim
  return () => clearInterval(timer);
}
