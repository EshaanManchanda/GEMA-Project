import { Router } from 'express';
import { authenticate, authorize, validate, adminLimiter } from '../middleware/index';
import { UserRole } from '../models';
import {
  getAllVendors,
  getVendorById,
  getVendorsList,
  updateVendorPaymentMode,
  updateVendorSubscriptionStatus,
  updateVendorStatus,
  getVendorStats
} from '../controllers/admin.vendor.controller';
import { validateMongoId } from '../validators/common.validator';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   GET /api/admin/vendors/stats
 * @desc    Get vendor statistics
 * @access  Admin only
 */
router.get('/stats', getVendorStats);

/**
 * @route   GET /api/admin/vendors/list
 * @desc    Get simple vendors list for dropdowns
 * @access  Admin only
 * @query   limit (optional, default 100)
 */
router.get('/list', getVendorsList);

/**
 * @route   GET /api/admin/vendors
 * @desc    Get all vendors with pagination and filtering
 * @access  Admin only
 * @query   page, limit, search, paymentMode, isActive, sortBy, sortOrder
 */
router.get('/', getAllVendors);

/**
 * @route   GET /api/admin/vendors/:id
 * @desc    Get vendor by ID
 * @access  Admin only
 */
router.get('/:id', validateMongoId('id', 'param'), validate, getVendorById);

/**
 * @route   PUT /api/admin/vendors/:id/payment-mode
 * @desc    Update vendor payment mode (commission/subscription)
 * @access  Admin only
 * @body    { paymentMode: 'platform_stripe' | 'custom_stripe', commissionRate?: number, subscriptionAmount?: number }
 */
router.put('/:id/payment-mode', validateMongoId('id', 'param'), validate, updateVendorPaymentMode);

/**
 * @route   PUT /api/admin/vendors/:id/subscription-status
 * @desc    Update vendor subscription status manually
 * @access  Admin only
 * @body    { subscriptionStatus?: string, subscriptionPaidUntil?: Date, addPayment?: boolean }
 */
router.put('/:id/subscription-status', validateMongoId('id', 'param'), validate, updateVendorSubscriptionStatus);

/**
 * @route   PUT /api/admin/vendors/:id/status
 * @desc    Update vendor active/suspended status
 * @access  Admin only
 * @body    { isActive?: boolean, isSuspended?: boolean, suspensionReason?: string }
 */
router.put('/:id/status', validateMongoId('id', 'param'), validate, updateVendorStatus);

export default router;
