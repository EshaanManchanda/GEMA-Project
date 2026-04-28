import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import couponAPI from '../../services/api/couponAPI';
import type {
  Coupon,
  CreateCouponData,
  UpdateCouponData,
  CouponValidation,
  CouponStats
} from '../../services/api/couponAPI';
import toast from 'react-hot-toast';

export interface CouponUsage {
  userId: string;
  orderId: string;
  usedAt: string;
  discountAmount: number;
}

interface CouponsState {
  coupons: Coupon[];
  activeCoupons: Coupon[];
  userCoupons: Coupon[];
  currentCoupon: Coupon | null;
  validationResult: CouponValidation | null;
  couponStats: CouponStats | null;
  usageHistory: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search: string;
    status: string;
    type: string;
  };
  loading: {
    list: boolean;
    current: boolean;
    validating: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    stats: boolean;
    userHistory: boolean;
  };
  error: {
    list: string | null;
    current: string | null;
    validating: string | null;
    creating: string | null;
    updating: string | null;
    deleting: string | null;
    stats: string | null;
    userHistory: string | null;
  };
}

const initialState: CouponsState = {
  coupons: [],
  activeCoupons: [],
  userCoupons: [],
  currentCoupon: null,
  validationResult: null,
  couponStats: null,
  usageHistory: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  filters: {
    search: '',
    status: '',
    type: ''
  },
  loading: {
    list: false,
    current: false,
    validating: false,
    creating: false,
    updating: false,
    deleting: false,
    stats: false,
    userHistory: false
  },
  error: {
    list: null,
    current: null,
    validating: null,
    creating: null,
    updating: null,
    deleting: null,
    stats: null,
    userHistory: null
  }
};

// Async thunks
export const fetchCoupons = createAsyncThunk(
  'coupons/fetchCoupons',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getAllCoupons(params);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch coupons';
      return rejectWithValue(message);
    }
  }
);

export const fetchActiveCoupons = createAsyncThunk(
  'coupons/fetchActiveCoupons',
  async (_, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getActiveCoupons();
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch active coupons';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserCoupons = createAsyncThunk(
  'coupons/fetchUserCoupons',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getUserCouponHistory(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch user coupons';
      return rejectWithValue(message);
    }
  }
);

export const fetchCouponById = createAsyncThunk(
  'coupons/fetchCouponById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getCouponById(id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch coupon';
      return rejectWithValue(message);
    }
  }
);

export const validateCoupon = createAsyncThunk(
  'coupons/validateCoupon',
  async (params: {
    code: string;
    orderAmount: number;
    eventIds?: string[];
  }, { rejectWithValue }) => {
    try {
      // Call API with correct parameter order: (code, orderAmount, eventIds)
      const response = await couponAPI.validateCoupon(
        params.code,
        params.orderAmount,
        params.eventIds
      );
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to validate coupon';
      return rejectWithValue(message);
    }
  }
);

export const createCoupon = createAsyncThunk(
  'coupons/createCoupon',
  async (couponData: CreateCouponData, { rejectWithValue }) => {
    try {
      const response = await couponAPI.createCoupon(couponData);
      toast.success('Coupon created successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create coupon';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCoupon = createAsyncThunk(
  'coupons/updateCoupon',
  async (params: { id: string; couponData: UpdateCouponData }, { rejectWithValue }) => {
    try {
      const response = await couponAPI.updateCoupon(params.id, params.couponData);
      toast.success('Coupon updated successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update coupon';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCoupon = createAsyncThunk(
  'coupons/deleteCoupon',
  async (id: string, { rejectWithValue }) => {
    try {
      await couponAPI.deleteCoupon(id);
      toast.success('Coupon deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete coupon';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleCouponStatus = createAsyncThunk(
  'coupons/toggleCouponStatus',
  async (params: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      const response = await couponAPI.updateCoupon(params.id, { isActive: params.isActive } as any);
      toast.success(`Coupon ${params.isActive ? 'activated' : 'deactivated'}!`);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update coupon status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'coupons/applyCoupon',
  async (params: {
    code: string;
    orderId: string;
  }, { rejectWithValue }) => {
    try {
      const response = await couponAPI.applyCoupon(params.code, params.orderId);
      toast.success('Coupon applied successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to apply coupon';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeCoupon = createAsyncThunk(
  'coupons/removeCoupon',
  async (orderId: string, { rejectWithValue }) => {
    try {
      // No dedicated remove endpoint; optimistic local removal
      const response = { data: { orderId } };
      toast.success('Coupon removed successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove coupon';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCouponStats = createAsyncThunk(
  'coupons/fetchCouponStats',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getCouponStats(id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch coupon stats';
      return rejectWithValue(message);
    }
  }
);

export const fetchCouponUsage = createAsyncThunk(
  'coupons/fetchCouponUsage',
  async (params: {
    id: string;
    page?: number;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await couponAPI.getCouponById(params.id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch coupon usage';
      return rejectWithValue(message);
    }
  }
);

export const bulkUpdateCoupons = createAsyncThunk(
  'coupons/bulkUpdateCoupons',
  async (params: {
    couponIds: string[];
    updateData: Partial<UpdateCouponData>;
  }, { rejectWithValue }) => {
    try {
      const status = (params.updateData as any)?.isActive === false ? 'inactive' : 'active';
      const response = await couponAPI.bulkUpdateCoupons(params.couponIds, status as any);
      toast.success(`${params.couponIds.length} coupons updated successfully!`);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to bulk update coupons';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const bulkDeleteCoupons = createAsyncThunk(
  'coupons/bulkDeleteCoupons',
  async (couponIds: string[], { rejectWithValue }) => {
    try {
      await Promise.all(couponIds.map(id => couponAPI.deleteCoupon(id)));
      toast.success(`${couponIds.length} coupons deleted successfully!`);
      return couponIds;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to bulk delete coupons';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Coupons slice
const couponsSlice = createSlice({
  name: 'coupons',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CouponsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state, action: PayloadAction<keyof CouponsState['error']>) => {
      state.error[action.payload] = null;
    },
    clearAllErrors: (state) => {
      Object.keys(state.error).forEach(key => {
        state.error[key as keyof CouponsState['error']] = null;
      });
    },
    clearValidationResult: (state) => {
      state.validationResult = null;
      state.error.validating = null;
    },
    setCurrentCoupon: (state, action: PayloadAction<Coupon | null>) => {
      state.currentCoupon = action.payload;
    },
    clearCoupons: (state) => {
      state.coupons = [];
      state.activeCoupons = [];
      state.userCoupons = [];
    },
    updateCouponInList: (state, action: PayloadAction<Coupon>) => {
      const updateLists = (coupons: Coupon[]) => {
        const index = coupons.findIndex(coupon => coupon._id === action.payload._id);
        if (index !== -1) {
          coupons[index] = action.payload;
        }
      };

      updateLists(state.coupons);
      updateLists(state.activeCoupons);
      updateLists(state.userCoupons);

      if (state.currentCoupon && state.currentCoupon._id === action.payload._id) {
        state.currentCoupon = action.payload;
      }
    },
    removeCouponFromLists: (state, action: PayloadAction<string>) => {
      state.coupons = state.coupons.filter(coupon => coupon._id !== action.payload);
      state.activeCoupons = state.activeCoupons.filter(coupon => coupon._id !== action.payload);
      state.userCoupons = state.userCoupons.filter(coupon => coupon._id !== action.payload);

      if (state.currentCoupon && state.currentCoupon._id === action.payload) {
        state.currentCoupon = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch Coupons
    builder
      .addCase(fetchCoupons.pending, (state) => {
        state.loading.list = true;
        state.error.list = null;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading.list = false;
        state.coupons = action.payload.coupons;
        state.pagination = action.payload.pagination;
        state.error.list = null;
      })
      .addCase(fetchCoupons.rejected, (state, action) => {
        state.loading.list = false;
        state.error.list = action.payload as string;
      })

      // Fetch Active Coupons
      .addCase(fetchActiveCoupons.fulfilled, (state, action) => {
        state.activeCoupons = action.payload;
      })

      // Fetch User Coupons
      .addCase(fetchUserCoupons.fulfilled, (state, action) => {
        state.userCoupons = action.payload;
      })

      // Fetch Coupon by ID
      .addCase(fetchCouponById.pending, (state) => {
        state.loading.current = true;
        state.error.current = null;
      })
      .addCase(fetchCouponById.fulfilled, (state, action) => {
        state.loading.current = false;
        state.currentCoupon = action.payload;
        state.error.current = null;
      })
      .addCase(fetchCouponById.rejected, (state, action) => {
        state.loading.current = false;
        state.error.current = action.payload as string;
        state.currentCoupon = null;
      })

      // Validate Coupon
      .addCase(validateCoupon.pending, (state) => {
        state.loading.validating = true;
        state.error.validating = null;
      })
      .addCase(validateCoupon.fulfilled, (state, action) => {
        state.loading.validating = false;
        state.validationResult = action.payload;
        state.error.validating = null;
      })
      .addCase(validateCoupon.rejected, (state, action) => {
        state.loading.validating = false;
        state.error.validating = action.payload as string;
        state.validationResult = null;
      })

      // Create Coupon
      .addCase(createCoupon.pending, (state) => {
        state.loading.creating = true;
        state.error.creating = null;
      })
      .addCase(createCoupon.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.coupons.unshift(action.payload);
        if (action.payload.isActive) {
          state.activeCoupons.unshift(action.payload);
        }
        state.error.creating = null;
      })
      .addCase(createCoupon.rejected, (state, action) => {
        state.loading.creating = false;
        state.error.creating = action.payload as string;
      })

      // Update Coupon
      .addCase(updateCoupon.pending, (state) => {
        state.loading.updating = true;
        state.error.updating = null;
      })
      .addCase(updateCoupon.fulfilled, (state, action) => {
        state.loading.updating = false;
        couponsSlice.caseReducers.updateCouponInList(state, { payload: action.payload, type: '' });
        state.error.updating = null;
      })
      .addCase(updateCoupon.rejected, (state, action) => {
        state.loading.updating = false;
        state.error.updating = action.payload as string;
      })

      // Delete Coupon
      .addCase(deleteCoupon.pending, (state) => {
        state.loading.deleting = true;
        state.error.deleting = null;
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        state.loading.deleting = false;
        couponsSlice.caseReducers.removeCouponFromLists(state, { payload: action.payload, type: '' });
        state.error.deleting = null;
      })
      .addCase(deleteCoupon.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error.deleting = action.payload as string;
      })

      // Toggle Coupon Status
      .addCase(toggleCouponStatus.fulfilled, (state, action) => {
        couponsSlice.caseReducers.updateCouponInList(state, { payload: action.payload, type: '' });
        
        // Update active coupons list
        if (action.payload.isActive) {
          const existsInActive = state.activeCoupons.find(c => c._id === action.payload._id);
          if (!existsInActive) {
            state.activeCoupons.push(action.payload);
          }
        } else {
          state.activeCoupons = state.activeCoupons.filter(c => c._id !== action.payload._id);
        }
      })

      // Apply Coupon
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.validationResult = action.payload;
      })

      // Remove Coupon
      .addCase(removeCoupon.fulfilled, (state) => {
        state.validationResult = null;
      })

      // Fetch Coupon Stats
      .addCase(fetchCouponStats.fulfilled, (state, action) => {
        state.couponStats = action.payload;
      })

      // Fetch Coupon Usage
      .addCase(fetchCouponUsage.fulfilled, (state, action) => {
        state.usageHistory = action.payload;
      })

      // Bulk Update Coupons
      .addCase(bulkUpdateCoupons.fulfilled, (state, action) => {
        action.payload.forEach((updatedCoupon: Coupon) => {
          couponsSlice.caseReducers.updateCouponInList(state, { payload: updatedCoupon, type: '' });
        });
      })

      // Bulk Delete Coupons
      .addCase(bulkDeleteCoupons.fulfilled, (state, action) => {
        action.payload.forEach((couponId: string) => {
          couponsSlice.caseReducers.removeCouponFromLists(state, { payload: couponId, type: '' });
        });
      });
  },
});

export const {
  clearError,
  clearValidationResult,
  setCurrentCoupon,
  clearCoupons,
  updateCouponInList,
  removeCouponFromLists,
} = couponsSlice.actions;

export default couponsSlice.reducer;

// Selectors
export const selectCoupons = (state: { coupons: CouponsState }) => state.coupons.coupons;
export const selectActiveCoupons = (state: { coupons: CouponsState }) => state.coupons.activeCoupons;
export const selectUserCoupons = (state: { coupons: CouponsState }) => state.coupons.userCoupons;
export const selectCurrentCoupon = (state: { coupons: CouponsState }) => state.coupons.currentCoupon;
export const selectValidationResult = (state: { coupons: CouponsState }) => state.coupons.validationResult;
export const selectCouponStats = (state: { coupons: CouponsState }) => state.coupons.couponStats;
export const selectUsageHistory = (state: { coupons: CouponsState }) => state.coupons.usageHistory;
export const selectCouponsLoading = (state: { coupons: CouponsState }) => state.coupons.loading.list;
export const selectCouponsValidating = (state: { coupons: CouponsState }) => state.coupons.loading.validating;
export const selectCouponsError = (state: { coupons: CouponsState }) => state.coupons.error.list;
export const selectValidationError = (state: { coupons: CouponsState }) => state.coupons.error.validating;

export const selectCouponsOperations = (state: { coupons: CouponsState }) => ({
  isCreating: state.coupons.loading.creating,
  isUpdating: state.coupons.loading.updating,
  isDeleting: state.coupons.loading.deleting,
});

// Helper selectors
export const selectCouponById = (id: string) => (state: { coupons: CouponsState }) => {
  return state.coupons.coupons.find(coupon => coupon._id === id);
};

export const selectCouponByCode = (code: string) => (state: { coupons: CouponsState }) => {
  return state.coupons.coupons.find(coupon => coupon.code === code);
};

export const selectExpiredCoupons = (state: { coupons: CouponsState }) => {
  const now = new Date();
  return state.coupons.coupons.filter(coupon => 
    coupon.validUntil && new Date(coupon.validUntil) < now
  );
};

export const selectActiveCouponsByType = (type: string) => (state: { coupons: CouponsState }) => {
  return state.coupons.activeCoupons.filter(coupon => coupon.type === type);
};

export const selectUsableCouponsForOrder = (orderAmount: number) => (state: { coupons: CouponsState }) => {
  return state.coupons.activeCoupons.filter(coupon => {
    if (coupon.minimumAmount && orderAmount < coupon.minimumAmount) {
      return false;
    }
    return true;
  });
};