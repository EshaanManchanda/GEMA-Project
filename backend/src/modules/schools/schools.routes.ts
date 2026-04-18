import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createSchool,
  getSchools,
  getSchool,
  updateSchool,
  moderateSchool,
  deleteSchool,
  inviteToSchool,
  getSchoolInvites,
  acceptInvite,
  getSchoolStats,
} from "./schools.controller";

const router = Router();

// Public routes
router.get("/", getSchools);
router.get("/:id", getSchool);

// School registration (public)
router.post(
  "/",
  authenticate,
  [
    body("schoolName").trim().notEmpty().withMessage("School name is required"),
    body("schoolType").isIn(["public", "private", "charter", "international", "homeschool", "training_center"]).withMessage("Invalid school type"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("address.street").trim().notEmpty().withMessage("Street is required"),
    body("address.city").trim().notEmpty().withMessage("City is required"),
    body("address.state").trim().notEmpty().withMessage("State is required"),
    body("address.zipCode").trim().notEmpty().withMessage("Zip code is required"),
    body("address.country").trim().notEmpty().withMessage("Country is required"),
  ],
  validateRequest,
  createSchool,
);

// School-owned routes
router.use(authenticate);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid school ID")],
  validateRequest,
  updateSchool,
);

router.get("/:id/stats", getSchoolStats);

// Invite system
router.post(
  "/:id/invites",
  authenticate,
  [
    param("id").isMongoId().withMessage("Invalid school ID"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("role").isIn(["teacher", "employee", "student", "parent"]).withMessage("Invalid role"),
  ],
  validateRequest,
  inviteToSchool,
);

router.get("/:id/invites", getSchoolInvites);

router.post("/invites/accept", authenticate, acceptInvite);

// Admin routes
router.post(
  "/:id/moderate",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [
    param("id").isMongoId().withMessage("Invalid school ID"),
    body("action").isIn(["approve", "reject", "suspend", "unsuspend"]).withMessage("Invalid action"),
  ],
  validateRequest,
  moderateSchool,
);

router.delete(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  deleteSchool,
);

export default router;
