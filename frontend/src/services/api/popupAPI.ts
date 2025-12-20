import { ApiService } from '../api';
import {
  PopupNotification,
  CreatePopupData,
  UpdatePopupData,
  PopupListResponse,
  PopupFilters
} from '@/types/popup';

const popupAPI = {
  // Public endpoints
  getActivePopups: async (route?: string): Promise<PopupNotification[]> => {
    const params = route ? { route } : {};
    const response = await ApiService.get('/popups/active', { params });
    return response.data.data.popups;
  },

  recordImpression: async (id: string): Promise<void> => {
    await ApiService.post(`/popups/${id}/impression`);
  },

  recordClick: async (id: string): Promise<void> => {
    await ApiService.post(`/popups/${id}/click`);
  },

  recordDismissal: async (id: string): Promise<void> => {
    await ApiService.post(`/popups/${id}/dismiss`);
  },

  // Admin endpoints
  admin: {
    getAllPopups: async (filters?: PopupFilters): Promise<PopupListResponse> => {
      const response = await ApiService.get('/popups', { params: filters });
      return response.data;
    },

    getPopupById: async (id: string): Promise<PopupNotification> => {
      const response = await ApiService.get(`/popups/${id}`);
      return response.data.popup;
    },

    createPopup: async (data: CreatePopupData): Promise<PopupNotification> => {
      const response = await ApiService.post('/popups', data);
      return response.data.popup;
    },

    updatePopup: async (id: string, data: UpdatePopupData): Promise<PopupNotification> => {
      const response = await ApiService.put(`/popups/${id}`, data);
      return response.data.popup;
    },

    deletePopup: async (id: string): Promise<void> => {
      await ApiService.delete(`/popups/${id}`);
    },

    updateDisplayOrders: async (orders: { id: string; displayOrder: number }[]): Promise<void> => {
      await ApiService.patch('/popups/display-orders', { orders });
    }
  }
};

export default popupAPI;
