import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

export interface VendorPaymentInfo {
  hasCustomStripeAccount: boolean;
  usesVendorStripe: boolean;
  commissionRate: number;
  acceptsPlatformPayments: boolean;
}

const vendorAPI = {
  getAllVendors: async (params?: any) => {
    try {
      const response = await ApiService.get('/vendors', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVendorById: async (id: string) => {
    try {
      const response = await ApiService.get(`/vendors/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get public vendor profile (no authentication required)
  getPublicVendorProfile: async (id: string) => {
    try {
      const response = await ApiService.get(`/vendors/public/${id}`);
      logApiResponse(`GET /vendors/public/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /vendors/public/${id}`, null, error);
      throw error;
    }
  },

  getFeaturedVendors: async () => {
    try {
      const response = await ApiService.get('/vendors/featured');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // For vendor dashboard
  getVendorEvents: async () => {
    try {
      const response = await ApiService.get('/vendors/events');
      return response.data?.events || [];
    } catch (error) {
      throw error;
    }
  },

  getVendorBookings: async (params?: any) => {
    try {
      const response = await ApiService.get('/vendors/bookings', { params });
      logApiResponse('GET /vendors/bookings', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /vendors/bookings', null, error);
      throw error;
    }
  },

  getVendorBookingById: async (id: string) => {
    try {
      const response = await ApiService.get(`/vendors/bookings/${id}`);
      logApiResponse(`GET /vendors/bookings/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /vendors/bookings/${id}`, null, error);
      throw error;
    }
  },

  updateVendorBooking: async (id: string, data: { vendorNotes?: string; vendorStatus?: string; isFulfilled?: boolean }) => {
    try {
      const response = await ApiService.put(`/vendors/bookings/${id}`, data);
      logApiResponse(`PUT /vendors/bookings/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /vendors/bookings/${id}`, null, error);
      throw error;
    }
  },

  exportVendorBookings: async (format: 'csv' | 'json' = 'csv', filters?: any) => {
    try {
      const params = { format, ...filters };
      const response = await ApiService.get('/vendors/bookings/export', {
        params,
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Create download link for CSV
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bookings-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'CSV exported successfully' };
      } else {
        // For JSON, trigger download
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bookings-${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'JSON exported successfully' };
      }
    } catch (error) {
      logApiResponse('GET /vendors/bookings/export', null, error);
      throw error;
    }
  },

  importVendorBookings: async (csvData: any[]) => {
    try {
      const response = await ApiService.post('/vendors/bookings/import', { csvData });
      logApiResponse('POST /vendors/bookings/import', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /vendors/bookings/import', null, error);
      throw error;
    }
  },

  getVendorStats: async () => {
    try {
      const response = await ApiService.get('/vendors/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current vendor's profile
  getVendorProfile: async () => {
    try {
      const response = await ApiService.get('/vendors/profile');
      return response.data?.data || response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVendorProfile: async (profileData: any) => {
    try {
      const response = await ApiService.put('/vendors/profile', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload vendor images (avatar)
  uploadVendorImage: async (avatarFile: File) => {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await ApiService.post('/vendors/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update vendor business hours
  updateBusinessHours: async (businessHours: Record<string, string>) => {
    try {
      const response = await ApiService.put('/vendors/business-hours', { businessHours });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update vendor social media links
  updateSocialMedia: async (socialMedia: Record<string, string>) => {
    try {
      const response = await ApiService.put('/vendors/social-media', { socialMedia });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // For becoming a vendor
  applyForVendor: async (applicationData: any) => {
    try {
      const response = await ApiService.post('/vendors/apply', applicationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get vendor payment information for fee calculation
  getVendorPaymentInfo: async (vendorId: string) => {
    try {
      const response = await ApiService.get(`/vendors/${vendorId}/payment-info`);
      logApiResponse(`GET /vendors/${vendorId}/payment-info`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /vendors/${vendorId}/payment-info`, null, error);
      throw error;
    }
  },

  // Check if service fee applies for this vendor
  checkServiceFee: async (vendorId: string, amount: number) => {
    try {
      const response = await ApiService.post('/vendors/check-service-fee', {
        vendorId,
        amount
      });
      logApiResponse('POST /vendors/check-service-fee', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /vendors/check-service-fee', null, error);
      throw error;
    }
  },

  // Vendor Event CRUD operations
  getVendorEventById: async (id: string) => {
    try {
      const response = await ApiService.get(`/vendors/events/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createVendorEvent: async (eventData: any) => {
    try {
      const response = await ApiService.post('/vendors/events', eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVendorEvent: async (id: string, eventData: any) => {
    try {
      const response = await ApiService.put(`/vendors/events/${id}`, eventData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteVendorEvent: async (id: string, permanent?: boolean) => {
    try {
      const response = await ApiService.delete(`/vendors/events/${id}${permanent ? '?permanent=true' : ''}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  restoreVendorEvent: async (id: string) => {
    try {
      const response = await ApiService.put(`/vendors/events/${id}/restore`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default vendorAPI;