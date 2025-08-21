import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole,
  bulkUpdateUsers,
  getUserStats
} from '../controllers/admin.user.controller';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get('/stats', getUserStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 * @query   page, limit, search, role, status, sortBy, sortOrder
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get('/:id', getUserById);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin only
 */
router.post('/', createUser);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin only
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/:id', deleteUser);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update user status
 * @access  Admin only
 */
router.patch('/:id/status', updateUserStatus);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch('/:id/role', updateUserRole);

/**
 * @route   PATCH /api/admin/users/bulk
 * @desc    Bulk update users
 * @access  Admin only
 */
router.patch('/bulk', bulkUpdateUsers);

export default router;