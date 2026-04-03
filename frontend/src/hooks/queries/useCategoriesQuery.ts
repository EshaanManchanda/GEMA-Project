import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import categoriesAPI from '@/services/api/categoriesAPI';
import statsAPI from '@/services/api/statsAPI';
import { categoriesKeys } from './queryKeys';

/**
 * Query hook for fetching all categories
 * @param params - Optional parameters (tree, etc.)
 * @example
 * const { data: categories } = useCategoriesQuery({ tree: false });
 */
export function useCategoriesQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: categoriesKeys.list(params),
    queryFn: () => categoriesAPI.getAllCategories(params),
    staleTime: 10 * 60 * 1000, // 10 minutes (categories don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Query hook for fetching public stats
 * @example
 * const { data: stats } = usePublicStatsQuery();
 */
export function usePublicStatsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['stats', 'public'] as const,
    queryFn: () => statsAPI.getPublicStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}
