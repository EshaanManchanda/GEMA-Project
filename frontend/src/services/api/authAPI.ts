import { ApiService } from '../api';
import {
  LoginCredentials,
  RegisterData,
  RegisterAPIData,
  User,
  AuthResponse,
  VerifyEmailOTPData,
  UpdateProfileData,
  UserProfile,
  AvatarUploadData,
  Address,
  SecuritySettings,
  PrivacySettings
} from '@/types/auth';

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
      // Transform to match backend API expectations
      const apiData: RegisterAPIData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone
      };
      const response = await ApiService.post('/auth/register', apiData);
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

  updateProfile: async (userData: UpdateProfileData): Promise<UserProfile> => {
    try {
      const response = await ApiService.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFullProfile: async (): Promise<UserProfile> => {
    try {
      const response = await ApiService.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  uploadAvatar: async (data: AvatarUploadData): Promise<{ avatarUrl: string }> => {
    try {
      const formData = new FormData();
      formData.append('avatar', data.file);
      if (data.cropData) {
        formData.append('cropData', JSON.stringify(data.cropData));
      }

      const response = await ApiService.post('/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  removeAvatar: async (): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.delete('/auth/avatar');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addAddress: async (address: Omit<Address, 'id'>): Promise<Address> => {
    try {
      const response = await ApiService.post('/auth/addresses', address);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAddress: async (addressId: string, address: Partial<Address>): Promise<Address> => {
    try {
      const response = await ApiService.put(`/auth/addresses/${addressId}`, address);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteAddress: async (addressId: string): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.delete(`/auth/addresses/${addressId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSecuritySettings: async (settings: Partial<SecuritySettings>): Promise<SecuritySettings> => {
    try {
      const response = await ApiService.put('/auth/security', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePrivacySettings: async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
    try {
      const response = await ApiService.put('/auth/privacy', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSecuritySettings: async (): Promise<SecuritySettings> => {
    try {
      const response = await ApiService.get('/auth/security');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  enableTwoFactor: async (): Promise<{ qrCode: string; secret: string }> => {
    try {
      const response = await ApiService.post('/auth/2fa/enable');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyTwoFactor: async (token: string): Promise<{ backupCodes: string[] }> => {
    try {
      const response = await ApiService.post('/auth/2fa/verify', { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  disableTwoFactor: async (password: string): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.post('/auth/2fa/disable', { password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getActiveDevices: async (): Promise<Array<{
    id: string;
    device: string;
    browser: string;
    location: string;
    lastActive: string;
    current: boolean;
  }>> => {
    try {
      const response = await ApiService.get('/auth/devices');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  revokeDevice: async (deviceId: string): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.delete(`/auth/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportData: async (): Promise<{ downloadUrl: string }> => {
    try {
      const response = await ApiService.post('/auth/export-data');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteAccount: async (password: string, reason?: string): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.post('/auth/delete-account', { password, reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deactivateAccount: async (password: string): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.post('/auth/deactivate', { password });
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

  verifyEmailWithOTP: async (otp: string): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/verify-email', { otp });
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
      const response = await ApiService.post('/auth/resend-verification-email', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Export default for backward compatibility
export default authAPI;