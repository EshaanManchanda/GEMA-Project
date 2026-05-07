import { body, param } from 'express-validator';

export const createCouponValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .matches(/^[A-Z0-9_-]{3,20}$/)
    .withMessage('Code must be 3-20 uppercase alphanumeric characters'),

  body('discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),

  body('discountValue')
    .isFloat({ min: 0.01 })
    .withMessage('Discount value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
      return true;
    }),

  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order amount must be 0 or greater'),

  body('maxDiscountAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Max discount amount must be greater than 0'),

  body('maxUses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max uses must be at least 1'),

  body('maxUsesPerUser')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max uses per user must be at least 1'),

  body('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid date'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Expiry date must be a valid date')
    .custom((expiresAt, { req }) => {
      if (req.body.startDate && expiresAt <= new Date(req.body.startDate)) {
        throw new Error('Expiry date must be after start date');
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const updateCouponValidation = [
  param('id').isMongoId().withMessage('Invalid coupon ID'),
  ...createCouponValidation.map((v) => v.optional()),
];

export const applyCouponValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required'),
  body('orderTotal')
    .isFloat({ min: 0.01 })
    .withMessage('Order total must be greater than 0'),
];
