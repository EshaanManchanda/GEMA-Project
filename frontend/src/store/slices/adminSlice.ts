import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import adminAPI from '@services/api/adminAPI';
import { Event } from '@types/event';
import { User } from '@types/user';
import { Category } from '@types/category';
import { Booking } from './bookingsSlice';
import { VendorProfile } from './vendorSlice';
import { toast } from 'react-hot-toast';

export interface AdminStats {
  // User stats
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  
  // Vendor stats
  totalVendors: number;
  activeVendors: number;
  pendingVendorApplications: number;
  verifiedVendors: number;
  
  // Event stats
  totalEvents: number;
  activeEvents: number;
  pendingEvents: number;
  publishedEvents: number;
  
  // Booking stats
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  
  // Revenue stats
  totalRevenue: number;
  monthlyRevenue: number;
  currency: string;
  
  // System stats
  systemHealth: 'good' | 'warning' | 'critical';
  serverUptime: string;
  databaseSize: string;
  
  // Growth metrics
  userGrowthRate: number;
  revenueGrowthRate: number;
  eventGrowthRate: number;
}

export interface AdminAnalytics {
  // Time-based data
  dailyStats: {
    date: string;
    users: number;
    events: number;
    bookings: number;
    revenue: number;
  }[];
  
  monthlyStats: {
    month: string;
    users: number;
    events: number;
    bookings: number;
    revenue: number;
  }[];
  
  // Category performance
  categoryStats: {
    categoryId: string;
    categoryName: string;
    eventCount: number;
    bookingCount: number;
    revenue: number;
  }[];
  
  // Location analytics
  locationStats: {
    city: string;
    eventCount: number;
    userCount: number;
    revenue: number;
  }[];
  
  // Top performers
  topVendors: {
    vendorId: string;
    businessName: string;
    eventCount: number;
    bookingCount: number;
    revenue: number;
    rating: number;
  }[];
  
  topEvents: {
    eventId: string;
    title: string;
    vendorName: string;
    bookingCount: number;
    revenue: number;
    rating: number;
  }[];
}

export interface SystemSettings {
  // General settings
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportEmail: string;
  
  // Feature flags
  features: {
    userRegistration: boolean;
    vendorRegistration: boolean;
    eventCreation: boolean;
    bookingSystem: boolean;
    paymentProcessing: boolean;
    reviewSystem: boolean;
    notificationSystem: boolean;
  };
  
  // Payment settings
  paymentSettings: {
    stripeEnabled: boolean;
    paypalEnabled: boolean;
    bankTransferEnabled: boolean;
    commissionRate: number;
    currency: string;
    taxRate: number;
  };
  
  // Email settings
  emailSettings: {
    smtpEnabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    fromEmail: string;
    fromName: string;
  };
  
  // Security settings
  securitySettings: {
    passwordMinLength: number;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  
  // Content moderation
  moderationSettings: {
    autoApproveEvents: boolean;
    autoApproveVendors: boolean;
    requireEventApproval: boolean;
    enableContentFiltering: boolean;
  };
}

export interface AdminNotification {
  id: string;
  type: 'user' | 'vendor' | 'event' | 'booking' | 'payment' | 'system' | 'payout' | 'commission';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  relatedId?: string;
  createdAt: string;
}

// Commission Types
export interface CommissionConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'inactive' | 'archived';
  isDefault: boolean;
  platformCommission: {
    defaultPercentage: number;
    minAmount: number;
    maxAmount?: number;
    currency: string;
  };
  rules: CommissionRule[];
  multiLevelEnabled?: boolean;
  maxLevels?: number;
  levelDistribution?: Array<{
    level: number;
    percentage: number;
  }>;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  recipient: 'vendor' | 'affiliate' | 'referrer' | 'platform';
  percentage?: number;
  fixedAmount?: number;
  tiers?: Array<{
    minAmount: number;
    maxAmount?: number;
    percentage: number;
  }>;
  conditions?: {
    categories?: string[];
    minOrderAmount?: number;
    maxOrderAmount?: number;
    vendorTiers?: string[];
  };
  status: 'active' | 'inactive';
  priority: number;
}

export interface CommissionTransaction {
  id: string;
  transactionId: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  customerId: string;
  customerName: string;
  commissionConfigId: string;
  originalAmount: number;
  totalCommissionAmount: number;
  platformCommission: number;
  vendorCommission: number;
  commissions: Array<{
    recipientId: string;
    recipient: string;
    recipientType: 'vendor' | 'affiliate' | 'referrer' | 'platform';
    grossAmount: number;
    deductions: number;
    netAmount: number;
    percentage: number;
    rule: string;
  }>;
  status: 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Payout Types
export interface VendorEarning {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  paidBalance: number;
  currency: string;
  commissionRate: number;
  totalOrders: number;
  totalCommissions: number;
  lastPayoutDate?: string;
  lastPayoutAmount?: number;
  paymentMethodId?: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRequest {
  id: string;
  payoutId: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  requestedAmount: number;
  availableAmount: number;
  finalAmount: number;
  currency: string;
  paymentMethodId: string;
  paymentMethod: {
    type: 'bank_transfer' | 'paypal' | 'stripe' | 'wise';
    details: Record<string, any>;
  };
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
  priority: 'low' | 'normal' | 'high';
  fees: {
    processingFee: number;
    platformFee: number;
    totalFees: number;
  };
  notes?: string;
  rejectionReason?: string;
  processedBy?: string;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutStats {
  totalPayouts: number;
  totalAmount: number;
  pendingPayouts: number;
  pendingAmount: number;
  completedPayouts: number;
  completedAmount: number;
  rejectedPayouts: number;
  averagePayoutAmount: number;
  currency: string;
  periodComparison: {
    payoutGrowth: number;
    amountGrowth: number;
  };
}

export interface CommissionStats {
  totalCommissions: number;
  totalAmount: number;
  pendingCommissions: number;
  pendingAmount: number;
  approvedCommissions: number;
  approvedAmount: number;
  paidCommissions: number;
  paidAmount: number;
  averageCommissionRate: number;
  topVendors: Array<{
    vendorId: string;
    vendorName: string;
    totalCommissions: number;
    totalAmount: number;
  }>;
  currency: string;
}

interface AdminState {
  // Dashboard data
  stats: AdminStats | null;
  analytics: AdminAnalytics | null;
  isStatsLoading: boolean;
  isAnalyticsLoading: boolean;
  statsError: string | null;
  analyticsError: string | null;
  
  // Users management
  users: User[];
  isUsersLoading: boolean;
  usersError: string | null;
  
  // Vendors management
  vendors: VendorProfile[];
  pendingVendorApplications: VendorProfile[];
  isVendorsLoading: boolean;
  vendorsError: string | null;
  
  // Events management
  events: Event[];
  pendingEvents: Event[];
  isEventsLoading: boolean;
  eventsError: string | null;
  
  // Bookings management
  bookings: Booking[];
  isBookingsLoading: boolean;
  bookingsError: string | null;
  
  // Categories management
  categories: Category[];
  isCategoriesLoading: boolean;
  categoriesError: string | null;
  
  // Commission management
  commissionConfigs: CommissionConfig[];
  commissionTransactions: CommissionTransaction[];
  commissionStats: CommissionStats | null;
  pendingCommissions: CommissionTransaction[];
  isCommissionLoading: boolean;
  commissionError: string | null;
  
  // Payout management
  vendorEarnings: VendorEarning[];
  payoutRequests: PayoutRequest[];
  payoutStats: PayoutStats | null;
  pendingPayouts: PayoutRequest[];
  isPayoutLoading: boolean;
  payoutError: string | null;
  
  // System settings
  settings: SystemSettings | null;
  isSettingsLoading: boolean;
  settingsError: string | null;
  
  // Notifications
  notifications: AdminNotification[];
  unreadNotificationsCount: number;
  isNotificationsLoading: boolean;
  
  // UI state
  activeTab: 'dashboard' | 'users' | 'vendors' | 'events' | 'bookings' | 'categories' | 'analytics' | 'settings';
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
  
  // Filters and pagination
  filters: {
    users: {
      status?: string;
      role?: string;
      dateRange?: { start: string; end: string };
      searchQuery?: string;
    };
    vendors: {
      status?: string;
      verificationStatus?: string;
      dateRange?: { start: string; end: string };
      searchQuery?: string;
    };
    events: {
      status?: string;
      category?: string;
      vendor?: string;
      dateRange?: { start: string; end: string };
      searchQuery?: string;
    };
    bookings: {
      status?: string;
      event?: string;
      vendor?: string;
      dateRange?: { start: string; end: string };
      searchQuery?: string;
    };
  };
  
  pagination: {
    users: { page: number; limit: number; total: number; totalPages: number };
    vendors: { page: number; limit: number; total: number; totalPages: number };
    events: { page: number; limit: number; total: number; totalPages: number };
    bookings: { page: number; limit: number; total: number; totalPages: number };
  };
}

const initialState: AdminState = {
  stats: null,
  analytics: null,
  isStatsLoading: false,
  isAnalyticsLoading: false,
  statsError: null,
  analyticsError: null,
  
  users: [],
  isUsersLoading: false,
  usersError: null,
  
  vendors: [],
  pendingVendorApplications: [],
  isVendorsLoading: false,
  vendorsError: null,
  
  events: [],
  pendingEvents: [],
  isEventsLoading: false,
  eventsError: null,
  
  bookings: [],
  isBookingsLoading: false,
  bookingsError: null,
  
  categories: [],
  isCategoriesLoading: false,
  categoriesError: null,
  
  commissionConfigs: [],
  commissionTransactions: [],
  commissionStats: null,
  pendingCommissions: [],
  isCommissionLoading: false,
  commissionError: null,
  
  vendorEarnings: [],
  payoutRequests: [],
  payoutStats: null,
  pendingPayouts: [],
  isPayoutLoading: false,
  payoutError: null,
  
  settings: null,
  isSettingsLoading: false,
  settingsError: null,
  
  notifications: [],
  unreadNotificationsCount: 0,
  isNotificationsLoading: false,
  
  activeTab: 'dashboard',
  selectedTimeRange: '30d',
  
  filters: {
    users: {},
    vendors: {},
    events: {},
    bookings: {},
  },
  
  pagination: {
    users: { page: 1, limit: 20, total: 0, totalPages: 0 },
    vendors: { page: 1, limit: 20, total: 0, totalPages: 0 },
    events: { page: 1, limit: 20, total: 0, totalPages: 0 },
    bookings: { page: 1, limit: 20, total: 0, totalPages: 0 },
  },
};

// Async thunks
// =============================================
// COMMISSION ASYNC THUNKS
// =============================================

export const fetchCommissionConfigs = createAsyncThunk(
  'admin/fetchCommissionConfigs',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getCommissionConfigs(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch commission configs';
      return rejectWithValue(message);
    }
  }
);

export const createCommissionConfig = createAsyncThunk(
  'admin/createCommissionConfig',
  async (configData: Partial<CommissionConfig>, { rejectWithValue }) => {
    try {
      const response = await adminAPI.createCommissionConfig(configData);
      toast.success('Commission configuration created successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create commission config';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCommissionConfig = createAsyncThunk(
  'admin/updateCommissionConfig',
  async (params: {
    id: string;
    configData: Partial<CommissionConfig>;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.updateCommissionConfig(params.id, params.configData);
      toast.success('Commission configuration updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update commission config';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCommissionConfig = createAsyncThunk(
  'admin/deleteCommissionConfig',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminAPI.deleteCommissionConfig(id);
      toast.success('Commission configuration deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete commission config';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCommissionTransactions = createAsyncThunk(
  'admin/fetchCommissionTransactions',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    vendorId?: string;
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getCommissionTransactions(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch commission transactions';
      return rejectWithValue(message);
    }
  }
);

export const approveCommissions = createAsyncThunk(
  'admin/approveCommissions',
  async (transactionIds: string[], { rejectWithValue }) => {
    try {
      const response = await adminAPI.approveCommissionTransactions(transactionIds);
      toast.success(`${transactionIds.length} commission(s) approved successfully!`);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve commissions';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCommissionStats = createAsyncThunk(
  'admin/fetchCommissionStats',
  async (params?: any, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getCommissionStats();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch commission stats';
      return rejectWithValue(message);
    }
  }
);

// =============================================
// PAYOUT ASYNC THUNKS
// =============================================

export const fetchVendorEarnings = createAsyncThunk(
  'admin/fetchVendorEarnings',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getVendorEarnings(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendor earnings';
      return rejectWithValue(message);
    }
  }
);

export const fetchPayoutRequests = createAsyncThunk(
  'admin/fetchPayoutRequests',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    vendorId?: string;
    priority?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getPayoutRequests(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payout requests';
      return rejectWithValue(message);
    }
  }
);

export const approvePayoutRequest = createAsyncThunk(
  'admin/approvePayoutRequest',
  async (params: {
    id: string;
    approvalData?: any;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.approvePayoutRequest(params.id, params.approvalData);
      toast.success('Payout request approved successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve payout request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const rejectPayoutRequest = createAsyncThunk(
  'admin/rejectPayoutRequest',
  async (params: {
    id: string;
    reason: string;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.rejectPayoutRequest(params.id, params.reason);
      toast.success('Payout request rejected');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reject payout request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const processPayoutRequest = createAsyncThunk(
  'admin/processPayoutRequest',
  async (params: {
    id: string;
    paymentData: any;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.processPayoutRequest(params.id, params.paymentData);
      toast.success('Payout request processed successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to process payout request';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const bulkApprovePayouts = createAsyncThunk(
  'admin/bulkApprovePayouts',
  async (payoutIds: string[], { rejectWithValue }) => {
    try {
      const response = await adminAPI.bulkApprovePayouts(payoutIds);
      toast.success(`${payoutIds.length} payout(s) approved successfully!`);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve payouts';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchPayoutStats = createAsyncThunk(
  'admin/fetchPayoutStats',
  async (params?: any, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getPayoutStats(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch payout stats';
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminStats = createAsyncThunk(
  'admin/fetchAdminStats',
  async (timeRange: string = '30d', { rejectWithValue }) => {
    try {
      const response = await adminAPI.getStats(timeRange);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch admin stats';
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminAnalytics = createAsyncThunk(
  'admin/fetchAdminAnalytics',
  async (timeRange: string = '30d', { rejectWithValue }) => {
    try {
      const response = await adminAPI.getAnalytics(timeRange);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch analytics';
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminUsers = createAsyncThunk(
  'admin/fetchAdminUsers',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    searchQuery?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getUsers(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch users';
      return rejectWithValue(message);
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'admin/updateUserStatus',
  async (params: {
    userId: string;
    status: string;
    reason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.updateUserStatus(params.userId, params.status, params.reason);
      toast.success('User status updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update user status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminVendors = createAsyncThunk(
  'admin/fetchAdminVendors',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    verificationStatus?: string;
    searchQuery?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getVendors(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch vendors';
      return rejectWithValue(message);
    }
  }
);

export const approveVendorApplication = createAsyncThunk(
  'admin/approveVendorApplication',
  async (params: {
    vendorId: string;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.approveVendorApplication(params.vendorId, params.notes);
      toast.success('Vendor application approved!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve vendor application';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const rejectVendorApplication = createAsyncThunk(
  'admin/rejectVendorApplication',
  async (params: {
    vendorId: string;
    reason: string;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.rejectVendorApplication(params.vendorId, params.reason);
      toast.success('Vendor application rejected');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reject vendor application';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminEvents = createAsyncThunk(
  'admin/fetchAdminEvents',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    vendor?: string;
    searchQuery?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getEvents(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch events';
      return rejectWithValue(message);
    }
  }
);

export const approveEvent = createAsyncThunk(
  'admin/approveEvent',
  async (params: {
    eventId: string;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.approveEvent(params.eventId, params.notes);
      toast.success('Event approved!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to approve event';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const rejectEvent = createAsyncThunk(
  'admin/rejectEvent',
  async (params: {
    eventId: string;
    reason: string;
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.rejectEvent(params.eventId, params.reason);
      toast.success('Event rejected');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reject event';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminBookings = createAsyncThunk(
  'admin/fetchAdminBookings',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    event?: string;
    vendor?: string;
    searchQuery?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getBookings(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch bookings';
      return rejectWithValue(message);
    }
  }
);

export const fetchSystemSettings = createAsyncThunk(
  'admin/fetchSystemSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getSystemSettings();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch system settings';
      return rejectWithValue(message);
    }
  }
);

export const updateSystemSettings = createAsyncThunk(
  'admin/updateSystemSettings',
  async (settings: Partial<SystemSettings>, { rejectWithValue }) => {
    try {
      const response = await adminAPI.updateSystemSettings(settings);
      toast.success('System settings updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update system settings';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminNotifications = createAsyncThunk(
  'admin/fetchAdminNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getNotifications();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch notifications';
      return rejectWithValue(message);
    }
  }
);

export const markAdminNotificationAsRead = createAsyncThunk(
  'admin/markAdminNotificationAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await adminAPI.markNotificationAsRead(notificationId);
      return notificationId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark notification as read';
      return rejectWithValue(message);
    }
  }
);

export const sendSystemNotification = createAsyncThunk(
  'admin/sendSystemNotification',
  async (params: {
    type: 'all_users' | 'all_vendors' | 'specific_users';
    userIds?: string[];
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }, { rejectWithValue }) => {
    try {
      const response = await adminAPI.sendSystemNotification(params);
      toast.success('Notification sent successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Admin slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    // UI state
    setActiveTab: (state, action: PayloadAction<AdminState['activeTab']>) => {
      state.activeTab = action.payload;
    },
    
    setSelectedTimeRange: (state, action: PayloadAction<AdminState['selectedTimeRange']>) => {
      state.selectedTimeRange = action.payload;
    },
    
    // Filters
    setUsersFilters: (state, action: PayloadAction<Partial<AdminState['filters']['users']>>) => {
      state.filters.users = { ...state.filters.users, ...action.payload };
      state.pagination.users.page = 1;
    },
    
    setVendorsFilters: (state, action: PayloadAction<Partial<AdminState['filters']['vendors']>>) => {
      state.filters.vendors = { ...state.filters.vendors, ...action.payload };
      state.pagination.vendors.page = 1;
    },
    
    setEventsFilters: (state, action: PayloadAction<Partial<AdminState['filters']['events']>>) => {
      state.filters.events = { ...state.filters.events, ...action.payload };
      state.pagination.events.page = 1;
    },
    
    setBookingsFilters: (state, action: PayloadAction<Partial<AdminState['filters']['bookings']>>) => {
      state.filters.bookings = { ...state.filters.bookings, ...action.payload };
      state.pagination.bookings.page = 1;
    },
    
    // Pagination
    setUsersPagination: (state, action: PayloadAction<Partial<AdminState['pagination']['users']>>) => {
      state.pagination.users = { ...state.pagination.users, ...action.payload };
    },
    
    setVendorsPagination: (state, action: PayloadAction<Partial<AdminState['pagination']['vendors']>>) => {
      state.pagination.vendors = { ...state.pagination.vendors, ...action.payload };
    },
    
    setEventsPagination: (state, action: PayloadAction<Partial<AdminState['pagination']['events']>>) => {
      state.pagination.events = { ...state.pagination.events, ...action.payload };
    },
    
    setBookingsPagination: (state, action: PayloadAction<Partial<AdminState['pagination']['bookings']>>) => {
      state.pagination.bookings = { ...state.pagination.bookings, ...action.payload };
    },
    
    // Local updates
    updateUserInList: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    
    updateVendorInList: (state, action: PayloadAction<VendorProfile>) => {
      const index = state.vendors.findIndex(vendor => vendor.id === action.payload.id);
      if (index !== -1) {
        state.vendors[index] = action.payload;
      }
      
      // Also update in pending applications if exists
      const pendingIndex = state.pendingVendorApplications.findIndex(vendor => vendor.id === action.payload.id);
      if (pendingIndex !== -1) {
        if (action.payload.verificationStatus === 'pending') {
          state.pendingVendorApplications[pendingIndex] = action.payload;
        } else {
          // Remove from pending if status changed
          state.pendingVendorApplications.splice(pendingIndex, 1);
        }
      }
    },
    
    updateEventInList: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      
      // Also update in pending events if exists
      const pendingIndex = state.pendingEvents.findIndex(event => event.id === action.payload.id);
      if (pendingIndex !== -1) {
        if (action.payload.status === 'pending') {
          state.pendingEvents[pendingIndex] = action.payload;
        } else {
          // Remove from pending if status changed
          state.pendingEvents.splice(pendingIndex, 1);
        }
      }
    },
    
    updateBookingInList: (state, action: PayloadAction<Booking>) => {
      const index = state.bookings.findIndex(booking => booking.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<AdminNotification>) => {
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
    
    // Error handling
    clearErrors: (state) => {
      state.statsError = null;
      state.analyticsError = null;
      state.usersError = null;
      state.vendorsError = null;
      state.eventsError = null;
      state.bookingsError = null;
      state.categoriesError = null;
      state.settingsError = null;
      state.commissionError = null;
      state.payoutError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Admin Stats
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.isStatsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action: PayloadAction<AdminStats>) => {
        state.isStatsLoading = false;
        state.stats = action.payload;
        state.statsError = null;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.isStatsLoading = false;
        state.statsError = action.payload as string;
      })
      
      // Fetch Admin Analytics
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.isAnalyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action: PayloadAction<AdminAnalytics>) => {
        state.isAnalyticsLoading = false;
        state.analytics = action.payload;
        state.analyticsError = null;
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.isAnalyticsLoading = false;
        state.analyticsError = action.payload as string;
      })
      
      // Fetch Admin Users
      .addCase(fetchAdminUsers.pending, (state) => {
        state.isUsersLoading = true;
        state.usersError = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.isUsersLoading = false;
        state.users = action.payload.users;
        state.pagination.users = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.usersError = null;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.isUsersLoading = false;
        state.usersError = action.payload as string;
      })
      
      // Update User Status
      .addCase(updateUserStatus.fulfilled, (state, action: PayloadAction<User>) => {
        adminSlice.caseReducers.updateUserInList(state, action);
      })
      
      // Fetch Admin Vendors
      .addCase(fetchAdminVendors.pending, (state) => {
        state.isVendorsLoading = true;
        state.vendorsError = null;
      })
      .addCase(fetchAdminVendors.fulfilled, (state, action) => {
        state.isVendorsLoading = false;
        state.vendors = action.payload.vendors;
        state.pendingVendorApplications = action.payload.vendors.filter(
          (vendor: VendorProfile) => vendor.verificationStatus === 'pending'
        );
        state.pagination.vendors = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.vendorsError = null;
      })
      .addCase(fetchAdminVendors.rejected, (state, action) => {
        state.isVendorsLoading = false;
        state.vendorsError = action.payload as string;
      })
      
      // Approve/Reject Vendor Application
      .addCase(approveVendorApplication.fulfilled, (state, action: PayloadAction<VendorProfile>) => {
        adminSlice.caseReducers.updateVendorInList(state, action);
      })
      .addCase(rejectVendorApplication.fulfilled, (state, action: PayloadAction<VendorProfile>) => {
        adminSlice.caseReducers.updateVendorInList(state, action);
      })
      
      // Fetch Admin Events
      .addCase(fetchAdminEvents.pending, (state) => {
        state.isEventsLoading = true;
        state.eventsError = null;
      })
      .addCase(fetchAdminEvents.fulfilled, (state, action) => {
        state.isEventsLoading = false;
        state.events = action.payload.events;
        state.pendingEvents = action.payload.events.filter(
          (event: Event) => event.status === 'pending'
        );
        state.pagination.events = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.eventsError = null;
      })
      .addCase(fetchAdminEvents.rejected, (state, action) => {
        state.isEventsLoading = false;
        state.eventsError = action.payload as string;
      })
      
      // Approve/Reject Event
      .addCase(approveEvent.fulfilled, (state, action: PayloadAction<Event>) => {
        adminSlice.caseReducers.updateEventInList(state, action);
      })
      .addCase(rejectEvent.fulfilled, (state, action: PayloadAction<Event>) => {
        adminSlice.caseReducers.updateEventInList(state, action);
      })
      
      // Fetch Admin Bookings
      .addCase(fetchAdminBookings.pending, (state) => {
        state.isBookingsLoading = true;
        state.bookingsError = null;
      })
      .addCase(fetchAdminBookings.fulfilled, (state, action) => {
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
      .addCase(fetchAdminBookings.rejected, (state, action) => {
        state.isBookingsLoading = false;
        state.bookingsError = action.payload as string;
      })
      
      // Fetch System Settings
      .addCase(fetchSystemSettings.pending, (state) => {
        state.isSettingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchSystemSettings.fulfilled, (state, action: PayloadAction<SystemSettings>) => {
        state.isSettingsLoading = false;
        state.settings = action.payload;
        state.settingsError = null;
      })
      .addCase(fetchSystemSettings.rejected, (state, action) => {
        state.isSettingsLoading = false;
        state.settingsError = action.payload as string;
      })
      
      // Update System Settings
      .addCase(updateSystemSettings.fulfilled, (state, action: PayloadAction<SystemSettings>) => {
        state.settings = action.payload;
      })
      
      // Fetch Admin Notifications
      .addCase(fetchAdminNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.unreadNotificationsCount = action.payload.unreadCount;
      })
      
      // =============================================
      // COMMISSION EXTRA REDUCERS
      // =============================================
      
      // Fetch Commission Configs
      .addCase(fetchCommissionConfigs.pending, (state) => {
        state.isCommissionLoading = true;
        state.commissionError = null;
      })
      .addCase(fetchCommissionConfigs.fulfilled, (state, action) => {
        state.isCommissionLoading = false;
        state.commissionConfigs = action.payload.commissions || [];
        state.commissionError = null;
      })
      .addCase(fetchCommissionConfigs.rejected, (state, action) => {
        state.isCommissionLoading = false;
        state.commissionError = action.payload as string;
      })
      
      // Create Commission Config
      .addCase(createCommissionConfig.fulfilled, (state, action: PayloadAction<CommissionConfig>) => {
        state.commissionConfigs.push(action.payload);
      })
      
      // Update Commission Config
      .addCase(updateCommissionConfig.fulfilled, (state, action: PayloadAction<CommissionConfig>) => {
        const index = state.commissionConfigs.findIndex(config => config.id === action.payload.id);
        if (index !== -1) {
          state.commissionConfigs[index] = action.payload;
        }
      })
      
      // Delete Commission Config
      .addCase(deleteCommissionConfig.fulfilled, (state, action: PayloadAction<string>) => {
        state.commissionConfigs = state.commissionConfigs.filter(config => config.id !== action.payload);
      })
      
      // Fetch Commission Transactions
      .addCase(fetchCommissionTransactions.pending, (state) => {
        state.isCommissionLoading = true;
        state.commissionError = null;
      })
      .addCase(fetchCommissionTransactions.fulfilled, (state, action) => {
        state.isCommissionLoading = false;
        state.commissionTransactions = action.payload.transactions || [];
        state.pendingCommissions = action.payload.transactions?.filter(
          (transaction: CommissionTransaction) => transaction.status === 'calculated'
        ) || [];
        state.commissionError = null;
      })
      .addCase(fetchCommissionTransactions.rejected, (state, action) => {
        state.isCommissionLoading = false;
        state.commissionError = action.payload as string;
      })
      
      // Approve Commissions
      .addCase(approveCommissions.fulfilled, (state, action) => {
        const approvedIds = action.payload.approvedIds || [];
        state.commissionTransactions = state.commissionTransactions.map(transaction =>
          approvedIds.includes(transaction.id)
            ? { ...transaction, status: 'approved' as const, approvedAt: new Date().toISOString() }
            : transaction
        );
        state.pendingCommissions = state.pendingCommissions.filter(
          commission => !approvedIds.includes(commission.id)
        );
      })
      
      // Fetch Commission Stats
      .addCase(fetchCommissionStats.fulfilled, (state, action: PayloadAction<CommissionStats>) => {
        state.commissionStats = action.payload;
      })
      
      // =============================================
      // PAYOUT EXTRA REDUCERS
      // =============================================
      
      // Fetch Vendor Earnings
      .addCase(fetchVendorEarnings.pending, (state) => {
        state.isPayoutLoading = true;
        state.payoutError = null;
      })
      .addCase(fetchVendorEarnings.fulfilled, (state, action) => {
        state.isPayoutLoading = false;
        state.vendorEarnings = action.payload.earnings || [];
        state.payoutError = null;
      })
      .addCase(fetchVendorEarnings.rejected, (state, action) => {
        state.isPayoutLoading = false;
        state.payoutError = action.payload as string;
      })
      
      // Fetch Payout Requests
      .addCase(fetchPayoutRequests.pending, (state) => {
        state.isPayoutLoading = true;
        state.payoutError = null;
      })
      .addCase(fetchPayoutRequests.fulfilled, (state, action) => {
        state.isPayoutLoading = false;
        state.payoutRequests = action.payload.payouts || [];
        state.pendingPayouts = action.payload.payouts?.filter(
          (payout: PayoutRequest) => payout.status === 'pending'
        ) || [];
        state.payoutError = null;
      })
      .addCase(fetchPayoutRequests.rejected, (state, action) => {
        state.isPayoutLoading = false;
        state.payoutError = action.payload as string;
      })
      
      // Approve Payout Request
      .addCase(approvePayoutRequest.fulfilled, (state, action: PayloadAction<PayoutRequest>) => {
        const index = state.payoutRequests.findIndex(payout => payout.id === action.payload.id);
        if (index !== -1) {
          state.payoutRequests[index] = action.payload;
        }
        state.pendingPayouts = state.pendingPayouts.filter(payout => payout.id !== action.payload.id);
      })
      
      // Reject Payout Request
      .addCase(rejectPayoutRequest.fulfilled, (state, action: PayloadAction<PayoutRequest>) => {
        const index = state.payoutRequests.findIndex(payout => payout.id === action.payload.id);
        if (index !== -1) {
          state.payoutRequests[index] = action.payload;
        }
        state.pendingPayouts = state.pendingPayouts.filter(payout => payout.id !== action.payload.id);
      })
      
      // Process Payout Request
      .addCase(processPayoutRequest.fulfilled, (state, action: PayloadAction<PayoutRequest>) => {
        const index = state.payoutRequests.findIndex(payout => payout.id === action.payload.id);
        if (index !== -1) {
          state.payoutRequests[index] = action.payload;
        }
      })
      
      // Bulk Approve Payouts
      .addCase(bulkApprovePayouts.fulfilled, (state, action) => {
        const approvedIds = action.payload.approvedIds || [];
        state.payoutRequests = state.payoutRequests.map(payout =>
          approvedIds.includes(payout.id)
            ? { ...payout, status: 'approved' as const, approvedAt: new Date().toISOString() }
            : payout
        );
        state.pendingPayouts = state.pendingPayouts.filter(
          payout => !approvedIds.includes(payout.id)
        );
      })
      
      // Fetch Payout Stats
      .addCase(fetchPayoutStats.fulfilled, (state, action: PayloadAction<PayoutStats>) => {
        state.payoutStats = action.payload;
      })
      
      // Mark Notification as Read
      .addCase(markAdminNotificationAsRead.fulfilled, (state, action: PayloadAction<string>) => {
        adminSlice.caseReducers.markNotificationAsReadLocal(state, action);
      });
  },
});

export const {
  setActiveTab,
  setSelectedTimeRange,
  setUsersFilters,
  setVendorsFilters,
  setEventsFilters,
  setBookingsFilters,
  setUsersPagination,
  setVendorsPagination,
  setEventsPagination,
  setBookingsPagination,
  updateUserInList,
  updateVendorInList,
  updateEventInList,
  updateBookingInList,
  addNotification,
  markNotificationAsReadLocal,
  clearErrors,
} = adminSlice.actions;

export default adminSlice.reducer;

// Selectors
export const selectAdminStats = (state: { admin: AdminState }) => state.admin.stats;
export const selectAdminAnalytics = (state: { admin: AdminState }) => state.admin.analytics;
export const selectAdminUsers = (state: { admin: AdminState }) => state.admin.users;
export const selectAdminVendors = (state: { admin: AdminState }) => state.admin.vendors;
export const selectAdminEvents = (state: { admin: AdminState }) => state.admin.events;
export const selectAdminBookings = (state: { admin: AdminState }) => state.admin.bookings;
export const selectSystemSettings = (state: { admin: AdminState }) => state.admin.settings;
export const selectAdminNotifications = (state: { admin: AdminState }) => state.admin.notifications;

export const selectAdminActiveTab = (state: { admin: AdminState }) => state.admin.activeTab;
export const selectSelectedTimeRange = (state: { admin: AdminState }) => state.admin.selectedTimeRange;

export const selectPendingVendorApplications = (state: { admin: AdminState }) => state.admin.pendingVendorApplications;
export const selectPendingEvents = (state: { admin: AdminState }) => state.admin.pendingEvents;

export const selectAdminFilters = (state: { admin: AdminState }) => state.admin.filters;
export const selectAdminPagination = (state: { admin: AdminState }) => state.admin.pagination;

export const selectIsAdminStatsLoading = (state: { admin: AdminState }) => state.admin.isStatsLoading;
export const selectIsAdminAnalyticsLoading = (state: { admin: AdminState }) => state.admin.isAnalyticsLoading;
export const selectIsAdminUsersLoading = (state: { admin: AdminState }) => state.admin.isUsersLoading;
export const selectIsAdminVendorsLoading = (state: { admin: AdminState }) => state.admin.isVendorsLoading;
export const selectIsAdminEventsLoading = (state: { admin: AdminState }) => state.admin.isEventsLoading;
export const selectIsAdminBookingsLoading = (state: { admin: AdminState }) => state.admin.isBookingsLoading;
export const selectIsSystemSettingsLoading = (state: { admin: AdminState }) => state.admin.isSettingsLoading;

export const selectAdminErrors = (state: { admin: AdminState }) => ({
  stats: state.admin.statsError,
  analytics: state.admin.analyticsError,
  users: state.admin.usersError,
  vendors: state.admin.vendorsError,
  events: state.admin.eventsError,
  bookings: state.admin.bookingsError,
  categories: state.admin.categoriesError,
  settings: state.admin.settingsError,
});

// Helper selectors
export const selectUnreadAdminNotificationsCount = (state: { admin: AdminState }) => {
  return state.admin.unreadNotificationsCount;
};

export const selectAdminDashboardSummary = (state: { admin: AdminState }) => {
  const stats = state.admin.stats;
  return {
    totalUsers: stats?.totalUsers || 0,
    totalVendors: stats?.totalVendors || 0,
    totalEvents: stats?.totalEvents || 0,
    totalBookings: stats?.totalBookings || 0,
    totalRevenue: stats?.totalRevenue || 0,
    currency: stats?.currency || 'AED',
    pendingVendorApplications: stats?.pendingVendorApplications || 0,
    pendingEvents: stats?.pendingEvents || 0,
    systemHealth: stats?.systemHealth || 'good',
  };
};

export const selectCriticalAdminNotifications = (state: { admin: AdminState }) => {
  return state.admin.notifications.filter(notification => 
    notification.priority === 'critical' && !notification.isRead
  );
};

export const selectRecentAdminActivity = (state: { admin: AdminState }) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  return state.admin.notifications
    .filter(notification => new Date(notification.createdAt) >= oneDayAgo)
    .slice(0, 10);
};

// Commission Selectors
export const selectCommissionConfigs = (state: { admin: AdminState }) => state.admin.commissionConfigs;
export const selectCommissionTransactions = (state: { admin: AdminState }) => state.admin.commissionTransactions;
export const selectCommissionStats = (state: { admin: AdminState }) => state.admin.commissionStats;
export const selectPendingCommissions = (state: { admin: AdminState }) => state.admin.pendingCommissions;
export const selectIsCommissionLoading = (state: { admin: AdminState }) => state.admin.isCommissionLoading;
export const selectCommissionError = (state: { admin: AdminState }) => state.admin.commissionError;

// Payout Selectors
export const selectVendorEarnings = (state: { admin: AdminState }) => state.admin.vendorEarnings;
export const selectPayoutRequests = (state: { admin: AdminState }) => state.admin.payoutRequests;
export const selectPayoutStats = (state: { admin: AdminState }) => state.admin.payoutStats;
export const selectPendingPayouts = (state: { admin: AdminState }) => state.admin.pendingPayouts;
export const selectIsPayoutLoading = (state: { admin: AdminState }) => state.admin.isPayoutLoading;
export const selectPayoutError = (state: { admin: AdminState }) => state.admin.payoutError;

// Helper Selectors
export const selectActiveCommissionConfig = (state: { admin: AdminState }) => {
  return state.admin.commissionConfigs.find(config => config.isDefault && config.status === 'active');
};

export const selectTopEarningVendors = (state: { admin: AdminState }) => {
  return [...state.admin.vendorEarnings]
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 5);
};

// Memoized selector using createSelector
export const selectPayoutSummary = createSelector(
  [selectPayoutStats, selectPendingPayouts],
  (stats, pending) => ({
    totalRequests: stats?.totalPayouts || 0,
    pendingRequests: pending.length,
    totalAmount: stats?.totalAmount || 0,
    pendingAmount: stats?.pendingAmount || 0,
    completedAmount: stats?.completedAmount || 0,
    currency: stats?.currency || 'AED',
  })
);

export const selectCommissionSummary = createSelector(
  [selectCommissionStats, selectPendingCommissions],
  (stats, pending) => ({
    totalCommissions: stats?.totalCommissions || 0,
    pendingCommissions: pending.length,
    totalAmount: stats?.totalAmount || 0,
    pendingAmount: stats?.pendingAmount || 0,
    approvedAmount: stats?.approvedAmount || 0,
    averageRate: stats?.averageCommissionRate || 0,
    currency: stats?.currency || 'AED',
  })
);