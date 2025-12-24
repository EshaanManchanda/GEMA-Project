import { body, ValidationChain } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Validation rules for Collection bulk import
 *
 * Relationship Resolution:
 * - events: Accept eventTitles[] OR eventIds[]
 * - iconAsset, featuredImageAsset: Accept MediaAsset IDs
 *
 * Shadow Fields (Migration Support):
 * - icon (OLD) vs iconAsset (NEW) - prefer iconAsset
 * - featuredImage (OLD) vs featuredImageAsset (NEW) - prefer featuredImageAsset
 *
 * Auto-Generation:
 * - slug: Auto-generated from title if not provided
 * - count: Auto-generated from actual event count (don't import)
 * - eventsData: Auto-regenerated from events[] (don't import directly)
 */

export const validateCollectionImport: ValidationChain[] = [
  // Root array validation
  body('data')
    .isArray({ min: 1, max: 10000 })
    .withMessage('Data must be an array with 1-10000 items'),

  // ========== BASIC FIELDS ==========

  // Title (required)
  body('data.*.title')
    .notEmpty().withMessage('Collection title is required')
    .isString().withMessage('Title must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),

  // Description (required)
  body('data.*.description')
    .notEmpty().withMessage('Collection description is required')
    .isString().withMessage('Description must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  // Slug (optional - auto-generated from title if not provided)
  body('data.*.slug')
    .optional()
    .isString().withMessage('Slug must be a string')
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .isLength({ max: 100 }).withMessage('Slug cannot exceed 100 characters'),

  // Category (optional filter)
  body('data.*.category')
    .optional()
    .isString().withMessage('Category must be a string')
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),

  // Status fields
  body('data.*.isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('data.*.sortOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('sortOrder must be a non-negative integer'),

  // ========== EVENT RELATIONSHIPS ==========
  // Accept eventTitles[] OR eventIds[] (at least one required)

  body('data.*.eventTitles')
    .optional()
    .isArray({ min: 1, max: 100 })
    .withMessage('eventTitles must be an array with 1-100 items'),

  body('data.*.eventTitles.*')
    .optional()
    .isString().withMessage('Each event title must be a string')
    .trim()
    .notEmpty().withMessage('Event titles cannot be empty'),

  body('data.*.eventIds')
    .optional()
    .isArray({ min: 1, max: 100 })
    .withMessage('eventIds must be an array with 1-100 items'),

  body('data.*.eventIds.*')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Each eventId must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  // At least one of eventTitles or eventIds required
  body('data.*')
    .custom((value) => {
      const hasEventTitles = value.eventTitles && Array.isArray(value.eventTitles) && value.eventTitles.length > 0;
      const hasEventIds = value.eventIds && Array.isArray(value.eventIds) && value.eventIds.length > 0;

      if (!hasEventTitles && !hasEventIds) {
        throw new Error('Either eventTitles or eventIds is required');
      }
      return true;
    }),

  // ========== SHADOW FIELDS (MIGRATION SUPPORT) ==========

  // Icon - OLD field (deprecated, accept for backward compatibility)
  body('data.*.icon')
    .optional()
    .isString().withMessage('icon must be a string')
    .isURL().withMessage('icon must be a valid URL'),

  // IconAsset - NEW field (MediaAsset reference)
  body('data.*.iconAsset')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('iconAsset must be a valid MediaAsset ID');
      }
      return true;
    }),

  // FeaturedImage - OLD field (deprecated)
  body('data.*.featuredImage')
    .optional()
    .isString().withMessage('featuredImage must be a string')
    .isURL().withMessage('featuredImage must be a valid URL'),

  // FeaturedImageAsset - NEW field (MediaAsset reference)
  body('data.*.featuredImageAsset')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('featuredImageAsset must be a valid MediaAsset ID');
      }
      return true;
    }),

  // ========== SEO METADATA ==========

  body('data.*.seo')
    .optional()
    .isObject().withMessage('seo must be an object'),

  body('data.*.seo.metaTitle')
    .optional()
    .isString().withMessage('seo.metaTitle must be a string')
    .trim()
    .isLength({ max: 70 }).withMessage('Meta title cannot exceed 70 characters'),

  body('data.*.seo.metaDescription')
    .optional()
    .isString().withMessage('seo.metaDescription must be a string')
    .trim()
    .isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters'),

  body('data.*.seo.metaKeywords')
    .optional()
    .isArray({ max: 10 }).withMessage('Meta keywords cannot have more than 10 items'),

  body('data.*.seo.metaKeywords.*')
    .optional()
    .isString().withMessage('Each meta keyword must be a string')
    .trim()
    .notEmpty().withMessage('Meta keywords cannot be empty'),

  body('data.*.seo.canonicalUrl')
    .optional()
    .isString().withMessage('seo.canonicalUrl must be a string')
    .trim()
    .isURL().withMessage('Canonical URL must be a valid URL'),

  // ========== FORBIDDEN FIELDS ==========
  // These fields are auto-generated and should not be imported

  body('data.*.count')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('count is auto-generated from event count and cannot be imported directly');
      }
      return true;
    }),

  body('data.*.eventsData')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('eventsData is auto-regenerated from events[] and cannot be imported directly');
      }
      return true;
    }),

  body('data.*.dataVersion')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('dataVersion is managed automatically and cannot be imported');
      }
      return true;
    }),

  body('data.*.lastSyncedAt')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('lastSyncedAt is managed automatically and cannot be imported');
      }
      return true;
    }),
];

/**
 * Validation rules for Collection bulk export
 */
export const validateCollectionExport: ValidationChain[] = [
  body('filters')
    .optional()
    .isObject().withMessage('Filters must be an object'),

  // Filter by active status
  body('filters.isActive')
    .optional()
    .isBoolean().withMessage('filters.isActive must be a boolean'),

  // Filter by category
  body('filters.category')
    .optional()
    .isString().withMessage('filters.category must be a string')
    .trim(),

  // Filter by event count range
  body('filters.minEventCount')
    .optional()
    .isInt({ min: 0 }).withMessage('filters.minEventCount must be a non-negative integer'),

  body('filters.maxEventCount')
    .optional()
    .isInt({ min: 0 }).withMessage('filters.maxEventCount must be a non-negative integer'),

  // Date range filters
  body('filters.createdAfter')
    .optional()
    .isISO8601().withMessage('filters.createdAfter must be a valid ISO 8601 date')
    .toDate(),

  body('filters.createdBefore')
    .optional()
    .isISO8601().withMessage('filters.createdBefore must be a valid ISO 8601 date')
    .toDate(),

  body('filters.updatedAfter')
    .optional()
    .isISO8601().withMessage('filters.updatedAfter must be a valid ISO 8601 date')
    .toDate(),

  body('filters.updatedBefore')
    .optional()
    .isISO8601().withMessage('filters.updatedBefore must be a valid ISO 8601 date')
    .toDate(),

  // Search by title or description
  body('filters.search')
    .optional()
    .isString().withMessage('filters.search must be a string')
    .trim()
    .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),

  // Export options
  body('includeRelationships')
    .optional()
    .isBoolean().withMessage('includeRelationships must be a boolean'),

  body('includeEventsData')
    .optional()
    .isBoolean().withMessage('includeEventsData must be a boolean'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage('Limit must be between 1 and 50000'),

  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),

  // Sort options
  body('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt', 'sortOrder', 'slug'])
    .withMessage('sortBy must be one of: title, createdAt, updatedAt, sortOrder, slug'),

  body('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be either asc or desc'),
];
