import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import eventsAPI from '@/services/api/eventsAPI';
import { eventsKeys } from './queryKeys';

/**
 * Query hook for fetching all events with optional filters
 * @param params - Filter parameters (category, type, search, sortBy, etc.)
 * @returns Query result with events data, loading state, and error
 * @example
 * const { data, isLoading } = useEventsQuery({ category: 'sports', sortBy: 'date' });
 */
export function useEventsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventsKeys.list(params),
    queryFn: () => eventsAPI.getAllEvents(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for fetching a single event by ID
 * @param id - Event ID
 * @param options - Additional query options
 * @returns Query result with event data, loading state, and error
 * @example
 * const { data: event, isLoading } = useEventQuery('event-id-123');
 */
export function useEventQuery(id: string, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventsKeys.detail(id),
    queryFn: () => eventsAPI.getEventById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for fetching featured events
 * @returns Query result with featured events (max 6)
 * @example
 * const { data, isLoading } = useFeaturedEventsQuery();
 */
export function useFeaturedEventsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventsKeys.featured(),
    queryFn: () => eventsAPI.getFeaturedEvents(),
    staleTime: 10 * 60 * 1000, // 10 minutes (featured events don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Query hook for fetching popular events sorted by views
 * @returns Query result with popular events (max 6)
 * @example
 * const { data, isLoading } = usePopularEventsQuery();
 */
export function usePopularEventsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventsKeys.popular(),
    queryFn: () => eventsAPI.getPopularEvents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for fetching upcoming events
 * @returns Query result with upcoming events (max 6)
 * @example
 * const { data, isLoading } = useUpcomingEventsQuery();
 */
export function useUpcomingEventsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventsKeys.upcoming(),
    queryFn: () => eventsAPI.getUpcomingEvents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for fetching events by category
 * @param categoryId - Category ID or slug
 * @param params - Additional filter parameters
 * @returns Query result with filtered events
 * @example
 * const { data, isLoading } = useEventsByCategoryQuery('sports', { sortBy: 'date' });
 */
export function useEventsByCategoryQuery(
  categoryId: string,
  params?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: eventsKeys.byCategory(categoryId),
    queryFn: () => eventsAPI.getEventsByCategory(categoryId, params),
    enabled: !!categoryId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for searching events
 * @param searchQuery - Search query string
 * @param params - Additional filter parameters (category, type, priceRange, etc.)
 * @returns Query result with search results
 * @example
 * const { data, isLoading } = useEventsSearchQuery('coding workshop', { category: 'education' });
 */
export function useEventsSearchQuery(
  searchQuery: string,
  params?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: eventsKeys.search(searchQuery, params),
    queryFn: () => eventsAPI.searchEvents(searchQuery, params),
    enabled: true,
    staleTime: 1 * 60 * 1000, // 1 minute (search results may change quickly)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for fetching events by vendor
 * NOTE: This would require an API endpoint like /vendors/:id/events
 * Keeping for future implementation
 */
export function useEventsByVendorQuery(
  vendorId: string,
  params?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: eventsKeys.byVendor(vendorId),
    queryFn: () => eventsAPI.getAllEvents({ vendor: vendorId, ...params }),
    enabled: !!vendorId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}
