import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import businessReportAPI from '@/services/api/businessReportAPI';
import { adminKeys } from '../queries/queryKeys';
import type { VendorPromotionInput, SavePromotionInputResult } from '@/types/businessReport';

function invalidateVendorReports(queryClient: ReturnType<typeof useQueryClient>, vendorId: string) {
  queryClient.invalidateQueries({ queryKey: adminKeys.businessReports.health(vendorId) });
  queryClient.invalidateQueries({ queryKey: adminKeys.businessReports.healthHistory(vendorId) });
  queryClient.invalidateQueries({ queryKey: adminKeys.businessReports.all() });
}

export function useGenerateSnapshotMutation(
  options?: Omit<UseMutationOptions<any, any, { vendorId: string; period: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, period }: { vendorId: string; period: string }) =>
      businessReportAPI.generateSnapshot(vendorId, period),
    onSuccess: (_data, { vendorId }) => {
      invalidateVendorReports(queryClient, vendorId);
      toast.success('Business report snapshot generated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to generate snapshot');
    },
    ...options,
  });
}

export function useSavePromotionInputMutation(
  options?: Omit<
    UseMutationOptions<
      SavePromotionInputResult,
      any,
      { vendorId: string; period: string; input: Partial<VendorPromotionInput> }
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, period, input }) =>
      businessReportAPI.savePromotionInput(vendorId, period, input),
    onSuccess: (data, { vendorId, period }) => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.businessReports.promotionInput(vendorId, period),
      });
      if (data.warnings.length > 0) {
        toast(`Promotion input saved with ${data.warnings.length} data-quality warning${data.warnings.length === 1 ? '' : 's'}`, { icon: '⚠️' });
      } else {
        toast.success('Promotion input saved');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save promotion input');
    },
    ...options,
  });
}

export function useUpdateSnapshotStatusMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      any,
      { snapshotId: string; status: 'locked' | 'reopened' | 'archived'; vendorId: string }
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ snapshotId, status }) =>
      businessReportAPI.updateSnapshotStatus(snapshotId, status),
    onSuccess: (_data, { vendorId, status }) => {
      invalidateVendorReports(queryClient, vendorId);
      const verb = status === 'locked' ? 'locked' : status === 'reopened' ? 'reopened' : 'archived';
      toast.success(`Snapshot ${verb}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update snapshot status');
    },
    ...options,
  });
}

export function useUpdateSnapshotNotesMutation(
  options?: Omit<
    UseMutationOptions<
      any,
      any,
      { snapshotId: string; vendorId: string; notes: { vendorVisible?: string; internal?: string } }
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ snapshotId, notes }) => businessReportAPI.updateSnapshotNotes(snapshotId, notes),
    onSuccess: (_data, { vendorId }) => {
      invalidateVendorReports(queryClient, vendorId);
      toast.success('Notes saved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save notes');
    },
    ...options,
  });
}

export function useToggleTaskMutation(
  options?: Omit<
    UseMutationOptions<any, any, { vendorId: string; taskCode: string; done: boolean; period?: string }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, taskCode, done, period }) =>
      businessReportAPI.toggleTask(vendorId, taskCode, done, period),
    onSuccess: (_data, { vendorId }) => {
      invalidateVendorReports(queryClient, vendorId);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update task');
    },
    ...options,
  });
}

export function useBulkGenerateMutation(
  options?: Omit<UseMutationOptions<any, any, { vendorIds: string[]; period: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorIds, period }: { vendorIds: string[]; period: string }) =>
      businessReportAPI.bulkGenerate(vendorIds, period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.businessReports.all() });
      toast.success('Bulk report generation queued');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to queue bulk generation');
    },
    ...options,
  });
}
