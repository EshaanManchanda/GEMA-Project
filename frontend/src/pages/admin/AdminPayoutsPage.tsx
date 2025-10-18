import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  fetchVendorEarnings,
  fetchPayoutRequests,
  fetchPayoutStats,
  approvePayoutRequest,
  rejectPayoutRequest,
  processPayoutRequest,
  bulkApprovePayouts,
  selectVendorEarnings,
  selectPayoutRequests,
  selectPayoutStats,
  selectPendingPayouts,
  selectIsPayoutLoading,
  selectPayoutError,
  selectPayoutSummary
} from '../../store/slices/adminSlice';
import type { AppDispatch, RootState } from '../../store';
import type { PayoutRequest, VendorEarning } from '../../store/slices/adminSlice';

interface PayoutFilters {
  status: string;
  priority: string;
  vendorSearch: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

const AdminPayoutsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const vendorEarnings = useSelector(selectVendorEarnings);
  const payoutRequests = useSelector(selectPayoutRequests);
  const payoutStats = useSelector(selectPayoutStats);
  const pendingPayouts = useSelector(selectPendingPayouts);
  const isLoading = useSelector(selectIsPayoutLoading);
  const error = useSelector(selectPayoutError);
  const payoutSummary = useSelector(selectPayoutSummary);

  const [activeTab, setActiveTab] = useState<'requests' | 'earnings' | 'stats'>('requests');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [filters, setFilters] = useState<PayoutFilters>({
    status: 'all',
    priority: 'all',
    vendorSearch: '',
    dateRange: 'all',
    minAmount: '',
    maxAmount: ''
  });

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'bank_transfer',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    loadPayoutData();
  }, [dispatch]);

  const loadPayoutData = async () => {
    try {
      await Promise.all([
        dispatch(fetchPayoutRequests()).unwrap(),
        dispatch(fetchVendorEarnings()).unwrap(),
        dispatch(fetchPayoutStats()).unwrap()
      ]);
    } catch (error) {
      console.error('Failed to load payout data:', error);
    }
  };

  const handleSelectPayout = (payoutId: string) => {
    setSelectedPayouts(prev =>
      prev.includes(payoutId)
        ? prev.filter(id => id !== payoutId)
        : [...prev, payoutId]
    );
  };

  const handleSelectAllPayouts = () => {
    const filteredPayouts = getFilteredPayouts();
    const allSelected = filteredPayouts.length > 0 && 
      filteredPayouts.every(payout => selectedPayouts.includes(payout.id));
    
    if (allSelected) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(filteredPayouts.map(payout => payout.id));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedPayouts.length === 0) return;
    
    try {
      await dispatch(bulkApprovePayouts(selectedPayouts)).unwrap();
      setSelectedPayouts([]);
      toast.success(`${selectedPayouts.length} payout(s) approved successfully!`);
    } catch (error) {
      console.error('Failed to approve payouts:', error);
    }
  };

  const handleApprovePayout = async (payout: PayoutRequest) => {
    try {
      await dispatch(approvePayoutRequest({ id: payout.id })).unwrap();
      setShowApprovalModal(false);
      setSelectedPayout(null);
    } catch (error) {
      console.error('Failed to approve payout:', error);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await dispatch(rejectPayoutRequest({
        id: selectedPayout.id,
        reason: rejectionReason
      })).unwrap();
      setShowRejectionModal(false);
      setSelectedPayout(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject payout:', error);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout || !paymentData.transactionId.trim()) {
      toast.error('Please provide transaction details');
      return;
    }

    try {
      await dispatch(processPayoutRequest({
        id: selectedPayout.id,
        paymentData
      })).unwrap();
      setShowProcessModal(false);
      setSelectedPayout(null);
      setPaymentData({ paymentMethod: 'bank_transfer', transactionId: '', notes: '' });
    } catch (error) {
      console.error('Failed to process payout:', error);
    }
  };

  const getFilteredPayouts = () => {
    let filtered = payoutRequests;

    if (filters.status !== 'all') {
      filtered = filtered.filter(payout => payout.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(payout => payout.priority === filters.priority);
    }

    if (filters.vendorSearch.trim()) {
      const search = filters.vendorSearch.toLowerCase();
      filtered = filtered.filter(payout =>
        payout.vendorName.toLowerCase().includes(search) ||
        payout.vendorEmail.toLowerCase().includes(search)
      );
    }

    if (filters.minAmount) {
      filtered = filtered.filter(payout => payout.requestedAmount >= parseFloat(filters.minAmount));
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(payout => payout.requestedAmount <= parseFloat(filters.maxAmount));
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'normal': return 'text-blue-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && payoutRequests.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl font-semibold text-gray-700">Loading payouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Payout Management</h1>
          <div className="flex space-x-3">
            <button
              onClick={handleApproveSelected}
              disabled={selectedPayouts.length === 0}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="mr-2">✓</span>
              Approve Selected ({selectedPayouts.length})
            </button>
            <Link
              to="/admin/payouts/export"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <span className="mr-2">📊</span>
              Export Data
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-blue-700">Total Requests</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">📋</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900">{payoutSummary.totalRequests}</p>
            <p className="text-sm text-blue-600 mt-1">All time</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-orange-700">Pending</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-xl">⏳</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-900">{payoutSummary.pendingRequests}</p>
            <p className="text-sm text-orange-600 mt-1">{formatCurrency(payoutSummary.pendingAmount)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-green-700">Completed</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-900">{formatCurrency(payoutSummary.completedAmount)}</p>
            <p className="text-sm text-green-600 mt-1">This period</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-purple-700">Total Amount</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">💰</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-900">{formatCurrency(payoutSummary.totalAmount)}</p>
            <p className="text-sm text-purple-600 mt-1">All time</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Payout Requests ({payoutRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'earnings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Vendor Earnings ({vendorEarnings.length})
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics & Reports
              </button>
            </nav>
          </div>

          {/* Filters */}
          {activeTab === 'requests' && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Vendor</label>
                  <input
                    type="text"
                    value={filters.vendorSearch}
                    onChange={(e) => setFilters({ ...filters, vendorSearch: e.target.value })}
                    placeholder="Search by vendor name or email..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    placeholder="∞"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {activeTab === 'requests' && (
              <div>
                {/* Payout Requests Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={getFilteredPayouts().length > 0 && getFilteredPayouts().every(p => selectedPayouts.includes(p.id))}
                            onChange={handleSelectAllPayouts}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Request Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredPayouts().map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPayouts.includes(payout.id)}
                              onChange={() => handleSelectPayout(payout.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{payout.payoutId}</div>
                              <div className="text-sm text-gray-500">{payout.paymentMethod.type}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{payout.vendorName}</div>
                              <div className="text-sm text-gray-500">{payout.vendorEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{formatCurrency(payout.requestedAmount)}</div>
                              <div className="text-sm text-gray-500">Final: {formatCurrency(payout.finalAmount)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                              {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getPriorityColor(payout.priority)}`}>
                              {payout.priority.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payout.requestedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {payout.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setShowApprovalModal(true);
                                    }}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setShowRejectionModal(true);
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {payout.status === 'approved' && (
                                <button
                                  onClick={() => {
                                    setSelectedPayout(payout);
                                    setShowProcessModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Process
                                </button>
                              )}
                              <Link
                                to={`/admin/payouts/${payout.id}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {getFilteredPayouts().length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">💸</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No payout requests found</h3>
                      <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                {/* Vendor Earnings Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Earnings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Available Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vendorEarnings.map((earning) => (
                        <tr key={earning.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{earning.vendorName}</div>
                              <div className="text-sm text-gray-500">{earning.vendorEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(earning.totalEarnings, earning.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(earning.availableBalance, earning.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-yellow-600">
                              {formatCurrency(earning.pendingBalance, earning.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{earning.commissionRate}%</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{earning.totalOrders}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(earning.status)}`}>
                              {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Link
                                to={`/admin/vendors/${earning.vendorId}/earnings`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View Details
                              </Link>
                              <button className="text-blue-600 hover:text-blue-900">
                                Generate Payout
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {vendorEarnings.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No vendor earnings found</h3>
                      <p className="text-gray-500">Vendor earnings data will appear here once available.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                {/* Analytics and Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Trends</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-gray-400 text-4xl mb-2">📈</div>
                        <p className="text-gray-500">Payout trend chart will be displayed here</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-gray-400 text-4xl mb-2">🏦</div>
                        <p className="text-gray-500">Payment method distribution chart</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Times</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-gray-400 text-4xl mb-2">⏱️</div>
                        <p className="text-gray-500">Average processing time metrics</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Export Reports</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Export Payout Summary (PDF)
                      </button>
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Export Vendor Earnings (CSV)
                      </button>
                      <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Export Transaction Log (Excel)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {/* Approval Modal */}
        {showApprovalModal && selectedPayout && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2">Approve Payout Request</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to approve this payout request for{' '}
                    <strong>{formatCurrency(selectedPayout.requestedAmount)}</strong> to{' '}
                    <strong>{selectedPayout.vendorName}</strong>?
                  </p>
                </div>
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    onClick={() => handleApprovePayout(selectedPayout)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && selectedPayout && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <span className="text-red-600 text-xl">✗</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2 text-center">Reject Payout Request</h3>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-center space-x-3 mt-6">
                  <button
                    onClick={handleRejectPayout}
                    disabled={!rejectionReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Modal */}
        {showProcessModal && selectedPayout && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <span className="text-blue-600 text-xl">🏦</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2 text-center">Process Payout</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentData.paymentMethod}
                      onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Stripe</option>
                      <option value="wise">Wise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={paymentData.transactionId}
                      onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                      placeholder="Enter transaction ID..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-center space-x-3 mt-6">
                  <button
                    onClick={handleProcessPayout}
                    disabled={!paymentData.transactionId.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Process
                  </button>
                  <button
                    onClick={() => setShowProcessModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default AdminPayoutsPage;