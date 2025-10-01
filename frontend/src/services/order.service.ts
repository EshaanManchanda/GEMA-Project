import { ApiService } from './api';
import { CartItem, CartSummary } from '../store/slices/cartSlice';

// Types
export interface BillingInfo {
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

export interface OrderItem {
  eventId: string;
  eventTitle: string;
  scheduleDate?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  participants?: Array<{
    name: string;
    age?: number;
    specialRequirements?: string;
  }>;
}

export interface OrderData {
  items: OrderItem[];
  billingAddress: BillingInfo;
  paymentMethod: 'stripe' | 'paypal';
  couponCode?: string;
  notes?: string;
  source: 'web' | 'mobile' | 'admin' | 'vendor';
}

export interface PaymentIntentResponse {
  success: boolean;
  data?: {
    clientSecret: string;
    orderId: string;
  };
  error?: string;
}

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

  // Create a payment intent for cart checkout
  async createCartPaymentIntent(
    cartItems: CartItem[],
    cartSummary: CartSummary,
    billingInfo: BillingInfo,
    couponCode?: string
  ): Promise<PaymentIntentResponse> {
    try {
      const orderData: OrderData = {
        items: cartItems.map(item => ({
          eventId: item.event._id,
          eventTitle: item.event.title,
          scheduleDate: item.selectedDate || item.event.dateSchedule?.[0]?.date,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          currency: item.currency,
          participants: item.participants || []
        })),
        billingAddress: billingInfo,
        paymentMethod: 'stripe',
        couponCode,
        source: 'web'
      };

      const response = await ApiService.post(`${this.baseUrl}/payment-intent`, orderData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment intent'
      };
    }
  }

  // Create a new order
  async createOrder(orderData: OrderData): Promise<OrderResponse> {
    try {
      const response = await ApiService.post(this.baseUrl, orderData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order'
      };
    }
  }

  // Confirm cart payment
  async confirmCartPayment(paymentIntentId: string, orderId: string): Promise<OrderResponse> {
    try {
      const response = await ApiService.post(`${this.baseUrl}/confirm-payment`, {
        paymentIntentId,
        orderId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to confirm payment'
      };
    }
  }

  // Handle failed cart payment
  async handleFailedCartPayment(orderId: string, errorMessage: string): Promise<void> {
    try {
      await ApiService.post(`${this.baseUrl}/failed-payment`, {
        orderId,
        errorMessage
      });
    } catch (error) {
      console.error('Error handling failed payment:', error);
    }
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