import { ApiService } from '../api';

// Affiliate Event Analytics Interfaces
export interface AffiliateClickTracking {
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: Date;
}

export interface AffiliateEventClick {
  _id: string;
  eventId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  referrer?: string;
  country?: string;
  city?: string;
  clickedAt: Date;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface ClickTimeline {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

export interface TopEvent {
  eventId: string;
  eventTitle: string;
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt: Date;
}

export interface AffiliateAnalytics {
  totalEvents: number;
  totalClicks: number;
  totalUniqueClicks: number;
  deviceBreakdown: DeviceBreakdown;
  clickTimeline: ClickTimeline[];
  topEvents: TopEvent[];
}

export interface EventAnalytics {
  eventId: string;
  eventTitle: string;
  totalClicks: number;
  uniqueClicks: number;
  deviceBreakdown: DeviceBreakdown;
  clicksByDate: ClickTimeline[];
  recentClicks: AffiliateEventClick[];
}

const affiliateEventAPI = {
  // Track affiliate event click
  trackClick: async (eventId: string) => {
    try {
      const response = await ApiService.post(`/events/${eventId}/track-click`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Vendor: Claim affiliate event
  claimEvent: async (eventId: string) => {
    try {
      const response = await ApiService.post(`/vendor/events/${eventId}/claim`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Vendor: Get claimed events
  getClaimedEvents: async () => {
    try {
      const response = await ApiService.get('/vendor/claimed-events');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get affiliate analytics
  getAffiliateAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => {
    try {
      const response = await ApiService.get('/admin/affiliate-analytics', { params });
      return response.data as AffiliateAnalytics;
    } catch (error) {
      throw error;
    }
  },

  // Public/Admin: Get single event analytics
  getEventAnalytics: async (eventId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get(`/events/${eventId}/analytics`, { params });
      return response.data as EventAnalytics;
    } catch (error) {
      throw error;
    }
  },
};

export default affiliateEventAPI;
