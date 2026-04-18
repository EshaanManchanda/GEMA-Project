import { ApiService } from '../api';

export interface School {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  vendorId?: string;
  teachers: string[];
  students: string[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

const schoolAPI = {
  getSchools: async (params?: { page?: number; limit?: number; search?: string; city?: string }) => {
    try {
      const response = await ApiService.get('/schools', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSchoolById: async (id: string) => {
    try {
      const response = await ApiService.get(`/schools/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createSchool: async (schoolData: Partial<School>) => {
    try {
      const response = await ApiService.post('/schools', schoolData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSchool: async (id: string, schoolData: Partial<School>) => {
    try {
      const response = await ApiService.put(`/schools/${id}`, schoolData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteSchool: async (id: string) => {
    try {
      const response = await ApiService.delete(`/schools/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMySchool: async () => {
    try {
      const response = await ApiService.get('/schools/my');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSchoolTeachers: async (schoolId: string, params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get(`/schools/${schoolId}/teachers`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSchoolStudents: async (schoolId: string, params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get(`/schools/${schoolId}/students`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default schoolAPI;
