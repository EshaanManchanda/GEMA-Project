import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import adminAPI from '@/services/api/adminAPI';
import { adminKeys } from './queryKeys';

// ============================================
// Dashboard & Analytics
// ============================================

/**
 * Query hook for admin dashboard stats
 * @returns Dashboard statistics (users, events, revenue, etc.)
 * @example
 * const { data: stats, isLoading } = useAdminDashboardQuery();
 */
export function useAdminDashboardQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.analytics.dashboard(),
    queryFn: () => adminAPI.getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for revenue analytics
 * @param dateRange - Optional date range filter
 */
export function useRevenueAnalyticsQuery(
  dateRange?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.analytics.revenue(dateRange),
    queryFn: () => adminAPI.getRevenueAnalytics(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for event analytics
 * @param dateRange - Optional date range filter
 */
export function useEventAnalyticsQuery(
  dateRange?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.analytics.events(dateRange),
    queryFn: () => adminAPI.getEventAnalytics(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for user analytics
 * @param dateRange - Optional date range filter
 */
export function useUserAnalyticsQuery(
  dateRange?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.analytics.users(dateRange),
    queryFn: () => adminAPI.getUserAnalytics(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Events Management
// ============================================

/**
 * Query hook for admin teaching events list
 * @param params - Filter parameters (status, category, teacher, etc.)
 * @example
 * const { data, isLoading } = useAdminTeachingEventsQuery({ status: 'pending' });
 */
export function useAdminTeachingEventsQuery(
  params?: any,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.teachingEvents.list(params),
    queryFn: () => adminAPI.getAllTeachingEvents(params),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Query hook for admin events list
 */
export function useAdminEventsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.events.list(params),
    queryFn: () => adminAPI.getEvents(params),
    staleTime: 1 * 60 * 1000, // 1 minute (admin data changes frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for pending events (awaiting approval)
 * @example
 * const { data: pendingEvents, isLoading } = useAdminPendingEventsQuery();
 */
export function useAdminPendingEventsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.events.pending(),
    queryFn: () => adminAPI.getEvents({ isApproved: false }),
    staleTime: 30 * 1000, // 30 seconds (pending events need fast updates)
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Query hook for event stats
 * @example
 * const { data: eventStats } = useEventStatsQuery();
 */
export function useEventStatsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...adminKeys.events.all(), 'stats'] as const,
    queryFn: () => adminAPI.getEventStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Users Management
// ============================================

/**
 * Query hook for admin users list
 * @param params - Filter parameters (role, status, search, etc.)
 * @example
 * const { data, isLoading } = useAdminUsersQuery({ role: 'vendor' });
 */
export function useAdminUsersQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.users.list(params),
    queryFn: () => adminAPI.getAllUsers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for single user details
 * @param userId - User ID
 */
export function useAdminUserQuery(userId: string, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.users.detail(userId),
    queryFn: () => adminAPI.getUserById(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for user stats
 */
export function useUserStatsQuery(options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...adminKeys.users.all(), 'stats'] as const,
    queryFn: () => adminAPI.getUserStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Vendors Management
// ============================================

/**
 * Query hook for vendors list
 * @param params - Filter parameters
 */
export function useAdminVendorsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.vendors.list(params),
    queryFn: () => adminAPI.getVendorsList(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================
// Orders Management
// ============================================

/**
 * Query hook for admin orders list
 * @param params - Filter parameters (status, date, etc.)
 */
export function useAdminOrdersQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.orders.list(params),
    queryFn: () => adminAPI.getAllOrders(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for order analytics
 * @param params - Date range and filter parameters
 */
export function useOrderAnalyticsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...adminKeys.orders.all(), 'analytics', params || {}] as const,
    queryFn: () => adminAPI.getOrderAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Payouts Management
// ============================================

/**
 * Query hook for payout requests
 * @param params - Filter parameters (status, vendor, etc.)
 */
export function useAdminPayoutsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: adminKeys.payouts.list(params),
    queryFn: () => adminAPI.getPayoutRequests(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for payout stats
 * @param params - Date range and filter parameters
 */
export function usePayoutStatsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...adminKeys.payouts.all(), 'stats', params || {}] as const,
    queryFn: () => adminAPI.getPayoutStats(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for payout analytics
 * @param params - Date range and filter parameters
 */
export function usePayoutAnalyticsQuery(params?: any, options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: [...adminKeys.payouts.all(), 'analytics', params || {}] as const,
    queryFn: () => adminAPI.getPayoutAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}
