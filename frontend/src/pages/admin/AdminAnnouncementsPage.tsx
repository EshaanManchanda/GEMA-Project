import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import announcementBarAPI from '@/services/api/announcementBarAPI';
import { AnnouncementBar, CreateAnnouncementBarData } from '@/types/announcementBar';
import AnnouncementBarList from '@/components/admin/AnnouncementBarList';
import AnnouncementBarForm from '@/components/admin/AnnouncementBarForm';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

const AdminAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementBar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementBar | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await announcementBarAPI.admin.getAllAnnouncements({
        search,
        status: statusFilter as any,
        page,
        limit: 20
      });

      setAnnouncements(response.announcements);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch announcements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [search, statusFilter, page]);

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setShowForm(true);
  };

  const handleEdit = async (announcement: AnnouncementBar) => {
    try {
      const fullAnnouncement = await announcementBarAPI.admin.getAnnouncementById(announcement._id);
      setSelectedAnnouncement(fullAnnouncement);
      setShowForm(true);
    } catch (error: any) {
      toast.error('Failed to load announcement details');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await announcementBarAPI.admin.deleteAnnouncement(announcementId);
      toast.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (error: any) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement: AnnouncementBar) => {
    try {
      await announcementBarAPI.admin.updateAnnouncement(announcement._id, {
        isActive: !announcement.isActive
      });
      toast.success(`Announcement ${announcement.isActive ? 'deactivated' : 'activated'}`);
      fetchAnnouncements();
    } catch (error: any) {
      toast.error('Failed to update announcement');
    }
  };

  const handleSubmitForm = async (data: CreateAnnouncementBarData) => {
    try {
      logger.debug('[AdminAnnouncementsPage] Received form data:', {
        status: data.status,
        isActive: data.isActive,
        fullData: data
      });

      if (selectedAnnouncement?._id) {
        logger.debug('[AdminAnnouncementsPage] Updating announcement:', selectedAnnouncement._id);
        await announcementBarAPI.admin.updateAnnouncement(selectedAnnouncement._id, data);
        toast.success('Announcement updated successfully');
      } else {
        logger.debug('[AdminAnnouncementsPage] Creating new announcement');
        await announcementBarAPI.admin.createAnnouncement(data);
        toast.success('Announcement created successfully');
      }

      setShowForm(false);
      fetchAnnouncements();
    } catch (error: any) {
      logger.error('[AdminAnnouncementsPage] Error:', error);
      toast.error(error.message || 'Failed to save announcement');
      throw error;
    }
  };

  const handleReorder = async () => {
    fetchAnnouncements();
  };

  return (
    <>
      <PrivatePageSEO title="Admin - Announcements | Kidrove" description="Manage announcement bars" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Announcement Bars</h1>
            <p className="text-gray-600 mt-1">Manage site-wide announcement bars with targeting and scheduling</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Announcement
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
                  placeholder="Search announcements..."
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

        {/* Announcement List */}
        <AnnouncementBarList
          announcements={announcements}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onReorder={handleReorder}
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
                  className={`px-4 py-2 rounded-lg transition-colors ${page === pageNum
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
          <AnnouncementBarForm
            announcement={selectedAnnouncement}
            onSubmit={handleSubmitForm}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </>
  );
};

export default AdminAnnouncementsPage;
