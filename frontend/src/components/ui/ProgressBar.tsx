import React from 'react';

export interface ProgressBarProps {
  /** 0-100. null/undefined renders as "Not tracked" rather than a fake 0% bar — see the KBOS truthfulness rule. */
  value: number | null;
  label?: string;
  height?: number;
  colorClassName?: string;
  showValueLabel?: boolean;
  className?: string;
  /** Optional trailing content next to the value label — e.g. a period-over-period trend badge. */
  trailing?: React.ReactNode;
}

const DEFAULT_COLOR = 'bg-primary-600';

/**
 * Score / completion bar used across the Business Optimization Center.
 * A null value renders "Not tracked" instead of an empty/zero bar, so a
 * dimension with no underlying data is never visually indistinguishable
 * from a genuine 0%.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  height = 8,
  colorClassName = DEFAULT_COLOR,
  showValueLabel = true,
  className = '',
  trailing,
}) => {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {(label || showValueLabel) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm text-gray-700">{label}</span>}
          <span className="flex items-center gap-2">
            {showValueLabel && (
              <span className="text-sm font-semibold text-gray-900">
                {value === null || value === undefined ? 'Not tracked' : `${Math.round(value)}%`}
              </span>
            )}
            {trailing}
          </span>
        </div>
      )}
      <div
        className="w-full bg-gray-100 rounded-full overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={value ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {value !== null && value !== undefined && (
          <div
            className={`h-full rounded-full transition-all ${colorClassName}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
