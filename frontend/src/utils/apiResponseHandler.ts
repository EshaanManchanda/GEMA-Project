// Utility to handle standardized API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

/**
 * Extracts data from standardized API response format
 * Handles both new format { success: true, data: {...} } and legacy formats
 */
export const extractApiData = <T = any>(response: any): T => {
  // Handle axios response wrapper
  const responseData = response?.data || response;
  
  // Handle standardized API response format
  if (responseData && responseData.success && responseData.data) {
    return responseData.data;
  }
  
  // Handle direct data response (legacy format)
  if (responseData && typeof responseData === 'object') {
    return responseData;
  }
  
  // Fallback
  return response;
};

/**
 * Extracts event data specifically, handling nested event structure
 */
export const extractEventData = (response: any): any => {
  const data = extractApiData(response);
  
  // If data has an 'event' property, return that
  if (data && data.event) {
    return data.event;
  }
  
  // Otherwise return the data itself
  return data;
};

/**
 * Extracts events array, handling different response structures
 */
export const extractEventsData = (response: any): any[] => {
  const data = extractApiData(response);
  
  // If data has an 'events' property, return that
  if (data && Array.isArray(data.events)) {
    return data.events;
  }
  
  // If data itself is an array, return it
  if (Array.isArray(data)) {
    return data;
  }
  
  // Handle pagination wrapper { events: [], pagination: {} }
  if (data && data.events && Array.isArray(data.events)) {
    return data.events;
  }
  
  // Fallback to empty array
  return [];
};

/**
 * Checks if API response indicates success
 */
export const isApiSuccess = (response: any): boolean => {
  const responseData = response?.data || response;
  
  // Check standardized format
  if (responseData && typeof responseData.success === 'boolean') {
    return responseData.success;
  }
  
  // For legacy responses, assume success if we have data
  return !!responseData;
};

/**
 * Extracts error message from API response
 */
export const extractApiError = (response: any): string => {
  const responseData = response?.data || response;
  
  if (responseData?.error) {
    return responseData.error;
  }
  
  if (responseData?.message && !responseData?.success) {
    return responseData.message;
  }
  
  if (responseData?.errors && Array.isArray(responseData.errors)) {
    return responseData.errors.map((err: any) => err.message || err.msg || err).join(', ');
  }
  
  return 'An unknown error occurred';
};

/**
 * Extracts booking data specifically, handling nested booking structure
 */
export const extractBookingData = (response: any): any => {
  const data = extractApiData(response);

  // If data has a 'booking' property, return that
  if (data && data.booking) {
    return data.booking;
  }

  // Otherwise return the data itself
  return data;
};

/**
 * Logs API response for debugging (only in development with debug flag)
 */
export const logApiResponse = (endpoint: string, response: any, error?: any): void => {
  if (import.meta.env.VITE_DEV && import.meta.env.VITE_DEBUG_API === 'true') {
    if (error) {
      console.error(`[API Error] ${endpoint}:`, error);
    } else {
      console.log(`[API Success] ${endpoint}:`, response);
    }
  }
};