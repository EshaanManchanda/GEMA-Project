import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  useAdminPayoutRequests,
  useApprovePayout,
  useRejectPayout,
  useBulkApprovePayouts,
} from '@/features/admin/hooks/useAdminApis';
import { adminPayoutsAPI } from '@/features/admin/services/adminApis';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
import { AdminPageHeader, AdminStatCard, AdminStatusBadge, AdminEmptyState } from '@/shared/components/admin';

interface PayoutFilters {
  status: string;
  priority: string;
  vendorSearch: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

interface PayoutRequest {
  id: string;
  payoutId: string;
  vendorName: string;
  vendorEmail: string;
  requestedAmount: number;
  finalAmount: number;
  status: string;
  priority: string;
  paymentMethod: { type: string };
  requestedAt: string;
}

interface VendorEarning {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  commissionRate: number;
  totalOrders: number;
  currency: string;
  status: string;
}

const AdminPayoutsPage: React.FC = () => {
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

  const { data: payoutsResponse, isLoading, refetch } = useAdminPayoutRequests({
    status: filters.status !== 'all' ? filters.status : undefined,
  });

  const approvePayout = useApprovePayout();
  const rejectPayout = useRejectPayout();
  const bulkApprovePayouts = useBulkApprovePayouts();

  const payoutRequests: PayoutRequest[] = payoutsResponse?.data?.requests || payoutsResponse?.requests || [];

  const [vendorEarnings, setVendorEarnings] = useState<VendorEarning[]>([]);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await adminPayoutsAPI.getVendorEarnings();
        setVendorEarnings(response.data?.earnings || response.data || []);
      } catch (error) {
        logger.error('Failed to fetch vendor earnings:', error);
      }
    };
    fetchEarnings();
  }, []);

  const payoutSummary = {
    totalRequests: payoutRequests.length,
    pendingRequests: payoutRequests.filter(p => p.status === 'pending').length,
    pendingAmount: payoutRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.requestedAmount, 0),
    completedAmount: payoutRequests.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.finalAmount, 0),
    totalAmount: payoutRequests.reduce((sum, p) => sum + p.finalAmount, 0),
  };

  const handleSelectPayout = (payoutId: string) => {
    setSelectedPayouts(prev =>
      prev.includes(payoutId) ? prev.filter(id => id !== payoutId) : [...prev, payoutId]
    );
  };

  const handleSelectAllPayouts = () => {
    const filteredPayouts = getFilteredPayouts();
    const allSelected = filteredPayouts.length > 0 && filteredPayouts.every(payout => selectedPayouts.includes(payout.id));
    if (allSelected) setSelectedPayouts([]);
    else setSelectedPayouts(filteredPayouts.map(payout => payout.id));
  };

  const handleApproveSelected = async () => {
    if (selectedPayouts.length === 0) return;
    try {
      await bulkApprovePayouts.mutateAsync({ ids: selectedPayouts });
      setSelectedPayouts([]);
      toast.success(`${selectedPayouts.length} payout(s) approved successfully!`);
      refetch();
    } catch (error) {
      logger.error('Failed to approve payouts:', error);
      toast.error('Failed to approve payouts');
    }
  };

  const handleApprovePayout = async (payout: PayoutRequest) => {
    try {
      await approvePayout.mutateAsync(payout.id);
      setShowApprovalModal(false);
      setSelectedPayout(null);
      refetch();
    } catch (error) {
      logger.error('Failed to approve payout:', error);
      toast.error('Failed to approve payout');
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await rejectPayout.mutateAsync({ id: selectedPayout.id, data: { reason: rejectionReason } });
      setShowRejectionModal(false);
      setSelectedPayout(null);
      setRejectionReason('');
      refetch();
    } catch (error) {
      logger.error('Failed to reject payout:', error);
      toast.error('Failed to reject payout');
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout || !paymentData.transactionId.trim()) {
      toast.error('Please provide transaction details');
      return;
    }
    try {
      await adminPayoutsAPI.processPayout(selectedPayout.id);
      setShowProcessModal(false);
      setSelectedPayout(null);
      setPaymentData({ paymentMethod: 'bank_transfer', transactionId: '', notes: '' });
      refetch();
      toast.success('Payout processed successfully');
    } catch (error) {
      logger.error('Failed to process payout:', error);
      toast.error('Failed to process payout');
    }
  };

  const handleExecutePayout = async (payout: PayoutRequest) => {
    try {
      await adminPayoutsAPI.processPayout(payout.id);
      toast.success('Payout executed successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to execute payout');
      logger.error('Execute payout failed:', error);
    }
  };

  const getFilteredPayouts = () => {
    let filtered = payoutRequests;
    if (filters.status !== 'all') filtered = filtered.filter(payout => payout.status === filters.status);
    if (filters.priority !== 'all') filtered = filtered.filter(payout => payout.priority === filters.priority);
    if (filters.vendorSearch.trim()) {
      const search = filters.vendorSearch.toLowerCase();
      filtered = filtered.filter(payout => payout.vendorName.toLowerCase().includes(search) || payout.vendorEmail.toLowerCase().includes(search));
    }
    if (filters.minAmount) filtered = filtered.filter(payout => payout.requestedAmount >= parseFloat(filters.minAmount));
    if (filters.maxAmount) filtered = filtered.filter(payout => payout.requestedAmount <= parseFloat(filters.maxAmount));
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'processing': return 'info';
      case 'completed': return 'success';
      case 'rejected': return 'danger';
      case 'failed': return 'default';
      default: return 'default';
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
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    <>
      <PrivatePageSEO title="Admin - Payouts | Gema" description="Manage vendor payouts" />
      <div className="container mx-auto px-4 py-8">
        <AdminPageHeader
          title="Payout Management"
          actions={
            <>
              <button onClick={handleApproveSelected} disabled={selectedPayouts.length === 0} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <span className="mr-2">✓</span>Approve Selected ({selectedPayouts.length})
              </button>
              <Link to="/admin/payouts/export" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                <span className="mr-2">📊</span>Export Data
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AdminStatCard label="Total Requests" value={payoutSummary.totalRequests} color="bg-blue-500" icon={<span className="text-xl">📋</span>} />
          <AdminStatCard label="Pending" value={`${payoutSummary.pendingRequests} (${formatCurrency(payoutSummary.pendingAmount)})`} color="bg-orange-500" icon={<span className="text-xl">⏳</span>} />
          <AdminStatCard label="Completed" value={formatCurrency(payoutSummary.completedAmount)} color="bg-green-500" icon={<span className="text-xl">✅</span>} />
          <AdminStatCard label="Total Amount" value={formatCurrency(payoutSummary.totalAmount)} color="bg-purple-500" icon={<span className="text-xl">💰</span>} />
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('requests')} className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'requests' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Payout Requests ({payoutRequests.length})</button>
              <button onClick={() => setActiveTab('earnings')} className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'earnings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Vendor Earnings ({vendorEarnings.length})</button>
              <button onClick={() => setActiveTab('stats')} className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'stats' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Analytics & Reports</button>
            </nav>
          </div>

          {activeTab === 'requests' && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Status</label><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"><option value="all">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Priority</label><select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"><option value="all">All Priorities</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Search Vendor</label><input type="text" value={filters.vendorSearch} onChange={(e) => setFilters({ ...filters, vendorSearch: e.target.value })} placeholder="Search by vendor name or email..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label><input type="number" value={filters.minAmount} onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label><input type="number" value={filters.maxAmount} onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })} placeholder="∞" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" /></div>
              </div>
            </div>
          )}

          <div className="p-6">
            {activeTab === 'requests' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><input type="checkbox" checked={getFilteredPayouts().length > 0 && getFilteredPayouts().every(p => selectedPayouts.includes(p.id))} onChange={handleSelectAllPayouts} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredPayouts().map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap"><input type="checkbox" checked={selectedPayouts.includes(payout.id)} onChange={() => handleSelectPayout(payout.id)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div><div className="text-sm font-medium text-gray-900">#{payout.payoutId}</div><div className="text-sm text-gray-500">{payout.paymentMethod.type}</div></div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div><div className="text-sm font-medium text-gray-900">{payout.vendorName}</div><div className="text-sm text-gray-500">{payout.vendorEmail}</div></div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div><div className="text-sm font-medium text-gray-900">{formatCurrency(payout.requestedAmount)}</div><div className="text-sm text-gray-500">Final: {formatCurrency(payout.finalAmount)}</div></div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><AdminStatusBadge status={payout.status} variant={getStatusColor(payout.status) as any} /></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className={`text-sm font-medium ${getPriorityColor(payout.priority)}`}>{payout.priority.toUpperCase()}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payout.requestedAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {payout.status === 'pending' && (<><button onClick={() => { setSelectedPayout(payout); setShowApprovalModal(true); }} className="text-green-600 hover:text-green-900">Approve</button><button onClick={() => { setSelectedPayout(payout); setShowRejectionModal(true); }} className="text-red-600 hover:text-red-900">Reject</button></>)}
                              {payout.status === 'approved' && (<><button onClick={() => { setSelectedPayout(payout); setShowProcessModal(true); }} className="text-blue-600 hover:text-blue-900">Process</button><button onClick={() => handleExecutePayout(payout)} className="text-purple-600 hover:text-purple-900" title="Execute Stripe transfer automatically">Execute</button></>)}
                              <Link to={`/admin/payouts/${payout.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredPayouts().length === 0 && <AdminEmptyState title="No payout requests found" description="Try adjusting your filters or check back later." />}
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Earnings</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vendorEarnings.map((earning) => (
                        <tr key={earning.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap"><div><div className="text-sm font-medium text-gray-900">{earning.vendorName}</div><div className="text-sm text-gray-500">{earning.vendorEmail}</div></div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{formatCurrency(earning.totalEarnings, earning.currency)}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-green-600">{formatCurrency(earning.availableBalance, earning.currency)}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-yellow-600">{formatCurrency(earning.pendingBalance, earning.currency)}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{earning.commissionRate}%</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{earning.totalOrders}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><AdminStatusBadge status={earning.status} /></td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Link to={`/admin/vendors/${earning.vendorId}/earnings`} className="text-indigo-600 hover:text-indigo-900">View Details</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {vendorEarnings.length === 0 && <AdminEmptyState title="No vendor earnings found" description="Vendor earnings data will appear here once available." />}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-medium text-gray-900 mb-4">Payout Trends</h3><div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"><div className="text-center"><div className="text-gray-400 text-4xl mb-2">📈</div><p className="text-gray-500">Payout trend chart will be displayed here</p></div></div></div>
                  <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3><div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"><div className="text-center"><div className="text-gray-400 text-4xl mb-2">🏦</div><p className="text-gray-500">Payment method distribution chart</p></div></div></div>
                  <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-medium text-gray-900 mb-4">Processing Times</h3><div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"><div className="text-center"><div className="text-gray-400 text-4xl mb-2">⏱️</div><p className="text-gray-500">Average processing time metrics</p></div></div></div>
                  <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-medium text-gray-900 mb-4">Export Reports</h3><div className="space-y-3"><button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Export Payout Summary (PDF)</button><button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Export Vendor Earnings (CSV)</button><button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Export Transaction Log (Excel)</button></div></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showApprovalModal && selectedPayout && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100"><span className="text-green-600 text-xl">✓</span></div>
                <h3 className="text-lg font-medium text-gray-900 mt-2">Approve Payout Request</h3>
                <div className="mt-2 px-7 py-3"><p className="text-sm text-gray-500">Are you sure you want to approve this payout request for <strong>{formatCurrency(selectedPayout.requestedAmount)}</strong> to <strong>{selectedPayout.vendorName}</strong>?</p></div>
                <div className="flex justify-center space-x-3 mt-4">
                  <button onClick={() => handleApprovePayout(selectedPayout)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => setShowApprovalModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRejectionModal && selectedPayout && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100"><span className="text-red-600 text-xl">✗</span></div>
                <h3 className="text-lg font-medium text-gray-900 mt-2 text-center">Reject Payout Request</h3>
                <div className="mt-4"><label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label><textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Please provide a reason for rejection..." rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" /></div>
                <div className="flex justify-center space-x-3 mt-6">
                  <button onClick={handleRejectPayout} disabled={!rejectionReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
                  <button onClick={() => setShowRejectionModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showProcessModal && selectedPayout && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100"><span className="text-blue-600 text-xl">🏦</span></div>
                <h3 className="text-lg font-medium text-gray-900 mt-2 text-center">Process Payout</h3>
                <div className="mt-4 space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label><select value={paymentData.paymentMethod} onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="bank_transfer">Bank Transfer</option><option value="paypal">PayPal</option><option value="stripe">Stripe</option><option value="wise">Wise</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label><input type="text" value={paymentData.transactionId} onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })} placeholder="Enter transaction ID..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label><textarea value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} placeholder="Additional notes..." rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" /></div>
                </div>
                <div className="flex justify-center space-x-3 mt-6">
                  <button onClick={handleProcessPayout} disabled={!paymentData.transactionId.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Process</button>
                  <button onClick={() => setShowProcessModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPayoutsPage;
