import type { Worker } from "bullmq";
import logger from "../config/logger";
import { isRedisConnectionError } from "../utils/redisError.util";

/**
 * BullMQ retries a failing job fetch immediately, so one persistent error (a Redis/ioredis
 * mismatch, a dead Redis) fires thousands of 'error' events a second, and each used to write a
 * full stack trace to the log files until the disk was full. Log the first error of each window,
 * then one line per window saying how many more were swallowed.
 *
 * ponytail: a repeat count is only reported by the next error after the window, so a storm that
 * stops mid-window never reports its tail. Add a flush timer if that ever matters.
 */
export function attachThrottledErrorListener(
  worker: Worker | null,
  name: string,
  windowMs = 60_000,
  now: () => number = Date.now,
): void {
  if (!worker) return;
  let windowStart = Number.NEGATIVE_INFINITY;
  let suppressed = 0;

  worker.on("error", (error: Error) => {
    const t = now();
    if (t - windowStart < windowMs) {
      suppressed++;
      return;
    }
    const repeats = suppressed;
    windowStart = t;
    suppressed = 0;
    const more = repeats ? ` (${repeats} more in the last ${Math.round(windowMs / 1000)}s)` : "";
    if (isRedisConnectionError(error)) {
      // Not a job failure: Redis is reconnecting. The retry strategy handles it.
      logger.warn(`${name} worker: Redis connection issue, waiting for reconnection${more}`, {
        error: error.message,
      });
    } else {
      logger.error(`${name} worker error${more}:`, error);
    }
  });
}

export interface ErrorBackoffOptions {
  /** Errors within windowMs that count as a busy loop. */
  burst?: number;
  windowMs?: number;
  /** First pause; it doubles for each burst that follows, up to maxMs. */
  baseMs?: number;
  maxMs?: number;
  /** Quiet time after a resume before the pause length starts over. */
  resetAfterMs?: number;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => void;
}

/**
 * BullMQ waits runRetryDelay (15 s) only after a Redis CONNECTION error. Any other error from the job fetch,
 * such as a full Redis answering "OOM command not allowed", is emitted and the fetch is retried at once: a busy
 * loop that pinned the CPU and stopped the API from shutting down. A worker that errors in a burst is paused,
 * then resumed after a delay that doubles while the trouble lasts, so a broken Redis costs a trickle of CPU.
 */
export function attachErrorBackoff(
  worker: Worker | null,
  name: string,
  {
    burst = 20,
    windowMs = 5_000,
    baseMs = 30_000,
    maxMs = 300_000,
    resetAfterMs = 600_000,
    now = Date.now,
    schedule = (fn, ms) => {
      setTimeout(fn, ms).unref?.(); // never keep the process alive just to resume a worker
    },
  }: ErrorBackoffOptions = {},
): void {
  if (!worker) return;
  let stamps: number[] = [];
  let cooling = false;
  let closed = false;
  let level = 0;
  let lastResumeAt: number | null = null;

  worker.on("closing", () => {
    closed = true;
  });

  worker.on("error", (error: Error) => {
    if (cooling || closed || isRedisConnectionError(error)) return;
    const t = now();
    stamps = stamps.filter((s) => t - s < windowMs);
    stamps.push(t);
    if (stamps.length < burst) return;

    stamps = [];
    cooling = true;
    if (lastResumeAt !== null && t - lastResumeAt > resetAfterMs) level = 0;
    const delay = Math.min(baseMs * 2 ** level, maxMs);
    level++;
    logger.warn(
      `${name} worker: ${burst}+ errors in ${Math.round(windowMs / 1000)}s (${error.message}); pausing it for ${Math.round(delay / 1000)}s instead of retrying in a loop`,
    );
    worker.pause(true).catch((err: Error) => logger.warn(`${name} worker: pause failed: ${err.message}`));
    schedule(() => {
      cooling = false;
      lastResumeAt = now();
      if (closed) return;
      try {
        worker.resume();
      } catch (err) {
        logger.warn(`${name} worker: resume failed: ${(err as Error).message}`);
      }
    }, delay);
  });
}
