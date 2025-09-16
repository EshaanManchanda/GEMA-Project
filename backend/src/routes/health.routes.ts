import { Router } from 'express';
import { getHealthStatus, getBasicHealthStatus } from '../controllers/health.controller';

const router = Router();

// Health check routes
router.get('/', getHealthStatus);
router.get('/basic', getBasicHealthStatus);

export default router;