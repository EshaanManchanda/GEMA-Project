import { ApiService } from '../api';

const analyticsAPI = {
  getDashboardSummary: async () => {
    try {
      const response = await ApiService.get('/insights/dashboard');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await ApiService.get('/insights/events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await ApiService.get('/insights/orders', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTicketAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await ApiService.get('/insights/tickets', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueAnalytics: async () => {
    try {
      const response = await ApiService.get('/insights/venues');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRevenueReport: async (params: { startDate: string; endDate: string; groupBy?: 'day' | 'month' }) => {
    try {
      const response = await ApiService.get('/insights/revenue', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventPerformance: async (eventId: string) => {
    try {
      const response = await ApiService.get(`/insights/events/${eventId}/performance`);
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
};

export default analyticsAPI;