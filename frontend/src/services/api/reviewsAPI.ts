import { ApiService } from '../api';

const reviewsAPI = {
  getReviews: async (params?: { type?: string; targetId?: string; rating?: number; verified?: boolean; page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/reviews', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFeaturedReviews: async (limit: number = 10) => {
    try {
      const response = await ApiService.get('/reviews', { 
        params: {
          rating: 5, // Only 5-star reviews
          verified: true, // Only verified reviews
          limit,
          page: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventReviews: async (eventId: string, params?: { rating?: number; verified?: boolean; page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/reviews', { 
        params: {
          type: 'event',
          targetId: eventId,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVendorReviews: async (vendorId: string, params?: { rating?: number; verified?: boolean; page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/reviews', { 
        params: {
          type: 'vendor',
          targetId: vendorId,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createReview: async (reviewData: {
    type: 'event' | 'vendor' | 'venue';
    eventId?: string;
    vendorId?: string;
    venueId?: string;
    rating: number;
    title: string;
    comment: string;
    pros?: string[];
    cons?: string[];
  }) => {
    try {
      const response = await ApiService.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getReviewById: async (id: string) => {
    try {
      const response = await ApiService.get(`/reviews/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateReview: async (id: string, reviewData: any) => {
    try {
      const response = await ApiService.put(`/reviews/${id}`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteReview: async (id: string) => {
    try {
      const response = await ApiService.delete(`/reviews/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  markReviewHelpful: async (id: string, helpful: boolean) => {
    try {
      const response = await ApiService.post(`/reviews/${id}/helpful`, { helpful });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  flagReview: async (id: string, reason: string, description?: string) => {
    try {
      const response = await ApiService.post(`/reviews/${id}/flag`, { reason, description });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default reviewsAPI;