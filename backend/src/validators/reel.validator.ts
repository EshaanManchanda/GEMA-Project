import { body, query, param } from 'express-validator';
import {
  validateMongoId,
  validatePagination,
  validateStringLength
} from './common.validator';

/**
 * Reel validation constants
 */
export const VISIBILITY_OPTIONS = ['public', 'draft', 'archived'];
export const VIDEO_SOURCE_TYPES = ['uploaded', 'youtube', 'instagram'];

/**
 * Create reel validation
 */
export const createReelValidation = [
  validateStringLength('title', 1, 200, true),
  validateStringLength('description', 0, 1000, false),

  body('videoSourceType')
    .optional()
    .isIn(VIDEO_SOURCE_TYPES)
    .withMessage(`Video source type must be one of: ${VIDEO_SOURCE_TYPES.join(', ')}`),

  // Conditional validation: videoAsset required only for uploaded videos
  body('videoAsset')
    .if((value, { req }) => {
      const sourceType = req.body.videoSourceType;
      return !sourceType || sourceType === 'uploaded';
    })
    .trim()
    .notEmpty()
    .withMessage('Video asset is required for uploaded videos')
    .isMongoId()
    .withMessage('Invalid video asset ID')
    .bail(),

  // Skip videoAsset validation for external sources
  body('videoAsset')
    .if((value, { req }) => {
      const sourceType = req.body.videoSourceType;
      return sourceType === 'youtube' || sourceType === 'instagram';
    })
    .optional({ values: 'falsy' }),

  // Conditional validation: externalVideoUrl required for YouTube/Instagram
  body('externalVideoUrl')
    .if((value, { req }) => {
      const sourceType = req.body.videoSourceType;
      return sourceType === 'youtube' || sourceType === 'instagram';
    })
    .trim()
    .notEmpty()
    .withMessage('External video URL is required for YouTube/Instagram')
    .isURL()
    .withMessage('Invalid URL format'),

  body('embedCode')
    .optional({ values: 'falsy' })
    .trim()
    .isString()
    .withMessage('Embed code must be a string'),

  body('thumbnailAsset')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid thumbnail asset ID'),

  body('visibility')
    .optional()
    .isIn(VISIBILITY_OPTIONS)
    .withMessage(`Visibility must be one of: ${VISIBILITY_OPTIONS.join(', ')}`),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
    .toInt(),

  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer')
    .toInt(),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must be maximum 50 characters')
    .escape(),

  body('showLikeButton')
    .optional()
    .isBoolean()
    .withMessage('Show like button must be a boolean'),

  body('showShareButton')
    .optional()
    .isBoolean()
    .withMessage('Show share button must be a boolean'),

  body('showTitle')
    .optional()
    .isBoolean()
    .withMessage('Show title must be a boolean'),

  body('linkedEvent')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid event ID')
];

/**
 * Update reel validation (same as create but all optional)
 */
export const updateReelValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reel ID'),

  validateStringLength('title', 1, 200, false),
  validateStringLength('description', 0, 1000, false),

  body('videoSourceType')
    .optional()
    .isIn(VIDEO_SOURCE_TYPES)
    .withMessage(`Video source type must be one of: ${VIDEO_SOURCE_TYPES.join(', ')}`),

  body('videoAsset')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid video asset ID'),

  body('externalVideoUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isURL()
    .withMessage('Invalid URL format'),

  body('embedCode')
    .optional({ values: 'falsy' })
    .trim()
    .isString()
    .withMessage('Embed code must be a string'),

  body('thumbnailAsset')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid thumbnail asset ID'),

  body('visibility')
    .optional()
    .isIn(VISIBILITY_OPTIONS)
    .withMessage(`Visibility must be one of: ${VISIBILITY_OPTIONS.join(', ')}`),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
    .toInt(),

  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer')
    .toInt(),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must be maximum 50 characters')
    .escape(),

  body('showLikeButton')
    .optional()
    .isBoolean()
    .withMessage('Show like button must be a boolean'),

  body('showShareButton')
    .optional()
    .isBoolean()
    .withMessage('Show share button must be a boolean'),

  body('showTitle')
    .optional()
    .isBoolean()
    .withMessage('Show title must be a boolean'),

  body('linkedEvent')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid event ID')
];

/**
 * Get all reels validation (admin)
 */
export const getAllReelsValidation = [
  ...validatePagination,

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be maximum 100 characters'),

  query('visibility')
    .optional()
    .isIn(VISIBILITY_OPTIONS)
    .withMessage(`Visibility must be one of: ${VISIBILITY_OPTIONS.join(', ')}`),

  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean')
    .toBoolean()
];

/**
 * Get public reels validation
 */
export const getReelsValidation = [
  ...validatePagination
];

/**
 * Get reel by ID validation
 */
export const getReelValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reel ID')
];

/**
 * Delete reel validation
 */
export const deleteReelValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reel ID')
];

/**
 * Update visibility validation
 */
export const updateVisibilityValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reel ID'),

  body('visibility')
    .isIn(VISIBILITY_OPTIONS)
    .withMessage(`Visibility must be one of: ${VISIBILITY_OPTIONS.join(', ')}`)
];

/**
 * Update display orders validation
 */
export const updateDisplayOrdersValidation = [
  body('reels')
    .isArray({ min: 1 })
    .withMessage('Reels array is required with at least one item'),

  body('reels.*.id')
    .isMongoId()
    .withMessage('Each reel must have a valid ID'),

  body('reels.*.displayOrder')
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
    .toInt()
];

/**
 * Increment view validation
 */
export const incrementViewValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reel ID')
];

/**
 * Toggle like validation
 */
export const toggleLikeValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reel ID'),

  body('increment')
    .optional()
    .isBoolean()
    .withMessage('Increment must be a boolean')
    .toBoolean()
];
