import { ApiService } from '../api';

const searchAPI = {
  search: async (query: string, filters?: any) => {
    try {
      const response = await ApiService.get('/search', {
        params: {
          q: query,
          ...filters,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  searchEvents: async (query: string, filters?: any) => {
    try {
      const response = await ApiService.get('/search/events', {
        params: {
          q: query,
          ...filters,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  searchVendors: async (query: string, filters?: any) => {
    try {
      const response = await ApiService.get('/search/vendors', {
        params: {
          q: query,
          ...filters,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  searchCategories: async (query: string) => {
    try {
      const response = await ApiService.get('/search/categories', {
        params: {
          q: query,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSearchSuggestions: async (query: string) => {
    try {
      const response = await ApiService.get('/search/suggestions', {
        params: {
          q: query,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default searchAPI;