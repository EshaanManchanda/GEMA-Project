import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getRootCategories,
  getCategoriesByParent,
  updateCategorySortOrder,
  updateEventCounts,
  searchCategories
} from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation rules
const createCategoryValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId'),
  body('slug')
    .optional()
    .isString()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string (legacy field)'),
  body('iconAsset')
    .optional()
    .isMongoId()
    .withMessage('Icon asset must be a valid MongoDB ObjectId'),
  body('featuredImageAsset')
    .optional()
    .isMongoId()
    .withMessage('Featured image asset must be a valid MongoDB ObjectId'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer (alias for sortOrder)'),
  body('seoMeta')
    .optional()
    .isObject()
    .withMessage('SEO meta must be an object'),
  body('seo')
    .optional()
    .isObject()
    .withMessage('SEO must be an object (alias for seoMeta)'),
  // Nested seoMeta field validation
  body('seoMeta.title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot exceed 60 characters'),
  body('seoMeta.description')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot exceed 160 characters'),
  body('seoMeta.keywords')
    .optional()
    .isArray()
    .withMessage('SEO keywords must be an array'),
  body('seoMeta.keywords.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each SEO keyword cannot exceed 50 characters'),
  // Also validate 'seo' alias (legacy support)
  body('seo.title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot exceed 60 characters'),
  body('seo.description')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot exceed 160 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Category ID must be valid'),
  ...createCategoryValidation
];

const sortOrderValidation = [
  body('categories')
    .isArray()
    .withMessage('Categories must be an array'),
  body('categories.*.id')
    .isMongoId()
    .withMessage('Category ID must be valid'),
  body('categories.*.sortOrder')
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
];

// Public routes
router.get('/', getCategories);
router.get('/roots', getRootCategories);
router.get('/search', 
  query('q').isString().isLength({ min: 1 }).withMessage('Search query is required'),
  validateRequest,
  searchCategories
);
router.get('/parent/:parentId', 
  param('parentId').custom((value) => {
    return value === 'null' || require('mongoose').Types.ObjectId.isValid(value);
  }).withMessage('Parent ID must be valid or "null"'),
  validateRequest,
  getCategoriesByParent
);
router.get('/:id', getCategory);

// Protected routes (Admin only)
router.use(authenticate);

router.post('/', 
  authorize(['admin']),
  createCategoryValidation,
  validateRequest,
  createCategory
);

router.put('/:id', 
  authorize(['admin']),
  updateCategoryValidation,
  validateRequest,
  updateCategory
);

router.delete('/:id', 
  authorize(['admin']),
  param('id').isMongoId().withMessage('Category ID must be valid'),
  validateRequest,
  deleteCategory
);

router.put('/sort-order/bulk', 
  authorize(['admin']),
  sortOrderValidation,
  validateRequest,
  updateCategorySortOrder
);

router.post('/update-counts', 
  authorize(['admin']),
  updateEventCounts
);

export default router;