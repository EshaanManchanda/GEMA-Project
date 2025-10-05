import { body, query } from 'express-validator';
import {
  validateMongoId,
  validatePagination,
  validateSort,
  validateEmail,
  validatePhone,
  validateEnum,
  validateStringLength
} from './common.validator';

/**
 * Order and booking validation rules
 */

// Allowed currencies
export const CURRENCIES = ['AED', 'EGP', 'CAD', 'USD'];
export const ORDER_STATUSES = ['pending', 'confirmed', 'cancelled', 'refunded'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
export const PAYMENT_METHODS = ['stripe', 'paypal', 'razorpay', 'test'];
export const SOURCES = ['web', 'mobile', 'admin', 'vendor'];
export const GENDERS = ['male', 'female', 'other'];

/**
 * Create order validation
 */
export const validateCreateOrder = [
  // Order items validation
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one order item is required'),

  body('items.*.eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .custom((value) => {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Event ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  body('items.*.scheduleDate')
    .notEmpty()
    .withMessage('Schedule date is required')
    .isISO8601()
    .withMessage('Schedule date must be a valid ISO 8601 date')
    .toDate()
    .custom((value) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (new Date(value) < now) {
        throw new Error('Schedule date cannot be in the past');
      }
      return true;
    }),

  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1 and 50')
    .toInt(),

  // Billing address validation
  body('billingAddress.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .escape(),

  body('billingAddress.lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .escape(),

  validateEmail('billingAddress.email', true),
  validatePhone('billingAddress.phone', true),

  body('billingAddress.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters')
    .escape(),

  body('billingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .escape(),

  body('billingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters')
    .escape(),

  body('billingAddress.zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Zip code must be between 3 and 20 characters')
    .escape(),

  body('billingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters')
    .escape(),

  // Optional fields
  validateEnum('currency', CURRENCIES, false),

  body('couponCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Coupon code must be between 3 and 50 characters')
    .escape(),

  body('affiliateCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Affiliate code must be between 3 and 50 characters')
    .escape(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .escape(),

  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special requests cannot exceed 1000 characters')
    .escape(),

  body('accessibilityNeeds')
    .optional()
    .isArray()
    .withMessage('Accessibility needs must be an array'),

  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array'),

  validateEnum('source', SOURCES, false),
];

/**
 * Participant information validation
 */
export const validateParticipants = [
  body('items.*.participants')
    .optional()
    .isArray()
    .withMessage('Participants must be an array'),

  body('items.*.participants.*.name')
    .trim()
    .notEmpty()
    .withMessage('Participant name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Participant name must be between 2 and 100 characters')
    .escape(),

  body('items.*.participants.*.age')
    .notEmpty()
    .withMessage('Participant age is required')
    .isInt({ min: 0, max: 120 })
    .withMessage('Participant age must be between 0 and 120')
    .toInt(),

  body('items.*.participants.*.gender')
    .optional()
    .isIn(GENDERS)
    .withMessage(`Gender must be one of: ${GENDERS.join(', ')}`),

  body('items.*.participants.*.allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),

  body('items.*.participants.*.medicalConditions')
    .optional()
    .isArray()
    .withMessage('Medical conditions must be an array'),

  body('items.*.participants.*.specialRequirements')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special requirements cannot exceed 500 characters')
    .escape(),

  // Emergency contact validation (required for minors)
  body('items.*.participants.*.emergencyContact.name')
    .if((value, { req, path }) => {
      const match = path.match(/items\[(\d+)\]\.participants\[(\d+)\]/);
      if (match) {
        const itemIndex = parseInt(match[1]);
        const participantIndex = parseInt(match[2]);
        const age = req.body.items?.[itemIndex]?.participants?.[participantIndex]?.age;
        return age !== undefined && age < 18;
      }
      return false;
    })
    .notEmpty()
    .withMessage('Emergency contact name is required for participants under 18')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Emergency contact name must be between 2 and 100 characters')
    .escape(),

  body('items.*.participants.*.emergencyContact.relationship')
    .if((value, { req, path }) => {
      const match = path.match(/items\[(\d+)\]\.participants\[(\d+)\]/);
      if (match) {
        const itemIndex = parseInt(match[1]);
        const participantIndex = parseInt(match[2]);
        const age = req.body.items?.[itemIndex]?.participants?.[participantIndex]?.age;
        return age !== undefined && age < 18;
      }
      return false;
    })
    .notEmpty()
    .withMessage('Emergency contact relationship is required for participants under 18')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relationship must be between 2 and 50 characters')
    .escape(),

  body('items.*.participants.*.emergencyContact.phone')
    .if((value, { req, path }) => {
      const match = path.match(/items\[(\d+)\]\.participants\[(\d+)\]/);
      if (match) {
        const itemIndex = parseInt(match[1]);
        const participantIndex = parseInt(match[2]);
        const age = req.body.items?.[itemIndex]?.participants?.[participantIndex]?.age;
        return age !== undefined && age < 18;
      }
      return false;
    })
    .notEmpty()
    .withMessage('Emergency contact phone is required for participants under 18')
    .trim()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Phone must be in international format (e.g., +1234567890)'),
];

/**
 * Update order status validation
 */
export const validateUpdateOrderStatus = [
  validateEnum('status', ORDER_STATUSES, true),

  body('reason')
    .if(body('status').isIn(['cancelled', 'refunded']))
    .notEmpty()
    .withMessage('Reason is required when cancelling or refunding an order')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters')
    .escape(),
];

/**
 * Update payment status validation
 */
export const validateUpdatePaymentStatus = [
  validateEnum('paymentStatus', PAYMENT_STATUSES, true),

  body('transactionId')
    .if(body('paymentStatus').equals('paid'))
    .notEmpty()
    .withMessage('Transaction ID is required when marking payment as paid')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Transaction ID must be between 5 and 200 characters')
    .escape(),

  validateEnum('paymentMethod', PAYMENT_METHODS, false),
];

/**
 * Refund order validation
 */
export const validateRefundOrder = [
  body('refundAmount')
    .notEmpty()
    .withMessage('Refund amount is required')
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number')
    .toFloat(),

  body('refundReason')
    .notEmpty()
    .withMessage('Refund reason is required')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Refund reason must be between 10 and 200 characters')
    .escape(),
];

/**
 * Check-in order validation
 */
export const validateCheckIn = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .escape(),
];

/**
 * Order search/filtering validation
 */
export const validateOrderSearch = [
  ...validatePagination,
  ...validateSort(['createdAt', 'total', 'orderNumber', 'status', 'paymentStatus']),

  query('status')
    .optional()
    .isIn(ORDER_STATUSES)
    .withMessage(`Status must be one of: ${ORDER_STATUSES.join(', ')}`),

  query('paymentStatus')
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage(`Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}`),

  query('userId')
    .optional()
    .custom((value) => {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('User ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),

  query('orderNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Order number must be between 5 and 50 characters')
    .escape(),

  query('minTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum total must be a positive number')
    .toFloat(),

  query('maxTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum total must be a positive number')
    .toFloat(),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate(),

  query('paymentMethod')
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`),

  query('source')
    .optional()
    .isIn(SOURCES)
    .withMessage(`Source must be one of: ${SOURCES.join(', ')}`),
];

/**
 * Export all order validators
 */
export default {
  validateCreateOrder,
  validateParticipants,
  validateUpdateOrderStatus,
  validateUpdatePaymentStatus,
  validateRefundOrder,
  validateCheckIn,
  validateOrderSearch,
};
