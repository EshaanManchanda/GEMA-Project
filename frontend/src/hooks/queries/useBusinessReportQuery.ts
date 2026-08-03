import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import businessReportAPI from '@/services/api/businessReportAPI';
import { adminKeys } from './queryKeys';
import type {
  VendorHealthResult,
  SnapshotHistoryEntry,
  OverviewResponse,
  OverviewFilters,
  VendorPromotionInput,
  VendorBusinessSnapshot,
  BulkGenerateJob,
} from '@/types/businessReport';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes — matches the analytics convention
const GC_TIME = 10 * 60 * 1000;

/** Live business-health scores, recommendations, and tasks for a vendor. */
export function useVendorHealthQuery(
  vendorId: string,
  period?: string,
  options?: Omit<UseQueryOptions<VendorHealthResult>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.businessReports.health(vendorId, period),
    queryFn: () => businessReportAPI.getHealth(vendorId, period),
    enabled: !!vendorId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/** Score history across saved snapshots — powers the timeline chart. */
export function useVendorHealthHistoryQuery(
  vendorId: string,
  limit?: number,
  options?: Omit<UseQueryOptions<SnapshotHistoryEntry[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.businessReports.healthHistory(vendorId),
    queryFn: () => businessReportAPI.getHealthHistory(vendorId, limit),
    enabled: !!vendorId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/** Persisted snapshot (or null) for a vendor/period — drives lifecycle & notes controls. */
export function useSnapshotQuery(
  vendorId: string,
  period?: string,
  options?: Omit<UseQueryOptions<VendorBusinessSnapshot | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.businessReports.snapshot(vendorId, period),
    queryFn: () => businessReportAPI.getSnapshot(vendorId, period),
    enabled: !!vendorId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/** Admin vendor leaderboard. */
export function useBusinessReportOverviewQuery(
  filters: OverviewFilters = {},
  options?: Omit<UseQueryOptions<OverviewResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.businessReports.overview(filters),
    queryFn: () => businessReportAPI.getOverview(filters),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/** Admin-entered promotion data (social reach, banners, campaigns) for a period. */
export function usePromotionInputQuery(
  vendorId: string,
  period?: string,
  options?: Omit<UseQueryOptions<VendorPromotionInput>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.businessReports.promotionInput(vendorId, period),
    queryFn: () => businessReportAPI.getPromotionInput(vendorId, period),
    enabled: !!vendorId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/** Poll a bulk-generate job's progress. Pass refetchInterval via options while the job is running. */
export function useBulkGenerateProgressQuery(
  jobId: string | undefined,
  options?: Omit<UseQueryOptions<BulkGenerateJob>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.businessReports.bulkGenerateProgress(jobId ?? ''),
    queryFn: () => businessReportAPI.getBulkGenerateProgress(jobId as string),
    enabled: !!jobId,
    staleTime: 0,
    gcTime: GC_TIME,
    ...options,
  });
}
