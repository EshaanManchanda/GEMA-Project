import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { X, Upload, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { removeUpload, clearAllUploads } from '../../store/slices/mediaSlice';
import { formatBytes, formatUploadSpeed, formatDuration } from '../../utils/uploadHelpers';

/**
 * GlobalUploadProgress - Global upload progress banner
 *
 * Displays all active uploads in a banner at the top of the screen
 * - Shows aggregated progress
 * - Displays individual file progress
 * - Dismissible but persists across page navigation
 * - Uses Redux state from mediaSlice
 */
const GlobalUploadProgress: React.FC = () => {
  const dispatch = useDispatch();
  const uploadProgress = useSelector((state: RootState) => state.media.uploadProgress);
  const [isExpanded, setIsExpanded] = useState(true);

  const uploads = Object.values(uploadProgress);
  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const errorUploads = uploads.filter(u => u.status === 'error');

  // Don't render if no uploads
  if (uploads.length === 0) return null;

  // Calculate aggregated progress
  const totalBytes = uploads.reduce((sum, u) => sum + u.fileSize, 0);
  const loadedBytes = uploads.reduce((sum, u) => sum + u.loaded, 0);
  const overallProgress = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
  const avgSpeed = activeUploads.length > 0
    ? activeUploads.reduce((sum, u) => sum + u.speed, 0) / activeUploads.length
    : 0;

  const handleClearCompleted = () => {
    completedUploads.forEach(u => dispatch(removeUpload(u.id)));
  };

  const handleClearAll = () => {
    if (activeUploads.length === 0) {
      dispatch(clearAllUploads());
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg border-b border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <Upload className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                {activeUploads.length > 0 ? (
                  <>Uploading {activeUploads.length} file{activeUploads.length > 1 ? 's' : ''}...</>
                ) : completedUploads.length > 0 ? (
                  <>Upload{completedUploads.length > 1 ? 's' : ''} complete</>
                ) : (
                  <>Upload failed</>
                )}
              </span>
              {activeUploads.length > 0 && (
                <>
                  <span className="text-xs text-gray-500">
                    {overallProgress}% • {formatUploadSpeed(avgSpeed)}
                  </span>
                </>
              )}
            </div>
            {/* Overall Progress Bar */}
            {activeUploads.length > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {completedUploads.length > 0 && (
            <button
              onClick={handleClearCompleted}
              className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
            >
              Clear completed
            </button>
          )}
          {activeUploads.length === 0 && (
            <button
              onClick={handleClearAll}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded File List */}
      {isExpanded && uploads.length > 0 && (
        <div className="px-4 pb-3 max-h-64 overflow-y-auto border-t border-gray-200">
          <div className="space-y-2 pt-3">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              >
                {/* Status Icon */}
                {upload.status === 'uploading' && (
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                )}
                {upload.status === 'completed' && (
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                )}
                {upload.status === 'error' && (
                  <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {upload.fileName}
                    </p>
                    {upload.status === 'uploading' && (
                      <span className="text-xs text-blue-600 font-medium ml-2">
                        {upload.progress}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatBytes(upload.fileSize)}</span>
                    {upload.status === 'uploading' && upload.speed > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatUploadSpeed(upload.speed)}</span>
                        {upload.eta > 1000 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(upload.eta)} left</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {upload.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  {upload.status === 'error' && upload.error && (
                    <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {(upload.status === 'completed' || upload.status === 'error') && (
                  <button
                    onClick={() => dispatch(removeUpload(upload.id))}
                    className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                  >
                    <X className="h-3 w-3 text-gray-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalUploadProgress;
