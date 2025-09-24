import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  RefreshCw
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import couponAPI from '../../services/api/couponAPI';

interface CouponUsageStatsProps {
  coupon: any;
  isOpen: boolean;
  onClose: () => void;
}

interface CouponStats {
  totalUses: number;
  totalDiscount: number;
  uniqueUsers: number;
  averageDiscount: number;
  recentUses: number;
  remainingUses: number | null;
}

const CouponUsageStats: React.FC<CouponUsageStatsProps> = ({
  coupon,
  isOpen,
  onClose
}) => {
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    if (isOpen && coupon) {
      fetchStats();
    }
  }, [isOpen, coupon, timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await couponAPI.getCouponStats(coupon._id);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching coupon stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: coupon.currency || 'AED'
    }).format(amount);
  };

  const getUsagePercentage = () => {
    if (!coupon.usageLimit || !stats) return 0;
    return (stats.totalUses / coupon.usageLimit) * 100;
  };

  const getEffectiveDiscount = () => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}%`;
      case 'fixed_amount':
        return formatCurrency(coupon.value);
      case 'free_shipping':
        return 'Free Shipping';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);

    if (!coupon.isActive || coupon.status === 'inactive') {
      return 'bg-gray-100 text-gray-800';
    }

    if (validUntil < now || coupon.status === 'expired') {
      return 'bg-red-100 text-red-800';
    }

    if (coupon.usageLimit && stats && stats.totalUses >= coupon.usageLimit) {
      return 'bg-yellow-100 text-yellow-800';
    }

    return 'bg-green-100 text-green-800';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Coupon Analytics: ${coupon.code}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header with coupon info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold">{coupon.name}</h3>
                  <Badge className={getStatusColor()}>
                    {coupon.status.charAt(0).toUpperCase() + coupon.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-3">{coupon.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Discount:</span>
                    <p className="font-medium">{getEffectiveDiscount()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Valid Until:</span>
                    <p className="font-medium">
                      {new Date(coupon.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Min. Amount:</span>
                    <p className="font-medium">
                      {coupon.minimumAmount ? formatCurrency(coupon.minimumAmount) : 'None'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">User Limit:</span>
                    <p className="font-medium">{coupon.userUsageLimit || 'Unlimited'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchStats}
                  loading={loading}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement export functionality
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time range selector */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {[
              { key: '7d', label: 'Last 7 days' },
              { key: '30d', label: 'Last 30 days' },
              { key: 'all', label: 'All time' }
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setTimeRange(option.key as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === option.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading statistics...</span>
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Total Uses</p>
                      <p className="text-2xl font-bold">{stats.totalUses}</p>
                      <p className="text-xs text-gray-500">
                        {coupon.usageLimit ? `${stats.totalUses}/${coupon.usageLimit}` : 'Unlimited'}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  {coupon.usageLimit && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getUsagePercentage().toFixed(1)}% used
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Unique Users</p>
                      <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                      <p className="text-xs text-gray-500">
                        {stats.totalUses > 0 ? (stats.uniqueUsers / stats.totalUses * 100).toFixed(1) : 0}% conversion
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Total Savings</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalDiscount)}</p>
                      <p className="text-xs text-gray-500">
                        Avg: {formatCurrency(stats.averageDiscount)}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-full">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Recent Activity</p>
                      <p className="text-2xl font-bold">{stats.recentUses}</p>
                      <p className="text-xs text-gray-500">
                        Last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : 'all'} days
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Calendar className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Usage Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Usage timeline chart would go here</p>
                    <p className="text-sm">Chart integration pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total redemptions</span>
                      <span className="font-medium">{stats.totalUses}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Average discount per use</span>
                      <span className="font-medium">{formatCurrency(stats.averageDiscount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Remaining uses</span>
                      <span className="font-medium">
                        {stats.remainingUses !== null ? stats.remainingUses : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Success rate</span>
                      <span className="font-medium">
                        {stats.totalUses > 0 ? '100%' : '0%'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.totalUses === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No usage data available yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">User engagement</span>
                            <span className="font-medium">
                              {stats.uniqueUsers > 0 ? 'High' : 'Low'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${Math.min((stats.uniqueUsers / stats.totalUses) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">Redemption rate</span>
                            <span className="font-medium">
                              {coupon.usageLimit ? `${(stats.totalUses / coupon.usageLimit * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                          {coupon.usageLimit && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600">
                            {stats.recentUses > 0
                              ? `Active usage in the last ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : 'all'} days`
                              : 'No recent activity'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No statistics available for this coupon</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CouponUsageStats;