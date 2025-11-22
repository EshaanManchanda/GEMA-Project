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
export const toISOStringSafe = (date: Date | string | undefined): string => {
  if (!date) return '';

  // Already a string (from Redis cache)
  if (typeof date === 'string') return date;

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
  if (!date) return '';

  // Already a string (from Redis cache)
  if (typeof date === 'string') {
    return date.split('T')[0];
  }

  // Date object (from MongoDB)
  return date.toISOString().split('T')[0];
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
  if (typeof date === 'string') {
    return new Date(date).getTime();
  }

  // Date object (from MongoDB)
  return date.getTime();
};
