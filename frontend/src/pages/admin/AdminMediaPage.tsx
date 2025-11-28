import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, Grid3x3, List, Trash2, RefreshCw, BarChart3 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AppDispatch, RootState } from '../../store';
import {
  fetchMedia,
  setFilters,
  clearSelection,
  bulkDeleteMedia,
  fetchMediaStats,
  setCurrentAsset,
  deleteMedia
} from '../../store/slices/mediaSlice';
import MediaGrid from '../../components/admin/media/MediaGrid';
import MediaUploadZone from '../../components/admin/media/MediaUploadZone';
import MediaFilters from '../../components/admin/media/MediaFilters';
import MediaDetailModal from '../../components/admin/media/MediaDetailModal';

/**
 * AdminMediaPage - WordPress-style Media Manager
 *
 * Features:
 * - Tabbed interface (All, Blogs, Events, Profiles)
 * - Grid/List view toggle
 * - Drag & drop upload
 * - Bulk operations
 * - Statistics
 */
const AdminMediaPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { assets, loading, pagination, filters, selectedAssets, stats, currentAsset } = useSelector(
    (state: RootState) => state.media
  );

  const [activeTab, setActiveTab] = useState<'all' | 'blog' | 'event' | 'profile'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Fetch media on mount and when filters/pagination change
  useEffect(() => {
    dispatch(fetchMedia({
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    }));
  }, [dispatch, filters, pagination.page, pagination.limit]);

  // Fetch stats
  useEffect(() => {
    dispatch(fetchMediaStats());
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (tab: 'all' | 'blog' | 'event' | 'profile') => {
    setActiveTab(tab);

    // Map tab to folder filter
    const folderMap: Record<string, string | undefined> = {
      all: undefined,
      blog: 'blogs',
      event: 'events',
      profile: 'profile'
    };

    dispatch(setFilters({
      folder: folderMap[tab],
      category: tab === 'all' ? undefined : tab
    }));
    dispatch(clearSelection());
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedAssets.length} selected item(s)? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        await dispatch(bulkDeleteMedia({ ids: selectedAssets })).unwrap();
        // Refresh list
        dispatch(fetchMedia({ ...filters }));
      } catch (error: any) {
        alert(`Error deleting media: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    dispatch(fetchMedia({ ...filters, page: pagination.page }));
    dispatch(fetchMediaStats());
  };

  // Handle modal close
  const handleCloseDetailModal = () => {
    dispatch(setCurrentAsset(null));
  };

  // Get current folder display name
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
              <p className="text-gray-600 mt-1">
                Manage your images, videos, and documents
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                leftIcon={<BarChart3 className="h-4 w-4" />}
              >
                Stats
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>

              <Button
                variant="primary"
                onClick={() => setUploadModalOpen(true)}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload Media
              </Button>
            </div>
          </div>

          {/* Stats Banner */}
          {showStats && stats && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm font-medium text-blue-900">Total Assets</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm font-medium text-green-900">Total Size</div>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  {(stats.totalSize / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-sm font-medium text-purple-900">Unused</div>
                <div className="text-2xl font-bold text-purple-700 mt-1">{stats.unused}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-sm font-medium text-orange-900">Categories</div>
                <div className="text-2xl font-bold text-orange-700 mt-1">
                  {Object.keys(stats.byCategory || {}).length}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
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
                  className={`
                    pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <MediaFilters />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {pagination.total} items
                  {selectedAssets.length > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({selectedAssets.length} selected)
                    </span>
                  )}
                </span>

                {selectedAssets.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Media Grid/List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <MediaGrid assets={assets} viewMode={viewMode} />
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dispatch(fetchMedia({ ...filters, page: pagination.page - 1 }))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dispatch(fetchMedia({ ...filters, page: pagination.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={`Upload to ${getFolderDisplayName(activeTab)}`}
        size="lg"
      >
        <MediaUploadZone
          category={activeTab === 'all' ? 'misc' : activeTab}
          folder={activeTab === 'all' ? 'misc' :
            activeTab === 'blog' ? 'blogs' :
            activeTab === 'event' ? 'events' :
            'profile'
          }
          onUploadComplete={() => {
            setUploadModalOpen(false);
            dispatch(fetchMedia({ ...filters }));
          }}
        />
      </Modal>

      {/* Media Detail Modal */}
      {currentAsset && (
        <MediaDetailModal
          asset={currentAsset}
          onClose={handleCloseDetailModal}
          onDelete={(id) => {
            dispatch(deleteMedia({ id }));
            handleCloseDetailModal();
          }}
        />
      )}
    </div>
  );
};

export default AdminMediaPage;
