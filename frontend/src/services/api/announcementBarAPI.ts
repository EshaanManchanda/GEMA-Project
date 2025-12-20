import { ApiService } from '../api';
import {
  AnnouncementBar,
  CreateAnnouncementBarData,
  UpdateAnnouncementBarData,
  AnnouncementBarListResponse,
  AnnouncementBarFilters
} from '@/types/announcementBar';

const announcementBarAPI = {
  // Public endpoints
  getActiveAnnouncements: async (route?: string): Promise<AnnouncementBar[]> => {
    const params = route ? { route } : {};
    const response = await ApiService.get('/announcements/active', { params });
    return response.data.announcements;
  },

  recordImpression: async (id: string): Promise<void> => {
    await ApiService.post(`/announcements/${id}/impression`);
  },

  recordClick: async (id: string): Promise<void> => {
    await ApiService.post(`/announcements/${id}/click`);
  },

  recordDismissal: async (id: string): Promise<void> => {
    await ApiService.post(`/announcements/${id}/dismiss`);
  },

  // Admin endpoints
  admin: {
    getAllAnnouncements: async (filters?: AnnouncementBarFilters): Promise<AnnouncementBarListResponse> => {
      const response = await ApiService.get('/announcements', { params: filters });
      return response.data;
    },

    getAnnouncementById: async (id: string): Promise<AnnouncementBar> => {
      const response = await ApiService.get(`/announcements/${id}`);
      return response.data.announcement;
    },

    createAnnouncement: async (data: CreateAnnouncementBarData): Promise<AnnouncementBar> => {
      const response = await ApiService.post('/announcements', data);
      return response.data.announcement;
    },

    updateAnnouncement: async (id: string, data: UpdateAnnouncementBarData): Promise<AnnouncementBar> => {
      const response = await ApiService.put(`/announcements/${id}`, data);
      return response.data.announcement;
    },

    deleteAnnouncement: async (id: string): Promise<void> => {
      await ApiService.delete(`/announcements/${id}`);
    },

    updateDisplayOrders: async (orders: { id: string; displayOrder: number }[]): Promise<void> => {
      await ApiService.patch('/announcements/display-orders', { orders });
    }
  }
};

export default announcementBarAPI;
