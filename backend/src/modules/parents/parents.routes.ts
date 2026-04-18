import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createParent,
  getParent,
  getParentByUser,
  updateParent,
  addChild,
  removeChild,
  deleteParent,
} from "./parents.controller";

const router = Router();

router.use(authenticate);

router.get("/me", authorize([UserRole.PARENT, UserRole.ADMIN]), getParentByUser);

router.post(
  "/",
  authorize([UserRole.PARENT, UserRole.ADMIN]),
  [
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
  ],
  validateRequest,
  createParent,
);

router.get("/:id", authorize([UserRole.PARENT, UserRole.ADMIN]), getParent);

router.put(
  "/:id",
  authorize([UserRole.PARENT, UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid parent ID")],
  validateRequest,
  updateParent,
);

router.post(
  "/:id/children",
  authorize([UserRole.PARENT, UserRole.ADMIN]),
  [
    param("id").isMongoId().withMessage("Invalid parent ID"),
    body("studentId").isMongoId().withMessage("Valid student ID is required"),
    body("relationship").isIn(["father", "mother", "guardian", "other"]).withMessage("Invalid relationship"),
  ],
  validateRequest,
  addChild,
);

router.delete(
  "/:parentId/children/:studentId",
  authorize([UserRole.PARENT, UserRole.ADMIN]),
  [param("parentId").isMongoId().withMessage("Invalid parent ID"), param("studentId").isMongoId().withMessage("Invalid student ID")],
  validateRequest,
  removeChild,
);

router.delete(
  "/:id",
  authorize([UserRole.ADMIN]),
  [param("id").isMongoId().withMessage("Invalid parent ID")],
  validateRequest,
  deleteParent,
);

export default router;
