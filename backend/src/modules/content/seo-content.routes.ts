import express from "express";
import {
  getPublicSEOContent,
  getAllSEOContent,
  getSEOContentByPage,
  createSEOContent,
  updateSEOContent,
  deleteSEOContent,
} from "./seo-content.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import { UserRole } from "../../models/index";
import {
  createSEOContentValidation,
  updateSEOContentValidation,
  getSEOContentValidation,
  deleteSEOContentValidation,
  getAllSEOContentValidation,
} from "../../validators/seoContent.validator";

const router = express.Router();

// Public routes
router.get(
  "/:page",
  getSEOContentValidation,
  validateRequest,
  getPublicSEOContent,
);

// Admin routes - require authentication and admin role
router.use(authenticate, authorize([UserRole.ADMIN]));
router.get("/", getAllSEOContentValidation, validateRequest, getAllSEOContent);
router.post("/", createSEOContentValidation, validateRequest, createSEOContent);
router.put(
  "/:page",
  updateSEOContentValidation,
  validateRequest,
  updateSEOContent,
);
router.delete(
  "/:page",
  deleteSEOContentValidation,
  validateRequest,
  deleteSEOContent,
);

export default router;
