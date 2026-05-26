import { Router } from "express";
import { body, param } from "express-validator";
import {
  authenticate,
  conditionalPhoneVerification,
} from "../middleware/index";
import { paymentLimiter } from "../middleware/rateLimiter";
import {
  initiateBooking,
  confirmBooking,
  getBookingById,
  cancelBooking,
  getUserBookings,
} from "../controllers/booking.controller";

const router = Router();

// Validation middleware
const initiateBookingValidation = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
  body("dateScheduleId").notEmpty().withMessage("Schedule ID is required"),
  body("seats")
    .isInt({ min: 1, max: 50 })
    .withMessage("Seats must be between 1 and 50"),
  body("paymentMethod")
    .optional()
    .isIn(["stripe", "paypal", "test", "free"])
    .withMessage("Invalid payment method"),
];

const confirmBookingValidation = [
  body("paymentIntentId")
    .notEmpty()
    .withMessage("Payment intent ID is required"),
  body("orderId").isMongoId().withMessage("Invalid order ID"),
];

const bookingIdValidation = [
  param("id").notEmpty().withMessage("Booking ID is required"),
];

const cancelBookingValidation = [
  ...bookingIdValidation,
  body("reason")
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage("Reason must be between 5 and 500 characters"),
];

// Routes
// Phone verification conditionally required for booking operations (based on global + event settings)
router.post(
  "/initiate",
  authenticate,
  paymentLimiter,
  conditionalPhoneVerification,
  initiateBookingValidation,
  initiateBooking,
);
router.post(
  "/confirm",
  authenticate,
  paymentLimiter,
  conditionalPhoneVerification,
  confirmBookingValidation,
  confirmBooking,
);

// Viewing bookings doesn't require phone verification
router.get("/", authenticate, getUserBookings);
router.get("/:id", authenticate, bookingIdValidation, getBookingById);

// Canceling bookings conditionally requires phone verification for security
router.put(
  "/:id/cancel",
  authenticate,
  conditionalPhoneVerification,
  cancelBookingValidation,
  cancelBooking,
);

export default router;
