import { cacheService } from "../shared/services/cache.service";
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
      logger.info(`Invalidated cache for event ${eventId}`);
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
