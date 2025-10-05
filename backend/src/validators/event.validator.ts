import { body, query } from 'express-validator';
import {
  validateMongoId,
  validatePagination,
  validateSort,
  validateDateRange,
  validatePriceRange,
  validateSearch,
  validateEnum,
  validateArray,
  validateStringLength,
  validateNumericRange,
  sanitizeHtml
} from './common.validator';

/**
 * Event validation rules
 */

// Allowed event types
export const EVENT_TYPES = ['Olympiad', 'Championship', 'Competition', 'Event', 'Course', 'Venue'];
export const VENUE_TYPES = ['Indoor', 'Outdoor', 'Online', 'Offline'];
export const EVENT_STATUSES = ['draft', 'published', 'archived', 'pending', 'rejected'];
export const CURRENCIES = ['AED', 'EGP', 'CAD', 'USD'];

/**
 * Create event validation
 */
export const validateCreateEvent = [
  validateStringLength('title', 1, 200, true),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  sanitizeHtml('description'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters')
    .escape(),

  validateEnum('type', EVENT_TYPES, true),
  validateEnum('venueType', VENUE_TYPES, true),

  body('ageRange')
    .isArray({ min: 2, max: 2 })
    .withMessage('Age range must be an array with exactly 2 elements [min, max]'),

  body('ageRange.*')
    .isInt({ min: 0, max: 100 })
    .withMessage('Age range values must be between 0 and 100')
    .toInt(),

  body('ageRange')
    .custom((value) => {
      if (value[0] > value[1]) {
        throw new Error('Minimum age cannot be greater than maximum age');
      }
      return true;
    }),

  // Location validation
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .escape(),

  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 300 })
    .withMessage('Address must be between 5 and 300 characters')
    .escape(),

  body('location.coordinates.lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),

  body('location.coordinates.lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),

  // Price validation
  validateNumericRange('price', 0, undefined, true),
  validateEnum('currency', CURRENCIES, false),

  // Date schedule validation
  body('dateSchedule')
    .isArray({ min: 1 })
    .withMessage('At least one date schedule is required'),

  body('dateSchedule.*.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate()
    .custom((value) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (new Date(value) < now) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),

  body('dateSchedule.*.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate()
    .custom((value, { req, path }) => {
      // Extract the index from the path (e.g., "dateSchedule[0].endDate" -> 0)
      const match = path.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const startDate = req.body.dateSchedule[index]?.startDate;
        if (startDate && new Date(value) < new Date(startDate)) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  body('dateSchedule.*.availableSeats')
    .notEmpty()
    .withMessage('Available seats is required')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Available seats must be between 1 and 10,000')
    .toInt(),

  body('dateSchedule.*.price')
    .notEmpty()
    .withMessage('Schedule price is required')
    .isFloat({ min: 0 })
    .withMessage('Schedule price cannot be negative')
    .toFloat(),

  // Tags validation
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Cannot have more than 20 tags'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each tag must be between 2 and 50 characters')
    .escape(),

  // Images validation
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Cannot have more than 10 images'),

  body('images.*')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Each image must be a valid URL'),

  // Status validation
  body('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(', ')}`),
];

/**
 * Update event validation (similar to create but all fields optional)
 */
export const validateUpdateEvent = [
  validateStringLength('title', 1, 200, false),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  sanitizeHtml('description'),

  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters')
    .escape(),

  validateEnum('type', EVENT_TYPES, false),
  validateEnum('venueType', VENUE_TYPES, false),
  validateEnum('currency', CURRENCIES, false),
  validateEnum('status', EVENT_STATUSES, false),

  body('ageRange')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Age range must be an array with exactly 2 elements [min, max]'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative')
    .toFloat(),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Cannot have more than 20 tags'),

  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Cannot have more than 10 images'),
];

/**
 * FAQ validation
 */
export const validateEventFAQ = [
  body('faqs')
    .optional()
    .isArray()
    .withMessage('FAQs must be an array'),

  body('faqs.*.question')
    .trim()
    .notEmpty()
    .withMessage('FAQ question is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Question must be between 5 and 200 characters')
    .escape(),

  body('faqs.*.answer')
    .trim()
    .notEmpty()
    .withMessage('FAQ answer is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Answer must be between 10 and 1000 characters')
    .escape(),
];

/**
 * SEO meta validation
 */
export const validateEventSEO = [
  body('seoMeta.title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot exceed 60 characters')
    .escape(),

  body('seoMeta.description')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot exceed 160 characters')
    .escape(),

  body('seoMeta.keywords')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Cannot have more than 20 SEO keywords'),

  body('seoMeta.keywords.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each keyword must be between 2 and 50 characters')
    .escape(),
];

/**
 * Event filtering/search validation
 */
export const validateEventSearch = [
  ...validatePagination,
  ...validateSort(['title', 'price', 'createdAt', 'averageRating', 'reviewCount', 'viewsCount']),
  ...validateDateRange,
  ...validatePriceRange,
  ...validateSearch,

  query('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters')
    .escape(),

  query('type')
    .optional()
    .isIn(EVENT_TYPES)
    .withMessage(`Type must be one of: ${EVENT_TYPES.join(', ')}`),

  query('venueType')
    .optional()
    .isIn(VENUE_TYPES)
    .withMessage(`Venue type must be one of: ${VENUE_TYPES.join(', ')}`),

  query('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(', ')}`),

  query('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .escape(),

  query('minAge')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum age must be between 0 and 100')
    .toInt(),

  query('maxAge')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Maximum age must be between 0 and 100')
    .toInt(),

  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean')
    .toBoolean(),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),

  query('isApproved')
    .optional()
    .isBoolean()
    .withMessage('isApproved must be a boolean')
    .toBoolean(),
];

/**
 * Event approval validation (admin only)
 */
export const validateEventApproval = [
  body('isApproved')
    .notEmpty()
    .withMessage('Approval status is required')
    .isBoolean()
    .withMessage('isApproved must be a boolean')
    .toBoolean(),

  body('rejectionReason')
    .if(body('isApproved').equals('false'))
    .notEmpty()
    .withMessage('Rejection reason is required when rejecting an event')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters')
    .escape(),
];

/**
 * Export all event validators
 */
export default {
  validateCreateEvent,
  validateUpdateEvent,
  validateEventFAQ,
  validateEventSEO,
  validateEventSearch,
  validateEventApproval,
};
