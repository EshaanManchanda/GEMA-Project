import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import popupAPI from '@/services/api/popupAPI';
import { PopupNotification, CreatePopupData } from '@/types/popup';
import PopupList from '@/components/admin/PopupList';
import PopupForm from '@/components/admin/PopupForm';

const AdminPopupsPage: React.FC = () => {
  const [popups, setPopups] = useState<PopupNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPopup, setSelectedPopup] = useState<PopupNotification | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchPopups = async () => {
    try {
      setIsLoading(true);
      const response = await popupAPI.admin.getAllPopups({
        search,
        status: statusFilter as any,
        page,
        limit: 20
      });

      setPopups(response.popups);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch popups');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPopups();
  }, [search, statusFilter, page]);

  const handleCreate = () => {
    setSelectedPopup(null);
    setShowForm(true);
  };

  const handleEdit = async (popup: PopupNotification) => {
    try {
      const fullPopup = await popupAPI.admin.getPopupById(popup._id);
      setSelectedPopup(fullPopup);
      setShowForm(true);
    } catch (error: any) {
      toast.error('Failed to load popup details');
    }
  };

  const handleDelete = async (popupId: string) => {
    if (!confirm('Are you sure you want to delete this popup?')) return;

    try {
      await popupAPI.admin.deletePopup(popupId);
      toast.success('Popup deleted successfully');
      fetchPopups();
    } catch (error: any) {
      toast.error('Failed to delete popup');
    }
  };

  const handleToggleActive = async (popup: PopupNotification) => {
    try {
      await popupAPI.admin.updatePopup(popup._id, {
        isActive: !popup.isActive
      });
      toast.success(`Popup ${popup.isActive ? 'deactivated' : 'activated'}`);
      fetchPopups();
    } catch (error: any) {
      toast.error('Failed to update popup');
    }
  };

  const handleSubmitForm = async (data: CreatePopupData) => {
    try {
      if (selectedPopup?._id) {
        await popupAPI.admin.updatePopup(selectedPopup._id, data);
        toast.success('Popup updated successfully');
      } else {
        await popupAPI.admin.createPopup(data);
        toast.success('Popup created successfully');
      }

      setShowForm(false);
      fetchPopups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save popup');
      throw error;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Popup Notifications</h1>
          <p className="text-gray-600 mt-1">Create and manage marketing popups with triggers and targeting</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Popup
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
                placeholder="Search popups..."
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

      {/* Popup List */}
      <PopupList
        popups={popups}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onReorder={fetchPopups}
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

          <div className="flex items-center gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <PopupForm
          popup={selectedPopup}
          onSubmit={handleSubmitForm}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default AdminPopupsPage;
