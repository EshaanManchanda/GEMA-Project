import { ApiService } from '../api';
import { Event } from '@/types/event';
import { Blog } from '@/types/blog';
import { Banner } from './bannerAPI';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  eventCount: number;
  sortOrder: number;
}

export interface PublicStats {
  totalEvents: number;
  totalVendors: number;
  totalVenues: number;
  totalReviews: number;
  totalBookings: number;
  totalCategories: number;
  totalCities: number;
  averageRating: number;
  topCategories: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
}

export interface HomepageData {
  events: Event[];
  featuredEvents: Event[];
  banners: Banner[];
  categories: Category[];
  featuredBlogs: Blog[];
  stats: PublicStats;
}

const homepageAPI = {
  /**
   * Get all homepage data in single API call
   * Returns: events, featured events, banners, categories, blogs, stats
   * Cached on backend for 5 minutes
   */
  getHomepageData: async (): Promise<HomepageData> => {
    try {
      const response = await ApiService.get('/homepage');

      // if (import.meta.env.VITE_DEBUG === 'true') {
        console.log('🔍 [HOMEPAGE API] Raw response:', response);
        console.log('🔍 [HOMEPAGE API] Data path:', response.data);
      // }
      return response;
    } catch (error) {
      console.error('❌ [HOMEPAGE API] Error:', error);
      throw error;
    }
  },

  /**
   * Invalidate homepage cache (admin only)
   * Forces backend to refresh cached homepage data
   */
  invalidateCache: async (): Promise<void> => {
    await ApiService.post('/homepage/invalidate-cache');
  }
};

export default homepageAPI;
