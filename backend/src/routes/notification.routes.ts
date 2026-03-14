// import { Router } from 'express';
// // import {
// //   getUserNotifications,
// //   getNotification,
// //   markAsRead,
// //   markAsClicked,
// //   markAllAsRead,
// //   getUnreadCount,
// //   createNotification,
// //   updateNotification,
// //   deleteNotification,
// //   getAllNotifications,
// //   getNotificationAnalytics,
// //   sendBulkNotifications
// // } from '../controllers/notification.controller';
// import { authenticate, authorize } from '../middleware/auth';
// import { validateRequest } from '../middleware/validation';
// import { body, param, query } from 'express-validator';

// const router = Router();

// // Validation rules
// const createNotificationValidation = [
//   body('userId')
//     .if((value, { req }) => !req.body.targetAudience)
//     .isMongoId()
//     .withMessage('User ID must be valid when not using target audience'),
//   body('type')
//     .isIn([
//       'booking_confirmed', 'booking_cancelled', 'payment_success', 'payment_failed',
//       'event_reminder', 'event_approved', 'event_rejected', 'vendor_application_approved',
//       'vendor_application_rejected', 'review_received', 'payout_processed',
//       'system_maintenance', 'promotional', 'welcome', 'password_reset', 'email_verification'
//     ])
//     .withMessage('Invalid notification type'),
//   body('priority')
//     .optional()
//     .isIn(['low', 'medium', 'high', 'urgent'])
//     .withMessage('Priority must be low, medium, high, or urgent'),
//   body('title')
//     .isString()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
//   body('message')
//     .isString()
//     .isLength({ min: 1, max: 1000 })
//     .withMessage('Message must be between 1 and 1000 characters'),
//   body('shortMessage')
//     .optional()
//     .isString()
//     .isLength({ max: 160 })
//     .withMessage('Short message cannot exceed 160 characters'),
//   body('channels')
//     .optional()
//     .isArray()
//     .withMessage('Channels must be an array'),
//   body('channels.*')
//     .optional()
//     .isIn(['in_app', 'email', 'sms', 'push'])
//     .withMessage('Invalid notification channel'),
//   body('relatedId')
//     .optional()
//     .isMongoId()
//     .withMessage('Related ID must be valid'),
//   body('relatedType')
//     .optional()
//     .isIn(['booking', 'event', 'order', 'user', 'payment', 'review'])
//     .withMessage('Invalid related type'),
//   body('scheduledFor')
//     .optional()
//     .isISO8601()
//     .toDate()
//     .withMessage('Scheduled for must be a valid date'),
//   body('expiresAt')
//     .optional()
//     .isISO8601()
//     .toDate()
//     .custom((expiresAt, { req }) => {
//       const scheduledFor = req.body.scheduledFor || new Date();
//       if (expiresAt <= scheduledFor) {
//         throw new Error('Expiry date must be after scheduled date');
//       }
//       return true;
//     }),
//   body('targetAudience')
//     .optional()
//     .isObject()
//     .withMessage('Target audience must be an object'),
//   body('targetAudience.userRole')
//     .optional()
//     .isArray()
//     .withMessage('User role must be an array'),
//   body('targetAudience.userRole.*')
//     .optional()
//     .isIn(['admin', 'customer', 'vendor', 'employee'])
//     .withMessage('Invalid user role'),
//   body('actions')
//     .optional()
//     .isArray()
//     .withMessage('Actions must be an array'),
//   body('actions.*.label')
//     .optional()
//     .isString()
//     .isLength({ min: 1, max: 50 })
//     .withMessage('Action label must be between 1 and 50 characters'),
//   body('actions.*.action')
//     .optional()
//     .isString()
//     .isLength({ min: 1, max: 100 })
//     .withMessage('Action must be between 1 and 100 characters'),
//   body('actions.*.url')
//     .optional()
//     .isURL()
//     .withMessage('Action URL must be valid'),
//   body('actions.*.style')
//     .optional()
//     .isIn(['primary', 'secondary', 'danger', 'success'])
//     .withMessage('Invalid action style')
// ];

// const updateNotificationValidation = [
//   param('id').isMongoId().withMessage('Notification ID must be valid'),
//   ...createNotificationValidation.map(validation => validation.optional())
// ];

// const bulkNotificationValidation = [
//   body('userIds')
//     .isArray()
//     .custom(array => array.length > 0)
//     .withMessage('User IDs array must not be empty'),
//   body('userIds.*')
//     .isMongoId()
//     .withMessage('User ID must be valid'),
//   body('type')
//     .isIn([
//       'booking_confirmed', 'booking_cancelled', 'payment_success', 'payment_failed',
//       'event_reminder', 'event_approved', 'event_rejected', 'vendor_application_approved',
//       'vendor_application_rejected', 'review_received', 'payout_processed',
//       'system_maintenance', 'promotional', 'welcome', 'password_reset', 'email_verification'
//     ])
//     .withMessage('Invalid notification type'),
//   body('title')
//     .isString()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
//   body('message')
//     .isString()
//     .isLength({ min: 1, max: 1000 })
//     .withMessage('Message must be between 1 and 1000 characters')
// ];

// // Protected routes - User access
// router.use(authenticate);

// // User routes - accessible by authenticated customers, vendors, employees
// // router.get('/my',
// //   authorize(['admin', 'customer', 'vendor', 'employee']),
// //   getUserNotifications
// // );
// // router.get('/unread-count',
// //   authorize(['admin', 'customer', 'vendor', 'employee']),
// //   getUnreadCount
// // );
// // router.put('/mark-all-read',
// //   authorize(['admin', 'customer', 'vendor', 'employee']),
// //   markAllAsRead
// // );
// // router.get('/:id',
// //   authorize(['admin', 'customer', 'vendor', 'employee']),
// //   param('id').isMongoId().withMessage('Notification ID must be valid'),
// //   validateRequest,
// //   getNotification
// // );
// // router.put('/:id/read',
// //   authorize(['admin', 'customer', 'vendor', 'employee']),
// //   param('id').isMongoId().withMessage('Notification ID must be valid'),
// //   validateRequest,
// //   markAsRead
// // );
// router.put('/:id/clicked',
//   authorize(['admin', 'customer', 'vendor', 'employee']),
//   param('id').isMongoId().withMessage('Notification ID must be valid'),
//   validateRequest,
//   markAsClicked
// );

// // Admin only routes
// router.get('/',
//   authorize(['admin']),
//   getAllNotifications
// );

// router.post('/',
//   authorize(['admin']),
//   createNotificationValidation,
//   validateRequest,
//   createNotification
// );

// router.put('/:id',
//   authorize(['admin']),
//   updateNotificationValidation,
//   validateRequest,
//   updateNotification
// );

// router.delete('/:id',
//   authorize(['admin']),
//   param('id').isMongoId().withMessage('Notification ID must be valid'),
//   validateRequest,
//   deleteNotification
// );

// router.get('/analytics/overview',
//   authorize(['admin']),
//   getNotificationAnalytics
// );

// router.post('/bulk/send',
//   authorize(['admin']),
//   bulkNotificationValidation,
//   validateRequest,
//   sendBulkNotifications
// );

// export default router;
