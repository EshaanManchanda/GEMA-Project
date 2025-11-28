import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Copy, Trash2, Eye, Check, Image as ImageIcon } from 'lucide-react';
import { AppDispatch, RootState } from '../../../store';
import {
  toggleAssetSelection,
  setCurrentAsset,
  deleteMedia
} from '../../../store/slices/mediaSlice';
import { MediaAsset } from '../../../store/slices/mediaSlice';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';

interface MediaGridProps {
  assets: MediaAsset[];
  viewMode: 'grid' | 'list';
}

/**
 * MediaGrid - Displays media assets in grid or list view
 *
 * Features:
 * - Grid/List view modes
 * - Selection handling
 * - Copy URL to clipboard
 * - Delete individual items
 * - Preview modal
 */
const MediaGrid: React.FC<MediaGridProps> = ({ assets, viewMode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedAssets } = useSelector((state: RootState) => state.media);

  // Copy URL to clipboard
  const handleCopyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  // Delete single asset
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (window.confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
      try {
        await dispatch(deleteMedia({ id })).unwrap();
        toast.success('Media deleted successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete media');
      }
    }
  };

  // View details
  const handleView = (asset: MediaAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setCurrentAsset(asset));
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Get thumbnail URL
  // Always use UUID URL to ensure redirect works and images load properly
  const getThumbnailUrl = (asset: MediaAsset): string => {
    return asset.url;
  };

  // Empty state
  if (assets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No media found</h3>
        <p className="text-gray-500">Upload some media to get started</p>
      </div>
    );
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {assets.map((asset) => {
          const isSelected = selectedAssets.includes(asset._id);
          const isImage = asset.mimeType.startsWith('image/');

          return (
            <div
              key={asset._id}
              className={`
                relative group bg-white rounded-lg overflow-hidden shadow-sm
                border-2 transition-all cursor-pointer hover:shadow-md
                ${isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => dispatch(toggleAssetSelection(asset._id))}
            >
              {/* Image Preview */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {isImage ? (
                  <img
                    src={getThumbnailUrl(asset)}
                    alt={asset.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500 font-medium">
                      {asset.fileExtension?.toUpperCase().replace('.', '')}
                    </span>
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => handleView(asset, e)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="View details"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => handleCopyUrl(asset.url, e)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(asset._id, e)}
                    className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 border-t border-gray-200">
                <p
                  className="text-xs text-gray-700 truncate font-medium"
                  title={asset.originalName}
                >
                  {asset.originalName}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{formatSize(asset.size)}</span>
                  {asset.width && asset.height && (
                    <span className="text-xs text-gray-400">
                      {asset.width}×{asset.height}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-4 py-3"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preview
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {assets.map((asset) => {
            const isSelected = selectedAssets.includes(asset._id);
            const isImage = asset.mimeType.startsWith('image/');

            return (
              <tr
                key={asset._id}
                className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => dispatch(toggleAssetSelection(asset._id))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {isImage ? (
                      <img
                        src={getThumbnailUrl(asset)}
                        alt={asset.originalName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">
                        {asset.fileExtension?.toUpperCase().replace('.', '')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {asset.originalName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{asset.mimeType}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{formatSize(asset.size)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleView(asset, e)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleCopyUrl(asset.url, e)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(asset._id, e)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MediaGrid;
