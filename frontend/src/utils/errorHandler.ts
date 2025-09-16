// Comprehensive Error Handling Utility
import toast from 'react-hot-toast';
import { logger } from './logger';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  eventId?: string;
  additionalData?: any;
}

/**
 * Standardized error handler for API responses
 */
export class ErrorHandler {
  /**
   * Handle and log API errors
   */
  static handleApiError(error: any, context?: ErrorContext): ApiError {
    let apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: 500
    };

    // Extract error information from different error formats
    if (error?.response) {
      // Axios error with response
      apiError.status = error.response.status;
      apiError.message = this.extractErrorMessage(error.response.data);
      apiError.details = error.response.data;
    } else if (error?.request) {
      // Network error
      apiError.status = 0;
      apiError.message = 'Unable to connect to server. Please check your internet connection.';
    } else if (error instanceof Error) {
      // Standard JavaScript error
      apiError.message = error.message;
    } else if (typeof error === 'string') {
      // String error
      apiError.message = error;
    }

    // Log error with context
    logger.error('API Error occurred', {
      error: apiError,
      context,
      originalError: error
    });

    return apiError;
  }

  /**
   * Extract error message from various API response formats
   */
  private static extractErrorMessage(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (data?.error) {
      return data.error;
    }

    if (data?.message) {
      return data.message;
    }

    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map((err: any) => 
        err.message || err.msg || err.toString()
      ).join(', ');
    }

    if (data?.details) {
      return data.details;
    }

    return 'An unexpected error occurred';
  }

  /**
   * Show user-friendly error toast
   */
  static showErrorToast(error: ApiError | string, context?: ErrorContext): void {
    const message = typeof error === 'string' ? error : error.message;
    
    // Show appropriate toast based on error type
    if (typeof error === 'object' && error.status) {
      switch (error.status) {
        case 401:
          toast.error('Please log in to continue');
          break;
        case 403:
          toast.error('You don\'t have permission to perform this action');
          break;
        case 404:
          toast.error('The requested item was not found');
          break;
        case 429:
          toast.error('Too many requests. Please try again later');
          break;
        case 500:
        case 502:
        case 503:
          toast.error('Server error. Please try again later');
          break;
        default:
          toast.error(message);
      }
    } else {
      toast.error(message);
    }
  }

  /**
   * Handle component errors (for error boundaries)
   */
  static handleComponentError(error: Error, errorInfo: any, context?: ErrorContext): void {
    logger.error('Component Error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo,
      context
    });

    // In development, also log to console for easier debugging
    if (import.meta.env.MODE === 'development') {
      console.error('Component Error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  /**
   * Handle async operation errors with loading states
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    options?: {
      context?: ErrorContext;
      showErrorToast?: boolean;
      onError?: (error: ApiError) => void;
      onLoading?: (loading: boolean) => void;
    }
  ): Promise<T | null> {
    try {
      options?.onLoading?.(true);
      const result = await operation();
      return result;
    } catch (error) {
      const apiError = this.handleApiError(error, options?.context);
      
      if (options?.showErrorToast !== false) {
        this.showErrorToast(apiError, options?.context);
      }
      
      options?.onError?.(apiError);
      return null;
    } finally {
      options?.onLoading?.(false);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number;
      delay?: number;
      backoffMultiplier?: number;
      context?: ErrorContext;
    }
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoffMultiplier = 2,
      context
    } = options || {};

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const retryDelay = delay * Math.pow(backoffMultiplier, attempt);
        
        logger.warn(`Operation failed, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          error,
          context,
          attempt: attempt + 1,
          maxRetries,
          delay: retryDelay
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw lastError;
  }

  /**
   * Validate required fields and show appropriate errors
   */
  static validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[],
    fieldLabels?: Record<string, string>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    requiredFields.forEach(field => {
      const value = data[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        const label = fieldLabels?.[field] || field;
        errors.push(`${label} is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle form validation errors
   */
  static handleValidationErrors(errors: string[], showToast = true): void {
    if (errors.length === 0) return;

    const errorMessage = errors.length === 1 
      ? errors[0] 
      : `Please fix the following errors: ${errors.join(', ')}`;

    if (showToast) {
      toast.error(errorMessage);
    }

    logger.warn('Validation errors', { errors });
  }
}

/**
 * Custom hook for error handling in components
 */
export const useErrorHandler = () => {
  const handleError = (error: any, context?: ErrorContext) => {
    return ErrorHandler.handleApiError(error, context);
  };

  const showError = (error: ApiError | string, context?: ErrorContext) => {
    ErrorHandler.showErrorToast(error, context);
  };

  const handleAsync = <T>(
    operation: () => Promise<T>,
    options?: Parameters<typeof ErrorHandler.handleAsyncOperation>[1]
  ) => {
    return ErrorHandler.handleAsyncOperation(operation, options);
  };

  return {
    handleError,
    showError,
    handleAsync
  };
};

export default ErrorHandler;