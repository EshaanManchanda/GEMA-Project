import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTimes, FaBan } from 'react-icons/fa';
import api from '../../services/api';
import adminAPI from '../../services/api/adminAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

const ITEM_TYPES = [
  { value: 'featured_event', label: 'Featured Events', unit: 'count' },
  { value: 'blog_post', label: 'Blog Posts', unit: 'count' },
  { value: 'priority_listing', label: 'Priority Listing', unit: 'days' },
  { value: 'social_post', label: 'Social Posts', unit: 'count' },
  { value: 'other', label: 'Other', unit: 'count' },
] as const;

interface PackageItem {
  type: string;
  label?: string;
  unit: 'count' | 'days';
  quantity: number;
  durationDays?: number;
  used?: number;
}

interface ServicePackage {
  _id: string;
  vendorId: { _id: string; businessName?: string; email?: string } | string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  paymentStatus: string;
  source: string;
  items: PackageItem[];
  startDate: string;
  endDate: string;
  status: string;
  computedStatus?: string;
  adminNotes?: string;
  vendorNotes?: string;
}

interface VendorOption {
  id?: string;
  _id?: string;
  businessName?: string;
  email?: string;
}

const emptyItem = (): PackageItem => ({ type: 'featured_event', unit: 'count', quantity: 1 });

const AdminServicePackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    vendorId: '',
    name: '',
    description: '',
    price: 0,
    currency: 'AED',
    paymentStatus: 'paid',
    source: 'offline_invoice',
    paymentReference: '',
    endDate: '',
    adminNotes: '',
    vendorNotes: '',
    items: [emptyItem()],
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = vendorFilter !== 'all' ? { vendorId: vendorFilter } : undefined;
      const response = await api.get('/admin/service-packages', { params });
      setPackages(response.data?.data || []);
    } catch (err: any) {
      logger.error('Error fetching service packages:', err);
      toast.error('Failed to load service packages');
    } finally {
      setIsLoading(false);
    }
  }, [vendorFilter]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getVendorsList();
        const list = res?.data?.vendors || res?.data?.users || res?.data || [];
        setVendors(Array.isArray(list) ? list : []);
      } catch (err) {
        logger.error('Error fetching vendors list:', err);
      }
    })();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      vendorId: '',
      name: '',
      description: '',
      price: 0,
      currency: 'AED',
      paymentStatus: 'paid',
      source: 'offline_invoice',
      paymentReference: '',
      endDate: '',
      adminNotes: '',
      vendorNotes: '',
      items: [emptyItem()],
    });
    setShowModal(true);
  };

  const handleItemChange = (index: number, field: keyof PackageItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'type') {
        const meta = ITEM_TYPES.find((t) => t.value === value);
        items[index].unit = (meta?.unit as 'count' | 'days') || 'count';
      }
      return { ...prev, items };
    });
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (index: number) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const handleCreatePackage = async () => {
    if (!form.vendorId) {
      toast.error('Select a vendor');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Package name is required');
      return;
    }
    if (!form.endDate) {
      toast.error('End date is required');
      return;
    }
    if (form.items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    for (const item of form.items) {
      if (item.type === 'other' && !item.label?.trim()) {
        toast.error("label is required for 'Other' items");
        return;
      }
      if (item.unit === 'count' && (!item.quantity || item.quantity < 1)) {
        toast.error('Item quantity must be at least 1');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        items: form.items.map((i) => ({
          type: i.type,
          label: i.label,
          unit: i.unit,
          quantity: i.unit === 'days' ? 1 : i.quantity,
          durationDays: i.unit === 'days' ? i.quantity : undefined,
        })),
      };
      await api.post('/admin/service-packages', payload);
      toast.success('Service package created');
      setShowModal(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create package');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPackage = async (id: string) => {
    if (!window.confirm('Cancel this package? Already-granted features stay live until they expire; no further grants will be allowed from it.')) return;
    try {
      await api.delete(`/admin/service-packages/${id}`);
      toast.success('Package cancelled');
      fetchPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel package');
    }
  };

  const vendorLabel = (pkg: ServicePackage): string => {
    if (typeof pkg.vendorId === 'object' && pkg.vendorId) {
      return pkg.vendorId.businessName || pkg.vendorId.email || 'Vendor';
    }
    return String(pkg.vendorId);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <PrivatePageSEO title="Admin - Service Packages | Kidrove" description="Manage vendor offline service packages" />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Service Packages</h1>
            <p className="text-gray-600 mt-1">Track offline-sold marketing bundles (featured events, blogs, priority listing)</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <FaPlus className="mr-2" /> New Package
          </button>
        </div>

        <div className="mb-4">
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id || v._id} value={v.id || v._id}>
                {v.businessName || v.email}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading…</td></tr>
                ) : packages.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No service packages yet.</td></tr>
                ) : (
                  packages.map((pkg) => {
                    const status = pkg.computedStatus || pkg.status;
                    return (
                      <tr key={pkg._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vendorLabel(pkg)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pkg.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {pkg.items.map((i, idx) => (
                            <div key={idx}>
                              {i.label || ITEM_TYPES.find((t) => t.value === i.type)?.label}:{' '}
                              {i.unit === 'days' ? `${i.durationDays}d` : `${i.used || 0}/${i.quantity}`}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(pkg.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            {status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelPackage(pkg._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Cancel package"
                              >
                                <FaBan className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit' : 'New'} Service Package</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  value={form.vendorId}
                  onChange={(e) => setForm((p) => ({ ...p, vendorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.businessName || v.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Q3 Growth Bundle"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <div className="flex">
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                    className="px-2 py-2 border border-gray-300 rounded-l-lg bg-gray-50"
                  >
                    {['AED', 'USD', 'EGP', 'CAD'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={form.paymentStatus}
                  onChange={(e) => setForm((p) => ({ ...p, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {['paid', 'unpaid', 'partial', 'comped'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={form.paymentReference}
                  onChange={(e) => setForm((p) => ({ ...p, paymentReference: e.target.value }))}
                  placeholder="Invoice #1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Deliverables</label>
                <button onClick={addItem} type="button" className="text-sm text-primary hover:underline">+ Add item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={item.type}
                      onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                      className="px-2 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                    >
                      {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {item.type === 'other' && (
                      <input
                        type="text"
                        placeholder="Label"
                        value={item.label || ''}
                        onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-lg text-sm w-32"
                      />
                    )}
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="px-2 py-2 border border-gray-300 rounded-lg text-sm w-24"
                    />
                    <span className="text-xs text-gray-500 w-12">{item.unit === 'days' ? 'days' : 'count'}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} type="button" className="text-red-500 hover:text-red-700">
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor-visible notes</label>
                <textarea
                  value={form.vendorNotes}
                  onChange={(e) => setForm((p) => ({ ...p, vendorNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Shown to the vendor in their dashboard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal admin notes</label>
                <textarea
                  value={form.adminNotes}
                  onChange={(e) => setForm((p) => ({ ...p, adminNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Internal only — never shown to vendor"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePackage}
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminServicePackagesPage;
