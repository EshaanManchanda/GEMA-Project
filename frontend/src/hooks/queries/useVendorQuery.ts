import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import vendorAPI from '@/services/api/vendorAPI';
import { vendorKeys, vendorsKeys } from './queryKeys';

// ============================================
// Public Vendors List
// ============================================

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
    queryKey: vendorsKeys.list(params),
    queryFn: () => vendorAPI.getAllVendors(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cache time)
    ...options,
  });
}

// ============================================
// Vendor Dashboard & Analytics
// ============================================

/**
 * Query hook for vendor stats
 * @example
 * const { data: stats, isLoading } = useVendorStatsQuery();
 */
export function useVendorStatsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: vendorKeys.analytics.dashboard(),
    queryFn: () => vendorAPI.getVendorStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================
// Vendor Events
// ============================================

/**
 * Query hook for vendor's events list
 * @param params - Filter parameters
 * @example
 * const { data, isLoading } = useVendorEventsQuery({ status: 'active' });
 */
export function useVendorEventsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: vendorKeys.events.list(params),
    queryFn: () => vendorAPI.getVendorEvents(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for single vendor event
 * @param id - Event ID
 */
export function useVendorEventQuery(id: string, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: vendorKeys.events.detail(id),
    queryFn: () => vendorAPI.getVendorEventById(id),
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================
// Vendor Bookings
// ============================================

/**
 * Query hook for vendor bookings list
 * @param params - Filter parameters (status, date, event, etc.)
 * @example
 * const { data: bookings, isLoading } = useVendorBookingsQuery({ status: 'confirmed' });
 */
export function useVendorBookingsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: vendorKeys.bookings.list(params),
    queryFn: () => vendorAPI.getVendorBookings(params),
    staleTime: 30 * 1000, // 30 seconds (bookings change frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for single vendor booking
 * @param id - Booking ID
 */
export function useVendorBookingQuery(id: string, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: vendorKeys.bookings.detail(id),
    queryFn: () => vendorAPI.getVendorBookingById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================
// Vendor Profile
// ============================================

/**
 * Query hook for vendor profile
 * @example
 * const { data: profile, isLoading } = useVendorProfileQuery();
 */
export function useVendorProfileQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'profile'] as const,
    queryFn: () => vendorAPI.getVendorProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for public vendor profile (by ID)
 * @param vendorId - Vendor ID
 */
export function usePublicVendorProfileQuery(
  vendorId: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'public', vendorId] as const,
    queryFn: () => vendorAPI.getPublicVendorProfile(vendorId),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000, // 10 minutes (public profiles don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Alias for usePublicVendorProfileQuery for backward compatibility
 */
export function usePublicVendorQuery(
  id: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return usePublicVendorProfileQuery(id, options);
}

// ============================================
// Vendor Payouts
// ============================================

/**
 * Query hook for vendor payouts
 * @param params - Filter parameters
 */
export function useVendorPayoutsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: vendorKeys.payouts.list(params),
    queryFn: () => vendorAPI.getVendorPaymentInfo(params?.vendorId || ''),
    enabled: !!params?.vendorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for Stripe Connect status
 */
export function useStripeConnectStatusQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'stripe-connect'] as const,
    queryFn: () => vendorAPI.getStripeConnectStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Vendor Employees
// ============================================

/**
 * Query hook for vendor employees list
 * @param params - Filter parameters
 */
export function useVendorEmployeesQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'employees', 'list', params || {}] as const,
    queryFn: () => vendorAPI.getVendorEmployees(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for single vendor employee
 * @param id - Employee ID
 */
export function useVendorEmployeeQuery(id: string, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'employees', 'detail', id] as const,
    queryFn: () => vendorAPI.getVendorEmployeeById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Vendor Documents
// ============================================

/**
 * Query hook for vendor documents
 */
export function useVendorDocumentsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'documents'] as const,
    queryFn: () => vendorAPI.getVendorDocuments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}
