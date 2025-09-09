import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { paymentAPI } from '../../services/api/index';
import type { 
  Payment,
  PaymentIntent, 
  PaymentMethodInfo,
  CreatePaymentData,
  BillingAddress,
  PaymentAnalytics,
  PaymentGateway,
  PaymentStatus
} from '../../services/api/index';
import { toast } from 'react-hot-toast';

interface PaymentsState {
  payments: Payment[];
  userPayments: Payment[];
  currentPayment: Payment | null;
  paymentIntent: PaymentIntent | null;
  paymentMethods: PaymentMethodInfo[];
  paymentAnalytics: PaymentAnalytics | null;
  recentTransactions: Payment[];
  isLoading: boolean;
  isProcessing: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isRefunding: boolean;
  isFetchingMethods: boolean;
  error: string | null;
  processingError: string | null;
}

const initialState: PaymentsState = {
  payments: [],
  userPayments: [],
  currentPayment: null,
  paymentIntent: null,
  paymentMethods: [],
  paymentAnalytics: null,
  recentTransactions: [],
  isLoading: false,
  isProcessing: false,
  isCreating: false,
  isUpdating: false,
  isRefunding: false,
  isFetchingMethods: false,
  error: null,
  processingError: null,
};

// Async thunks
export const createPaymentIntent = createAsyncThunk(
  'payments/createPaymentIntent',
  async (data: {
    orderId: string;
    amount: number;
    currency?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, any>;
  }, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.createPaymentIntent(data);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create payment intent';
      return rejectWithValue(message);
    }
  }
);

export const confirmPaymentIntent = createAsyncThunk(
  'payments/confirmPaymentIntent',
  async (params: {
    paymentIntentId: string;
    paymentMethod?: string;
    returnUrl?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.confirmPaymentIntent(
        params.paymentIntentId, 
        {
          paymentMethod: params.paymentMethod,
          returnUrl: params.returnUrl
        }
      );
      toast.success('Payment confirmed successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to confirm payment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchPaymentIntent = createAsyncThunk(
  'payments/fetchPaymentIntent',
  async (paymentIntentId: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getPaymentIntent(paymentIntentId);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payment intent';
      return rejectWithValue(message);
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'payments/fetchPaymentMethods',
  async (customerId?: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getPaymentMethods(customerId);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payment methods';
      return rejectWithValue(message);
    }
  }
);

export const attachPaymentMethod = createAsyncThunk(
  'payments/attachPaymentMethod',
  async (params: {
    paymentMethodId: string;
    customerId: string;
  }, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.attachPaymentMethod(params.paymentMethodId, params.customerId);
      toast.success('Payment method added successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to attach payment method';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const detachPaymentMethod = createAsyncThunk(
  'payments/detachPaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.detachPaymentMethod(paymentMethodId);
      toast.success('Payment method removed successfully!');
      return paymentMethodId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove payment method';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const setDefaultPaymentMethod = createAsyncThunk(
  'payments/setDefaultPaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.setDefaultPaymentMethod(paymentMethodId);
      toast.success('Default payment method updated!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to set default payment method';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createPayment = createAsyncThunk(
  'payments/createPayment',
  async (paymentData: CreatePaymentData, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.createPayment(paymentData);
      toast.success('Payment created successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create payment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchPayment = createAsyncThunk(
  'payments/fetchPayment',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getPayment(id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payment';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserPayments = createAsyncThunk(
  'payments/fetchUserPayments',
  async (params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    gateway?: PaymentGateway;
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getUserPayments(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch user payments';
      return rejectWithValue(message);
    }
  }
);

export const fetchPaymentsByOrder = createAsyncThunk(
  'payments/fetchPaymentsByOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getPaymentsByOrder(orderId);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payments for order';
      return rejectWithValue(message);
    }
  }
);

export const processRefund = createAsyncThunk(
  'payments/processRefund',
  async (params: {
    paymentId: string;
    amount?: number;
    reason: string;
    metadata?: Record<string, any>;
  }, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.processRefund(params.paymentId, {
        amount: params.amount,
        reason: params.reason,
        metadata: params.metadata
      });
      toast.success('Refund processed successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to process refund';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchRefunds = createAsyncThunk(
  'payments/fetchRefunds',
  async (paymentId: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getRefunds(paymentId);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch refunds';
      return rejectWithValue(message);
    }
  }
);

export const createCustomer = createAsyncThunk(
  'payments/createCustomer',
  async (data: {
    email: string;
    name?: string;
    phone?: string;
    address?: Partial<BillingAddress>;
    metadata?: Record<string, any>;
  }, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.createCustomer(data);
      toast.success('Customer created successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create customer';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCustomer = createAsyncThunk(
  'payments/fetchCustomer',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getCustomer(customerId);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch customer';
      return rejectWithValue(message);
    }
  }
);

export const createSetupIntent = createAsyncThunk(
  'payments/createSetupIntent',
  async (params: {
    customerId: string;
    paymentMethodTypes?: string[];
    usage?: 'on_session' | 'off_session';
    metadata?: Record<string, any>;
  }, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.createSetupIntent(params.customerId, {
        paymentMethodTypes: params.paymentMethodTypes,
        usage: params.usage,
        metadata: params.metadata
      });
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create setup intent';
      return rejectWithValue(message);
    }
  }
);

export const fetchAllPayments = createAsyncThunk(
  'payments/fetchAllPayments',
  async (params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    gateway?: PaymentGateway;
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getAllPayments(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payments';
      return rejectWithValue(message);
    }
  }
);

export const fetchPaymentAnalytics = createAsyncThunk(
  'payments/fetchPaymentAnalytics',
  async (params: {
    startDate?: string;
    endDate?: string;
    gateway?: PaymentGateway;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getAnalytics(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payment analytics';
      return rejectWithValue(message);
    }
  }
);

export const fetchSuccessfulPayments = createAsyncThunk(
  'payments/fetchSuccessfulPayments',
  async (params: {
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.getSuccessfulPayments(params.startDate, params.endDate);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch successful payments';
      return rejectWithValue(message);
    }
  }
);

// Payments slice
const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.processingError = null;
    },
    clearPaymentIntent: (state) => {
      state.paymentIntent = null;
    },
    setCurrentPayment: (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
    },
    clearPayments: (state) => {
      state.payments = [];
      state.userPayments = [];
    },
    updatePaymentInList: (state, action: PayloadAction<Payment>) => {
      const updateLists = (payments: Payment[]) => {
        const index = payments.findIndex(payment => payment._id === action.payload._id);
        if (index !== -1) {
          payments[index] = action.payload;
        }
      };

      updateLists(state.payments);
      updateLists(state.userPayments);
      updateLists(state.recentTransactions);

      if (state.currentPayment && state.currentPayment._id === action.payload._id) {
        state.currentPayment = action.payload;
      }
    },
    removePaymentFromLists: (state, action: PayloadAction<string>) => {
      state.payments = state.payments.filter(payment => payment._id !== action.payload);
      state.userPayments = state.userPayments.filter(payment => payment._id !== action.payload);
      state.recentTransactions = state.recentTransactions.filter(payment => payment._id !== action.payload);

      if (state.currentPayment && state.currentPayment._id === action.payload) {
        state.currentPayment = null;
      }
    },
    addRecentTransaction: (state, action: PayloadAction<Payment>) => {
      state.recentTransactions.unshift(action.payload);
      // Keep only latest 10 transactions
      if (state.recentTransactions.length > 10) {
        state.recentTransactions = state.recentTransactions.slice(0, 10);
      }
    },
  },
  extraReducers: (builder) => {
    // Create Payment Intent
    builder
      .addCase(createPaymentIntent.pending, (state) => {
        state.isProcessing = true;
        state.processingError = null;
      })
      .addCase(createPaymentIntent.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.paymentIntent = action.payload;
        state.processingError = null;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.isProcessing = false;
        state.processingError = action.payload as string;
      })

      // Confirm Payment Intent
      .addCase(confirmPaymentIntent.pending, (state) => {
        state.isProcessing = true;
        state.processingError = null;
      })
      .addCase(confirmPaymentIntent.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.paymentIntent = action.payload;
        state.processingError = null;
      })
      .addCase(confirmPaymentIntent.rejected, (state, action) => {
        state.isProcessing = false;
        state.processingError = action.payload as string;
      })

      // Fetch Payment Intent
      .addCase(fetchPaymentIntent.fulfilled, (state, action) => {
        state.paymentIntent = action.payload;
      })

      // Fetch Payment Methods
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.isFetchingMethods = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.isFetchingMethods = false;
        state.paymentMethods = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.isFetchingMethods = false;
        state.error = action.payload as string;
      })

      // Attach Payment Method
      .addCase(attachPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods.push(action.payload);
      })

      // Detach Payment Method
      .addCase(detachPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods = state.paymentMethods.filter(
          method => method.id !== action.payload
        );
      })

      // Set Default Payment Method
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        // Update the payment methods list to reflect the new default
        state.paymentMethods = state.paymentMethods.map(method => ({
          ...method,
          // This would depend on the actual API response structure
        }));
      })

      // Create Payment
      .addCase(createPayment.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.isCreating = false;
        state.payments.unshift(action.payload);
        state.userPayments.unshift(action.payload);
        paymentsSlice.caseReducers.addRecentTransaction(state, { payload: action.payload, type: '' });
        state.error = null;
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Fetch Payment
      .addCase(fetchPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPayment = action.payload;
        state.error = null;
      })
      .addCase(fetchPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentPayment = null;
      })

      // Fetch User Payments
      .addCase(fetchUserPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userPayments = action.payload;
        state.error = null;
      })
      .addCase(fetchUserPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Payments by Order
      .addCase(fetchPaymentsByOrder.fulfilled, (state, action) => {
        // Add or update payments related to specific order
        action.payload.forEach((payment: Payment) => {
          paymentsSlice.caseReducers.updatePaymentInList(state, { payload: payment, type: '' });
        });
      })

      // Process Refund
      .addCase(processRefund.pending, (state) => {
        state.isRefunding = true;
        state.error = null;
      })
      .addCase(processRefund.fulfilled, (state, action) => {
        state.isRefunding = false;
        paymentsSlice.caseReducers.updatePaymentInList(state, { payload: action.payload, type: '' });
        state.error = null;
      })
      .addCase(processRefund.rejected, (state, action) => {
        state.isRefunding = false;
        state.error = action.payload as string;
      })

      // Fetch All Payments (Admin)
      .addCase(fetchAllPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload;
        state.error = null;
      })
      .addCase(fetchAllPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Payment Analytics
      .addCase(fetchPaymentAnalytics.fulfilled, (state, action) => {
        state.paymentAnalytics = action.payload;
      })

      // Fetch Successful Payments
      .addCase(fetchSuccessfulPayments.fulfilled, (state, action) => {
        state.recentTransactions = action.payload;
      });
  },
});

export const {
  clearError,
  clearPaymentIntent,
  setCurrentPayment,
  clearPayments,
  updatePaymentInList,
  removePaymentFromLists,
  addRecentTransaction,
} = paymentsSlice.actions;

export default paymentsSlice.reducer;

// Selectors
export const selectPayments = (state: { payments: PaymentsState }) => state.payments.payments;
export const selectUserPayments = (state: { payments: PaymentsState }) => state.payments.userPayments;
export const selectCurrentPayment = (state: { payments: PaymentsState }) => state.payments.currentPayment;
export const selectPaymentIntent = (state: { payments: PaymentsState }) => state.payments.paymentIntent;
export const selectPaymentMethods = (state: { payments: PaymentsState }) => state.payments.paymentMethods;
export const selectPaymentAnalytics = (state: { payments: PaymentsState }) => state.payments.paymentAnalytics;
export const selectRecentTransactions = (state: { payments: PaymentsState }) => state.payments.recentTransactions;
export const selectPaymentsLoading = (state: { payments: PaymentsState }) => state.payments.isLoading;
export const selectPaymentsProcessing = (state: { payments: PaymentsState }) => state.payments.isProcessing;
export const selectPaymentsError = (state: { payments: PaymentsState }) => state.payments.error;
export const selectProcessingError = (state: { payments: PaymentsState }) => state.payments.processingError;

export const selectPaymentsOperations = (state: { payments: PaymentsState }) => ({
  isCreating: state.payments.isCreating,
  isUpdating: state.payments.isUpdating,
  isRefunding: state.payments.isRefunding,
  isFetchingMethods: state.payments.isFetchingMethods,
});

// Helper selectors
export const selectPaymentById = (id: string) => (state: { payments: PaymentsState }) => {
  return state.payments.payments.find(payment => payment._id === id) ||
         state.payments.userPayments.find(payment => payment._id === id);
};

export const selectPaymentsByStatus = (status: PaymentStatus) => (state: { payments: PaymentsState }) => {
  return state.payments.payments.filter(payment => payment.status === status);
};

export const selectSuccessfulPayments = (state: { payments: PaymentsState }) => {
  return state.payments.payments.filter(payment => payment.status === 'completed');
};

export const selectFailedPayments = (state: { payments: PaymentsState }) => {
  return state.payments.payments.filter(payment => payment.status === 'failed');
};

export const selectPendingPayments = (state: { payments: PaymentsState }) => {
  return state.payments.payments.filter(payment => 
    payment.status === 'pending' || payment.status === 'processing'
  );
};

export const selectPaymentsByGateway = (gateway: PaymentGateway) => (state: { payments: PaymentsState }) => {
  return state.payments.payments.filter(payment => payment.gateway === gateway);
};

export const selectPaymentsByDateRange = (startDate: string, endDate: string) => (state: { payments: PaymentsState }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return state.payments.payments.filter(payment => {
    const paymentDate = new Date(payment.createdAt);
    return paymentDate >= start && paymentDate <= end;
  });
};

export const selectTotalPaymentAmount = (state: { payments: PaymentsState }) => {
  return state.payments.payments.reduce((total, payment) => {
    if (payment.status === 'completed') {
      return total + payment.amount;
    }
    return total;
  }, 0);
};