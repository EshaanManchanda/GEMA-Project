// Core API service
export { default as api, ApiService } from '../api';
export type { ApiResponse, PaginatedResponse } from '../api';

// Auth API
export { default as authAPI } from './authAPI';

// Event Management APIs
export { default as eventsAPI } from './eventsAPI';
export { default as categoriesAPI } from './categoriesAPI';
export { default as venuesAPI } from './venuesAPI';

// Booking & Payment APIs
export { default as bookingAPI } from './bookingAPI';
export { default as paymentAPI } from './paymentAPI';

// User Management APIs
export { default as adminAPI } from './adminAPI';
export { default as vendorAPI } from './vendorAPI';
export { default as employeeAPI } from './employeeAPI';

// Content & Communication APIs
export { default as blogAPI } from './blogAPI';
export { default as reviewsAPI } from './reviewsAPI';
export { default as notificationAPI } from './notificationAPI';

// Business Logic APIs
export { default as couponAPI } from './couponAPI';
export { default as affiliateAPI } from './affiliateAPI';

// Utility APIs
export { default as searchAPI } from './searchAPI';
export { default as favoritesAPI } from './favoritesAPI';
export { default as uploadAPI } from './uploadAPI';
export { default as analyticsAPI } from './analyticsAPI';

// Type exports for new APIs
export type { Category, CreateCategoryData, UpdateCategoryData } from './categoriesAPI';
export type { 
  Coupon, 
  CouponUsage, 
  CreateCouponData, 
  UpdateCouponData, 
  CouponValidation, 
  CouponStats 
} from './couponAPI';
export type { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel, 
  NotificationStatus,
  NotificationAction, 
  NotificationDelivery, 
  CreateNotificationData, 
  NotificationAnalytics 
} from './notificationAPI';
export type { 
  Affiliate, 
  AffiliateStatus, 
  CommissionType,
  CommissionTier, 
  AffiliateClick, 
  AffiliateCommission, 
  ApplyAffiliateData, 
  UpdateProfileData, 
  DashboardStats, 
  AffiliateAnalytics 
} from './affiliateAPI';
export type { 
  Payment, 
  PaymentGateway, 
  PaymentMethodType, 
  PaymentStatus,
  BillingAddress, 
  PaymentRefund, 
  CreatePaymentData, 
  PaymentIntent, 
  PaymentMethodInfo, 
  RefundRequest, 
  PaymentAnalytics 
} from './paymentAPI';