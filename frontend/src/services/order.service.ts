import { ApiService } from './api';

export interface OrderResponse {
  success: boolean;
  data?: {
    orderNumber: string;
    transactionId?: string;
  };
  error?: string;
}

class OrderService {
  private static instance: OrderService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = '/api/orders';
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  // Get order by ID
  async getOrder(orderId: string): Promise<OrderResponse> {
    try {
      const response = await ApiService.get(`${this.baseUrl}/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting order:', error);
      return {
        success: false,
        error: error.message || 'Failed to get order'
      };
    }
  }

  // Get user's orders
  async getUserOrders(page = 1, limit = 10): Promise<OrderResponse> {
    try {
      const response = await ApiService.get(`${this.baseUrl}/my-orders`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting user orders:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user orders'
      };
    }
  }
}

export const orderService = OrderService.getInstance();