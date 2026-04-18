import { Router } from "express";
import { authenticate, authenticateOptional, validate } from "../../middleware/index";
import { uploadRegistrationFiles } from "../../middleware/upload";
import * as registrationController from "./registration.controller";
import {
  validateSubmitRegistration,
  validateConfirmPayment,
  validateGetRegistrations,
  validateUpdateRegistration,
  validateWithdrawRegistration,
  validateReviewRegistration,
  validateRegistrationConfig,
  validateDuplicateRegistrationConfig,
} from "./registration.validator";

const router = Router();

router.get(
  "/user/me",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.getUserRegistrations,
);

router.get(
  "/event/:eventId",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.getEventRegistrations,
);

router.get(
  "/:id",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.getRegistrationById,
);

router.patch(
  "/:id",
  authenticate,
  uploadRegistrationFiles,
  validateUpdateRegistration,
  validate,
  registrationController.updateRegistration,
);

router.delete(
  "/:id",
  authenticate,
  validateWithdrawRegistration,
  validate,
  registrationController.withdrawRegistration,
);

router.post(
  "/:id/confirm-payment",
  authenticate,
  validateConfirmPayment,
  validate,
  registrationController.confirmRegistrationPayment,
);

router.post(
  "/:id/review",
  authenticate,
  validateReviewRegistration,
  validate,
  registrationController.reviewRegistration,
);

router.get(
  "/:id/files/:fileId",
  authenticate,
  validateGetRegistrations,
  validate,
  registrationController.downloadRegistrationFile,
);

router.post(
  "/submit/:eventId",
  authenticate,
  uploadRegistrationFiles,
  validateSubmitRegistration,
  validate,
  registrationController.submitRegistration,
);

export default router;
