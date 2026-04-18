import api from '@shared/services/api/client';
import type { LoginCredentials, RegisterData, AuthResponse, ApiResponse, User } from '../types/auth.types';

export const authService = {
  login: (data: LoginCredentials) =>
    api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data),

  registerStudent: (data: any) =>
    api.post<AuthResponse>('/auth/register/student', data),

  registerParent: (data: any) =>
    api.post<AuthResponse>('/auth/register/parent', data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  verifyEmail: (otp: string, email: string) =>
    api.post('/auth/verify-email', { otp, email }),

  resendVerificationOTP: (email: string) =>
    api.post('/auth/resend-verification-otp', { email }),

  logout: () =>
    api.post('/auth/logout'),

  refreshToken: () =>
    api.post('/auth/refresh-token'),

  getCurrentUser: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  switchRole: (role: string) =>
    api.post('/auth/switch-role', { role }),

  getAvailableRoles: () =>
    api.get('/auth/available-roles'),

  updateProfile: (data: Partial<User>) =>
    api.put('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),

  uploadAvatar: (formData: FormData) =>
    api.put('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
