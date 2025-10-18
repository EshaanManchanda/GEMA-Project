import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models';
import {
  getVendorDashboardStats,
  getVendorEvents,
  getVendorBookings,
  getVendorBookingById,
  updateVendorBooking,
  exportVendorBookings,
  importVendorBookings,
  getVendorProfile,
  updateVendorProfile,
  uploadVendorImage,
  updateVendorBusinessHours,
  updateVendorSocialMedia,
  getPublicVendorProfile,
  getVendorPaymentInfo,
  getVendorEmployees,
  getVendorEmployeeById,
  createVendorEmployee,
  updateVendorEmployee,
  deleteVendorEmployee,
  assignEmployeeToEvent,
  removeEmployeeFromEvent,
  exportVendorEmployees,
} from '../controllers/vendor.controller';
import {
  getVendorEventById,
  createVendorEvent,
  updateVendorEvent,
  deleteVendorEvent,
  restoreVendorEvent,
} from '../controllers/vendor.event.controller';

const router = Router();

/**
 * @route   GET /api/vendors/public/:id
 * @desc    Get public vendor profile by ID
 * @access  Public
 */
router.get('/public/:id', getPublicVendorProfile);

/**
 * @route   GET /api/vendors/:vendorId/payment-info
 * @desc    Get vendor payment information (for booking flow)
 * @access  Public
 */
router.get('/:vendorId/payment-info', getVendorPaymentInfo);

// All vendor routes below require authentication and vendor role
router.use(authenticate);
router.use(authorize([UserRole.VENDOR]));

/**
 * @route   GET /api/vendors/stats
 * @desc    Get vendor dashboard statistics
 * @access  Vendor only
 */
router.get('/stats', getVendorDashboardStats);

/**
 * @route   GET /api/vendors/events
 * @desc    Get events created by the authenticated vendor
 * @access  Vendor only
 */
router.get('/events', getVendorEvents);

/**
 * @route   POST /api/vendors/events
 * @desc    Create a new event
 * @access  Vendor only
 */
router.post('/events', createVendorEvent);

/**
 * @route   GET /api/vendors/events/:id
 * @desc    Get single event by ID
 * @access  Vendor only
 */
router.get('/events/:id', getVendorEventById);

/**
 * @route   PUT /api/vendors/events/:id
 * @desc    Update vendor's own event
 * @access  Vendor only
 */
router.put('/events/:id', updateVendorEvent);

/**
 * @route   DELETE /api/vendors/events/:id
 * @desc    Delete vendor's own event (soft or permanent)
 * @access  Vendor only
 */
router.delete('/events/:id', deleteVendorEvent);

/**
 * @route   PUT /api/vendors/events/:id/restore
 * @desc    Restore deleted event
 * @access  Vendor only
 */
router.put('/events/:id/restore', restoreVendorEvent);

/**
 * @route   GET /api/vendors/bookings/export
 * @desc    Export vendor bookings to CSV or JSON
 * @access  Vendor only
 */
router.get('/bookings/export', exportVendorBookings);

/**
 * @route   POST /api/vendors/bookings/import
 * @desc    Import vendor bookings from CSV
 * @access  Vendor only
 */
router.post('/bookings/import', importVendorBookings);

/**
 * @route   GET /api/vendors/bookings/:id
 * @desc    Get single booking by ID
 * @access  Vendor only
 */
router.get('/bookings/:id', getVendorBookingById);

/**
 * @route   PUT /api/vendors/bookings/:id
 * @desc    Update booking (limited edit - status, notes, fulfillment)
 * @access  Vendor only
 */
router.put('/bookings/:id', updateVendorBooking);

/**
 * @route   GET /api/vendors/bookings
 * @desc    Get bookings for the authenticated vendor's events
 * @access  Vendor only
 */
router.get('/bookings', getVendorBookings);

/**
 * @route   GET /api/vendors/profile
 * @desc    Get vendor profile for the authenticated vendor
 * @access  Vendor only
 */
router.get('/profile', getVendorProfile);

/**
 * @route   PUT /api/vendors/profile
 * @desc    Update vendor profile for the authenticated vendor
 * @access  Vendor only
 */
router.put('/profile', updateVendorProfile);

/**
 * @route   POST /api/vendors/upload-image
 * @desc    Upload vendor images (logo, cover image)
 * @access  Vendor only
 */
router.post('/upload-image', uploadVendorImage);

/**
 * @route   PUT /api/vendors/business-hours
 * @desc    Update vendor business hours
 * @access  Vendor only
 */
router.put('/business-hours', updateVendorBusinessHours);

/**
 * @route   PUT /api/vendors/social-media
 * @desc    Update vendor social media links
 * @access  Vendor only
 */
router.put('/social-media', updateVendorSocialMedia);

/**
 * @route   GET /api/vendors/employees/export
 * @desc    Export vendor employees to CSV or JSON
 * @access  Vendor only
 */
router.get('/employees/export', exportVendorEmployees);

/**
 * @route   GET /api/vendors/employees/:id
 * @desc    Get single employee by ID
 * @access  Vendor only
 */
router.get('/employees/:id', getVendorEmployeeById);

/**
 * @route   PUT /api/vendors/employees/:id
 * @desc    Update employee
 * @access  Vendor only
 */
router.put('/employees/:id', updateVendorEmployee);

/**
 * @route   DELETE /api/vendors/employees/:id
 * @desc    Delete/deactivate employee
 * @access  Vendor only
 */
router.delete('/employees/:id', deleteVendorEmployee);

/**
 * @route   POST /api/vendors/employees/:id/assign-event
 * @desc    Assign employee to an event
 * @access  Vendor only
 */
router.post('/employees/:id/assign-event', assignEmployeeToEvent);

/**
 * @route   POST /api/vendors/employees/:id/remove-event
 * @desc    Remove employee from an event
 * @access  Vendor only
 */
router.post('/employees/:id/remove-event', removeEmployeeFromEvent);

/**
 * @route   GET /api/vendors/employees
 * @desc    Get employees for the authenticated vendor
 * @access  Vendor only
 */
router.get('/employees', getVendorEmployees);

/**
 * @route   POST /api/vendors/employees
 * @desc    Create a new employee
 * @access  Vendor only
 */
router.post('/employees', createVendorEmployee);

export default router;