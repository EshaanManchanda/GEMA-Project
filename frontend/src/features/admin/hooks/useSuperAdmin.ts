import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminAPI } from '../services/superAdmin.service';

// Admin Management
export function useAdminRoles(params?: any) {
  return useQuery({ queryKey: ['super-admin', 'admin-roles', params], queryFn: () => superAdminAPI.getAdminRoles(params).then(r => r.data) });
}

export function useCreateAdminRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => superAdminAPI.createAdminRole(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'admin-roles'] }) });
}

export function useUpdateAdminRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => superAdminAPI.updateAdminRole(id, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'admin-roles'] }) });
}

export function useDeleteAdminRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => superAdminAPI.deleteAdminRole(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'admin-roles'] }) });
}

export function useSuspendAdmin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => superAdminAPI.suspendAdmin(id, reason).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'admin-roles'] }) });
}

export function useReinstateAdmin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => superAdminAPI.reinstateAdmin(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'admin-roles'] }) });
}

// System Operations
export function useSystemHealth() {
  return useQuery({ queryKey: ['super-admin', 'health'], queryFn: () => superAdminAPI.getSystemHealth().then(r => r.data) });
}

export function useDatabaseStats() {
  return useQuery({ queryKey: ['super-admin', 'database-stats'], queryFn: () => superAdminAPI.getDatabaseStats().then(r => r.data) });
}

export function useAuditLogs(params?: any) {
  return useQuery({ queryKey: ['super-admin', 'audit-logs', params], queryFn: () => superAdminAPI.getAuditLogs(params).then(r => r.data) });
}

// Feature Flags
export function useFeatureFlags() {
  return useQuery({ queryKey: ['super-admin', 'feature-flags'], queryFn: () => superAdminAPI.getFeatureFlags().then(r => r.data) });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ key, value }: { key: string; value: boolean }) => superAdminAPI.updateFeatureFlag(key, value).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'feature-flags'] }) });
}

// API Keys
export function useApiKeys() {
  return useQuery({ queryKey: ['super-admin', 'api-keys'], queryFn: () => superAdminAPI.getApiKeys().then(r => r.data) });
}

export function useGenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { name: string; scopes: string[] }) => superAdminAPI.generateApiKey(data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'api-keys'] }) });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => superAdminAPI.revokeApiKey(id).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'api-keys'] }) });
}

// User Management
export function useForceLogoutUser() {
  return useMutation({ mutationFn: (userId: string) => superAdminAPI.forceLogoutUser(userId).then(r => r.data) });
}

export function useBulkSuspendUsers() {
  return useMutation({ mutationFn: ({ userIds, reason }: { userIds: string[]; reason: string }) => superAdminAPI.bulkSuspendUsers(userIds, reason).then(r => r.data) });
}
