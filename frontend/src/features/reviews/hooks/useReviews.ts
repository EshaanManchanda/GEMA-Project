import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import reviewsAPI from '@services/api/reviewsAPI';

export function useReviews(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: () => reviewsAPI.getReviews(params as any),
  });
}

export function useReview(id: string) {
  return useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsAPI.getReviewById(id),
    enabled: !!id,
  });
}

export function useEventReviews(eventId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['reviews', 'event', eventId, params],
    queryFn: () => reviewsAPI.getEventReviews(eventId, params as any),
    enabled: !!eventId,
  });
}

export function useFeaturedReviews(limit?: number) {
  return useQuery({
    queryKey: ['reviews', 'featured'],
    queryFn: () => reviewsAPI.getFeaturedReviews(limit),
  });
}

export function useUserReviews(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['reviews', 'user', params],
    queryFn: () => reviewsAPI.getUserReviews(params as any),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => reviewsAPI.createReview(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      reviewsAPI.updateReview(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['reviews', id] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewsAPI.deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useFlagReview() {
  return useMutation({
    mutationFn: ({ id, reason, description }: { id: string; reason: string; description?: string }) =>
      reviewsAPI.flagReview(id, reason, description),
  });
}

export function useMarkReviewHelpful() {
  return useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      reviewsAPI.markReviewHelpful(id, helpful),
  });
}
