import Redis, { RedisOptions } from "ioredis";
import { config } from "./env";
import logger from "./logger";
import { createRedisPool, RedisPool } from "./redis-pool";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true";

// Redis connection options
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),

  // Connection settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Auto-pipelining for better performance with shared connection
  // Automatically batches commands sent in the same event loop tick
  enableAutoPipelining: true,
  autoPipeliningIgnoredCommands: ["ping"], // Don't pipeline health checks

  // Connection limits and lifecycle
  lazyConnect: false, // Connect eagerly on startup to fail fast
  maxLoadingRetryTime: 10000, // Max time to retry loading scripts

  // Reconnection strategy - never give up, use exponential backoff
  retryStrategy(times: number) {
    const maxDelay = 30000; // 30 seconds max delay
    const baseDelay = 1000; // Start at 1 second
    const jitter = Math.random() * 500; // Add randomness to prevent thundering herd

    // Exponential backoff: delay = baseDelay * 2^times, capped at maxDelay
    const delay = Math.min(
      baseDelay * Math.pow(2, Math.min(times, 5)) + jitter,
      maxDelay,
    );

    if (times > 50) {
      logger.error(
        `Redis cache: Still reconnecting after ${times} attempts. Check Redis server status.`,
      );
    } else if (times > 10) {
      logger.warn(
        `Redis cache reconnecting... Attempt ${times}, delay: ${Math.round(delay)}ms`,
      );
    } else {
      logger.info(
        `Redis cache reconnecting... Attempt ${times}, delay: ${Math.round(delay)}ms`,
      );
    }

    return delay; // Keep trying indefinitely
  },

  // Connection timeout
  connectTimeout: 10000,

  // Keep alive
  keepAlive: 30000,

  // Prevent connection leak on errors
  autoResubscribe: false, // Don't auto-resubscribe to pub/sub (not used)
  autoResendUnfulfilledCommands: true, // Resend commands after reconnection

  // TLS for production (if using Redis Cloud, Upstash, etc.)
  tls:
    process.env.REDIS_TLS === "true"
      ? {
          // Set to false for self-signed certs, true for production with valid certs
          rejectUnauthorized:
            process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
        }
      : undefined,
};

// Create Redis client or null if disabled
export const redisClient = isRedisDisabled ? null : new Redis(redisOptions);

// Check if connection pooling should be enabled
const useRedisPool = process.env.REDIS_USE_POOL === "true";
const redisPoolSize = parseInt(process.env.REDIS_POOL_SIZE || "4", 10);

// Create Redis connection pool for high-throughput cache operations
export const redisPool: RedisPool | null =
  isRedisDisabled || !useRedisPool
    ? null
    : createRedisPool({
        ...redisOptions,
        poolSize: redisPoolSize,
        poolName: "cache-pool",
      });

if (isRedisDisabled) {
  logger.warn("Redis is disabled via DISABLE_REDIS environment variable");
} else if (useRedisPool && redisPool) {
  logger.info(
    `Redis connection pool enabled with ${redisPoolSize} connections`,
  );
  // Initialize pool asynchronously
  redisPool.initialize().catch((err) => {
    logger.error("Failed to initialize Redis pool:", err);
  });
} else {
  logger.info("Redis using single connection (pool disabled)");
}

// Redis event handlers (only if Redis is enabled)
if (redisClient) {
  redisClient.on("connect", () => {
    logger.info("Redis: Connecting...");
  });

  redisClient.on("ready", () => {
    logger.info("Redis: Connected and ready");
  });

  redisClient.on("error", (err) => {
    logger.error("Redis error:", err);
  });

  redisClient.on("close", () => {
    logger.warn("Redis: Connection closed");
  });

  redisClient.on("reconnecting", (time: number) => {
    logger.info(`Redis: Reconnecting in ${time}ms`);
  });

  redisClient.on("end", () => {
    logger.warn("Redis: Connection ended");
  });
}

// Graceful shutdown
const gracefulShutdown = async () => {
  // Close pool first (if enabled)
  if (redisPool) {
    await redisPool.close();
  }

  // Close main client
  if (redisClient) {
    logger.info("Closing Redis connection...");
    await redisClient.quit();
    logger.info("Redis connection closed");
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Health check function
export const checkRedisHealth = async (): Promise<boolean> => {
  // Check pool health if pooling is enabled
  if (redisPool) {
    return redisPool.isHealthy();
  }

  // Check single client health
  if (!redisClient) {
    return false; // Redis is disabled
  }

  try {
    const result = await redisClient.ping();
    return result === "PONG";
  } catch (error) {
    logger.error("Redis health check failed:", error);
    return false;
  }
};

// Export flag for other modules to check Redis availability
export const isRedisEnabled = !isRedisDisabled;

export default redisClient;
