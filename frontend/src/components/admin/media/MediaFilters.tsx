import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Filter, X } from 'lucide-react';
import { AppDispatch, RootState } from '../../../store';
import { setFilters, clearFilters } from '../../../store/slices/mediaSlice';
import Button from '../../ui/Button';

/**
 * MediaFilters - Sidebar filter component
 *
 * Features:
 * - Filter by MIME type (images, videos, documents)
 * - Date range filtering
 * - File size filtering
 * - Clear all filters
 */
const MediaFilters: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { filters } = useSelector((state: RootState) => state.media);

  const [selectedMimeTypes, setSelectedMimeTypes] = useState<string[]>([]);

  // Handle MIME type filter
  const handleMimeTypeToggle = (mimeType: string) => {
    let newMimeTypes: string[];
    if (selectedMimeTypes.includes(mimeType)) {
      newMimeTypes = selectedMimeTypes.filter(t => t !== mimeType);
    } else {
      newMimeTypes = [...selectedMimeTypes, mimeType];
    }
    setSelectedMimeTypes(newMimeTypes);

    // Build filter string for API
    if (newMimeTypes.length > 0) {
      dispatch(setFilters({ mimeType: newMimeTypes.join(',') }));
    } else {
      const { mimeType, ...rest } = filters;
      dispatch(setFilters(rest));
    }
  };

  // Handle clear all filters
  const handleClearAll = () => {
    setSelectedMimeTypes([]);
    dispatch(clearFilters());
  };

  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).length > 0 || selectedMimeTypes.length > 0;

  const mimeTypeOptions = [
    { value: 'image/', label: 'Images', icon: '🖼️' },
    { value: 'video/', label: 'Videos', icon: '🎥' },
    { value: 'application/pdf', label: 'PDFs', icon: '📄' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* MIME Type Filters */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">File Type</h4>
        <div className="space-y-2">
          {mimeTypeOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedMimeTypes.includes(option.value)}
                onChange={() => handleMimeTypeToggle(option.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category Info (Read-only) */}
      {filters.category && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
          <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-800 capitalize">
              {filters.category}
            </span>
          </div>
        </div>
      )}

      {/* Folder Info (Read-only) */}
      {filters.folder && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Folder</h4>
          <div className="px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-sm font-medium text-purple-800">
              {filters.folder}
            </span>
          </div>
        </div>
      )}

      {/* Search Info (Read-only) */}
      {filters.search && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Search Query</h4>
          <div className="px-3 py-2 bg-green-50 rounded-lg border border-green-200">
            <span className="text-sm font-medium text-green-800">
              "{filters.search}"
            </span>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Use filters to narrow down your media library. Combine multiple filters for more specific results.
        </p>
      </div>
    </div>
  );
};

export default MediaFilters;
