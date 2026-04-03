import { ApiService } from '../api';

const settingsAPI = {
  /**
   * Get social media settings (public endpoint - no authentication required)
   */
  getSocialSettings: async () => {
    try {
      const response = await ApiService.get('/public/settings/social');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get UI settings (public endpoint - animationsEnabled, etc.)
   */
  getUISettings: async () => {
    try {
      const response = await ApiService.get('/public/settings/ui');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default settingsAPI;
