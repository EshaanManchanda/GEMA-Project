import { Router } from "express";
import { body, query } from "express-validator";

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
  getPublicTeacherProfile,
  getPublicTeachersList,
  getTeacherPaymentInfo,
  updateTeacherBankDetails,
  updateTeacherBookingMeetingLink,
} from "../controllers/teacher.controller";
import {
  getMyTeacherApplication,
  submitTeacherApplication,
} from "../controllers/teacher.application.controller";

import {
  getTeacherEventById,
  createTeacherEvent,
  updateTeacherEvent,
  deleteTeacherEvent,
  restoreTeacherEvent,
} from "../controllers/teacher.event.controller";

import {
  initiateTeacherStripeConnect,
  getTeacherStripeConnectStatus,
  updateTeacherStripeKey,
} from "../controllers/teacher.payment.controller";

import { authenticate, authorize, validate } from "../middleware";

import { validateMongoId } from "../validators/common.validator";
import {
  validateCreateTeacherEvent,
  validateUpdateTeacherEvent,
} from "../validators/event.validator";

const router = Router();

/**
 * ============================
 * PUBLIC ROUTES
 * ============================
 */
router.get("/public", getPublicTeachersList);

router.get(
  "/public/:id",
  validateMongoId("id", "param"),
  validate,
  getPublicTeacherProfile,
);

/**
 * ============================
 * AUTH MIDDLEWARE
 * ============================
 */
router.use(authenticate);

/**
 * ============================
 * TEACHER APPLICATION (CUSTOMER/VENDOR)
 * ============================
 */
router.get(
  "/application",
  authorize(["customer", "vendor", "teacher", "admin"]),
  getMyTeacherApplication,
);

router.put(
  "/application",
  authorize(["customer", "vendor", "teacher", "admin"]),
  [
    body("profile.firstName").optional().isString().trim().notEmpty(),
    body("profile.lastName").optional().isString().trim().notEmpty(),
    body("profile.phone").optional().isString().trim().notEmpty(),
    body("topics").isArray({ min: 1 }),
    body("ageRanges").isArray({ min: 1 }),
    body("experienceTypes").isArray({ min: 1 }),
    body("yearsOfExperience").isInt({ min: 0 }),
    body("qualifications")
      .isString()
      .withMessage("Qualifications are required")
      .trim()
      .custom((value) => {
        const sentences = String(value)
          .split(/[.!?]+/)
          .map((part) => part.trim())
          .filter(Boolean);
        return sentences.length >= 4 && sentences.length <= 5;
      })
      .withMessage("Please write 4-5 complete sentences in qualifications"),
    body("profileVideoUrl").optional().isString(),
    body("acceptedTerms")
      .isBoolean()
      .custom((value) => value === true)
      .withMessage("acceptedTerms must be true"),
  ],
  validate,
  submitTeacherApplication,
);

router.use(authorize(["teacher"]));

/**
 * ============================
 * DASHBOARD
 * ============================
 */
router.get("/stats", getTeacherDashboardStats);

/**
 * ============================
 * STRIPE CONNECT (shorthand aliases)
 * ============================
 */
router.post("/stripe-connect/onboard", initiateTeacherStripeConnect);
router.get("/stripe-connect/status", getTeacherStripeConnectStatus);
router.put("/stripe-keys", updateTeacherStripeKey);

/**
 * ============================
 * TEACHING EVENTS
 * ============================
 */
router.get(
  "/events",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("status").optional().isString(),
    query("sortBy").optional().isString(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  validate,
  getTeacherTeachingEvents,
);

/**
 * ============================
 * PAYMENT INFO
 * ============================
 */
router.get(
  "/:id/payment-info",
  validateMongoId("id", "param"),
  validate,
  getTeacherPaymentInfo,
);

/**
 * ============================
 * BOOKINGS
 * ============================
 */
router.get(
  "/bookings",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("status").optional().isString(),
    query("paymentStatus").optional().isString(),
    query("teachingEventId").optional().isMongoId(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("minAmount").optional().isFloat({ min: 0 }),
    query("maxAmount").optional().isFloat({ min: 0 }),
    query("sortBy").optional().isString(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
  validate,
  getTeacherBookings,
);

router.get(
  "/bookings/export",
  [query("format").optional().isIn(["csv", "json"])],
  validate,
  exportTeacherBookings,
);

router.post(
  "/bookings/import",
  [body("csvData").isArray()],
  validate,
  importTeacherBookings,
);

router.get(
  "/bookings/:id",
  validateMongoId("id", "param"),
  validate,
  getTeacherBookingById,
);

router.put(
  "/bookings/:id",
  [
    validateMongoId("id", "param"),
    body("teacherNotes").optional().isString(),
    body("teacherStatus").optional().isString(),
    body("isFulfilled").optional().isBoolean(),
  ],
  validate,
  updateTeacherBooking,
);

router.put(
  "/bookings/:id/meeting-link",
  [
    validateMongoId("id", "param"),
    body("meetingLink").optional().isString(),
  ],
  validate,
  updateTeacherBookingMeetingLink,
);

/**
 * ============================
 * PROFILE
 * ============================
 */
router.get("/profile", getTeacherProfile);

router.put(
  "/profile",
  [
    body("firstName").optional().isString(),
    body("lastName").optional().isString(),
    body("phone").optional().isString(),
    body("gender").optional().isString(),
    body("dateOfBirth").optional().isISO8601(),
    body("addresses").optional().isArray(),

    body("fullName").optional().isString(),
    body("bio").optional().isString(),
    body("subjects").optional().isArray(),
    body("specialization").optional().isString(),
    body("yearsOfExperience").optional().isInt({ min: 0 }),
    body("languagesSpoken").optional().isArray(),
    body("address").optional().isString(),
    body("socialLinks").optional().isObject(),
  ],
  validate,
  updateTeacherProfile,
);

/**
 * ============================
 * MEDIA
 * ============================
 */
router.post(
  "/upload-media",
  uploadTeacherMedia,
);

/**
 * ============================
 * AVAILABILITY & SOCIAL
 * ============================
 */
router.put(
  "/availability-hours",
  [body("availabilityHours").isObject()],
  validate,
  updateTeacherAvailabilityHours,
);

router.put(
  "/social-links",
  [body("socialLinks").isObject()],
  validate,
  updateTeacherSocialLinks,
);

router.put(
  "/bank-details",
  [
    body("accountHolderName").isString().notEmpty(),
    body("bankName").isString().notEmpty(),
    body("accountNumber").optional().isString(),
    body("iban").optional().isString(),
    body("swiftCode").optional().isString(),
  ],
  validate,
  updateTeacherBankDetails,
);

/**
 * @route   POST /api/vendors/events
 * @desc    Create a new event
 * @access  Teacher only
 */
router.post("/events", validateCreateTeacherEvent, validate, createTeacherEvent);

/**
 * @route   GET /api/teachers/events/:id
 * @desc    Get single event by ID
 * @access  Teacher only
 */
router.get("/events/:id", getTeacherEventById);

/**
 * @route   PUT /api/teachers/events/:id
 * @desc    Update teacher's own event
 * @access  Teacher only
 */
router.put(
  "/events/:id",
  validateMongoId("id", "param"),
  validateUpdateTeacherEvent,
  validate,
  updateTeacherEvent,
);

/**
 * @route   DELETE /api/teachers/events/:id
 * @desc    Delete teacher's own event (soft or permanent)
 * @access  Teacher only
 */
router.delete("/events/:id", deleteTeacherEvent);

/**
 * @route   PUT /api/teachers/events/:id/restore
 * @desc    Restore deleted event
 * @access  Teacher only
 */
router.put("/events/:id/restore", restoreTeacherEvent);
export default router;
