import express from "express";
import {
  listNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
} from "../controllers/admin.notificationTemplate.controller";
import { authenticate, authorize } from "../middleware/auth";
import { UserRole } from "../models/User";

const router = express.Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

// GET /api/admin/notification-templates
router.get("/", listNotificationTemplates);

// GET /api/admin/notification-templates/:id
router.get("/:id", getNotificationTemplate);

// POST /api/admin/notification-templates
router.post("/", createNotificationTemplate);

// PATCH /api/admin/notification-templates/:id
router.patch("/:id", updateNotificationTemplate);

// DELETE /api/admin/notification-templates/:id
router.delete("/:id", deleteNotificationTemplate);

export default router;
