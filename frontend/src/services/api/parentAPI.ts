import { ApiService } from '../api';

export interface Parent {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  children: ChildLink[];
  address?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ChildLink {
  studentId: string;
  studentName: string;
  relationship: 'father' | 'mother' | 'guardian';
  schoolId?: string;
}

const parentAPI = {
  getParents: async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
      const response = await ApiService.get('/parents', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getParentById: async (id: string) => {
    try {
      const response = await ApiService.get(`/parents/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createParent: async (parentData: Partial<Parent>) => {
    try {
      const response = await ApiService.post('/parents', parentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateParent: async (id: string, parentData: Partial<Parent>) => {
    try {
      const response = await ApiService.put(`/parents/${id}`, parentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteParent: async (id: string) => {
    try {
      const response = await ApiService.delete(`/parents/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyProfile: async () => {
    try {
      const response = await ApiService.get('/parents/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addChild: async (childData: { studentId: string; relationship: string }) => {
    try {
      const response = await ApiService.post('/parents/children', childData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  removeChild: async (studentId: string) => {
    try {
      const response = await ApiService.delete(`/parents/children/${studentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default parentAPI;
