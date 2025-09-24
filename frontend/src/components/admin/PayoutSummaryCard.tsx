import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchPayoutStats,
  selectPayoutStats,
  selectPendingPayouts,
  selectPayoutSummary,
  selectIsPayoutLoading
} from '../../store/slices/adminSlice';
import type { AppDispatch } from '../../store';

interface PayoutSummaryCardProps {
  className?: string;
  showActions?: boolean;
}

const PayoutSummaryCard: React.FC<PayoutSummaryCardProps> = ({ 
  className = '', 
  showActions = true 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const payoutStats = useSelector(selectPayoutStats);
  const pendingPayouts = useSelector(selectPendingPayouts);
  const payoutSummary = useSelector(selectPayoutSummary);
  const isLoading = useSelector(selectIsPayoutLoading);

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load with delay to avoid simultaneous requests with dashboard
    const initialDelay = setTimeout(() => {
      loadPayoutData();
    }, 2000); // 2 second delay after dashboard

    // Set up auto-refresh every 10 minutes (increased from 5) with staggered timing
    const interval = setInterval(() => {
      // Only refresh if document is visible and not already loading
      if (document.visibilityState === 'visible' && !isLoading) {
        loadPayoutData();
      }
    }, 10 * 60 * 1000); // 10 minutes

    setRefreshInterval(interval);

    return () => {
      clearTimeout(initialDelay);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [dispatch]);

  const loadPayoutData = async () => {
    try {
      await dispatch(fetchPayoutStats({})).unwrap();
    } catch (error) {
      console.error('Failed to load payout stats:', error);
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

  const getGrowthIndicator = (growth: number) => {
    if (growth > 0) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <span className="mr-1">↗️</span>
          <span>+{growth.toFixed(1)}%</span>
        </div>
      );
    } else if (growth < 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <span className="mr-1">↘️</span>
          <span>{growth.toFixed(1)}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-gray-500 text-sm">
        <span className="mr-1">➡️</span>
        <span>0%</span>
      </div>
    );
  };

  if (isLoading && !payoutStats) {
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
            <span className="mr-2">💸</span>
            Payout Overview
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadPayoutData}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <span className="text-sm">🔄</span>
            </button>
            {showActions && (
              <Link
                to="/admin/payouts"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                View All →
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 font-medium">Total Payouts</span>
              <span className="text-blue-600">📋</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {payoutSummary.totalRequests || 0}
            </div>
            <div className="text-sm text-blue-600">
              {formatCurrency(payoutSummary.totalAmount, payoutSummary.currency)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-700 font-medium">Pending</span>
              <span className="text-orange-600">⏳</span>
            </div>
            <div className="text-2xl font-bold text-orange-900 mb-1">
              {payoutSummary.pendingRequests || 0}
            </div>
            <div className="text-sm text-orange-600">
              {formatCurrency(payoutSummary.pendingAmount, payoutSummary.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Completed Payouts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Completed</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(payoutSummary.completedAmount, payoutSummary.currency)}
              </div>
              {payoutStats?.periodComparison?.amountGrowth !== undefined && (
                <div className="mt-1">
                  {getGrowthIndicator(payoutStats.periodComparison.amountGrowth)}
                </div>
              )}
            </div>
          </div>

          {/* Average Payout Amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Average Amount</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(payoutStats?.averagePayoutAmount || 0, payoutSummary.currency)}
            </div>
          </div>

          {/* Processing Rate */}
          {payoutStats && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Processing Rate</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {payoutStats.totalPayouts > 0 
                  ? ((payoutStats.completedPayouts / payoutStats.totalPayouts) * 100).toFixed(1)
                  : 0
                }%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions */}
      {pendingPayouts.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <div>
                  <div className="text-sm font-medium text-yellow-800">
                    {pendingPayouts.length} request{pendingPayouts.length > 1 ? 's' : ''} need{pendingPayouts.length === 1 ? 's' : ''} attention
                  </div>
                  <div className="text-xs text-yellow-600">
                    Total: {formatCurrency(
                      pendingPayouts.reduce((sum, payout) => sum + payout.requestedAmount, 0), 
                      payoutSummary.currency
                    )}
                  </div>
                </div>
              </div>
              {showActions && (
                <Link
                  to="/admin/payouts?status=pending"
                  className="text-yellow-700 hover:text-yellow-900 text-sm font-medium"
                >
                  Review →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Indicator */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            <span>Live data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutSummaryCard;