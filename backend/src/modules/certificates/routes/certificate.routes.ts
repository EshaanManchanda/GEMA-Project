import { Router } from "express";
import { param, body, query } from "express-validator";
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  listTemplateVersions,
  rollbackTemplate,
  triggerGeneration,
  bulkGenerate,
  bulkImportCSV,
  getBulkRequestStatus,
  getCertificate,
  listCertificates,
  exportCertificates,
  verifyCertificate,
  revokeCertificate,
  retryCertificate,
  downloadCertificate,
  resendCertificateEmail,
  listAuditLogs,
  listCertificatesByEmail,
  updateCertificate,
  deleteCertificate,
  purgeAllCertificates,
} from "../controllers/certificate.controller";
import { authenticate, authorize } from "../../../middleware/auth";
import { createCustomLimiter } from "../../../middleware/rateLimiter";

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

// ─── Public ───────────────────────────────────────────────────────────────────

router.get(
  "/verify/:serialNumber",
  [param("serialNumber").notEmpty().withMessage("Serial number required")],
  verifyCertificate,
);

router.get(
  "/public/by-email",
  [query("email").isEmail().withMessage("Valid email required")],
  listCertificatesByEmail,
);

// ─── Auth required ────────────────────────────────────────────────────────────

router.use(authenticate);

// ─── Templates ────────────────────────────────────────────────────────────────

router.get("/templates", authorize(["admin"]), listTemplates);

router.post(
  "/templates",
  authorize(["admin"]),
  [
    body("name").notEmpty().withMessage("Template name required"),
    body("slug").notEmpty().withMessage("Template slug required"),
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

router.delete(
  "/templates/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid template ID")],
  deleteTemplate,
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
  [
    param("id").isMongoId().withMessage("Invalid template ID"),
    param("versionNumber").isInt({ min: 1 }).withMessage("Version must be a positive integer"),
  ],
  rollbackTemplate,
);

// ─── Generation ───────────────────────────────────────────────────────────────

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

router.post(
  "/bulk-import",
  authorize(["admin"]),
  certBulkLimiter,
  [
    body("eventId").isMongoId().withMessage("Valid event ID required"),
    body("csv").notEmpty().withMessage("csv is required"),
    body("templateId").optional().isMongoId().withMessage("Invalid template ID"),
    body("certificateTypeSlug").optional().isString(),
    body("sendEmail").optional().isBoolean(),
  ],
  bulkImportCSV,
);

// ─── Request status ───────────────────────────────────────────────────────────

router.get(
  "/requests/:requestId",
  authorize(["admin", "vendor"]),
  [param("requestId").isMongoId().withMessage("Invalid request ID")],
  getBulkRequestStatus,
);

// ─── Certificate queries ──────────────────────────────────────────────────────

router.get(
  "/",
  authorize(["admin", "vendor"]),
  [
    query("eventId").optional().isMongoId(),
    query("userId").optional().isMongoId(),
    query("studentId").optional().isString(),
    query("recipientEmail").optional().isEmail(),
    query("status").optional().isIn(["pending", "generating", "generated", "email_queued", "emailed", "failed", "revoked"]),
    query("type").optional().isString(),
    query("issuedFrom").optional().isISO8601(),
    query("issuedTo").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  listCertificates,
);

// ─── Export certificates as CSV (admin only) ─────────────────────────────────

router.get(
  "/export",
  authorize(["admin"]),
  [
    query("eventId").optional().isMongoId(),
    query("userId").optional().isMongoId(),
    query("studentId").optional().isString(),
    query("recipientEmail").optional().isEmail(),
    query("status").optional().isIn(["pending", "generating", "generated", "email_queued", "emailed", "failed", "revoked"]),
    query("type").optional().isString(),
    query("issuedFrom").optional().isISO8601(),
    query("issuedTo").optional().isISO8601(),
  ],
  exportCertificates,
);

// ─── Purge all certificates (admin only) ─────────────────────────────────────

router.delete(
  "/purge-all",
  authorize(["admin"]),
  [
    query("eventId").optional().isMongoId(),
    query("mode").optional().isIn(["full", "storage-only"]),
  ],
  purgeAllCertificates,
);

// ─── Certificate actions (must come before /:id catch-all) ───────────────────

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

// ─── Certificate by ID ────────────────────────────────────────────────────────

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

router.post(
  "/:id/revoke",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  revokeCertificate,
);

router.post(
  "/:id/retry",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  retryCertificate,
);

router.put(
  "/:id",
  authorize(["admin"]),
  [
    param("id").isMongoId().withMessage("Invalid certificate ID"),
    body("status").optional().isIn(["pending", "generating", "generated", "emailed", "failed", "revoked"]),
    body("recipient.email").optional().isEmail(),
  ],
  updateCertificate,
);

router.delete(
  "/:id",
  authorize(["admin"]),
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  deleteCertificate,
);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid certificate ID")],
  getCertificate,
);

export default router;
