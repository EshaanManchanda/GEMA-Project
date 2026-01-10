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

  // Add expiration filter unless explicitly requested to include past events
  if (!additionalFilters.includePast) {
    // Event is visible if: endDate >= (now - 24 hours)
    // This means events remain visible until 24 hours after their actual end date
    baseFilter.$or = [
      // New format: check endDate with buffer
      { 'dateSchedule.endDate': { $gte: bufferTime } },
      // Legacy format: check date field with buffer
      { 'dateSchedule.date': { $gte: bufferTime } },
    ];
  }

  // Remove includePast from additionalFilters before merging
  const { includePast, ...filters } = additionalFilters;

  // Merge with any additional filters provided
  return { ...baseFilter, ...filters };
};

/**
 * Transform event document to include proper image URLs
 * Handles both old (images array) and new (imageAssets references) formats
 *
 * @param event - Event document (can be mongoose document or plain object)
 * @returns Transformed event with image URLs extracted from MediaAssets
 */
export const transformEventResponse = (event: any) => {
  if (!event) return null;

  // Convert to plain object if it's a mongoose document
  const eventObj = event.toObject ? event.toObject() : { ...event };

  // Extract image URLs from imageAssets if populated
  if (eventObj.imageAssets && Array.isArray(eventObj.imageAssets) && eventObj.imageAssets.length > 0) {
    const firstAsset = eventObj.imageAssets[0];

    // Check if imageAssets are populated (objects with url) vs just ObjectIds
    if (typeof firstAsset === 'object' && firstAsset !== null && firstAsset.url) {
      // New format: extract URLs from populated MediaAssets
      eventObj.images = eventObj.imageAssets
        .map((asset: any) => asset.url || asset.thumbnailUrl)
        .filter(Boolean);

      // Optionally include variations for responsive images
      eventObj.imageVariations = eventObj.imageAssets
        .map((asset: any) => asset.variations)
        .filter(Boolean);
    }
    // else: imageAssets not populated (just IDs), keep existing images array
  }
  // else: use existing images array (backward compatibility)

  // Remove internal fields
  const { __v, ...sanitized } = eventObj;

  return sanitized;
};

/**
 * Transform array of events
 *
 * @param events - Array of event documents
 * @returns Array of transformed events
 */
export const transformEventsResponse = (events: any[]) => {
  return events.map(transformEventResponse);
};

/**
 * Sanitize event output by removing internal fields
 * Removes: __v, isDeleted, internal metadata
 */
export const sanitizeEventOutput = (event: any) => {
  if (!event) return null;
  return transformEventResponse(event);
};

/**
 * Sanitize array of events
 */
export const sanitizeEventsOutput = (events: any[]) => {
  return transformEventsResponse(events);
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
