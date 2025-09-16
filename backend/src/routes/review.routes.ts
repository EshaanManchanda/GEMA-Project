import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createReview,
  getReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  voteReview,
  flagReview,
  respondToReview,
  getPendingReviews,
  moderateReview,
} from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/auth';
import { ReviewType, FlagReason, ReviewStatus } from '../models';

const router = Router();

// Public routes
// General reviews with query filters
router.get(
  '/',
  [
    query('type')
      .optional()
      .isIn(Object.values(ReviewType))
      .withMessage('Invalid review type'),
    query('targetId')
      .optional()
      .isMongoId()
      .withMessage('Invalid target ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    query('verified')
      .optional()
      .isBoolean()
      .withMessage('Verified must be a boolean'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'rating', 'helpfulVotes'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Invalid sort order'),
  ],
  getReviews
);

// Specific target reviews
router.get(
  '/:type/:id',
  [
    param('type')
      .isIn(Object.values(ReviewType))
      .withMessage('Invalid review type'),
    param('id')
      .isMongoId()
      .withMessage('Invalid target ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    query('verified')
      .optional()
      .isBoolean()
      .withMessage('Verified must be a boolean'),
  ],
  getReviews
);

// Protected routes
router.use(authenticate);

// Customer routes
router.get('/my-reviews', getUserReviews);

router.post(
  '/',
  [
    body('type')
      .isIn(Object.values(ReviewType))
      .withMessage('Invalid review type'),
    body('targetId')
      .isMongoId()
      .withMessage('Valid target ID is required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Comment cannot exceed 2000 characters'),
    body('pros')
      .optional()
      .isArray()
      .withMessage('Pros must be an array'),
    body('pros.*')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Each pro cannot exceed 200 characters'),
    body('cons')
      .optional()
      .isArray()
      .withMessage('Cons must be an array'),
    body('cons.*')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Each con cannot exceed 200 characters'),
    body('orderId')
      .optional()
      .isMongoId()
      .withMessage('Invalid order ID'),
    body('media')
      .optional()
      .isArray()
      .withMessage('Media must be an array'),
  ],
  createReview
);

router.put(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid review ID'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Comment cannot exceed 2000 characters'),
  ],
  updateReview
);

router.delete(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid review ID'),
  ],
  deleteReview
);

router.post(
  '/:id/vote',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid review ID'),
    body('helpful')
      .isBoolean()
      .withMessage('helpful must be a boolean'),
  ],
  voteReview
);

router.post(
  '/:id/flag',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid review ID'),
    body('reason')
      .isIn(Object.values(FlagReason))
      .withMessage('Invalid flag reason'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
  ],
  flagReview
);

router.post(
  '/:id/respond',
  authorize(['vendor']),
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid review ID'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Response message is required')
      .isLength({ max: 1000 })
      .withMessage('Response cannot exceed 1000 characters'),
  ],
  respondToReview
);

// Admin routes
router.get(
  '/admin/pending',
  authorize(['admin']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  getPendingReviews
);

router.put(
  '/admin/:id/moderate',
  authorize(['admin']),
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid review ID'),
    body('status')
      .isIn(Object.values(ReviewStatus))
      .withMessage('Invalid review status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters'),
  ],
  moderateReview
);

export default router;