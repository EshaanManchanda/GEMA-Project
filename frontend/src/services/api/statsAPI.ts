import api from '../api';

export interface PublicStats {
  totalEvents: number;
  totalVendors: number;
  totalVenues: number;
  totalReviews: number;
}

const statsAPI = {
  /**
   * Get public statistics for homepage
   * @returns Promise<PublicStats>
   */
  getPublicStats: async (): Promise<PublicStats> => {
    const response = await api.get('/stats');
    return response.data.data;
  }
};

export default statsAPI;
