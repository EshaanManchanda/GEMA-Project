import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import vendorAPI from '@services/api/vendorAPI';
import { Event } from '@types/event';
import { Booking } from './bookingsSlice';
import { toast } from 'react-hot-toast';

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  description: string;
  
  // Contact information
  contactPerson: string;
  email: string;
  phone: string;
  website?: string;
  
  // Address
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Business details
  businessLicense: string;
  taxId: string;
  establishedYear: number;
  employeeCount: string;
  
  // Media
  logo?: string;
  coverImage?: string;
  gallery: string[];
  
  // Social media
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  
  // Verification and status
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  status: 'active' | 'inactive' | 'suspended';
  
  // Ratings and reviews
  rating: number;
  reviewCount: number;
  
  // Categories and services
  categories: string[];
  services: string[];
  specializations: string[];
  
  // Business hours
  businessHours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    };
  };
  
  // Policies
  cancellationPolicy: string;
  refundPolicy: string;
  termsAndConditions: string;
  
  // Payment settings
  paymentMethods: string[];
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    routingNumber: string;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface VendorStats {
  totalEvents: number;
  activeEvents: number;
  totalBookings: number;
  totalRevenue: number;
  currency: string;
  
  // Monthly stats
  monthlyStats: {
    month: string;
    events: number;
    bookings: number;
    revenue: number;
  }[];
  
  // Performance metrics
  averageRating: number;
  responseRate: number;
  completionRate: number;
  
  // Recent activity
  recentBookings: number;
  pendingBookings: number;
  upcomingEvents: number;
}

export interface VendorNotification {
  id: string;
  type: 'booking' | 'payment' | 'review' | 'system' | 'promotion';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  createdAt: string;
}

export interface VendorPayout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  transactionId?: string;
  processedAt?: string;
  createdAt: string;
}

interface VendorState {
  // Vendor profile
  profile: VendorProfile | null;
  isProfileLoading: boolean;
  profileError: string | null;
  
  // Vendor events
  events: Event[];
  isEventsLoading: boolean;
  eventsError: string | null;
  
  // Vendor bookings
  bookings: Booking[];
  isBookingsLoading: boolean;
  bookingsError: string | null;
  
  // Dashboard stats
  stats: VendorStats | null;
  isStatsLoading: boolean;
  statsError: string | null;
  
  // Notifications
  notifications: VendorNotification[];
  unreadNotificationsCount: number;
  isNotificationsLoading: boolean;
  
  // Payouts
  payouts: VendorPayout[];
  isPayoutsLoading: boolean;
  payoutsError: string | null;
  
  // Application state
  applicationStatus: 'not_applied' | 'pending' | 'approved' | 'rejected';
  applicationData: {
    businessName: string;
    businessType: string;
    contactPerson: string;
    email: string;
    phone: string;
    businessLicense: string;
    description: string;
  } | null;
  
  // UI state
  activeTab: 'dashboard' | 'events' | 'bookings' | 'profile' | 'analytics' | 'payouts';
  
  // Filters and pagination
  eventsFilters: {
    status?: string;
    category?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    sortBy: 'date' | 'title' | 'bookings' | 'revenue';
    sortOrder: 'asc' | 'desc';
  };
  
  bookingsFilters: {
    status?: string;
    eventId?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    sortBy: 'date' | 'amount' | 'status';
    sortOrder: 'asc' | 'desc';
  };
  
  pagination: {
    events: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    bookings: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const initialState: VendorState = {
  profile: null,
  isProfileLoading: false,
  profileError: null,
  
  events: [],
  isEventsLoading: false,
  eventsError: null,
  
  bookings: [],
  isBookingsLoading: false,
  bookingsError: null,
  
  stats: null,
  isStatsLoading: false,
  statsError: null,
  
  notifications: [],
  unreadNotificationsCount: 0,
  isNotificationsLoading: false,
  
  payouts: [],
  isPayoutsLoading: false,
  payoutsError: null,
  
  applicationStatus: 'not_applied',
  applicationData: null,
  
  activeTab: 'dashboard',
  
  eventsFilters: {
    sortBy: 'date',
    sortOrder: 'desc',
  },
  
  bookingsFilters: {
    sortBy: 'date',
    sortOrder: 'desc',
  },
  
  pagination: {
    events: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
    bookings: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  },
};

// Async thunks
export const fetchVendorProfile = createAsyncThunk(
  'vendor/fetchVendorProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getProfile();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendor profile';
      return rejectWithValue(message);
    }
  }
);

export const updateVendorProfile = createAsyncThunk(
  'vendor/updateVendorProfile',
  async (profileData: Partial<VendorProfile>, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.updateProfile(profileData);
      toast.success('Profile updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const submitVendorApplication = createAsyncThunk(
  'vendor/submitVendorApplication',
  async (applicationData: VendorState['applicationData'], { rejectWithValue }) => {
    try {
      const response = await vendorAPI.submitApplication(applicationData!);
      toast.success('Application submitted successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit application';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchVendorEvents = createAsyncThunk(
  'vendor/fetchVendorEvents',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getEvents(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendor events';
      return rejectWithValue(message);
    }
  }
);

export const fetchVendorBookings = createAsyncThunk(
  'vendor/fetchVendorBookings',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    eventId?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getBookings(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendor bookings';
      return rejectWithValue(message);
    }
  }
);

export const fetchVendorStats = createAsyncThunk(
  'vendor/fetchVendorStats',
  async (period: 'week' | 'month' | 'year' = 'month', { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getStats(period);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendor stats';
      return rejectWithValue(message);
    }
  }
);

export const fetchVendorNotifications = createAsyncThunk(
  'vendor/fetchVendorNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getNotifications();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch notifications';
      return rejectWithValue(message);
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'vendor/markNotificationAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await vendorAPI.markNotificationAsRead(notificationId);
      return notificationId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark notification as read';
      return rejectWithValue(message);
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'vendor/markAllNotificationsAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await vendorAPI.markAllNotificationsAsRead();
      toast.success('All notifications marked as read');
      return null;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark all notifications as read';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchVendorPayouts = createAsyncThunk(
  'vendor/fetchVendorPayouts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getPayouts();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payouts';
      return rejectWithValue(message);
    }
  }
);

export const requestPayout = createAsyncThunk(
  'vendor/requestPayout',
  async (amount: number, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.requestPayout(amount);
      toast.success('Payout request submitted successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to request payout';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateEventStatus = createAsyncThunk(
  'vendor/updateEventStatus',
  async (params: {
    eventId: string;
    status: string;
  }, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.updateEventStatus(params.eventId, params.status);
      toast.success('Event status updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update event status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'vendor/updateBookingStatus',
  async (params: {
    bookingId: string;
    status: string;
  }, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.updateBookingStatus(params.bookingId, params.status);
      toast.success('Booking status updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update booking status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Vendor slice
const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    // UI state
    setActiveTab: (state, action: PayloadAction<VendorState['activeTab']>) => {
      state.activeTab = action.payload;
    },
    
    // Application data
    setApplicationData: (state, action: PayloadAction<VendorState['applicationData']>) => {
      state.applicationData = action.payload;
    },
    
    updateApplicationData: (state, action: PayloadAction<Partial<VendorState['applicationData']>>) => {
      if (state.applicationData) {
        state.applicationData = { ...state.applicationData, ...action.payload };
      } else {
        state.applicationData = action.payload as VendorState['applicationData'];
      }
    },
    
    // Filters
    setEventsFilters: (state, action: PayloadAction<Partial<VendorState['eventsFilters']>>) => {
      state.eventsFilters = { ...state.eventsFilters, ...action.payload };
      state.pagination.events.page = 1; // Reset to first page
    },
    
    setBookingsFilters: (state, action: PayloadAction<Partial<VendorState['bookingsFilters']>>) => {
      state.bookingsFilters = { ...state.bookingsFilters, ...action.payload };
      state.pagination.bookings.page = 1; // Reset to first page
    },
    
    // Pagination
    setEventsPagination: (state, action: PayloadAction<Partial<VendorState['pagination']['events']>>) => {
      state.pagination.events = { ...state.pagination.events, ...action.payload };
    },
    
    setBookingsPagination: (state, action: PayloadAction<Partial<VendorState['pagination']['bookings']>>) => {
      state.pagination.bookings = { ...state.pagination.bookings, ...action.payload };
    },
    
    // Local updates
    updateEventInList: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
    
    updateBookingInList: (state, action: PayloadAction<Booking>) => {
      const index = state.bookings.findIndex(booking => booking.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<VendorNotification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadNotificationsCount += 1;
      }
    },
    
    markNotificationAsReadLocal: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadNotificationsCount = Math.max(0, state.unreadNotificationsCount - 1);
      }
    },
    
    markAllNotificationsAsReadLocal: (state) => {
      state.notifications.forEach(notification => {
        notification.isRead = true;
      });
      state.unreadNotificationsCount = 0;
    },
    
    // Error handling
    clearErrors: (state) => {
      state.profileError = null;
      state.eventsError = null;
      state.bookingsError = null;
      state.statsError = null;
      state.payoutsError = null;
    },
    
    clearProfileError: (state) => {
      state.profileError = null;
    },
    
    clearEventsError: (state) => {
      state.eventsError = null;
    },
    
    clearBookingsError: (state) => {
      state.bookingsError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Vendor Profile
    builder
      .addCase(fetchVendorProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchVendorProfile.fulfilled, (state, action: PayloadAction<VendorProfile>) => {
        state.isProfileLoading = false;
        state.profile = action.payload;
        state.profileError = null;
      })
      .addCase(fetchVendorProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload as string;
      })
      
      // Update Vendor Profile
      .addCase(updateVendorProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(updateVendorProfile.fulfilled, (state, action: PayloadAction<VendorProfile>) => {
        state.isProfileLoading = false;
        state.profile = action.payload;
        state.profileError = null;
      })
      .addCase(updateVendorProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload as string;
      })
      
      // Submit Vendor Application
      .addCase(submitVendorApplication.fulfilled, (state) => {
        state.applicationStatus = 'pending';
      })
      
      // Fetch Vendor Events
      .addCase(fetchVendorEvents.pending, (state) => {
        state.isEventsLoading = true;
        state.eventsError = null;
      })
      .addCase(fetchVendorEvents.fulfilled, (state, action) => {
        state.isEventsLoading = false;
        state.events = action.payload.events;
        state.pagination.events = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.eventsError = null;
      })
      .addCase(fetchVendorEvents.rejected, (state, action) => {
        state.isEventsLoading = false;
        state.eventsError = action.payload as string;
      })
      
      // Fetch Vendor Bookings
      .addCase(fetchVendorBookings.pending, (state) => {
        state.isBookingsLoading = true;
        state.bookingsError = null;
      })
      .addCase(fetchVendorBookings.fulfilled, (state, action) => {
        state.isBookingsLoading = false;
        state.bookings = action.payload.bookings;
        state.pagination.bookings = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.bookingsError = null;
      })
      .addCase(fetchVendorBookings.rejected, (state, action) => {
        state.isBookingsLoading = false;
        state.bookingsError = action.payload as string;
      })
      
      // Fetch Vendor Stats
      .addCase(fetchVendorStats.pending, (state) => {
        state.isStatsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchVendorStats.fulfilled, (state, action: PayloadAction<VendorStats>) => {
        state.isStatsLoading = false;
        state.stats = action.payload;
        state.statsError = null;
      })
      .addCase(fetchVendorStats.rejected, (state, action) => {
        state.isStatsLoading = false;
        state.statsError = action.payload as string;
      })
      
      // Fetch Notifications
      .addCase(fetchVendorNotifications.pending, (state) => {
        state.isNotificationsLoading = true;
      })
      .addCase(fetchVendorNotifications.fulfilled, (state, action) => {
        state.isNotificationsLoading = false;
        state.notifications = action.payload.notifications;
        state.unreadNotificationsCount = action.payload.unreadCount;
      })
      .addCase(fetchVendorNotifications.rejected, (state) => {
        state.isNotificationsLoading = false;
      })
      
      // Mark Notification as Read
      .addCase(markNotificationAsRead.fulfilled, (state, action: PayloadAction<string>) => {
        vendorSlice.caseReducers.markNotificationAsReadLocal(state, action);
      })
      
      // Mark All Notifications as Read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        vendorSlice.caseReducers.markAllNotificationsAsReadLocal(state);
      })
      
      // Fetch Payouts
      .addCase(fetchVendorPayouts.pending, (state) => {
        state.isPayoutsLoading = true;
        state.payoutsError = null;
      })
      .addCase(fetchVendorPayouts.fulfilled, (state, action: PayloadAction<VendorPayout[]>) => {
        state.isPayoutsLoading = false;
        state.payouts = action.payload;
        state.payoutsError = null;
      })
      .addCase(fetchVendorPayouts.rejected, (state, action) => {
        state.isPayoutsLoading = false;
        state.payoutsError = action.payload as string;
      })
      
      // Request Payout
      .addCase(requestPayout.fulfilled, (state, action: PayloadAction<VendorPayout>) => {
        state.payouts.unshift(action.payload);
      })
      
      // Update Event Status
      .addCase(updateEventStatus.fulfilled, (state, action: PayloadAction<Event>) => {
        vendorSlice.caseReducers.updateEventInList(state, action);
      })
      
      // Update Booking Status
      .addCase(updateBookingStatus.fulfilled, (state, action: PayloadAction<Booking>) => {
        vendorSlice.caseReducers.updateBookingInList(state, action);
      });
  },
});

export const {
  setActiveTab,
  setApplicationData,
  updateApplicationData,
  setEventsFilters,
  setBookingsFilters,
  setEventsPagination,
  setBookingsPagination,
  updateEventInList,
  updateBookingInList,
  addNotification,
  markNotificationAsReadLocal,
  markAllNotificationsAsReadLocal,
  clearErrors,
  clearProfileError,
  clearEventsError,
  clearBookingsError,
} = vendorSlice.actions;

export default vendorSlice.reducer;

// Selectors
export const selectVendorProfile = (state: { vendor: VendorState }) => state.vendor.profile;
export const selectVendorEvents = (state: { vendor: VendorState }) => state.vendor.events;
export const selectVendorBookings = (state: { vendor: VendorState }) => state.vendor.bookings;
export const selectVendorStats = (state: { vendor: VendorState }) => state.vendor.stats;
export const selectVendorNotifications = (state: { vendor: VendorState }) => state.vendor.notifications;
export const selectVendorPayouts = (state: { vendor: VendorState }) => state.vendor.payouts;

export const selectVendorActiveTab = (state: { vendor: VendorState }) => state.vendor.activeTab;
export const selectVendorApplicationStatus = (state: { vendor: VendorState }) => state.vendor.applicationStatus;
export const selectVendorApplicationData = (state: { vendor: VendorState }) => state.vendor.applicationData;

export const selectVendorEventsFilters = (state: { vendor: VendorState }) => state.vendor.eventsFilters;
export const selectVendorBookingsFilters = (state: { vendor: VendorState }) => state.vendor.bookingsFilters;
export const selectVendorEventsPagination = (state: { vendor: VendorState }) => state.vendor.pagination.events;
export const selectVendorBookingsPagination = (state: { vendor: VendorState }) => state.vendor.pagination.bookings;

export const selectIsVendorProfileLoading = (state: { vendor: VendorState }) => state.vendor.isProfileLoading;
export const selectIsVendorEventsLoading = (state: { vendor: VendorState }) => state.vendor.isEventsLoading;
export const selectIsVendorBookingsLoading = (state: { vendor: VendorState }) => state.vendor.isBookingsLoading;
export const selectIsVendorStatsLoading = (state: { vendor: VendorState }) => state.vendor.isStatsLoading;
export const selectIsVendorNotificationsLoading = (state: { vendor: VendorState }) => state.vendor.isNotificationsLoading;
export const selectIsVendorPayoutsLoading = (state: { vendor: VendorState }) => state.vendor.isPayoutsLoading;

export const selectVendorProfileError = (state: { vendor: VendorState }) => state.vendor.profileError;
export const selectVendorEventsError = (state: { vendor: VendorState }) => state.vendor.eventsError;
export const selectVendorBookingsError = (state: { vendor: VendorState }) => state.vendor.bookingsError;
export const selectVendorStatsError = (state: { vendor: VendorState }) => state.vendor.statsError;
export const selectVendorPayoutsError = (state: { vendor: VendorState }) => state.vendor.payoutsError;

// Helper selectors
export const selectUnreadNotificationsCount = (state: { vendor: VendorState }) => {
  return state.vendor.unreadNotificationsCount;
};

export const selectVendorEventById = (id: string) => (state: { vendor: VendorState }) => {
  return state.vendor.events.find(event => event.id === id);
};

export const selectVendorBookingById = (id: string) => (state: { vendor: VendorState }) => {
  return state.vendor.bookings.find(booking => booking.id === id);
};

export const selectVendorActiveEvents = (state: { vendor: VendorState }) => {
  return state.vendor.events.filter(event => event.status === 'published');
};

export const selectVendorUpcomingEvents = (state: { vendor: VendorState }) => {
  const now = new Date();
  return state.vendor.events.filter(event => {
    const eventDate = new Date(event.startDate);
    return eventDate > now && event.status === 'published';
  });
};

export const selectVendorPendingBookings = (state: { vendor: VendorState }) => {
  return state.vendor.bookings.filter(booking => booking.status === 'pending');
};

export const selectVendorRecentBookings = (state: { vendor: VendorState }) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return state.vendor.bookings.filter(booking => {
    const bookingDate = new Date(booking.bookingDate);
    return bookingDate >= sevenDaysAgo;
  });
};

export const selectVendorTotalRevenue = (state: { vendor: VendorState }) => {
  return state.vendor.bookings
    .filter(booking => booking.status === 'completed')
    .reduce((total, booking) => total + booking.totalAmount, 0);
};

export const selectVendorIsVerified = (state: { vendor: VendorState }) => {
  return state.vendor.profile?.isVerified || false;
};

export const selectVendorCanCreateEvents = (state: { vendor: VendorState }) => {
  const profile = state.vendor.profile;
  return profile?.isVerified && profile?.status === 'active';
};

export const selectVendorDashboardSummary = (state: { vendor: VendorState }) => {
  const stats = state.vendor.stats;
  const profile = state.vendor.profile;
  const unreadNotifications = state.vendor.unreadNotificationsCount;
  
  return {
    totalEvents: stats?.totalEvents || 0,
    activeEvents: stats?.activeEvents || 0,
    totalBookings: stats?.totalBookings || 0,
    totalRevenue: stats?.totalRevenue || 0,
    currency: stats?.currency || 'AED',
    averageRating: stats?.averageRating || 0,
    isVerified: profile?.isVerified || false,
    unreadNotifications,
  };
};