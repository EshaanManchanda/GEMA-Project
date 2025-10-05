import { ApiService } from '../api';
import { extractEventData, extractEventsData, extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

const eventsAPI = {
  getAllEvents: async (params?: any) => {
    try {
      const response = await ApiService.get('/events', { params });
      logApiResponse('GET /events', response);
      return extractEventsData(response);
    } catch (error) {
      logApiResponse('GET /events', null, error);
      throw error;
    }
  },

  getEventById: async (id: string) => {
    try {
      const response = await ApiService.get(`/events/${id}`);
      logApiResponse(`GET /events/${id}`, response);
      return extractEventData(response);
    } catch (error) {
      logApiResponse(`GET /events/${id}`, null, error);
      throw error;
    }
  },

  getFeaturedEvents: async () => {
    try {
      const response = await ApiService.get('/events', { params: { limit: 50 } });
      logApiResponse('GET /events (featured)', response);
      
      const events = extractEventsData(response);
      // Filter featured events client-side since API returns all events with isFeatured field
      const featuredEvents = events.filter((event: any) => event.isFeatured === true).slice(0, 6);
      return { events: featuredEvents };
    } catch (error) {
      logApiResponse('GET /events (featured)', null, error);
      throw error;
    }
  },

  getPopularEvents: async () => {
    try {
      const response = await ApiService.get('/events', { params: { sortBy: 'viewsCount', sortOrder: 'desc', limit: 6 } });
      logApiResponse('GET /events (popular)', response);
      return extractEventsData(response);
    } catch (error) {
      logApiResponse('GET /events (popular)', null, error);
      throw error;
    }
  },

  getUpcomingEvents: async () => {
    try {
      const response = await ApiService.get('/events', { params: { sortBy: 'createdAt', sortOrder: 'desc', limit: 6 } });
      logApiResponse('GET /events (upcoming)', response);
      return extractEventsData(response);
    } catch (error) {
      logApiResponse('GET /events (upcoming)', null, error);
      throw error;
    }
  },

  getEventsByCategory: async (category: string, params?: any) => {
    try {
      const response = await ApiService.get('/events', { params: { category, ...params } });
      logApiResponse(`GET /events (category: ${category})`, response);
      return extractEventsData(response);
    } catch (error) {
      logApiResponse(`GET /events (category: ${category})`, null, error);
      throw error;
    }
  },

  searchEvents: async (searchQuery: string, params?: any) => {
    try {
      const response = await ApiService.get('/events', { params: { search: searchQuery, ...params } });
      logApiResponse(`GET /events (search: ${searchQuery})`, response);
      return extractEventsData(response);
    } catch (error) {
      logApiResponse(`GET /events (search: ${searchQuery})`, null, error);
      throw error;
    }
  },

  getEventCategories: async () => {
    try {
      const response = await ApiService.get('/events/categories');
      logApiResponse('GET /events/categories', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /events/categories', null, error);
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