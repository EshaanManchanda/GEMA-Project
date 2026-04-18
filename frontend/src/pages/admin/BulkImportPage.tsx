import React, { useState } from 'react';
import { FaFileImport, FaDownload, FaUpload } from 'react-icons/fa';
import BulkImportModal from '../../components/admin/bulk/BulkImportModal';
import { useSupportedModels } from '@/features/admin/hooks/useAdminApis';
import { adminBulkImportAPI } from '@/features/admin/services/adminApis';
import toast from 'react-hot-toast';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
import { AdminPageHeader, AdminEmptyState } from '@/shared/components/admin';

interface ModelInfo {
  name: string;
  label: string;
  description: string;
  matchByOptions: Array<{ field: string; label: string }>;
}

const BulkImportPage: React.FC = () => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: modelsData, isLoading } = useSupportedModels();
  const models: ModelInfo[] = modelsData?.data?.models || modelsData?.models || [];

  const handleExport = async (modelName: string) => {
    setIsExporting(true);
    try {
      const response = await adminBulkImportAPI.export(modelName);
      const blob = new Blob([JSON.stringify(response.data || response, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelName.toLowerCase()}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${modelName} data exported successfully`);
    } catch (err: any) {
      logger.error('Export failed:', err);
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = (modelName: string) => {
    setSelectedModel(modelName);
    setIsImportModalOpen(true);
  };

  const handleImportSuccess = () => {
    toast.success('Import completed successfully');
    setIsImportModalOpen(false);
    setSelectedModel('');
  };

  return (
    <>
      <PrivatePageSEO title="Admin - Bulk Import | Gema" description="Import and export data" />
      <div className="container mx-auto px-4 py-8">
        <AdminPageHeader
          title="Bulk Import & Export"
          description="Import or export large amounts of data in JSON format"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            How it Works
          </h2>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Import:</strong> Upload a JSON file with an array of objects. Each object should match the model schema.</p>
            <p><strong>Export:</strong> Download current data as JSON file. You can modify and re-import it.</p>
            <p><strong>Modes:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li><strong>Upsert:</strong> Create new records or update existing ones (based on match field)</li>
              <li><strong>Create Only:</strong> Only create new records, skip existing ones</li>
            </ul>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : models.length === 0 ? (
          <AdminEmptyState
            title="No Models Available"
            description="Bulk import/export models are not configured"
            icon={<FaFileImport className="text-3xl" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <div
                key={model.name}
                className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {model.label}
                  </h3>
                  <p className="text-sm text-gray-600">{model.description}</p>
                </div>

                <div className="p-6">
                  <div className="space-y-3">
                    <button
                      onClick={() => handleImportClick(model.name)}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      <FaUpload className="mr-2" />
                      Import {model.label}
                    </button>

                    <button
                      onClick={() => handleExport(model.name)}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isExporting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FaDownload className="mr-2" />
                          Export {model.label}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Match By:</span>
                        <span className="font-medium text-gray-700">
                          {model.matchByOptions.map(o => o.label).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <BulkImportModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setSelectedModel('');
          }}
          onSuccess={handleImportSuccess}
          defaultModel={selectedModel}
        />
      </div>
    </>
  );
};

export default BulkImportPage;
