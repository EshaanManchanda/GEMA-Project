/**
 * Worker process entry point (pm2 runs dist/workers/index.js).
 *
 * Workers run Mongoose queries (seat expiry, automation, snapshots, payouts, collection sync) but
 * this process never shared server.ts's connection, so every one of those jobs failed. Connect to
 * MongoDB first, then load run.ts: the workers start consuming the moment their modules are imported.
 */
import logger from "../config/logger";
import { areQueuesEnabled } from "../config/queue";
import { connectDB } from "../config/database";

(async () => {
  // run.ts exits cleanly when queues are disabled, so there is nothing to connect for then.
  if (areQueuesEnabled) await connectDB(); // exits the process itself after its retries
  await import("./run");
})().catch((error) => {
  logger.error("Worker process failed to start:", error);
  process.exit(1);
});
