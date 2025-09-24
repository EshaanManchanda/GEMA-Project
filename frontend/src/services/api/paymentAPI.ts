import { ApiService } from '../api';

// Payment interfaces
export interface Payment {
  _id: string;
  userId: string;
  orderId: string;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethodType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentIntentId?: string;
  transactionId: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  paymentDetails: {
    cardLast4?: string;
    cardBrand?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    bankName?: string;
    walletType?: string;
  };
  billingAddress: BillingAddress;
  platformFee: number;
  gatewayFee: number;
  netAmount: number;
  refunds: PaymentRefund[];
  totalRefunded: number;
  authorizedAt?: string;
  capturedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  webhookEvents: WebhookEvent[];
  fraudScore?: number;
  fraudStatus?: 'low_risk' | 'medium_risk' | 'high_risk' | 'blocked';
  securityChecks: SecurityChecks;
  createdAt: string;
  updatedAt: string;
}

export type PaymentGateway = 'stripe' | 'paypal';
export type PaymentMethodType = 'credit_card' | 'debit_card' | 'digital_wallet' | 'bank_transfer' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

export interface BillingAddress {
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

export interface PaymentRefund {
  refundId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: string;
  createdAt: string;
}

export interface WebhookEvent {
  eventType: string;
  eventId: string;
  receivedAt: string;
  processed: boolean;
}

export interface SecurityChecks {
  cvvCheck?: 'pass' | 'fail' | 'unavailable';
  avsCheck?: 'pass' | 'fail' | 'partial' | 'unavailable';
  threeDSecure?: 'authenticated' | 'not_authenticated' | 'attempted' | 'unavailable';
}

export interface CreatePaymentData {
  orderId: string;
  gateway: PaymentGateway;
  paymentMethod: PaymentMethodType;
  amount: number;
  currency?: string;
  billingAddress: BillingAddress;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  nextAction?: any;
}

export interface PaymentMethodInfo {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    country: string;
    funding: string;
  };
  billingDetails: {
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postalCode?: string;
      state?: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  };
}

export interface RefundRequest {
  amount?: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface PaymentAnalytics {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  totalRefunded: number;
  averageAmount: number;
  byGateway: Array<{
    gateway: string;
    count: number;
    amount: number;
    successRate: number;
  }>;
  byMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  recentTransactions: Payment[];
}

const paymentAPI = {
  // Stripe Payment Intents
  createPaymentIntent: async (data: {
    orderId: string;
    amount: number;
    currency?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await ApiService.post('/payments/create-intent', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  confirmPaymentIntent: async (paymentIntentId: string, data?: {
    paymentMethod?: string;
    returnUrl?: string;
  }) => {
    try {
      const response = await ApiService.post(`/payments/confirm-intent/${paymentIntentId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPaymentIntent: async (paymentIntentId: string) => {
    try {
      const response = await ApiService.get(`/payments/intents/${paymentIntentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payment Methods
  getPaymentMethods: async (customerId?: string) => {
    try {
      const response = await ApiService.get('/payments/methods', {
        params: { customerId }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  attachPaymentMethod: async (paymentMethodId: string, customerId: string) => {
    try {
      const response = await ApiService.post('/payments/methods/attach', {
        paymentMethodId,
        customerId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  detachPaymentMethod: async (paymentMethodId: string) => {
    try {
      const response = await ApiService.post(`/payments/methods/${paymentMethodId}/detach`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  setDefaultPaymentMethod: async (paymentMethodId: string) => {
    try {
      const response = await ApiService.post('/payments/methods/set-default', {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Payment Operations
  createPayment: async (paymentData: CreatePaymentData) => {
    try {
      const response = await ApiService.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPayment: async (id: string) => {
    try {
      const response = await ApiService.get(`/payments/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserPayments: async (params?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    gateway?: PaymentGateway;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get('/payments/my', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPaymentsByOrder: async (orderId: string) => {
    try {
      const response = await ApiService.get(`/payments/order/${orderId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Refunds
  processRefund: async (paymentId: string, refundData: RefundRequest) => {
    try {
      const response = await ApiService.post(`/payments/${paymentId}/refund`, refundData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRefunds: async (paymentId: string) => {
    try {
      const response = await ApiService.get(`/payments/${paymentId}/refunds`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Webhooks
  handleWebhook: async (event: {
    id: string;
    type: string;
    data: any;
    created: number;
  }) => {
    try {
      const response = await ApiService.post('/payments/webhook', event);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customers
  createCustomer: async (data: {
    email: string;
    name?: string;
    phone?: string;
    address?: Partial<BillingAddress>;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await ApiService.post('/payments/customers', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCustomer: async (customerId: string) => {
    try {
      const response = await ApiService.get(`/payments/customers/${customerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCustomer: async (customerId: string, data: {
    email?: string;
    name?: string;
    phone?: string;
    address?: Partial<BillingAddress>;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await ApiService.put(`/payments/customers/${customerId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Setup Intents (for future payments)
  createSetupIntent: async (customerId: string, data?: {
    paymentMethodTypes?: string[];
    usage?: 'on_session' | 'off_session';
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await ApiService.post('/payments/setup-intents', {
        customerId,
        ...data
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  confirmSetupIntent: async (setupIntentId: string, paymentMethodId: string) => {
    try {
      const response = await ApiService.post(`/payments/setup-intents/${setupIntentId}/confirm`, {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get all payments
  getAllPayments: async (params?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    gateway?: PaymentGateway;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get('/payments', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get payment analytics
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    gateway?: PaymentGateway;
  }) => {
    try {
      const response = await ApiService.get('/payments/analytics/overview', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get successful payments
  getSuccessfulPayments: async (startDate?: string, endDate?: string) => {
    try {
      const response = await ApiService.get('/payments/successful', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Utility methods for frontend
  validatePaymentData: (paymentData: CreatePaymentData): boolean => {
    return !!(
      paymentData.orderId &&
      paymentData.amount > 0 &&
      paymentData.gateway &&
      paymentData.paymentMethod &&
      paymentData.billingAddress?.email &&
      paymentData.billingAddress?.firstName &&
      paymentData.billingAddress?.lastName
    );
  },

  formatAmount: (amount: number, currency: string = 'AED'): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  getPaymentStatusColor: (status: PaymentStatus): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
      case 'processing':
        return 'text-yellow-600';
      case 'failed':
      case 'cancelled':
        return 'text-red-600';
      case 'refunded':
      case 'partially_refunded':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  },

  getCardBrandIcon: (brand: string): string => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      diners: '💳',
      jcb: '💳',
      unionpay: '💳',
    };
    return icons[brand.toLowerCase()] || '💳';
  },
};

export default paymentAPI;