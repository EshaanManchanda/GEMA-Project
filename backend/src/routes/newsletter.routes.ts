import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  subscribe,
  unsubscribe,
  updatePreferences,
  getSubscriptionStatus,
  getSubscriberStats,
  sendNewsletter,
  unsubscribeByToken
} from '../controllers/newsletter.controller';

const router = Router();

// Public route - Subscribe to newsletter
router.post(
  '/subscribe',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('source')
      .optional()
      .isIn(['blog', 'footer', 'popup', 'checkout', 'profile', 'api'])
      .withMessage('Invalid subscription source'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),
    body('preferences.frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Frequency must be daily, weekly, or monthly'),
    body('preferences.categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    body('preferences.receivePromotions')
      .optional()
      .isBoolean()
      .withMessage('Receive promotions must be a boolean')
  ],
  validateRequest,
  subscribe
);

// Public route - Unsubscribe by token
router.get(
  '/unsubscribe/:token',
  [
    param('token')
      .isLength({ min: 32, max: 64 })
      .withMessage('Invalid unsubscribe token'),
    query('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],
  validateRequest,
  unsubscribeByToken
);

// Protected routes
router.use(authenticate);

// Get subscription status for authenticated user
router.get('/status', getSubscriptionStatus);

// Update subscription preferences
router.put(
  '/preferences',
  [
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Frequency must be daily, weekly, or monthly'),
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    body('receivePromotions')
      .optional()
      .isBoolean()
      .withMessage('Receive promotions must be a boolean')
  ],
  validateRequest,
  updatePreferences
);

// Unsubscribe authenticated user
router.post(
  '/unsubscribe',
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],
  validateRequest,
  unsubscribe
);

// Admin routes (require admin authentication)
router.get('/admin/stats', getSubscriberStats);

router.post(
  '/admin/send',
  [
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Subject must be between 1 and 200 characters'),
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Content is required'),
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Frequency must be daily, weekly, or monthly'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('testMode')
      .optional()
      .isBoolean()
      .withMessage('Test mode must be a boolean')
  ],
  validateRequest,
  sendNewsletter
);

export default router;