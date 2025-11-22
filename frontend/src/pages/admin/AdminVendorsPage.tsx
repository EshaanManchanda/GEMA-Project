import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface Vendor {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  paymentMode: 'platform_stripe' | 'custom_stripe';
  commissionRate: number;
  subscriptionStatus?: string;
  subscriptionPaidUntil?: string;
  isActive: boolean;
  isSuspended: boolean;
  verificationStatus: string;
  createdAt: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  vendorsByPaymentMode: Record<string, number>;
  vendorsBySubscriptionStatus: Record<string, number>;
  subscriptionsExpiringSoon: number;
}

const AdminVendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'paymentMode' | 'status'>('paymentMode');

  // Form state
  const [paymentMode, setPaymentMode] = useState<'platform_stripe' | 'custom_stripe'>('platform_stripe');
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(150);
  const [isActive, setIsActive] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, [page, search, filterPaymentMode, filterActive]);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (filterPaymentMode) params.append('paymentMode', filterPaymentMode);
      if (filterActive) params.append('isActive', filterActive);

      const response = await api.get(`/admin/vendors?${params.toString()}`);
      setVendors(response.data.data.vendors);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/vendors/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const openPaymentModeModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setPaymentMode(vendor.paymentMode);
    setCommissionRate(vendor.commissionRate);
    setModalMode('paymentMode');
    setShowModal(true);
  };

  const openStatusModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsActive(vendor.isActive);
    setIsSuspended(vendor.isSuspended);
    setSuspensionReason('');
    setModalMode('status');
    setShowModal(true);
  };

  const handleUpdatePaymentMode = async () => {
    if (!selectedVendor) return;

    try {
      await api.put(`/admin/vendors/${selectedVendor.id}/payment-mode`, {
        paymentMode,
        commissionRate: paymentMode === 'platform_stripe' ? commissionRate : undefined,
        subscriptionAmount: paymentMode === 'custom_stripe' ? subscriptionAmount : undefined,
      });

      toast.success(`Vendor payment mode updated to ${paymentMode === 'platform_stripe' ? 'Commission' : 'Subscription'}`);
      setShowModal(false);
      fetchVendors();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update payment mode');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedVendor) return;

    try {
      await api.put(`/admin/vendors/${selectedVendor.id}/status`, {
        isActive,
        isSuspended,
        suspensionReason: isSuspended ? suspensionReason : undefined,
      });

      toast.success('Vendor status updated successfully');
      setShowModal(false);
      fetchVendors();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddManualPayment = async (vendorId: string) => {
    if (!window.confirm('Add a manual subscription payment for this vendor? This will extend their subscription by 1 month.')) return;

    try {
      await api.put(`/admin/vendors/${vendorId}/subscription-status`, {
        addPayment: true,
      });

      toast.success('Manual payment added successfully');
      fetchVendors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="mt-2 text-gray-600">Manage vendor payment models and status</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVendors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeVendors}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Commission Model</p>
              <p className="text-2xl font-bold text-blue-600">{stats.vendorsByPaymentMode.platform_stripe || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Subscription Model</p>
              <p className="text-2xl font-bold text-purple-600">{stats.vendorsByPaymentMode.custom_stripe || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">{stats.subscriptionsExpiringSoon}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="vendor-search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                id="vendor-search"
                name="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Business name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="filter-payment-mode" className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
              <select
                id="filter-payment-mode"
                name="filterPaymentMode"
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All</option>
                <option value="platform_stripe">Commission</option>
                <option value="custom_stripe">Subscription</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-active" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="filter-active"
                name="filterActive"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSearch(''); setFilterPaymentMode(''); setFilterActive(''); }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading vendors...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{vendor.businessName}</div>
                          <div className="text-sm text-gray-500">{vendor.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.paymentMode === 'custom_stripe'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {vendor.paymentMode === 'custom_stripe' ? 'Subscription' : 'Commission'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {vendor.paymentMode === 'custom_stripe' ? (
                          <span className="text-purple-600 font-medium">150 AED/month</span>
                        ) : (
                          <span className="text-blue-600 font-medium">{vendor.commissionRate}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {vendor.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {vendor.isSuspended && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Suspended
                            </span>
                          )}
                          {vendor.subscriptionStatus && vendor.paymentMode === 'custom_stripe' && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              vendor.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' :
                              vendor.subscriptionStatus === 'expired' ? 'bg-red-100 text-red-800' :
                              vendor.subscriptionStatus === 'grace_period' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              Sub: {vendor.subscriptionStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vendor.paymentMode === 'custom_stripe' && vendor.subscriptionPaidUntil
                          ? new Date(vendor.subscriptionPaidUntil).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openPaymentModeModal(vendor)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Payment
                          </button>
                          <button
                            onClick={() => openStatusModal(vendor)}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                          >
                            Status
                          </button>
                          {vendor.paymentMode === 'custom_stripe' && (
                            <button
                              onClick={() => handleAddManualPayment(vendor.id)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              +Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {modalMode === 'paymentMode' ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Update Payment Model
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Vendor: <strong>{selectedVendor.businessName}</strong>
                </p>

                <div className="mb-4">
                  <label htmlFor="payment-mode" className="block text-sm font-medium text-gray-700 mb-2">Payment Model</label>
                  <select
                    id="payment-mode"
                    name="paymentMode"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'platform_stripe' | 'custom_stripe')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="platform_stripe">Commission Model (Default)</option>
                    <option value="custom_stripe">Subscription Model</option>
                  </select>
                </div>

                {paymentMode === 'platform_stripe' && (
                  <div className="mb-4">
                    <label htmlFor="commission-rate" className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                    <input
                      type="number"
                      id="commission-rate"
                      name="commissionRate"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                {paymentMode === 'custom_stripe' && (
                  <div className="mb-4">
                    <label htmlFor="subscription-amount" className="block text-sm font-medium text-gray-700 mb-2">Monthly Subscription (AED)</label>
                    <input
                      type="number"
                      id="subscription-amount"
                      name="subscriptionAmount"
                      value={subscriptionAmount}
                      onChange={(e) => setSubscriptionAmount(Number(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    {paymentMode === 'platform_stripe' ? (
                      <>Vendor will pay <strong>{commissionRate}%</strong> commission on each transaction.</>
                    ) : (
                      <>Vendor will pay <strong>AED {subscriptionAmount}/month</strong> subscription fee with no commission.</>
                    )}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUpdatePaymentMode}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Update Vendor Status
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Vendor: <strong>{selectedVendor.businessName}</strong>
                </p>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Inactive vendors' events won't be displayed on the portal</p>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSuspended}
                      onChange={(e) => setIsSuspended(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Suspended</span>
                  </label>
                </div>

                {isSuspended && (
                  <div className="mb-4">
                    <label htmlFor="suspension-reason" className="block text-sm font-medium text-gray-700 mb-2">Suspension Reason</label>
                    <textarea
                      id="suspension-reason"
                      name="suspensionReason"
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter reason for suspension..."
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateStatus}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorsPage;
