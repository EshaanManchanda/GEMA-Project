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
