import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  generateCertificate,
  generateBatch,
  getRecord,
  getRecords,
  verifyCertificate,
  getStats,
} from "./certificates.controller";

const router = Router();

// Public verification endpoint
router.get("/verify/:code", verifyCertificate);

// Template routes
router.get("/templates", authenticate, getTemplates);
router.get("/templates/:id", authenticate, getTemplate);

router.post(
  "/templates",
  authenticate,
  authorize([UserRole.SCHOOL, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  [
    body("name").trim().notEmpty().withMessage("Template name is required"),
    body("type").isIn(["attendance", "completion", "achievement", "participation", "excellence"]).withMessage("Invalid certificate type"),
    body("design.layout").trim().notEmpty().withMessage("Layout is required"),
    body("variables").isArray().withMessage("Variables must be an array"),
  ],
  validateRequest,
  createTemplate,
);

router.put(
  "/templates/:id",
  authenticate,
  authorize([UserRole.SCHOOL, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  validateRequest,
  updateTemplate,
);

router.delete(
  "/templates/:id",
  authenticate,
  authorize([UserRole.SCHOOL, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  validateRequest,
  deleteTemplate,
);

// Certificate generation
router.post(
  "/generate",
  authenticate,
  authorize([UserRole.SCHOOL, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  [
    body("templateId").isMongoId().withMessage("Valid template ID is required"),
    body("studentId").isMongoId().withMessage("Valid student ID is required"),
  ],
  validateRequest,
  generateCertificate,
);

router.post(
  "/generate/bulk",
  authenticate,
  authorize([UserRole.SCHOOL, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  [
    body("templateId").isMongoId().withMessage("Valid template ID is required"),
    body("studentIds").isArray({ min: 1 }).withMessage("Student IDs array is required"),
  ],
  validateRequest,
  generateBatch,
);

// Certificate records
router.get("/records", authenticate, getRecords);
router.get("/records/:id", authenticate, getRecord);

// Stats
router.get("/stats", authenticate, authorize([UserRole.SCHOOL, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]), getStats);

export default router;
