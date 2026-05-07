import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  getOrganizationOnboarding,
  saveOrganizationApplication,
  signOrganizationAgreement,
} from "../controllers/organization.controller";
import {
  saveOrganizationApplicationValidation,
  signOrganizationAgreementValidation,
} from "../validators/organization.validator";

const router = Router();

router.use(authenticate);

router.get("/onboarding", getOrganizationOnboarding);

router.put(
  "/application",
  saveOrganizationApplicationValidation,
  validateRequest,
  saveOrganizationApplication,
);

router.put(
  "/agreement",
  signOrganizationAgreementValidation,
  validateRequest,
  signOrganizationAgreement,
);

export default router;
