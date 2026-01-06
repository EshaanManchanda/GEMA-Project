import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import vendorAPI from '@/services/api/vendorAPI';

/**
 * Query keys for vendor-related queries
 */
export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (params?: any) => [...vendorKeys.lists(), params] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  public: (id: string) => [...vendorKeys.all, 'public', id] as const,
};

/**
 * Query hook for fetching all public vendors with pagination
 * @param params - Filter parameters (search, page, limit, sortBy, sortOrder)
 * @example
 * const { data, isLoading } = useVendorsQuery({ search: 'party', page: 1, limit: 12 });
 */
export function useVendorsQuery(
  params?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: vendorKeys.list(params),
    queryFn: () => vendorAPI.getAllVendors(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cache time)
    ...options,
  });
}

/**
 * Query hook for fetching public vendor profile by ID
 * @param id - Vendor ID
 * @example
 * const { data: vendor } = usePublicVendorQuery('507f1f77bcf86cd799439011');
 */
export function usePublicVendorQuery(
  id: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: vendorKeys.public(id),
    queryFn: () => vendorAPI.getPublicVendorProfile(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}
