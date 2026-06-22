import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import vendorPayoutAPI from '@/services/api/vendorPayoutAPI';
import { vendorKeys } from '../queries/queryKeys';
import toast from 'react-hot-toast';

export function useRequestPayoutMutation(options?: Omit<UseMutationOptions<any, any, number | undefined>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amount?: number) => vendorPayoutAPI.requestPayout(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.payouts.all() });
      toast.success('Payout request submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to request payout');
    },
    ...options,
  });
}

export function useCancelPayoutMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorPayoutAPI.cancelPayoutRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.payouts.all() });
      toast.success('Payout request cancelled');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel payout request');
    },
    ...options,
  });
}
