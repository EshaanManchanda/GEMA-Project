export {
  default as User,
  UserRole,
  UserStatus,
  Gender,
  SocialProvider,
} from "./User";
export type { IUser, IAddress, ISocialLogin, ITwoFactorAuth } from "./User";

export {
  default as Vendor,
  VerificationStatus,
  PaymentMode,
  VendorSubscriptionStatus,
} from "./Vendor";
export type {
  IVendor,
  IBusinessHours,
  ISocialMedia,
  IContactPerson,
  ITaxInformation,
  IBusinessAddress,
  IBankAccountDetails,
  IStripeSettings,
  IPaymentSettings,
  IVerificationDocuments,
} from "./Vendor";

export { default as RefreshToken } from "./RefreshToken";
export type { IRefreshToken } from "./RefreshToken";

export { default as Ticket } from "./Ticket";
export type { ITicket } from "./Ticket";

export { default as Employee } from "./Employee";
export type { IEmployee } from "./Employee";

export { default as CheckinLog } from "./CheckinLog";
export type { ICheckinLog } from "./CheckinLog";

export { default as Event } from "./Event";
export type { IEvent } from "./Event";

export { default as Order } from "./Order";
export type { IOrder, IOrderItem } from "./Order";

export {
  default as Review,
  ReviewStatus,
  ReviewType,
  FlagReason,
} from "./Review";
export type {
  IReview,
  IReviewMedia,
  IFlag,
  IHelpfulVote,
  IResponse,
} from "./Review";

export { default as Booking } from "./Booking";
export type { IBooking } from "./Booking";

export {
  default as Registration,
  RegistrationStatus,
  PaymentStatus as RegistrationPaymentStatus,
  ReviewStatus as RegistrationReviewStatus,
} from "./Registration";
export type {
  IRegistration,
  IRegistrationModel,
  IFileData,
  IRegistrationData,
  IVendorReview,
  IPaymentInfo,
  IMetadata,
} from "./Registration";

export { Blog } from "./Blog";
export type { IBlog } from "./Blog";

export { BlogCategory } from "./BlogCategory";
export type { IBlogCategory } from "./BlogCategory";

export {
  default as VendorServicePackage,
  ServiceItemType,
  PackageStatus,
  PackagePaymentStatus,
  PackageSource,
} from "./VendorServicePackage";
export type {
  IVendorServicePackage,
  IServicePackageItem,
} from "./VendorServicePackage";

export { default as VendorServiceUsage } from "./VendorServiceUsage";
export type {
  IVendorServiceUsage,
  ServiceUsageRefModel,
  ServiceUsageStatus,
  PromotionTierName,
} from "./VendorServiceUsage";

export { default as MediaAsset } from "./MediaAsset";
export type { IMediaAsset } from "./MediaAsset";

export { default as Banner } from "./Banner";
export type { IBanner } from "./Banner";

export { default as SEOContent } from "./SEOContent";
export type { ISEOContent } from "./SEOContent";

// New Models
export { default as Category } from "./Category";
export type { ICategory } from "./Category";

export { default as Coupon, CouponType, CouponStatus } from "./Coupon";
export type { ICoupon, ICouponUsage } from "./Coupon";

export {
  default as Payment,
  PaymentGateway,
  PaymentStatus,
  PaymentMethod,
} from "./Payment";
export type { IPayment, IPaymentRefund } from "./Payment";

// Commented out - notification system disabled
// export { default as Notification, NotificationType, NotificationPriority, NotificationChannel, NotificationStatus } from './Notification';
// export type { INotification, INotificationAction, INotificationDelivery } from './Notification';

export {
  default as Affiliate,
  AffiliateStatus,
  CommissionType,
} from "./Affiliate";
export type {
  IAffiliate,
  IAffiliateClick,
  IAffiliateCommission,
  ICommissionTier,
} from "./Affiliate";

export { default as Collection } from "./Collection";
export type { ICollection } from "./Collection";

// Revenue Management Models
export {
  default as RevenueTransaction,
  RevenueStream,
  TransactionStatus,
  PayoutStatus,
} from "./RevenueTransaction";
export type { IRevenueTransaction } from "./RevenueTransaction";

export {
  default as Payout,
  PayoutRequestStatus,
  PayoutMethodType,
} from "./Payout";
export type { IPayout, IBankDetails } from "./Payout";

export {
  default as VendorPayoutBatch,
  VendorPayoutBatchStatus,
  VendorPayoutBatchMethod,
} from "./VendorPayoutBatch";
export type { IVendorPayoutBatch } from "./VendorPayoutBatch";

export {
  default as VendorSubscription,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from "./VendorSubscription";
export type {
  IVendorSubscription,
  IPlanFeatures,
  IPlanPricing,
  IUsageTracking,
} from "./VendorSubscription";

export {
  default as AdminRevenueSettings,
  PayoutFrequency,
  CommissionStructure,
  TaxCalculationMethod,
} from "./AdminRevenueSettings";
export type {
  IAdminRevenueSettings,
  ITieredCommission,
  IPaymentGatewaySettings,
  ITaxSettings,
  IRefundPolicy,
  IRevenueSharingRule,
  IPlatformFees,
} from "./AdminRevenueSettings";

export {
  default as AdvertisingCampaign,
  CampaignType,
  CampaignStatus,
  BillingModel,
  AdPlacement,
} from "./AdvertisingCampaign";
export type {
  IAdvertisingCampaign,
  ITargeting,
  IBudgetSettings,
  IPerformanceMetrics,
  IAdContent,
} from "./AdvertisingCampaign";

export {
  default as EventAddon,
  AddonType,
  AddonStatus,
  PricingModel,
  AvailabilityType,
} from "./EventAddon";
export type {
  IEventAddon,
  ITieredPricing,
  IAddonRequirements,
  IAvailabilitySchedule,
} from "./EventAddon";
// Commission Management Models
export {
  default as CommissionConfig,
  ConfigStatus,
  CommissionRuleType,
  RecipientType,
  RuleStatus,
} from "./CommissionConfig";
export type {
  ICommissionConfig,
  ICommissionRule,
  IPlatformCommission,
  ITier,
  IRuleConditions,
  ILevelDistribution,
} from "./CommissionConfig";

export {
  default as CommissionTransaction,
  CommissionTransactionStatus,
  CommissionRecipientType,
} from "./CommissionTransaction";
export type {
  ICommissionTransaction,
  ICommissionDetail,
} from "./CommissionTransaction";

export { default as CancellationLog } from "./CancellationLog";
export type { ICancellationLog } from "./CancellationLog";

export { default as AffiliateEventClick } from "./AffiliateEventClick";
export type { IAffiliateEventClick } from "./AffiliateEventClick";

export { default as NewsletterSubscriber } from "./NewsletterSubscriber";
export type {
  INewsletterSubscriber,
  INewsletterSubscriberModel,
} from "./NewsletterSubscriber";

export { default as OrganizationOnboarding } from "./OrganizationOnboarding";
export type { IOrganizationOnboarding } from "./OrganizationOnboarding";

// Teacher Models
export {
  default as Teacher,
  TeacherVerificationStatus,
  TeachingMode,
  UAE_LANGUAGE,
  TeacherPaymentMode,
  TeacherSubscriptionStatus,
} from "./Teacher";
export type {
  ITeacher,
  ITeacherPaymentSettings,
  IStripeConfig,
  ITeacherBankDetails,
  IQualification,
  IAvailabilityHours,
  ITeachingAddress,
  ISocialLinks,
} from "./Teacher";

export { default as TeacherBooking } from "./TeacherBooking";
export type { ITeacherBooking } from "./TeacherBooking";

export { default as Gallery } from "./Gallery";
export type { IGallery, IGalleryImage } from "./Gallery";

export { default as GoogleReview } from "./GoogleReview";
export type { IGoogleReview } from "./GoogleReview";

export { default as Student } from "./Student";
export type { IStudent, IStudentModel } from "./Student";

export {
  default as Certificate,
  Template,
  TemplateVersion,
  SerialCounter,
  CertificateRequest,
  AuditLog,
} from "./Certificate";
export type {
  ICertificate,
  ITemplate,
  ITemplateVersion,
  ISerialCounter,
  ICertificateRequest,
  IAuditLog,
  CertificateStatus,
  CertRequestStatus,
  CertRequestType,
} from "./Certificate";

export {
  default as CommunicationLog,
  CommunicationChannel,
  CommunicationCategory,
  CommunicationStatus,
} from "./CommunicationLog";
export type {
  ICommunicationLog,
  ISafeProviderSummary,
} from "./CommunicationLog";

export {
  default as NotificationTemplate,
  NotificationTemplateKey,
} from "./NotificationTemplate";
export type { INotificationTemplate } from "./NotificationTemplate";


export { default as AnalyticsEvent } from "./AnalyticsEvent";
export type {
  IAnalyticsEvent,
  AnalyticsEventType,
  AnalyticsEventSection,
} from "./AnalyticsEvent";

export { default as LeadPage } from "./LeadPage";
export type { ILeadPage, ILead } from "./LeadPage";

