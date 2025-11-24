import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addEventToCollection,
  removeEventFromCollection
} from '../controllers/collection.controller';
import { authenticate, authorize, validate } from '../middleware/index';

const router = Router();

// Public routes
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search must be between 2 and 100 characters'),
    query('sortBy')
      .optional()
      .isIn(['title', 'createdAt', 'updatedAt', 'sortOrder'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  validate,
  getCollections
);

router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
  ],
  validate,
  getCollectionById
);

// Admin routes (require authentication and admin role)
router.use(authenticate);
router.use(authorize(['admin']));

router.post(
  '/',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('icon')
      .trim()
      .notEmpty()
      .withMessage('Icon URL is required')
      .isURL()
      .withMessage('Icon must be a valid URL'),
    body('count')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Count text cannot exceed 50 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot exceed 50 characters'),
    body('events')
      .optional()
      .isArray()
      .withMessage('Events must be an array'),
    body('events.*')
      .optional()
      .isMongoId()
      .withMessage('Each event must be a valid ID'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
  ],
  validate,
  createCollection
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Description cannot be empty')
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('icon')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Icon URL cannot be empty')
      .isURL()
      .withMessage('Icon must be a valid URL'),
    body('count')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Count text cannot exceed 50 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot exceed 50 characters'),
    body('events')
      .optional()
      .isArray()
      .withMessage('Events must be an array'),
    body('events.*')
      .optional()
      .isMongoId()
      .withMessage('Each event must be a valid ID'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
  ],
  validate,
  updateCollection
);

router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
  ],
  validate,
  deleteCollection
);

// Event management routes
router.post(
  '/:id/events',
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
    body('eventId')
      .notEmpty()
      .withMessage('Event ID is required')
      .isMongoId()
      .withMessage('Invalid event ID')
  ],
  validate,
  addEventToCollection
);

router.delete(
  '/:id/events/:eventId',
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
    param('eventId').isMongoId().withMessage('Invalid event ID')
  ],
  validate,
  removeEventFromCollection
);

export default router;