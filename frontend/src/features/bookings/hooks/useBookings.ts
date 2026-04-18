import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bookingAPI from '@services/api/bookingAPI';

export function useBookings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingAPI.getUserBookings(params),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => bookingAPI.getBookingById(id),
    enabled: !!id,
  });
}

export function useBookingStats() {
  return useQuery({
    queryKey: ['bookings', 'stats'],
    queryFn: () => bookingAPI.getBookingStats(),
  });
}

export function useInitiateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => bookingAPI.initiateBooking(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useConfirmBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => bookingAPI.confirmBooking(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingAPI.cancelBooking(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['bookings', id] });
    },
  });
}
