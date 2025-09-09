import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { affiliateAPI } from '../../services/api/index';
import type { 
  Affiliate,
  AffiliateStatus,
  ApplyAffiliateData,
  UpdateProfileData,
  DashboardStats,
  AffiliateAnalytics,
  AffiliateCommission
} from '../../services/api/index';
import { toast } from 'react-hot-toast';

interface AffiliatesState {
  affiliates: Affiliate[];
  currentAffiliate: Affiliate | null;
  userAffiliate: Affiliate | null;
  dashboardStats: DashboardStats | null;
  affiliateAnalytics: AffiliateAnalytics | null;
  commissions: AffiliateCommission[];
  topPerformers: Affiliate[];
  isLoading: boolean;
  isApplying: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isLoadingStats: boolean;
  isLoadingCommissions: boolean;
  error: string | null;
  applicationError: string | null;
}

const initialState: AffiliatesState = {
  affiliates: [],
  currentAffiliate: null,
  userAffiliate: null,
  dashboardStats: null,
  affiliateAnalytics: null,
  commissions: [],
  topPerformers: [],
  isLoading: false,
  isApplying: false,
  isUpdating: false,
  isDeleting: false,
  isLoadingStats: false,
  isLoadingCommissions: false,
  error: null,
  applicationError: null,
};

// Async thunks
export const recordAffiliateClick = createAsyncThunk(
  'affiliates/recordClick',
  async (params: {
    affiliateCode: string;
    countryCode?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  }, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.recordClick(params.affiliateCode, {
        countryCode: params.countryCode,
        deviceType: params.deviceType
      });
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to record click';
      return rejectWithValue(message);
    }
  }
);

export const applyAffiliate = createAsyncThunk(
  'affiliates/applyAffiliate',
  async (applicationData: ApplyAffiliateData, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.applyAffiliate(applicationData);
      toast.success('Affiliate application submitted successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit affiliate application';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchMyAffiliate = createAsyncThunk(
  'affiliates/fetchMyAffiliate',
  async (_, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.getMyAffiliate();
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch affiliate info';
      return rejectWithValue(message);
    }
  }
);

export const updateAffiliateProfile = createAsyncThunk(
  'affiliates/updateProfile',
  async (profileData: UpdateProfileData, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.updateProfile(profileData);
      toast.success('Profile updated successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const generateTrackingUrl = createAsyncThunk(
  'affiliates/generateTrackingUrl',
  async (params: {
    eventId?: string;
    customParams?: Record<string, string>;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.generateTrackingUrl(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to generate tracking URL';
      return rejectWithValue(message);
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'affiliates/fetchDashboardStats',
  async (period?: number, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.getDashboardStats(period);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch dashboard stats';
      return rejectWithValue(message);
    }
  }
);

export const fetchCommissions = createAsyncThunk(
  'affiliates/fetchCommissions',
  async (params: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'paid' | 'cancelled';
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.getCommissions(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch commissions';
      return rejectWithValue(message);
    }
  }
);

export const fetchAllAffiliates = createAsyncThunk(
  'affiliates/fetchAllAffiliates',
  async (params: {
    page?: number;
    limit?: number;
    status?: AffiliateStatus;
    sortBy?: 'totalRevenue' | 'totalConversions' | 'totalClicks' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.getAllAffiliates(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch affiliates';
      return rejectWithValue(message);
    }
  }
);

export const updateAffiliateStatus = createAsyncThunk(
  'affiliates/updateAffiliateStatus',
  async (params: {
    id: string;
    status: AffiliateStatus;
    rejectionReason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.updateAffiliateStatus(params.id, {
        status: params.status,
        rejectionReason: params.rejectionReason
      });
      toast.success(`Affiliate status updated to ${params.status}!`);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update affiliate status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchTopPerformers = createAsyncThunk(
  'affiliates/fetchTopPerformers',
  async (params: {
    limit?: number;
    period?: number;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.getTopPerformers(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch top performers';
      return rejectWithValue(message);
    }
  }
);

export const fetchAffiliateAnalytics = createAsyncThunk(
  'affiliates/fetchAffiliateAnalytics',
  async (params: {
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await affiliateAPI.getAnalytics(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch affiliate analytics';
      return rejectWithValue(message);
    }
  }
);

// Affiliates slice
const affiliatesSlice = createSlice({
  name: 'affiliates',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.applicationError = null;
    },
    setCurrentAffiliate: (state, action: PayloadAction<Affiliate | null>) => {
      state.currentAffiliate = action.payload;
    },
    clearAffiliates: (state) => {
      state.affiliates = [];
    },
    updateAffiliateInList: (state, action: PayloadAction<Affiliate>) => {
      const index = state.affiliates.findIndex(affiliate => affiliate._id === action.payload._id);
      if (index !== -1) {
        state.affiliates[index] = action.payload;
      }

      if (state.currentAffiliate && state.currentAffiliate._id === action.payload._id) {
        state.currentAffiliate = action.payload;
      }

      if (state.userAffiliate && state.userAffiliate._id === action.payload._id) {
        state.userAffiliate = action.payload;
      }

      // Update in top performers if exists
      const topPerformerIndex = state.topPerformers.findIndex(affiliate => affiliate._id === action.payload._id);
      if (topPerformerIndex !== -1) {
        state.topPerformers[topPerformerIndex] = action.payload;
      }
    },
    removeAffiliateFromList: (state, action: PayloadAction<string>) => {
      state.affiliates = state.affiliates.filter(affiliate => affiliate._id !== action.payload);
      state.topPerformers = state.topPerformers.filter(affiliate => affiliate._id !== action.payload);

      if (state.currentAffiliate && state.currentAffiliate._id === action.payload) {
        state.currentAffiliate = null;
      }

      if (state.userAffiliate && state.userAffiliate._id === action.payload) {
        state.userAffiliate = null;
      }
    },
    addCommission: (state, action: PayloadAction<AffiliateCommission>) => {
      state.commissions.unshift(action.payload);
    },
    updateCommission: (state, action: PayloadAction<AffiliateCommission>) => {
      const index = state.commissions.findIndex(commission => commission.orderId === action.payload.orderId);
      if (index !== -1) {
        state.commissions[index] = action.payload;
      }
    },
    incrementStats: (state, action: PayloadAction<{ clicks?: number; conversions?: number; revenue?: number }>) => {
      if (state.dashboardStats) {
        if (action.payload.clicks) {
          state.dashboardStats.overall.totalClicks += action.payload.clicks;
          state.dashboardStats.period.clicks += action.payload.clicks;
        }
        if (action.payload.conversions) {
          state.dashboardStats.overall.totalConversions += action.payload.conversions;
          state.dashboardStats.period.conversions += action.payload.conversions;
        }
        if (action.payload.revenue) {
          state.dashboardStats.overall.totalRevenue += action.payload.revenue;
          state.dashboardStats.period.revenue += action.payload.revenue;
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Record Affiliate Click
    builder
      .addCase(recordAffiliateClick.fulfilled, (state, action) => {
        // Optionally update click stats in real-time
        affiliatesSlice.caseReducers.incrementStats(state, { payload: { clicks: 1 }, type: '' });
      })

      // Apply Affiliate
      .addCase(applyAffiliate.pending, (state) => {
        state.isApplying = true;
        state.applicationError = null;
      })
      .addCase(applyAffiliate.fulfilled, (state, action) => {
        state.isApplying = false;
        state.userAffiliate = action.payload;
        state.applicationError = null;
      })
      .addCase(applyAffiliate.rejected, (state, action) => {
        state.isApplying = false;
        state.applicationError = action.payload as string;
      })

      // Fetch My Affiliate
      .addCase(fetchMyAffiliate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyAffiliate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userAffiliate = action.payload;
        state.error = null;
      })
      .addCase(fetchMyAffiliate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.userAffiliate = null;
      })

      // Update Affiliate Profile
      .addCase(updateAffiliateProfile.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateAffiliateProfile.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.userAffiliate = action.payload;
        affiliatesSlice.caseReducers.updateAffiliateInList(state, { payload: action.payload, type: '' });
        state.error = null;
      })
      .addCase(updateAffiliateProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Generate Tracking URL
      .addCase(generateTrackingUrl.fulfilled, (state, action) => {
        // Could store generated URLs for quick access
      })

      // Fetch Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoadingStats = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.dashboardStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoadingStats = false;
        state.error = action.payload as string;
      })

      // Fetch Commissions
      .addCase(fetchCommissions.pending, (state) => {
        state.isLoadingCommissions = true;
        state.error = null;
      })
      .addCase(fetchCommissions.fulfilled, (state, action) => {
        state.isLoadingCommissions = false;
        state.commissions = action.payload;
        state.error = null;
      })
      .addCase(fetchCommissions.rejected, (state, action) => {
        state.isLoadingCommissions = false;
        state.error = action.payload as string;
      })

      // Fetch All Affiliates (Admin)
      .addCase(fetchAllAffiliates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllAffiliates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.affiliates = action.payload;
        state.error = null;
      })
      .addCase(fetchAllAffiliates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update Affiliate Status
      .addCase(updateAffiliateStatus.fulfilled, (state, action) => {
        affiliatesSlice.caseReducers.updateAffiliateInList(state, { payload: action.payload, type: '' });
      })

      // Fetch Top Performers
      .addCase(fetchTopPerformers.fulfilled, (state, action) => {
        state.topPerformers = action.payload;
      })

      // Fetch Affiliate Analytics
      .addCase(fetchAffiliateAnalytics.fulfilled, (state, action) => {
        state.affiliateAnalytics = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentAffiliate,
  clearAffiliates,
  updateAffiliateInList,
  removeAffiliateFromList,
  addCommission,
  updateCommission,
  incrementStats,
} = affiliatesSlice.actions;

export default affiliatesSlice.reducer;

// Selectors
export const selectAffiliates = (state: { affiliates: AffiliatesState }) => state.affiliates.affiliates;
export const selectCurrentAffiliate = (state: { affiliates: AffiliatesState }) => state.affiliates.currentAffiliate;
export const selectUserAffiliate = (state: { affiliates: AffiliatesState }) => state.affiliates.userAffiliate;
export const selectDashboardStats = (state: { affiliates: AffiliatesState }) => state.affiliates.dashboardStats;
export const selectAffiliateAnalytics = (state: { affiliates: AffiliatesState }) => state.affiliates.affiliateAnalytics;
export const selectCommissions = (state: { affiliates: AffiliatesState }) => state.affiliates.commissions;
export const selectTopPerformers = (state: { affiliates: AffiliatesState }) => state.affiliates.topPerformers;
export const selectAffiliatesLoading = (state: { affiliates: AffiliatesState }) => state.affiliates.isLoading;
export const selectStatsLoading = (state: { affiliates: AffiliatesState }) => state.affiliates.isLoadingStats;
export const selectCommissionsLoading = (state: { affiliates: AffiliatesState }) => state.affiliates.isLoadingCommissions;
export const selectAffiliatesError = (state: { affiliates: AffiliatesState }) => state.affiliates.error;
export const selectApplicationError = (state: { affiliates: AffiliatesState }) => state.affiliates.applicationError;

export const selectAffiliatesOperations = (state: { affiliates: AffiliatesState }) => ({
  isApplying: state.affiliates.isApplying,
  isUpdating: state.affiliates.isUpdating,
  isDeleting: state.affiliates.isDeleting,
});

// Helper selectors
export const selectAffiliateById = (id: string) => (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.affiliates.find(affiliate => affiliate._id === id);
};

export const selectAffiliatesByStatus = (status: AffiliateStatus) => (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.affiliates.filter(affiliate => affiliate.status === status);
};

export const selectActiveAffiliates = (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.affiliates.filter(affiliate => affiliate.status === 'active');
};

export const selectPendingAffiliates = (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.affiliates.filter(affiliate => affiliate.status === 'pending');
};

export const selectCommissionsByStatus = (status: 'pending' | 'approved' | 'paid' | 'cancelled') => (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.commissions.filter(commission => commission.status === status);
};

export const selectPendingCommissions = (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.commissions.filter(commission => commission.status === 'pending');
};

export const selectTotalEarnings = (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.commissions
    .filter(commission => commission.status === 'paid')
    .reduce((total, commission) => total + commission.commissionAmount, 0);
};

export const selectPendingEarnings = (state: { affiliates: AffiliatesState }) => {
  return state.affiliates.commissions
    .filter(commission => commission.status === 'approved')
    .reduce((total, commission) => total + commission.commissionAmount, 0);
};

export const selectConversionRate = (state: { affiliates: AffiliatesState }) => {
  if (!state.affiliates.dashboardStats) return 0;
  const { totalClicks, totalConversions } = state.affiliates.dashboardStats.overall;
  return totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
};

export const selectIsAffiliate = (state: { affiliates: AffiliatesState }) => {
  return !!state.affiliates.userAffiliate;
};

export const selectCanApplyAffiliate = (state: { affiliates: AffiliatesState }) => {
  return !state.affiliates.userAffiliate;
};