export { default as Event } from "./event.model";
export type { IEvent } from "./event.model";
export { default as EventAddon, AddonType, AddonStatus, PricingModel, AvailabilityType } from "./event-addon.model";
export type { IEventAddon, ITieredPricing, IAddonRequirements, IAvailabilitySchedule } from "./event-addon.model";

export { getEvents, getEvent, createEvent as createPublicEvent, updateEvent as updatePublicEvent, deleteEvent as deletePublicEvent, getVendorEvents, getEventCategories, getVendorEventAnalytics, updateEventApproval, toggleEventFeatured, claimEvent, getUniqueCities, promoteEvent } from "./events.controller";
export { getAllEvents, getEventById, createEvent as createAdminEvent, changeEventVendor, updateEvent as updateAdminEvent, deleteEvent as deleteAdminEvent, restoreEvent, approveEvent, rejectEvent, toggleFeatured, bulkUpdateEvents, getAllVendors, getEventStats as getEventStatsAdmin } from "./admin-events.controller";
export * from "./vendor-events.controller";
export * from "./teacher-events.controller";

export { eventService } from "./events.service";
export * from "./events.validator";
export * from "./events.utils";
export * from "./events.cron";
export { default as eventsRoutes } from "./events.routes";
export { default as adminEventsRoutes } from "./admin-events.routes";
