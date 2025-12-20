import express from 'express';
import {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  updateDisplayOrders
} from '../controllers/banner.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { UserRole } from '../models/index';
import {
  createBannerValidation,
  updateBannerValidation,
  getBannerValidation,
  deleteBannerValidation,
  getAllBannersValidation,
  updateDisplayOrdersValidation
} from '../validators/banner.validator';

const router = express.Router();

// Public routes
router.get('/active', getActiveBanners);

// Admin routes - require authentication and admin role
router.use(authenticate, authorize([UserRole.ADMIN]));
router.get('/', getAllBannersValidation, validateRequest, getAllBanners);
router.get('/:id', getBannerValidation, validateRequest, getBannerById);
router.post('/', createBannerValidation, validateRequest, createBanner);
router.put('/:id', updateBannerValidation, validateRequest, updateBanner);
router.delete('/:id', deleteBannerValidation, validateRequest, deleteBanner);
router.patch('/display-orders', updateDisplayOrdersValidation, validateRequest, updateDisplayOrders);

export default router;
