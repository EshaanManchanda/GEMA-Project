import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import seoContentAPI, { SEOContent } from '@/services/api/seoContentAPI';

/**
 * Query keys for SEO content
 */
export const seoContentKeys = {
  all: ['seoContent'] as const,
  public: (page: string) => [...seoContentKeys.all, 'public', page] as const,
  admin: {
    all: () => [...seoContentKeys.all, 'admin'] as const,
    list: (params?: any) => [...seoContentKeys.admin.all(), 'list', params] as const,
    detail: (page: string) => [...seoContentKeys.admin.all(), 'detail', page] as const,
  }
};

/**
 * Query hook for fetching public SEO content
 * @param page - Page name (homepage, about, contact)
 * @example
 * const { data: seoContent } = usePublicSEOContentQuery('homepage');
 */
export function usePublicSEOContentQuery(
  page: string,
  options?: Omit<UseQueryOptions<{ seoContent: SEOContent }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: seoContentKeys.public(page),
    queryFn: () => seoContentAPI.getPublicSEOContent(page),
    staleTime: 10 * 60 * 1000, // 10 minutes (SEO content doesn't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // Don't retry if SEO content doesn't exist yet
    ...options,
  });
}

/**
 * Query hook for fetching all SEO content (admin)
 * @param params - Optional query parameters
 * @example
 * const { data } = useAdminSEOContentQuery({ search: 'homepage' });
 */
export function useAdminSEOContentQuery(
  params?: { search?: string; page?: number; limit?: number },
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: seoContentKeys.admin.list(params),
    queryFn: () => seoContentAPI.admin.getAllSEOContent(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * Query hook for fetching SEO content by page (admin)
 * @param page - Page name
 * @example
 * const { data: seoContent } = useAdminSEOContentDetailQuery('homepage');
 */
export function useAdminSEOContentDetailQuery(
  page: string,
  options?: Omit<UseQueryOptions<SEOContent>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: seoContentKeys.admin.detail(page),
    queryFn: () => seoContentAPI.admin.getSEOContent(page),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}
