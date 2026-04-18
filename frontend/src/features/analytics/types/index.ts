export interface DashboardSummary {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  recentBookings: unknown[];
  revenueChart: Array<{ date: string; amount: number }>;
}
