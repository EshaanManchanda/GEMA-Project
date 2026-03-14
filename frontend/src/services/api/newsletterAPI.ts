import { ApiService } from '../api';

interface SubscribeData {
  email: string;
  name: string;
  ageOfChildren?: string;
  city?: string;
  source?: string;
  tags?: string[];
  preferences?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    categories?: string[];
    receivePromotions?: boolean;
  };
}

interface UpdatePreferencesData {
  frequency?: 'daily' | 'weekly' | 'monthly';
  categories?: string[];
  receivePromotions?: boolean;
  name?: string;
  city?: string;
  ageOfChildren?: string;
}

const newsletterAPI = {
  subscribe: async (data: SubscribeData) => {
    try {
      const response = await ApiService.post('/newsletter/subscribe', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  unsubscribeByToken: async (token: string, reason?: string) => {
    try {
      const response = await ApiService.get(`/newsletter/unsubscribe/${token}`, {
        params: reason ? { reason } : undefined
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getSubscriptionStatus: async () => {
    try {
      const response = await ApiService.get('/newsletter/status');
      return response;
    } catch (error) {
      throw error;
    }
  },

  updatePreferences: async (data: UpdatePreferencesData) => {
    try {
      const response = await ApiService.put('/newsletter/preferences', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  unsubscribe: async (reason?: string) => {
    try {
      const response = await ApiService.post('/newsletter/unsubscribe', { reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Admin methods
  admin: {
    getSubscribers: async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: string;
      source?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      try {
        const response = await ApiService.get('/newsletter/admin/subscribers', { params });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    getStats: async () => {
      try {
        const response = await ApiService.get('/newsletter/admin/stats');
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  }
};

export default newsletterAPI;
