import { ApiService } from '../api';

// Affiliate interfaces
export interface Affiliate {
  _id: string;
  userId: string;
  affiliateCode: string;
  status: AffiliateStatus;
  defaultCommissionRate: number;
  commissionType: CommissionType;
  commissionTiers?: CommissionTier[];
  eventCommissions: EventCommission[];
  categoryCommissions: CategoryCommission[];
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  clicks: AffiliateClick[];
  commissions: AffiliateCommission[];
  monthlyStats: MonthlyStats[];
  businessName?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  paymentMethod: 'bank_transfer' | 'paypal' | 'stripe' | 'wallet';
  paymentDetails: PaymentDetails;
  minimumPayoutAmount: number;
  payoutFrequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
  cookieExpiryDays: number;
  applicationDate: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export type AffiliateStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type CommissionType = 'percentage' | 'fixed_amount' | 'tiered';

export interface CommissionTier {
  minSales: number;
  maxSales?: number;
  rate: number;
  type: CommissionType;
}

export interface EventCommission {
  eventId: string;
  commissionRate: number;
  commissionType: CommissionType;
  validUntil?: string;
}

export interface CategoryCommission {
  category: string;
  commissionRate: number;
  commissionType: CommissionType;
  validUntil?: string;
}

export interface AffiliateClick {
  clickId: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  countryCode?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  clickedAt: string;
  converted: boolean;
  conversionDate?: string;
  orderId?: string;
  conversionValue?: number;
}

export interface AffiliateCommission {
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  commissionType: CommissionType;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  approvedAt?: string;
  paidAt?: string;
  payoutId?: string;
  createdAt: string;
}

export interface MonthlyStats {
  year: number;
  month: number;
  clicks: number;
  conversions: number;
  revenue: number;
  commissionEarned: number;
}

export interface PaymentDetails {
  bankAccount?: {
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
  paypalEmail?: string;
  stripeAccountId?: string;
  walletAddress?: string;
}

export interface ApplyAffiliateData {
  defaultCommissionRate: number;
  commissionType?: CommissionType;
  businessName?: string;
  website?: string;
  paymentMethod: 'bank_transfer' | 'paypal' | 'stripe' | 'wallet';
  paymentDetails: PaymentDetails;
  minimumPayoutAmount?: number;
  payoutFrequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

export interface UpdateProfileData {
  businessName?: string;
  website?: string;
  paymentMethod?: 'bank_transfer' | 'paypal' | 'stripe' | 'wallet';
  paymentDetails?: PaymentDetails;
  minimumPayoutAmount?: number;
  payoutFrequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

export interface DashboardStats {
  overall: {
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    totalEarnings: number;
    conversionRate: number;
    pendingEarnings: number;
  };
  period: {
    clicks: number;
    conversions: number;
    revenue: number;
    earnings: number;
    conversionRate: number;
  };
  dailyBreakdown: Array<{
    date: string;
    clicks: number;
    conversions: number;
    revenue: number;
    earnings: number;
  }>;
}

export interface AffiliateAnalytics {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  averageConversionRate: number;
  averageCommissionRate: number;
}

const affiliateAPI = {
  // Public: Record affiliate click
  recordClick: async (affiliateCode: string, data?: {
    countryCode?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  }) => {
    try {
      const response = await ApiService.post(`/affiliates/click/${affiliateCode}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Apply to become an affiliate
  applyAffiliate: async (applicationData: ApplyAffiliateData) => {
    try {
      const response = await ApiService.post('/affiliates/apply', applicationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Affiliate: Get my affiliate account
  getMyAffiliate: async () => {
    try {
      const response = await ApiService.get('/affiliates/my');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Affiliate: Update profile
  updateProfile: async (profileData: UpdateProfileData) => {
    try {
      const response = await ApiService.put('/affiliates/profile', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Affiliate: Generate tracking URL
  generateTrackingUrl: async (data?: {
    eventId?: string;
    customParams?: Record<string, string>;
  }) => {
    try {
      const response = await ApiService.post('/affiliates/generate-url', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Affiliate: Get dashboard stats
  getDashboardStats: async (period?: number) => {
    try {
      const response = await ApiService.get('/affiliates/dashboard/stats', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Affiliate: Get commissions
  getCommissions: async (params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'paid' | 'cancelled';
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get('/affiliates/commissions', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get all affiliates
  getAllAffiliates: async (params?: {
    page?: number;
    limit?: number;
    status?: AffiliateStatus;
    sortBy?: 'totalRevenue' | 'totalConversions' | 'totalClicks' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) => {
    try {
      const response = await ApiService.get('/affiliates', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Update affiliate status
  updateAffiliateStatus: async (id: string, data: {
    status: AffiliateStatus;
    rejectionReason?: string;
  }) => {
    try {
      const response = await ApiService.put(`/affiliates/${id}/status`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get top performers
  getTopPerformers: async (params?: {
    limit?: number;
    period?: number;
  }) => {
    try {
      const response = await ApiService.get('/affiliates/top-performers', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get affiliate analytics
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get('/affiliates/analytics/overview', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default affiliateAPI;