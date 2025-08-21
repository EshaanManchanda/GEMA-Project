import { ApiService } from '../api';
import { LoginCredentials, RegisterData, User, AuthResponse } from '@/types/auth';

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logout: async (): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  firebaseAuth: async (idToken: string): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/firebase', { idToken });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const response = await ApiService.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resetPassword: async (token: string, password: string) => {
    try {
      const response = await ApiService.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await ApiService.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    try {
      const response = await ApiService.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/refresh-token', { refreshToken });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyEmail: async (token: string): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  authenticateWithFirebase: async (idToken: string): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/firebase', { idToken });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendVerificationEmail: async (email: string) => {
    try {
      const response = await ApiService.post('/auth/send-verification', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Export default for backward compatibility
export default authAPI;