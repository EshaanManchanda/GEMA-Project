import React, { useState, useEffect } from 'react';
import { FaTimes, FaDownload, FaFileExport } from 'react-icons/fa';
import bulkDataAPI, {
  ExportOptions,
  ModelInfo,
} from '../../../services/api/bulkDataAPI';

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModel?: string;
}

const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
  defaultModel,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [includeRelationships, setIncludeRelationships] = useState(true);
  const [limit, setLimit] = useState<number>(1000);
  const [filters, setFilters] = useState<any>({});
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load models on mount
  useEffect(() => {
    if (isOpen) {
      loadModels();
      if (defaultModel) {
        setSelectedModel(defaultModel);
      }
    }
  }, [isOpen, defaultModel]);

  const loadModels = async () => {
    try {
      const modelsList = await bulkDataAPI.getSupportedModels();
      setModels(modelsList);
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError('Failed to load model list');
    }
  };

  const handleExport = async () => {
    if (!selectedModel) return;

    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        model: selectedModel,
        format: 'json',
        filters,
        includeRelationships,
        limit: limit || undefined,
      };

      await bulkDataAPI.downloadExport(options);

      // Close modal after short delay
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setSelectedModel('');
    setFilters({});
    setLimit(1000);
    setIncludeRelationships(true);
    setError(null);
    onClose();
  };

  const currentModel = models.find((m) => m.name === selectedModel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-green-600 to-green-700">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <FaFileExport />
            <span>Bulk Export</span>
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose a model...</option>
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.label}
                  </option>
                ))}
              </select>
              {currentModel && (
                <p className="mt-1 text-sm text-gray-500">
                  {currentModel.description}
                </p>
              )}
            </div>

            {selectedModel && (
              <>
                {/* Export Options */}
                <div className="space-y-4">
                  {/* Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Limit (max records)
                    </label>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                      min={1}
                      max={50000}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="1000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to export all records (up to 50,000)
                    </p>
                  </div>

                  {/* Include Relationships */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeRelationships"
                      checked={includeRelationships}
                      onChange={(e) => setIncludeRelationships(e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="includeRelationships"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Include readable relationship names (e.g., vendorEmail, categorySlug)
                    </label>
                  </div>
                </div>

                {/* Filters Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Filters (Optional)
                  </h3>
                  <div className="space-y-3">
                    {/* Common Filters */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Active Status */}
                      {['Category', 'User', 'Event', 'Collection', 'Coupon'].includes(selectedModel) && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Active Only
                          </label>
                          <select
                            onChange={(e) => setFilters({ ...filters, isActive: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">All</option>
                            <option value="true">Active Only</option>
                            <option value="false">Inactive Only</option>
                          </select>
                        </div>
                      )}

                      {/* Date Range */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Created After
                        </label>
                        <input
                          type="date"
                          onChange={(e) => setFilters({ ...filters, createdAfter: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    {/* Model-specific Filters */}
                    {selectedModel === 'Event' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Event Type
                        </label>
                        <select
                          onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">All Types</option>
                          <option value="Olympiad">Olympiad</option>
                          <option value="Championship">Championship</option>
                          <option value="Competition">Competition</option>
                          <option value="Event">Event</option>
                          <option value="Course">Course</option>
                          <option value="Venue">Venue</option>
                        </select>
                      </div>
                    )}

                    {selectedModel === 'Order' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Status
                          </label>
                          <select
                            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Payment Status
                          </label>
                          <select
                            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value || undefined })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedModel === 'Coupon' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Status
                        </label>
                        <select
                          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Export Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Export Information
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Format: JSON</li>
                    <li>• Max Records: {limit || 50000}</li>
                    <li>
                      • Relationships:{' '}
                      {includeRelationships ? 'Included' : 'IDs only'}
                    </li>
                    <li>
                      • Active Filters:{' '}
                      {Object.keys(filters).filter((k) => filters[k]).length || 'None'}
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!selectedModel || isExporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FaDownload />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkExportModal;
