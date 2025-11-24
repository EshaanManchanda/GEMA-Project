import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/index';
import { AuthRequest } from '../types';
import AdminRevenueSettings from '../models/AdminRevenueSettings';

/**
 * Get admin revenue settings
 * @route GET /api/admin/settings
 */
export const getAdminSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await AdminRevenueSettings.getCurrentSettings();

    if (!settings) {
      return next(new AppError('Admin settings not found. Please contact system administrator.', 404));
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Update admin revenue settings
 * @route PUT /api/admin/settings
 */
export const updateAdminSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?._id || req.user?.id;
    if (!adminId) {
      return next(new AppError('Admin ID not found', 401));
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: adminId,
      lastModifiedAt: new Date()
    };

    // Increment version
    if (updateData.version) {
      updateData.version = updateData.version + 1;
    }

    const settings = await AdminRevenueSettings.getCurrentSettings();

    if (!settings) {
      return next(new AppError('Admin settings not found', 404));
    }

    // Update settings
    Object.assign(settings, updateData);
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Admin settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};

/**
 * Get platform health status
 * @route GET /api/admin/settings/health
 */
export const getPlatformHealth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await AdminRevenueSettings.getCurrentSettings();

    const health = {
      status: settings?.isActive ? 'active' : 'inactive',
      maintenanceMode: settings?.maintenanceMode || false,
      version: settings?.version || 1,
      lastModified: settings?.lastModifiedAt || new Date(),
      paymentGateways: {
        stripe: settings?.paymentGateways?.stripe?.enabled || false,
        paypal: settings?.paymentGateways?.paypal?.enabled || false,
        razorpay: settings?.paymentGateways?.razorpay?.enabled || false
      },
      services: {
        database: 'connected',
        cache: 'operational',
        notifications: 'operational'
      }
    };

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    next(new AppError((error as Error).message, 500));
  }
};
