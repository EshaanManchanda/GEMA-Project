import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import vendorPayoutAPI, {
  VendorEarnings,
  PayoutRequest,
  CommissionTransaction,
  PaymentSettings,
  PayoutDashboardData
} from '../../services/api/vendorPayoutAPI';
import { RootState } from '../index';

interface VendorPayoutState {
  // Dashboard data
  earnings: VendorEarnings | null;
  recentPayouts: any[];
  pendingRequests: any[];
  paymentSettings: PaymentSettings | null;

  // Payout history
  payoutHistory: PayoutRequest[];
  payoutHistoryPagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;

  // Commission breakdown
  commissionTransactions: CommissionTransaction[];
  commissionPagination: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;

  // Loading states
  isLoading: boolean;
  isDashboardLoading: boolean;
  isHistoryLoading: boolean;
  isCommissionLoading: boolean;
  isSettingsLoading: boolean;

  // Error states
  error: string | null;
  dashboardError: string | null;
  historyError: string | null;
  commissionError: string | null;
  settingsError: string | null;
}

const initialState: VendorPayoutState = {
  earnings: null,
  recentPayouts: [],
  pendingRequests: [],
  paymentSettings: null,
  payoutHistory: [],
  payoutHistoryPagination: null,
  commissionTransactions: [],
  commissionPagination: null,
  isLoading: false,
  isDashboardLoading: false,
  isHistoryLoading: false,
  isCommissionLoading: false,
  isSettingsLoading: false,
  error: null,
  dashboardError: null,
  historyError: null,
  commissionError: null,
  settingsError: null,
};

// Async thunks
export const fetchPayoutDashboard = createAsyncThunk(
  'vendorPayout/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const data = await vendorPayoutAPI.getDashboard();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard');
    }
  }
);

export const fetchPayoutHistory = createAsyncThunk(
  'vendorPayout/fetchHistory',
  async (params: { page?: number; limit?: number; status?: string } = {}, { rejectWithValue }) => {
    try {
      const data = await vendorPayoutAPI.getPayoutHistory(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payout history');
    }
  }
);

export const fetchPendingEarnings = createAsyncThunk(
  'vendorPayout/fetchPendingEarnings',
  async (
    params: { page?: number; limit?: number; startDate?: string; endDate?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const data = await vendorPayoutAPI.getPendingEarnings(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending earnings');
    }
  }
);

export const requestPayout = createAsyncThunk(
  'vendorPayout/requestPayout',
  async (amount: number | undefined, { rejectWithValue, dispatch }) => {
    try {
      const data = await vendorPayoutAPI.requestPayout(amount);
      // Refresh dashboard after successful request
      dispatch(fetchPayoutDashboard());
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to request payout');
    }
  }
);

export const cancelPayoutRequest = createAsyncThunk(
  'vendorPayout/cancelPayoutRequest',
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await vendorPayoutAPI.cancelPayoutRequest(id);
      // Refresh dashboard after cancellation
      dispatch(fetchPayoutDashboard());
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel payout request');
    }
  }
);

export const fetchPaymentSettings = createAsyncThunk(
  'vendorPayout/fetchPaymentSettings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await vendorPayoutAPI.getPaymentSettings();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment settings');
    }
  }
);

export const updatePaymentSettings = createAsyncThunk(
  'vendorPayout/updatePaymentSettings',
  async (settings: Partial<PaymentSettings>, { rejectWithValue }) => {
    try {
      const data = await vendorPayoutAPI.updatePaymentSettings(settings);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update payment settings');
    }
  }
);

const vendorPayoutSlice = createSlice({
  name: 'vendorPayout',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.dashboardError = null;
      state.historyError = null;
      state.commissionError = null;
      state.settingsError = null;
    },
    resetPayoutState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch Dashboard
    builder
      .addCase(fetchPayoutDashboard.pending, (state) => {
        state.isDashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchPayoutDashboard.fulfilled, (state, action: PayloadAction<PayoutDashboardData>) => {
        state.isDashboardLoading = false;
        state.earnings = action.payload.earnings;
        state.recentPayouts = action.payload.recentPayouts;
        state.pendingRequests = action.payload.pendingRequests;
        state.paymentSettings = action.payload.paymentSettings as any;
      })
      .addCase(fetchPayoutDashboard.rejected, (state, action) => {
        state.isDashboardLoading = false;
        state.dashboardError = action.payload as string;
      });

    // Fetch Payout History
    builder
      .addCase(fetchPayoutHistory.pending, (state) => {
        state.isHistoryLoading = true;
        state.historyError = null;
      })
      .addCase(fetchPayoutHistory.fulfilled, (state, action) => {
        state.isHistoryLoading = false;
        state.payoutHistory = action.payload.payouts;
        state.payoutHistoryPagination = action.payload.pagination;
      })
      .addCase(fetchPayoutHistory.rejected, (state, action) => {
        state.isHistoryLoading = false;
        state.historyError = action.payload as string;
      });

    // Fetch Pending Earnings
    builder
      .addCase(fetchPendingEarnings.pending, (state) => {
        state.isCommissionLoading = true;
        state.commissionError = null;
      })
      .addCase(fetchPendingEarnings.fulfilled, (state, action) => {
        state.isCommissionLoading = false;
        state.commissionTransactions = action.payload.transactions;
        state.commissionPagination = action.payload.pagination;
      })
      .addCase(fetchPendingEarnings.rejected, (state, action) => {
        state.isCommissionLoading = false;
        state.commissionError = action.payload as string;
      });

    // Request Payout
    builder
      .addCase(requestPayout.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestPayout.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(requestPayout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel Payout Request
    builder
      .addCase(cancelPayoutRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelPayoutRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Remove from pending requests
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload
        );
      })
      .addCase(cancelPayoutRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Payment Settings
    builder
      .addCase(fetchPaymentSettings.pending, (state) => {
        state.isSettingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchPaymentSettings.fulfilled, (state, action: PayloadAction<PaymentSettings>) => {
        state.isSettingsLoading = false;
        state.paymentSettings = action.payload;
      })
      .addCase(fetchPaymentSettings.rejected, (state, action) => {
        state.isSettingsLoading = false;
        state.settingsError = action.payload as string;
      });

    // Update Payment Settings
    builder
      .addCase(updatePaymentSettings.pending, (state) => {
        state.isSettingsLoading = true;
        state.settingsError = null;
      })
      .addCase(updatePaymentSettings.fulfilled, (state, action: PayloadAction<PaymentSettings>) => {
        state.isSettingsLoading = false;
        state.paymentSettings = action.payload;
      })
      .addCase(updatePaymentSettings.rejected, (state, action) => {
        state.isSettingsLoading = false;
        state.settingsError = action.payload as string;
      });
  },
});

// Actions
export const { clearError, resetPayoutState } = vendorPayoutSlice.actions;

// Selectors
export const selectEarnings = (state: RootState) => state.vendorPayout.earnings;
export const selectRecentPayouts = (state: RootState) => state.vendorPayout.recentPayouts;
export const selectPendingRequests = (state: RootState) => state.vendorPayout.pendingRequests;
export const selectPaymentSettings = (state: RootState) => state.vendorPayout.paymentSettings;
export const selectPayoutHistory = (state: RootState) => state.vendorPayout.payoutHistory;
export const selectPayoutHistoryPagination = (state: RootState) => state.vendorPayout.payoutHistoryPagination;
export const selectCommissionTransactions = (state: RootState) => state.vendorPayout.commissionTransactions;
export const selectCommissionPagination = (state: RootState) => state.vendorPayout.commissionPagination;
export const selectIsDashboardLoading = (state: RootState) => state.vendorPayout.isDashboardLoading;
export const selectIsHistoryLoading = (state: RootState) => state.vendorPayout.isHistoryLoading;
export const selectIsCommissionLoading = (state: RootState) => state.vendorPayout.isCommissionLoading;
export const selectIsSettingsLoading = (state: RootState) => state.vendorPayout.isSettingsLoading;
export const selectPayoutError = (state: RootState) => state.vendorPayout.error;
export const selectDashboardError = (state: RootState) => state.vendorPayout.dashboardError;

export default vendorPayoutSlice.reducer;
