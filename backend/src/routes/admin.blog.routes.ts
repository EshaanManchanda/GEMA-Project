import { Router } from 'express';
import mongoose from 'mongoose';
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogsAdmin,
  getBlogById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategoriesAdmin,
  toggleCategoryStatus
} from '../controllers/blog.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation rules
const createBlogValidation = [
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('slug')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Slug must be between 1 and 200 characters'),
  body('excerpt')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Excerpt must be between 1 and 500 characters'),
  body('content')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  body('featuredImage')
    .optional({ checkFalsy: true })
    .isString()
    .custom((value) => {
      if (!value) return true; // Allow empty/undefined
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Featured image must be a valid URL');
      }
    }),
  body('featuredImageAsset')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }
      throw new Error('Featured image asset must be a valid MongoDB ObjectId');
    }),
  body('category')
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  body('author.name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author name must be between 1 and 100 characters'),
  body('author.email')
    .isEmail()
    .withMessage('Author email must be valid'),
  body('author.avatar')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Author avatar must be a valid URL'),
  body('author.bio')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Author bio cannot exceed 500 characters'),
  body('tags')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  body('featured')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('Featured must be a boolean'),
  body('seo.metaTitle')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  body('seo.metaDescription')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
  body('seo.metaKeywords')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Meta keywords must be an array'),
  body('seo.canonicalUrl')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true; // Optional field
      try {
        const url = new URL(value);
        // Allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol');
        }
        return true;
      } catch {
        throw new Error('Canonical URL must be valid');
      }
    })
];

const updateBlogValidation = [
  param('id').isMongoId().withMessage('Blog ID must be valid'),
  body('title')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('slug')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Slug must be between 1 and 200 characters'),
  body('excerpt')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Excerpt must be between 1 and 500 characters'),
  body('content')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  body('featuredImage')
    .optional({ checkFalsy: true })
    .isString()
    .custom((value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Featured image must be a valid URL');
      }
    }),
  body('featuredImageAsset')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }
      throw new Error('Featured image asset must be a valid MongoDB ObjectId');
    }),
  body('category')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  body('author.name')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author name must be between 1 and 100 characters'),
  body('author.email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Author email must be valid'),
  body('author.avatar')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Author avatar must be a valid URL'),
  body('author.bio')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Author bio cannot exceed 500 characters'),
  body('tags')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  body('featured')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('Featured must be a boolean'),
  body('seo.metaTitle')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  body('seo.metaDescription')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
  body('seo.metaKeywords')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Meta keywords must be an array'),
  body('seo.canonicalUrl')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true; // Optional field
      try {
        const url = new URL(value);
        // Allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol');
        }
        return true;
      } catch {
        throw new Error('Canonical URL must be valid');
      }
    })
];

const createCategoryValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('color')
    .optional()
    .isString()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color')
];

const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Category ID must be valid'),
  ...createCategoryValidation.map(validation => validation.optional())
];

const getBlogValidation = [
  param('id').isMongoId().withMessage('Blog ID must be valid')
];

const deleteBlogValidation = [
  param('id').isMongoId().withMessage('Blog ID must be valid')
];

const deleteCategoryValidation = [
  param('id').isMongoId().withMessage('Category ID must be valid')
];

const getAllBlogsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid ID'),
  query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'likeCount'])
    .withMessage('Sort by must be a valid field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// All admin blog routes require authentication and admin/superadmin role
router.use(authenticate);
router.use(authorize(['admin', 'superadmin']));

// Blog management routes
router.route('/')
  .get(getAllBlogsValidation, validateRequest, getAllBlogsAdmin)
  .post(createBlogValidation, validateRequest, createBlog);

// Blog category management routes (must come before /:id to avoid route conflicts)
router.route('/categories')
  .get(validateRequest, getAllCategoriesAdmin)
  .post(createCategoryValidation, validateRequest, createCategory);

router.route('/categories/:id')
  .put(updateCategoryValidation, validateRequest, updateCategory)
  .delete(deleteCategoryValidation, validateRequest, deleteCategory);

router.patch('/categories/:id/toggle-status',
  param('id').isMongoId().withMessage('Invalid category ID'),
  validateRequest,
  toggleCategoryStatus
);

// Blog ID routes (must come after specific routes like /categories)
router.route('/:id')
  .get(getBlogValidation, validateRequest, getBlogById)
  .put(updateBlogValidation, validateRequest, updateBlog)
  .delete(deleteBlogValidation, validateRequest, deleteBlog);

export default router;