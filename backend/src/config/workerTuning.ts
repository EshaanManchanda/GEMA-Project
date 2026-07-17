/**
 * BullMQ worker concurrency/rate-limit tuning. Values below are deliberately
 * low — production runs on a single-core KVM1 instance, so concurrency mirrors
 * available CPU rather than typical Node.js defaults.
 */
export const WORKER_TUNING = {
  QR_GENERATION: {
    CONCURRENCY: 2,
    RATE_LIMIT_MAX: 50,
    RATE_LIMIT_DURATION_MS: 1000,
  },
  EMAIL: {
    CONCURRENCY: 2,
    RATE_LIMIT_MAX: 30,
    RATE_LIMIT_DURATION_MS: 60_000,
  },
  COLLECTION_SYNC: {
    CONCURRENCY: 1, // single thread — avoids race conditions across sync jobs
    RATE_LIMIT_MAX: 10,
    RATE_LIMIT_DURATION_MS: 60_000,
  },
  PAYOUT: {
    CONCURRENCY: 2, // low — payout jobs touch the Stripe API
  },
  CERTIFICATE_GENERATION: {
    CONCURRENCY: 1, // one Puppeteer render at a time
  },
  SEAT_EXPIRY: {
    CONCURRENCY: 1,
    SWEEP_INTERVAL_MS: 5 * 60 * 1000,
  },
  COMMUNICATION: {
    CONCURRENCY: 3,
  },
  AUTOMATION: {
    CONCURRENCY: 1,
    REVIEW_REQUEST_SWEEP_INTERVAL_MS: 6 * 60 * 60 * 1000,
    REMINDER_SWEEP_INTERVAL_MS: 15 * 60 * 1000,
  },
  SEARCH_CONSOLE_SYNC: {
    CONCURRENCY: 1,
  },
} as const;
