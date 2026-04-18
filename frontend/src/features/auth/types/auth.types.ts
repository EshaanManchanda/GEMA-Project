export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  BLOG_WRITER = "blog_writer",
  SUPPORT_AGENT = "support_agent",
  CONTENT_MANAGER = "content_manager",
  FINANCE_MANAGER = "finance_manager",
  CUSTOMER = "customer",
  VENDOR = "vendor",
  EMPLOYEE = "employee",
  SCHOOL = "school",
  TEACHER = "teacher",
  STUDENT = "student",
  PARENT = "parent",
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
}
