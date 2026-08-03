import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface BusinessScoreHistoryPoint {
  period: string;
  overall: number | null;
  listing: number | null;
  sales: number | null;
  marketing: number | null;
  customer: number | null;
  operations: number | null;
}

interface BusinessScoreHistoryChartProps {
  data: BusinessScoreHistoryPoint[];
  height?: number;
}

const SERIES: Array<{ key: keyof Omit<BusinessScoreHistoryPoint, 'period'>; color: string; label: string }> = [
  { key: 'overall', color: '#0f3460', label: 'Overall' },
  { key: 'listing', color: '#8B5CF6', label: 'Listing' },
  { key: 'sales', color: '#16a34a', label: 'Sales' },
  { key: 'marketing', color: '#f59e0b', label: 'Marketing' },
  { key: 'customer', color: '#0ea5e9', label: 'Customer' },
  { key: 'operations', color: '#dc2626', label: 'Operations' },
];

/**
 * Score-history timeline for a vendor's business health, one line per
 * dimension plus overall. Null values (untracked periods/dimensions) create
 * a gap in the line rather than dropping to 0 — recharts skips null points
 * by default with connectNulls=false, which is what we want here.
 * Lazy loaded to keep recharts out of the initial bundle, matching
 * VendorRevenueTrendChart's contract (plain data array + height prop).
 */
const BusinessScoreHistoryChart: React.FC<BusinessScoreHistoryChartProps> = ({ data, height = 280 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value?: number, name?: string) => [
            value === null || value === undefined ? 'Not tracked' : `${value}%`,
            name,
          ]}
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={s.key === 'overall' ? 2.5 : 1.5}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BusinessScoreHistoryChart;
