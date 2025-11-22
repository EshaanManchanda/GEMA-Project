import mongoose from 'mongoose';

/**
 * Generate cache key for a single event
 */
export const getEventCacheKey = (eventId: string): string => {
  return `event:${eventId}`;
};

/**
 * Generate cache key pattern for event lists
 * (used for invalidating all event list caches)
 */
export const getEventListCachePattern = (): string => {
  return 'events:list:*';
};

/**
 * Build filter for public event queries
 * Only returns events that are:
 * - Approved by admin
 * - Active
 * - Published
 * - Not deleted
 * - Not expired (endDate + 24 hours buffer is in the future)
 *
 * Note: Uses 24-hour buffer to match the lifecycle job behavior
 */
export const buildPublicEventFilter = (additionalFilters: any = {}) => {
  const now = new Date();
  // Add 24-hour buffer: events remain visible 24 hours after their end date
  // This aligns with the lifecycle job which archives events 24 hours after expiration
  const bufferTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const baseFilter: any = {
    isApproved: true,
    isActive: true,
    status: 'published',
    isDeleted: false,
  };

  // Add expiration filter - event must have at least one future date (with 24h buffer)
  // Event is visible if: endDate >= (now - 24 hours)
  // This means events remain visible until 24 hours after their actual end date
  baseFilter.$or = [
    // New format: check endDate with buffer
    { 'dateSchedule.endDate': { $gte: bufferTime } },
    // Legacy format: check date field with buffer
    { 'dateSchedule.date': { $gte: bufferTime } },
  ];

  // Merge with any additional filters provided
  return { ...baseFilter, ...additionalFilters };
};

/**
 * Sanitize event output by removing internal fields
 * Removes: __v, isDeleted, internal metadata
 */
export const sanitizeEventOutput = (event: any) => {
  if (!event) return null;

  // Convert to plain object if it's a mongoose document
  const eventObj = event.toObject ? event.toObject() : event;

  // Remove internal fields
  const { __v, ...sanitized } = eventObj;

  return sanitized;
};

/**
 * Sanitize array of events
 */
export const sanitizeEventsOutput = (events: any[]) => {
  return events.map(sanitizeEventOutput);
};

/**
 * Check if a specific event is publicly visible
 * (approved, active, published, not deleted, not expired)
 */
export const isEventPubliclyVisible = (event: any): boolean => {
  if (!event) return false;

  // Check basic visibility criteria
  if (!event.isApproved || !event.isActive || event.isDeleted) {
    return false;
  }

  if (event.status !== 'published') {
    return false;
  }

  // Check if event is expired
  if (typeof event.isExpired === 'function' && event.isExpired()) {
    return false;
  }

  // Check dateSchedule manually if isExpired method not available
  if (!event.dateSchedule || event.dateSchedule.length === 0) {
    return false;
  }

  const now = new Date();
  // Use 24-hour buffer to match buildPublicEventFilter behavior
  const bufferTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hasValidDate = event.dateSchedule.some((schedule: any) => {
    const dateToCheck = schedule.endDate || schedule.date;
    return dateToCheck && new Date(dateToCheck) >= bufferTime;
  });

  return hasValidDate;
};
