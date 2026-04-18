import React, { useState, useEffect } from 'react';
import { FaEye, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import {
  useAdminVendors,
  useUpdateVendorStatus,
  useVerifyVendorDocument,
} from '@/features/admin/hooks/useAdminApis';
import { adminVendorsAPI } from '@/features/admin/services/adminApis';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
import { AdminPageHeader, AdminStatCard, AdminStatusBadge, AdminEmptyState } from '@/shared/components/admin';

interface VendorDoc {
  url: string;
  uploadedAt?: string;
  status?: string;
}

interface Vendor {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  logo?: string;
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
  verificationDocuments?: {
    businessLicense?: VendorDoc;
    taxCertificate?: VendorDoc;
    identityDocument?: VendorDoc;
    [key: string]: VendorDoc | undefined;
  };
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
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'paymentMode' | 'status'>('paymentMode');

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);

  const [paymentMode, setPaymentMode] = useState<'platform_stripe' | 'custom_stripe'>('platform_stripe');
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(150);
  const [isActive, setIsActive] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  const [search, setSearch] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);

  const { data: vendorsResponse, isLoading, refetch } = useAdminVendors({
    page,
    limit: 10,
    search: search || undefined,
    paymentMode: filterPaymentMode || undefined,
    isActive: filterActive || undefined,
  });

  const updateVendorStatus = useUpdateVendorStatus();
  const verifyVendorDocument = useVerifyVendorDocument();

  const vendors: Vendor[] = vendorsResponse?.data?.vendors || vendorsResponse?.vendors || [];
  const totalPages = vendorsResponse?.data?.pagination?.totalPages || vendorsResponse?.pagination?.totalPages || 1;

  const [stats, setStats] = useState<VendorStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminVendorsAPI.getStats();
        setStats(response.data?.data || response.data);
      } catch (error) {
        logger.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

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
      await adminVendorsAPI.updatePaymentMode(selectedVendor.id, {
        paymentMode,
        commissionRate: paymentMode === 'platform_stripe' ? commissionRate : undefined,
        subscriptionAmount: paymentMode === 'custom_stripe' ? subscriptionAmount : undefined,
      });

      toast.success(`Vendor payment mode updated to ${paymentMode === 'platform_stripe' ? 'Commission' : 'Subscription'}`);
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update payment mode');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedVendor) return;

    try {
      await updateVendorStatus.mutateAsync({
        id: selectedVendor.id,
        data: {
          isActive,
          isSuspended,
          suspensionReason: isSuspended ? suspensionReason : undefined,
        },
      });

      toast.success('Vendor status updated successfully');
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openViewModal = async (vendor: Vendor) => {
    setShowViewModal(true);
    setViewVendor(vendor);
    try {
      const response = await adminVendorsAPI.getById(vendor.id);
      const full = response.data?.data?.vendor || response.data?.vendor;
      setViewVendor(prev => prev ? {
        ...prev,
        logo: full?.logo,
        verificationDocuments: full?.verificationDocuments,
        verificationStatus: full?.verificationStatus,
      } : null);
    } catch (err) {
      logger.error('Failed to fetch vendor details:', err);
    }
  };

  const handleUpdateVerification = async (vendorId: string, status: string) => {
    try {
      await adminVendorsAPI.updateVerification(vendorId, { verificationStatus: status });
      toast.success(`Vendor verification ${status}`);
      setViewVendor(prev => prev ? { ...prev, verificationStatus: status } : null);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update verification');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!window.confirm('Delete this vendor? This action cannot be undone.')) return;
    try {
      await adminVendorsAPI.updateStatus(vendorId, { isActive: false, isDeleted: true });
      toast.success('Vendor deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const handleAddManualPayment = async (vendorId: string) => {
    if (!window.confirm('Add a manual subscription payment for this vendor? This will extend their subscription by 1 month.')) return;

    try {
      await adminVendorsAPI.updateSubscription(vendorId, { addPayment: true });
      toast.success('Manual payment added successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
    }
  };

  return (
    <>
      <PrivatePageSEO title="Admin - Vendors | Gema" description="Manage vendors and payment models" />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <AdminPageHeader
            title="Vendor Management"
            description="Manage vendor payment models and status"
          />

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <AdminStatCard label="Total Vendors" value={stats.totalVendors} color="bg-blue-500" icon={<span className="text-xl">📋</span>} />
              <AdminStatCard label="Active Vendors" value={stats.activeVendors} color="bg-green-500" icon={<span className="text-xl">✅</span>} />
              <AdminStatCard label="Commission Model" value={stats.vendorsByPaymentMode?.platform_stripe || 0} color="bg-blue-600" icon={<span className="text-xl">💰</span>} />
              <AdminStatCard label="Subscription Model" value={stats.vendorsByPaymentMode?.custom_stripe || 0} color="bg-purple-500" icon={<span className="text-xl">🔄</span>} />
              <AdminStatCard label="Expiring Soon" value={stats.subscriptionsExpiringSoon} color="bg-orange-500" icon={<span className="text-xl">⏰</span>} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="vendor-search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  id="vendor-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Business name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="filter-payment-mode" className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  id="filter-payment-mode"
                  value={filterPaymentMode}
                  onChange={(e) => setFilterPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
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
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
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

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading vendors...</p>
              </div>
            ) : vendors.length === 0 ? (
              <AdminEmptyState title="No vendors found" description="Try adjusting your filters" />
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
                          <AdminStatusBadge
                            status={vendor.paymentMode === 'custom_stripe' ? 'Subscription' : 'Commission'}
                            variant={vendor.paymentMode === 'custom_stripe' ? 'info' : 'default'}
                          />
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
                            <AdminStatusBadge status={vendor.isActive ? 'Active' : 'Inactive'} variant={vendor.isActive ? 'success' : 'danger'} />
                            {vendor.isSuspended && (
                              <AdminStatusBadge status="Suspended" variant="danger" />
                            )}
                            {vendor.subscriptionStatus && vendor.paymentMode === 'custom_stripe' && (
                              <AdminStatusBadge status={`Sub: ${vendor.subscriptionStatus}`} />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.paymentMode === 'custom_stripe' && vendor.subscriptionPaidUntil
                            ? new Date(vendor.subscriptionPaidUntil).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openViewModal(vendor)} title="View" className="p-2 rounded-lg text-blue-600 hover:text-blue-900 hover:bg-blue-50 transition-colors"><FaEye /></button>
                            <button onClick={() => openPaymentModeModal(vendor)} title="Payment Mode" className="px-2 py-1 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs font-medium transition-colors">Payment</button>
                            <button onClick={() => openStatusModal(vendor)} title="Update Status" className="px-2 py-1 rounded-lg text-orange-600 hover:text-orange-800 hover:bg-orange-50 text-xs font-medium transition-colors">Status</button>
                            {vendor.paymentMode === 'custom_stripe' && (
                              <button onClick={() => handleAddManualPayment(vendor.id)} title="Add Manual Payment" className="px-2 py-1 rounded-lg text-green-600 hover:text-green-800 hover:bg-green-50 text-xs font-medium transition-colors">+Pay</button>
                            )}
                            <button onClick={() => handleDeleteVendor(vendor.id)} title="Delete" className="p-2 rounded-lg text-red-600 hover:text-red-900 hover:bg-red-50 transition-colors"><FaTrash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Previous</button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Next</button>
              </div>
            )}
          </div>
        </div>

        {/* View Modal */}
        {showViewModal && viewVendor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Vendor Details</h2>

              {viewVendor.logo && (
                <div className="mb-4 flex items-center gap-3">
                  <img src={viewVendor.logo} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                  <span className="text-sm text-gray-500">Business Logo</span>
                </div>
              )}

              <dl className="space-y-3 mb-6">
                <div><dt className="text-xs font-medium text-gray-500 uppercase">Business Name</dt><dd className="text-sm text-gray-900">{viewVendor.businessName}</dd></div>
                <div><dt className="text-xs font-medium text-gray-500 uppercase">Email</dt><dd className="text-sm text-gray-900">{viewVendor.email}</dd></div>
                <div><dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt><dd className="text-sm text-gray-900">{viewVendor.phone || '-'}</dd></div>
                <div><dt className="text-xs font-medium text-gray-500 uppercase">Payment Mode</dt><dd className="text-sm text-gray-900">{viewVendor.paymentMode === 'platform_stripe' ? 'Commission' : 'Subscription'}</dd></div>
                <div><dt className="text-xs font-medium text-gray-500 uppercase">Status</dt><dd className="text-sm text-gray-900">{viewVendor.isActive ? 'Active' : 'Inactive'}{viewVendor.isSuspended && ' (Suspended)'}</dd></div>
                <div><dt className="text-xs font-medium text-gray-500 uppercase">Member Since</dt><dd className="text-sm text-gray-900">{new Date(viewVendor.createdAt).toLocaleDateString()}</dd></div>
              </dl>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Document Verification</h3>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Current status:</span>
                  <AdminStatusBadge status={viewVendor.verificationStatus} />
                </div>

                {viewVendor.verificationDocuments && Object.keys(viewVendor.verificationDocuments).length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {(['businessLicense', 'taxCertificate', 'identityDocument'] as const).map((docType) => {
                      const doc = viewVendor.verificationDocuments?.[docType];
                      if (!doc?.url) return null;
                      const labels: Record<string, string> = { businessLicense: 'Business License', taxCertificate: 'Tax Certificate', identityDocument: 'Identity Document' };
                      return (
                        <div key={docType} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{labels[docType]}</p>
                              {doc.uploadedAt && <p className="text-xs text-gray-500">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>}
                              {doc.status && <AdminStatusBadge status={doc.status} />}
                            </div>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 underline">View</a>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={async () => {
                              try {
                                await verifyVendorDocument.mutateAsync({ id: viewVendor.id, data: { docType, status: 'approved' } });
                                toast.success('Document approved');
                                setViewVendor(prev => prev ? { ...prev, verificationDocuments: { ...prev.verificationDocuments, [docType]: { ...doc, status: 'approved' } } } : null);
                              } catch { toast.error('Failed to approve document'); }
                            }} disabled={doc.status === 'approved'} className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Approve</button>
                            <button onClick={async () => {
                              try {
                                await verifyVendorDocument.mutateAsync({ id: viewVendor.id, data: { docType, status: 'rejected' } });
                                toast.error('Document rejected');
                                setViewVendor(prev => prev ? { ...prev, verificationDocuments: { ...prev.verificationDocuments, [docType]: { ...doc, status: 'rejected' } } } : null);
                              } catch { toast.error('Failed to reject document'); }
                            }} disabled={doc.status === 'rejected'} className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Reject</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">No documents uploaded yet.</p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => handleUpdateVerification(viewVendor.id, 'verified')} disabled={viewVendor.verificationStatus === 'verified'} className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Approve</button>
                  <button onClick={() => handleUpdateVerification(viewVendor.id, 'rejected')} disabled={viewVendor.verificationStatus === 'rejected'} className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Reject</button>
                  <button onClick={() => handleUpdateVerification(viewVendor.id, 'pending')} disabled={viewVendor.verificationStatus === 'pending'} className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Set Pending</button>
                </div>
              </div>

              <button onClick={() => setShowViewModal(false)} className="mt-6 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Close</button>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && selectedVendor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              {modalMode === 'paymentMode' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Update Payment Model</h2>
                  <p className="text-sm text-gray-600 mb-4">Vendor: <strong>{selectedVendor.businessName}</strong></p>

                  <div className="mb-4">
                    <label htmlFor="payment-mode" className="block text-sm font-medium text-gray-700 mb-2">Payment Model</label>
                    <select id="payment-mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as 'platform_stripe' | 'custom_stripe')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                      <option value="platform_stripe">Commission Model (Default)</option>
                      <option value="custom_stripe">Subscription Model</option>
                    </select>
                  </div>

                  {paymentMode === 'platform_stripe' && (
                    <div className="mb-4">
                      <label htmlFor="commission-rate" className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                      <input type="number" id="commission-rate" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} min="0" max="100" step="0.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                    </div>
                  )}

                  {paymentMode === 'custom_stripe' && (
                    <div className="mb-4">
                      <label htmlFor="subscription-amount" className="block text-sm font-medium text-gray-700 mb-2">Monthly Subscription (AED)</label>
                      <input type="number" id="subscription-amount" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(Number(e.target.value))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
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
                    <button onClick={handleUpdatePaymentMode} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Update</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Update Vendor Status</h2>
                  <p className="text-sm text-gray-600 mb-4">Vendor: <strong>{selectedVendor.businessName}</strong></p>

                  <div className="mb-4">
                    <label className="flex items-center">
                      <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Inactive vendors' events won't be displayed on the portal</p>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center">
                      <input type="checkbox" checked={isSuspended} onChange={(e) => setIsSuspended(e.target.checked)} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Suspended</span>
                    </label>
                  </div>

                  {isSuspended && (
                    <div className="mb-4">
                      <label htmlFor="suspension-reason" className="block text-sm font-medium text-gray-700 mb-2">Suspension Reason</label>
                      <textarea id="suspension-reason" value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="Enter reason for suspension..." />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleUpdateStatus} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Update</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminVendorsPage;
