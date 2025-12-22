import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import homepageAPI, { HomepageData } from '@/services/api/homepageAPI';

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
      console.log('🌐 [FRONTEND] Fetching homepage data from API...');

      const data = await homepageAPI.getHomepageData();

    

      if (import.meta.env.VITE_DEBUG === 'true') {
        if (data?.events && data.events.length > 0) {
          console.log('   - Sample Event Data:', {
            title: data.events[0].title,
            rating: data.events[0].rating,
            reviewCount: data.events[0].reviewCount,
            hasImages: data.events[0].images?.length || 0
          });
        }
      }

      // Return data or fallback - let errors propagate naturally
      return data?.data || {
        events: [],
        featuredEvents: [],
        banners: [],
        categories: [],
        featuredBlogs: [],
        stats: null
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
