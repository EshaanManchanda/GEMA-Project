import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import logger from './logger';

// Redis connection options
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // Connection settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Reconnection strategy
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis reconnecting... Attempt ${times}, delay: ${delay}ms`);
    return delay;
  },

  // Connection timeout
  connectTimeout: 10000,

  // Keep alive
  keepAlive: 30000,

  // TLS for production (if using Redis Cloud, Upstash, etc.)
  tls: process.env.REDIS_TLS === 'true' ? {
    // Set to false for self-signed certs, true for production with valid certs
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  } : undefined,
};

// Create Redis client
export const redisClient = new Redis(redisOptions);

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('Redis: Connecting...');
});

redisClient.on('ready', () => {
  logger.info('Redis: Connected and ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

redisClient.on('close', () => {
  logger.warn('Redis: Connection closed');
});

redisClient.on('reconnecting', (time: number) => {
  logger.info(`Redis: Reconnecting in ${time}ms`);
});

redisClient.on('end', () => {
  logger.warn('Redis: Connection ended');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Closing Redis connection...');
  await redisClient.quit();
  logger.info('Redis connection closed');
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Health check function
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};

export default redisClient;
