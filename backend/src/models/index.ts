// Barrel export for all models — re-exports from modules/
// All code should import from this file: import { User, Event } from '../models/index'

// Users & Auth
export {
  default as User,
  UserRole,
  UserStatus,
  Gender,
  SocialProvider,
} from "../modules/users/user.model";
export type {
  IUser,
  IAddress,
  ISocialLogin,
  ITwoFactorAuth,
} from "../modules/users/user.model";

export { default as RefreshToken } from "../modules/auth/refresh-token.model";
export type { IRefreshToken } from "../modules/auth/refresh-token.model";

// Vendors
export {
  default as Vendor,
  VerificationStatus,
  PaymentMode,
  VendorSubscriptionStatus,
} from "../modules/vendors/vendor.model";
export type {
  IVendor,
  IBusinessHours,
  ISocialMedia,
  IContactPerson,
  ITaxInformation,
  IBusinessAddress,
  IBankAccountDetails,
  IStripeSettings,
  IVerificationDocuments,
} from "../modules/vendors/vendor.model";

export {
  default as VendorSubscription,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from "../modules/vendors/vendor-subscription.model";
export type {
  IVendorSubscription,
  IPlanFeatures,
  IPlanPricing,
  IUsageTracking,
} from "../modules/vendors/vendor-subscription.model";

// Employees
export { default as Employee } from "../modules/employees/employee.model";
export type { IEmployee } from "../modules/employees/employee.model";

// Events
export { default as Event, default as EventModel } from "../modules/events/event.model";
export type { IEvent } from "../modules/events/event.model";

export {
  default as EventAddon,
  AddonType,
  AddonStatus,
  PricingModel,
  AvailabilityType,
} from "../modules/events/event-addon.model";
export type {
  IEventAddon,
  ITieredPricing,
  IAddonRequirements,
  IAvailabilitySchedule,
} from "../modules/events/event-addon.model";

// Bookings
export { default as Booking } from "../modules/bookings/booking.model";
export type { IBooking } from "../modules/bookings/booking.model";

// Orders
export { default as Order } from "../modules/orders/order.model";
export type { IOrder, IOrderItem } from "../modules/orders/order.model";

// Payments
export {
  default as Payment,
  PaymentGateway,
  PaymentStatus,
  PaymentMethod,
} from "../modules/payments/payment.model";
export type { IPayment, IPaymentRefund } from "../modules/payments/payment.model";

export { default as PaymentSettings } from "../modules/settings/payment-settings.model";
export type { IPaymentSettings, IPaymentSettingsModel } from "../modules/settings/payment-settings.model";

// Payouts
export {
  default as Payout,
  PayoutRequestStatus,
  PayoutMethodType,
} from "../modules/payouts/payout.model";
export type { IPayout, IBankDetails } from "../modules/payouts/payout.model";

// Reviews
export {
  default as Review,
  ReviewStatus,
  ReviewType,
  FlagReason,
} from "../modules/reviews/review.model";
export type {
  IReview,
  IReviewMedia,
  IFlag,
  IHelpfulVote,
  IResponse,
} from "../modules/reviews/review.model";

// Tickets
export { default as Ticket, TicketStatus } from "../modules/tickets/ticket.model";
export type { ITicket } from "../modules/tickets/ticket.model";

// Checkin
export { default as CheckinLog } from "../modules/checkin/checkin-log.model";
export type { ICheckinLog } from "../modules/checkin/checkin-log.model";

export { default as CancellationLog } from "../modules/checkin/cancellation-log.model";
export type { ICancellationLog } from "../modules/checkin/cancellation-log.model";

// Categories
export { default as Category } from "../modules/categories/category.model";
export type { ICategory } from "../modules/categories/category.model";

// Collections
export { default as Collection } from "../modules/collections/collection.model";
export type { ICollection } from "../modules/collections/collection.model";

// Coupons
export { default as Coupon, CouponType, CouponStatus } from "../modules/coupons/coupon.model";
export type { ICoupon, ICouponUsage } from "../modules/coupons/coupon.model";

// Content
export { Blog } from "../modules/content/blog.model";
export type { IBlog } from "../modules/content/blog.model";

export { BlogCategory } from "../modules/content/blog-category.model";
export type { IBlogCategory } from "../modules/content/blog-category.model";

export { default as Comment } from "../modules/content/comment.model";
export type { IComment } from "../modules/content/comment.model";

export { default as Reel } from "../modules/content/reel.model";
export type { IReel } from "../modules/content/reel.model";

export { default as Banner } from "../modules/content/banner.model";
export type { IBanner } from "../modules/content/banner.model";

export { default as SEOContent } from "../modules/content/seo-content.model";
export type { ISEOContent } from "../modules/content/seo-content.model";

export { default as PopupNotification } from "../modules/content/popup-notification.model";
export type { IPopupNotification } from "../modules/content/popup-notification.model";

export { default as AnnouncementBar } from "../modules/content/announcement-bar.model";
export type { IAnnouncementBar } from "../modules/content/announcement-bar.model";

export { default as NewsletterSubscriber } from "../modules/content/newsletter-subscriber.model";
export type {
  INewsletterSubscriber,
  INewsletterSubscriberModel,
} from "../modules/content/newsletter-subscriber.model";

export { default as ContentReport } from "../modules/content/content-report.model";
export type { IContentReport } from "../modules/content/content-report.model";

// Media
export { default as MediaAsset } from "../modules/media/media-asset.model";
export type { IMediaAsset } from "../modules/media/media-asset.model";

// Notifications
export {
  default as Notification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
} from "../modules/notifications/notification.model";
export type {
  INotification,
  INotificationAction,
  INotificationDelivery,
} from "../modules/notifications/notification.model";

export { default as UserPushSubscription } from "../modules/notifications/push-subscription.model";
export type { IUserPushSubscription } from "../modules/notifications/push-subscription.model";

// Registrations
export {
  default as Registration,
  RegistrationStatus,
  PaymentStatus as RegistrationPaymentStatus,
  ReviewStatus as RegistrationReviewStatus,
} from "../modules/registrations/registration.model";
export type {
  IRegistration,
  IRegistrationModel,
  IFileData,
  IRegistrationData,
  IVendorReview,
  IPaymentInfo,
  IMetadata,
} from "../modules/registrations/registration.model";

// Affiliates
export {
  default as Affiliate,
  AffiliateStatus,
  CommissionType,
} from "../modules/affiliates/affiliate.model";
export type {
  IAffiliate,
  IAffiliateClick,
  IAffiliateCommission,
  ICommissionTier,
} from "../modules/affiliates/affiliate.model";

export { default as AffiliateEventClick } from "../modules/affiliates/event-click.model";
export type { IAffiliateEventClick } from "../modules/affiliates/event-click.model";

export { default as AffiliateVenueClick } from "../modules/affiliates/venue-click.model";
export type { IAffiliateVenueClick } from "../modules/affiliates/venue-click.model";

// Revenue Management
export {
  default as RevenueTransaction,
  RevenueStream,
  TransactionStatus,
  PayoutStatus,
} from "../modules/analytics/revenue-transaction.model";
export type { IRevenueTransaction } from "../modules/analytics/revenue-transaction.model";

export {
  default as AdminRevenueSettings,
  PayoutFrequency,
  CommissionStructure,
  TaxCalculationMethod,
} from "../modules/analytics/admin-revenue-settings.model";
export type { IAdminRevenueSettings, IPaymentGateway } from "../modules/analytics/admin-revenue-settings.model";

export {
  default as AdvertisingCampaign,
  CampaignType,
  CampaignStatus,
  BillingModel,
  AdPlacement,
} from "../modules/teachers/teacher-advertising-campaign.model";
export type {
  IAdvertisingCampaign,
  ITargeting,
  IBudgetSettings,
  IPerformanceMetrics,
  IAdContent,
} from "../modules/teachers/teacher-advertising-campaign.model";

// Commission Management
export {
  default as CommissionConfig,
  ConfigStatus,
  CommissionRuleType,
  RecipientType,
  RuleStatus,
} from "../modules/commissions/commission-config.model";
export type {
  ICommissionConfig,
  ICommissionRule,
  IPlatformCommission,
  ITier,
  IRuleConditions,
  ILevelDistribution,
} from "../modules/commissions/commission-config.model";

export {
  default as CommissionTransaction,
  CommissionTransactionStatus,
  CommissionRecipientType,
} from "../modules/commissions/commission-transaction.model";
export type {
  ICommissionTransaction,
  ICommissionDetail,
} from "../modules/commissions/commission-transaction.model";

// Contact
export { default as Contact } from "../modules/contact/contact.model";
export type { IContact } from "../modules/contact/contact.model";

// Partnerships
export { default as Partnership } from "../modules/partnerships/partnership.model";
export type { IPartnership } from "../modules/partnerships/partnership.model";

// Teacher Models
export {
  default as Teacher,
  TeacherVerificationStatus,
  TeachingMode,
  UAE_LANGUAGE,
  TeacherPaymentMode,
} from "../modules/teachers/teacher.model";
export type {
  ITeacher,
  ITeacherPaymentSettings,
  IStripeConfig,
  ITeacherBankDetails,
  IQualification,
  IAvailabilityHours,
  ITeachingAddress,
  ISocialLinks,
} from "../modules/teachers/teacher.model";

export { default as TeacherBooking } from "../modules/teachers/teacher-booking.model";
export type { ITeacherBooking } from "../modules/teachers/teacher-booking.model";

export {
  default as TeacherSubscription,
  TeacherSubscriptionPlan,
  TeacherSubscriptionStatus,
  TeacherBillingCycle,
} from "../modules/teachers/teacher-subscription.model";
export type {
  ITeacherSubscription,
  ITeacherPlanFeatures,
  ITeacherPlanPricing,
} from "../modules/teachers/teacher-subscription.model";

// School Models
export { default as School } from "../modules/schools/school.model";
export type { ISchool } from "../modules/schools/school.model";

export { default as SchoolInvite } from "../modules/schools/school-invite.model";
export type { ISchoolInvite } from "../modules/schools/school-invite.model";

// Student Models
export { default as Student } from "../modules/students/student.model";
export type { IStudent } from "../modules/students/student.model";

// Parent Models
export { default as Parent } from "../modules/parents/parent.model";
export type { IParent } from "../modules/parents/parent.model";

// Settings Models
export { default as EmailSettings } from "../modules/settings/email-settings.model";
export type { IEmailSettings } from "../modules/settings/email-settings.model";

export { default as SocialSettings } from "../modules/settings/social-settings.model";
export type { ISocialSettings } from "../modules/settings/social-settings.model";

export { default as SystemSettings } from "../modules/settings/system-settings.model";
export type { ISystemSettings } from "../modules/settings/system-settings.model";

// Admin Role Model
export { default as AdminRole } from "../modules/admin/admin-role.model";
export type { IAdminRole } from "../modules/admin/admin-role.model";
