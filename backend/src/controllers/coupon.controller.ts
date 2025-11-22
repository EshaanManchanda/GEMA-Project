import { Request, Response, NextFunction } from 'express';
import { Coupon, Order, ICoupon, CouponStatus } from '../models';
import { AppError } from '../middleware';
import { ApiResponse } from '../types';

/**
 * Get all coupons (admin only)
 */
export const getCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      search
    } = req.query;
    
    const query: any = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Search by code or name
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('applicableEvents', 'title')
        .populate('applicableCategories', 'name slug')
        .populate('excludedCategories', 'name slug')
        .populate('applicableVendors', 'firstName lastName email businessName')
        .populate('excludedVendors', 'firstName lastName email businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Coupon.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      },
      message: 'Coupons retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single coupon by ID
 */
export const getCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const coupon = await Coupon.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('applicableEvents', 'title slug price')
      .populate('applicableCategories', 'name slug')
      .populate('excludedCategories', 'name slug')
      .populate('applicableVendors', 'firstName lastName email businessName')
      .populate('excludedVendors', 'firstName lastName email businessName')
      .populate('usage.userId', 'firstName lastName email')
      .populate('usage.orderId', 'orderNumber total');
    
    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: coupon,
      message: 'Coupon retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new coupon
 */
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const couponData = {
      ...req.body,
      createdBy: req.user?._id || req.user?.id
    };
    
    // Validate commission tiers if type is tiered
    if (couponData.type === 'tiered' && !couponData.commissionTiers?.length) {
      return next(new AppError('Tiered coupons must have commission tiers defined', 400));
    }
    
    const coupon = new Coupon(couponData);
    await coupon.save();
    
    await coupon.populate('createdBy', 'firstName lastName email');
    
    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Coupon code already exists', 400));
    }
    next(error);
  }
};

/**
 * Update coupon
 */
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    Object.assign(coupon, updateData);
    await coupon.save();
    
    await coupon.populate('createdBy', 'firstName lastName email');
    
    res.status(200).json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Coupon code already exists', 400));
    }
    next(error);
  }
};

/**
 * Delete coupon
 */
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    await Coupon.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      data: null,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate coupon for user and order
 */
export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.params;
    const { orderAmount, eventIds } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }
    
    // Find coupon by code
    const coupon = await Coupon.findByCode(code);
    if (!coupon) {
      return next(new AppError('Invalid coupon code', 404));
    }
    
    // Check if coupon is valid for user
    const isValidForUser = await coupon.isValidForUser(userId);
    if (!isValidForUser) {
      return next(new AppError('Coupon is not valid for this user', 400));
    }

    // Fetch event details if event IDs are provided
    let events: any[] = [];
    if (eventIds && eventIds.length > 0) {
      const Event = require('../models/Event').default;
      events = await Event.find({ _id: { $in: eventIds } }).select('category vendorId type price');
    }

    // Check if coupon is valid for order
    const isValidForOrder = coupon.isValidForOrder(orderAmount, eventIds || [], events);
    if (!isValidForOrder) {
      return next(new AppError('Coupon is not applicable to this order', 400));
    }
    
    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderAmount);
    
    res.status(200).json({
      success: true,
      data: {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
        },
        discountAmount,
        finalAmount: Math.max(0, orderAmount - discountAmount),
        isValid: true
      },
      message: 'Coupon is valid'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply coupon to order (used during checkout)
 */
export const applyCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { couponId, orderId } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }
    
    // Find coupon and order
    const [coupon, order] = await Promise.all([
      Coupon.findById(couponId),
      Order.findById(orderId)
    ]);
    
    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }
    
    if (!order) {
      return next(new AppError('Order not found', 404));
    }
    
    // Verify order belongs to user
    if (order.userId.toString() !== userId) {
      return next(new AppError('Unauthorized access to order', 403));
    }
    
    // Validate coupon
    const isValidForUser = await coupon.isValidForUser(userId);
    if (!isValidForUser) {
      return next(new AppError('Coupon is not valid for this user', 400));
    }

    const eventIds = order.items.map(item => item.eventId);

    // Fetch event details for validation
    const Event = require('../models/Event').default;
    const events = await Event.find({ _id: { $in: eventIds } }).select('category vendorId type price');

    const isValidForOrder = coupon.isValidForOrder(order.subtotal, eventIds, events);
    if (!isValidForOrder) {
      return next(new AppError('Coupon is not applicable to this order', 400));
    }
    
    // Calculate discount
    const discountAmount = coupon.calculateDiscount(order.subtotal);
    
    // Update order with coupon
    order.couponCode = coupon.code;
    order.couponDiscount = discountAmount;
    await order.save();
    
    // Increment coupon usage
    await coupon.incrementUsage(userId, orderId, discountAmount);
    
    res.status(200).json({
      success: true,
      data: {
        order,
        discountAmount
      },
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active coupons (public)
 */
export const getActiveCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const coupons = await Coupon.findActive()
      .select('code name description type value minimumAmount validUntil')
      .limit(10);
    
    res.status(200).json({
      success: true,
      data: coupons,
      message: 'Active coupons retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get coupon usage statistics
 */
export const getCouponStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }
    
    // Calculate statistics
    const totalDiscount = coupon.usage.reduce((sum, usage) => sum + usage.discountAmount, 0);
    const uniqueUsers = new Set(coupon.usage.map(usage => usage.userId.toString())).size;
    
    // Usage over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsage = coupon.usage.filter(usage => usage.usedAt >= thirtyDaysAgo);
    
    const stats = {
      totalUses: coupon.usageCount,
      totalDiscount,
      uniqueUsers,
      averageDiscount: coupon.usageCount > 0 ? totalDiscount / coupon.usageCount : 0,
      recentUses: recentUsage.length,
      remainingUses: coupon.usageLimit ? Math.max(0, coupon.usageLimit - coupon.usageCount) : null
    };
    
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Coupon statistics retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's coupon usage history
 */
export const getUserCouponHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return next(new AppError('Authentication required', 401));
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const coupons = await Coupon.find({
      'usage.userId': userId
    })
    .select('code name description type value usage')
    .sort({ 'usage.usedAt': -1 })
    .skip(skip)
    .limit(parseInt(limit as string));
    
    // Filter to show only user's usage
    const userCoupons = coupons.map(coupon => {
      const userUsage = coupon.usage.filter(
        usage => usage.userId.toString() === userId
      );
      
      return {
        ...coupon.toJSON(),
        usage: userUsage
      };
    });
    
    const total = await Coupon.countDocuments({
      'usage.userId': userId
    });
    
    res.status(200).json({
      success: true,
      data: {
        coupons: userCoupons,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      },
      message: 'User coupon history retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update coupon status
 */
export const bulkUpdateCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { couponIds, status } = req.body;
    
    if (!Array.isArray(couponIds) || couponIds.length === 0) {
      return next(new AppError('Coupon IDs array is required', 400));
    }
    
    if (!Object.values(CouponStatus).includes(status)) {
      return next(new AppError('Invalid status', 400));
    }
    
    const result = await Coupon.updateMany(
      { _id: { $in: couponIds } },
      { 
        status,
        isActive: status === CouponStatus.ACTIVE
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `${result.modifiedCount} coupons updated successfully`
    });
  } catch (error) {
    next(error);
  }
};