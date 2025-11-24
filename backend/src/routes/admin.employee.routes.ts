import { Router } from 'express';
import { authenticate, authorize, adminLimiter } from '../middleware';
import { UserRole } from '../models';
import {
  getAllEmployees,
  getEmployeeStats,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkUpdateEmployees
} from '../controllers/admin.employee.controller';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.use(adminLimiter);

/**
 * @route   GET /api/admin/employees/stats
 * @desc    Get employee statistics
 * @access  Admin only
 */
router.get('/stats', getEmployeeStats);

/**
 * @route   GET /api/admin/employees
 * @desc    Get all employees with pagination and filtering (cross-vendor)
 * @access  Admin only
 * @query   page, limit, search, vendorId, role, status, sortBy, sortOrder
 */
router.get('/', getAllEmployees);

/**
 * @route   GET /api/admin/employees/:id
 * @desc    Get employee by ID with full details
 * @access  Admin only
 */
router.get('/:id', getEmployeeById);

/**
 * @route   POST /api/admin/employees
 * @desc    Create new employee (can assign to any vendor)
 * @access  Admin only
 */
router.post('/', createEmployee);

/**
 * @route   PUT /api/admin/employees/:id
 * @desc    Update employee
 * @access  Admin only
 */
router.put('/:id', updateEmployee);

/**
 * @route   DELETE /api/admin/employees/:id
 * @desc    Delete employee
 * @access  Admin only
 */
router.delete('/:id', deleteEmployee);

/**
 * @route   PATCH /api/admin/employees/bulk
 * @desc    Bulk update employees
 * @access  Admin only
 */
router.patch('/bulk', bulkUpdateEmployees);

export default router;
