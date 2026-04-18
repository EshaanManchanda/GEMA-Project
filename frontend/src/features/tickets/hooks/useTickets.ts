import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketAPI } from '@services/api/ticketAPI';

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketAPI.getTicketsByUser(),
  });
}

export function useTicketsByOrder(orderId: string) {
  return useQuery({
    queryKey: ['tickets', 'order', orderId],
    queryFn: () => ticketAPI.getTicketsByOrder(orderId),
    enabled: !!orderId,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => ticketAPI.getTicketById(id),
    enabled: !!id,
  });
}

export function useDownloadTicket() {
  return useMutation({
    mutationFn: (id: string) => ticketAPI.downloadTicket(id),
  });
}

export function useValidateTicket() {
  return useMutation({
    mutationFn: (qrCode: string) => ticketAPI.validateTicket(qrCode),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'used' | 'cancelled' | 'expired' }) =>
      ticketAPI.updateTicketStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useGenerateMissingTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => ticketAPI.generateMissingTickets(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}
