import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import adminAPI from '@/services/api/adminAPI';
import { teachingEventsKeys, adminKeys } from '../queries/queryKeys';
import toast from 'react-hot-toast';

// ============================================
// Admin Teaching Event Mutations
// ============================================

/**
 * Mutation hook for approving a teaching event
 * @example
 * const approveTeachingEvent = useApproveTeachingEventMutation();
 * approveTeachingEvent.mutate('teaching-event-id-123');
 */
export function useApproveTeachingEventMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teachingEventId: string) => adminAPI.approveTeachingEvent(teachingEventId),
    onSuccess: () => {
      // Invalidate all teaching events queries to refetch
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      queryClient.invalidateQueries({ queryKey: (adminKeys.teachingEvents as any).pending() });
      toast.success('Teaching event approved successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve teaching event');
    },
    ...options,
  });
}

/**
 * Mutation hook for rejecting a teaching event
 * @example
 * const rejectTeachingEvent = useRejectTeachingEventMutation();
 * rejectTeachingEvent.mutate({ teachingEventId: 'event-123', reason: 'Does not meet guidelines' });
 */
export function useRejectTeachingEventMutation(
  options?: Omit<UseMutationOptions<any, any, { teachingEventId: string; reason: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teachingEventId, reason }: { teachingEventId: string; reason: string }) =>
      adminAPI.rejectTeachingEvent(teachingEventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      queryClient.invalidateQueries({ queryKey: (adminKeys.teachingEvents as any).pending() });
      toast.success('Teaching event rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject teaching event');
    },
    ...options,
  });
}

/**
 * Mutation hook for deleting a teaching event
 * @example
 * const deleteTeachingEvent = useDeleteTeachingEventMutation();
 * deleteTeachingEvent.mutate({ teachingEventId: 'event-123', permanent: false });
 */
export function useDeleteTeachingEventMutation(
  options?: Omit<UseMutationOptions<any, any, { teachingEventId: string; permanent?: boolean }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teachingEventId, permanent = false }: { teachingEventId: string; permanent?: boolean }) =>
      adminAPI.deleteTeachingEvent(teachingEventId, permanent),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success(variables.permanent ? 'Teaching event permanently deleted' : 'Teaching event moved to trash');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete teaching event');
    },
    ...options,
  });
}

/**
 * Mutation hook for restoring a deleted teaching event
 * @example
 * const restoreTeachingEvent = useRestoreTeachingEventMutation();
 * restoreTeachingEvent.mutate('teaching-event-id-123');
 */
export function useRestoreTeachingEventMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teachingEventId: string) => adminAPI.restoreTeachingEvent(teachingEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success('Teaching event restored successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to restore teaching event');
    },
    ...options,
  });
}

/**
 * Mutation hook for toggling teaching event featured status
 * @example
 * const toggleFeatured = useToggleTeachingEventFeaturedMutation();
 * toggleFeatured.mutate('teaching-event-id-123');
 */
export function useToggleTeachingEventFeaturedMutation(options?: Omit<UseMutationOptions<any, any, string>, 'mutationFn'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teachingEventId: string) => adminAPI.toggleTeachingEventFeatured(teachingEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.featured() });
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success('Featured status updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update featured status');
    },
    ...options,
  });
}

/**
 * Mutation hook for updating a teaching event
 * @example
 * const updateTeachingEvent = useUpdateTeachingEventMutation();
 * updateTeachingEvent.mutate({ teachingEventId: 'event-123', data: { title: 'New Title' } });
 */
export function useUpdateTeachingEventMutation(
  options?: Omit<UseMutationOptions<any, any, { teachingEventId: string; data: any }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teachingEventId, data }: { teachingEventId: string; data: any }) =>
      adminAPI.updateTeachingEvent(teachingEventId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.detail(variables.teachingEventId) });
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success('Teaching event updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update teaching event');
    },
    ...options,
  });
}

/**
 * Mutation hook for creating a teaching event
 * @example
 * const createTeachingEvent = useCreateTeachingEventMutation();
 * createTeachingEvent.mutate({ title: 'New Class', ... });
 */
export function useCreateTeachingEventMutation(
  options?: Omit<UseMutationOptions<any, any, any>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => adminAPI.createTeachingEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success('Teaching event created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create teaching event');
    },
    ...options,
  });
}

/**
 * Mutation hook for changing teaching event teacher
 * @example
 * const changeTeacher = useChangeTeacherMutation();
 * changeTeacher.mutate({ teachingEventId: 'event-123', teacherId: 'teacher-456' });
 */
export function useChangeTeacherMutation(
  options?: Omit<UseMutationOptions<any, any, { teachingEventId: string; teacherId: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teachingEventId, teacherId }: { teachingEventId: string; teacherId: string }) =>
      adminAPI.changeTeachingEventTeacher(teachingEventId, teacherId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.detail(variables.teachingEventId) });
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success('Teacher changed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to change teacher');
    },
    ...options,
  });
}

/**
 * Mutation hook for bulk updating teaching events
 * @example
 * const bulkUpdate = useBulkUpdateTeachingEventsMutation();
 * bulkUpdate.mutate({ teachingEventIds: ['id1', 'id2'], updateData: { isApproved: true } });
 */
export function useBulkUpdateTeachingEventsMutation(
  options?: Omit<UseMutationOptions<any, any, { teachingEventIds: string[]; updateData: any }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teachingEventIds, updateData }: { teachingEventIds: string[]; updateData: any }) =>
      adminAPI.bulkUpdateTeachingEvents(teachingEventIds, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingEventsKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.teachingEvents.all() });
      toast.success('Teaching events updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to bulk update teaching events');
    },
    ...options,
  });
}
