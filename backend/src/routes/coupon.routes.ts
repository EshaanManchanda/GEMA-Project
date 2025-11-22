import { Router } from 'express';
import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  getActiveCoupons,
  getCouponStats,
  getUserCouponHistory,
  bulkUpdateCoupons
} from '../controllers/coupon.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation rules
const createCouponValidation = [
  body('code')
    .isString()
    .isLength({ min: 3, max: 20 })
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Code must be 3-20 characters and contain only uppercase letters, numbers, hyphens, and underscores'),
  body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .isIn(['percentage', 'fixed_amount', 'free_shipping'])
    .withMessage('Type must be percentage, fixed_amount, or free_shipping'),
  body('value')
    .isNumeric()
    .custom((value, { req }) => {
      if (req.body.type === 'percentage' && (value < 0 || value > 100)) {
        throw new Error('Percentage value must be between 0 and 100');
      }
      if (value < 0) {
        throw new Error('Value cannot be negative');
      }
      return true;
    }),
  body('currency')
    .if(body('type').equals('fixed_amount'))
    .isIn(['AED', 'EGP', 'CAD', 'USD'])
    .withMessage('Currency is required for fixed amount coupons'),
  body('minimumAmount')
    .optional()
    .isNumeric()
    .custom(value => value >= 0)
    .withMessage('Minimum amount cannot be negative'),
  body('maximumDiscount')
    .optional()
    .isNumeric()
    .custom(value => value >= 0)
    .withMessage('Maximum discount cannot be negative'),
  body('validFrom')
    .isISO8601()
    .toDate()
    .withMessage('Valid from must be a valid date'),
  body('validUntil')
    .isISO8601()
    .toDate()
    .custom((validUntil, { req }) => {
      if (validUntil <= req.body.validFrom) {
        throw new Error('Valid until date must be after valid from date');
      }
      return true;
    }),
  body('usageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  body('userUsageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User usage limit must be at least 1'),
  body('applicableEvents')
    .optional()
    .isArray()
    .withMessage('Applicable events must be an array'),
  body('applicableEvents.*')
    .optional()
    .isMongoId()
    .withMessage('Event ID must be valid'),
  body('excludedEvents')
    .optional()
    .isArray()
    .withMessage('Excluded events must be an array'),
  body('excludedEvents.*')
    .optional()
    .isMongoId()
    .withMessage('Event ID must be valid'),
  body('applicableCategories')
    .optional()
    .isArray()
    .withMessage('Applicable categories must be an array'),
  body('applicableCategories.*')
    .optional()
    .isMongoId()
    .withMessage('Category ID must be valid'),
  body('excludedCategories')
    .optional()
    .isArray()
    .withMessage('Excluded categories must be an array'),
  body('excludedCategories.*')
    .optional()
    .isMongoId()
    .withMessage('Category ID must be valid'),
  body('applicableVendors')
    .optional()
    .isArray()
    .withMessage('Applicable vendors must be an array'),
  body('applicableVendors.*')
    .optional()
    .isMongoId()
    .withMessage('Vendor ID must be valid'),
  body('excludedVendors')
    .optional()
    .isArray()
    .withMessage('Excluded vendors must be an array'),
  body('excludedVendors.*')
    .optional()
    .isMongoId()
    .withMessage('Vendor ID must be valid'),
  body('applicableEventTypes')
    .optional()
    .isArray()
    .withMessage('Applicable event types must be an array'),
  body('applicableEventTypes.*')
    .optional()
    .isIn(['Olympiad', 'Championship', 'Competition', 'Event', 'Course', 'Venue'])
    .withMessage('Event type must be valid'),
  body('priceRange')
    .optional()
    .isObject()
    .withMessage('Price range must be an object'),
  body('priceRange.min')
    .optional()
    .isNumeric()
    .custom(value => value >= 0)
    .withMessage('Minimum price cannot be negative'),
  body('priceRange.max')
    .optional()
    .isNumeric()
    .custom((value, { req }) => {
      if (req.body.priceRange?.min !== undefined && value < req.body.priceRange.min) {
        throw new Error('Maximum price must be greater than or equal to minimum price');
      }
      return value >= 0;
    })
    .withMessage('Maximum price cannot be negative'),
  body('firstTimeOnly')
    .optional()
    .isBoolean()
    .withMessage('First time only must be a boolean')
];

const updateCouponValidation = [
  param('id').isMongoId().withMessage('Coupon ID must be valid'),
  ...createCouponValidation.map(validation => validation.optional())
];

const validateCouponValidation = [
  param('code')
    .isString()
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be valid'),
  body('orderAmount')
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Order amount must be greater than 0'),
  body('eventIds')
    .optional()
    .isArray()
    .withMessage('Event IDs must be an array'),
  body('eventIds.*')
    .optional()
    .isMongoId()
    .withMessage('Event ID must be valid')
];

const applyCouponValidation = [
  body('couponId')
    .isMongoId()
    .withMessage('Coupon ID must be valid'),
  body('orderId')
    .isMongoId()
    .withMessage('Order ID must be valid')
];

const bulkUpdateValidation = [
  body('couponIds')
    .isArray()
    .custom(array => array.length > 0)
    .withMessage('Coupon IDs array must not be empty'),
  body('couponIds.*')
    .isMongoId()
    .withMessage('Coupon ID must be valid'),
  body('status')
    .isIn(['active', 'inactive', 'expired'])
    .withMessage('Status must be active, inactive, or expired')
];

// Public routes
router.get('/active', getActiveCoupons);

// Protected routes - Customer access
router.use(authenticate);

router.get('/my-history', getUserCouponHistory);
router.post('/validate/:code', 
  validateCouponValidation,
  validateRequest,
  validateCoupon
);
router.post('/apply', 
  applyCouponValidation,
  validateRequest,
  applyCoupon
);

// Admin only routes
router.get('/', 
  authorize(['admin']),
  getCoupons
);

router.get('/:id', 
  authorize(['admin']),
  param('id').isMongoId().withMessage('Coupon ID must be valid'),
  validateRequest,
  getCoupon
);

router.post('/', 
  authorize(['admin']),
  createCouponValidation,
  validateRequest,
  createCoupon
);

router.put('/:id', 
  authorize(['admin']),
  updateCouponValidation,
  validateRequest,
  updateCoupon
);

router.delete('/:id', 
  authorize(['admin']),
  param('id').isMongoId().withMessage('Coupon ID must be valid'),
  validateRequest,
  deleteCoupon
);

router.get('/:id/stats', 
  authorize(['admin']),
  param('id').isMongoId().withMessage('Coupon ID must be valid'),
  validateRequest,
  getCouponStats
);

router.put('/bulk/status', 
  authorize(['admin']),
  bulkUpdateValidation,
  validateRequest,
  bulkUpdateCoupons
);

export default router;