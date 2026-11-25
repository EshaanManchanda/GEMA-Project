import express from "express";
import {
  getCommunicationSettings,
  listCommunicationLogs,
  getCommunicationLog,
  retryCommunicationLog,
  getRetryPolicy,
  getCommunicationLogsSummary,
  previewWhatsAppTemplate,
  testWhatsAppSend,
  testWhatsAppConnection,
  getEmailMarketingSettings,
  updateEmailMarketingSettings,
  testEmailMarketingConnection,
  backfillEmailMarketing,
} from "../controllers/admin.communication.controller";
import {
  getEmailDigestSettings,
  updateEmailDigestSettings,
  previewEmailDigest,
  dispatchEmailDigest,
  listEmailCampaigns,
  updateCampaignRecord,
  deleteCampaignRecord,
} from "../controllers/admin.digest.controller";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";

const router = express.Router();

// Admin-only — no vendor/customer access to communication internals for now
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

// GET /api/admin/communication/settings
router.get("/communication/settings", getCommunicationSettings);

// GET /api/admin/communication/retry-policy
router.get("/communication/retry-policy", getRetryPolicy);

// GET /api/admin/communication/logs
router.get("/communication/logs", listCommunicationLogs);

// GET /api/admin/communication/logs/summary — must precede /logs/:id
router.get("/communication/logs/summary", getCommunicationLogsSummary);

// GET /api/admin/communication/logs/:id
router.get("/communication/logs/:id", getCommunicationLog);

// POST /api/admin/communication/logs/:id/retry
router.post("/communication/logs/:id/retry", retryCommunicationLog);

// POST /api/admin/communication/whatsapp/preview
router.post("/communication/whatsapp/preview", previewWhatsAppTemplate);

// POST /api/admin/communication/whatsapp/test
router.post("/communication/whatsapp/test", testWhatsAppSend);

// GET /api/admin/communication/whatsapp/test-connection
router.get("/communication/whatsapp/test-connection", testWhatsAppConnection);

// Email-marketing provider settings (secrets write-only), connection check
router.get("/communication/email-marketing/settings", getEmailMarketingSettings);
router.put(
  "/communication/email-marketing/settings",
  updateEmailMarketingSettings,
);
router.get(
  "/communication/email-marketing/test-connection",
  testEmailMarketingConnection,
);

router.post("/communication/email-marketing/backfill", backfillEmailMarketing);

// Digest & Automation endpoints
router.get("/communication/email-marketing/digest-settings", getEmailDigestSettings);
router.put("/communication/email-marketing/digest-settings", updateEmailDigestSettings);
router.post("/communication/email-marketing/digest-preview", previewEmailDigest);
router.post("/communication/email-marketing/digest-dispatch", dispatchEmailDigest);

// Campaign Records Management
router.get("/communication/email-marketing/campaigns", listEmailCampaigns);
router.patch("/communication/email-marketing/campaigns/:id", updateCampaignRecord);
router.delete("/communication/email-marketing/campaigns/:id", deleteCampaignRecord);

export default router;
