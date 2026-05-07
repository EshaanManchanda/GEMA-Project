import { api } from './index';

export interface VendorEarnings {
  totalEarned: number;
  totalPaidOut: number;
  pendingBalance: number;
  inProcessing: number;
  currency: string;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payoutMethod: 'bank_transfer' | 'stripe' | 'paypal' | 'manual';
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  totalOrders: number;
  paymentReference?: string;
  bankDetails?: BankDetails;
  metadata?: any;
}

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
}

export interface CommissionTransaction {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  adminCommission: number;
  vendorPayout: number;
  commissionRate: number;
  date: string;
  payoutStatus: string;
  revenueStream: string;
}

export interface PaymentSettings {
  paymentMode?: 'platform_stripe' | 'custom_stripe';
  commissionRate: number;
  subscriptionStatus?: 'active' | 'inactive' | 'pending' | 'expired' | 'suspended' | 'grace_period';
  subscriptionAmount?: number;
  subscriptionPaidUntil?: string;
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  minimumPayout: number;
  preferredPayoutMethod: 'bank_transfer' | 'stripe' | 'paypal';
  bankAccountDetails?: BankDetails;
  hasStripeConnect: boolean;
  stripeConnectOnboarded: boolean;
  autoPayoutEnabled: boolean;
}

export interface PayoutDashboardData {
  earnings: VendorEarnings;
  recentPayouts: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    transferId?: string;
    paidAt: string;
    revenueStream: string;
    description: string;
  }>;
  pendingRequests: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    requestedAt: string;
    approvedAt?: string;
    completedAt?: string;
  }>;
  paymentSettings: {
    hasStripeAccount: boolean;
    subscriptionActive: boolean;
    preferredPayoutMethod: string;
    minimumPayout: number;
    paymentMode?: string;
    commissionRate?: number;
    payoutSchedule?: string;
  };
}

const vendorPayoutAPI = {
  /**
   * Get vendor payouts dashboard data
   */
  async getDashboard(): Promise<PayoutDashboardData> {
    const response = await api.get('/vendors/payouts/dashboard');
    return response.data.data;
  },

  /**
   * Get vendor payout history
   */
  async getPayoutHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    payouts: PayoutRequest[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const response = await api.get('/vendors/payouts/history', { params });
    return response.data.data;
  },

  /**
   * Get pending earnings with commission breakdown
   */
  async getPendingEarnings(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    transactions: CommissionTransaction[];
    total: number;
    pagination: {
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const response = await api.get('/vendors/payouts/pending-earnings', { params });
    return response.data.data;
  },

  /**
   * Request a payout
   */
  async requestPayout(amount?: number): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    requestedAt: string;
  }> {
    const response = await api.post('/vendors/payouts/request', { amount });
    return response.data.data;
  },

  /**
   * Get specific payout request details
   */
  async getPayoutRequest(id: string): Promise<PayoutRequest> {
    const response = await api.get(`/vendors/payouts/requests/${id}`);
    return response.data.data;
  },

  /**
   * Cancel a payout request
   */
  async cancelPayoutRequest(id: string): Promise<void> {
    await api.delete(`/vendors/payouts/requests/${id}`);
  },

  /**
   * Get vendor payment settings
   */
  async getPaymentSettings(): Promise<PaymentSettings> {
    const response = await api.get('/vendors/payouts/payment-settings');
    return response.data.data;
  },

  /**
   * Update vendor payment settings
   */
  async updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
    const response = await api.put('/vendors/payouts/payment-settings', settings);
    return response.data.data;
  },

  /**
   * Calculate available balance for payout
   */
  async calculateAvailableBalance(): Promise<VendorEarnings> {
    const dashboard = await this.getDashboard();
    return dashboard.earnings;
  },

  /**
   * Get subscription status (for subscription model vendors)
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatusData> {
    const response = await api.get('/vendors/payouts/subscription-status');
    return response.data.data;
  },

  /**
   * Get commission history (for commission model vendors)
   */
  async getCommissionHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<CommissionHistoryData> {
    const response = await api.get('/vendors/payouts/commission-history', { params });
    return response.data.data;
  },
};

// New interfaces for subscription and commission data
export interface SubscriptionStatusData {
  paymentMode: 'platform_stripe' | 'custom_stripe';
  isSubscriptionModel: boolean;
  subscription: {
    status: 'active' | 'inactive' | 'pending' | 'expired' | 'suspended' | 'grace_period';
    amount: number;
    currency: string;
    startDate?: string;
    paidUntil?: string;
    nextRenewalDate?: string;
    daysUntilRenewal?: number;
    isExpired: boolean;
    isActive: boolean;
    paymentHistory: Array<{
      paymentDate: string;
      amount: number;
      periodStart: string;
      periodEnd: string;
      status: 'paid' | 'failed' | 'pending' | 'refunded';
      transactionId?: string;
      invoiceUrl?: string;
    }>;
  } | null;
  vendorStatus: {
    isActive: boolean;
    isSuspended: boolean;
    suspensionReason?: string;
  };
}

export interface CommissionHistoryData {
  paymentMode: 'platform_stripe' | 'custom_stripe';
  commissionRate: number;
  transactions: Array<{
    id: string;
    transactionId: string;
    orderNumber: string;
    originalAmount: number;
    platformCommission: number;
    vendorCommission: number;
    status: string;
    calculatedAt: string;
    paidAt?: string;
  }>;
  summary: {
    totalSales: number;
    totalCommissionPaid: number;
    totalEarnings: number;
    totalTransactions: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default vendorPayoutAPI;
