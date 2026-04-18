export { default as Notification } from "./notification.model";
export type { INotification, INotificationModel, INotificationAction, INotificationDelivery } from "./notification.model";
export { NotificationType, NotificationPriority, NotificationChannel, NotificationStatus } from "./notification.model";
export { default as UserPushSubscription } from "./push-subscription.model";
export type { IUserPushSubscription } from "./push-subscription.model";

export { default as emailService } from "./email.service";
export type { EmailOptions, VerificationEmailOptions, PasswordResetEmailOptions, OrderConfirmationEmailOptions, TicketEmailOptions, VendorBookingNotificationOptions, EmployeeWelcomeEmailOptions, ContactNotificationOptions, PartnershipNotificationOptions, PartnershipConfirmationOptions, CancellationConfirmationEmailOptions, EventCancellationEmailOptions, RefundProcessedEmailOptions, RefundFailedEmailOptions } from "./email.service";
export { smsService } from "./sms.service";

export * as NotificationsController from "./notifications.controller";

export { default as notificationsRoutes } from "./notifications.routes";
