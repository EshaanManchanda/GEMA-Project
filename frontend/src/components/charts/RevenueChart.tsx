import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    bookings: number;
    users: number;
    commissions: number;
  }>;
  activeMetric?: string;
  height?: number;
}

/**
 * Revenue analytics chart with multiple metrics
 * Uses ComposedChart to display bars, lines, and areas together
 * Lazy loaded to reduce initial bundle size (~250KB saved)
 */
const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  activeMetric = 'all',
  height = 400
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId="left"
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />

        {(activeMetric === 'all' || activeMetric === 'revenue') && (
          <Bar
            yAxisId="left"
            dataKey="revenue"
            fill="#10B981"
            fillOpacity={0.8}
            name="Revenue ($)"
          />
        )}

        {(activeMetric === 'all' || activeMetric === 'bookings') && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bookings"
            stroke="#3B82F6"
            strokeWidth={2}
            name="Bookings"
          />
        )}

        {(activeMetric === 'all' || activeMetric === 'users') && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="users"
            stroke="#8B5CF6"
            strokeWidth={2}
            name="New Users"
          />
        )}

        {(activeMetric === 'all' || activeMetric === 'commissions') && (
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="commissions"
            stroke="#F59E0B"
            fill="#F59E0B"
            fillOpacity={0.2}
            name="Commissions ($)"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
