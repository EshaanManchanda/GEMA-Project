import { ApiService } from '../api';

export interface Certificate {
  _id: string;
  certificateNumber: string;
  userId: string;
  recipientName: string;
  courseId?: string;
  eventId?: string;
  examId?: string;
  courseName?: string;
  issuedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
  templateId?: string;
  downloadUrl?: string;
  verificationUrl: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const certificateAPI = {
  getCertificates: async (params?: { page?: number; limit?: number; status?: string }) => {
    try {
      const response = await ApiService.get('/certificates', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCertificateById: async (id: string) => {
    try {
      const response = await ApiService.get(`/certificates/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyCertificates: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/certificates/my', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  generateCertificate: async (data: { userId: string; courseId?: string; eventId?: string; examId?: string }) => {
    try {
      const response = await ApiService.post('/certificates/generate', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  downloadCertificate: async (id: string) => {
    try {
      const response = await ApiService.get(`/certificates/${id}/download`, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyCertificate: async (certificateNumber: string) => {
    try {
      const response = await ApiService.get(`/certificates/verify/${certificateNumber}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  revokeCertificate: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.put(`/certificates/${id}/revoke`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default certificateAPI;
