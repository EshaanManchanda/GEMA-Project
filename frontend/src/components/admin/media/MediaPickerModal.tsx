import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Upload, Search, Image as ImageIcon, Check } from 'lucide-react';
import { AppDispatch, RootState } from '../../../store';
import { fetchMedia, setFilters, clearFilters } from '../../../store/slices/mediaSlice';
import { MediaAsset } from '../../../store/slices/mediaSlice';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import LoadingSpinner from '../../common/LoadingSpinner';
import MediaUploadZone from './MediaUploadZone';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
  category?: 'blog' | 'profile' | 'event' | 'document' | 'misc';
  folder?: string;
  multiple?: boolean;
  title?: string;
}

/**
 * MediaPickerModal - Select media from library
 *
 * Features:
 * - Browse existing media assets
 * - Search and filter capabilities
 * - Single or multiple selection
 * - Upload new media inline
 * - Category/folder filtering
 */
const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  category,
  folder,
  multiple = false,
  title = 'Select Media'
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { assets, loading, pagination } = useSelector((state: RootState) => state.media);

  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch media when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchMedia({
        category,
        folder,
        search: searchQuery,
        page: currentPage,
        limit: 24
      }));
    }
  }, [dispatch, isOpen, category, folder, searchQuery, currentPage]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAssets([]);
      setSearchQuery('');
      setShowUpload(false);
      setCurrentPage(1);
      dispatch(clearFilters());
    }
  }, [isOpen, dispatch]);

  // Keyboard navigation for pagination
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(p => p - 1);
      } else if (e.key === 'ArrowRight' && currentPage < pagination.pages) {
        setCurrentPage(p => p + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, pagination.pages]);

  // Handle asset selection
  const handleAssetClick = (asset: MediaAsset) => {
    if (multiple) {
      const isSelected = selectedAssets.some(a => a._id === asset._id);
      if (isSelected) {
        setSelectedAssets(selectedAssets.filter(a => a._id !== asset._id));
      } else {
        setSelectedAssets([...selectedAssets, asset]);
      }
    } else {
      setSelectedAssets([asset]);
    }
  };

  // Handle selection confirmation
  const handleConfirm = () => {
    onSelect(selectedAssets);
    onClose();
  };

  // Handle upload complete
  const handleUploadComplete = () => {
    setShowUpload(false);
    dispatch(fetchMedia({ category, folder, page: currentPage }));
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    dispatch(fetchMedia({
      category,
      folder,
      search: searchQuery,
      page: 1,
      limit: 24
    }));
  };

  // Get thumbnail URL
  const getThumbnailUrl = (asset: MediaAsset): string => {
    return asset.variations?.thumbnail || asset.variations?.small || asset.url;
  };

  // Check if asset is selected
  const isAssetSelected = (asset: MediaAsset): boolean => {
    return selectedAssets.some(a => a._id === asset._id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="flex flex-col h-[600px]">
        {/* Upload View */}
        {showUpload ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload New Media</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>

            <MediaUploadZone
              category={category || 'misc'}
              folder={folder || 'misc'}
              onUploadComplete={handleUploadComplete}
              multiple={multiple}
            />
          </div>
        ) : (
          <>
            {/* Search and Actions Bar */}
            <div className="flex items-center gap-3 mb-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>

              <Button
                variant="outline"
                onClick={() => setShowUpload(true)}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload New
              </Button>
            </div>

            {/* Selected Count */}
            {selectedAssets.length > 0 && (
              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedAssets.length} item{selectedAssets.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {/* Total Image Count Indicator */}
            {!loading && assets.length > 0 && (
              <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium text-blue-800">
                    Showing {((currentPage - 1) * 24) + 1}-{Math.min(currentPage * 24, pagination.total)} of {pagination.total} images
                  </p>
                </div>
                {pagination.pages > 1 && (
                  <p className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    Page {currentPage} of {pagination.pages}
                  </p>
                )}
              </div>
            )}

            {/* Pagination Controls - Top */}
            {pagination.pages > 1 && !loading && (
              <div className="mb-4 flex justify-center items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[36px] px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage >= pagination.pages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="large" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ImageIcon className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No media found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'Try a different search term' : 'Upload some media to get started'}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowUpload(true)}
                    leftIcon={<Upload className="h-4 w-4" />}
                  >
                    Upload Media
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {assets.map((asset) => {
                    const isSelected = isAssetSelected(asset);
                    const isImage = asset.mimeType.startsWith('image/');

                    return (
                      <div
                        key={asset._id}
                        onClick={() => handleAssetClick(asset)}
                        className={`
                          relative aspect-square bg-white rounded-lg overflow-hidden cursor-pointer
                          border-2 transition-all hover:shadow-md
                          ${isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        {/* Image/Icon */}
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          {isImage ? (
                            <img
                              src={getThumbnailUrl(asset)}
                              alt={asset.originalName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center">
                              <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500 font-medium">
                                {asset.fileExtension?.toUpperCase().replace('.', '')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}

                        {/* Filename Tooltip on Hover */}
                        <div className="absolute inset-x-0 bottom-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate opacity-0 hover:opacity-100 transition-opacity">
                          {asset.originalName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-4 flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage >= pagination.pages || loading}
                >
                  Next
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={selectedAssets.length === 0}
              >
                Select {selectedAssets.length > 0 ? `(${selectedAssets.length})` : ''}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default MediaPickerModal;
