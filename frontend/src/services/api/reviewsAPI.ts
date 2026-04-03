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

  /**
   * Get reviews for an event
   * @param eventId - The MongoDB ObjectId of the event (not the slug)
   */
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
    targetId: string;
    rating: number;
    title?: string;
    comment?: string;
    orderId?: string;
    pros?: string[];
    cons?: string[];
    media?: string[];
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

  // Google Maps Integration
  getGoogleReviews: async (eventId: string) => {
    try {
      const response = await ApiService.get(`/reviews/google/${eventId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Get current user's reviews
  getUserReviews: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/reviews/my-reviews', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get pending reviews
  getPendingReviews: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/reviews/admin/pending', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Moderate reviews (approve/reject/hide)
  moderateReview: async (reviewId: string, status: 'approved' | 'rejected' | 'hidden', notes?: string) => {
    try {
      const response = await ApiService.put(`/reviews/admin/${reviewId}/moderate`, { status, notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin/Vendor: Respond to review
  respondToReview: async (reviewId: string, message: string) => {
    try {
      const response = await ApiService.post(`/reviews/${reviewId}/respond`, { message });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default reviewsAPI;