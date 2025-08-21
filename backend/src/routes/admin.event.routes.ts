import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models';
import {
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  restoreEvent,
  approveEvent,
  rejectEvent,
  toggleFeatured,
  bulkUpdateEvents,
  getEventStats,
  getAllVendors,
  createEvent,
  changeEventVendor
} from '../controllers/admin.event.controller';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * @route   GET /api/admin/events/stats
 * @desc    Get event statistics
 * @access  Admin only
 */
router.get('/stats', getEventStats);

/**
 * @route   GET /api/admin/events/vendors
 * @desc    Get all vendors for event assignment
 * @access  Admin only
 */
router.get('/vendors', getAllVendors);

/**
 * @route   GET /api/admin/events
 * @desc    Get all events with pagination and filtering (Admin view)
 * @access  Admin only
 * @query   page, limit, search, category, type, status, isApproved, isFeatured, vendorId, sortBy, sortOrder
 */
router.get('/', getAllEvents);

/**
 * @route   POST /api/admin/events
 * @desc    Create new event (Admin can assign to any vendor)
 * @access  Admin only
 */
router.post('/', createEvent);

/**
 * @route   GET /api/admin/events/:id
 * @desc    Get event by ID (Admin view)
 * @access  Admin only
 */
router.get('/:id', getEventById);

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update event (Admin can update any field)
 * @access  Admin only
 */
router.put('/:id', updateEvent);

/**
 * @route   PUT /api/admin/events/:id/vendor
 * @desc    Change event vendor
 * @access  Admin only
 * @body    { vendorId: string }
 */
router.put('/:id/vendor', changeEventVendor);

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Delete event (soft delete by default, permanent with ?permanent=true)
 * @access  Admin only
 * @query   permanent (optional boolean)
 */
router.delete('/:id', deleteEvent);

/**
 * @route   PUT /api/admin/events/:id/restore
 * @desc    Restore deleted event
 * @access  Admin only
 */
router.put('/:id/restore', restoreEvent);

/**
 * @route   PUT /api/admin/events/:id/approve
 * @desc    Approve event
 * @access  Admin only
 */
router.put('/:id/approve', approveEvent);

/**
 * @route   PUT /api/admin/events/:id/reject
 * @desc    Reject event
 * @access  Admin only
 * @body    { reason: string }
 */
router.put('/:id/reject', rejectEvent);

/**
 * @route   PUT /api/admin/events/:id/toggle-featured
 * @desc    Toggle event featured status
 * @access  Admin only
 */
router.put('/:id/toggle-featured', toggleFeatured);

/**
 * @route   PATCH /api/admin/events/bulk
 * @desc    Bulk update events
 * @access  Admin only
 * @body    { eventIds: string[], updateData: object }
 */
router.patch('/bulk', bulkUpdateEvents);

export default router;