import { body, param } from 'express-validator';
import { validateEmail, validatePhone, validateUrl, validateEnum } from './common.validator';

/**
 * User profile validation rules
 */

/**
 * Update profile validation
 */
export const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .escape(),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .escape(),

  validatePhone('phone', false),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be male, female, other, or prefer_not_to_say'),

  body('dateOfBirth')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .toDate()
    .custom((value) => {
      const age = (new Date().getTime() - new Date(value).getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (age < 13) {
        throw new Error('User must be at least 13 years old');
      }
      if (age > 120) {
        throw new Error('Invalid date of birth');
      }
      return true;
    }),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  body('preferences')
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      // If preferences is provided, validate its structure
      if (value === undefined || value === null) {
        return true; // Optional field
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Preferences must be an object');
      }

      // Validate language
      if (value.language !== undefined) {
        if (typeof value.language !== 'string' || value.language.length > 10) {
          throw new Error('Language code must be a string with max 10 characters');
        }
      }

      // Validate currency
      if (value.currency !== undefined) {
        if (typeof value.currency !== 'string' || value.currency.length > 10) {
          throw new Error('Currency code must be a string with max 10 characters');
        }
      }

      // Validate timezone
      if (value.timezone !== undefined) {
        if (typeof value.timezone !== 'string' || value.timezone.length > 50) {
          throw new Error('Timezone must be a string with max 50 characters');
        }
      }

      // Validate notifications object
      if (value.notifications !== undefined) {
        if (typeof value.notifications !== 'object' || Array.isArray(value.notifications)) {
          throw new Error('Notifications must be an object');
        }

        const validNotificationKeys = [
          'email', 'sms', 'push', 'marketing',
          'security', 'bookingReminders', 'eventUpdates'
        ];

        // Check each notification preference is a boolean
        for (const key of validNotificationKeys) {
          if (value.notifications[key] !== undefined && typeof value.notifications[key] !== 'boolean') {
            throw new Error(`${key} notification preference must be a boolean`);
          }
        }

        // Check for unexpected keys
        const providedKeys = Object.keys(value.notifications);
        for (const key of providedKeys) {
          if (!validNotificationKeys.includes(key)) {
            throw new Error(`Unknown notification preference: ${key}`);
          }
        }
      }

      return true;
    }),
];

/**
 * Address validation
 */
export const validateAddress = [
  body('label')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Label must be between 1 and 50 characters'),

  body('street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Street address must be between 1 and 200 characters'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('State must be between 1 and 100 characters'),

  body('zipCode')
    .trim()
    .custom((value, { req }) => {
      // zipCode is required only if poBox is not provided
      const poBox = req.body.poBox;
      if (!value && !poBox) {
        throw new Error('Either Zip code or P.O. Box is required');
      }
      if (value && (value.length < 1 || value.length > 20)) {
        throw new Error('Zip code must be between 1 and 20 characters');
      }
      return true;
    }),

  body('poBox')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !/^\d{4,6}$/.test(value)) {
        throw new Error('P.O. Box must be 4-6 digits for UAE addresses');
      }
      return true;
    }),

  body('makaniNumber')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !/^\d{10}$/.test(value)) {
        throw new Error('Makani number must be 10 digits');
      }
      return true;
    }),

  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value')
    .toBoolean(),
];

/**
 * Address index parameter validation
 */
export const validateAddressIndex = [
  param('addressIndex')
    .notEmpty()
    .withMessage('Address index is required')
    .isInt({ min: 0 })
    .withMessage('Address index must be a positive integer')
    .toInt(),
];

/**
 * Avatar update validation
 * Accepts both UUID-based media URLs and full URLs
 */
export const validateAvatarUpdate = [
  body('avatar')
    .trim()
    .notEmpty()
    .withMessage('Avatar URL is required')
    .custom((value) => {
      // Accept UUID-based media URL
      const uuidPattern = /^\/api\/media\/file\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      if (uuidPattern.test(value)) {
        return true;
      }

      // Accept full URL with protocol
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('URL must use http or https protocol');
        }
        return true;
      } catch (error) {
        throw new Error('Avatar must be either a UUID-based media URL (/api/media/file/{uuid}) or a full URL with http/https protocol');
      }
    })
    .isLength({ max: 500 })
    .withMessage('Avatar URL cannot exceed 500 characters'),
];

/**
 * Vendor business hours validation
 */
export const validateBusinessHours = [
  body('businessHours')
    .optional()
    .isObject()
    .withMessage('Business hours must be an object')
    .custom((value) => {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      for (const day in value) {
        if (!validDays.includes(day.toLowerCase())) {
          throw new Error(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
        }

        const dayData = value[day];
        if (typeof dayData.isOpen !== 'boolean') {
          throw new Error(`${day}.isOpen must be a boolean`);
        }

        if (dayData.isOpen) {
          if (!dayData.openTime || !dayData.closeTime) {
            throw new Error(`${day} requires openTime and closeTime when isOpen is true`);
          }

          // Basic time format validation (HH:MM)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(dayData.openTime) || !timeRegex.test(dayData.closeTime)) {
            throw new Error(`${day} times must be in HH:MM format`);
          }
        }
      }

      return true;
    }),
];

/**
 * Social media links validation
 */
export const validateSocialMedia = [
  body('socialMedia.facebook')
    .optional()
    .trim()
    .isURL()
    .withMessage('Facebook URL must be a valid URL')
    .isLength({ max: 255 })
    .withMessage('Facebook URL cannot exceed 255 characters'),

  body('socialMedia.instagram')
    .optional()
    .trim()
    .isURL()
    .withMessage('Instagram URL must be a valid URL')
    .isLength({ max: 255 })
    .withMessage('Instagram URL cannot exceed 255 characters'),

  body('socialMedia.twitter')
    .optional()
    .trim()
    .isURL()
    .withMessage('Twitter URL must be a valid URL')
    .isLength({ max: 255 })
    .withMessage('Twitter URL cannot exceed 255 characters'),

  body('socialMedia.linkedin')
    .optional()
    .trim()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL')
    .isLength({ max: 255 })
    .withMessage('LinkedIn URL cannot exceed 255 characters'),

  body('socialMedia.youtube')
    .optional()
    .trim()
    .isURL()
    .withMessage('YouTube URL must be a valid URL')
    .isLength({ max: 255 })
    .withMessage('YouTube URL cannot exceed 255 characters'),

  body('socialMedia.website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website URL must be a valid URL')
    .isLength({ max: 255 })
    .withMessage('Website URL cannot exceed 255 characters'),
];

/**
 * Vendor payment settings validation
 */
export const validateVendorPaymentSettings = [
  body('vendorPaymentSettings.stripeAccountId')
    .optional()
    .trim()
    .isString()
    .withMessage('Stripe account ID must be a string')
    .isLength({ max: 100 })
    .withMessage('Stripe account ID cannot exceed 100 characters'),

  body('vendorPaymentSettings.hasCustomStripeAccount')
    .optional()
    .isBoolean()
    .withMessage('hasCustomStripeAccount must be a boolean')
    .toBoolean(),

  body('vendorPaymentSettings.acceptsPlatformPayments')
    .optional()
    .isBoolean()
    .withMessage('acceptsPlatformPayments must be a boolean')
    .toBoolean(),

  body('vendorPaymentSettings.commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission rate must be between 0 and 100')
    .toFloat(),

  body('vendorPaymentSettings.payoutSchedule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Payout schedule must be daily, weekly, or monthly'),

  body('vendorPaymentSettings.minimumPayout')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum payout must be a positive number')
    .toFloat(),
];

/**
 * User status update validation (admin only)
 */
export const validateUserStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('Status must be active, inactive, suspended, or pending'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters')
    .escape(),
];

/**
 * User role update validation (admin only)
 */
export const validateUserRoleUpdate = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'customer', 'vendor', 'employee'])
    .withMessage('Role must be admin, customer, vendor, or employee'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters')
    .escape(),
];

/**
 * Export all user validators
 */
export default {
  validateProfileUpdate,
  validateAddress,
  validateAddressIndex,
  validateAvatarUpdate,
  validateBusinessHours,
  validateSocialMedia,
  validateVendorPaymentSettings,
  validateUserStatusUpdate,
  validateUserRoleUpdate,
};
