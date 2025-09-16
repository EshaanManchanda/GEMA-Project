import React from 'react';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
  rounded = false
}) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:400%_100%] ${width} ${height} ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{
        animation: 'skeleton-loading 1.5s ease-in-out infinite',
      }}
    />
  );
};

// Individual skeleton components for different use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLoader
        key={i}
        height="h-4"
        width={i === lines - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`border rounded-lg overflow-hidden shadow-sm ${className}`}>
    <div className="p-4 sm:p-6 space-y-4">
      {/* Title */}
      <SkeletonLoader height="h-6" width="w-3/4" />

      {/* Content lines */}
      <div className="space-y-2">
        <SkeletonLoader height="h-4" width="w-full" />
        <SkeletonLoader height="h-4" width="w-5/6" />
        <SkeletonLoader height="h-4" width="w-4/6" />
      </div>

      {/* Action buttons */}
      <div className="flex space-x-2 pt-2">
        <SkeletonLoader height="h-8" width="w-24" />
        <SkeletonLoader height="h-8" width="w-20" />
      </div>
    </div>
  </div>
);

export const SkeletonEventCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`border rounded-lg overflow-hidden shadow-sm ${className}`}>
    {/* Image placeholder */}
    <div className="relative pb-48 overflow-hidden">
      <SkeletonLoader
        className="absolute inset-0 h-full w-full"
        width="w-full"
        height="h-full"
      />
    </div>

    <div className="p-4 space-y-3">
      {/* Title */}
      <SkeletonLoader height="h-6" width="w-4/5" />

      {/* Details */}
      <div className="space-y-2">
        <SkeletonLoader height="h-4" width="w-full" />
        <SkeletonLoader height="h-4" width="w-3/4" />
        <SkeletonLoader height="h-4" width="w-2/3" />
      </div>

      {/* Action buttons */}
      <div className="flex justify-between items-center pt-2">
        <SkeletonLoader height="h-8" width="w-24" />
        <SkeletonLoader height="h-8" width="w-8" rounded />
      </div>
    </div>
  </div>
);

export const SkeletonDashboardTab: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-6">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonGrid: React.FC<{
  columns?: number;
  count?: number;
  children?: React.ReactNode;
  className?: string;
}> = ({
  columns = 3,
  count = 6,
  children,
  className = ''
}) => (
  <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : `sm:grid-cols-${Math.min(columns, 4)}`} gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i}>
        {children || <SkeletonEventCard />}
      </div>
    ))}
  </div>
);

export default SkeletonLoader;