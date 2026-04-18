import express from "express";
import {
  getAppSettings,
  updateAppSettings,
  testEmailConnection,
  sendTestEmail,
} from "./admin-app-settings.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * Admin Application Settings Routes
 */

// GET /api/admin/app-settings - Get application settings (system, email, payment, social)
router.get("/app-settings", getAppSettings);

// PUT /api/admin/app-settings - Update application settings
router.put("/app-settings", updateAppSettings);

// POST /api/admin/app-settings/email/test-connection - Test email connection
router.post("/app-settings/email/test-connection", testEmailConnection);

// POST /api/admin/app-settings/email/send-test - Send test email
router.post("/app-settings/email/send-test", sendTestEmail);

export default router;
