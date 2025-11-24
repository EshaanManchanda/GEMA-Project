import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../store';
import { logoutUser, refreshToken } from '../store/slices/authSlice';

// API Configuration - using main backend server
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://gema-project.onrender.com/api';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 60000; // 60 seconds - increased to handle Render.com cold starts

// Debug logging (development only)
if (import.meta.env.VITE_MODE === 'development' && typeof window !== 'undefined') {
  console.log('🔧 API Configuration Debug:');
  console.log('- VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('- VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('- Final API_BASE_URL:', API_BASE_URL);
  console.log('- Environment Mode:', import.meta.env.VITE_MODE);
  console.log('- Is Dev:', import.meta.env.VITE_DEV);
  console.log('- Build Time:', __BUILD_TIME__);
  console.log('- Cache Bust ID:', __CACHE_BUST__);
  console.log('- Window Origin:', window.location.origin);
}

// Retry configuration
const RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const RETRY_MULTIPLIER = 2;

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

// Helper function to create request key for deduplication
const createRequestKey = (url: string, method: string, params?: any): string => {
  return `${method.toUpperCase()}:${url}:${JSON.stringify(params || {})}`;
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // IMPORTANT: Send cookies with every request for httpOnly cookie auth
});

// Request interceptor for deduplication and logging
// Note: Auth tokens are now sent via httpOnly cookies automatically (no need to set Authorization header)
api.interceptors.request.use(
  (config) => {
    // Log request for debugging
    if (import.meta.env.VITE_MODE === 'development') {
      console.log('[API Interceptor] Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        withCredentials: config.withCredentials // Cookies are sent automatically
      });
    }

    // Add request deduplication for GET requests (stats/dashboard endpoints)
    if (config.method?.toLowerCase() === 'get' && (
      config.url?.includes('/admin/') ||
      config.url?.includes('/analytics/') ||
      config.url?.includes('/stats')
    )) {
      const requestKey = createRequestKey(config.url || '', config.method, config.params);
      (config as any)._requestKey = requestKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function for exponential backoff delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Response interceptor to handle token refresh and retries
// Note: Token refresh now uses httpOnly cookies - no need to manually set tokens
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 (Unauthorized) errors with automatic token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh for auth endpoints (login, register, etc.)
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh-token') ||
        originalRequest.url?.includes('/auth/current') // Skip for getCurrentUser to avoid "No refresh token" error after logout
      ) {
        return Promise.reject(error);
      }

      try {
        console.log('[API] 401 error - Attempting token refresh via httpOnly cookie...');

        // Attempt to refresh token (refreshToken cookie is sent automatically)
        await store.dispatch(refreshToken()).unwrap();

        console.log('[API] Token refresh successful - Retrying original request...');

        // Retry original request (new accessToken cookie is sent automatically)
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[API] Token refresh failed - Logging out user:', refreshError);

        // Refresh failed, logout user
        store.dispatch(logoutUser());

        // Define public routes that should NOT redirect to login
        const publicPaths = [
          '/',
          '/events',
          '/blog',
          '/search',
          '/about',
          '/contact',
          '/faq',
          '/terms',
          '/privacy',
          '/help',
          '/partner-with-us',
          '/categories',
          '/collections',
          '/vendors',
          '/cart',
          '/payment/success',
          '/payment/cancel'
        ];

        const currentPath = window.location.pathname;

        // Check if current route is public
        const isPublicRoute = publicPaths.some(path => currentPath === path) ||
          currentPath.startsWith('/events/') ||
          currentPath.startsWith('/blog/') ||
          currentPath.startsWith('/categories/') ||
          currentPath.startsWith('/collections/') ||
          currentPath.startsWith('/vendors/');

        // Only redirect to login if we're on a protected route
        if (!isPublicRoute && !currentPath.includes('/login')) {
          console.log('[API] On protected route - Redirecting to login');
          window.location.href = '/login';
        } else if (isPublicRoute) {
          console.log('[API] On public route - Allowing access without redirect');
        }

        return Promise.reject(refreshError);
      }
    }
    
    // Handle proxy/connection errors differently from server errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const errorMessage = isTimeout
        ? 'Backend server is starting up (this may take 30-60 seconds on first request)'
        : 'Backend server is not responding';

      console.error(`[API] Connection ${isTimeout ? 'timeout' : 'refused'} - Backend may be waking up:`, error.message);

      // Emit connection error event for UI feedback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-connection-error', {
          detail: {
            message: errorMessage,
            isTimeout: isTimeout,
            timestamp: Date.now(),
            url: originalRequest.url
          }
        }));
      }

      return Promise.reject(new Error(errorMessage));
    }
    
    // Handle proxy-specific errors
    if (error.response?.status === 503 && error.config?.url?.includes('/api/')) {
      console.error('[API] Proxy error - API requests may be misconfigured');
      return Promise.reject(new Error('API proxy configuration error. Check Vite proxy settings.'));
    }
    
    // Handle 429 (Rate Limiting) and 5xx (Server) errors with retry logic
    // But only retry actual server errors, not proxy/connection issues
    if (
      (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status !== 503)) &&
      !originalRequest._retryCount &&
      originalRequest.retry !== false // Allow requests to opt out of retry
    ) {
      originalRequest._retryCount = 0;
    }
    
    if (originalRequest._retryCount < RETRY_ATTEMPTS) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(RETRY_MULTIPLIER, originalRequest._retryCount - 1);

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * retryDelay;
      const totalDelay = retryDelay + jitter;

      console.log(`API call failed, retrying in ${Math.round(totalDelay)}ms (attempt ${originalRequest._retryCount}/${RETRY_ATTEMPTS}) - Status: ${error.response?.status}, URL: ${originalRequest.url}`);

      // Emit a custom event for UI components to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-retry', {
          detail: {
            attempt: originalRequest._retryCount,
            maxAttempts: RETRY_ATTEMPTS,
            delay: Math.round(totalDelay),
            url: originalRequest.url,
            status: error.response?.status,
            method: originalRequest.method?.toUpperCase()
          }
        }));
      }

      await delay(totalDelay);
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

// Generic API methods
export class ApiService {
  static async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    // Check for request deduplication for admin/stats endpoints
    if (url.includes('/admin/') || url.includes('/analytics/') || url.includes('/stats')) {
      const requestKey = createRequestKey(url, 'GET', config?.params);

      // If there's already a pending request, return that promise
      if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
      }

      // Create new request and store it
      const requestPromise = api.get(url, config).then(
        (response) => {
          // Clean up the pending request
          pendingRequests.delete(requestKey);
          return response.data;
        },
        (error) => {
          // Clean up the pending request on error too
          pendingRequests.delete(requestKey);
          throw error;
        }
      );

      pendingRequests.set(requestKey, requestPromise);
      return requestPromise;
    }

    const response = await api.get(url, config);
    return response.data;
  }

  static async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await api.post(url, data, config);
    return response.data;
  }

  static async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await api.put(url, data, config);
    return response.data;
  }

  static async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await api.patch(url, data, config);
    return response.data;
  }

  static async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await api.delete(url, config);
    return response.data;
  }

  // File upload method
  static async upload<T = any>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  }

  // Multiple file upload method
  static async uploadMultiple<T = any>(
    url: string,
    files: File[],
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  }

  // Download file method
  static async download(
    url: string,
    filename?: string
  ): Promise<void> {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// Export the axios instance for direct use if needed
export default api;

export const getAdminBlogCategories = async () => {
  return await api.get(`/admin/blogs/categories`);
};