import { ApiService } from '../api';

const analyticsAPI = {
  getDashboardSummary: async () => {
    try {
      const response = await ApiService.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await ApiService.get('/analytics/events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await ApiService.get('/analytics/orders', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTicketAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await ApiService.get('/analytics/tickets', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueAnalytics: async () => {
    try {
      const response = await ApiService.get('/analytics/venues');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRevenueReport: async (params: { startDate: string; endDate: string; groupBy?: 'day' | 'month' }) => {
    try {
      const response = await ApiService.get('/analytics/revenue', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventPerformance: async (eventId: string) => {
    try {
      const response = await ApiService.get(`/analytics/events/${eventId}/performance`);
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
};

export default analyticsAPI;