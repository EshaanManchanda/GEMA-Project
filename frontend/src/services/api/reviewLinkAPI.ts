import api from '../api';

export interface ReviewLinkContext {
  alreadyReviewed: boolean;
  userId?: string;
  eventId?: string;
  eventTitle?: string;
}

export interface GalleryImage {
  url: string;
  caption?: string;
  order: number;
  size: 'small' | 'medium' | 'large';
}

export interface Gallery {
  _id: string;
  eventId: string;
  type: 'grid' | 'messy';
  images: GalleryImage[];
}

export interface CertVerifyResult {
  _id?: string;
  valid?: boolean;
  serialNumber?: string;
  recipientName?: string;
  eventTitle?: string;
  eventId?: { _id: string; title: string } | string;
  issuedAt?: string;
  status?: string;
  pdfUrl?: string;
  recipient?: { name: string; email: string };
  templateId?: { _id: string; name: string; slug: string } | string;
  certificateTypeSlug?: string;
  data?: Record<string, any>;
  context?: { studentId?: string; courseId?: string; customRef?: string };
  studentInfo?: { firstName: string; lastName: string; grade?: string };
}

export const reviewLinkAPI = {
  getContext: (
    eventId: string,
    email: string,
    names?: { firstName?: string; lastName?: string; schoolName?: string },
  ) =>
    api.get<{ success: boolean; data: ReviewLinkContext }>(
      `/reviews/link/${eventId}`,
      { params: { email, ...names } },
    ),

  submitReview: (
    eventId: string,
    payload: { email: string; rating: number; comment?: string },
  ) => api.post(`/reviews/link/${eventId}`, payload),

  generateLink: (eventId: string) =>
    api.post<{ success: boolean; data: { reviewLink: string } }>(
      `/reviews/admin/link/${eventId}/generate`,
    ),
};

export const galleryAPI = {
  getByEvent: (eventId: string) =>
    api.get<{ success: boolean; data: { gallery: Gallery } }>(`/galleries/event/${eventId}`),

  create: (data: { eventId: string; type: 'grid' | 'messy'; images?: GalleryImage[] }) =>
    api.post('/galleries', data),

  update: (id: string, data: { type?: 'grid' | 'messy'; images?: GalleryImage[] }) =>
    api.put(`/galleries/${id}`, data),
};

export const certificateAPI = {
  verify: (serialNumber: string) =>
    api.get<{ success: boolean; data: CertVerifyResult }>(`/certificates/verify/${serialNumber}`),

  list: (params?: { eventId?: string; status?: string; studentId?: string; recipientEmail?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { certificates: CertVerifyResult[]; pagination: any } }>('/certificates', { params }),

  revoke: (id: string) =>
    api.post(`/certificates/${id}/revoke`),

  resendEmail: (id: string) =>
    api.post(`/certificates/${id}/email`),

  download: (id: string) =>
    api.get<{ success: boolean; data: { pdfUrl: string } }>(`/certificates/${id}/download`),

  listTemplates: () =>
    api.get<{ success: boolean; data: { templates: Array<{ _id: string; name: string; slug: string; active: boolean; createdAt: string }> } }>('/certificates/templates'),

  previewTemplate: (id: string, data?: Record<string, any>) =>
    api.post<{ success: boolean; data: { previewUrl: string } }>(`/certificates/templates/${id}/preview`, { data }),

  bulk: (payload: { templateId: string; eventId: string; inputs: Array<{ recipientName: string; recipientEmail: string; userId?: string; data?: Record<string, any> }>; options?: { sendEmail?: boolean } }) =>
    api.post<{ success: boolean; data: { requestId: string; total: number; message: string } }>('/certificates/bulk', payload),

  getBulkStatus: (requestId: string) =>
    api.get<{ success: boolean; data: { request: { status: string; progress: { total: number; processed: number; failed: number }; type: string } } }>(`/certificates/requests/${requestId}`),

  listAuditLogs: (params?: { entityId?: string; action?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { logs: Array<{ _id: string; action: string; entityId: string; actor?: { firstName: string; lastName: string; email: string }; meta?: Record<string, any>; at: string }>; pagination: any } }>('/certificates/audit/logs', { params }),

  listTemplateVersions: (templateId: string) =>
    api.get<{ success: boolean; data: { versions: Array<{ _id: string; version: number; createdAt: string; createdBy?: { firstName: string; lastName: string } }> } }>(`/certificates/templates/${templateId}/versions`),

  rollbackTemplate: (templateId: string, versionNumber: number) =>
    api.post(`/certificates/templates/${templateId}/rollback/${versionNumber}`),

  deleteTemplate: (id: string) =>
    api.delete(`/certificates/templates/${id}`),

  updateTemplate: (id: string, data: { active?: boolean; name?: string; description?: string; html?: string; css?: string; backgroundImageUrl?: string; fields?: any[] }) =>
    api.put<{ success: boolean; data: { template: any } }>(`/certificates/templates/${id}`, data),

  retryGenerate: (id: string) =>
    api.post<{ success: boolean; data: { certificate: CertVerifyResult } }>(`/certificates/${id}/retry`),

  purgeAll: (opts?: { eventId?: string; mode?: 'full' | 'storage-only' }) =>
    api.delete<{ success: boolean; data: { affectedCertificates: number; storageCleanedCount: number; message: string; mode: string } }>(
      '/certificates/purge-all',
      { params: { ...opts } },
    ),
};
