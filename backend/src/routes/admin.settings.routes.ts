import express from 'express';
import {
  getAdminSettings,
  updateAdminSettings,
  getPlatformHealth
} from '../controllers/admin.settings.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

/**
 * Admin Settings Routes
 */

// GET /api/admin/settings - Get admin revenue settings
router.get('/settings', getAdminSettings);

// PUT /api/admin/settings - Update admin revenue settings
router.put('/settings', updateAdminSettings);

// GET /api/admin/settings/health - Get platform health status
router.get('/settings/health', getPlatformHealth);

export default router;
