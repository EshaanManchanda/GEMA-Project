import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';
import type {
  TeacherDashboardStats,
  TeacherEarnings,
  TeacherPaymentInfo,
  TeacherProfileUpdateInput,
  TeachingEventCreateInput,
  TeacherBookingFilters,
  TeachingEventFilters,
  ITeacher,
  ITeachingEvent,
  ITeacherBooking,
} from '../../types/teacher';

/**
 * Teacher API Service
 * Handles all teacher-related API calls
 */
const teacherAPI = {
  // ==================== DASHBOARD ====================

  /**
   * Get teacher dashboard statistics
   */
  getDashboardStats: async (params?: { startDate?: string; endDate?: string }): Promise<TeacherDashboardStats> => {
    try {
      const response = await ApiService.get('/teachers/stats', { params });
      logApiResponse('GET /teachers/stats', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/stats', null, error);
      throw error;
    }
  },

  // ==================== PROFILE ====================

  /**
   * Get current teacher's profile
   */
  getProfile: async (): Promise<{ teacher: ITeacher; user: any }> => {
    try {
      const response = await ApiService.get('/teachers/profile');
      logApiResponse('GET /teachers/profile', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/profile', null, error);
      throw error;
    }
  },

  /**
   * Update teacher profile
   */
  updateProfile: async (data: TeacherProfileUpdateInput): Promise<{ teacher: ITeacher; user: any }> => {
    try {
      const response = await ApiService.put('/teachers/profile', data);
      logApiResponse('PUT /teachers/profile', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PUT /teachers/profile', null, error);
      throw error;
    }
  },

  /**
   * Get public list of teachers
   */
  getPublicTeachersList: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ teachers: any[]; pagination: any }> => {
    try {
      const response = await ApiService.get('/teachers/public', { params });
      logApiResponse('GET /teachers/public', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/public', null, error);
      throw error;
    }
  },

  /**
   * Get public teacher profile by ID
   */
  getPublicProfile: async (id: string): Promise<{ user: any; teacher: ITeacher; teachingEvents: ITeachingEvent[]; stats: any }> => {
    try {
      const response = await ApiService.get(`/teachers/public/${id}`);
      logApiResponse(`GET /teachers/public/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /teachers/public/${id}`, null, error);
      throw error;
    }
  },

  /**
   * Upload teacher media (profile image or demo video)
   */
  uploadMedia: async (file: File, mediaType: 'profile' | 'demoVideo' | 'cover' = 'profile'): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('mediaType', mediaType);

      const response = await ApiService.post('/teachers/upload-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      logApiResponse('POST /teachers/upload-media', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /teachers/upload-media', null, error);
      throw error;
    }
  },

  /**
   * Update availability hours
   */
  updateAvailabilityHours: async (availabilityHours: Record<string, { isAvailable: boolean; startTime?: string; endTime?: string }>): Promise<{ teacher: ITeacher }> => {
    try {
      const response = await ApiService.put('/teachers/availability-hours', { availabilityHours });
      logApiResponse('PUT /teachers/availability-hours', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PUT /teachers/availability-hours', null, error);
      throw error;
    }
  },

  /**
   * Update social links
   */
  updateSocialLinks: async (socialLinks: Record<string, string>): Promise<{ teacher: ITeacher }> => {
    try {
      const response = await ApiService.put('/teachers/social-links', { socialLinks });
      logApiResponse('PUT /teachers/social-links', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PUT /teachers/social-links', null, error);
      throw error;
    }
  },

  // ==================== TEACHING EVENTS ====================

  /**
   * Get teacher's teaching events
   */
  getTeachingEvents: async (params?: TeachingEventFilters): Promise<{ teachingEvents: ITeachingEvent[] }> => {
    try {
      const response = await ApiService.get('/teachers/events', { params });
      logApiResponse('GET /teachers/events', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/events', null, error);
      throw error;
    }
  },

  /**
   * Get single teaching event by ID
   */
  getTeachingEventById: async (id: string): Promise<{ teachingEvent: ITeachingEvent }> => {
    try {
      const response = await ApiService.get(`/teachers/events/${id}`);
      logApiResponse(`GET /teachers/events/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /teachers/events/${id}`, null, error);
      throw error;
    }
  },

  /**
   * Create a new teaching event
   */
  createTeachingEvent: async (data: TeachingEventCreateInput): Promise<{ teachingEvent: ITeachingEvent }> => {
    try {
      const response = await ApiService.post('/teachers/events', data);
      logApiResponse('POST /teachers/events', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /teachers/events', null, error);
      throw error;
    }
  },

  /**
   * Update a teaching event
   */
  updateTeachingEvent: async (id: string, data: Partial<TeachingEventCreateInput>): Promise<{ teachingEvent: ITeachingEvent }> => {
    try {
      const response = await ApiService.put(`/teachers/events/${id}`, data);
      logApiResponse(`PUT /teachers/events/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /teachers/events/${id}`, null, error);
      throw error;
    }
  },

  /**
   * Delete a teaching event (soft delete)
   */
  deleteTeachingEvent: async (id: string, permanent?: boolean): Promise<{ success: boolean }> => {
    try {
      const response = await ApiService.delete(`/teachers/events/${id}${permanent ? '?permanent=true' : ''}`);
      logApiResponse(`DELETE /teachers/events/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /teachers/events/${id}`, null, error);
      throw error;
    }
  },

  /**
   * Restore a deleted teaching event
   */
  restoreTeachingEvent: async (id: string): Promise<{ teachingEvent: ITeachingEvent }> => {
    try {
      const response = await ApiService.put(`/teachers/events/${id}/restore`);
      logApiResponse(`PUT /teachers/events/${id}/restore`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /teachers/events/${id}/restore`, null, error);
      throw error;
    }
  },

  // ==================== BOOKINGS ====================

  /**
   * Get teacher's bookings
   */
  getBookings: async (params?: TeacherBookingFilters): Promise<{
    Bookings: ITeacherBooking[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalBookings: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
    stats: {
      totalRevenue: number;
      totalBookings: number;
      confirmedBookings: number;
      cancelledBookings: number;
      paidBookings: number;
      pendingPayments: number;
    };
    teachingEvents: Array<{ _id: string; title: string }>;
  }> => {
    try {
      const response = await ApiService.get('/teachers/bookings', { params });
      logApiResponse('GET /teachers/bookings', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/bookings', null, error);
      throw error;
    }
  },

  /**
   * Get single booking by ID
   */
  getBookingById: async (id: string): Promise<{ Booking: ITeacherBooking }> => {
    try {
      const response = await ApiService.get(`/teachers/bookings/${id}`);
      logApiResponse(`GET /teachers/bookings/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /teachers/bookings/${id}`, null, error);
      throw error;
    }
  },

  /**
   * Update a booking (teacher notes, status, attendance)
   */
  updateBooking: async (id: string, data: { teacherNotes?: string; teacherStatus?: string; attendanceMarked?: boolean }): Promise<{ Booking: ITeacherBooking }> => {
    try {
      const response = await ApiService.put(`/teachers/bookings/${id}`, data);
      logApiResponse(`PUT /teachers/bookings/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /teachers/bookings/${id}`, null, error);
      throw error;
    }
  },

  /**
   * Export bookings to CSV or JSON
   */
  exportBookings: async (format: 'csv' | 'json' = 'csv', filters?: TeacherBookingFilters): Promise<{ success: boolean; message: string }> => {
    try {
      const params = { format, ...filters };
      const response = await ApiService.get('/teachers/bookings/export', {
        params,
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `teacher-bookings-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'CSV exported successfully' };
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `teacher-bookings-${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'JSON exported successfully' };
      }
    } catch (error) {
      logApiResponse('GET /teachers/bookings/export', null, error);
      throw error;
    }
  },

  /**
   * Import bookings from CSV data
   */
  importBookings: async (csvData: any[]): Promise<{ successful: string[]; failed: any[]; total: number }> => {
    try {
      const response = await ApiService.post('/teachers/bookings/import', { csvData });
      logApiResponse('POST /teachers/bookings/import', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /teachers/bookings/import', null, error);
      throw error;
    }
  },

  // ==================== PAYMENTS & PAYOUTS ====================

  /**
   * Get teacher payment info
   */
  getPaymentInfo: async (teacherId: string): Promise<TeacherPaymentInfo> => {
    try {
      const response = await ApiService.get(`/teachers/${teacherId}/payment-info`);
      logApiResponse(`GET /teachers/${teacherId}/payment-info`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /teachers/${teacherId}/payment-info`, null, error);
      throw error;
    }
  },

  /**
   * Get payout dashboard
   */
  getPayoutDashboard: async (): Promise<any> => {
    try {
      const response = await ApiService.get('/teachers/payouts/dashboard');
      logApiResponse('GET /teachers/payouts/dashboard', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/payouts/dashboard', null, error);
      throw error;
    }
  },

  /**
   * Get payout history
   */
  getPayoutHistory: async (params?: { page?: number; limit?: number; status?: string }): Promise<any> => {
    try {
      const response = await ApiService.get('/teachers/payouts/history', { params });
      logApiResponse('GET /teachers/payouts/history', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/payouts/history', null, error);
      throw error;
    }
  },

  /**
   * Request a payout
   */
  requestPayout: async (amount: number, currency?: string): Promise<any> => {
    try {
      const response = await ApiService.post('/teachers/payouts/request', { amount, currency });
      logApiResponse('POST /teachers/payouts/request', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /teachers/payouts/request', null, error);
      throw error;
    }
  },

  // ==================== STRIPE CONNECT ====================

  /**
   * Initialize Stripe Connect onboarding
   */
  initiateStripeConnect: async (): Promise<{ url: string; message?: string }> => {
    try {
      const response = await ApiService.post('/teachers/stripe-connect/onboard');
      logApiResponse('POST /teachers/stripe-connect/onboard', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /teachers/stripe-connect/onboard', null, error);
      throw error;
    }
  },

  /**
   * Get Stripe Connect status
   */
  getStripeConnectStatus: async (): Promise<{
    isOnboarded: boolean;
    accountId?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }> => {
    try {
      const response = await ApiService.get('/teachers/stripe-connect/status');
      logApiResponse('GET /teachers/stripe-connect/status', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/stripe-connect/status', null, error);
      throw error;
    }
  },

  /**
   * Save custom Stripe API keys
   */
  saveStripeApiKeys: async (secretKey: string, testMode: boolean): Promise<any> => {
    try {
      const response = await ApiService.put('/teachers/stripe-keys', {
        manualStripeKey: secretKey,
        isTestMode: testMode,
      });
      logApiResponse('PUT /teachers/stripe-keys', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PUT /teachers/stripe-keys', null, error);
      throw error;
    }
  },

  // ==================== SUBSCRIPTION ====================

  /**
   * Get subscription status
   */
  getSubscriptionStatus: async (): Promise<{
    status: string;
    plan?: string;
    expiresAt?: Date;
    amount?: number;
  }> => {
    try {
      const response = await ApiService.get('/teachers/subscription');
      logApiResponse('GET /teachers/subscription', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/subscription', null, error);
      throw error;
    }
  },

  /**
   * Pay for subscription
   */
  paySubscription: async (paymentMethodId?: string): Promise<{ success: boolean; subscriptionId?: string }> => {
    try {
      const response = await ApiService.post('/teachers/subscription/pay', { paymentMethodId });
      logApiResponse('POST /teachers/subscription/pay', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /teachers/subscription/pay', null, error);
      throw error;
    }
  },

  // ==================== BANK DETAILS ====================

  /**
   * Update bank details
   */
  updateBankDetails: async (bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber?: string;
    iban?: string;
    swiftCode?: string;
  }): Promise<any> => {
    try {
      const response = await ApiService.put('/teachers/bank-details', bankDetails);
      logApiResponse('PUT /teachers/bank-details', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PUT /teachers/bank-details', null, error);
      throw error;
    }
  },

  // ==================== EARNINGS ====================

  /**
   * Get earnings breakdown
   */
  getEarnings: async (params?: { startDate?: string; endDate?: string }): Promise<TeacherEarnings> => {
    try {
      const response = await ApiService.get('/teachers/payouts/pending-earnings', { params });
      logApiResponse('GET /teachers/payouts/pending-earnings', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /teachers/payouts/pending-earnings', null, error);
      throw error;
    }
  },
};

export default teacherAPI;
