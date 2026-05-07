import { Router } from "express";
import { authenticate, authenticateOptional, validate } from "../middleware/index";
import { uploadRegistrationFiles } from "../middleware/upload";
import * as registrationController from "../controllers/registration.controller";
import * as registrationConfigController from "../controllers/event.registration.config.controller";
import {
  validateSubmitRegistration,
  validateConfirmPayment,
  validateGetRegistrations,
  validateUpdateRegistration,
  validateWithdrawRegistration,
  validateReviewRegistration,
  validateRegistrationConfig,
  validateDuplicateRegistrationConfig,
} from "../validators/registration.validator";

const router = Router();

/**
 * ============================================
 * REGISTRATION MANAGEMENT ROUTES
 * Base path: /api/registrations
 * ============================================
 */

/**
 * @route   GET /api/registrations/user/me
 * @desc    Get current user's registrations (paginated)
 * @access  Private
 */
router.get(
  "/user/me",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.getUserRegistrations,
);

/**
 * @route   GET /api/registrations/event/:eventId
 * @desc    Get all registrations for an event (vendor/admin only)
 * @access  Private (Vendor/Admin)
 */
router.get(
  "/event/:eventId",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.getEventRegistrations,
);

/**
 * @route   GET /api/registrations/:id
 * @desc    Get registration by ID
 * @access  Private (Owner/Vendor/Admin)
 */
router.get(
  "/:id",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.getRegistrationById,
);

/**
 * @route   PATCH /api/registrations/:id
 * @desc    Update registration (draft only, can include file uploads)
 * @access  Private (Owner only)
 */
router.patch(
  "/:id",
  authenticate,
  uploadRegistrationFiles,
  validateUpdateRegistration,
  validate,
  registrationController.updateRegistration,
);

/**
 * @route   DELETE /api/registrations/:id
 * @desc    Withdraw registration
 * @access  Private (Owner only)
 */
router.delete(
  "/:id",
  authenticate,
  validateWithdrawRegistration,
  validate,
  registrationController.withdrawRegistration,
);

/**
 * @route   POST /api/registrations/:id/confirm-payment
 * @desc    Confirm payment for registration
 * @access  Private (Owner only)
 */
router.post(
  "/:id/confirm-payment",
  authenticate,
  validateConfirmPayment,
  validate,
  registrationController.confirmRegistrationPayment,
);

/**
 * @route   POST /api/registrations/:id/review
 * @desc    Review registration (approve/reject)
 * @access  Private (Vendor/Admin)
 */
router.post(
  "/:id/review",
  authenticate,
  validateReviewRegistration,
  validate,
  registrationController.reviewRegistration,
);

/**
 * @route   GET /api/registrations/:id/files/:fileId
 * @desc    Download registration file
 * @access  Private (Owner/Vendor/Admin)
 */
router.get(
  "/:id/files/:fileId",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.downloadRegistrationFile,
);

/**
 * ============================================
 * EVENT REGISTRATION SUBMISSION ROUTES
 * Base path: /api/events/:eventId/registrations
 * Note: These routes should be mounted in event.routes.ts
 * or handled separately
 * ============================================
 */

/**
 * @route   POST /api/events/:eventId/registrations
 * @desc    Submit event registration with files
 * @access  Private
 */
router.post(
  "/submit/:eventId",
  authenticate,
  uploadRegistrationFiles,
  validateSubmitRegistration,
  validate,
  registrationController.submitRegistration,
);

/**
 * ============================================
 * REGISTRATION CONFIG ROUTES (VENDOR)
 * Base path: /api/events/:eventId/registration-config
 * Note: These routes should be mounted in event.routes.ts
 * or handled separately
 * ============================================
 */

/**
 * @route   POST /api/events/:eventId/registration-config
 * @desc    Create or update registration config for event
 * @access  Private (Vendor/Admin - Event owner)
 */
router.post(
  "/config/:eventId",
  authenticate,
  validateRegistrationConfig,
  validate,
  registrationConfigController.createOrUpdateRegistrationConfig,
);

/**
 * @route   GET /api/events/:eventId/registration-config
 * @desc    Get registration config for event
 * @access  Public (limited data) / Private (full data for owner)
 */
router.get(
  "/config/:eventId",
  authenticateOptional,
  validateGetRegistrations,
  validate,
  registrationConfigController.getRegistrationConfig,
);

/**
 * @route   DELETE /api/events/:eventId/registration-config
 * @desc    Disable registration for event
 * @access  Private (Vendor/Admin - Event owner)
 */
router.delete(
  "/config/:eventId",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationConfigController.disableRegistration,
);

/**
 * @route   POST /api/events/:eventId/registration-config/duplicate
 * @desc    Duplicate registration config from another event
 * @access  Private (Vendor/Admin - Event owner)
 */
router.post(
  "/config/:eventId/duplicate",
  authenticate,
  validateDuplicateRegistrationConfig,
  validate,
  registrationConfigController.duplicateRegistrationConfig,
);

export default router;
