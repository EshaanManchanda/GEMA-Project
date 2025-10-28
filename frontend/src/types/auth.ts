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
  confirmPassword?: string;
  phone?: string;
  role?: 'customer' | 'vendor' | 'employee';
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  acceptTerms?: boolean;
  marketingConsent?: boolean;
}

// Registration API payload (matches backend expectation)
export interface RegisterAPIData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'customer' | 'vendor' | 'employee';
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

// Address interface
export interface Address {
  id?: string;
  label?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  poBox?: string; // UAE P.O. Box number
  makaniNumber?: string; // UAE Emirates Post code (Makani)
  country: string;
  isDefault: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Social links interface
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

// Security settings interface
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  securityAlerts: boolean;
  lastPasswordChange?: string;
  activeDevices?: Array<{
    id: string;
    device: string;
    browser: string;
    location: string;
    lastActive: string;
    current: boolean;
  }>;
}

// Privacy settings interface
export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showBirthDate: boolean;
  dataProcessingConsent: boolean;
  marketingEmails: boolean;
  thirdPartySharing: boolean;
}

// Enhanced user profile interface
export interface UserProfile extends Omit<User, 'preferences'> {
  addresses: Address[];
  socialLinks: SocialLinks;
  securitySettings: SecuritySettings;
  privacySettings: PrivacySettings;
  preferences: {
    language: string;
    currency: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      marketing: boolean;
      security: boolean;
      bookingReminders: boolean;
      eventUpdates: boolean;
    };
  };
  profileCompletion: number;
  lastActiveAt: string;
  memberSince: string;
}

// Profile update type
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bio?: string;
  addresses?: Address[];
  socialLinks?: SocialLinks;
  preferences?: {
    language?: string;
    currency?: string;
    timezone?: string;
    theme?: 'light' | 'dark' | 'auto';
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
  privacySettings?: PrivacySettings;
}

// Avatar upload type
export interface AvatarUploadData {
  file: File;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Email verification types
export interface VerifyEmailData {
  token: string;
}

export interface VerifyEmailOTPData {
  otp: string;
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

// Login Attempt Interface
export interface LoginAttempt {
  _id?: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  success: boolean;
}

// Two-Factor Authentication Interface
export interface TwoFactorAuth {
  enabled: boolean;
  backupCodes: string[];
}

// Email Verification Interface
export interface EmailVerification {
  otp?: string;
  expiresAt?: string;
}

// Vendor Payment Settings Interface
export interface VendorPaymentSettings {
  hasCustomStripeAccount: boolean;
  acceptsPlatformPayments: boolean;
  commissionRate: number;
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  minimumPayout: number;
  bankAccountDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
  };
}

// Business Hours Interface
export interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

// Social Media Interface
export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

// Employee Details Interface
export interface EmployeeDetails {
  employeeId: string;
  vendorId: string;
  employeeRole: 'manager' | 'scanner' | 'coordinator' | 'security';
  permissions?: Array<{
    action: string;
    scope: 'all' | 'assigned';
  }>;
  assignedEvents?: string[];
  assignedVenues?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: string;
}

// Social Login Interface
export interface SocialLogin {
  _id?: string;
  provider: 'google' | 'facebook' | 'apple' | 'github';
  providerId: string;
  email?: string;
  connectedAt: string;
}

// Admin User Interface (Complete database schema)
export interface AdminUser {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'vendor' | 'employee' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;
  twoFactorAuth?: TwoFactorAuth;
  emailVerification?: EmailVerification;
  vendorPaymentSettings?: VendorPaymentSettings;
  businessHours?: BusinessHours;
  socialMedia?: SocialMedia;
  favoriteEvents?: string[];
  addresses?: Address[];
  socialLogins?: SocialLogin[];
  loginAttempts?: LoginAttempt[];
  employeeDetails?: EmployeeDetails;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// Create User Request Interface
export interface CreateUserRequest {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;

  // Authentication
  password?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;

  // Role & Status
  role: 'customer' | 'vendor' | 'employee' | 'admin';
  status?: 'active' | 'inactive' | 'pending' | 'suspended';

  // Employee-specific
  employeeId?: string;
  employeeRole?: 'manager' | 'scanner' | 'coordinator' | 'security';
  vendorId?: string;
  permissions?: Array<{ action: string; scope: 'all' | 'assigned' }>;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: string;

  // Vendor-specific
  businessHours?: BusinessHours;
  socialMedia?: SocialMedia;
  vendorPaymentSettings?: VendorPaymentSettings;

  // Address
  addresses?: Address[];
}