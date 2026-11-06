import { ApiService } from '../api';

export interface WinterCampRegisterPayload {
  studentName: string;
  email?: string;
  studentEmail?: string;
  parentEmail?: string;
  parentPhone?: string;
  phone?: string;
  grade: string;
  selectedPrograms: string[];
  interests?: string[];
  message?: string;
}

export interface WinterCampRegistrationItem {
  _id: string;
  studentName: string;
  studentEmail?: string;
  parentEmail?: string;
  parentPhone?: string;
  grade: string;
  selectedPrograms: string[];
  interests?: string[];
  message?: string;
  status: 'pending' | 'contacted' | 'enrolled' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WinterCampListResponse {
  success: boolean;
  data: {
    registrations: WinterCampRegistrationItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export const winterCampAPI = {
  /**
   * Public: Register student for winter camp
   */
  register: async (payload: WinterCampRegisterPayload) => {
    return await ApiService.post('/winter-camp/register', payload);
  },

  /**
   * Admin: List registrations with pagination & filters
   */
  getRegistrations: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    return await ApiService.get('/winter-camp/registrations', { params });
  },

  /**
   * Admin: Update registration status or notes
   */
  updateStatus: async (id: string, status?: string, notes?: string) => {
    return await ApiService.patch(`/winter-camp/registrations/${id}/status`, { status, notes });
  },

  /**
   * Admin: Delete registration
   */
  deleteRegistration: async (id: string) => {
    return await ApiService.delete(`/winter-camp/registrations/${id}`);
  },
};

export default winterCampAPI;

