import { ApiService } from '../api';

const favoritesAPI = {
  getUserFavorites: async () => {
    try {
      const response = await ApiService.get('/favorites');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addToFavorites: async (eventId: string) => {
    try {
      const response = await ApiService.post('/favorites', { eventId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  removeFromFavorites: async (eventId: string) => {
    try {
      const response = await ApiService.delete(`/favorites/${eventId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  checkIsFavorite: async (eventId: string) => {
    try {
      const response = await ApiService.get(`/favorites/check/${eventId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default favoritesAPI;