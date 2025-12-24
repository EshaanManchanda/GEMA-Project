import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaUpload, FaFileImport, FaCheckCircle } from 'react-icons/fa';
import bulkDataAPI, {
  ImportOptions,
  ValidationReport as ValidationReportType,
  ImportResult,
  ModelInfo,
} from '../../../services/api/bulkDataAPI';
import ValidationReport from './ValidationReport';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultModel?: string;
}

type Step = 'upload' | 'validate' | 'confirm' | 'complete';

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultModel,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [matchBy, setMatchBy] = useState<'id' | 'slug' | 'email' | 'code' | 'orderNumber'>('slug');
  const [mode, setMode] = useState<'create' | 'upsert'>('upsert');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReportType | null>(null);
  const [validationId, setValidationId] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    // Validate file
    const validation = bulkDataAPI.validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setFile(selectedFile);

    // Parse JSON
    try {
      const data = await bulkDataAPI.parseJSONFile(selectedFile);
      setParsedData(data);
    } catch (err: any) {
      setError(err.message);
      setFile(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedModel || parsedData.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const options: ImportOptions = {
        model: selectedModel,
        mode,
        matchBy,
      };

      const result = await bulkDataAPI.validateImport(parsedData, options);
      setValidationReport(result.report);
      setValidationId(result.validationId);
      setStep('confirm');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await bulkDataAPI.executeImport(validationId);
      setImportResult(result);
      setStep('complete');

      // Call success callback after short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setValidationReport(null);
    setValidationId('');
    setImportResult(null);
    setError(null);
    onClose();
  };

  const currentModel = models.find((m) => m.name === selectedModel);
  const matchByOptions = currentModel?.matchByOptions || [
    { value: 'slug', label: 'Slug' },
    { value: 'id', label: 'ID' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <FaFileImport />
            <span>Bulk Import</span>
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

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Import Options */}
              {selectedModel && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Import Mode
                      </label>
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'create' | 'upsert')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="upsert">Upsert (Create + Update)</option>
                        <option value="create">Create Only</option>
                      </select>
                    </div>

                    {/* Match By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Match By
                      </label>
                      <select
                        value={matchBy}
                        onChange={(e) => setMatchBy(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {matchByOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload JSON File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <FaUpload className="text-4xl text-gray-400" />
                        <span className="text-gray-600">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-sm text-gray-500">
                          JSON files only (max 10MB)
                        </span>
                      </label>
                    </div>
                    {file && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {file.name}
                          </p>
                          <p className="text-xs text-green-600">
                            {parsedData.length} records loaded
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setFile(null);
                            setParsedData([]);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Validation Results */}
          {step === 'confirm' && validationReport && (
            <ValidationReport
              report={validationReport}
              onConfirm={handleConfirmImport}
              onCancel={() => setStep('upload')}
              isExecuting={isLoading}
            />
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && importResult && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <FaCheckCircle className="text-4xl text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800">
                Import Successful!
              </h3>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {importResult.summary.created}
                  </div>
                  <div className="text-sm text-gray-600">Created</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {importResult.summary.updated}
                  </div>
                  <div className="text-sm text-gray-600">Updated</div>
                </div>
              </div>
              {importResult.summary.failed > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    {importResult.summary.failed} records failed
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Completed in {(importResult.duration / 1000).toFixed(2)}s
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'upload' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleValidate}
              disabled={!selectedModel || parsedData.length === 0 || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
            >
              {isLoading ? (
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
                  <span>Validating...</span>
                </>
              ) : (
                <span>Validate</span>
              )}
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportModal;
