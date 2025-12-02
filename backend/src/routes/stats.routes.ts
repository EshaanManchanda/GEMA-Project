import { Router } from 'express';
import { getPublicStats } from '../controllers/stats.controller';

const router = Router();

/**
 * @route   GET /api/stats
 * @desc    Get public homepage stats
 * @access  Public
 */
router.get('/', getPublicStats);

export default router;
