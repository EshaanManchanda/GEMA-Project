import { UserRole } from "../models/index";

// User type for API responses
export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Login request type
export interface LoginRequest {
  email: string;
  password: string;
}

// Register request type
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: "customer" | "vendor" | "employee" | "teacher";
}

// Auth response type
export interface AuthResponse {
  user: UserResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Refresh token request type
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Forgot password request type
export interface ForgotPasswordRequest {
  email: string;
}

// Reset password request type
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Change password request type
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Update profile request type
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  bio?: string;
  preferences?: {
    language?: string;
    currency?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      marketing?: boolean;
      security?: boolean;
      bookingReminders?: boolean;
      eventUpdates?: boolean;
    };
  };
}

// Email verification request type
export interface VerifyEmailRequest {
  otp: string;
}

// Firebase auth request type
export interface FirebaseAuthRequest {
  idToken: string;
}
