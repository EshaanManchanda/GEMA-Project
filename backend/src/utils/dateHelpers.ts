/**
 * Date Helper Utilities
 *
 * These utilities handle date formatting safely for both:
 * - Fresh data from MongoDB (Date objects)
 * - Cached data from Redis (ISO strings)
 *
 * This is necessary because Redis serialization converts Date objects to strings,
 * causing .toISOString() calls to fail on cached data.
 */

/**
 * Safely convert a Date object or ISO string to ISO string format
 *
 * @param date - Date object, ISO string, or undefined
 * @returns ISO 8601 formatted string, or empty string if date is undefined
 *
 * @example
 * toISOStringSafe(new Date('2024-01-01')) // '2024-01-01T00:00:00.000Z'
 * toISOStringSafe('2024-01-01T00:00:00.000Z') // '2024-01-01T00:00:00.000Z'
 * toISOStringSafe(undefined) // ''
 */
// =============================================================================
// ANALYTICS DATE-RANGE HELPERS
// =============================================================================
// Centralises date-range interpretation for all analytics endpoints:
//   - Timezone: UTC throughout (MongoDB stores in UTC, no server-side tz shift)
//   - Inclusivity: start = start-of-day (00:00:00.000), end = end-of-day (23:59:59.999)
//   - Default: last 30 complete days when no range is supplied
// Apply via parseAnalyticsDateRange() in every analytics route / service.
// =============================================================================

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

/**
 * Parse and normalise a start/end pair from query params.
 *
 * Clamps start to 00:00:00.000 UTC and end to 23:59:59.999 UTC so
 * date-boundary mismatches don't cause revenue discrepancies between
 * surfaces that pass slightly different timestamps.
 *
 * Returns undefined when either value is absent, preserving existing
 * optional-range semantics throughout the codebase.
 */
export function parseAnalyticsDateRange(
  startDate: unknown,
  endDate: unknown,
): AnalyticsDateRange | undefined {
  if (!startDate || !endDate) return undefined;

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;

  // Clamp to day boundaries in UTC
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Build the default 30-day range (last 30 complete days, UTC).
 * Used when no date range is provided so all surfaces default consistently.
 */
export function defaultAnalyticsDateRange(): AnalyticsDateRange {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Build a range covering the last N days (inclusive of today), in UTC.
 *
 * Defaults to 7 days. Structured so callers can pass n=30 or similar later
 * without changing the endpoint shape.
 *
 * @example
 * lastNDaysRange(7)  // start = 7 days ago 00:00 UTC, end = today 23:59:59 UTC
 */
export function lastNDaysRange(n = 7): AnalyticsDateRange {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - n * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Format a UTC-period label for report headers.
 * e.g. "23 Jun 2026 00:00 UTC – 29 Jun 2026 23:59 UTC"
 */
export function formatUtcPeriodLabel(start: Date, end: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmt = (d: Date) =>
    `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ` +
    `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export const toISOStringSafe = (date: Date | string | undefined): string => {
  if (!date) return "";

  // Already a string (from Redis cache)
  if (typeof date === "string") return date;

  // Date object (from MongoDB)
  return date.toISOString();
};

/**
 * Safely format a date to YYYY-MM-DD format
 *
 * @param date - Date object, ISO string, or undefined
 * @returns Date string in YYYY-MM-DD format, or empty string if date is undefined
 *
 * @example
 * toDateStringSafe(new Date('2024-01-01T12:30:00')) // '2024-01-01'
 * toDateStringSafe('2024-01-01T12:30:00.000Z') // '2024-01-01'
 * toDateStringSafe(undefined) // ''
 */
export const toDateStringSafe = (date: Date | string | undefined): string => {
  if (!date) return "";

  // Already a string (from Redis cache)
  if (typeof date === "string") {
    return date.split("T")[0];
  }

  // Date object (from MongoDB)
  return date.toISOString().split("T")[0];
};

/**
 * Safely get timestamp (milliseconds since epoch)
 *
 * @param date - Date object, ISO string, or undefined
 * @returns Timestamp in milliseconds, or 0 if date is undefined
 *
 * @example
 * toTimestampSafe(new Date('2024-01-01')) // 1704067200000
 * toTimestampSafe('2024-01-01T00:00:00.000Z') // 1704067200000
 * toTimestampSafe(undefined) // 0
 */
export const toTimestampSafe = (date: Date | string | undefined): number => {
  if (!date) return 0;

  // Already a string (from Redis cache)
  if (typeof date === "string") {
    return new Date(date).getTime();
  }

  // Date object (from MongoDB)
  return date.getTime();
};
