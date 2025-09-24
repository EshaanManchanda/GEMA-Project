import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchCommissionStats,
  selectCommissionStats,
  selectPendingCommissions,
  selectCommissionSummary,
  selectIsCommissionLoading,
  selectActiveCommissionConfig
} from '../../store/slices/adminSlice';
import type { AppDispatch } from '../../store';

interface CommissionOverviewProps {
  className?: string;
  showActions?: boolean;
}

const CommissionOverview: React.FC<CommissionOverviewProps> = ({ 
  className = '', 
  showActions = true 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const commissionStats = useSelector(selectCommissionStats);
  const pendingCommissions = useSelector(selectPendingCommissions);
  const commissionSummary = useSelector(selectCommissionSummary);
  const isLoading = useSelector(selectIsCommissionLoading);
  const activeConfig = useSelector(selectActiveCommissionConfig);

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load with delay to avoid simultaneous requests (stagger after payout)
    const initialDelay = setTimeout(() => {
      loadCommissionData();
    }, 4000); // 4 second delay to stagger after payout widget

    // Set up auto-refresh every 12 minutes (further staggered from payout)
    const interval = setInterval(() => {
      // Only refresh if document is visible and not already loading
      if (document.visibilityState === 'visible' && !isLoading) {
        loadCommissionData();
      }
    }, 12 * 60 * 1000); // 12 minutes

    setRefreshInterval(interval);

    return () => {
      clearTimeout(initialDelay);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [dispatch]);

  const loadCommissionData = async () => {
    try {
      await dispatch(fetchCommissionStats({})).unwrap();
    } catch (error) {
      console.error('Failed to load commission stats:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading && !commissionStats) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">💰</span>
            Commission Overview
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadCommissionData}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <span className="text-sm">🔄</span>
            </button>
            {showActions && (
              <Link
                to="/admin/commissions"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                View All →
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-emerald-700 font-medium">Total Commissions</span>
              <span className="text-emerald-600">📊</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900 mb-1">
              {commissionSummary.totalCommissions || 0}
            </div>
            <div className="text-sm text-emerald-600">
              {formatCurrency(commissionSummary.totalAmount, commissionSummary.currency)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-700 font-medium">Pending</span>
              <span className="text-amber-600">⏰</span>
            </div>
            <div className="text-2xl font-bold text-amber-900 mb-1">
              {commissionSummary.pendingCommissions || 0}
            </div>
            <div className="text-sm text-amber-600">
              {formatCurrency(commissionSummary.pendingAmount, commissionSummary.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Approved Commissions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Approved</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(commissionSummary.approvedAmount, commissionSummary.currency)}
            </div>
          </div>

          {/* Average Commission Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Average Rate</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {commissionSummary.averageRate}%
            </div>
          </div>

          {/* Active Configuration */}
          {activeConfig && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Active Config</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {activeConfig.name}
              </div>
            </div>
          )}

          {/* Platform Commission Rate */}
          {activeConfig && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Platform Rate</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {activeConfig.platformCommission.defaultPercentage}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Performing Vendors */}
      {commissionStats?.topVendors && commissionStats.topVendors.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top Earning Vendors</h4>
          <div className="space-y-2">
            {commissionStats.topVendors.slice(0, 3).map((vendor, index) => (
              <div key={vendor.vendorId} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium mr-3 ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-24">
                    {vendor.vendorName.length > 15 
                      ? `${vendor.vendorName.substring(0, 15)}...` 
                      : vendor.vendorName
                    }
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(vendor.totalAmount, commissionSummary.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {vendor.totalCommissions} commission{vendor.totalCommissions !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Actions Alert */}
      {pendingCommissions.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-amber-600 text-lg mr-2">⚠️</span>
                <div>
                  <div className="text-sm font-medium text-amber-800">
                    {pendingCommissions.length} commission{pendingCommissions.length > 1 ? 's' : ''} awaiting approval
                  </div>
                  <div className="text-xs text-amber-600">
                    Total: {formatCurrency(
                      pendingCommissions.reduce((sum, commission) => sum + commission.totalCommissionAmount, 0), 
                      commissionSummary.currency
                    )}
                  </div>
                </div>
              </div>
              {showActions && (
                <Link
                  to="/admin/commissions?status=calculated"
                  className="text-amber-700 hover:text-amber-900 text-sm font-medium"
                >
                  Review →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Status */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            <span>Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionOverview;