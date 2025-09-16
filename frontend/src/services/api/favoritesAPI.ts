import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

const favoritesAPI = {
  // Get user's favorite events
  getFavoriteEvents: async () => {
    try {
      const response = await ApiService.get('/favorites');
      logApiResponse('GET /favorites', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /favorites', null, error);
      throw error;
    }
  },

  // Add event to favorites
  addToFavorites: async (eventId: string) => {
    try {
      const response = await ApiService.post(`/favorites/${eventId}`);
      logApiResponse(`POST /favorites/${eventId}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`POST /favorites/${eventId}`, null, error);
      throw error;
    }
  },

  // Remove event from favorites
  removeFromFavorites: async (eventId: string) => {
    try {
      const response = await ApiService.delete(`/favorites/${eventId}`);
      logApiResponse(`DELETE /favorites/${eventId}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /favorites/${eventId}`, null, error);
      throw error;
    }
  },

  // Check if event is in favorites
  checkIfFavorite: async (eventId: string) => {
    try {
      const response = await ApiService.get(`/favorites/check/${eventId}`);
      logApiResponse(`GET /favorites/check/${eventId}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /favorites/check/${eventId}`, null, error);
      throw error;
    }
  },

  // Legacy method names for backward compatibility
  getUserFavorites: async () => {
    return favoritesAPI.getFavoriteEvents();
  },

  checkIsFavorite: async (eventId: string) => {
    return favoritesAPI.checkIfFavorite(eventId);
  },
};

export default favoritesAPI;