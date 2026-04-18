import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import eventsAPI from '@services/api/eventsAPI';

export function useEvents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsAPI.getEvents(params),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsAPI.getEventBySlug(id),
    enabled: !!id,
  });
}

export function useFeaturedEvents() {
  return useQuery({
    queryKey: ['events', 'featured'],
    queryFn: () => eventsAPI.getFeaturedEvents(),
  });
}

export function usePopularEvents() {
  return useQuery({
    queryKey: ['events', 'popular'],
    queryFn: () => eventsAPI.getPopularEvents(),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => eventsAPI.createEvent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      eventsAPI.updateEvent(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsAPI.deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}
