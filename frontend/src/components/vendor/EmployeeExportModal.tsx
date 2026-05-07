import React, { useState } from 'react';

interface EmployeeExportModalProps {
  onClose: () => void;
  onExport: (format: 'csv' | 'json') => void;
}

const EmployeeExportModal: React.FC<EmployeeExportModalProps> = ({ onClose, onExport }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Export Employees</h2>
          <p className="text-sm text-gray-600 mb-6">
            Choose the format to export your employee data
          </p>

          {/* Format Selection */}
          <div className="space-y-3 mb-6">
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value as 'csv')}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">CSV Format</div>
                <div className="text-sm text-gray-500">
                  Compatible with Excel, Google Sheets, and most spreadsheet applications
                </div>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={(e) => setFormat(e.target.value as 'json')}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">JSON Format</div>
                <div className="text-sm text-gray-500">
                  Structured data format for developers and data analysis
                </div>
              </div>
            </label>
          </div>

          {/* Export Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              The export will include all employee data based on your current filters.
              This includes basic information, role, status, assigned events, and emergency contacts.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeExportModal;
