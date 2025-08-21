import { ApiService } from '../api';

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
      return response.data?.data?.events || [];
    } catch (error) {
      throw error;
    }
  },

  getVendorBookings: async (params?: any) => {
    try {
      const response = await ApiService.get('/vendors/bookings', { params });
      return response.data?.data?.bookings || [];
    } catch (error) {
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
};

export default vendorAPI;