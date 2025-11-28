import React, { useEffect } from 'react';
import { X, Copy, Trash2, Download, FileText, File, Image as ImageIcon, Video } from 'lucide-react';
import { MediaAsset } from '../../../store/slices/mediaSlice';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface MediaDetailModalProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

/**
 * MediaDetailModal - Display full media asset details
 *
 * Features:
 * - Full-size image/video preview
 * - Asset metadata display
 * - Copy URL functionality
 * - Delete action
 * - Keyboard shortcuts (ESC to close)
 */
const MediaDetailModal: React.FC<MediaDetailModalProps> = ({ asset, onClose, onDelete }) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!asset) return null;

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(asset.url);
    toast.success('URL copied to clipboard!');
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${asset.originalName}"?`)) {
      onDelete?.(asset._id);
      toast.success('Asset deleted successfully');
    }
  };

  // Determine file type
  const isImage = asset.mimeType.startsWith('image/');
  const isVideo = asset.mimeType.startsWith('video/');
  const isPDF = asset.mimeType.includes('pdf');
  const isDocument = asset.mimeType.includes('document') || asset.mimeType.includes('word');

  // Get file icon
  const getFileIcon = () => {
    if (isPDF) return <FileText className="h-24 w-24 text-red-500" />;
    if (isDocument) return <File className="h-24 w-24 text-blue-500" />;
    return <File className="h-24 w-24 text-gray-400" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 truncate pr-4">
            {asset.originalName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preview Section */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
            {isImage && (
              <img
                src={asset.url}
                alt={asset.originalName}
                className="max-w-full max-h-[500px] object-contain rounded"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><p class="text-gray-500">Image failed to load</p></div>';
                }}
              />
            )}

            {isVideo && (
              <video
                src={asset.url}
                controls
                className="max-w-full max-h-[500px] rounded"
              >
                Your browser does not support the video tag.
              </video>
            )}

            {!isImage && !isVideo && (
              <div className="flex flex-col items-center gap-4">
                {getFileIcon()}
                <p className="text-gray-600 text-center">
                  Preview not available for this file type
                </p>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">File Name</h3>
              <p className="text-gray-900 break-all">{asset.filename}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">File Size</h3>
              <p className="text-gray-900">{formatSize(asset.size)}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Type</h3>
              <p className="text-gray-900">{asset.mimeType}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
              <p className="text-gray-900 capitalize">{asset.category}</p>
            </div>

            {asset.width && asset.height && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Dimensions</h3>
                <p className="text-gray-900">{asset.width} × {asset.height} px</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Uploaded</h3>
              <p className="text-gray-900">
                {format(new Date(asset.createdAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>

            {asset.uploadedBy && (
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Uploaded By</h3>
                <p className="text-gray-900">
                  {asset.uploadedBy.firstName} {asset.uploadedBy.lastName} ({asset.uploadedBy.email})
                </p>
              </div>
            )}

            {asset.tags && asset.tags.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">URL</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={asset.url}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-700"
                />
                <button
                  onClick={handleCopyUrl}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  title="Copy URL"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCopyUrl}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy URL
            </Button>

            <a
              href={asset.url}
              download={asset.originalName}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>

            {onDelete && (
              <Button
                variant="danger"
                onClick={handleDelete}
                className="flex items-center gap-2 ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailModal;
