import { Router } from 'express';
import { authenticate, authorize, validate, adminLimiter } from '../middleware/index';
import { UserRole } from '../models';
import {
  getPendingReviews,
  moderateReview,
  getFlaggedContent,
  bulkModerate,
  getModerationStats,
} from '../controllers/admin.moderation.controller';
import { validateModerationAction } from '../validators/admin.validator';
import { validatePagination } from '../validators/common.validator';
import { validateMongoId } from '../validators/common.validator';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   GET /api/admin/moderation/stats
 * @desc    Get moderation queue statistics
 * @access  Admin only
 */
router.get('/stats', getModerationStats);

/**
 * @route   GET /api/admin/moderation/reviews/pending
 * @desc    Get all reviews pending moderation
 * @access  Admin only
 * @query   page, limit
 */
router.get('/reviews/pending', validatePagination, validate, getPendingReviews);

/**
 * @route   GET /api/admin/moderation/flagged
 * @desc    Get all flagged content
 * @access  Admin only
 * @query   type (reviews, events, users), page, limit
 */
router.get('/flagged', validatePagination, validate, getFlaggedContent);

/**
 * @route   POST /api/admin/moderation/review/:id
 * @desc    Moderate a specific review
 * @access  Admin only
 * @body    { action: string, reason?: string, notifyUser?: boolean }
 */
router.post(
  '/review/:id',
  validateModerationAction,
  validate,
  moderateReview
);

/**
 * @route   POST /api/admin/moderation/bulk
 * @desc    Bulk moderate content
 * @access  Admin only
 * @body    { contentType: string, contentIds: string[], action: string, reason?: string }
 */
router.post('/bulk', bulkModerate);

export default router;
