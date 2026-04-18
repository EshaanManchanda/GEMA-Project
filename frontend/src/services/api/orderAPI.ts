import { ApiService } from '../api';

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  billingAddress?: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  _id: string;
  type: 'event' | 'course' | 'ticket';
  referenceId: string;
  title: string;
  quantity: number;
  price: number;
  total: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Address {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const orderAPI = {
  getOrders: async (params?: { page?: number; limit?: number; status?: OrderStatus }) => {
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

  createOrder: async (orderData: { items: OrderItem[]; billingAddress?: Address }) => {
    try {
      const response = await ApiService.post('/orders', orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateOrder: async (id: string, orderData: Partial<Order>) => {
    try {
      const response = await ApiService.put(`/orders/${id}`, orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  cancelOrder: async (id: string, reason?: string) => {
    try {
      const response = await ApiService.put(`/orders/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserOrders: async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await ApiService.get('/orders/my', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default orderAPI;
