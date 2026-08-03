import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface TrendBadgeProps {
  direction?: 'up' | 'down' | 'flat';
  changePercent?: number;
  label?: string;
  className?: string;
}

/**
 * Renders nothing when direction/changePercent are undefined — there is no
 * previous period to compare against, and a bare metric must never be
 * decorated with a fabricated "+0%" or "—" badge. See computeTrend on the
 * backend, which deliberately leaves these fields unset in that case.
 */
const TrendBadge: React.FC<TrendBadgeProps> = ({ direction, changePercent, label, className = '' }) => {
  if (!direction || changePercent === undefined) return null;

  const colorClass =
    direction === 'up'
      ? 'text-green-600'
      : direction === 'down'
      ? 'text-red-600'
      : 'text-gray-500';

  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  const sign = changePercent > 0 ? '+' : '';

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass} ${className}`}>
      <Icon className="w-3 h-3" />
      {sign}
      {changePercent}%{label ? ` ${label}` : ''}
    </span>
  );
};

export default TrendBadge;
