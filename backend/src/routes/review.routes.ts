import { Router } from "express";
import { body, param, query } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  createReview,
  getReviews,
  getTeacherReviews,
  getUserReviews,
  checkReviewStatus,
  checkTeacherReviewStatus,
  updateReview,
  deleteReview,
  voteReview,
  flagReview,
  respondToReview,
  getPendingReviews,
  moderateReview,
  getGoogleReviews,
  getReviewLink,
  submitReviewViaLink,
  generateReviewLink,
  syncGoogleReviews,
  getAdminGoogleReviews,
  toggleGoogleReviewVisibility,
  getHomepageGoogleReviews,
  uploadReviewMedia,
} from "../controllers/review.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ReviewType, FlagReason, ReviewStatus } from "../models/index";
import { uploadMultiple, handleUploadError } from "../middleware/upload";

// Strict limiter for the sync endpoint — calls the paid Google Places API
const googleSyncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 syncs per IP per hour (covers heavy admin use)
  message: {
    success: false,
    message: "Too many sync requests. Please wait before syncing again.",
    error: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for public review-media uploads (unauthenticated, identified by email)
const reviewMediaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 upload requests per IP per window (each can carry up to 5 files)
  message: {
    success: false,
    message: "Too many upload attempts. Please wait before trying again.",
    error: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC GET routes  —  all MUST be registered before the /:type/:id wildcard
// ─────────────────────────────────────────────────────────────────────────────

// General reviews with query filters
router.get(
  "/",
  [
    query("type")
      .optional()
      .isIn(Object.values(ReviewType))
      .withMessage("Invalid review type"),
    query("targetId").optional().isMongoId().withMessage("Invalid target ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    query("verified")
      .optional()
      .isBoolean()
      .withMessage("Verified must be a boolean"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "rating", "helpfulVotes"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Invalid sort order"),
  ],
  getReviews,
);

// Teacher reviews — dedicated public endpoint
router.get(
  "/by-teacher/:teacherUserId",
  [param("teacherUserId").isMongoId().withMessage("Invalid teacher user ID")],
  getTeacherReviews,
);

// Review link — find/create user, return status (no token)
router.get(
  "/link/:eventId",
  [
    param("eventId").isMongoId().withMessage("Invalid event ID"),
    query("email").isEmail().withMessage("Valid email required"),
    query("firstName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("First name too long"),
    query("lastName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Last name too long"),
    query("schoolName")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("School name too long"),
  ],
  getReviewLink,
);

// Submit review via link — public, identified by email
router.post(
  "/link/:eventId",
  [
    param("eventId").isMongoId().withMessage("Invalid event ID"),
    body("email").isEmail().withMessage("Valid email required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Title cannot exceed 100 characters"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Comment cannot exceed 2000 characters"),
    body("pros").optional().isArray().withMessage("Pros must be an array"),
    body("pros.*")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Each pro cannot exceed 200 characters"),
    body("cons").optional().isArray().withMessage("Cons must be an array"),
    body("cons.*")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Each con cannot exceed 200 characters"),
    body("media").optional().isArray().withMessage("Media must be an array"),
  ],
  submitReviewViaLink,
);

// Upload images/videos to attach to a review-link submission — public
router.post(
  "/link/:eventId/media",
  reviewMediaLimiter,
  uploadMultiple("files", 5),
  handleUploadError,
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  uploadReviewMedia,
);

// Google Maps reviews — DB-backed, public
router.get(
  "/google/homepage",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage("Limit must be between 1 and 24"),
  ],
  getHomepageGoogleReviews,
);

router.get(
  "/google/:eventId",
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  getGoogleReviews,
);

// Admin: pending reviews (protected inline)
router.get(
  "/admin/pending",
  authenticate,
  authorize(["admin"]),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  getPendingReviews,
);

// Customer: own reviews (protected inline)
router.get("/my-reviews", authenticate, getUserReviews);

// Check event review status (protected inline)
router.get(
  "/check-status/:eventId",
  authenticate,
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  checkReviewStatus,
);

// Check teacher review status (protected inline)
router.get(
  "/check-teacher-status/:teacherUserId",
  authenticate,
  [param("teacherUserId").isMongoId().withMessage("Invalid teacher user ID")],
  checkTeacherReviewStatus,
);

// ─────────────────────────────────────────────────────────────────────────────
// Wildcard route — MUST be last among GET routes
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:type/:id",
  [
    param("type")
      .isIn(Object.values(ReviewType))
      .withMessage("Invalid review type"),
    param("id").isMongoId().withMessage("Invalid target ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    query("verified")
      .optional()
      .isBoolean()
      .withMessage("Verified must be a boolean"),
  ],
  getReviews,
);

// ─────────────────────────────────────────────────────────────────────────────
// All remaining routes require authentication
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate);

// Create a review
router.post(
  "/",
  [
    body("type")
      .isIn(Object.values(ReviewType))
      .withMessage("Invalid review type"),
    body("targetId").isMongoId().withMessage("Valid target ID is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Title cannot exceed 100 characters"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Comment cannot exceed 2000 characters"),
    body("pros").optional().isArray().withMessage("Pros must be an array"),
    body("pros.*")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Each pro cannot exceed 200 characters"),
    body("cons").optional().isArray().withMessage("Cons must be an array"),
    body("cons.*")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Each con cannot exceed 200 characters"),
    body("orderId").optional().isMongoId().withMessage("Invalid order ID"),
    body("media").optional().isArray().withMessage("Media must be an array"),
  ],
  createReview,
);

// Update a review
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid review ID"),
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Title cannot exceed 100 characters"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Comment cannot exceed 2000 characters"),
  ],
  updateReview,
);

// Delete a review
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid review ID")],
  deleteReview,
);

// Vote on a review
router.post(
  "/:id/vote",
  [
    param("id").isMongoId().withMessage("Invalid review ID"),
    body("helpful").isBoolean().withMessage("helpful must be a boolean"),
  ],
  voteReview,
);

// Flag a review
router.post(
  "/:id/flag",
  [
    param("id").isMongoId().withMessage("Invalid review ID"),
    body("reason")
      .isIn(Object.values(FlagReason))
      .withMessage("Invalid flag reason"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
  ],
  flagReview,
);

// Respond to a review
router.post(
  "/:id/respond",
  authorize(["vendor", "admin"]),
  [
    param("id").isMongoId().withMessage("Invalid review ID"),
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Response message is required")
      .isLength({ max: 1000 })
      .withMessage("Response cannot exceed 1000 characters"),
  ],
  respondToReview,
);

// Admin: generate shareable review link for event
router.post(
  "/admin/link/:eventId/generate",
  authorize(["admin", "vendor"]),
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  generateReviewLink,
);

// ─── Google Reviews Sync Engine (admin/vendor) ────────────────────────────────

// Sync Google reviews for an event (rate-limited — calls paid Google API)
router.post(
  "/google/:eventId/sync",
  googleSyncLimiter,
  authorize(["admin", "vendor"]),
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  syncGoogleReviews,
);

// Get all stored Google reviews for an event (includes hidden)
router.get(
  "/google/:eventId/admin",
  authorize(["admin", "vendor"]),
  [param("eventId").isMongoId().withMessage("Invalid event ID")],
  getAdminGoogleReviews,
);

// Toggle visibility of a stored Google review
router.patch(
  "/google/review/:reviewDocId/visibility",
  authorize(["admin", "vendor"]),
  [
    param("reviewDocId").isMongoId().withMessage("Invalid review ID"),
    body("isVisible").isBoolean().withMessage("isVisible must be a boolean"),
    body("hiddenReason")
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage("Hidden reason cannot exceed 300 characters"),
  ],
  toggleGoogleReviewVisibility,
);

// Admin: moderate a review
router.put(
  "/admin/:id/moderate",
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Invalid review ID"),
    body("status")
      .isIn(Object.values(ReviewStatus))
      .withMessage("Invalid review status"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes cannot exceed 1000 characters"),
  ],
  moderateReview,
);

export default router;
