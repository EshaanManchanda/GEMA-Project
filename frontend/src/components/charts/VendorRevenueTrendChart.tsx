import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface VendorRevenueTrendChartProps {
  data: Array<{ month: string; revenue: number }>;
  currency?: string;
  height?: number;
}

/**
 * 6-month revenue trend for the vendor dashboard.
 * Lazy loaded to keep recharts out of the initial dashboard bundle.
 */
const VendorRevenueTrendChart: React.FC<VendorRevenueTrendChartProps> = ({
  data,
  currency = 'AED',
  height = 240,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="vendorRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
        />
        <Tooltip
          formatter={(value?: number) => [`${currency} ${(value ?? 0).toFixed(2)}`, 'Revenue'] as [string, string]}
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#8B5CF6"
          strokeWidth={2}
          fill="url(#vendorRevenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default VendorRevenueTrendChart;
