import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import paymentAPI from '@services/api/paymentAPI';

export function usePayments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentAPI.getUserPayments(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentAPI.getPayment(id),
    enabled: !!id,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payments', 'methods'],
    queryFn: () => paymentAPI.getPaymentMethods(),
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => paymentAPI.createPaymentIntent(data as any),
  });
}

export function useConfirmPaymentIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) =>
      paymentAPI.confirmPaymentIntent(id, data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useProcessRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: Record<string, unknown> }) =>
      paymentAPI.processRefund(paymentId, data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => paymentAPI.createPayment(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
