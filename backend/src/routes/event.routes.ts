import { Router } from "express";
import { body, param, query } from "express-validator";
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
  getUniqueCities,
  claimEvent,
  promoteEvent,
  getEventsForCertificates,
  listCertificateTypes,
  addCertificateType,
  updateCertificateType,
  deleteCertificateType,
  getSimilarEvents,
  getOrganizerEvents,
} from "../controllers/event.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validateEventSEO } from "../validators/event.validator";

const router = Router();

// Public routes
router.get("/", getEvents);
router.get("/categories", getEventCategories);
router.get("/cities", getUniqueCities); // Must be before /:slug route
// Discovery routes — two-segment paths, no conflict with /:slug
router.get("/:id/similar", getSimilarEvents);
router.get("/:id/organizer-events", getOrganizerEvents);
router.get(
  "/:slug",
  [param("slug").notEmpty().withMessage("Event slug is required")],
  getEvent,
);

// Vendor routes
router.use(authenticate); // All routes below require authentication

router.get("/vendor/my-events", authorize(["vendor"]), getVendorEvents);
router.get("/vendor/analytics", authorize(["vendor"]), getVendorEventAnalytics);

router.post(
  "/",
  authorize(["vendor", "admin"]),
  [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 200 })
      .withMessage("Title cannot exceed 200 characters"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .isLength({ max: 2000 })
      .withMessage("Description cannot exceed 2000 characters"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("type")
      .isIn([
        "Olympiad",
        "Championship",
        "Competition",
        "Event",
        "Course",
        "Venue",
        "Workshop",
        "Class",
        "Bootcamp",
        "Masterclass",
      ])
      .withMessage("Invalid event type"),
    body("venueType")
      .isIn(["Indoor", "Outdoor", "Online", "Offline"])
      .withMessage("Venue type must be Indoor, Outdoor, Online, or Offline"),
    body("ageRange")
      .isArray({ min: 2, max: 2 })
      .withMessage("Age range must be an array of 2 numbers")
      .custom((value) => {
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error("Age range must contain exactly 2 numbers");
        }
        const [min, max] = value;
        if (typeof min !== "number" || typeof max !== "number") {
          throw new Error("Age range values must be numbers");
        }
        if (min < 0 || max > 100 || min > max) {
          throw new Error("Invalid age range values");
        }
        return true;
      }),
    body("location.city").trim().notEmpty().withMessage("City is required"),
    body("location.address")
      .trim()
      .notEmpty()
      .withMessage("Address is required"),
    body("location.coordinates.lat")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    body("location.coordinates.lng")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("currency")
      .isIn(["AED", "EGP", "CAD", "USD"])
      .withMessage("Invalid currency"),
    body("dateSchedule")
      .isArray({ min: 1 })
      .withMessage("At least one schedule date is required")
      .custom((value) => {
        if (!Array.isArray(value)) {
          throw new Error("Date schedule must be an array");
        }
        for (const schedule of value) {
          // Accept either legacy 'date' OR new 'startDate/endDate' format
          const hasLegacyDate = schedule.date;
          const hasNewDates = schedule.startDate && schedule.endDate;

          if (!hasLegacyDate && !hasNewDates) {
            throw new Error(
              "Each schedule must have either date OR startDate+endDate",
            );
          }

          // Allow unlimited seats (skip availableSeats validation)
          if (
            !schedule.unlimitedSeats &&
            (!schedule.availableSeats || schedule.availableSeats < 0)
          ) {
            throw new Error(
              "Each schedule must have valid availableSeats or unlimitedSeats flag",
            );
          }

          if (
            schedule.price === undefined ||
            schedule.price === null ||
            schedule.price < 0
          ) {
            throw new Error("Each schedule must have a non-negative price");
          }

          // Validate date is not in the past
          const dateToCheck = schedule.startDate || schedule.date;
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (new Date(dateToCheck) < now) {
            throw new Error("Schedule date cannot be in the past");
          }

          // Validate endDate is after startDate if both present
          if (schedule.startDate && schedule.endDate) {
            if (new Date(schedule.endDate) < new Date(schedule.startDate)) {
              throw new Error("End date must be after start date");
            }
          }
        }
        return true;
      }),
    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array")
      .custom((value) => {
        if (Array.isArray(value) && value.length > 20) {
          throw new Error("Cannot have more than 20 tags");
        }
        return true;
      }),
    body("images")
      .optional()
      .isArray()
      .withMessage("Images must be an array")
      .custom((value) => {
        if (Array.isArray(value) && value.length > 10) {
          throw new Error("Cannot have more than 10 images");
        }
        return true;
      }),
    ...validateEventSEO,
  ],
  createEvent,
);

router.put(
  "/:id",
  authorize(["vendor", "admin"]),
  [
    param("id").isMongoId().withMessage("Invalid event ID"),
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Title cannot be empty")
      .isLength({ max: 200 })
      .withMessage("Title cannot exceed 200 characters"),
    body("description")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Description cannot be empty")
      .isLength({ max: 2000 })
      .withMessage("Description cannot exceed 2000 characters"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    // Add other validation rules as needed
    ...validateEventSEO,
  ],
  updateEvent,
);

router.delete(
  "/:id",
  authorize(["vendor", "admin"]),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  deleteEvent,
);

router.post(
  "/:id/claim",
  authorize(["vendor", "teacher"]),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  claimEvent,
);

// Promote event (vendor or teacher)
router.post(
  "/:id/promote",
  authorize(["vendor", "teacher"]),
  [
    param("id").isMongoId().withMessage("Invalid event ID"),
    body("tier")
      .isIn(["boost", "featured", "premium"])
      .withMessage("tier must be boost, featured, or premium"),
    body("paymentMethodId").notEmpty().withMessage("paymentMethodId is required"),
  ],
  promoteEvent,
);

// Admin routes
router.get("/admin/for-certificates", authorize(["admin"]), getEventsForCertificates);
router.get("/admin/all", authorize(["admin"]), getAdminEvents);

router.put(
  "/admin/:id/approval",
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Invalid event ID"),
    body("isApproved").isBoolean().withMessage("isApproved must be a boolean"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason cannot exceed 500 characters"),
  ],
  updateEventApproval,
);

router.put(
  "/admin/:id/featured",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  toggleEventFeatured,
);

// Certificate types per event
router.get(
  "/:id/certificate-types",
  authorize(["vendor", "admin", "teacher"]),
  [param("id").isMongoId().withMessage("Invalid event ID")],
  listCertificateTypes,
);

router.post(
  "/:id/certificate-types",
  authorize(["vendor", "admin"]),
  [
    param("id").isMongoId().withMessage("Invalid event ID"),
    body("name").trim().notEmpty().withMessage("Certificate type name is required"),
    body("slug").trim().notEmpty().withMessage("Certificate type slug is required"),
    body("templateId").optional().isMongoId(),
  ],
  addCertificateType,
);

router.put(
  "/:id/certificate-types/:typeSlug",
  authorize(["vendor", "admin"]),
  [param("id").isMongoId().withMessage("Invalid event ID"), param("typeSlug").trim().notEmpty()],
  updateCertificateType,
);

router.delete(
  "/:id/certificate-types/:typeSlug",
  authorize(["vendor", "admin"]),
  [param("id").isMongoId().withMessage("Invalid event ID"), param("typeSlug").trim().notEmpty()],
  deleteCertificateType,
);

export default router;
