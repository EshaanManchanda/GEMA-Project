import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import teacherAPI from '@services/api/teacherAPI';

export function useTeacherDashboard() {
  return useQuery({
    queryKey: ['teachers', 'dashboard'],
    queryFn: () => teacherAPI.getDashboardStats(),
  });
}

export function useTeacherProfile() {
  return useQuery({
    queryKey: ['teachers', 'profile'],
    queryFn: () => teacherAPI.getProfile(),
  });
}

export function usePublicTeachers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['teachers', 'public', params],
    queryFn: () => teacherAPI.getPublicTeachersList(params as any),
  });
}

export function usePublicTeacherProfile(id: string) {
  return useQuery({
    queryKey: ['teachers', 'public', id],
    queryFn: () => teacherAPI.getPublicProfile(id),
    enabled: !!id,
  });
}

export function useTeachingEvents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['teachers', 'events', params],
    queryFn: () => teacherAPI.getTeachingEvents(params as any),
  });
}

export function useTeacherBookings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['teachers', 'bookings', params],
    queryFn: () => teacherAPI.getBookings(params as any),
  });
}

export function useTeacherEarnings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['teachers', 'earnings', params],
    queryFn: () => teacherAPI.getEarnings(params as any),
  });
}

export function useUpdateTeacherProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => teacherAPI.updateProfile(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers', 'profile'] }),
  });
}

export function useCreateTeachingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => teacherAPI.createTeachingEvent(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers', 'events'] }),
  });
}

export function useUpdateTeachingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      teacherAPI.updateTeachingEvent(id, data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers', 'events'] }),
  });
}

export function useDeleteTeachingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teacherAPI.deleteTeachingEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers', 'events'] }),
  });
}

export function useUpdateTeacherBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      teacherAPI.updateBooking(id, data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers', 'bookings'] }),
  });
}
