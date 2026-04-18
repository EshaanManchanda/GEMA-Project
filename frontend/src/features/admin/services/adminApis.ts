import api from '@shared/services/api/client';

export const adminVendorsAPI = {
  getAll: (params?: any) => api.get('/admin/vendors', { params }),
  getById: (id: string) => api.get(`/admin/vendors/${id}`),
  updatePaymentMode: (id: string, data: any) => api.put(`/admin/vendors/${id}/payment-mode`, data),
  updateSubscription: (id: string, data: any) => api.put(`/admin/vendors/${id}/subscription`, data),
  updateStatus: (id: string, data: any) => api.put(`/admin/vendors/${id}/status`, data),
  updateVerification: (id: string, data: any) => api.put(`/admin/vendors/${id}/verification`, data),
  verifyDocument: (id: string, data: any) => api.post(`/admin/vendors/${id}/verify-document`, data),
  getStats: () => api.get('/admin/vendors/stats'),
};

export const adminTeachersAPI = {
  getAll: (params?: any) => api.get('/admin/teachers', { params }),
  getById: (id: string) => api.get(`/admin/teachers/${id}`),
  create: (data: any) => api.post('/admin/teachers', data),
  update: (id: string, data: any) => api.put(`/admin/teachers/${id}`, data),
  softDelete: (id: string) => api.delete(`/admin/teachers/${id}`),
  toggleSuspension: (id: string) => api.put(`/admin/teachers/${id}/suspend`),
  toggleActive: (id: string) => api.put(`/admin/teachers/${id}/active`),
  updatePaymentMode: (id: string, data: any) => api.put(`/admin/teachers/${id}/payment-mode`, data),
  updateSubscription: (id: string, data: any) => api.put(`/admin/teachers/${id}/subscription`, data),
  updateStatus: (id: string, data: any) => api.put(`/admin/teachers/${id}/status`, data),
  getStats: () => api.get('/admin/teachers/stats'),
};

export const adminEventsAPI = {
  getAll: (params?: any) => api.get('/admin/events', { params }),
  getById: (id: string) => api.get(`/admin/events/${id}`),
  update: (id: string, data: any) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/admin/events/${id}`),
  approve: (id: string) => api.put(`/admin/events/${id}/approve`),
  reject: (id: string, data: any) => api.put(`/admin/events/${id}/reject`, data),
  feature: (id: string) => api.put(`/admin/events/${id}/feature`),
  getStats: () => api.get('/admin/events/stats'),
};

export const adminUsersAPI = {
  getAll: (params?: any) => api.get('/admin/users', { params }),
  getById: (id: string) => api.get(`/admin/users/${id}`),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  suspend: (id: string) => api.put(`/admin/users/${id}/suspend`),
  activate: (id: string) => api.put(`/admin/users/${id}/activate`),
  getStats: () => api.get('/admin/users/stats'),
};

export const adminOrdersAPI = {
  getAll: (params?: any) => api.get('/admin/orders', { params }),
  getById: (id: string) => api.get(`/admin/orders/${id}`),
  updateStatus: (id: string, data: any) => api.put(`/admin/orders/${id}/status`, data),
  getStats: () => api.get('/admin/orders/stats'),
};

export const adminPayoutsAPI = {
  getVendorEarnings: (params?: any) => api.get('/admin/payouts/vendor-earnings', { params }),
  getPayoutRequests: (params?: any) => api.get('/admin/payouts/requests', { params }),
  approvePayout: (id: string) => api.post(`/admin/payouts/${id}/approve`),
  rejectPayout: (id: string, data: any) => api.post(`/admin/payouts/${id}/reject`, data),
  processPayout: (id: string) => api.post(`/admin/payouts/${id}/process`),
  bulkApprove: (data: { ids: string[] }) => api.post('/admin/payouts/bulk-approve', data),
  bulkReject: (data: { ids: string[]; reason: string }) => api.post('/admin/payouts/bulk-reject', data),
  getStats: () => api.get('/admin/payouts/stats'),
};

export const adminCommissionsAPI = {
  getConfigs: (params?: any) => api.get('/admin/commissions/configs', { params }),
  createConfig: (data: any) => api.post('/admin/commissions/configs', data),
  updateConfig: (id: string, data: any) => api.put(`/admin/commissions/configs/${id}`, data),
  deleteConfig: (id: string) => api.delete(`/admin/commissions/configs/${id}`),
  getTransactions: (params?: any) => api.get('/admin/commissions/transactions', { params }),
  approveTransactions: (data: { ids: string[] }) => api.post('/admin/commissions/transactions/approve', data),
  rejectTransaction: (id: string, data: any) => api.post(`/admin/commissions/transactions/${id}/reject`, data),
  getAnalytics: (params?: any) => api.get('/admin/commissions/analytics', { params }),
  getStats: () => api.get('/admin/commissions/stats'),
};

export const adminModerationAPI = {
  getPendingReviews: (params?: any) => api.get('/admin/moderation/reviews', { params }),
  moderateReview: (id: string, data: any) => api.put(`/admin/moderation/reviews/${id}`, data),
  getFlaggedContent: (params?: any) => api.get('/admin/moderation/flagged', { params }),
  bulkModerate: (data: any) => api.post('/admin/moderation/bulk', data),
  getStats: () => api.get('/admin/moderation/stats'),
};

export const adminBlogsAPI = {
  getAll: (params?: any) => api.get('/admin/blogs', { params }),
  getById: (id: string) => api.get(`/admin/blogs/${id}`),
  create: (data: any) => api.post('/admin/blogs', data),
  update: (id: string, data: any) => api.put(`/admin/blogs/${id}`, data),
  delete: (id: string) => api.delete(`/admin/blogs/${id}`),
  publish: (id: string) => api.put(`/admin/blogs/${id}/publish`),
  getCategories: () => api.get('/admin/blog-categories'),
  createCategory: (data: any) => api.post('/admin/blog-categories', data),
  updateCategory: (id: string, data: any) => api.put(`/admin/blog-categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/admin/blog-categories/${id}`),
};

export const adminMediaAPI = {
  getAll: (params?: any) => api.get('/admin/media', { params }),
  getById: (id: string) => api.get(`/admin/media/${id}`),
  update: (id: string, data: any) => api.put(`/admin/media/${id}`, data),
  delete: (id: string) => api.delete(`/admin/media/${id}`),
  upload: (data: FormData) => api.post('/admin/media/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getStats: () => api.get('/admin/media/stats'),
};

export const adminAnalyticsAPI = {
  getDashboard: (params?: any) => api.get('/admin/dashboard', { params }),
  getStats: (params?: any) => api.get('/admin/stats', { params }),
  getRevenue: (params?: any) => api.get('/admin/revenue', { params }),
  exportData: (type: string, params?: any) => api.get(`/admin/export/${type}`, { params }),
};

export const adminSettingsAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getAppSettings: () => api.get('/admin/app-settings'),
  updateAppSettings: (data: any) => api.put('/admin/app-settings', data),
};

export const adminBulkImportAPI = {
  validate: (data: FormData) => api.post('/admin/bulk-import/validate', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  execute: (data: FormData) => api.post('/admin/bulk-import/execute', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  export: (model: string) => api.get(`/admin/bulk-import/export/${model}`),
  getSupportedModels: () => api.get('/admin/bulk-import/models'),
  getStats: () => api.get('/admin/bulk-import/stats'),
};
