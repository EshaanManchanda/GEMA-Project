import { ApiService } from '../api';

const adminAPI = {
  // Dashboard stats
  getDashboardStats: async () => {
    try {
      // Use the new centralized endpoint that includes all dashboard data
      const response = await ApiService.get('/admin/dashboard-all');
      return response;
    } catch (error) {
      // Fallback to individual endpoint if centralized one fails
      try {
        console.warn('Centralized dashboard endpoint failed, falling back to analytics endpoint');
        const response = await ApiService.get('/analytics/dashboard');
        return response;
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  // User management
  getAllUsers: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/users', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUserById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  createUser: async (userData: any) => {
    try {
      const response = await ApiService.post('/admin/users', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (id: string, userData: any) => {
    try {
      const response = await ApiService.put(`/admin/users/${id}`, userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUserStatus: async (id: string, status: string) => {
    try {
      const response = await ApiService.patch(`/admin/users/${id}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUserRole: async (id: string, role: string) => {
    try {
      const response = await ApiService.patch(`/admin/users/${id}/role`, { role });
      return response;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateUsers: async (userIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/users/bulk', { userIds, updateData });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUserStats: async () => {
    try {
      const response = await ApiService.get('/admin/users/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Event management
  getAllEvents: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/events/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createEvent: async (eventData: any) => {
    try {
      const response = await ApiService.post('/admin/events', eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateEvent: async (id: string, eventData: any) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}`, eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteEvent: async (id: string, permanent?: boolean) => {
    try {
      const response = await ApiService.delete(`/admin/events/${id}${permanent ? '?permanent=true' : ''}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  restoreEvent: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/restore`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveEvent: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectEvent: async (id: string, reason: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  toggleEventFeatured: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/toggle-featured`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateEvents: async (eventIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/events/bulk', { eventIds, updateData });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventStats: async () => {
    try {
      const response = await ApiService.get('/admin/events/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Order management
  getAllOrders: async (params?: any) => {
    try {
      const response = await ApiService.get('/orders/admin/all', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderById: async (id: string) => {
    try {
      const response = await ApiService.get(`/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/orders/admin/analytics', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  confirmOrder: async (id: string) => {
    try {
      const response = await ApiService.post(`/orders/admin/${id}/confirm`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  refundOrder: async (id: string, amount?: number, reason?: string) => {
    try {
      const response = await ApiService.post(`/orders/admin/${id}/refund`, { amount, reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateOrder: async (id: string, orderData: any) => {
    try {
      const response = await ApiService.put(`/orders/admin/${id}`, orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteOrder: async (id: string) => {
    try {
      const response = await ApiService.delete(`/orders/admin/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateOrders: async (orderIds: string[], action: 'confirm' | 'cancel' | 'refund' | 'update', data?: any) => {
    try {
      const response = await ApiService.patch('/orders/admin/bulk', { orderIds, action, data });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Legacy method (deprecated - use updateOrder instead)
  updateOrderStatus: async (id: string, status: string) => {
    try {
      const response = await ApiService.put(`/orders/admin/${id}`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Venue management
  getAllVenues: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/venues', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/venues/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVenue: async (id: string, venueData: any) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}`, venueData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteVenue: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/venues/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveVenue: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectVenue: async (id: string, reason: string) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVenueStatus: async (id: string, status: string) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateVenues: async (venueIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/venues/bulk', { venueIds, updateData });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueStats: async () => {
    try {
      const response = await ApiService.get('/admin/venues/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Analytics
  getUserAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/analytics/users', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/analytics/events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTicketAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/analytics/tickets', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/analytics/venues', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRevenueAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/analytics/revenue', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportAnalytics: async (params: { type: string; startDate?: string; endDate?: string; format?: 'json' | 'csv' }) => {
    try {
      const response = await ApiService.get('/analytics/export', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Settings management
  getSettings: async () => {
    try {
      const response = await ApiService.get('/admin/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSettings: async (settings: any) => {
    try {
      const response = await ApiService.put('/admin/settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSystemSettings: async () => {
    try {
      const response = await ApiService.get('/admin/settings/system');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSystemSettings: async (systemSettings: any) => {
    try {
      const response = await ApiService.put('/admin/settings/system', systemSettings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEmailSettings: async () => {
    try {
      const response = await ApiService.get('/admin/settings/email');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateEmailSettings: async (emailSettings: any) => {
    try {
      const response = await ApiService.put('/admin/settings/email', emailSettings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPaymentSettings: async () => {
    try {
      const response = await ApiService.get('/admin/settings/payment');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePaymentSettings: async (paymentSettings: any) => {
    try {
      const response = await ApiService.put('/admin/settings/payment', paymentSettings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  testEmailConnection: async () => {
    try {
      const response = await ApiService.post('/admin/settings/email/test-connection');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendTestEmail: async (emailData: any) => {
    try {
      const response = await ApiService.post('/admin/settings/email/send-test', emailData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // COMMISSION MANAGEMENT
  // =============================================
  
  // Commission Configuration
  getCommissionConfigs: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/commissions', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCommissionConfig: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/commissions/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createCommissionConfig: async (configData: any) => {
    try {
      const response = await ApiService.post('/admin/commissions', configData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCommissionConfig: async (id: string, configData: any) => {
    try {
      const response = await ApiService.put(`/admin/commissions/${id}`, configData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCommissionConfig: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/commissions/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  setDefaultCommissionConfig: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/commissions/${id}/set-default`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCommissionTemplates: async () => {
    try {
      const response = await ApiService.get('/admin/commission-templates');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Commission Transactions
  getCommissionTransactions: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/commission-transactions', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCommissionTransaction: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/commission-transactions/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveCommissionTransactions: async (transactionIds: string[]) => {
    try {
      const response = await ApiService.put('/admin/commission-transactions/approve', { transactionIds });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectCommissionTransaction: async (id: string, reason: string) => {
    try {
      const response = await ApiService.put(`/admin/commission-transactions/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  recalculateCommissionTransaction: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/commission-transactions/${id}/recalculate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  batchCalculateCommissions: async (orderIds: string[]) => {
    try {
      const response = await ApiService.post('/admin/commission-batch-calculate', { orderIds });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Commission Analytics
  getCommissionAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/commission-analytics', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportCommissionData: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/commission-export', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCommissionStats: async () => {
    try {
      const response = await ApiService.get('/admin/commission-stats');
      return response.data;
    } catch (error) {
      console.warn('Commission stats endpoint not available, returning mock data');
      // Return mock data structure that matches expected interface
      return {
        success: true,
        data: {
          totalCommissions: 0,
          totalAmount: 0,
          pendingCommissions: 0,
          pendingAmount: 0,
          approvedCommissions: 0,
          approvedAmount: 0,
          paidCommissions: 0,
          paidAmount: 0,
          averageCommissionRate: 0,
          topVendors: []
        }
      };
    }
  },

  getPendingCommissions: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/commission-pending', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkApproveCommissions: async (transactionIds: string[]) => {
    try {
      const response = await ApiService.post('/admin/commission-bulk-approve', { transactionIds });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkRejectCommissions: async (transactionIds: string[], reason: string) => {
    try {
      const response = await ApiService.post('/admin/commission-bulk-reject', { transactionIds, reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // PAYOUT MANAGEMENT
  // =============================================
  
  // Vendor Earnings and Payouts
  getVendorEarnings: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/vendor-earnings', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVendorEarning: async (vendorId: string, params?: any) => {
    try {
      const response = await ApiService.get(`/admin/vendor-earnings/${vendorId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payout Requests
  getPayoutRequests: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/payout-requests', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPayoutRequest: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/payout-requests/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approvePayoutRequest: async (id: string, approvalData?: any) => {
    try {
      const response = await ApiService.put(`/admin/payout-requests/${id}/approve`, approvalData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectPayoutRequest: async (id: string, reason: string) => {
    try {
      const response = await ApiService.put(`/admin/payout-requests/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  processPayoutRequest: async (id: string, paymentData: any) => {
    try {
      const response = await ApiService.put(`/admin/payout-requests/${id}/process`, paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkApprovePayouts: async (payoutIds: string[]) => {
    try {
      const response = await ApiService.post('/admin/payout-requests/bulk-approve', { payoutIds });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkRejectPayouts: async (payoutIds: string[], reason: string) => {
    try {
      const response = await ApiService.post('/admin/payout-requests/bulk-reject', { payoutIds, reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payout Analytics
  getPayoutStats: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/payout-stats', { params });
      return response.data;
    } catch (error) {
      console.warn('Payout stats endpoint not available, returning mock data');
      // Return mock data structure that matches expected interface
      return {
        success: true,
        data: {
          totalPayouts: 0,
          totalAmount: 0,
          pendingPayouts: 0,
          pendingAmount: 0,
          completedPayouts: 0,
          completedAmount: 0,
          rejectedPayouts: 0,
          averagePayoutAmount: 0,
          currency: 'AED',
          periodComparison: {
            payoutGrowth: 0,
            amountGrowth: 0
          }
        }
      };
    }
  },

  getPayoutAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/payout-analytics', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportPayoutData: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/payout-export', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payment Methods Management
  getPaymentMethods: async () => {
    try {
      const response = await ApiService.get('/admin/payment-methods');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createPaymentMethod: async (methodData: any) => {
    try {
      const response = await ApiService.post('/admin/payment-methods', methodData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePaymentMethod: async (id: string, methodData: any) => {
    try {
      const response = await ApiService.put(`/admin/payment-methods/${id}`, methodData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deletePaymentMethod: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/payment-methods/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Financial Reports
  getFinancialSummary: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/financial-summary', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRevenueReport: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/revenue-report', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  generateFinancialReport: async (params?: any) => {
    try {
      const response = await ApiService.post('/admin/generate-financial-report', params);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default adminAPI;