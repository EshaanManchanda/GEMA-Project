import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getAdminCollections,
  getCollectionStats,
  getCollectionById,
  createCollectionWithFiles,
  updateCollectionWithFiles,
  deleteCollection,
  bulkUpdateCollections,
  addEventToCollection,
  removeEventFromCollection
} from '../controllers/collection.controller';
import { authenticate, authorize, validate } from '../middleware/index';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Stats endpoint (before parameterized routes)
router.get('/stats', getCollectionStats);

// Bulk update
router.patch(
  '/bulk',
  [
    body('collectionIds')
      .isArray({ min: 1 })
      .withMessage('Collection IDs array is required'),
    body('collectionIds.*')
      .isMongoId()
      .withMessage('Each collection ID must be valid'),
    body('updateData')
      .isObject()
      .withMessage('Update data is required'),
  ],
  validate,
  bulkUpdateCollections
);

// Get all collections (admin - includes inactive)
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search must be between 2 and 100 characters'),
    query('category')
      .optional()
      .trim(),
    query('isActive')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isActive must be true or false'),
    query('sortBy')
      .optional()
      .isIn(['title', 'createdAt', 'updatedAt', 'sortOrder', 'category'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  validate,
  getAdminCollections
);

// Create collection
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
    body('iconAsset')
      .optional()
      .isMongoId()
      .withMessage('Icon asset must be a valid MediaAsset ID'),
    body('featuredImageAsset')
      .optional()
      .isMongoId()
      .withMessage('Featured image asset must be a valid MediaAsset ID'),
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
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('slug')
      .optional()
      .trim()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  ],
  validate,
  createCollectionWithFiles
);

// Get collection by ID
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
  ],
  validate,
  getCollectionById
);

// Update collection
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
    body('iconAsset')
      .optional()
      .custom((value) => value === null || value === '' || /^[a-f\d]{24}$/i.test(value))
      .withMessage('Icon asset must be a valid MediaAsset ID or null'),
    body('featuredImageAsset')
      .optional()
      .custom((value) => value === null || value === '' || /^[a-f\d]{24}$/i.test(value))
      .withMessage('Featured image asset must be a valid MediaAsset ID or null'),
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
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('slug')
      .optional()
      .trim()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  ],
  validate,
  updateCollectionWithFiles
);

// Delete collection (soft delete - sets isActive to false)
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
