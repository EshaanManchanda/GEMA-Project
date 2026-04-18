import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import affiliateAPI from '@services/api/affiliateAPI';
import type { AffiliateStatus } from '@services/api/affiliateAPI';

export function useMyAffiliate() {
  return useQuery({
    queryKey: ['affiliates', 'my'],
    queryFn: () => affiliateAPI.getMyAffiliate(),
  });
}

export function useAffiliateDashboardStats(period?: number) {
  return useQuery({
    queryKey: ['affiliates', 'dashboard', period],
    queryFn: () => affiliateAPI.getDashboardStats(period),
  });
}

export function useAffiliateCommissions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['affiliates', 'commissions', params],
    queryFn: () => affiliateAPI.getCommissions(params as any),
  });
}

export function useAllAffiliates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['affiliates', 'all', params],
    queryFn: () => affiliateAPI.getAllAffiliates(params as any),
  });
}

export function useTopPerformers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['affiliates', 'top-performers', params],
    queryFn: () => affiliateAPI.getTopPerformers(params as any),
  });
}

export function useAffiliateAnalytics(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['affiliates', 'analytics', params],
    queryFn: () => affiliateAPI.getAnalytics(params as any),
  });
}

export function useApplyAffiliate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => affiliateAPI.applyAffiliate(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliates', 'my'] }),
  });
}

export function useUpdateAffiliateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => affiliateAPI.updateProfile(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliates', 'my'] }),
  });
}

export function useGenerateTrackingUrl() {
  return useMutation({
    mutationFn: (data?: Record<string, unknown>) => affiliateAPI.generateTrackingUrl(data as any),
  });
}

export function useRecordAffiliateClick() {
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data?: Record<string, unknown> }) =>
      affiliateAPI.recordClick(code, data as any),
  });
}

export function useUpdateAffiliateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: AffiliateStatus; rejectionReason?: string } }) =>
      affiliateAPI.updateAffiliateStatus(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affiliates', 'all'] }),
  });
}
