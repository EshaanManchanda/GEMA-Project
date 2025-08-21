// Auth Types

// User type definition
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'vendor' | 'employee' | 'admin';
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bio?: string;
  preferences: {
    language: string;
    currency: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Login credentials type
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Registration data type
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

// Auth response from API
export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  // Keeping backward compatibility
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Password management types
export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Profile update type
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
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

// Email verification types
export interface VerifyEmailData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

// Phone verification types
export interface VerifyPhoneData {
  phone: string;
  code: string;
}

// Two-factor authentication types
export interface TwoFactorAuthData {
  token: string;
}

export interface DisableTwoFactorData {
  password: string;
}

// Account deletion type
export interface DeleteAccountData {
  password: string;
}