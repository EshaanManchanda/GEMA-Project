import express from 'express';
import { getSocialSettings } from '../controllers/public.settings.controller';

const router = express.Router();

/**
 * Public Settings Routes - No authentication required
 */

// GET /api/public/settings/social - Get social media settings
router.get('/social', getSocialSettings);

export default router;
