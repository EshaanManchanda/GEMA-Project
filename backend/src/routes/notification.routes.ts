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
} from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

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
const pushRoles = ['admin', 'customer', 'vendor', 'employee', 'teacher'];
router.post('/push/subscribe', authorize(pushRoles), subscribePush);
router.delete('/push/subscribe', authorize(pushRoles), unsubscribePush);

// User routes
router.get('/my',
  authorize(['admin', 'customer', 'vendor', 'employee', 'teacher']),
  getUserNotifications
);

router.get('/unread-count',
  authorize(['admin', 'customer', 'vendor', 'employee', 'teacher']),
  getUnreadCount
);

router.put('/mark-all-read',
  authorize(['admin', 'customer', 'vendor', 'employee', 'teacher']),
  markAllAsRead
);

router.get('/:id',
  authorize(['admin', 'customer', 'vendor', 'employee', 'teacher']),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  getNotification
);

router.put('/:id/read',
  authorize(['admin', 'customer', 'vendor', 'employee', 'teacher']),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  markAsRead
);

router.put('/:id/clicked',
  authorize(['admin', 'customer', 'vendor', 'employee', 'teacher']),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  markAsClicked
);

// Admin only routes
router.get('/',
  authorize(['admin']),
  getAllNotifications
);

router.post('/',
  authorize(['admin']),
  createNotificationValidation,
  validateRequest,
  createNotification
);

router.put('/:id',
  authorize(['admin']),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  updateNotification
);

router.delete('/:id',
  authorize(['admin']),
  param('id').isMongoId().withMessage('Notification ID must be valid'),
  validateRequest,
  deleteNotification
);

router.get('/analytics/overview',
  authorize(['admin']),
  getNotificationAnalytics
);

router.post('/bulk/send',
  authorize(['admin']),
  bulkNotificationValidation,
  validateRequest,
  sendBulkNotifications
);

export default router;
