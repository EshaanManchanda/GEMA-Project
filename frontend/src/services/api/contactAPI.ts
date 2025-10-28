import { ApiService } from '../api';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'responded';
  readAt?: Date;
  respondedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactStats {
  statusCounts: Array<{
    _id: string;
    count: number;
  }>;
  totalCount: Array<{
    total: number;
  }>;
  subjectCounts: Array<{
    _id: string;
    count: number;
  }>;
  recentContacts: Contact[];
}

const contactAPI = {
  /**
   * Submit contact form
   */
  submitContact: async (data: ContactFormData) => {
    try {
      const response = await ApiService.post('/contact', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all contact submissions (admin only)
   */
  getAllContacts: async (params?: {
    page?: number;
    limit?: number;
    status?: 'new' | 'read' | 'responded';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    try {
      const response = await ApiService.get('/contact', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get contact by ID (admin only)
   */
  getContactById: async (id: string) => {
    try {
      const response = await ApiService.get(`/contact/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark contact as read (admin only)
   */
  markAsRead: async (id: string) => {
    try {
      const response = await ApiService.patch(`/contact/${id}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark contact as responded (admin only)
   */
  markAsResponded: async (id: string, notes?: string) => {
    try {
      const response = await ApiService.patch(`/contact/${id}/responded`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete contact submission (admin only)
   */
  deleteContact: async (id: string) => {
    try {
      const response = await ApiService.delete(`/contact/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get contact statistics (admin only)
   */
  getContactStats: async () => {
    try {
      const response = await ApiService.get('/contact/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default contactAPI;
