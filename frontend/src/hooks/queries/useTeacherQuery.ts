import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import teacherAPI from '@/services/api/teacherAPI';
import { teacherKeys, teachersKeys } from './queryKeys';
import type {
  TeacherDashboardStats,
  TeacherEarnings,
  TeacherBookingFilters,
  TeachingEventFilters,
  ITeacher,
  ITeachingEvent,
  ITeacherBooking,
} from '@/types/teacher';

// ============================================
// Teacher Dashboard & Analytics
// ============================================

/**
 * Query hook for teacher dashboard stats
 * @example
 * const { data: stats, isLoading } = useTeacherDashboardStats();
 */
export function useTeacherDashboardStats(
  params?: { startDate?: string; endDate?: string },
  options?: Omit<UseQueryOptions<TeacherDashboardStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...teacherKeys.analytics.dashboard(), params],
    queryFn: () => teacherAPI.getDashboardStats(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for teacher earnings breakdown
 * @param params - Date range filters
 */
export function useTeacherEarnings(
  params?: { startDate?: string; endDate?: string },
  options?: Omit<UseQueryOptions<TeacherEarnings>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.analytics.earnings(params),
    queryFn: () => teacherAPI.getEarnings(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Teacher Profile
// ============================================

/**
 * Query hook for current teacher's profile
 * @example
 * const { data: profile, isLoading } = useTeacherProfile();
 */
export function useTeacherProfile(
  options?: Omit<UseQueryOptions<{ teacher: ITeacher; user: any }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.profile.current(),
    queryFn: () => teacherAPI.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Query hook for public teacher profile by ID
 * @param teacherId - Teacher ID
 */
export function usePublicTeacherProfile(
  teacherId: string,
  options?: Omit<UseQueryOptions<{ user: any; teacher: ITeacher; teachingEvents: ITeachingEvent[]; stats: any }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.profile.public(teacherId),
    queryFn: () => teacherAPI.getPublicProfile(teacherId),
    enabled: !!teacherId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// ============================================
// Teaching Events
// ============================================

/**
 * Query hook for teacher's teaching events list
 * @param params - Filter parameters
 */
export function useTeacherTeachingEvents(
  params?: TeachingEventFilters,
  options?: Omit<UseQueryOptions<{ teachingEvents: ITeachingEvent[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.events.list(params),
    queryFn: () => teacherAPI.getTeachingEvents(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for single teaching event
 * @param id - Teaching event ID
 */
export function useTeacherTeachingEvent(
  id: string,
  options?: Omit<UseQueryOptions<{ teachingEvent: ITeachingEvent }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.events.detail(id),
    queryFn: () => teacherAPI.getTeachingEventById(id),
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================
// Teacher Bookings
// ============================================

/**
 * Query hook for teacher's bookings list
 * @param params - Filter parameters
 */
export function useTeacherBookings(
  params?: TeacherBookingFilters,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.bookings.list(params),
    queryFn: () => teacherAPI.getBookings(params),
    staleTime: 30 * 1000, // 30 seconds (bookings change frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Query hook for single booking
 * @param id - Booking ID
 */
export function useTeacherBooking(
  id: string,
  options?: Omit<UseQueryOptions<{ Booking: ITeacherBooking }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.bookings.detail(id),
    queryFn: () => teacherAPI.getBookingById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================
// Payouts
// ============================================

/**
 * Query hook for payout dashboard
 */
export function useTeacherPayoutDashboard(
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.payouts.dashboard(),
    queryFn: () => teacherAPI.getPayoutDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Query hook for payout history
 * @param params - Filter parameters
 */
export function useTeacherPayoutHistory(
  params?: { page?: number; limit?: number; status?: string },
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.payouts.list(params),
    queryFn: () => teacherAPI.getPayoutHistory(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================
// Stripe Connect
// ============================================

/**
 * Query hook for Stripe Connect status
 */
export function useTeacherStripeConnectStatus(
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.stripeConnect(),
    queryFn: () => teacherAPI.getStripeConnectStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Subscription
// ============================================

/**
 * Query hook for subscription status
 */
export function useTeacherSubscription(
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teacherKeys.subscription(),
    queryFn: () => teacherAPI.getSubscriptionStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================
// Public Teachers List (for browsing)
// ============================================

/**
 * Query hook for browsing public teachers
 * @param params - Filter parameters
 */
export function useTeachersList(
  params?: {
    search?: string;
    subjects?: string[];
    teachingMode?: string;
    city?: string;
    minRating?: number;
    page?: number;
    limit?: number;
  },
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: teachersKeys.list(params),
    queryFn: async () => {
      // This would call a public teachers endpoint
      // For now, return empty array
      return { teachers: [], total: 0, page: 1, totalPages: 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}
