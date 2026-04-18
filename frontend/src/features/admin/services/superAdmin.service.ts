import api from '@shared/services/api/client';

export const superAdminAPI = {
  // Admin Management
  createAdminRole: (data: any) => api.post('/super-admin/admin-roles', data),
  getAdminRoles: (params?: any) => api.get('/super-admin/admin-roles', { params }),
  updateAdminRole: (id: string, data: any) => api.put(`/super-admin/admin-roles/${id}`, data),
  deleteAdminRole: (id: string) => api.delete(`/super-admin/admin-roles/${id}`),
  suspendAdmin: (id: string, reason: string) => api.post(`/super-admin/admin-roles/${id}/suspend`, { reason }),
  reinstateAdmin: (id: string) => api.post(`/super-admin/admin-roles/${id}/reinstate`),

  // System Operations
  getSystemHealth: () => api.get('/super-admin/system/health'),
  getDatabaseStats: () => api.get('/super-admin/system/database-stats'),
  getAuditLogs: (params?: any) => api.get('/super-admin/system/audit-logs', { params }),

  // Feature Flags
  getFeatureFlags: () => api.get('/super-admin/settings/feature-flags'),
  updateFeatureFlag: (key: string, value: boolean) => api.put(`/super-admin/settings/feature-flags/${key}`, { value }),

  // API Keys
  generateApiKey: (data: { name: string; scopes: string[] }) => api.post('/super-admin/api-keys', data),
  getApiKeys: () => api.get('/super-admin/api-keys'),
  revokeApiKey: (id: string) => api.delete(`/super-admin/api-keys/${id}`),

  // User Management
  forceLogoutUser: (userId: string) => api.post(`/super-admin/users/${userId}/force-logout`),
  bulkSuspendUsers: (userIds: string[], reason: string) => api.post('/super-admin/users/bulk-suspend', { userIds, reason }),
};
