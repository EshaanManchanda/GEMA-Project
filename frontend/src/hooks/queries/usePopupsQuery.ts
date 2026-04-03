import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import popupAPI from '@/services/api/popupAPI';
import {
  CreatePopupData,
  UpdatePopupData,
  PopupFilters
} from '@/types/popup';

// Query keys
export const popupKeys = {
  all: ['popups'] as const,
  active: (route?: string) => ['popups', 'active', route || 'global'] as const,
  admin: {
    all: () => ['popups', 'admin'] as const,
    list: (filters?: PopupFilters) => ['popups', 'admin', 'list', filters] as const,
    detail: (id: string) => ['popups', 'admin', 'detail', id] as const
  }
};

// Public query hook - get active popups
export const useActivePopups = (route?: string) => {
  return useQuery({
    queryKey: popupKeys.active(route),
    queryFn: () => popupAPI.getActivePopups(route),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

// Admin query hooks
export const useAdminPopupsQuery = (filters?: PopupFilters) => {
  return useQuery({
    queryKey: popupKeys.admin.list(filters),
    queryFn: () => popupAPI.admin.getAllPopups(filters),
    staleTime: 2 * 60 * 1000,
    enabled: true
  });
};

export const useAdminPopupDetailQuery = (id: string) => {
  return useQuery({
    queryKey: popupKeys.admin.detail(id),
    queryFn: () => popupAPI.admin.getPopupById(id),
    staleTime: 2 * 60 * 1000,
    enabled: !!id
  });
};

// Mutation hooks
export const useCreatePopupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePopupData) => popupAPI.admin.createPopup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: popupKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: popupKeys.all });
    }
  });
};

export const useUpdatePopupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePopupData }) =>
      popupAPI.admin.updatePopup(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: popupKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: popupKeys.admin.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: popupKeys.all });
    }
  });
};

export const useDeletePopupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => popupAPI.admin.deletePopup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: popupKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: popupKeys.all });
    }
  });
};

export const useUpdateDisplayOrdersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orders: { id: string; displayOrder: number }[]) =>
      popupAPI.admin.updateDisplayOrders(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: popupKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: popupKeys.all });
    }
  });
};

// Analytics mutation hooks
export const useRecordImpressionMutation = () => {
  return useMutation({
    mutationFn: (id: string) => popupAPI.recordImpression(id)
  });
};

export const useRecordClickMutation = () => {
  return useMutation({
    mutationFn: (id: string) => popupAPI.recordClick(id)
  });
};

export const useRecordDismissalMutation = () => {
  return useMutation({
    mutationFn: (id: string) => popupAPI.recordDismissal(id)
  });
};
