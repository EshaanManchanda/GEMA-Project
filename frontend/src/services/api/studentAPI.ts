import { ApiService } from '../api';

export interface Student {
  _id: string;
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  schoolId?: string;
  grade?: string;
  parentId?: string;
  enrollments: Enrollment[];
  certificates: string[];
  avatar?: string;
  status: 'active' | 'inactive' | 'graduated';
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  _id: string;
  courseId?: string;
  eventId?: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped';
  progress?: number;
}

const studentAPI = {
  getStudents: async (params?: { page?: number; limit?: number; search?: string; schoolId?: string }) => {
    try {
      const response = await ApiService.get('/students', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getStudentById: async (id: string) => {
    try {
      const response = await ApiService.get(`/students/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createStudent: async (studentData: Partial<Student>) => {
    try {
      const response = await ApiService.post('/students', studentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateStudent: async (id: string, studentData: Partial<Student>) => {
    try {
      const response = await ApiService.put(`/students/${id}`, studentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteStudent: async (id: string) => {
    try {
      const response = await ApiService.delete(`/students/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyProfile: async () => {
    try {
      const response = await ApiService.get('/students/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEnrollments: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/students/enrollments', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default studentAPI;
