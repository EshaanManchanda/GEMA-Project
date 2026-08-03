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
 * Convert a "YYYY-MM" period string into UTC calendar-month boundaries.
 * Used by the business report snapshot (one snapshot per vendor per
 * calendar month) so period math stays consistent with the rest of
 * analytics — never local-time month boundaries (see
 * vendor.service.getDashboardStats, which uses local time and is a known
 * inconsistency this helper deliberately avoids repeating).
 *
 * periodToUtcRange("2026-07") -> { start: 2026-07-01T00:00:00.000Z, end: 2026-07-31T23:59:59.999Z }
 */
export function periodToUtcRange(period: string): AnalyticsDateRange {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) {
    throw new Error(`Invalid period "${period}" — expected "YYYY-MM"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]); // 1-indexed
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // day 0 of next month = last day of this month
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

/**
 * Zero-fill a day-bucketed series ("YYYY-MM-DD" keys) so every day in the
 * range is present, not just the days a MongoDB $group happened to produce a
 * document for. Without this, a sparse aggregation (e.g. 2 order days out of
 * a 90-day range) renders as a misleadingly steep line connecting two far-
 * apart points instead of a flat trend with real gaps — see the "Daily"
 * toggle on the admin analytics dashboard.
 */
export function fillDailySeries<T extends { day: string }>(
  rows: T[],
  range: AnalyticsDateRange,
  makeZero: (day: string) => T,
): T[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: T[] = [];
  const cursor = new Date(range.start);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(range.end);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    out.push(byDay.get(key) ?? makeZero(key));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Same as fillDailySeries but for month-bucketed ("YYYY-MM") series. */
export function fillMonthlySeries<T extends { month: string }>(
  rows: T[],
  range: AnalyticsDateRange,
  makeZero: (month: string) => T,
): T[] {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const out: T[] = [];
  const cursor = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), 1));
  while (cursor <= endCursor) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push(byMonth.get(key) ?? makeZero(key));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
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
