import { ApiService } from '../api';

const bookingAPI = {
  // Bookings - Updated to match Redux slice expectations
  createBooking: async (bookingData: any) => {
    try {
      // Backend uses orders endpoint but frontend expects booking methods
      const response = await ApiService.post('/orders', bookingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserBookings: async (params?: any) => {
    try {
      const response = await ApiService.get('/orders', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getBookingById: async (id: string) => {
    try {
      const response = await ApiService.get(`/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateBooking: async (id: string, bookingData: any) => {
    try {
      const response = await ApiService.put(`/orders/${id}`, bookingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  cancelBooking: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.put(`/orders/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  confirmBooking: async (id: string) => {
    try {
      const response = await ApiService.put(`/orders/${id}/confirm`);
      return response.data;
    } catch (error) {
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

  // Payment
  createPaymentIntent: async (orderId: string) => {
    try {
      const response = await ApiService.post('/payments/create-intent', { orderId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPaymentMethods: async () => {
    try {
      const response = await ApiService.get('/payments/methods');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default bookingAPI;