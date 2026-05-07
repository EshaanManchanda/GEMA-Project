import { useQuery } from '@tanstack/react-query';
import { ApiService } from '@/services/api';

interface ReviewStatus {
  hasBooked: boolean;
  hasReviewed: boolean;
  review: any | null;
  bookingSource?: 'booking' | 'order' | 'registration' | null;
}

export const useReviewStatus = (eventId: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['reviewStatus', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');
      
      const response = await ApiService.get(`/reviews/check-status/${eventId}`);
      // ApiService.get already returns response.data (the full JSON body: { success, data: {...} })
      return response.data as ReviewStatus;
    },
    enabled: !!eventId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
