import { useMutation, useQueryClient } from '@tanstack/react-query';
import teacherAPI from '@/services/api/teacherAPI';
import { teacherKeys } from '../queries/queryKeys';
import type {
  TeacherProfileUpdateInput,
  TeachingEventCreateInput,
} from '@/types/teacher';

// ============================================
// Profile Mutations
// ============================================

/**
 * Mutation hook for updating teacher profile
 */
export function useUpdateTeacherProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TeacherProfileUpdateInput) => teacherAPI.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.analytics.dashboard() });
    },
  });
}

/**
 * Mutation hook for uploading teacher media
 */
export function useUploadTeacherMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, mediaType }: { file: File; mediaType: 'profile' | 'demoVideo' }) =>
      teacherAPI.uploadMedia(file, mediaType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
    },
  });
}

/**
 * Mutation hook for updating availability hours
 */
export function useUpdateAvailabilityHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (availabilityHours: Record<string, { isAvailable: boolean; startTime?: string; endTime?: string }>) =>
      teacherAPI.updateAvailabilityHours(availabilityHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
    },
  });
}

/**
 * Mutation hook for updating social links
 */
export function useUpdateSocialLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (socialLinks: Record<string, string>) => teacherAPI.updateSocialLinks(socialLinks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
    },
  });
}

// ============================================
// Teaching Event Mutations
// ============================================

/**
 * Mutation hook for creating a teaching event
 */
export function useCreateTeachingEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TeachingEventCreateInput) => teacherAPI.createTeachingEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.analytics.dashboard() });
    },
  });
}

/**
 * Mutation hook for updating a teaching event
 */
export function useUpdateTeachingEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TeachingEventCreateInput> }) =>
      teacherAPI.updateTeachingEvent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.events.detail(variables.id) });
    },
  });
}

/**
 * Mutation hook for deleting a teaching event
 */
export function useDeleteTeachingEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) =>
      teacherAPI.deleteTeachingEvent(id, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.analytics.dashboard() });
    },
  });
}

/**
 * Mutation hook for restoring a teaching event
 */
export function useRestoreTeachingEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => teacherAPI.restoreTeachingEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.events.all() });
    },
  });
}

// ============================================
// Booking Mutations
// ============================================

/**
 * Mutation hook for updating a booking
 */
export function useUpdateTeacherBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { teacherNotes?: string; teacherStatus?: string; attendanceMarked?: boolean };
    }) => teacherAPI.updateBooking(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.bookings.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.bookings.detail(variables.id) });
    },
  });
}

/**
 * Mutation hook for importing bookings
 */
export function useImportTeacherBookings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (csvData: any[]) => teacherAPI.importBookings(csvData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.bookings.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.analytics.dashboard() });
    },
  });
}

// ============================================
// Payment Mutations
// ============================================

/**
 * Mutation hook for requesting a payout
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ amount, currency }: { amount: number; currency?: string }) =>
      teacherAPI.requestPayout(amount, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.payouts.all() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.analytics.earnings() });
    },
  });
}

/**
 * Mutation hook for initiating Stripe Connect onboarding
 */
export function useInitiateStripeConnect() {
  return useMutation({
    mutationFn: () => teacherAPI.initiateStripeConnect(),
  });
}

/**
 * Mutation hook for saving Stripe API keys
 */
export function useSaveStripeApiKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      publishableKey,
      secretKey,
      testMode,
    }: {
      publishableKey: string;
      secretKey: string;
      testMode: boolean;
    }) => teacherAPI.saveStripeApiKeys(publishableKey, secretKey, testMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.stripeConnect() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
    },
  });
}

/**
 * Mutation hook for updating bank details
 */
export function useUpdateBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bankDetails: {
      accountHolderName: string;
      bankName: string;
      accountNumber?: string;
      iban?: string;
      swiftCode?: string;
    }) => teacherAPI.updateBankDetails(bankDetails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
    },
  });
}

// ============================================
// Subscription Mutations
// ============================================

/**
 * Mutation hook for paying subscription
 */
export function usePaySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId?: string) => teacherAPI.paySubscription(paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.profile.all() });
    },
  });
}
