import { Router } from "express";
import { body, query } from "express-validator";
import {
  getOrganizationOnboardingStats,
  getOrganizationOnboardings,
  reviewOrganizationOnboarding,
} from "../controllers/admin.organization.controller";
import { authenticate, authorize, validate, adminLimiter } from "../middleware";
import { validateMongoId } from "../validators/common.validator";

const router = Router();

router.use(authenticate);
router.use(authorize(["admin"]));
router.use(adminLimiter);

router.get("/stats", getOrganizationOnboardingStats);

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("status").optional().isIn(["pending", "approved", "rejected"]),
  ],
  validate,
  getOrganizationOnboardings,
);

router.put(
  "/:id/review",
  [
    validateMongoId("id", "param"),
    body("status").isIn(["approved", "rejected"]),
    body("notes").optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  reviewOrganizationOnboarding,
);

export default router;
