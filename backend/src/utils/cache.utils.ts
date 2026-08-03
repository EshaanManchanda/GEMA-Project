import { cacheService } from "../services/cache.service";
import logger from "../config/logger";

/**
 * Invalidate all event-related caches
 */
export async function invalidateEventCaches(eventId?: string): Promise<void> {
  try {
    // Invalidate event listings cache (all variations)
    const listCount = await cacheService.deletePattern("events:list:*");
    logger.info(`Invalidated ${listCount} event listing cache entries`);

    // Invalidate specific event cache if ID provided
    if (eventId) {
      await cacheService.delete(`event:${eventId}`);
      // Clear all single events to prevent stale data for slug-based queries
      const singleEventsCount = await cacheService.deletePattern("event:*");
      logger.info(
        `Invalidated cache for event ${eventId} and all other single event caches (${singleEventsCount} entries) to prevent stale data`,
      );
    }

    // Invalidate featured events cache
    await cacheService.delete("events:featured");

    // Invalidate category-specific caches
    await cacheService.deletePattern("events:category:*");
  } catch (error) {
    logger.error("Error invalidating event caches:", error);
  }
}

/**
 * Invalidate order/booking related caches
 */
export async function invalidateOrderCaches(userId?: string): Promise<void> {
  try {
    if (userId) {
      await cacheService.deletePattern(`orders:user:${userId}:*`);
      await cacheService.deletePattern(`bookings:user:${userId}:*`);
      logger.info(`Invalidated order/booking caches for user ${userId}`);
    }
  } catch (error) {
    logger.error("Error invalidating order caches:", error);
  }
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCaches(userId: string): Promise<void> {
  try {
    await cacheService.delete(`user:${userId}`);
    await cacheService.deletePattern(`user:${userId}:*`);
    logger.info(`Invalidated caches for user ${userId}`);
  } catch (error) {
    logger.error("Error invalidating user caches:", error);
  }
}

/**
 * Invalidate all caches (use with caution!)
 */
export async function invalidateAllCaches(): Promise<void> {
  try {
    await cacheService.flushAll();
    logger.warn("Invalidated ALL caches");
  } catch (error) {
    logger.error("Error invalidating all caches:", error);
  }
}

/**
 * Invalidate the KBOS business-report PDF/CSV cache
 * (`report:business:${vendorId}:${period}:${type}:pdf`, see
 * routes/analytics.routes.ts) for a vendor, optionally scoped to one period.
 *
 * Call after anything that changes what a report renders: snapshot
 * generation, notes edits, status changes, promotion-input edits, task
 * toggling, or a vendor profile/logo/cover-image update. Deliberately NOT
 * wired into admin.user.controller.ts's vendor-update paths — five more
 * call sites to close a 10-minute cache window on an admin-initiated edit
 * is poor ROI; see the KBOS hardening plan.
 */
export async function invalidateBusinessReportCaches(
  vendorId: string,
  period?: string,
): Promise<void> {
  try {
    const pattern = period
      ? `report:business:${vendorId}:${period}:*`
      : `report:business:${vendorId}:*`;
    const count = await cacheService.deletePattern(pattern);
    logger.info(
      `Invalidated ${count} business report cache entries for vendor ${vendorId}` +
        (period ? ` (${period})` : ""),
    );
  } catch (error) {
    logger.error("Error invalidating business report caches:", error);
  }
}
