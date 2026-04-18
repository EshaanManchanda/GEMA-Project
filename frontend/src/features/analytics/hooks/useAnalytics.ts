import { useQuery, useMutation } from '@tanstack/react-query';
import analyticsAPI from '@services/api/analyticsAPI';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsAPI.getDashboardSummary(),
  });
}

export function useEventAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['analytics', 'events', params],
    queryFn: () => analyticsAPI.getEventAnalytics(params as any),
  });
}

export function useOrderAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['analytics', 'orders', params],
    queryFn: () => analyticsAPI.getOrderAnalytics(params as any),
  });
}

export function useTicketAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['analytics', 'tickets', params],
    queryFn: () => analyticsAPI.getTicketAnalytics(params as any),
  });
}

export function useVenueAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'venues'],
    queryFn: () => analyticsAPI.getVenueAnalytics(),
  });
}

export function useRevenueReport(params: { startDate: string; endDate: string; groupBy?: string }) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: () => analyticsAPI.getRevenueReport(params as any),
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function useEventPerformance(eventId: string) {
  return useQuery({
    queryKey: ['analytics', 'events', eventId, 'performance'],
    queryFn: () => analyticsAPI.getEventPerformance(eventId),
    enabled: !!eventId,
  });
}

export function useExportAnalytics() {
  return useMutation({
    mutationFn: (params: { type: string; startDate?: string; endDate?: string; format?: 'json' | 'csv' }) =>
      analyticsAPI.exportAnalytics(params),
  });
}
