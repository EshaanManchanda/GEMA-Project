import { ApiService } from '../api';

const bookingAPI = {
  // Orders (renamed from bookings to match backend API)
  createOrder: async (orderData: any) => {
    try {
      const response = await ApiService.post('/orders', orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserOrders: async (params?: any) => {
    try {
      const response = await ApiService.get('/orders', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrderById: async (id: string) => {
    try {
      const response = await ApiService.get(`/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  cancelOrder: async (id: string) => {
    try {
      const response = await ApiService.put(`/orders/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  requestRefund: async (id: string) => {
    try {
      const response = await ApiService.post(`/orders/${id}/refund`);
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