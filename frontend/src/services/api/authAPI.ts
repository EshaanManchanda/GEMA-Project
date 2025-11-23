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
        phone: userData.phone,
        role: userData.role
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

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    try {
      const response = await ApiService.post('/auth/reset-password', { email, otp, newPassword });
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

  uploadAvatar: async (
    data: AvatarUploadData,
    onProgress?: (progress: number, stage: string) => void,
    retryAttempt: number = 0
  ): Promise<{ avatarUrl: string }> => {
    const MAX_RETRIES = 1;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    try {
      // Validate file size
      if (data.file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit. Please choose a smaller image.');
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(data.file.type)) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      }

      onProgress?.(5, 'Preparing upload...');

      // Step 1: Upload the file to get the URL
      const formData = new FormData();
      formData.append('avatar', data.file);

      onProgress?.(10, 'Uploading to server...');

      const uploadResponse = await ApiService.post('/uploads/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            // Map upload progress from 10% to 70%
            const percentCompleted = Math.round((progressEvent.loaded * 60) / progressEvent.total) + 10;
            onProgress?.(percentCompleted, 'Uploading and processing image...');
          }
        },
      });

      const avatarUrl = uploadResponse.data.url;
      onProgress?.(80, 'Updating profile...');

      // Step 2: Update the user's profile with the avatar URL
      const profileResponse = await ApiService.put('/auth/avatar', { avatar: avatarUrl });

      onProgress?.(100, 'Upload complete!');

      return { avatarUrl: profileResponse.data.avatar || avatarUrl };
    } catch (error: any) {
      // Retry logic for network errors
      if (retryAttempt < MAX_RETRIES && error.code === 'ERR_NETWORK') {
        console.log(`Retrying avatar upload (attempt ${retryAttempt + 1}/${MAX_RETRIES})...`);
        onProgress?.(0, 'Retrying upload...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return authAPI.uploadAvatar(data, onProgress, retryAttempt + 1);
      }

      // Enhance error messages
      if (error.response?.status === 413) {
        throw new Error('File too large. Please choose a smaller image.');
      } else if (error.response?.status === 415) {
        throw new Error('Unsupported file type. Please upload a JPG, PNG, or WebP image.');
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your connection and try again.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Upload failed. Please try again.');
      }
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

  updateAddress: async (addressIndex: number, address: Partial<Address>): Promise<Address> => {
    try {
      const response = await ApiService.put(`/auth/addresses/${addressIndex}`, address);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteAddress: async (addressIndex: number): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.delete(`/auth/addresses/${addressIndex}`);
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
  // Refresh token is now sent via httpOnly cookie automatically
  refreshToken: async (): Promise<AuthResponse> => {
    try {
      const response = await ApiService.post('/auth/refresh-token');
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

  // Phone Verification APIs
  sendPhoneVerificationOTP: async (phone: string) => {
    try {
      const response = await ApiService.post('/auth/send-phone-verification', { phone });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyPhoneOTP: async (otp: string) => {
    try {
      const response = await ApiService.post('/auth/verify-phone', { otp });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resendPhoneVerificationOTP: async () => {
    try {
      const response = await ApiService.post('/auth/resend-phone-verification');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Export default for backward compatibility
export default authAPI;