import { ApiService } from '../api';

const eventsAPI = {
  getAllEvents: async (params?: any) => {
    try {
      const response = await ApiService.get('/events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventById: async (id: string) => {
    try {
      const response = await ApiService.get(`/events/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFeaturedEvents: async () => {
    try {
      const response = await ApiService.get('/events', { params: { featured: 'true', limit: 6 } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPopularEvents: async () => {
    try {
      const response = await ApiService.get('/events', { params: { sortBy: 'viewsCount', sortOrder: 'desc', limit: 6 } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUpcomingEvents: async () => {
    try {
      const response = await ApiService.get('/events', { params: { sortBy: 'createdAt', sortOrder: 'desc', limit: 6 } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventsByCategory: async (category: string, params?: any) => {
    try {
      const response = await ApiService.get('/events', { params: { category, ...params } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  searchEvents: async (searchQuery: string, params?: any) => {
    try {
      const response = await ApiService.get('/events', { params: { search: searchQuery, ...params } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventCategories: async () => {
    try {
      const response = await ApiService.get('/events/categories');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createEvent: async (eventData: any) => {
    try {
      const response = await ApiService.post('/events', eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateEvent: async (id: string, eventData: any) => {
    try {
      const response = await ApiService.put(`/events/${id}`, eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteEvent: async (id: string) => {
    try {
      const response = await ApiService.delete(`/events/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventsByFilter: async (filters: any) => {
    try {
      const response = await ApiService.get('/events', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Vendor routes (require authentication)
  getVendorEvents: async (params?: any) => {
    try {
      const response = await ApiService.get('/events/vendor/my-events', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVendorAnalytics: async () => {
    try {
      const response = await ApiService.get('/events/vendor/analytics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default eventsAPI;