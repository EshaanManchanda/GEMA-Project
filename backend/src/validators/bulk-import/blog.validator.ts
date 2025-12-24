import { body } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Validator for Blog bulk import
 * Handles shadow fields, category relationships, author object
 */
export const validateBlogImport = [
  // Validate data array
  body('data')
    .isArray({ min: 1, max: 10000 })
    .withMessage('data must be an array with 1-10000 items'),

  // Required fields
  body('data.*.title')
    .notEmpty()
    .withMessage('Blog title is required')
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('data.*.slug')
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

  body('data.*.excerpt')
    .notEmpty()
    .withMessage('Blog excerpt is required')
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),

  body('data.*.content')
    .notEmpty()
    .withMessage('Blog content is required')
    .isString(),

  body('data.*.rawHtmlContent')
    .optional()
    .isString()
    .withMessage('rawHtmlContent must be a string'),

  // Category - accepts categoryName OR categoryId
  body('data.*.categoryName')
    .optional()
    .isString()
    .trim()
    .withMessage('categoryName must be a string'),

  body('data.*.categoryId')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('categoryId must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  // Category validation: one of name or id required
  body('data.*')
    .custom((value) => {
      if (!value.categoryName && !value.categoryId && !value.category) {
        throw new Error('Either categoryName or categoryId is required');
      }
      return true;
    }),

  // Author object
  body('data.*.author.name')
    .notEmpty()
    .withMessage('Author name is required')
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Author name cannot exceed 100 characters'),

  body('data.*.author.email')
    .notEmpty()
    .withMessage('Author email is required')
    .isEmail()
    .withMessage('Author email must be valid')
    .normalizeEmail()
    .toLowerCase(),

  body('data.*.author.avatar')
    .optional()
    .isString()
    .trim()
    .isURL()
    .withMessage('Author avatar must be a valid URL'),

  body('data.*.author.bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Author bio cannot exceed 300 characters'),

  // Tags
  body('data.*.tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Cannot have more than 20 tags'),

  body('data.*.tags.*')
    .optional()
    .isString()
    .trim(),

  // Status
  body('data.*.status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('status must be: draft, published, or archived'),

  // Featured flag
  body('data.*.featured')
    .optional()
    .isBoolean()
    .withMessage('featured must be a boolean'),

  // Read time (minutes)
  body('data.*.readTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('readTime must be at least 1 minute'),

  // View count
  body('data.*.viewCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('viewCount cannot be negative'),

  // Like count
  body('data.*.likeCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('likeCount cannot be negative'),

  // Shadow fields: featuredImage (old) vs featuredImageAsset (new)
  body('data.*.featuredImage')
    .optional()
    .isString()
    .isURL()
    .withMessage('featuredImage must be a valid URL'),

  body('data.*.featuredImageAsset')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('featuredImageAsset must be a valid MediaAsset ID');
      }
      return true;
    }),

  // SEO object
  body('data.*.seo.metaTitle')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 70 })
    .withMessage('SEO meta title cannot exceed 70 characters'),

  body('data.*.seo.metaDescription')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO meta description cannot exceed 160 characters'),

  body('data.*.seo.metaKeywords')
    .optional()
    .isArray({ max: 10 })
    .withMessage('SEO meta keywords must be an array with max 10 items'),

  body('data.*.seo.metaKeywords.*')
    .optional()
    .isString()
    .trim(),

  body('data.*.seo.canonicalUrl')
    .optional()
    .isString()
    .trim()
    .isURL()
    .withMessage('Canonical URL must be valid'),

  // Published date
  body('data.*.publishedAt')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('publishedAt must be a valid date'),

  // _id for updates (upsert mode)
  body('data.*._id')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('_id must be a valid MongoDB ObjectId');
      }
      return true;
    })
];

/**
 * Validator for Blog bulk export filters
 */
export const validateBlogExportFilters = [
  body('filters.status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('status must be: draft, published, or archived'),

  body('filters.featured')
    .optional()
    .isBoolean()
    .withMessage('featured must be a boolean'),

  body('filters.categoryId')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('categoryId must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  body('filters.categoryName')
    .optional()
    .isString(),

  body('filters.dateRange.field')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publishedAt'])
    .withMessage('dateRange.field must be: createdAt, updatedAt, or publishedAt'),

  body('filters.dateRange.start')
    .optional()
    .isISO8601(),

  body('filters.dateRange.end')
    .optional()
    .isISO8601(),

  body('filters.limit')
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage('limit must be between 1 and 50000'),

  body('includeRelationships')
    .optional()
    .isBoolean(),

  body('format')
    .optional()
    .isIn(['json'])
];
