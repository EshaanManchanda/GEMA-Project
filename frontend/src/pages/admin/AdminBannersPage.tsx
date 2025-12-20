import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import bannerAPI, { Banner } from '../../services/api/bannerAPI';
import BannerList from '../../components/admin/BannerList';
import BannerForm from '../../components/admin/BannerForm';

const AdminBannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const response = await bannerAPI.admin.getAllBanners({
        search,
        status: statusFilter,
        page,
        limit: 20
      });

      setBanners(response.banners);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch banners');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [search, statusFilter, page]);

  const handleCreateBanner = () => {
    setSelectedBanner(null);
    setShowBannerForm(true);
  };

  const handleEditBanner = async (banner: Banner) => {
    try {
      const fullBanner = await bannerAPI.admin.getBannerById(banner._id);
      setSelectedBanner(fullBanner);
      setShowBannerForm(true);
    } catch (error: any) {
      toast.error('Failed to load banner details');
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      await bannerAPI.admin.deleteBanner(bannerId);
      toast.success('Banner deleted successfully');
      fetchBanners();
    } catch (error: any) {
      toast.error('Failed to delete banner');
    }
  };

  const handleSubmitBannerForm = async (data: Partial<Banner>) => {
    try {
      if (selectedBanner?._id) {
        await bannerAPI.admin.updateBanner(selectedBanner._id, data);
        toast.success('Banner updated successfully');
      } else {
        await bannerAPI.admin.createBanner(data);
        toast.success('Banner created successfully');
      }

      setShowBannerForm(false);
      fetchBanners();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save banner');
      throw error;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Homepage Banners</h1>
          <p className="text-gray-600 mt-1">Manage promotional banners for the homepage carousel</p>
        </div>
        <button
          onClick={handleCreateBanner}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Banner
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search banners..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banner List */}
      <BannerList
        banners={banners}
        isLoading={isLoading}
        onEdit={handleEditBanner}
        onDelete={handleDeleteBanner}
        onReorder={fetchBanners}
      />

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Banner Form Modal */}
      {showBannerForm && (
        <BannerForm
          banner={selectedBanner}
          onClose={() => setShowBannerForm(false)}
          onSubmit={handleSubmitBannerForm}
        />
      )}
    </div>
  );
};

export default AdminBannersPage;
