import React from 'react';

/**
 * Loading skeleton for chart components
 * Provides visual feedback while recharts bundle loads
 */
const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div
      className="animate-pulse bg-gray-100 rounded-lg flex items-center justify-center"
      style={{ height: `${height}px` }}
    >
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-sm text-gray-500">Loading chart...</p>
      </div>
    </div>
  );
};

export default ChartSkeleton;
