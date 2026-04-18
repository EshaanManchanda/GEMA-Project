import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderAPI from '@services/api/orderAPI';

export function useOrders(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderAPI.getOrders(params),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderAPI.getOrderById(id),
    enabled: !!id,
  });
}

export function useUserOrders(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['orders', 'user', params],
    queryFn: () => orderAPI.getUserOrders(params),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => orderAPI.createOrder(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      orderAPI.updateOrder(id, data as any),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', id] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      orderAPI.cancelOrder(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', id] });
    },
  });
}
