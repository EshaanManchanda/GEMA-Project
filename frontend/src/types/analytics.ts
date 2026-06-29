/**
 * Shared analytics TypeScript interfaces.
 *
 * Single source of truth — import from here in AdminAnalyticsPage,
 * analyticsAPI, useAdminQuery hooks, and the per-event analytics tab.
 *
 * See backend/src/services/analytics.service.ts for the terminology contract
 * (orderRevenue vs eventAttributedRevenue, viewToOrderRate vs userPurchaseRate).
 */

// ---------------------------------------------------------------------------
// Dashboard summary (GET /api/analytics/dashboard)
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  totalRevenue: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalUsers: number;
  revenueGrowth: number;
  eventGrowth: number;
  userGrowth: number;
  topPerformingEvents: Array<{
    eventId: string;
    title: string;
    /** eventAttributedRevenue: $sum items.totalPrice for paid orders */
    revenue: number;
    tickets: number;
    rating: number;
  }>;
}

// ---------------------------------------------------------------------------
// Event analytics (GET /api/analytics/events)
// ---------------------------------------------------------------------------

export interface EventAnalytics {
  totalEvents: number;
  activeEvents: number;
  pendingApproval: number;
  totalViews: number;
  averageRating: number;
  topCategories: Array<{ category: string; count: number }>;
  topLocations: Array<{ city: string; count: number }>;
  eventsByMonth: Array<{ month: string; count: number }>;
  revenueByEvent: Array<{
    eventId: string;
    title: string;
    /** eventAttributedRevenue */
    revenue: number;
    tickets: number;
  }>;
}

// ---------------------------------------------------------------------------
// Order analytics (GET /api/analytics/orders)
// ---------------------------------------------------------------------------

export interface OrderAnalytics {
  totalOrders: number;
  /** orderRevenue: $sum Order.total (paid). Order-level; may span multiple events. */
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
  ordersByMonth: Array<{ month: string; count: number; revenue: number }>;
  ordersByDay?: Array<{ day: string; count: number; revenue: number }>;
  topCurrencies: Array<{ currency: string; count: number; revenue: number }>;
  /** viewToOrderRate: confirmed paid orders ÷ event views × 100 (funnel metric) */
  viewToOrderRate: number;
  /** @deprecated use viewToOrderRate — kept for one release */
  conversionRate?: number;
  refundRate: number;
}

// ---------------------------------------------------------------------------
// Ticket analytics (GET /api/analytics/tickets)
// ---------------------------------------------------------------------------

export interface TicketAnalytics {
  totalTickets: number;
  checkedInTickets: number;
  transferredTickets: number;
  cancelledTickets: number;
  checkInRate: number;
  transferRate: number;
  ticketsByType: Array<{ type: string; count: number }>;
  scansByHour: Array<{ hour: number; scans: number }>;
}

// ---------------------------------------------------------------------------
// User analytics (GET /api/analytics/users)
// ---------------------------------------------------------------------------

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Array<{ role: string; count: number }>;
  usersByMonth: Array<{ month: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  verificationRate: number;
}

// ---------------------------------------------------------------------------
// Venue analytics (GET /api/analytics/venues)
// ---------------------------------------------------------------------------

export interface VenueAnalytics {
  totalVenues: number;
  activeVenues: number;
  venuesByType: Array<{ type: string; count: number }>;
  venuesByCity: Array<{ city: string; count: number }>;
  averageCapacity: number;
  utilizationRate: number;
}

// ---------------------------------------------------------------------------
// Per-event performance (GET /api/analytics/events/:id/performance)
// ---------------------------------------------------------------------------

export interface EventSalesDay {
  date: string;
  orders: number;
  /** eventAttributedRevenue for this day */
  revenue: number;
  tickets: number;
}

export interface EventScheduleBreakdown {
  index: number;
  date: string;
  startTime?: string;
  endTime?: string;
  soldSeats: number;
  availableSeats: number;
  totalCapacity: number | null;
  unlimitedSeats: boolean;
  /** null when unlimitedSeats */
  utilizationRate: number | null;
}

export interface EventPerformance {
  event: {
    id: string;
    title: string;
    views: number;
    dateSchedule: any[];
    location?: any;
    basePrice?: number;
    currency?: string;
    hasRegistration?: boolean;
  };
  revenue: {
    /** eventAttributedRevenue: $sum items.totalPrice (paid orders for this event) */
    total: number;
    orders: number;
    tickets: number;
    averageOrderValue: number;
    conversionRate: number; // viewToOrderRate for this event
  };
  tickets: {
    total: number;
    checkedIn: number;
    transferred: number;
    checkInRate: number;
  };
  seats: {
    sold: number;
    total: number;
    utilizationRate: number | null;
    hasUnlimitedSeats: boolean;
  };
  reviews: {
    total: number;
    averageRating: number;
    distribution: Record<number, number>;
  };
  registrations: {
    total: number;
    byStatus: Record<string, number>;
  };
  salesByDay: EventSalesDay[];
  scheduleBreakdown: EventScheduleBreakdown[];
}

// ---------------------------------------------------------------------------
// Admin dashboard stats (GET /api/admin/dashboard/stats)
// Partial — only the fields used in AdminAnalyticsPage
// ---------------------------------------------------------------------------

export interface AdminDashboardOverview {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  userGrowthRate: number;
  totalEvents: number;
  approvedEvents: number;
  pendingEvents: number;
  totalRevenue: number;
  revenueGrowthRate: number;
  totalReviews: number;
  averageRating: number;
  totalEventViews: number;
  /** userPurchaseRate: paid orders ÷ total users × 100 */
  userPurchaseRate: number;
  /** @deprecated use userPurchaseRate */
  conversionRate?: number;
  averageOrderValue: number;
  customerRetentionRate: number;
  paidOrders: number;
}

export interface AdminDashboardFinancial {
  platformCommission: number;
  vendorPayouts: number;
  refundAmount: number;
  netRevenue: number;
}

export interface AdminSystemHealth {
  uptime: number;
  status: string;
  /** null until APM source connected */
  errorRate: null | number;
  responseTime: null | number;
  databasePerformance: null | string;
  monitoringStatus: "not_connected" | "connected";
}

// ---------------------------------------------------------------------------
// Report download types
// ---------------------------------------------------------------------------

export type ReportFormat = 'pdf' | 'csv';
export type ReportRange = '7d' | '30d';

export interface CertificateExportFilters {
  eventId?: string;
  userId?: string;
  studentId?: string;
  recipientEmail?: string;
  status?: string;
  type?: string;
  issuedFrom?: string;
  issuedTo?: string;
}

export interface BlogExportFilters {
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}
