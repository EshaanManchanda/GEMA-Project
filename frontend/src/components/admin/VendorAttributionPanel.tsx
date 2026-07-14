import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import adminAPI from '../../services/api/adminAPI';
import blogAPI from '../../services/api/blogAPI';
import logger from '@/utils/logger';

interface VendorOption {
  id?: string;
  _id?: string;
  businessName?: string;
  email?: string;
}

interface VendorAttributionPanelProps {
  blogId: string;
  currentVendorId?: string;
  onAttributed?: () => void;
}

/**
 * Lets an admin attribute a blog to a vendor (for "we posted your blog" service
 * tracking) and, separately, explicitly consume a blog_post slot from one of
 * that vendor's active service packages. Attribution alone never burns a
 * package slot — that's a deliberate second step so old/manual attribution
 * can't accidentally consume credit.
 */
const VendorAttributionPanel: React.FC<VendorAttributionPanelProps> = ({
  blogId,
  currentVendorId,
  onAttributed,
}) => {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState(currentVendorId || '');
  const [isSavingAttribution, setIsSavingAttribution] = useState(false);

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isConsuming, setIsConsuming] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

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

  useEffect(() => {
    setSelectedVendorId(currentVendorId || '');
  }, [currentVendorId]);

  const fetchPackagesForVendor = useCallback(async (vendorId: string) => {
    if (!vendorId) {
      setPackages([]);
      return;
    }
    setIsLoadingPackages(true);
    try {
      const response = await api.get('/admin/service-packages', { params: { vendorId } });
      const all = response.data?.data || [];
      const withOpenBlogSlot = all.filter((pkg: any) => {
        const status = pkg.computedStatus || pkg.status;
        if (status !== 'active') return false;
        return pkg.items.some((i: any) => i.type === 'blog_post' && i.used < i.quantity);
      });
      setPackages(withOpenBlogSlot);
    } catch (err) {
      logger.error('Error fetching vendor packages:', err);
      setPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    if (currentVendorId) {
      fetchPackagesForVendor(currentVendorId);
    }
  }, [currentVendorId, fetchPackagesForVendor]);

  const handleAttribute = async () => {
    setIsSavingAttribution(true);
    try {
      await blogAPI.admin.updateBlog(blogId, { vendorId: selectedVendorId || null });
      toast.success(selectedVendorId ? 'Blog attributed to vendor' : 'Vendor attribution removed');
      onAttributed?.();
      fetchPackagesForVendor(selectedVendorId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update vendor attribution');
    } finally {
      setIsSavingAttribution(false);
    }
  };

  const handleConsumeSlot = async () => {
    if (!selectedPackageId) {
      toast.error('Select a package');
      return;
    }
    setIsConsuming(true);
    try {
      await api.post('/admin/service-packages/consume-blog', {
        packageId: selectedPackageId,
        blogId,
      });
      toast.success('Blog-post slot consumed from package');
      fetchPackagesForVendor(currentVendorId || selectedVendorId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to consume blog slot');
    } finally {
      setIsConsuming(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Vendor Attribution (Service Packages)
      </h3>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Attribute to vendor</label>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[220px]"
          >
            <option value="">Not attributed</option>
            {vendors.map((v) => (
              <option key={v.id || v._id} value={v.id || v._id}>
                {v.businessName || v.email}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAttribute}
          disabled={isSavingAttribution || selectedVendorId === (currentVendorId || '')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {isSavingAttribution ? 'Saving…' : 'Save Attribution'}
        </button>
      </div>

      {currentVendorId && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-2">
            Attribution alone does not consume a package slot. Explicitly consume one below if this blog fulfills a purchased deliverable.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Package with open blog_post slot</label>
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[260px]"
                disabled={isLoadingPackages}
              >
                <option value="">
                  {isLoadingPackages ? 'Loading…' : packages.length === 0 ? 'No packages with open slots' : 'Select package…'}
                </option>
                {packages.map((pkg) => {
                  const item = pkg.items.find((i: any) => i.type === 'blog_post');
                  return (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} ({item.quantity - item.used} remaining)
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={handleConsumeSlot}
              disabled={isConsuming || !selectedPackageId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isConsuming ? 'Consuming…' : 'Consume Blog Slot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAttributionPanel;
