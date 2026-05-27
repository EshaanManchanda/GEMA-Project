import { Router } from "express";
import { param, body, query } from "express-validator";
import { uploadCSV } from "../middleware/upload";
import mongoose from "mongoose";
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  previewTemplate,
  listTemplateVersions,
  rollbackTemplate,
  triggerGeneration,
  bulkGenerate,
  getBulkRequestStatus,
  getCertificate,
  listCertificates,
  verifyCertificate,
  revokeCertificate,
  downloadCertificate,
  resendCertificateEmail,
  listAuditLogs,
  bulkImportCSV,
  getSampleCSV,
} from "../controllers/certificate.controller";
import { authenticate, authorize } from "../middleware/auth";
import { createCustomLimiter } from "../middleware/rateLimiter";

const certGenerateLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyPrefix: "cert-gen",
  message: "Certificate generation rate limit exceeded. Max 100 per hour per user.",
});

const certBulkLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: "cert-bulk",
  message: "Bulk certificate generation limit exceeded. Max 10 bulk requests per hour.",
});

const router = Router();

// Public verification
router.get(
  "/verify/:serialNumber",
  [param("serialNumber").notEmpty().withMessage("Serial number required")],
  verifyCertificate,
);

// Auth required for everything below
router.use(authenticate);

// Templates (admin only)
router.get("/templates", authorize(["admin"]), listTemplates);

router.post(
  "/templates",
  authorize(["admin"]),
  [
    body("name").notEmpty().withMessage("Template name required"),
    body("slug").notEmpty().withMessage("Template slug required"),
    body("html").notEmpty().withMessage("Template HTML required"),
  ],
  createTemplate,
);

router.get(
  "/templates/:id/full",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  getTemplate,
);

router.put(
  "/templates/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  updateTemplate,
);

router.post(
  "/templates/:id/preview",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  previewTemplate,
);

router.get(
  "/templates/:id/versions",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  listTemplateVersions,
);

router.post(
  "/templates/:id/rollback/:versionNumber",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid template ID"), param("versionNumber").isInt({ min: 1 })],
  rollbackTemplate,
);

// Certificate generation (admin / vendor)
router.post(
  "/generate",
  authorize(["admin", "vendor"]),
  certGenerateLimiter,
  [
    body("eventId").isMongoId().withMessage("Valid event ID required"),
    body("recipient.name").notEmpty().withMessage("Recipient name required"),
    body("recipient.email").isEmail().withMessage("Valid recipient email required"),
  ],
  triggerGeneration,
);

router.post(
  "/bulk",
  authorize(["admin", "vendor"]),
  certBulkLimiter,
  [
    body("templateId").isMongoId().withMessage("Valid template ID required"),
    body("eventId").isMongoId().withMessage("Valid event ID required"),
    body("inputs").isArray({ min: 1 }).withMessage("inputs must be a non-empty array"),
  ],
  bulkGenerate,
);

router.get(
  "/requests/:requestId",
  authorize(["admin", "vendor"]),
  [param("requestId").isMongoId().withMessage("Invalid request ID")],
  getBulkRequestStatus,
);

// Certificate queries
router.get(
  "/",
  authorize(["admin", "vendor"]),
  [
    query("eventId").optional().isMongoId(),
    query("userId").optional().isMongoId(),
    query("status").optional().isIn(["pending", "generating", "generated", "emailed", "failed", "revoked"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  listCertificates,
);

router.get(
  "/:id/download",
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  downloadCertificate,
);

router.post(
  "/:id/email",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  resendCertificateEmail,
);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  getCertificate,
);

router.post(
  "/:id/revoke",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  revokeCertificate,
);

// Audit log
router.get(
  "/audit/logs",
  authorize(["admin"]),
  [
    query("entityId").optional().isString(),
    query("action").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 200 }),
  ],
  listAuditLogs,
);

// ─────────────────────────────────────────────────────────────────────
// Bulk Import CSV
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/import/csv",
  authorize(["admin", "vendor"]),
  certBulkLimiter,
  uploadCSV.single("csv"),
  [
    body("eventId").isMongoId().withMessage("Valid event ID required"),
    body("certificateTypeSlug").optional().trim(),
  ],
  bulkImportCSV,
);

// Get sample CSV with event's certificate types
router.get(
  "/import/sample-csv/:eventId",
  authorize(["admin", "vendor"]),
  [param("eventId").isMongoId().withMessage("Valid event ID required")],
  getSampleCSV,
);

export default router;
