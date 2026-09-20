import mongoose from "mongoose";

const normalizeEventMode = (
  value?: string,
): "Online" | "Offline" | undefined => {
  if (!value) return undefined;

  const normalized = value.toString().trim().toLowerCase();

  if (normalized === "online") return "Online";
  if (
    normalized === "offline" ||
    normalized === "indoor" ||
    normalized === "outdoor"
  ) {
    return "Offline";
  }

  return undefined;
};

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
  return "events:list:*";
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
    status: "published",
    isDeleted: false,
  };

  // Add expiration filter unless explicitly requested to include past events
  if (!additionalFilters.includePast) {
    // Event is visible if: endDate >= (now - 24 hours) OR it has no schedules
    // This means events remain visible until 24 hours after their actual end date
    baseFilter.$or = [
      // New format: check endDate with buffer
      { "dateSchedule.endDate": { $gte: bufferTime } },
      // Legacy format: check date field with buffer
      { "dateSchedule.date": { $gte: bufferTime } },
      // Events with no schedules never expire automatically
      { dateSchedule: { $size: 0 } },
      { dateSchedule: { $exists: false } }
    ];
  }

  // Remove includePast from additionalFilters before merging
  const { includePast, ...filters } = additionalFilters;

  // Merge with any additional filters provided
  if (baseFilter.$or && filters.$or) {
    const combinedFilters = { ...baseFilter, ...filters };
    combinedFilters.$and = [{ $or: baseFilter.$or }, { $or: filters.$or }];
    delete combinedFilters.$or;
    return combinedFilters;
  }

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
  if (
    eventObj.imageAssets &&
    Array.isArray(eventObj.imageAssets) &&
    eventObj.imageAssets.length > 0
  ) {
    const firstAsset = eventObj.imageAssets[0];

    // Check if imageAssets are populated (objects with url) vs just ObjectIds
    if (
      typeof firstAsset === "object" &&
      firstAsset !== null &&
      firstAsset.url
    ) {
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

  const normalizedMode = normalizeEventMode(
    sanitized.eventType || sanitized.venueType,
  );
  if (normalizedMode) {
    sanitized.eventType = normalizedMode;
    // Keep legacy field for compatibility while enforcing canonical values.
    sanitized.venueType = normalizedMode;
  }

  // Real booking count — sum of actual soldSeats across every schedule (and
  // its time slots, if any). Never fabricated; see gema-no-fake-trust-numbers.
  if (Array.isArray(sanitized.dateSchedule)) {
    sanitized.bookingsCount = sanitized.dateSchedule.reduce(
      (total: number, schedule: any) => {
        const scheduleSold = schedule?.soldSeats || 0;
        const slotsSold = Array.isArray(schedule?.timeSlots)
          ? schedule.timeSlots.reduce(
              (slotTotal: number, slot: any) =>
                slotTotal + (slot?.soldSeats || 0),
              0,
            )
          : 0;
        return total + scheduleSold + slotsSold;
      },
      0,
    );
  }

  sanitized.availability = computeEventAvailability(sanitized);

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

export type EventAvailabilityStatus =
  | "available"
  | "unavailable"
  | "sold_out"
  | "cancelled";

export interface EventAvailability {
  status: EventAvailabilityStatus;
  reason?: "past" | "cancelled" | "sold_out";
}

/**
 * A schedule is past once its end-of-day cutoff (endDate/date, or startDate as
 * last resort) is behind now. No buffer here — this drives booking eligibility,
 * which is stricter than the 24h public-listing buffer in buildPublicEventFilter.
 */
export const isSchedulePast = (schedule: any, now: Date = new Date()): boolean => {
  const end = schedule?.endDate || schedule?.date || schedule?.startDate;
  if (!end) return false;

  const endDate = new Date(end);
  if (isNaN(endDate.getTime())) return false;

  endDate.setHours(23, 59, 59, 999);
  return endDate.getTime() < now.getTime();
};

const isScheduleSoldOut = (schedule: any): boolean => {
  if (schedule?.unlimitedSeats) return false;
  const seats = schedule?.availableSeats;
  return typeof seats === "number" && seats <= 0;
};

/**
 * Derived availability, separate from event.status (draft/published/...).
 * A published, active event can still be "unavailable" once every schedule
 * has passed — see gema-no-fake-trust-numbers memory for why we don't hide
 * completed events outright, just gate booking on them.
 */
export const computeEventAvailability = (event: any): EventAvailability => {
  if (event?.cancellationStatus === "cancelled") {
    return { status: "cancelled", reason: "cancelled" };
  }

  const schedules = Array.isArray(event?.dateSchedule) ? event.dateSchedule : [];
  if (schedules.length === 0) {
    return { status: "available" };
  }

  const now = new Date();
  const upcoming = schedules.filter((s: any) => !isSchedulePast(s, now));

  if (upcoming.length === 0) {
    return { status: "unavailable", reason: "past" };
  }

  if (upcoming.every(isScheduleSoldOut)) {
    return { status: "sold_out", reason: "sold_out" };
  }

  return { status: "available" };
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

  if (event.status !== "published") {
    return false;
  }

  // Check if event is expired
  if (typeof event.isExpired === "function" && event.isExpired()) {
    return false;
  }

  // Check dateSchedule manually if isExpired method not available
  if (!event.dateSchedule || event.dateSchedule.length === 0) {
    return true; // Events without schedules never expire automatically
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
