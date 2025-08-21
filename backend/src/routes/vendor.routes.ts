import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models';
import {
  getVendorDashboardStats,
  getVendorEvents,
  getVendorBookings,
  getVendorProfile,
  updateVendorProfile,
  uploadVendorImage,
  updateVendorBusinessHours,
  updateVendorSocialMedia,
} from '../controllers/vendor.controller';

const router = Router();

// All vendor routes require authentication and vendor role
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

export default router;