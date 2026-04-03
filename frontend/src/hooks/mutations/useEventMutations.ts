import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import adminAPI from '@/services/api/adminAPI';
import vendorAPI from '@/services/api/vendorAPI';
import { eventsKeys, adminKeys, vendorKeys } from '../queries/queryKeys';
import toast from 'react-hot-toast';

// ============================================
// Admin Event Mutations
// ============================================

/**
 * Mutation hook for approving an event
 * @example
 * const approveEvent = useApproveEventMutation();
 * approveEvent.mutate('event-id-123');
 */
export function useApproveEventMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => adminAPI.approveEvent(eventId),
    onSuccess: () => {
      // Invalidate all events queries to refetch
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.pending() });
      toast.success('Event approved successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve event');
    },
    ...options,
  });
}

/**
 * Mutation hook for rejecting an event
 * @example
 * const rejectEvent = useRejectEventMutation();
 * rejectEvent.mutate({ eventId: 'event-123', reason: 'Does not meet guidelines' });
 */
export function useRejectEventMutation(
  options?: Omit<UseMutationOptions<any, any, { eventId: string; reason: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason: string }) =>
      adminAPI.rejectEvent(eventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.pending() });
      toast.success('Event rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject event');
    },
    ...options,
  });
}

/**
 * Mutation hook for deleting an event
 * @example
 * const deleteEvent = useDeleteEventMutation();
 * deleteEvent.mutate({ eventId: 'event-123', permanent: false });
 */
export function useDeleteEventMutation(
  options?: Omit<UseMutationOptions<any, any, { eventId: string; permanent?: boolean }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, permanent = false }: { eventId: string; permanent?: boolean }) =>
      adminAPI.deleteEvent(eventId, permanent),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() });
      toast.success(variables.permanent ? 'Event permanently deleted' : 'Event moved to trash');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete event');
    },
    ...options,
  });
}

/**
 * Mutation hook for restoring a deleted event
 * @example
 * const restoreEvent = useRestoreEventMutation();
 * restoreEvent.mutate('event-id-123');
 */
export function useRestoreEventMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => adminAPI.restoreEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() });
      toast.success('Event restored successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to restore event');
    },
    ...options,
  });
}

/**
 * Mutation hook for toggling event featured status
 * @example
 * const toggleFeatured = useToggleFeaturedMutation();
 * toggleFeatured.mutate('event-id-123');
 */
export function useToggleFeaturedMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => adminAPI.toggleEventFeatured(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.featured() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() });
      toast.success('Featured status updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update featured status');
    },
    ...options,
  });
}

/**
 * Mutation hook for updating an event
 * @example
 * const updateEvent = useUpdateEventMutation();
 * updateEvent.mutate({ eventId: 'event-123', data: { title: 'New Title' } });
 */
export function useUpdateEventMutation(
  options?: Omit<UseMutationOptions<any, any, { eventId: string; data: any }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: any }) =>
      adminAPI.updateEvent(eventId, data),
    onSuccess: (_, variables) => {
      // Invalidate specific event detail query
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(variables.eventId) });
      // Invalidate event lists
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.events.lists() });
      toast.success('Event updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update event');
    },
    ...options,
  });
}

// ============================================
// Vendor Event Mutations
// ============================================

/**
 * Mutation hook for creating a vendor event
 * @example
 * const createEvent = useCreateVendorEventMutation();
 * createEvent.mutate({ title: 'New Event', ... });
 */
export function useCreateVendorEventMutation(
  options?: Omit<UseMutationOptions<any, any, any>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData: any) => vendorAPI.createVendorEvent(eventData),
    onSuccess: () => {
      // Invalidate vendor events queries
      queryClient.invalidateQueries({ queryKey: vendorKeys.events.all() });
      // Also invalidate admin pending events (vendor events start as pending)
      queryClient.invalidateQueries({ queryKey: adminKeys.events.pending() });
      toast.success('Event created successfully. Awaiting approval.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create event');
    },
    ...options,
  });
}

/**
 * Mutation hook for updating a vendor event
 * @example
 * const updateEvent = useUpdateVendorEventMutation();
 * updateEvent.mutate({ eventId: 'event-123', data: { title: 'Updated Title' } });
 */
export function useUpdateVendorEventMutation(
  options?: Omit<UseMutationOptions<any, any, { eventId: string; data: any }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: any }) =>
      vendorAPI.updateVendorEvent(eventId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.events.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.events.lists() });
      toast.success('Event updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update event');
    },
    ...options,
  });
}

/**
 * Mutation hook for deleting a vendor event
 * @example
 * const deleteEvent = useDeleteVendorEventMutation();
 * deleteEvent.mutate({ eventId: 'event-123', permanent: false });
 */
export function useDeleteVendorEventMutation(
  options?: Omit<UseMutationOptions<any, any, { eventId: string; permanent?: boolean }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, permanent = false }: { eventId: string; permanent?: boolean }) =>
      vendorAPI.deleteVendorEvent(eventId, permanent),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.events.all() });
      toast.success(variables.permanent ? 'Event permanently deleted' : 'Event moved to trash');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete event');
    },
    ...options,
  });
}

/**
 * Mutation hook for restoring a deleted vendor event
 * @example
 * const restoreEvent = useRestoreVendorEventMutation();
 * restoreEvent.mutate('event-id-123');
 */
export function useRestoreVendorEventMutation(
  options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => vendorAPI.restoreVendorEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.events.all() });
      toast.success('Event restored successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to restore event');
    },
    ...options,
  });
}
