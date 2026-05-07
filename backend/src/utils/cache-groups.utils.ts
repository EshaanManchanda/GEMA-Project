import { cacheGroupService } from "../services/cache-groups.service";

/**
 * Cache Group Utilities
 *
 * Predefined cache groups for common entities.
 * Usage:
 *
 * // When creating/updating an event:
 * await CacheGroups.Events.set('event:123', eventData, { ttl: 600 });
 *
 * // When any event changes:
 * await CacheGroups.Events.invalidate();
 */

export const CacheGroups = {
  Events: {
    groupName: "events",
    set: async <T>(key: string, value: T, options?: { ttl?: number }) => {
      return cacheGroupService.setWithGroup(key, value, "events", options);
    },
    get: async <T>(key: string) => {
      return cacheGroupService.get<T>(key);
    },
    invalidate: async () => {
      return cacheGroupService.invalidateGroup("events");
    },
    getStats: async () => {
      return cacheGroupService.getGroupStats("events");
    },
  },

  Orders: {
    groupName: "orders",
    set: async <T>(key: string, value: T, options?: { ttl?: number }) => {
      return cacheGroupService.setWithGroup(key, value, "orders", options);
    },
    get: async <T>(key: string) => {
      return cacheGroupService.get<T>(key);
    },
    invalidate: async () => {
      return cacheGroupService.invalidateGroup("orders");
    },
    getStats: async () => {
      return cacheGroupService.getGroupStats("orders");
    },
  },

  Users: {
    groupName: "users",
    set: async <T>(key: string, value: T, options?: { ttl?: number }) => {
      return cacheGroupService.setWithGroup(key, value, "users", options);
    },
    get: async <T>(key: string) => {
      return cacheGroupService.get<T>(key);
    },
    invalidate: async () => {
      return cacheGroupService.invalidateGroup("users");
    },
    getStats: async () => {
      return cacheGroupService.getGroupStats("users");
    },
  },

  Dashboard: {
    groupName: "dashboard",
    set: async <T>(key: string, value: T, options?: { ttl?: number }) => {
      return cacheGroupService.setWithGroup(key, value, "dashboard", options);
    },
    get: async <T>(key: string) => {
      return cacheGroupService.get<T>(key);
    },
    invalidate: async () => {
      return cacheGroupService.invalidateGroup("dashboard");
    },
    getStats: async () => {
      return cacheGroupService.getGroupStats("dashboard");
    },
  },

  Categories: {
    groupName: "categories",
    set: async <T>(key: string, value: T, options?: { ttl?: number }) => {
      return cacheGroupService.setWithGroup(key, value, "categories", options);
    },
    get: async <T>(key: string) => {
      return cacheGroupService.get<T>(key);
    },
    invalidate: async () => {
      return cacheGroupService.invalidateGroup("categories");
    },
    getStats: async () => {
      return cacheGroupService.getGroupStats("categories");
    },
  },

  Venues: {
    groupName: "venues",
    set: async <T>(key: string, value: T, options?: { ttl?: number }) => {
      return cacheGroupService.setWithGroup(key, value, "venues", options);
    },
    get: async <T>(key: string) => {
      return cacheGroupService.get<T>(key);
    },
    invalidate: async () => {
      return cacheGroupService.invalidateGroup("venues");
    },
    getStats: async () => {
      return cacheGroupService.getGroupStats("venues");
    },
  },

  /**
   * Invalidate multiple related groups at once
   * Example: When an order is placed, invalidate orders + dashboard + user stats
   */
  invalidateRelated: async (groups: string[]) => {
    return cacheGroupService.invalidateGroups(groups);
  },

  /**
   * Common invalidation scenarios
   */
  Scenarios: {
    /**
     * Called when any event is created/updated/deleted
     */
    onEventChange: async () => {
      return cacheGroupService.invalidateGroups(["events", "dashboard"]);
    },

    /**
     * Called when any order is placed/updated
     */
    onOrderChange: async () => {
      return cacheGroupService.invalidateGroups([
        "orders",
        "dashboard",
        "events",
      ]);
    },

    /**
     * Called when a user is created/updated
     */
    onUserChange: async () => {
      return cacheGroupService.invalidateGroups(["users", "dashboard"]);
    },

    /**
     * Called when categories change
     */
    onCategoryChange: async () => {
      return cacheGroupService.invalidateGroups(["categories", "events"]);
    },

    /**
     * Called when venue info changes
     */
    onVenueChange: async () => {
      return cacheGroupService.invalidateGroups(["venues", "events"]);
    },

    /**
     * Nuclear option: invalidate everything
     */
    onCriticalChange: async () => {
      return cacheGroupService.invalidateGroups([
        "events",
        "orders",
        "users",
        "dashboard",
        "categories",
        "venues",
      ]);
    },
  },
};

export default CacheGroups;
