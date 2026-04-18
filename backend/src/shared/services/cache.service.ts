import { redisClient, redisPool } from "../../config/redis";
import logger from "../../config/logger";
import { parseJSONAsync } from "../../utils/json-worker.util";
import type Redis from "ioredis";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

export class CacheService {
  private defaultTTL: number = 300; // 5 minutes default
  private keyPrefix: string = "gema:";

  /**
   * Check if Redis is available (pool or single client)
   */
  private isRedisAvailable(): boolean {
    if (redisPool) {
      return redisPool.isHealthy();
    }
    return redisClient !== null && redisClient.status === "ready";
  }

  /**
   * Get Redis client (from pool or single client)
   */
  private getClient(): Redis {
    if (redisPool) {
      return redisPool.getConnection();
    }
    if (!redisClient) {
      throw new Error("Redis client not available");
    }
    return redisClient;
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isRedisAvailable()) {
      return null;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const value = await this.getClient().get(fullKey);

      if (!value) {
        return null;
      }

      // Use async parsing to avoid blocking event loop on large payloads
      return await parseJSONAsync<T>(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const stringValue = JSON.stringify(value);

      await this.getClient().setex(fullKey, ttl, stringValue);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      await this.getClient().del(fullKey);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * Uses SCAN instead of KEYS for production safety
   */
  async deletePattern(
    pattern: string,
    options?: CacheOptions,
  ): Promise<number> {
    if (!this.isRedisAvailable()) {
      return 0;
    }

    try {
      const fullPattern = this.getKey(pattern, options?.prefix);
      const keys: string[] = [];

      // Use SCAN instead of KEYS for production safety
      const stream = this.getClient().scanStream({
        match: fullPattern,
        count: 100,
      });

      return new Promise((resolve, reject) => {
        let streamClosed = false;

        const cleanup = () => {
          if (!streamClosed) {
            streamClosed = true;
            stream.destroy(); // Ensure stream is destroyed
          }
        };

        stream.on("data", (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });

        stream.on("end", async () => {
          cleanup();
          try {
            if (keys.length === 0) {
              resolve(0);
              return;
            }

            // Delete in batches of 1000 to avoid blocking Redis
            const batchSize = 1000;
            let deletedCount = 0;

            for (let i = 0; i < keys.length; i += batchSize) {
              const batch = keys.slice(i, i + batchSize);
              await this.getClient().del(...batch);
              deletedCount += batch.length;
            }

            resolve(deletedCount);
          } catch (error) {
            reject(error);
          }
        });

        stream.on("error", (error) => {
          cleanup();
          logger.error(`scanStream error for pattern ${pattern}:`, error);
          reject(error);
        });

        // Add timeout to prevent hanging (reduced from 30s to 10s)
        setTimeout(() => {
          if (!streamClosed) {
            cleanup();
            logger.warn(
              `Cache pattern delete timeout (10s): ${pattern}. Deleted ${keys.length} keys`,
            );
            resolve(keys.length); // Return partial count instead of rejecting
          }
        }, 10000); // 10 second timeout
      });
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      const result = await this.getClient().exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isRedisAvailable()) {
      return -2; // Key doesn't exist
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      return await this.getClient().ttl(fullKey);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -2; // Key doesn't exist
    }
  }

  /**
   * Increment a counter
   */
  async increment(
    key: string,
    by: number = 1,
    options?: CacheOptions,
  ): Promise<number> {
    if (!this.isRedisAvailable()) {
      return 0;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      return await this.getClient().incrby(fullKey, by);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decrement(
    key: string,
    by: number = 1,
    options?: CacheOptions,
  ): Promise<number> {
    if (!this.isRedisAvailable()) {
      return 0;
    }

    try {
      const fullKey = this.getKey(key, options?.prefix);
      return await this.getClient().decrby(fullKey, by);
    } catch (error) {
      logger.error(`Cache decrement error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T | null> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }

      // Fetch fresh data
      const fresh = await fetchFn();

      // Cache it
      await this.set(key, fresh, options);

      return fresh;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      // On error, try to fetch fresh data
      try {
        return await fetchFn();
      } catch (fetchError) {
        logger.error(`Fetch function error for key ${key}:`, fetchError);
        return null;
      }
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isRedisAvailable()) {
      return false;
    }

    try {
      await this.getClient().flushdb();
      logger.warn("Cache: All keys flushed");
      return true;
    } catch (error) {
      logger.error("Cache flush error:", error);
      return false;
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{
    dbSize: number;
    memory: any;
    connected: boolean;
  }> {
    if (!this.isRedisAvailable()) {
      return {
        dbSize: 0,
        memory: {},
        connected: false,
      };
    }

    try {
      const dbSize = await this.getClient().dbsize();
      const memoryInfo = await this.getClient().info("memory");
      const connected = this.getClient().status === "ready";

      return {
        dbSize,
        memory: memoryInfo,
        connected,
      };
    } catch (error) {
      logger.error("Cache stats error:", error);
      return {
        dbSize: 0,
        memory: {},
        connected: false,
      };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

export default cacheService;
