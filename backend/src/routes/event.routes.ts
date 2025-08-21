import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getVendorEvents,
  getEventCategories,
  getVendorEventAnalytics,
  getAdminEvents,
  updateEventApproval,
  toggleEventFeatured,
} from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/categories', getEventCategories);
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
  ],
  getEvent
);

// Vendor routes
router.use(authenticate); // All routes below require authentication

router.get('/vendor/my-events', authorize(['vendor']), getVendorEvents);
router.get('/vendor/analytics', authorize(['vendor']), getVendorEventAnalytics);

router.post(
  '/',
  authorize(['vendor']),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    body('type')
      .isIn(['Event', 'Course', 'Venue'])
      .withMessage('Type must be Event, Course, or Venue'),
    body('venueType')
      .isIn(['Indoor', 'Outdoor'])
      .withMessage('Venue type must be Indoor or Outdoor'),
    body('ageRange')
      .isArray({ min: 2, max: 2 })
      .withMessage('Age range must be an array of 2 numbers')
      .custom((value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error('Age range must contain exactly 2 numbers');
        }
        const [min, max] = value;
        if (typeof min !== 'number' || typeof max !== 'number') {
          throw new Error('Age range values must be numbers');
        }
        if (min < 0 || max > 100 || min > max) {
          throw new Error('Invalid age range values');
        }
        return true;
      }),
    body('location.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('location.address')
      .trim()
      .notEmpty()
      .withMessage('Address is required'),
    body('location.coordinates.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('location.coordinates.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('currency')
      .isIn(['AED', 'EGP', 'CAD', 'USD'])
      .withMessage('Invalid currency'),
    body('dateSchedule')
      .isArray({ min: 1 })
      .withMessage('At least one schedule date is required')
      .custom((value) => {
        if (!Array.isArray(value)) {
          throw new Error('Date schedule must be an array');
        }
        for (const schedule of value) {
          if (!schedule.date || !schedule.availableSeats || !schedule.price) {
            throw new Error('Each schedule must have date, availableSeats, and price');
          }
          if (new Date(schedule.date) < new Date()) {
            throw new Error('Schedule date cannot be in the past');
          }
          if (schedule.availableSeats < 0 || schedule.price < 0) {
            throw new Error('Available seats and price must be non-negative');
          }
        }
        return true;
      }),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
      .custom((value) => {
        if (Array.isArray(value) && value.length > 20) {
          throw new Error('Cannot have more than 20 tags');
        }
        return true;
      }),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array')
      .custom((value) => {
        if (Array.isArray(value) && value.length > 10) {
          throw new Error('Cannot have more than 10 images');
        }
        return true;
      }),
  ],
  createEvent
);

router.put(
  '/:id',
  authorize(['vendor']),
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Description cannot be empty')
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    // Add other validation rules as needed
  ],
  updateEvent
);

router.delete(
  '/:id',
  authorize(['vendor']),
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
  ],
  deleteEvent
);

// Admin routes
router.get('/admin/all', authorize(['admin']), getAdminEvents);

router.put(
  '/admin/:id/approval',
  authorize(['admin']),
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
    body('isApproved')
      .isBoolean()
      .withMessage('isApproved must be a boolean'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
  ],
  updateEventApproval
);

router.put(
  '/admin/:id/featured',
  authorize(['admin']),
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
  ],
  toggleEventFeatured
);

export default router;