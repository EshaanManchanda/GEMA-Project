import mongoose from 'mongoose';

/**
 * Build filter for public event queries
 * Only returns events that are:
 * - Approved by admin
 * - Active
 * - Published
 * - Not deleted
 * - Not expired (endDate is in the future)
 */
export const buildPublicEventFilter = (additionalFilters: any = {}) => {
  const now = new Date();

  const baseFilter: any = {
    isApproved: true,
    isActive: true,
    status: 'published',
    isDeleted: false,
  };

  // Add expiration filter - event must have at least one future date
  // Check if any dateSchedule entry has endDate or date >= now
  baseFilter.$or = [
    // New format: check endDate
    { 'dateSchedule.endDate': { $gte: now } },
    // Legacy format: check date field
    { 'dateSchedule.date': { $gte: now } },
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
  const hasValidDate = event.dateSchedule.some((schedule: any) => {
    const dateToCheck = schedule.endDate || schedule.date;
    return dateToCheck && new Date(dateToCheck) >= now;
  });

  return hasValidDate;
};
