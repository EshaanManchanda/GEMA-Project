import { ApiService } from '../api';

// Coupon interfaces
export interface Coupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  currency?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  userUsageLimit?: number;
  isActive: boolean;
  status: 'active' | 'inactive' | 'expired';
  applicableEvents: string[];
  applicableCategories: string[];
  excludedEvents: string[];
  firstTimeOnly: boolean;
  createdBy: string | null;
  usage: CouponUsage[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  userId: string;
  orderId: string;
  usedAt: string;
  discountAmount: number;
}

export interface CreateCouponData {
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  currency?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  userUsageLimit?: number;
  applicableEvents?: string[];
  applicableCategories?: string[];
  excludedEvents?: string[];
  firstTimeOnly?: boolean;
}

export interface UpdateCouponData extends Partial<CreateCouponData> {}

export interface CouponValidation {
  coupon: {
    id: string;
    code: string;
    name: string;
    description?: string;
    type: string;
    value: number;
  };
  discountAmount: number;
  finalAmount: number;
  isValid: boolean;
}

export interface CouponStats {
  totalUses: number;
  totalDiscount: number;
  uniqueUsers: number;
  averageDiscount: number;
  recentUses: number;
  remainingUses: number | null;
}

const couponAPI = {
  // Public: Get active coupons
  getActiveCoupons: async () => {
    try {
      const response = await ApiService.get('/coupons/active');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customer: Validate coupon
  validateCoupon: async (code: string, orderAmount: number, eventIds?: string[]) => {
    try {
      const response = await ApiService.post(`/coupons/validate/${code}`, {
        orderAmount,
        eventIds
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customer: Apply coupon to order
  applyCoupon: async (couponId: string, orderId: string) => {
    try {
      const response = await ApiService.post('/coupons/apply', {
        couponId,
        orderId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customer: Get user's coupon usage history
  getUserCouponHistory: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/coupons/my-history', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get all coupons
  getAllCoupons: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  }) => {
    try {
      const response = await ApiService.get('/coupons', { params });
      return response.data;
    } catch (error) {
      console.error('[couponAPI] GET /coupons error:', error);
      throw error;
    }
  },

  // Admin: Get single coupon
  getCouponById: async (id: string) => {
    try {
      const response = await ApiService.get(`/coupons/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Create new coupon
  createCoupon: async (couponData: CreateCouponData) => {
    try {
      const response = await ApiService.post('/coupons', couponData);
      return response.data;
    } catch (error) {
      console.error('[couponAPI] POST /coupons error:', error);
      throw error;
    }
  },

  // Admin: Update coupon
  updateCoupon: async (id: string, couponData: UpdateCouponData) => {
    try {
      const response = await ApiService.put(`/coupons/${id}`, couponData);
      return response.data;
    } catch (error) {
      console.error(`[couponAPI] PUT /coupons/${id} error:`, error);
      throw error;
    }
  },

  // Admin: Delete coupon
  deleteCoupon: async (id: string) => {
    try {
      const response = await ApiService.delete(`/coupons/${id}`);
      return response.data;
    } catch (error) {
      console.error(`[couponAPI] DELETE /coupons/${id} error:`, error);
      throw error;
    }
  },

  // Admin: Get coupon statistics
  getCouponStats: async (id: string) => {
    try {
      const response = await ApiService.get(`/coupons/${id}/stats`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Bulk update coupons
  bulkUpdateCoupons: async (couponIds: string[], status: 'active' | 'inactive' | 'expired') => {
    try {
      const response = await ApiService.put('/coupons/bulk/status', {
        couponIds,
        status
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default couponAPI;