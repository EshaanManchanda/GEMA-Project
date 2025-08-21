import { ApiService, ApiResponse } from './api';

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
  role: 'user' | 'vendor' | 'employee' | 'admin';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  preferences?: {
    language?: string;
    currency?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// Auth Service Class
export class AuthService {
  private static readonly BASE_PATH = '/auth';

  // Login user
  static async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return ApiService.post(`${this.BASE_PATH}/login`, data);
  }

  // Register user
  static async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return ApiService.post(`${this.BASE_PATH}/register`, data);
  }

  // Logout user
  static async logout(): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/logout`);
  }

  // Refresh token
  static async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return ApiService.post(`${this.BASE_PATH}/refresh`, { refreshToken });
  }

  // Forgot password
  static async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/forgot-password`, data);
  }

  // Reset password
  static async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/reset-password`, data);
  }

  // Change password
  static async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return ApiService.put(`${this.BASE_PATH}/change-password`, data);
  }

  // Get current user
  static async getCurrentUser(): Promise<ApiResponse<AuthResponse['user']>> {
    return ApiService.get(`${this.BASE_PATH}/me`);
  }

  // Update profile
  static async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<AuthResponse['user']>> {
    return ApiService.put(`${this.BASE_PATH}/profile`, data);
  }

  // Upload avatar
  static async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
    return ApiService.upload(`${this.BASE_PATH}/avatar`, file);
  }

  // Delete avatar
  static async deleteAvatar(): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/avatar`);
  }

  // Verify email
  static async verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/verify-email`, data);
  }

  // Resend email verification
  static async resendVerification(data: ResendVerificationRequest): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/resend-verification`, data);
  }

  // Send phone verification
  static async sendPhoneVerification(phone: string): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/send-phone-verification`, { phone });
  }

  // Verify phone
  static async verifyPhone(phone: string, code: string): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/verify-phone`, { phone, code });
  }

  // Enable two-factor authentication
  static async enableTwoFactor(): Promise<ApiResponse<{ qrCode: string; secret: string }>> {
    return ApiService.post(`${this.BASE_PATH}/2fa/enable`);
  }

  // Verify two-factor authentication setup
  static async verifyTwoFactor(token: string): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return ApiService.post(`${this.BASE_PATH}/2fa/verify`, { token });
  }

  // Disable two-factor authentication
  static async disableTwoFactor(password: string): Promise<ApiResponse<void>> {
    return ApiService.post(`${this.BASE_PATH}/2fa/disable`, { password });
  }

  // Generate new backup codes
  static async generateBackupCodes(): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return ApiService.post(`${this.BASE_PATH}/2fa/backup-codes`);
  }

  // Delete account
  static async deleteAccount(password: string): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/account`, {
      data: { password }
    });
  }

  // Get login history
  static async getLoginHistory(page = 1, limit = 10): Promise<ApiResponse<{
    logins: Array<{
      id: string;
      ip: string;
      userAgent: string;
      location?: string;
      success: boolean;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return ApiService.get(`${this.BASE_PATH}/login-history`, {
      params: { page, limit }
    });
  }

  // Get active sessions
  static async getActiveSessions(): Promise<ApiResponse<Array<{
    id: string;
    ip: string;
    userAgent: string;
    location?: string;
    current: boolean;
    lastActivity: string;
    createdAt: string;
  }>>> {
    return ApiService.get(`${this.BASE_PATH}/sessions`);
  }

  // Revoke session
  static async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/sessions/${sessionId}`);
  }

  // Revoke all sessions except current
  static async revokeAllSessions(): Promise<ApiResponse<void>> {
    return ApiService.delete(`${this.BASE_PATH}/sessions`);
  }
}

export default AuthService;