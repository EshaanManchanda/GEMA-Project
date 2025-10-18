// Order type definitions matching backend Order model

export interface IParticipant {
  name: string;
  age: number;
  gender?: 'male' | 'female' | 'other';
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialRequirements?: string;
}

export interface IOrderItem {
  _id?: string;
  eventId: string;
  eventTitle: string;
  scheduleDate: string | Date;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  participants?: IParticipant[];
}

export interface IOrder {
  _id: string;
  userId: string;
  orderNumber: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'stripe' | 'paypal' | 'razorpay' | 'test';
  paymentIntentId?: string;
  transactionId?: string;
  affiliateCode?: string;
  couponCode?: string;
  couponDiscount?: number;
  serviceFee?: number;

  // Payment routing fields
  paymentRouting: {
    usesVendorStripe: boolean;
    vendorStripeAccountId?: string;
    platformCommission?: number;
    vendorPayout?: number;
    stripeApplicationFee?: number;
  };

  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  notes?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string | Date;
  confirmedAt?: string | Date;
  cancelledAt?: string | Date;

  // Enhanced features
  specialRequests?: string;
  accessibilityNeeds?: string[];
  dietaryRestrictions?: string[];

  // Admin commission tracking
  adminCommission: {
    rate: number;
    amount: number;
    revenueTransactionId?: string;
    calculatedAt: string | Date;
  };

  // Revenue metadata
  revenueMetadata: {
    revenueStream: 'booking' | 'addon' | 'subscription';
    category?: string;
    vendorSubscriptionTier?: string;
    commissionSource: 'platform_fee' | 'service_fee' | 'addon_fee';
  };

  // Check-in functionality
  checkIn?: {
    checkedInAt: string | Date;
    checkedInBy: string;
    notes?: string;
  };

  // Communication logs
  communications: Array<{
    type: 'email' | 'sms' | 'push' | 'call';
    subject?: string;
    message: string;
    sentAt: string | Date;
    status: 'sent' | 'delivered' | 'failed' | 'bounced';
    metadata?: any;
  }>;

  // Source tracking
  source: 'web' | 'mobile' | 'admin' | 'vendor';
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;

  createdAt: string | Date;
  updatedAt: string | Date;
}

// Query parameters for getAllOrders
export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  sortBy?: 'createdAt' | 'total' | 'status' | 'paymentStatus';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventId?: string;
}

// Response from getAllOrders
export interface GetOrdersResponse {
  success: boolean;
  data: {
    orders: IOrder[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalOrders: number;
      limit: number;
    };
  };
  message?: string;
}

// Single order response
export interface GetOrderResponse {
  success: boolean;
  data: {
    order: IOrder;
  };
  message?: string;
}

// Order analytics response
export interface OrderAnalyticsResponse {
  success: boolean;
  data: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    confirmedOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
    averageOrderValue: number;
    revenueByPeriod: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    ordersByStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    topEvents: Array<{
      eventId: string;
      eventTitle: string;
      totalOrders: number;
      totalRevenue: number;
    }>;
  };
  message?: string;
}

// Bulk update response
export interface BulkUpdateOrdersResponse {
  success: boolean;
  data: {
    successful: string[];
    failed: Array<{
      orderId: string;
      reason: string;
    }>;
  };
  message?: string;
}

// Create order data
export interface CreateOrderData {
  items: Array<{
    eventId: string;
    scheduleDate: string;
    quantity: number;
  }>;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  couponCode?: string;
  affiliateCode?: string;
}

// Update order data
export interface UpdateOrderData {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  billingAddress?: Partial<IOrder['billingAddress']>;
  specialRequests?: string;
  accessibilityNeeds?: string[];
  dietaryRestrictions?: string[];
}

// Refund order data
export interface RefundOrderData {
  amount?: number;
  reason?: string;
}
