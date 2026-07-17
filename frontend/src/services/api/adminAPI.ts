import { ApiService } from '../api';
import type { ReportFormat, ReportRange, CertificateExportFilters, BlogExportFilters } from '../../types/analytics';

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
        const response = await ApiService.get('/insights/dashboard');
        return response;
      } catch (fallbackError) {
        throw error;
      }
    }
  },

  getTopPerformers: async () => {
    try {
      const response = await ApiService.get('/admin/dashboard/top-performers');
      return response;
    } catch (error) {
      throw error;
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

  // Admin password reset with OTP verification
  initiatePasswordReset: async (userId: string) => {
    try {
      const response = await ApiService.post(`/admin/users/${userId}/reset-password/initiate`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  confirmPasswordReset: async (userId: string, otp: string, newPassword: string) => {
    try {
      const response = await ApiService.post(`/admin/users/${userId}/reset-password/confirm`, {
        otp,
        newPassword
      });
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

  // Employee management
  getAllEmployees: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/employees', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getEmployeeById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/employees/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  createEmployee: async (employeeData: any) => {
    try {
      const response = await ApiService.post('/admin/employees', employeeData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateEmployee: async (id: string, employeeData: any) => {
    try {
      const response = await ApiService.put(`/admin/employees/${id}`, employeeData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  deleteEmployee: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/employees/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateEmployees: async (employeeIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/employees/bulk', { employeeIds, updateData });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getEmployeeStats: async () => {
    try {
      const response = await ApiService.get('/admin/employees/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Event management
  getEvents: async (params?: any) => {
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

  // Teaching Event Management — redirected to /admin/events with educational type filter
  // since TeachingEvent model was consolidated into Event model
  EDUCATIONAL_TYPES: ['Class', 'Course', 'Workshop', 'Bootcamp', 'Masterclass'],

  getAllTeachingEvents: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/events', {
        params: { ...params, type: 'Class,Course,Workshop,Bootcamp,Masterclass' },
      });
      // Admin events endpoint returns: { success, data: { events: [...], pagination: {...} } }
      // Normalize to backward-compatible shape with teachingEvents key
      const inner = response.data?.data || response.data || {};
      const events = inner.events || inner.teachingEvents || [];
      return {
        success: response.data?.success,
        data: {
          teachingEvents: events,
          events,
          pagination: inner.pagination,
        },
      };
    } catch (error) {
      throw error;
    }
  },

  getTeachingEventById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/events/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createTeachingEvent: async (eventData: any) => {
    try {
      const response = await ApiService.post('/admin/events', eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeachingEvent: async (id: string, eventData: any) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}`, eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTeachingEvent: async (id: string, permanent: boolean = false) => {
    try {
      const response = await ApiService.delete(`/admin/events/${id}${permanent ? '?permanent=true' : ''}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  restoreTeachingEvent: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/restore`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveTeachingEvent: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectTeachingEvent: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  toggleTeachingEventFeatured: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/events/${id}/toggle-featured`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateTeachingEvents: async (teachingEventIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/events/bulk', {
        eventIds: teachingEventIds,
        updateData,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changeTeachingEventTeacher: async (teachingEventId: string, teacherId: string) => {
    try {
      // Re-assign vendor — use the standard event update endpoint
      const response = await ApiService.put(`/admin/events/${teachingEventId}`, { teacherId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTeachingEventTeachers: async (params?: any) => {
    try {
      // Return teachers who have educational events
      const response = await ApiService.get('/admin/teachers', { params });
      return response;
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

  getEventOrders: async (eventId: string, params?: any) => {
    try {
      const response = await ApiService.get('/orders/admin/all', { params: { ...params, eventId } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderById: async (id: string) => {
    try {
      const response = await ApiService.get(`/orders/admin/${id}`);
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
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Venue Management
  getVenueById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/venues/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  createVenue: async (venueData: any) => {
    try {
      const response = await ApiService.post('/admin/venues', venueData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateVenue: async (id: string, venueData: any) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}`, venueData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  deleteVenue: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/venues/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  approveVenue: async (id: string) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}/approve`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  rejectVenue: async (id: string, reason: string) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}/reject`, { reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateVenueStatus: async (id: string, status: string) => {
    try {
      const response = await ApiService.put(`/admin/venues/${id}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateVenues: async (venueIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/venues/bulk', { venueIds, updateData });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getVenueStats: async () => {
    try {
      const response = await ApiService.get('/admin/venues/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all vendor profiles with filtering and pagination
  getAllVendorProfiles: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/vendors', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get vendor profiles list (simple list, no params)
  getVendorsList: async () => {
    try {
      const response = await ApiService.get('/admin/vendors/list', {
        params: { limit: 100 }
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Vendor application management
  approveVendorApplication: async (vendorId: string, notes?: string) => {
    try {
      const response = await ApiService.put(`/admin/vendors/${vendorId}/approve`, { notes });
      return response;
    } catch (error) {
      throw error;
    }
  },

  rejectVendorApplication: async (vendorId: string, reason: string) => {
    try {
      const response = await ApiService.put(`/admin/vendors/${vendorId}/reject`, { reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Analytics
  getUserAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/insights/users', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/insights/events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTicketAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/insights/tickets', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/insights/venues', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRevenueAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/insights/revenue', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportAnalytics: async (params: { type: string; startDate?: string; endDate?: string; format?: 'json' | 'csv' }) => {
    try {
      const response = await ApiService.get('/insights/export', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Revenue Settings management (AdminRevenueSettings)
  getSettings: async () => {
    try {
      const response = await ApiService.get('/admin/settings');
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateSettings: async (settings: any) => {
    try {
      const response = await ApiService.put('/admin/settings', settings);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Application Settings management (System, Email, Payment, Social)
  getAppSettings: async () => {
    try {
      const response = await ApiService.get('/admin/app-settings');
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateAppSettings: async (settings: any) => {
    try {
      const response = await ApiService.put('/admin/app-settings', settings);
      return response;
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

  // Monthly vendor payout batches (VendorPayoutBatch)
  getPayoutBatches: async (params?: { page?: number; limit?: number; status?: string; vendorId?: string; periodStart?: string }) => {
    try {
      const response = await ApiService.get('/admin/payouts/batches', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  generatePayoutBatches: async (period?: { periodStart: string; periodEnd: string }) => {
    try {
      const response = await ApiService.post('/admin/payouts/batches/generate', period || {});
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPayoutBatch: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/payouts/batches/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  approvePayoutBatch: async (id: string) => {
    try {
      const response = await ApiService.post(`/admin/payouts/batches/${id}/approve`, {});
      return response;
    } catch (error) {
      throw error;
    }
  },

  markPayoutBatchPaid: async (id: string, details: { paymentMethod: string; transactionReference?: string }) => {
    try {
      const response = await ApiService.post(`/admin/payouts/batches/${id}/mark-paid`, details);
      return response;
    } catch (error) {
      throw error;
    }
  },

  cancelPayoutBatch: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.post(`/admin/payouts/batches/${id}/cancel`, { reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  testEmailConnection: async () => {
    try {
      const response = await ApiService.post('/admin/app-settings/email/test-connection');
      return response;
    } catch (error) {
      throw error;
    }
  },

  sendTestEmail: async (emailData: any) => {
    try {
      const response = await ApiService.post('/admin/app-settings/email/send-test', emailData);
      return response;
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

  // =============================================
  // TEACHER MANAGEMENT
  // =============================================

  getAllTeachers: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/teachers', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTeacherById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/teachers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createTeacher: async (teacherData: any) => {
    try {
      const response = await ApiService.post('/admin/teachers', teacherData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeacher: async (id: string, teacherData: any) => {
    try {
      const response = await ApiService.put(`/admin/teachers/${id}`, teacherData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTeacher: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/teachers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeacherStatus: async (id: string, statusData: any) => {
    try {
      const response = await ApiService.put(`/admin/teachers/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  toggleTeacherActive: async (id: string, isActive: boolean) => {
    try {
      const response = await ApiService.put(`/admin/teachers/${id}/active`, { isActive });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  toggleTeacherSuspension: async (id: string, isSuspended: boolean) => {
    try {
      const response = await ApiService.put(`/admin/teachers/${id}/suspend`, { isSuspended });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeacherPaymentMode: async (id: string, paymentData: any) => {
    try {
      const response = await ApiService.put(`/admin/teachers/${id}/payment-mode`, paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTeacherSubscriptionStatus: async (id: string, subscriptionData: any) => {
    try {
      const response = await ApiService.put(`/admin/teachers/${id}/subscription-status`, subscriptionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTeacherStats: async () => {
    try {
      const response = await ApiService.get('/admin/teachers/stats');
      return response.data;
    } catch (error) {
      console.warn('Teacher stats endpoint not available, returning mock data');
      return {
        success: true,
        data: {
          totalTeachers: 0,
          activeTeachers: 0,
          pendingVerification: 0,
          suspendedTeachers: 0,
          teachersByPaymentMode: {},
          teachersByVerificationStatus: {},
        }
      };
    }
  },

  // =============================================
  // ORGANIZATION ONBOARDING MANAGEMENT
  // =============================================

  getOrganizationOnboardings: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/organizations', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrganizationOnboardingStats: async () => {
    try {
      const response = await ApiService.get('/admin/organizations/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  reviewOrganizationOnboarding: async (
    id: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ) => {
    try {
      const response = await ApiService.put(`/admin/organizations/${id}/review`, {
        status,
        notes,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // BOOKING MANAGEMENT
  // =============================================

  getAllBookings: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/bookings', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // NOTIFICATION MANAGEMENT
  // =============================================

  getNotifications: async () => {
    try {
      const response = await ApiService.get('/admin/notifications');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      const response = await ApiService.put(`/admin/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendSystemNotification: async (params: {
    type: 'all_users' | 'all_vendors' | 'specific_users';
    userIds?: string[];
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }) => {
    try {
      const response = await ApiService.post('/admin/notifications/send', params);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // REGISTRATION MANAGEMENT
  // =============================================

  getEventRegistrations: async (eventId: string, params?: any) => {
    try {
      const response = await ApiService.get(`/registrations/event/${eventId}`, { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getRegistrationById: async (id: string) => {
    try {
      const response = await ApiService.get(`/registrations/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  reviewRegistration: async (id: string, data: { status: string; remarks?: string }) => {
    try {
      const response = await ApiService.post(`/registrations/${id}/review`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // TRAFFIC ANALYTICS
  // =============================================

  getTrafficOverview: async (days = 30) => {
    try {
      const response = await ApiService.get('/admin/traffic/overview', { params: { days } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTrafficReferrers: async (days = 30) => {
    try {
      const response = await ApiService.get('/admin/traffic/referrers', { params: { days } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // =============================================
  // GOOGLE SEARCH CONSOLE
  // =============================================

  // Note: ApiService.get/post already resolve to the parsed response body
  // ({ success, data, ... }) — these endpoints return sibling metadata
  // (configured/siteUrl/cached/fetchedAt/message) alongside `data` that
  // callers need, so we return the body as-is instead of peeling `.data`
  // again (that would silently discard the metadata).
  getSearchConsoleSites: async (): Promise<any> => {
    return ApiService.get('/admin/search-console/sites');
  },

  getSearchConsoleSummary: async (days = 28, site?: string): Promise<any> => {
    return ApiService.get('/admin/search-console/summary', { params: { days, site } });
  },

  getSearchConsoleQueries: async (days = 28, site?: string): Promise<any> => {
    return ApiService.get('/admin/search-console/queries', { params: { days, site } });
  },

  getSearchConsolePages: async (days = 28, site?: string): Promise<any> => {
    return ApiService.get('/admin/search-console/pages', { params: { days, site } });
  },

  // Force a live refetch from Google (bypasses the 6h cache) and persist it
  // durably. Omit `site` to sync every configured property in one call.
  syncSearchConsole: async (site?: string): Promise<any> => {
    return ApiService.post('/admin/search-console/sync', undefined, { params: { site } });
  },

  getSearchConsoleHistory: async (months = 12, site?: string): Promise<any> => {
    return ApiService.get('/admin/search-console/history', { params: { months, site } });
  },
  // =============================================
  // CERTIFICATE TEMPLATES & EVENT CERT TYPES
  // =============================================

  getCertTemplates: async () => {
    try {
      const response = await ApiService.get('/certificates/templates');
      return response?.data?.templates ?? response?.data ?? [];
    } catch (error) {
      throw error;
    }
  },

  getEventCertTypes: async (eventId: string) => {
    try {
      const response = await ApiService.get(`/events/${eventId}/certificate-types`);
      return response?.data ?? [];
    } catch (error) {
      throw error;
    }
  },

  addEventCertType: async (eventId: string, data: {
    name: string;
    slug: string;
    templateId?: string;
    isDefault?: boolean;
    description?: string;
    criteria?: string;
    sortOrder?: number;
  }) => {
    try {
      const response = await ApiService.post(`/events/${eventId}/certificate-types`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateEventCertType: async (eventId: string, slug: string, data: {
    name?: string;
    templateId?: string;
    isDefault?: boolean;
    description?: string;
    criteria?: string;
    sortOrder?: number;
  }) => {
    try {
      const response = await ApiService.put(`/events/${eventId}/certificate-types/${slug}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteEventCertType: async (eventId: string, slug: string) => {
    try {
      const response = await ApiService.delete(`/events/${eventId}/certificate-types/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ── Report downloads ────────────────────────────────────────────────────────

  downloadEventReport: async (eventId: string, format: ReportFormat, range: ReportRange = '7d'): Promise<void> => {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const filename = `event-report-${eventId}-${range}.${ext}`;
    await ApiService.download(`/insights/events/${eventId}/report?format=${format}&range=${range}`, filename);
  },

  exportCertificates: async (filters: CertificateExportFilters = {}): Promise<void> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString() ? `?${params.toString()}` : '';
    await ApiService.download(`/certificates/export${qs}`, `certificates-export-${new Date().toISOString().split('T')[0]}.csv`);
  },

  exportBlogs: async (filters: BlogExportFilters = {}): Promise<void> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString() ? `?${params.toString()}` : '';
    await ApiService.download(`/admin/blogs/export${qs}`, `blog-performance-${new Date().toISOString().split('T')[0]}.csv`);
  },
};

export default adminAPI;