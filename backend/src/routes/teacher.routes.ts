import { Router } from 'express';
import { body, query } from 'express-validator';

import {
  getTeacherDashboardStats,
  getTeacherTeachingEvents,
  getTeacherBookings,
  getTeacherBookingById,
  updateTeacherBooking,
  exportTeacherBookings,
  importTeacherBookings,
  getTeacherProfile,
  updateTeacherProfile,
  uploadTeacherMedia,
  updateTeacherAvailabilityHours,
  updateTeacherSocialLinks,
  updateTeacherCoverImage,
  deleteTeacherCoverImage,
  getPublicTeachersList,
  getPublicTeacherProfile,
  getTeacherPaymentInfo,
} from '../controllers/teacher.controller';

import {
  getTeacherEventById,
  createTeacherEvent,
  updateTeacherEvent,
  deleteTeacherEvent,
  restoreTeacherEvent,
} from '../controllers/teacher.event.controller';

import {
  authenticate,
  authorize,
  validate,
  
} from '../middleware';

import { validateMongoId } from '../validators/common.validator';

const router = Router();

// Middleware for authenticated teacher routes
const teacherAuth = [authenticate, authorize(['teacher'])];

/**
 * ============================
 * DASHBOARD
 * ============================
 */
router.get('/stats', teacherAuth, getTeacherDashboardStats);

/**
 * ============================
 * TEACHING EVENTS
 * ============================
 */
router.get('/events', teacherAuth, getTeacherTeachingEvents);

/**
 * ============================
 * PAYMENT INFO
 * ============================
 */
router.get(
  '/:id/payment-info',
  teacherAuth,
  validateMongoId('id', 'param'),
  validate,
  getTeacherPaymentInfo
);

/**
 * ============================
 * BOOKINGS
 * ============================
 */
router.get(
  '/bookings',
  teacherAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('status').optional().isString(),
    query('paymentStatus').optional().isString(),
    query('teachingEventId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('minAmount').optional().isFloat({ min: 0 }),
    query('maxAmount').optional().isFloat({ min: 0 }),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validate,
  getTeacherBookings
);

router.get(
  '/bookings/export',
  teacherAuth,
  [
    query('format').optional().isIn(['csv', 'json']),
  ],
  validate,
  exportTeacherBookings
);

router.post(
  '/bookings/import',
  teacherAuth,
  [
    body('csvData').isArray(),
  ],
  validate,
  importTeacherBookings
);

router.get(
  '/bookings/:id',
  teacherAuth,
  validateMongoId('id', 'param'),
  validate,
  getTeacherBookingById
);

router.put(
  '/bookings/:id',
  teacherAuth,
  [
    validateMongoId('id', 'param'),
    body('teacherNotes').optional().isString(),
    body('teacherStatus').optional().isString(),
    body('isFulfilled').optional().isBoolean(),
  ],
  validate,
  updateTeacherBooking
);

/**
 * ============================
 * PROFILE
 * ============================
 */
router.get('/profile', teacherAuth, getTeacherProfile);

router.put(
  '/profile',
  teacherAuth,
  [
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('phone').optional().isString(),
    body('gender').optional().isString(),
    body('dateOfBirth').optional().isISO8601(),
    body('addresses').optional().isArray(),

    body('fullName').optional().isString(),
    body('bio').optional().isString(),
    body('subjects').optional().isArray(),
    body('specialization').optional().isString(),
    body('yearsOfExperience').optional().isInt({ min: 0 }),
    body('languagesSpoken').optional().isArray(),
    body('address').optional().isString(),
    body('socialLinks').optional().isObject(),
  ],
  validate,
  updateTeacherProfile
);

/**
 * ============================
 * MEDIA
 * ============================
 */
router.post(
  '/upload-media',
  teacherAuth,
  [
    body('mediaType').isIn(['profile', 'demoVideo']),
  ],
  validate,
  uploadTeacherMedia
);

router.put('/cover-image', teacherAuth, updateTeacherCoverImage);
router.delete('/cover-image', teacherAuth, deleteTeacherCoverImage);

/**
 * ============================
 * AVAILABILITY & SOCIAL
 * ============================
 */
router.put(
  '/availability-hours',
  teacherAuth,
  [
    body('availabilityHours').isObject(),
  ],
  validate,
  updateTeacherAvailabilityHours
);

router.put(
  '/social-links',
  teacherAuth,
  [
    body('socialLinks').isObject(),
  ],
  validate,
  updateTeacherSocialLinks
);

/**
 * @route   POST /api/vendors/events
 * @desc    Create a new event
 * @access  Teacher only
 */
router.post('/events', teacherAuth, createTeacherEvent);

/**
 * @route   GET /api/teachers/events/:id
 * @desc    Get single event by ID
 * @access  Teacher only
 */
router.get('/events/:id', teacherAuth, getTeacherEventById);

/**
 * @route   PUT /api/teachers/events/:id
 * @desc    Update teacher's own event
 * @access  Teacher only
 */
router.put('/events/:id', teacherAuth, updateTeacherEvent);

/**
 * @route   DELETE /api/teachers/events/:id
 * @desc    Delete teacher's own event (soft or permanent)
 * @access  Teacher only
 */
router.delete('/events/:id', teacherAuth, deleteTeacherEvent);

/**
 * @route   PUT /api/teachers/events/:id/restore
 * @desc    Restore deleted event
 * @access  Teacher only
 */
router.put('/events/:id/restore', teacherAuth, restoreTeacherEvent);

/**
 * ============================
 * PUBLIC ROUTES (MUST BE LAST)
 * ============================
 * Note: Specific public routes must come before wildcard /:id route
 */

// Public teacher profile by ID
router.get('/public', getPublicTeachersList);

// Public teacher profile by ID
router.get(
  '/public/:id',
  validateMongoId('id', 'param'),
  validate,
  getPublicTeacherProfile
);

// Legacy route (kept for backward compatibility)
router.get(
  '/:id',
  validateMongoId('id', 'param'),
  validate,
  getPublicTeacherProfile
);

export default router;
