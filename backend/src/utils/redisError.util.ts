const REDIS_CONNECTION_ERROR_MARKERS = [
  "isn't writeable",
  "enableOfflineQueue",
  "Connection is closed",
  "ECONNREFUSED",
];

/**
 * BullMQ workers see this during Redis reconnect windows — not a job
 * processing failure, so callers should log+wait instead of treating it
 * as a worker error.
 */
export function isRedisConnectionError(error: Error): boolean {
  const message = error.message || "";
  return REDIS_CONNECTION_ERROR_MARKERS.some((marker) =>
    message.includes(marker),
  );
}
