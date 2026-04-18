import React, { useEffect, useState } from 'react';
import { Upload, Grid3x3, List, Trash2, RefreshCw, BarChart3 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import { useAdminMedia, useDeleteMedia } from '@/features/admin/hooks/useAdminApis';
import { adminMediaAPI } from '@/features/admin/services/adminApis';
import MediaGrid from '../../components/admin/media/MediaGrid';
import MediaUploadZone from '../../components/admin/media/MediaUploadZone';
import MediaFilters from '../../components/admin/media/MediaFilters';
import MediaDetailModal from '../../components/admin/media/MediaDetailModal';
import { AdminPageHeader, AdminStatCard } from '@/shared/components/admin';
import type { MediaAsset } from '../../store/legacySlices/mediaSlice';

interface MediaFiltersState {
  folder?: string;
  category?: string;
  type?: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MediaStats {
  total: number;
  totalSize: number;
  unused: number;
  byCategory?: Record<string, number>;
}

const AdminMediaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'blog' | 'event' | 'profile'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filters, setFilters] = useState<MediaFiltersState>({});
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [currentAsset, setCurrentAsset] = useState<MediaAsset | null>(null);

  const { data: mediaResponse, isLoading, refetch } = useAdminMedia({
    ...filters,
    page: pagination.page,
    limit: pagination.limit,
  });

  const deleteMedia = useDeleteMedia();

  const assets: MediaAsset[] = mediaResponse?.data?.assets || mediaResponse?.assets || [];

  useEffect(() => {
    if (mediaResponse) {
      const pag = mediaResponse?.data?.pagination || mediaResponse?.pagination;
      if (pag) {
        setPagination(prev => ({
          ...prev,
          total: pag.total || prev.total,
          pages: pag.pages || pag.totalPages || prev.pages,
        }));
      }
    }
  }, [mediaResponse]);

  const [stats, setStats] = useState<MediaStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminMediaAPI.getStats();
        setStats(response.data?.stats || response.data);
      } catch (error) {
        // silently fail
      }
    };
    fetchStats();
  }, []);

  const handleTabChange = (tab: 'all' | 'blog' | 'event' | 'profile') => {
    setActiveTab(tab);
    const folderMap: Record<string, string | undefined> = {
      all: undefined,
      blog: 'blogs',
      event: 'events',
      profile: 'profile'
    };
    setFilters({
      folder: folderMap[tab],
      category: tab === 'all' ? undefined : tab,
    });
    setSelectedAssets([]);
  };

  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) return;
    const confirmMessage = `Are you sure you want to delete ${selectedAssets.length} selected item(s)? This action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      try {
        for (const id of selectedAssets) {
          await deleteMedia.mutateAsync(id);
        }
        setSelectedAssets([]);
        refetch();
      } catch (error: any) {
        alert(`Error deleting media: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleRefresh = () => {
    refetch();
    adminMediaAPI.getStats().then(r => setStats(r.data?.stats || r.data)).catch(() => {});
  };

  const handleCloseDetailModal = () => {
    setCurrentAsset(null);
  };

  const getFolderDisplayName = (tab: string) => {
    const names: Record<string, string> = {
      all: 'All Media',
      blog: 'Blog Uploads',
      event: 'Event Images',
      profile: 'Profile Avatars'
    };
    return names[tab] || 'Media';
  };

  return (
    <>
      <PrivatePageSEO title="Admin - Media Library | Gema" description="Manage media assets" />
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AdminPageHeader
              title="Media Library"
              description="Manage your images, videos, and documents"
              actions={
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)} leftIcon={<BarChart3 className="h-4 w-4" />}>Stats</Button>
                  <Button variant="outline" size="sm" onClick={handleRefresh} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                  <Button variant="primary" onClick={() => setUploadModalOpen(true)} leftIcon={<Upload className="h-4 w-4" />}>Upload Media</Button>
                </>
              }
            />

            {showStats && stats && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminStatCard label="Total Assets" value={stats.total} color="bg-blue-500" icon={<span className="text-xl">📁</span>} />
                <AdminStatCard label="Total Size" value={`${(stats.totalSize / 1024 / 1024).toFixed(1)} MB`} color="bg-green-500" icon={<span className="text-xl">💾</span>} />
                <AdminStatCard label="Unused" value={stats.unused} color="bg-purple-500" icon={<span className="text-xl">🗑️</span>} />
                <AdminStatCard label="Categories" value={Object.keys(stats.byCategory || {}).length} color="bg-orange-500" icon={<span className="text-xl">📂</span>} />
              </div>
            )}

            <div className="mt-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'all', label: 'All Media' },
                  { key: 'blog', label: 'Blogs' },
                  { key: 'event', label: 'Events' },
                  { key: 'profile', label: 'Profiles' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key as any)}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <MediaFilters />
            </aside>

            <main className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {pagination.total} items
                    {selectedAssets.length > 0 && (
                      <span className="ml-2 text-blue-600 font-medium">({selectedAssets.length} selected)</span>
                    )}
                  </span>
                  {selectedAssets.length > 0 && (
                    <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={handleBulkDelete}>Delete Selected</Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}><Grid3x3 className="h-4 w-4" /></Button>
                  <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="large" />
                </div>
              ) : (
                <MediaGrid assets={assets} viewMode={viewMode} />
              )}

              {pagination.pages > 1 && (
                <div className="mt-6 flex justify-center">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page <= 1}>Previous</Button>
                    <span className="px-4 py-2 text-sm text-gray-700">Page {pagination.page} of {pagination.pages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= pagination.pages}>Next</Button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

        <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title={`Upload to ${getFolderDisplayName(activeTab)}`} size="lg">
          <MediaUploadZone
            category={activeTab === 'all' ? 'misc' : activeTab}
            folder={activeTab === 'all' ? 'misc' : activeTab === 'blog' ? 'blogs' : activeTab === 'event' ? 'events' : 'profile'}
            onUploadComplete={() => {
              setUploadModalOpen(false);
              refetch();
            }}
          />
        </Modal>

        {currentAsset && (
          <MediaDetailModal
            asset={currentAsset}
            onClose={handleCloseDetailModal}
            onDelete={(id) => {
              deleteMedia.mutate(id);
              handleCloseDetailModal();
            }}
          />
        )}
      </div>
    </>
  );
};

export default AdminMediaPage;
