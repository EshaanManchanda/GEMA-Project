import { Router } from "express";
import {
  authenticate,
  authorize,
  validate,
  adminLimiter,
} from "../../middleware/index";
import { UserRole } from "../../models/index";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole,
  bulkUpdateUsers,
  getUserStats,
  adminInitiatePasswordReset,
  adminConfirmPasswordReset,
} from "./admin-users.controller";
import {
  validateGetAllUsers,
  validateCreateUser,
  validateUpdateUser,
  validateUpdateUserStatus,
  validateUpdateUserRole,
  validateBulkUpdateUsers,
} from "../../validators/admin.validator";
import { validateMongoId } from "../../validators/common.validator";

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get("/stats", getUserStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 * @query   page, limit, search, role, status, sortBy, sortOrder
 */
router.get("/", validateGetAllUsers, validate, getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get("/:id", validateMongoId("id", "param"), validate, getUserById);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin only
 */
router.post("/", validateCreateUser, validate, createUser);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin only
 */
router.put("/:id", validateUpdateUser, validate, updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete("/:id", validateMongoId("id", "param"), validate, deleteUser);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update user status
 * @access  Admin only
 */
router.patch(
  "/:id/status",
  validateUpdateUserStatus,
  validate,
  updateUserStatus,
);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch("/:id/role", validateUpdateUserRole, validate, updateUserRole);

/**
 * @route   PATCH /api/admin/users/bulk
 * @desc    Bulk update users
 * @access  Admin only
 */
router.patch("/bulk", validateBulkUpdateUsers, validate, bulkUpdateUsers);

/**
 * @route   POST /api/admin/users/:id/reset-password/initiate
 * @desc    Admin-initiated password reset - Send OTP to admin's email
 * @access  Admin only
 */
router.post(
  "/:id/reset-password/initiate",
  validateMongoId("id", "param"),
  validate,
  adminInitiatePasswordReset,
);

/**
 * @route   POST /api/admin/users/:id/reset-password/confirm
 * @desc    Admin-initiated password reset - Verify OTP and set new password
 * @access  Admin only
 */
router.post(
  "/:id/reset-password/confirm",
  validateMongoId("id", "param"),
  validate,
  adminConfirmPasswordReset,
);

export default router;
