import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Root route
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Gema API!' });
});

// Auth routes
router.use('/auth', authRoutes);

export default router;