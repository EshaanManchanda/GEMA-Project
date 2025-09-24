import { ApiService } from '../api';
import { extractApiData, extractBookingData, logApiResponse } from '../../utils/apiResponseHandler';

export interface InitiateBookingData {
  eventId: string;
  dateScheduleId: string;
  seats: number;
  paymentMethod?: 'stripe' | 'paypal';
}

export interface ConfirmBookingData {
  paymentIntentId: string;
  orderId: string;
}

export interface BookingParticipant {
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  specialRequirements?: string;
  dietaryRestrictions?: string[];
}

const bookingAPI = {
  // New booking flow methods to match backend routes
  initiateBooking: async (bookingData: InitiateBookingData) => {
    try {
      const response = await ApiService.post('/bookings/initiate', bookingData);
      logApiResponse('POST /bookings/initiate', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /bookings/initiate', null, error);
      throw error;
    }
  },

  confirmBooking: async (confirmData: ConfirmBookingData) => {
    try {
      const response = await ApiService.post('/bookings/confirm', confirmData);
      logApiResponse('POST /bookings/confirm', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /bookings/confirm', null, error);
      throw error;
    }
  },

  getUserBookings: async (params?: any) => {
    try {
      const response = await ApiService.get('/bookings', { params });
      logApiResponse('GET /bookings', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /bookings', null, error);
      throw error;
    }
  },

  getBookingById: async (id: string) => {
    try {
      const response = await ApiService.get(`/bookings/${id}`);
      logApiResponse(`GET /bookings/${id}`, response);
      return extractBookingData(response);
    } catch (error) {
      logApiResponse(`GET /bookings/${id}`, null, error);
      throw error;
    }
  },

  cancelBooking: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.put(`/bookings/${id}/cancel`, { reason });
      logApiResponse(`PUT /bookings/${id}/cancel`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /bookings/${id}/cancel`, null, error);
      throw error;
    }
  },

  // Legacy methods for backward compatibility (using orders endpoint)
  createBooking: async (bookingData: any) => {
    try {
      const response = await ApiService.post('/orders', bookingData);
      logApiResponse('POST /orders', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /orders', null, error);
      throw error;
    }
  },

  updateBooking: async (id: string, bookingData: any) => {
    try {
      const response = await ApiService.put(`/orders/${id}`, bookingData);
      logApiResponse(`PUT /orders/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /orders/${id}`, null, error);
      throw error;
    }
  },

  confirmOrder: async (id: string) => {
    try {
      const response = await ApiService.put(`/orders/${id}/confirm`);
      logApiResponse(`PUT /orders/${id}/confirm`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /orders/${id}/confirm`, null, error);
      throw error;
    }
  },

  // Legacy methods for backward compatibility
  createOrder: async (orderData: any) => {
    return bookingAPI.createBooking(orderData);
  },

  getUserOrders: async (params?: any) => {
    return bookingAPI.getUserBookings(params);
  },

  getOrderById: async (id: string) => {
    return bookingAPI.getBookingById(id);
  },

  cancelOrder: async (id: string) => {
    return bookingAPI.cancelBooking(id);
  },

  requestRefund: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.post(`/orders/${id}/refund`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tickets
  getUserTickets: async () => {
    try {
      const response = await ApiService.get('/tickets');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTicketById: async (id: string) => {
    try {
      const response = await ApiService.get(`/tickets/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  transferTicket: async (id: string, transferData: any) => {
    try {
      const response = await ApiService.post(`/tickets/${id}/transfer`, transferData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resendTicket: async (id: string, method: 'email' | 'sms') => {
    try {
      const response = await ApiService.post(`/tickets/${id}/resend`, { method });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payment methods - initiate booking with payment intent
  createPaymentIntent: async (params: {
    eventId: string;
    participants: number;
    dateScheduleId?: string;
    couponCode?: string;
  }) => {
    try {
      const bookingParams = {
        eventId: params.eventId,
        dateScheduleId: params.dateScheduleId,
        seats: params.participants,
        paymentMethod: 'stripe'
      };
      const response = await ApiService.post('/bookings/initiate', bookingParams);
      logApiResponse('POST /bookings/initiate', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /bookings/initiate', null, error);
      throw error;
    }
  },

  confirmPayment: async (paymentIntentId: string, bookingData: any) => {
    try {
      const response = await ApiService.post('/payments/confirm', {
        paymentIntentId,
        ...bookingData
      });
      logApiResponse('POST /payments/confirm', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /payments/confirm', null, error);
      throw error;
    }
  },

  getPaymentMethods: async () => {
    try {
      const response = await ApiService.get('/payments/methods');
      logApiResponse('GET /payments/methods', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /payments/methods', null, error);
      throw error;
    }
  },

  // Booking stats and analytics
  getBookingStats: async () => {
    try {
      const response = await ApiService.get('/bookings/stats');
      logApiResponse('GET /bookings/stats', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /bookings/stats', null, error);
      throw error;
    }
  },

  // Check-in functionality
  checkIn: async (id: string, qrCode?: string) => {
    try {
      const response = await ApiService.post(`/bookings/${id}/checkin`, { qrCode });
      logApiResponse(`POST /bookings/${id}/checkin`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`POST /bookings/${id}/checkin`, null, error);
      throw error;
    }
  },
};

export default bookingAPI;