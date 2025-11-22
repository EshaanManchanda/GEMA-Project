import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  fetchPayoutDashboard,
  fetchPayoutHistory,
  fetchPendingEarnings,
  requestPayout,
  cancelPayoutRequest,
  selectEarnings,
  selectRecentPayouts,
  selectPendingRequests,
  selectPaymentSettings,
  selectPayoutHistory,
  selectCommissionTransactions,
  selectIsDashboardLoading,
  selectIsHistoryLoading,
  selectIsCommissionLoading,
  selectDashboardError
} from '../../store/slices/vendorPayoutSlice';
import type { AppDispatch } from '../../store';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import vendorPayoutAPI, { SubscriptionStatusData, CommissionHistoryData } from '../../services/api/vendorPayoutAPI';

const VendorPayoutsDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const earnings = useSelector(selectEarnings);
  const recentPayouts = useSelector(selectRecentPayouts);
  const pendingRequests = useSelector(selectPendingRequests);
  const paymentSettings = useSelector(selectPaymentSettings);
  const isDashboardLoading = useSelector(selectIsDashboardLoading);
  const dashboardError = useSelector(selectDashboardError);

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'charges'>('overview');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');

  // Subscription/Commission specific state
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatusData | null>(null);
  const [commissionData, setCommissionData] = useState<CommissionHistoryData | null>(null);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

  useEffect(() => {
    dispatch(fetchPayoutDashboard());
  }, [dispatch]);

  // Fetch subscription or commission data based on payment mode
  useEffect(() => {
    const fetchExtraData = async () => {
      if (!paymentSettings?.paymentMode) return;

      setIsLoadingExtra(true);
      try {
        if (paymentSettings.paymentMode === 'custom_stripe') {
          const data = await vendorPayoutAPI.getSubscriptionStatus();
          setSubscriptionData(data);
        } else {
          const data = await vendorPayoutAPI.getCommissionHistory({ page: 1, limit: 10 });
          setCommissionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch extra data:', error);
      } finally {
        setIsLoadingExtra(false);
      }
    };

    fetchExtraData();
  }, [paymentSettings?.paymentMode]);

  const handleRequestPayout = async () => {
    const amount = requestAmount ? parseFloat(requestAmount) : undefined;

    try {
      await dispatch(requestPayout(amount)).unwrap();
      toast.success('Payout request submitted successfully');
      setShowRequestModal(false);
      setRequestAmount('');
    } catch (error: any) {
      toast.error(error || 'Failed to request payout');
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this payout request?')) {
      try {
        await dispatch(cancelPayoutRequest(id)).unwrap();
        toast.success('Payout request cancelled');
      } catch (error: any) {
        toast.error(error || 'Failed to cancel request');
      }
    }
  };

  const canRequestPayout = earnings && paymentSettings &&
    earnings.pendingBalance >= (paymentSettings.minimumPayout || 50);

  const isSubscriptionModel = paymentSettings?.paymentMode === 'custom_stripe';

  if (isDashboardLoading && !earnings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{dashboardError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render subscription status card for subscription model
  const renderSubscriptionStatus = () => {
    if (!subscriptionData?.subscription) return null;

    const sub = subscriptionData.subscription;
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-red-100 text-red-800',
      grace_period: 'bg-orange-100 text-orange-800'
    };

    return (
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Subscription Status</h2>
        </div>
        <div className="p-6">
          {/* Status Banner */}
          {sub.isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800">Subscription Expired</h3>
                  <p className="text-sm text-red-700">Your subscription has expired. Your events are hidden from the portal. Please renew to restore visibility.</p>
                </div>
              </div>
              <button className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium">
                Renew Subscription
              </button>
            </div>
          )}

          {sub.status === 'grace_period' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-orange-800">Grace Period</h3>
                  <p className="text-sm text-orange-700">Your subscription is in grace period. Please renew within {Math.abs(sub.daysUntilRenewal || 0)} days to avoid suspension.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${statusColors[sub.status] || 'bg-gray-100 text-gray-800'}`}>
                {sub.status.replace('_', ' ').charAt(0).toUpperCase() + sub.status.replace('_', ' ').slice(1)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Fee</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{sub.currency} {sub.amount}/month</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Next Renewal</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {sub.paidUntil ? new Date(sub.paidUntil).toLocaleDateString() : 'N/A'}
              </p>
              {sub.daysUntilRenewal !== null && sub.daysUntilRenewal !== undefined && sub.daysUntilRenewal > 0 && (
                <p className="text-sm text-gray-500">{sub.daysUntilRenewal} days remaining</p>
              )}
            </div>
          </div>

          {/* Payment History */}
          {sub.paymentHistory && sub.paymentHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sub.paymentHistory.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sub.currency} {payment.amount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.periodStart).toLocaleDateString()} - {new Date(payment.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render commission charges for commission model
  const renderCommissionCharges = () => {
    if (!commissionData) return null;

    return (
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Commission Charges</h2>
            <span className="text-sm text-gray-500">
              Commission Rate: <span className="font-semibold text-orange-600">{commissionData.commissionRate}%</span>
            </span>
          </div>
        </div>
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-xl font-bold text-gray-900">AED {commissionData.summary.totalSales.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Platform Commission</p>
              <p className="text-xl font-bold text-orange-600">AED {commissionData.summary.totalCommissionPaid.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Your Earnings</p>
              <p className="text-xl font-bold text-green-600">AED {commissionData.summary.totalEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-xl font-bold text-blue-600">{commissionData.summary.totalTransactions}</p>
            </div>
          </div>

          {/* Transactions Table */}
          {commissionData.transactions && commissionData.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Earnings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissionData.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tx.orderNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        AED {tx.originalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600">
                        -AED {tx.platformCommission.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                        AED {tx.vendorCommission.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.calculatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'paid' ? 'bg-green-100 text-green-800' :
                          tx.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No commission transactions yet</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payouts & Earnings</h1>
          <p className="mt-2 text-gray-600">Manage your earnings and payout requests</p>
          {/* Payment Model Badge */}
          <div className="mt-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isSubscriptionModel ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {isSubscriptionModel ? '📅 Subscription Model' : '💰 Commission Model'}
            </span>
          </div>
        </div>

        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {earnings?.currency} {earnings?.totalEarned.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Balance</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {earnings?.currency} {earnings?.pendingBalance.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid Out</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {earnings?.currency} {earnings?.totalPaidOut.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Processing</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {earnings?.currency} {earnings?.inProcessing.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Status (for subscription model) */}
        {isSubscriptionModel && !isLoadingExtra && renderSubscriptionStatus()}

        {/* Commission Charges (for commission model) */}
        {!isSubscriptionModel && !isLoadingExtra && renderCommissionCharges()}

        {isLoadingExtra && (
          <div className="bg-white rounded-lg shadow p-6 mb-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading {isSubscriptionModel ? 'subscription' : 'commission'} data...</p>
          </div>
        )}

        {/* Request Payout Button */}
        {canRequestPayout && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request Payout</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You have {earnings?.currency} {earnings?.pendingBalance.toFixed(2)} available for payout
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Request Payout
              </button>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests && pendingRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pending Payout Requests</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingRequests.map((request: any) => (
                <div key={request.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.currency} {request.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Requested on {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Payouts */}
        {recentPayouts && recentPayouts.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Payouts</h2>
              <Link to="/vendor/payouts/history" className="text-orange-600 hover:text-orange-700 font-medium">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentPayouts.map((payout: any) => (
                    <tr key={payout.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payout.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payout.paidAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Settings Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Payment Settings</h3>
              <p className="mt-1 text-sm text-blue-700">
                {isSubscriptionModel ? (
                  <>Monthly subscription: AED {subscriptionData?.subscription?.amount || 150}</>
                ) : (
                  <>Commission rate: {paymentSettings?.commissionRate || 5}%</>
                )} |
                Minimum payout: {earnings?.currency} {paymentSettings?.minimumPayout || 50} |
                Preferred method: {paymentSettings?.preferredPayoutMethod || 'bank_transfer'}
              </p>
              <Link to="/vendor/payment-settings" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
                Update Payment Settings →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Payout</h2>
            <p className="text-gray-600 mb-4">
              Available balance: {earnings?.currency} {earnings?.pendingBalance.toFixed(2)}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (optional - leave empty for full balance)
              </label>
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                min="0"
                max={earnings?.pendingBalance}
                step="0.01"
                placeholder={`Max: ${earnings?.pendingBalance.toFixed(2)}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRequestPayout}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestAmount('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPayoutsDashboard;
