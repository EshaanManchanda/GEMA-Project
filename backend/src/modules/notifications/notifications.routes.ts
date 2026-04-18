import { Router } from 'express';
import {
  getUserNotifications,
  getNotification,
  markAsRead,
  markAsClicked,
  markAllAsRead,
  getUnreadCount,
  createNotification,
  updateNotification,
  deleteNotification,
  getAllNotifications,
  getNotificationAnalytics,
  sendBulkNotifications,
  subscribePush,
  unsubscribePush,
} from './notifications.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { body, param } from 'express-validator';
import { UserRole } from '../../models/index';

const router = Router();

const createNotificationValidation = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be valid'),
  body('type')
    .isIn([
      'booking_confirmed', 'booking_cancelled', 'payment_success', 'payment_failed',
      'event_reminder', 'event_approved', 'event_rejected', 'vendor_application_approved',
      'vendor_application_rejected', 'review_received', 'payout_processed',
      'system_maintenance', 'promotional', 'welcome', 'password_reset', 'email_verification'
    ])
    .withMessage('Invalid notification type'),
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
];

const bulkNotificationValidation = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs array must not be empty'),
  body('userIds.*')
    .isMongoId()
    .withMessage('User ID must be valid'),
  body('type')
    .isIn([
      'booking_confirmed', 'booking_cancelled', 'payment_success', 'payment_failed',
      'event_reminder', 'event_approved', 'event_rejected', 'vendor_application_approved',
      'vendor_application_rejected', 'review_received', 'payout_processed',
      'system_maintenance', 'promotional', 'welcome', 'password_reset', 'email_verification'
    ])
    .withMessage('Invalid notification type'),
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
];

router.use(authenticate);

// Push subscription routes
const pushRoles = [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER];
router.post('/push/subscribe', authorize(pushRoles), subscribePush);
router.delete('/push/subscribe', authorize(pushRoles), unsubscribePush);

// User routes
router.get('/my',
  authorize([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER]),
  getUserNotifications
);

router.get('/unread-count',
  authorize([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER]),
  getUnreadCount
);

router.put('/mark-all-read',
  authorize([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER]),
  markAllAsRead
);

router.get('/:id',
  authorize([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER]),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  getNotification
);

router.put('/:id/read',
  authorize([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER]),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  markAsRead
);

router.put('/:id/clicked',
  authorize([UserRole.ADMIN, UserRole.CUSTOMER, UserRole.VENDOR, UserRole.EMPLOYEE, UserRole.TEACHER]),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  markAsClicked
);

// Admin only routes
router.get('/',
  authorize([UserRole.ADMIN]),
  getAllNotifications
);

router.post('/',
  authorize([UserRole.ADMIN]),
  createNotificationValidation,
  validateRequest,
  createNotification
);

router.put('/:id',
  authorize([UserRole.ADMIN]),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  updateNotification
);

router.delete('/:id',
  authorize([UserRole.ADMIN]),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  deleteNotification
);

router.get('/analytics/overview',
  authorize([UserRole.ADMIN]),
  getNotificationAnalytics
);

router.post('/bulk/send',
  authorize([UserRole.ADMIN]),
  bulkNotificationValidation,
  validateRequest,
  sendBulkNotifications
);

export default router;
