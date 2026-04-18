import { ReactNode } from 'react';
import { Card } from '@shared/components/ui/Card';
import { cn } from '@shared/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon: ReactNode;
  color?: string;
  className?: string;
}

export function StatCard({ title, value, change, icon, color = 'bg-blue-500', className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={cn('text-sm mt-1', change.isPositive ? 'text-green-600' : 'text-red-600')}>
              {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', color)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
