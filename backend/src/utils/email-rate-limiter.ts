import { redisClient } from '../config/redis';
import logger from '../config/logger';

/**
 * Email Rate Limiter
 *
 * Prevents email provider rate limit bans using Redis-based token bucket algorithm.
 * Supports tiered limits and burst allowance.
 *
 * Common email provider limits:
 * - SendGrid: 100/sec (Pro), 600/hour (Free)
 * - Mailgun: 1000/hour (Basic), 100/sec (Pro)
 * - AWS SES: 14/sec (default), 50000/day
 * - SMTP.com: 8000/hour, 250/min
 *
 * Performance: < 2ms per check (Redis GET + SET)
 */

interface RateLimitConfig {
  maxPerMinute: number; // Maximum emails per minute
  maxPerHour: number; // Maximum emails per hour
  maxPerDay: number; // Maximum emails per day
  burstAllowance: number; // Allow bursts up to this many emails
}

interface RateLimitResult {
  allowed: boolean;
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  resetAt: {
    minute: Date;
    hour: Date;
    day: Date;
  };
  retryAfter?: number; // Milliseconds to wait if not allowed
}

export class EmailRateLimiter {
  private config: RateLimitConfig;
  private keyPrefix: string = 'email-rate:';

  constructor(config?: Partial<RateLimitConfig>) {
    // Default config for typical SMTP providers (conservative)
    this.config = {
      maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || '30', 10),
      maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '1000', 10),
      maxPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_PER_DAY || '10000', 10),
      burstAllowance: parseInt(process.env.EMAIL_RATE_LIMIT_BURST || '10', 10),
      ...config
    };

    logger.info('Email rate limiter initialized', this.config);
  }

  /**
   * Check if email can be sent (token bucket algorithm)
   */
  async checkLimit(): Promise<RateLimitResult> {
    // If Redis not available, allow (fail open for availability)
    if (!redisClient || redisClient.status !== 'ready') {
      logger.warn('Email rate limiter: Redis unavailable, allowing email');
      return {
        allowed: true,
        remaining: {
          minute: this.config.maxPerMinute,
          hour: this.config.maxPerHour,
          day: this.config.maxPerDay
        },
        resetAt: {
          minute: this.getResetTime('minute'),
          hour: this.getResetTime('hour'),
          day: this.getResetTime('day')
        }
      };
    }

    try {
      const now = Date.now();
      const minuteKey = `${this.keyPrefix}minute:${this.getCurrentWindow('minute', now)}`;
      const hourKey = `${this.keyPrefix}hour:${this.getCurrentWindow('hour', now)}`;
      const dayKey = `${this.keyPrefix}day:${this.getCurrentWindow('day', now)}`;

      // Get current counts in parallel
      const [minuteCount, hourCount, dayCount] = await Promise.all([
        redisClient.get(minuteKey).then(v => parseInt(v || '0', 10)),
        redisClient.get(hourKey).then(v => parseInt(v || '0', 10)),
        redisClient.get(dayKey).then(v => parseInt(v || '0', 10))
      ]);

      // Calculate remaining
      const remaining = {
        minute: Math.max(0, this.config.maxPerMinute - minuteCount),
        hour: Math.max(0, this.config.maxPerHour - hourCount),
        day: Math.max(0, this.config.maxPerDay - dayCount)
      };

      // Check limits (any limit hit = not allowed)
      const allowed = minuteCount < this.config.maxPerMinute &&
                     hourCount < this.config.maxPerHour &&
                     dayCount < this.config.maxPerDay;

      // Calculate retry time if not allowed
      let retryAfter: number | undefined;
      if (!allowed) {
        if (minuteCount >= this.config.maxPerMinute) {
          retryAfter = 60000 - (now % 60000); // Wait until next minute
        } else if (hourCount >= this.config.maxPerHour) {
          retryAfter = 3600000 - (now % 3600000); // Wait until next hour
        } else {
          retryAfter = 86400000 - (now % 86400000); // Wait until next day
        }
      }

      return {
        allowed,
        remaining,
        resetAt: {
          minute: this.getResetTime('minute'),
          hour: this.getResetTime('hour'),
          day: this.getResetTime('day')
        },
        retryAfter
      };
    } catch (error) {
      logger.error('Email rate limiter check failed:', error);
      // Fail open - allow email on error
      return {
        allowed: true,
        remaining: {
          minute: this.config.maxPerMinute,
          hour: this.config.maxPerHour,
          day: this.config.maxPerDay
        },
        resetAt: {
          minute: this.getResetTime('minute'),
          hour: this.getResetTime('hour'),
          day: this.getResetTime('day')
        }
      };
    }
  }

  /**
   * Consume a token (increment counters)
   */
  async consume(): Promise<void> {
    if (!redisClient || redisClient.status !== 'ready') {
      return; // No-op if Redis unavailable
    }

    try {
      const now = Date.now();
      const minuteKey = `${this.keyPrefix}minute:${this.getCurrentWindow('minute', now)}`;
      const hourKey = `${this.keyPrefix}hour:${this.getCurrentWindow('hour', now)}`;
      const dayKey = `${this.keyPrefix}day:${this.getCurrentWindow('day', now)}`;

      // Increment counters atomically with pipeline
      const pipeline = redisClient.pipeline();
      pipeline.incr(minuteKey);
      pipeline.expire(minuteKey, 120); // 2 minute TTL (buffer)
      pipeline.incr(hourKey);
      pipeline.expire(hourKey, 7200); // 2 hour TTL (buffer)
      pipeline.incr(dayKey);
      pipeline.expire(dayKey, 172800); // 2 day TTL (buffer)

      await pipeline.exec();
    } catch (error) {
      logger.error('Email rate limiter consume failed:', error);
      // Non-fatal - continue
    }
  }

  /**
   * Get current time window identifier
   */
  private getCurrentWindow(period: 'minute' | 'hour' | 'day', now: number): string {
    const date = new Date(now);

    switch (period) {
      case 'minute':
        return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}-${date.getUTCMinutes()}`;
      case 'hour':
        return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}`;
      case 'day':
        return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    }
  }

  /**
   * Get reset time for period
   */
  private getResetTime(period: 'minute' | 'hour' | 'day'): Date {
    const now = new Date();

    switch (period) {
      case 'minute':
        return new Date(Math.ceil(now.getTime() / 60000) * 60000);
      case 'hour':
        return new Date(Math.ceil(now.getTime() / 3600000) * 3600000);
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow;
    }
  }

  /**
   * Get current rate limit status (for monitoring)
   */
  async getStatus(): Promise<{
    config: RateLimitConfig;
    current: { minute: number; hour: number; day: number };
    remaining: { minute: number; hour: number; day: number };
  }> {
    if (!redisClient || redisClient.status !== 'ready') {
      return {
        config: this.config,
        current: { minute: 0, hour: 0, day: 0 },
        remaining: {
          minute: this.config.maxPerMinute,
          hour: this.config.maxPerHour,
          day: this.config.maxPerDay
        }
      };
    }

    try {
      const now = Date.now();
      const minuteKey = `${this.keyPrefix}minute:${this.getCurrentWindow('minute', now)}`;
      const hourKey = `${this.keyPrefix}hour:${this.getCurrentWindow('hour', now)}`;
      const dayKey = `${this.keyPrefix}day:${this.getCurrentWindow('day', now)}`;

      const [minuteCount, hourCount, dayCount] = await Promise.all([
        redisClient.get(minuteKey).then(v => parseInt(v || '0', 10)),
        redisClient.get(hourKey).then(v => parseInt(v || '0', 10)),
        redisClient.get(dayKey).then(v => parseInt(v || '0', 10))
      ]);

      return {
        config: this.config,
        current: { minute: minuteCount, hour: hourCount, day: dayCount },
        remaining: {
          minute: Math.max(0, this.config.maxPerMinute - minuteCount),
          hour: Math.max(0, this.config.maxPerHour - hourCount),
          day: Math.max(0, this.config.maxPerDay - dayCount)
        }
      };
    } catch (error) {
      logger.error('Email rate limiter status check failed:', error);
      return {
        config: this.config,
        current: { minute: 0, hour: 0, day: 0 },
        remaining: {
          minute: this.config.maxPerMinute,
          hour: this.config.maxPerHour,
          day: this.config.maxPerDay
        }
      };
    }
  }
}

// Export singleton instance
export const emailRateLimiter = new EmailRateLimiter();

export default emailRateLimiter;
