/**
 * Upload utility functions for frontend
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
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

/**
 * Calculate upload speed in bytes per second
 * @param bytes Bytes uploaded
 * @param durationMs Duration in milliseconds
 * @returns Speed in bytes per second
 */
export function calculateUploadSpeed(bytes: number, durationMs: number): number {
  if (durationMs === 0) return 0;
  return (bytes / durationMs) * 1000; // Convert to bytes per second
}

/**
 * Format upload speed to human-readable string
 * @param bytesPerSecond Upload speed in bytes per second
 * @returns Formatted string (e.g., "1.23 MB/s")
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

/**
 * Calculate estimated time remaining
 * @param totalBytes Total file size
 * @param uploadedBytes Bytes uploaded so far
 * @param bytesPerSecond Current upload speed
 * @returns ETA in milliseconds
 */
export function calculateETA(
  totalBytes: number,
  uploadedBytes: number,
  bytesPerSecond: number
): number {
  if (bytesPerSecond === 0) return 0;
  const remainingBytes = totalBytes - uploadedBytes;
  return (remainingBytes / bytesPerSecond) * 1000; // Convert to milliseconds
}
