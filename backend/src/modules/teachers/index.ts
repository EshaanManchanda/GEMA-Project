export { default as Teacher, TeacherVerificationStatus, TeachingMode, UAE_LANGUAGE, TeacherPaymentMode, TeacherSubscriptionStatus } from "./teacher.model";
export type { ITeacher, ITeacherPaymentSettings, IStripeConfig, ITeacherBankDetails, IQualification, IAvailabilityHours, ITeachingAddress, ISocialLinks } from "./teacher.model";

export { default as TeacherBooking } from "./teacher-booking.model";
export type { ITeacherBooking } from "./teacher-booking.model";

export { default as TeacherSubscription } from "./teacher-subscription.model";
export type { ITeacherSubscription } from "./teacher-subscription.model";

export { default as AdvertisingCampaign, CampaignType, CampaignStatus, BillingModel, AdPlacement } from "./teacher-advertising-campaign.model";
export type { IAdvertisingCampaign, ITargeting, IBudgetSettings, IPerformanceMetrics, IAdContent } from "./teacher-advertising-campaign.model";

export {
  getTeacherDashboardStats,
  getTeacherTeachingEvents,
  getTeacherBookings,
  getTeacherBookingById,
  updateTeacherBooking,
  exportTeacherBookings,
  importTeacherBookings,
  getTeacherProfile,
  updateTeacherProfile,
  uploadTeacherImage,
  updateTeacherAvailability,
  updateTeacherSocialMedia,
  getPublicTeacherProfile,
  getTeacherPaymentInfo,
  uploadTeacherMedia,
  updateTeacherAvailabilityHours,
  updateTeacherSocialLinks,
  updateTeacherBankDetails,
  getPublicTeachersList,
} from "./teacher.controller";

export { default as teacherService } from "./teacher.service";
export { default as teacherRoutes } from "./teacher.routes";
export { default as teacherPayoutRoutes } from "./teacher-payout.routes";
