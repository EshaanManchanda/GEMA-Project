import { body, param } from 'express-validator';

export const createAffiliateValidation = [
  body('name')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('commissionRate')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Commission rate must be between 0.01 and 100 percent'),

  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'paypal', 'stripe', 'manual'])
    .withMessage('Invalid payment method'),

  body('websiteUrl')
    .optional()
    .isURL()
    .withMessage('Website URL must be valid'),
];

export const updateAffiliateValidation = [
  param('id').isMongoId().withMessage('Invalid affiliate ID'),

  body('commissionRate')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Commission rate must be between 0.01 and 100 percent'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('Invalid status. Must be active, inactive, suspended, or pending'),

  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'paypal', 'stripe', 'manual'])
    .withMessage('Invalid payment method'),
];

export const recordClickValidation = [
  body('affiliateCode')
    .isString()
    .notEmpty()
    .withMessage('Affiliate code is required'),

  body('targetType')
    .isIn(['event', 'venue'])
    .withMessage('Target type must be event or venue'),

  body('targetId')
    .isMongoId()
    .withMessage('Valid target ID is required'),
];
