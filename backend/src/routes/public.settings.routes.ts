import express from "express";
import {
  getSocialSettings,
  getUISettings,
} from "../controllers/public.settings.controller";

const router = express.Router();

/**
 * Public Settings Routes - No authentication required
 */

// GET /api/public/settings/social - Get social media settings
router.get("/social", getSocialSettings);

// GET /api/public/settings/ui - Get UI settings (animationsEnabled, etc.)
router.get("/ui", getUISettings);

export default router;
