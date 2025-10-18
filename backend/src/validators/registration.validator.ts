import { body, query, param } from 'express-validator';
import {
  validateMongoId,
  validatePagination,
  validateSort,
  validateSearch,
  validateEnum,
  validateStringLength,
  validateNumericRange,
} from './common.validator';

/**
 * Registration validation rules
 */

// Allowed registration statuses
export const REGISTRATION_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
export const REVIEW_STATUSES = ['approved', 'rejected'];
export const FIELD_TYPES = [
  'text', 'email', 'number', 'tel', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'date',
  'address', 'website', 'datetime', 'time', 'country', 'city', 'html', 'pagebreak'
];

/**
 * Submit registration validation
 */
export const validateSubmitRegistration = [
  param('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID'),

  body('registrationData')
    .custom((value) => {
      // Allow both string (from FormData) and object
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch (error) {
          throw new Error('Invalid registration data format');
        }
      } else if (typeof value === 'object' && Array.isArray(value)) {
        return true;
      }
      throw new Error('Registration data must be an array or JSON string');
    }),

  body('saveAsDraft')
    .optional()
    .isBoolean()
    .withMessage('saveAsDraft must be a boolean')
    .toBoolean(),
];

/**
 * Confirm payment validation
 */
export const validateConfirmPayment = [
  param('id')
    .notEmpty()
    .withMessage('Registration ID is required')
    .isMongoId()
    .withMessage('Invalid registration ID'),

  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required')
    .isString()
    .withMessage('Payment intent ID must be a string')
    .trim(),
];

/**
 * Update registration validation
 */
export const validateUpdateRegistration = [
  param('id')
    .notEmpty()
    .withMessage('Registration ID is required')
    .isMongoId()
    .withMessage('Invalid registration ID'),

  body('registrationData')
    .optional()
    .isArray()
    .withMessage('Registration data must be an array'),

  body('registrationData.*.fieldId')
    .optional()
    .isString()
    .withMessage('Field ID must be a string')
    .trim(),

  body('registrationData.*.fieldLabel')
    .optional()
    .isString()
    .withMessage('Field label must be a string')
    .trim(),

  body('registrationData.*.fieldType')
    .optional()
    .isIn(FIELD_TYPES)
    .withMessage(`Field type must be one of: ${FIELD_TYPES.join(', ')}`),

  body('registrationData.*.value')
    .optional()
    .custom((value) => {
      // Value can be of any type
      return true;
    }),
];

/**
 * Review registration validation
 */
export const validateReviewRegistration = [
  param('id')
    .notEmpty()
    .withMessage('Registration ID is required')
    .isMongoId()
    .withMessage('Invalid registration ID'),

  body('status')
    .notEmpty()
    .withMessage('Review status is required')
    .isIn(REVIEW_STATUSES)
    .withMessage(`Status must be one of: ${REVIEW_STATUSES.join(', ')}`),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks cannot exceed 1000 characters')
    .escape(),
];

/**
 * Withdraw registration validation
 */
export const validateWithdrawRegistration = [
  param('id')
    .notEmpty()
    .withMessage('Registration ID is required')
    .isMongoId()
    .withMessage('Invalid registration ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
    .escape(),
];

/**
 * Get registrations validation
 */
export const validateGetRegistrations = [
  ...validatePagination,
  ...validateSort(['createdAt', 'updatedAt', 'status']),

  query('status')
    .optional()
    .isIn(REGISTRATION_STATUSES)
    .withMessage(`Status must be one of: ${REGISTRATION_STATUSES.join(', ')}`),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),
];

/**
 * Registration configuration validation
 */
export const validateRegistrationConfig = [
  param('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean')
    .toBoolean(),

  body('fields')
    .optional()
    .isArray({ max: 25 })
    .withMessage('Maximum 25 custom fields allowed'),

  body('fields.*.id')
    .optional()
    .isString()
    .withMessage('Field ID must be a string')
    .trim(),

  body('fields.*.label')
    .if(body('fields').exists())
    .notEmpty()
    .withMessage('Field label is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Field label must be between 1 and 200 characters')
    .trim()
    .escape(),

  body('fields.*.type')
    .if(body('fields').exists())
    .notEmpty()
    .withMessage('Field type is required')
    .isIn(FIELD_TYPES)
    .withMessage(`Field type must be one of: ${FIELD_TYPES.join(', ')}`),

  body('fields.*.placeholder')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Placeholder cannot exceed 200 characters')
    .escape(),

  body('fields.*.required')
    .optional()
    .isBoolean()
    .withMessage('Required must be a boolean')
    .toBoolean(),

  body('fields.*.validation.pattern')
    .optional()
    .isString()
    .withMessage('Validation pattern must be a string')
    .trim(),

  body('fields.*.validation.minLength')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min length must be a positive integer')
    .toInt(),

  body('fields.*.validation.maxLength')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max length must be a positive integer')
    .toInt(),

  body('fields.*.validation.min')
    .optional()
    .isNumeric()
    .withMessage('Min must be a number')
    .toFloat(),

  body('fields.*.validation.max')
    .optional()
    .isNumeric()
    .withMessage('Max must be a number')
    .toFloat(),

  body('fields.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),

  body('fields.*.options.*')
    .optional()
    .isString()
    .withMessage('Each option must be a string')
    .trim()
    .escape(),

  body('fields.*.accept')
    .optional()
    .isArray()
    .withMessage('Accept must be an array'),

  body('fields.*.accept.*')
    .optional()
    .isString()
    .withMessage('Each accept type must be a string')
    .trim(),

  body('fields.*.maxFileSize')
    .optional()
    .isInt({ min: 1, max: 10485760 }) // Max 10MB
    .withMessage('Max file size must be between 1 and 10485760 bytes (10MB)')
    .toInt(),

  body('fields.*.section')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Section name cannot exceed 100 characters')
    .escape(),

  body('fields.*.order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer')
    .toInt(),

  body('fields.*.helpText')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Help text cannot exceed 500 characters')
    .escape(),

  body('maxRegistrations')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max registrations must be at least 1')
    .toInt(),

  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Registration deadline must be a valid ISO 8601 date')
    .toDate()
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Registration deadline cannot be in the past');
      }
      return true;
    }),

  body('requiresApproval')
    .optional()
    .isBoolean()
    .withMessage('Requires approval must be a boolean')
    .toBoolean(),

  body('emailNotifications.toVendor')
    .optional()
    .isBoolean()
    .withMessage('Email notifications to vendor must be a boolean')
    .toBoolean(),

  body('emailNotifications.toParticipant')
    .optional()
    .isBoolean()
    .withMessage('Email notifications to participant must be a boolean')
    .toBoolean(),

  body('emailNotifications.customMessage')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Custom message cannot exceed 1000 characters')
    .escape(),
];

/**
 * Duplicate registration config validation
 */
export const validateDuplicateRegistrationConfig = [
  param('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID'),

  body('sourceEventId')
    .notEmpty()
    .withMessage('Source event ID is required')
    .isMongoId()
    .withMessage('Invalid source event ID'),
];

/**
 * Export all registration validators
 */
export default {
  validateSubmitRegistration,
  validateConfirmPayment,
  validateUpdateRegistration,
  validateReviewRegistration,
  validateWithdrawRegistration,
  validateGetRegistrations,
  validateRegistrationConfig,
  validateDuplicateRegistrationConfig,
};
