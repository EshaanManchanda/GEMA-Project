import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import announcementBarAPI from '@/services/api/announcementBarAPI';
import {
  CreateAnnouncementBarData,
  UpdateAnnouncementBarData,
  AnnouncementBarFilters
} from '@/types/announcementBar';

// Query keys
export const announcementKeys = {
  all: ['announcements'] as const,
  active: (route?: string) => ['announcements', 'active', route || 'global'] as const,
  admin: {
    all: () => ['announcements', 'admin'] as const,
    list: (filters?: AnnouncementBarFilters) => ['announcements', 'admin', 'list', filters] as const,
    detail: (id: string) => ['announcements', 'admin', 'detail', id] as const
  }
};

// Public query hook - get active announcements
export const useActiveAnnouncements = (route?: string) => {
  return useQuery({
    queryKey: announcementKeys.active(route),
    queryFn: () => announcementBarAPI.getActiveAnnouncements(route),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

// Admin query hooks
export const useAdminAnnouncementsQuery = (filters?: AnnouncementBarFilters) => {
  return useQuery({
    queryKey: announcementKeys.admin.list(filters),
    queryFn: () => announcementBarAPI.admin.getAllAnnouncements(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: true
  });
};

export const useAdminAnnouncementDetailQuery = (id: string) => {
  return useQuery({
    queryKey: announcementKeys.admin.detail(id),
    queryFn: () => announcementBarAPI.admin.getAnnouncementById(id),
    staleTime: 2 * 60 * 1000,
    enabled: !!id
  });
};

// Mutation hooks
export const useCreateAnnouncementMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementBarData) => announcementBarAPI.admin.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    }
  });
};

export const useUpdateAnnouncementMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnnouncementBarData }) =>
      announcementBarAPI.admin.updateAnnouncement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    }
  });
};

export const useDeleteAnnouncementMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => announcementBarAPI.admin.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    }
  });
};

export const useUpdateDisplayOrdersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orders: { id: string; displayOrder: number }[]) =>
      announcementBarAPI.admin.updateDisplayOrders(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    }
  });
};

// Analytics mutation hooks
export const useRecordImpressionMutation = () => {
  return useMutation({
    mutationFn: (id: string) => announcementBarAPI.recordImpression(id)
  });
};

export const useRecordClickMutation = () => {
  return useMutation({
    mutationFn: (id: string) => announcementBarAPI.recordClick(id)
  });
};

export const useRecordDismissalMutation = () => {
  return useMutation({
    mutationFn: (id: string) => announcementBarAPI.recordDismissal(id)
  });
};
