/**
 * Upload utility functions
 */

/**
 * Calculate appropriate timeout based on file size
 * Implements tiered timeout strategy:
 * - Small files (<5MB): 60 seconds
 * - Medium files (5-50MB): 120 seconds
 * - Large files (50MB+): 180 seconds
 *
 * @param bytes File size in bytes
 * @returns Timeout in milliseconds
 */
export function getTimeoutForFileSize(bytes: number): number {
  const MB = 1024 * 1024;

  if (bytes < 5 * MB) {
    return 60000; // 60 seconds for small files
  } else if (bytes < 50 * MB) {
    return 120000; // 120 seconds for medium files
  } else {
    return 180000; // 180 seconds for large files
  }
}

/**
 * Format bytes to human-readable string
 * @param bytes File size in bytes
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.23 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format milliseconds to human-readable duration
 * @param ms Duration in milliseconds
 * @returns Formatted string (e.g., "2m 30s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

const ALT_TEXT_MAX_LENGTH = 250;

/**
 * Normalize and sanitize alt text for a MediaAsset.
 * Never trusts client-side validation: rejects non-string input, trims,
 * collapses repeated whitespace, and caps length. Empty string is a valid,
 * intentional result (decorative image) — callers should not coerce it further.
 * @param input Raw value from request body
 * @returns Sanitized alt text, or "" if input is not usable
 */
export function normalizeAltText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+/g, " ").slice(0, ALT_TEXT_MAX_LENGTH);
}
