import { ApiService } from '../api';
import logger from '@/utils/logger';
import { Event } from '@/types/event';
import { Blog } from '@/types/blog';
import { Banner } from './bannerAPI';
import { Reel } from './reelsAPI';
import { SEOContent } from './seoContentAPI';
import { ITeachingEvent } from '@/types/teacher';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  eventCount: number;
  sortOrder: number;
}

export interface Collection {
  _id: string;
  title: string;
  description: string;
  slug: string;
  iconAsset?: {
    url: string;
    thumbnailUrl?: string;
  };
  featuredImageAsset?: {
    url: string;
    thumbnailUrl?: string;
  };
  count: string;
  category?: string;
  sortOrder: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  events: Event[];
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

export interface HomepageVenue {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  coordinates?: { lat: number; lng: number };
  venueType: string;
  capacity: number;
  facilities: string[];
  amenities?: string[];
  images?: string[];
  averageRating?: number;
  totalEvents: number;
  isAffiliateVenue: boolean;
  externalBookingLink?: string;
}

export interface HomepageData {
  events: Event[];
  featuredEvents: Event[];
  banners: Banner[];
  categories: Category[];
  featuredBlogs: Blog[];
  reels: Reel[];
  stats: PublicStats;
  seoContent: SEOContent | null;
  collections: Collection[];
  teachingEvents: ITeachingEvent[];
  venues: HomepageVenue[];
}

const homepageAPI = {
  /**
   * Get all homepage data in single API call
   * Returns: events, featured events, banners, categories, blogs, stats
   * Cached on backend for 5 minutes
   */
  getHomepageData: async (): Promise<HomepageData> => {
    try {
      const response = await ApiService.get<HomepageData>('/homepage');

      logger.debug('🔍 [HOMEPAGE API] Raw response:', response);
      logger.debug('🔍 [HOMEPAGE API] Data path:', response.data);

      return response.data;
    } catch (error) {
      logger.error('❌ [HOMEPAGE API] Error:', error);
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
