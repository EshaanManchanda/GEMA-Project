import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import homepageAPI, { HomepageData } from '@/services/api/homepageAPI';
import logger from '@/utils/logger';

/**
 * Query hook for fetching all homepage data in single API call
 * Returns: events, featuredEvents, banners, categories, featuredBlogs, stats
 * Backend caches response for 5 minutes
 *
 * @example
 * const { data, isLoading, error } = useHomepageQuery();
 * if (data) {
 *   const { events, featuredEvents, banners, categories, featuredBlogs, stats } = data;
 * }
 */
export function useHomepageQuery(options?: Omit<UseQueryOptions<HomepageData>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['homepage'] as const,
    queryFn: async () => {
      // TEMPORARY: Unconditional logging to debug
      logger.debug('🌐 [FRONTEND] Fetching homepage data from API...');

      const data = await homepageAPI.getHomepageData();



      if (import.meta.env.VITE_DEBUG === 'true') {
        if (data?.events && data.events.length > 0) {
          logger.debug('   - Sample Event Data:', {
            title: data.events[0].title,
            rating: (data.events[0] as any).rating,
            reviewCount: (data.events[0] as any).reviewCount,
            hasImages: data.events[0].images?.length || 0
          });
        }
      }

      // Return data or fallback - let errors propagate naturally
      return data || {
        events: [],
        featuredEvents: [],
        banners: [],
        categories: [],
        featuredBlogs: [],
        reels: [],
        stats: {
          totalEvents: 0,
          totalVendors: 0,
          totalVenues: 0,
          totalReviews: 0,
          totalBookings: 0,
          totalCategories: 0,
          totalCities: 0,
          averageRating: 0,
          topCategories: [],
          topCities: []
        },
        seoContent: null,
        collections: [],
        teachingEvents: [],
        venues: []
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (longer since backend caches)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once for homepage data
    refetchOnWindowFocus: false, // Don't refetch on window focus for homepage
    throwOnError: false, // Don't throw errors, just set error state
    ...options,
  });
}
