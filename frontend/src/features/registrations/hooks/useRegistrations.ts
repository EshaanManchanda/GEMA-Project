import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import registrationAPI from '@services/api/registrationAPI';

export function useUserRegistrations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['registrations', 'user', params],
    queryFn: () => registrationAPI.getUserRegistrations(params),
  });
}

export function useEventRegistrations(eventId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['registrations', 'event', eventId, params],
    queryFn: () => registrationAPI.getEventRegistrations(eventId, params),
    enabled: !!eventId,
  });
}

export function useRegistration(id: string) {
  return useQuery({
    queryKey: ['registrations', id],
    queryFn: () => registrationAPI.getRegistrationById(id),
    enabled: !!id,
  });
}

export function useRegistrationConfig(eventId: string) {
  return useQuery({
    queryKey: ['registrations', 'config', eventId],
    queryFn: () => registrationAPI.getConfig(eventId),
    enabled: !!eventId,
  });
}

export function useSubmitRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => registrationAPI.submitRegistration(data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registrations', 'user'] }),
  });
}

export function useUpdateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => registrationAPI.updateRegistration(data as any),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['registrations', 'user'] });
      qc.invalidateQueries({ queryKey: ['registrations', (vars as any).registrationId] });
    },
  });
}

export function useWithdrawRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { registrationId: string; reason?: string }) =>
      registrationAPI.withdrawRegistration(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registrations', 'user'] }),
  });
}

export function useReviewRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { registrationId: string; status: 'approved' | 'rejected'; remarks?: string }) =>
      registrationAPI.reviewRegistration(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['registrations', vars.registrationId] });
    },
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { registrationId: string; paymentIntentId: string }) =>
      registrationAPI.confirmPayment(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['registrations', vars.registrationId] });
    },
  });
}

export function useCreateRegistrationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => registrationAPI.createOrUpdateConfig(data as any),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['registrations', 'config', (vars as any).eventId] });
    },
  });
}

export function useDisableRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => registrationAPI.disableRegistration(eventId),
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: ['registrations', 'config', eventId] });
    },
  });
}

export function useDuplicateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { eventId: string; sourceEventId: string }) =>
      registrationAPI.duplicateConfig(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['registrations', 'config', vars.eventId] });
    },
  });
}
