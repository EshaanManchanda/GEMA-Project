import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon: ReactNode;
  color?: string;
  className?: string;
}

export function AdminStatCard({ label, value, change, icon, color = 'bg-blue-500', className }: AdminStatCardProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-5', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={cn('text-sm mt-1 font-medium', change.isPositive ? 'text-green-600' : 'text-red-600')}>
              {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', color)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
