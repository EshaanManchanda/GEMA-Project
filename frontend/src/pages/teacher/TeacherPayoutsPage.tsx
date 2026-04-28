import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  FaDollarSign,
  FaClock,
  FaCheckCircle,
  FaSpinner,
  FaExternalLinkAlt,
  FaCreditCard,
} from 'react-icons/fa';
import { TeacherNavigation } from '@/components/teacher';
import {
  useTeacherPayoutDashboard,
  useTeacherPayoutHistory,
} from '@/hooks/queries/useTeacherQuery';
import { useRequestPayout } from '@/hooks/mutations/useTeacherMutations';

const TeacherPayoutsPage: React.FC = () => {
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  // Queries
  const { data: dashboard, isLoading: isLoadingDashboard } = useTeacherPayoutDashboard();
  const { data: history, isLoading: isLoadingHistory } = useTeacherPayoutHistory({
    page: historyPage,
    limit: 10,
  });

  // Mutations
  const requestPayoutMutation = useRequestPayout();

  // Handle payout request
  const handleRequestPayout = async () => {
    const amount = payoutAmount ? parseFloat(payoutAmount) : undefined;

    if (amount && amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await requestPayoutMutation.mutateAsync({
        amount: amount || dashboard?.earnings?.pendingBalance || 0,
        currency: dashboard?.earnings?.currency || 'AED',
      });
      toast.success('Payout request submitted!');
      setShowPayoutModal(false);
      setPayoutAmount('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to request payout');
    }
  };

  const canRequestPayout =
    dashboard?.earnings?.pendingBalance &&
    dashboard.earnings.pendingBalance >= (dashboard?.paymentSettings?.minimumPayout || 50);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
          <p className="text-gray-600 mt-1">Manage your earnings and payout requests</p>
        </div>

        {/* Earnings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoadingDashboard ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block" />
                  ) : (
                    `${dashboard?.earnings?.currency || 'AED'} ${(dashboard?.earnings?.totalEarned || 0).toFixed(2)}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <FaDollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Balance</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {isLoadingDashboard ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block" />
                  ) : (
                    `${dashboard?.earnings?.currency || 'AED'} ${(dashboard?.earnings?.pendingBalance || 0).toFixed(2)}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <FaClock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Paid Out</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoadingDashboard ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block" />
                  ) : (
                    `${dashboard?.earnings?.currency || 'AED'} ${(dashboard?.earnings?.totalPaidOut || 0).toFixed(2)}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FaCheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {isLoadingDashboard ? (
                    <span className="animate-pulse bg-gray-200 rounded h-8 w-24 inline-block" />
                  ) : (
                    `${dashboard?.earnings?.currency || 'AED'} ${(dashboard?.earnings?.inProcessing || 0).toFixed(2)}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <FaSpinner className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stripe Settings Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <FaCreditCard className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Stripe Integration</h3>
                <p className="text-sm text-gray-500">
                  Configure your Stripe API key to accept payments for your events
                </p>
              </div>
            </div>
            <Link
              to="/teacher/payment-settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Payment Settings
              <FaExternalLinkAlt className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Request Payout Section */}
        {canRequestPayout && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-white">
                <h3 className="text-lg font-semibold">Request Payout</h3>
                <p className="text-purple-100 mt-1">
                  You have {dashboard?.earnings?.currency} {dashboard?.earnings?.pendingBalance?.toFixed(2)} available
                </p>
              </div>
              <button
                onClick={() => setShowPayoutModal(true)}
                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                Request Payout
              </button>
            </div>
          </motion.div>
        )}

        {/* Payout History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
          </div>

          {isLoadingHistory ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <span className="bg-gray-200 rounded h-12 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : history?.payouts && history.payouts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.payouts.map((payout: any) => (
                      <tr key={payout._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payout.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {payout.currency} {payout.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {payout.payoutMethod?.replace('_', ' ') || 'Bank Transfer'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                              payout.status
                            )}`}
                          >
                            {payout.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {history.pagination && history.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Page {history.pagination.currentPage} of {history.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={historyPage >= history.pagination.totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <FaDollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No payout history yet</h4>
              <p className="text-gray-500">
                Your payout history will appear here once you request a payout.
              </p>
            </div>
          )}
        </motion.div>

        {/* Payment Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaDollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Payment Information</h4>
              <p className="text-sm text-blue-700 mt-1">
                Minimum payout: {dashboard?.earnings?.currency || 'AED'} {dashboard?.paymentSettings?.minimumPayout || 50} |
                Commission rate: {dashboard?.paymentSettings?.commissionRate || 5}% |
                Preferred method: {dashboard?.paymentSettings?.preferredPayoutMethod || 'Bank Transfer'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Payout</h2>
            <p className="text-gray-600 mb-4">
              Available balance: {dashboard?.earnings?.currency} {dashboard?.earnings?.pendingBalance?.toFixed(2)}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (leave empty for full balance)
              </label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min="0"
                max={dashboard?.earnings?.pendingBalance}
                step="0.01"
                placeholder={`Max: ${dashboard?.earnings?.pendingBalance?.toFixed(2)}`}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRequestPayout}
                disabled={requestPayoutMutation.isPending}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {requestPayoutMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setPayoutAmount('');
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TeacherPayoutsPage;
