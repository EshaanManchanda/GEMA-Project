import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models';
import {
  getAllVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  approveVenue,
  rejectVenue,
  updateVenueStatus,
  bulkUpdateVenues,
  getVenueStats
} from '../controllers/admin.venue.controller';

const router = Router();

// Middleware: All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * @route   GET /api/admin/venues/stats
 * @desc    Get venue statistics
 * @access  Admin only
 */
router.get('/stats', getVenueStats);

/**
 * @route   POST /api/admin/venues
 * @desc    Create new venue
 * @access  Admin only
 */
router.post('/', createVenue);

/**
 * @route   GET /api/admin/venues
 * @desc    Get all venues with pagination and filtering (Admin view)
 * @access  Admin only
 * @query   page, limit, search, venueType, status, isApproved, city, country, vendorId, minCapacity, maxCapacity, sortBy, sortOrder
 */
router.get('/', getAllVenues);

/**
 * @route   GET /api/admin/venues/:id
 * @desc    Get venue by ID (Admin view)
 * @access  Admin only
 */
router.get('/:id', getVenueById);

/**
 * @route   PUT /api/admin/venues/:id
 * @desc    Update venue (Admin can update any field)
 * @access  Admin only
 */
router.put('/:id', updateVenue);

/**
 * @route   DELETE /api/admin/venues/:id
 * @desc    Delete venue
 * @access  Admin only
 */
router.delete('/:id', deleteVenue);

/**
 * @route   PUT /api/admin/venues/:id/approve
 * @desc    Approve venue
 * @access  Admin only
 */
router.put('/:id/approve', approveVenue);

/**
 * @route   PUT /api/admin/venues/:id/reject
 * @desc    Reject venue
 * @access  Admin only
 * @body    { reason: string }
 */
router.put('/:id/reject', rejectVenue);

/**
 * @route   PUT /api/admin/venues/:id/status
 * @desc    Update venue status
 * @access  Admin only
 * @body    { status: string }
 */
router.put('/:id/status', updateVenueStatus);

/**
 * @route   PATCH /api/admin/venues/bulk
 * @desc    Bulk update venues
 * @access  Admin only
 * @body    { venueIds: string[], updateData: object }
 */
router.patch('/bulk', bulkUpdateVenues);

export default router;