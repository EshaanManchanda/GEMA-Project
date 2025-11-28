import { Router } from 'express';
import { getHealthStatus, getBasicHealthStatus, getRedisConnectionStats } from '../controllers/health.controller';

const router = Router();

// Health check routes
router.get('/', getHealthStatus);
router.get('/basic', getBasicHealthStatus);
router.get('/redis', getRedisConnectionStats);

export default router;