import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminVendorsAPI, adminTeachersAPI, adminEventsAPI, adminUsersAPI,
  adminOrdersAPI, adminPayoutsAPI, adminCommissionsAPI, adminModerationAPI,
  adminBlogsAPI, adminMediaAPI, adminAnalyticsAPI, adminSettingsAPI,
  adminBulkImportAPI,
} from '../services/adminApis';

// Vendors
export function useAdminVendors(params?: any) {
  return useQuery({ queryKey: ['admin', 'vendors', params], queryFn: () => adminVendorsAPI.getAll(params).then(r => r.data) });
}
export function useAdminVendor(id: string) {
  return useQuery({ queryKey: ['admin', 'vendors', id], queryFn: () => adminVendorsAPI.getById(id).then(r => r.data), enabled: !!id });
}
export function useUpdateVendorStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminVendorsAPI.updateStatus(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'vendors'] }) });
}
export function useVerifyVendorDocument() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminVendorsAPI.verifyDocument(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'vendors'] }) });
}

// Teachers
export function useAdminTeachers(params?: any) {
  return useQuery({ queryKey: ['admin', 'teachers', params], queryFn: () => adminTeachersAPI.getAll(params).then(r => r.data) });
}
export function useAdminTeacher(id: string) {
  return useQuery({ queryKey: ['admin', 'teachers', id], queryFn: () => adminTeachersAPI.getById(id).then(r => r.data), enabled: !!id });
}
export function useUpdateTeacherStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminTeachersAPI.updateStatus(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }) });
}
export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminTeachersAPI.softDelete(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }) });
}

// Events
export function useAdminEvents(params?: any) {
  return useQuery({ queryKey: ['admin', 'events', params], queryFn: () => adminEventsAPI.getAll(params).then(r => r.data) });
}
export function useAdminEvent(id: string) {
  return useQuery({ queryKey: ['admin', 'events', id], queryFn: () => adminEventsAPI.getById(id).then(r => r.data), enabled: !!id });
}
export function useApproveEvent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminEventsAPI.approve(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'events'] }) });
}
export function useRejectEvent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminEventsAPI.reject(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'events'] }) });
}

// Users
export function useAdminUsers(params?: any) {
  return useQuery({ queryKey: ['admin', 'users', params], queryFn: () => adminUsersAPI.getAll(params).then(r => r.data) });
}
export function useAdminUser(id: string) {
  return useQuery({ queryKey: ['admin', 'users', id], queryFn: () => adminUsersAPI.getById(id).then(r => r.data), enabled: !!id });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminUsersAPI.update(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }) });
}
export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminUsersAPI.suspend(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }) });
}

// Orders
export function useAdminOrders(params?: any) {
  return useQuery({ queryKey: ['admin', 'orders', params], queryFn: () => adminOrdersAPI.getAll(params).then(r => r.data) });
}
export function useAdminOrder(id: string) {
  return useQuery({ queryKey: ['admin', 'orders', id], queryFn: () => adminOrdersAPI.getById(id).then(r => r.data), enabled: !!id });
}

// Payouts
export function useAdminPayoutRequests(params?: any) {
  return useQuery({ queryKey: ['admin', 'payouts', 'requests', params], queryFn: () => adminPayoutsAPI.getPayoutRequests(params).then(r => r.data) });
}
export function useApprovePayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminPayoutsAPI.approvePayout(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }) });
}
export function useRejectPayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminPayoutsAPI.rejectPayout(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }) });
}
export function useBulkApprovePayouts() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { ids: string[] }) => adminPayoutsAPI.bulkApprove(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }) });
}

// Commissions
export function useAdminCommissionConfigs(params?: any) {
  return useQuery({ queryKey: ['admin', 'commissions', 'configs', params], queryFn: () => adminCommissionsAPI.getConfigs(params).then(r => r.data) });
}
export function useAdminCommissionTransactions(params?: any) {
  return useQuery({ queryKey: ['admin', 'commissions', 'transactions', params], queryFn: () => adminCommissionsAPI.getTransactions(params).then(r => r.data) });
}
export function useCreateCommissionConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => adminCommissionsAPI.createConfig(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'commissions', 'configs'] }) });
}
export function useApproveCommissions() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { ids: string[] }) => adminCommissionsAPI.approveTransactions(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'commissions', 'transactions'] }) });
}

// Moderation
export function usePendingReviews(params?: any) {
  return useQuery({ queryKey: ['admin', 'moderation', 'reviews', params], queryFn: () => adminModerationAPI.getPendingReviews(params).then(r => r.data) });
}
export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => adminModerationAPI.moderateReview(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation', 'reviews'] }) });
}

// Blogs
export function useAdminBlogs(params?: any) {
  return useQuery({ queryKey: ['admin', 'blogs', params], queryFn: () => adminBlogsAPI.getAll(params).then(r => r.data) });
}
export function useAdminBlog(id: string) {
  return useQuery({ queryKey: ['admin', 'blogs', id], queryFn: () => adminBlogsAPI.getById(id).then(r => r.data), enabled: !!id });
}
export function useCreateBlog() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => adminBlogsAPI.create(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'blogs'] }) });
}
export function useDeleteBlog() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminBlogsAPI.delete(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'blogs'] }) });
}

// Media
export function useAdminMedia(params?: any) {
  return useQuery({ queryKey: ['admin', 'media', params], queryFn: () => adminMediaAPI.getAll(params).then(r => r.data) });
}
export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => adminMediaAPI.delete(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] }) });
}

// Analytics
export function useAdminDashboard(params?: any) {
  return useQuery({ queryKey: ['admin', 'dashboard', params], queryFn: () => adminAnalyticsAPI.getDashboard(params).then(r => r.data) });
}
export function useAdminStats(params?: any) {
  return useQuery({ queryKey: ['admin', 'stats', params], queryFn: () => adminAnalyticsAPI.getStats(params).then(r => r.data) });
}

// Settings
export function useAdminSettings() {
  return useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminSettingsAPI.getSettings().then(r => r.data) });
}
export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => adminSettingsAPI.updateSettings(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }) });
}

// Bulk Import
export function useSupportedModels() {
  return useQuery({ queryKey: ['admin', 'bulk-import', 'models'], queryFn: () => adminBulkImportAPI.getSupportedModels().then(r => r.data) });
}
export function useValidateBulkImport() {
  return useMutation({ mutationFn: (data: FormData) => adminBulkImportAPI.validate(data).then(r => r.data) });
}
export function useExecuteBulkImport() {
  return useMutation({ mutationFn: (data: FormData) => adminBulkImportAPI.execute(data).then(r => r.data) });
}
