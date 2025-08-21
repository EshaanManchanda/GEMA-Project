import { ApiService } from '../api';

const adminAPI = {
  // Dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await ApiService.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User management
  getAllUsers: async (params?: any) => {
    try {
      const response = await ApiService.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createUser: async (userData: any) => {
    try {
      const response = await ApiService.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (id: string, userData: any) => {
    try {
      const response = await ApiService.put(`/admin/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    try {
      const response = await ApiService.delete(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserStatus: async (id: string, status: string) => {
    try {
      const response = await ApiService.patch(`/admin/users/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserRole: async (id: string, role: string) => {
    try {
      const response = await ApiService.patch(`/admin/users/${id}/role`, { role });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  bulkUpdateUsers: async (userIds: string[], updateData: any) => {
    try {
      const response = await ApiService.patch('/admin/users/bulk', { userIds, updateData });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserStats: async () => {
    try {
      const response = await ApiService.get('/admin/users/stats');
      return response.data;
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
      const response = await ApiService.get('/admin/orders', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderById: async (id: string) => {
    try {
      const response = await ApiService.get(`/admin/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateOrderStatus: async (id: string, status: string) => {
    try {
      const response = await ApiService.put(`/admin/orders/${id}/status`, { status });
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

  getOrderAnalytics: async (params?: any) => {
    try {
      const response = await ApiService.get('/analytics/orders', { params });
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
};

export default adminAPI;