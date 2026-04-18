export { default as Affiliate, AffiliateStatus, CommissionType } from "./affiliate.model";
export type {
  IAffiliate,
  IAffiliateClick,
  IAffiliateCommission,
  ICommissionTier,
  IAffiliateModel,
} from "./affiliate.model";
export { default as AffiliateEventClick } from "./event-click.model";
export type { IAffiliateEventClick } from "./event-click.model";
export { default as AffiliateVenueClick } from "./venue-click.model";
export type { IAffiliateVenueClick } from "./venue-click.model";
export {
  applyAffiliate,
  getMyAffiliate,
  updateAffiliateProfile,
  generateTrackingUrl,
  recordClick,
  getDashboardStats,
  getCommissions,
  getAllAffiliates,
  updateAffiliateStatus,
  getTopPerformers,
  getAffiliateAnalytics,
  requestAffiliatePayout,
} from "./affiliates.controller";
export {
  trackAffiliateClick as trackEventAffiliateClick,
  claimAffiliateEvent,
  getClaimedEvents,
  getAffiliateAnalytics as getEventAffiliateAnalytics,
  getEventAnalytics,
} from "./event-affiliates.controller";
export {
  trackAffiliateClick as trackVenueAffiliateClick,
  claimAffiliateVenue,
  getClaimedVenues,
  getVenueAffiliateAnalytics,
  getVenueAnalytics,
} from "./venue-affiliates.controller";
export { default as affiliateRoutes } from "./affiliates.routes";
export { default as eventAffiliateRoutes } from "./event-affiliate.routes";
export { default as venueAffiliateRoutes } from "./venue-affiliate.routes";
