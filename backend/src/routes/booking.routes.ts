import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  initiateBooking,
  confirmBooking,
  getBookingById,
  cancelBooking,
  getUserBookings,
} from '../controllers/booking.controller';

const router = Router();

// Validation middleware
const initiateBookingValidation = [
  body('eventId')
    .isMongoId()
    .withMessage('Invalid event ID'),
  body('dateScheduleId')
    .isMongoId()
    .withMessage('Invalid schedule ID'),
  body('seats')
    .isInt({ min: 1, max: 10 })
    .withMessage('Seats must be between 1 and 10'),
  body('paymentMethod')
    .optional()
    .isIn(['stripe', 'paypal'])
    .withMessage('Invalid payment method'),
];

const confirmBookingValidation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required'),
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

const bookingIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required'),
];

const cancelBookingValidation = [
  ...bookingIdValidation,
  body('reason')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
];

// Routes
router.post('/initiate', authenticate, initiateBookingValidation, initiateBooking);
router.post('/confirm', authenticate, confirmBookingValidation, confirmBooking);
router.get('/', authenticate, getUserBookings);
router.get('/:id', authenticate, bookingIdValidation, getBookingById);
router.put('/:id/cancel', authenticate, cancelBookingValidation, cancelBooking);

export default router;