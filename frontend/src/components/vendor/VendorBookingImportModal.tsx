import React, { useState } from 'react';
import vendorAPI from '../../services/api/vendorAPI';

interface VendorBookingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const VendorBookingImportModal: React.FC<VendorBookingImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);

      if (rows.length < 2) {
        setError('CSV file is empty or invalid');
        return;
      }

      const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = rows.slice(1).map(row => {
        const values = parseCSVRow(row);
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[toCamelCase(header)] = values[index] || '';
        });
        return obj;
      });

      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const parseCSVRow = (row: string): string[] => {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    return values.map(v => v.replace(/"/g, ''));
  };

  const toCamelCase = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  };

  const handleImport = async () => {
    if (!csvData || csvData.length === 0) {
      setError('No data to import');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await vendorAPI.importVendorBookings(csvData);
      setImportResult(result);

      if (result.successful && result.successful.length > 0) {
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import bookings');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'Customer Name,Customer Email,Customer Phone,Event Title,Event Date,Quantity,Total Amount,Currency,Status,Payment Status,Participant Names',
      'John Doe,john@example.com,+971501234567,Workshop Name,2025-01-15,2,500,AED,confirmed,paid,John Doe; Jane Doe'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'booking-import-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-light sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Import Bookings from CSV
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {importResult && (
                  <div className="mb-4 space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-600 font-medium">
                        Import completed: {importResult.successful?.length || 0} successful, {importResult.failed?.length || 0} failed
                      </p>
                    </div>
                    {importResult.failed && importResult.failed.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium text-yellow-800 mb-2">Failed imports:</p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {importResult.failed.slice(0, 5).map((fail: any, idx: number) => (
                            <li key={idx}>Row {fail.row}: {fail.reason}</li>
                          ))}
                          {importResult.failed.length > 5 && (
                            <li>...and {importResult.failed.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Template Download */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Step 1:</strong> Download the CSV template to ensure correct formatting
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                    >
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Template
                    </button>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <strong>Step 2:</strong> Upload your CSV file
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">CSV files only</p>
                      </div>
                    </div>
                    {file && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: <span className="font-medium">{file.name}</span> ({csvData.length} rows)
                      </p>
                    )}
                  </div>

                  {/* Preview */}
                  {csvData.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview (first 3 rows):
                      </label>
                      <div className="border border-gray-300 rounded-md overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-2 text-left font-medium text-gray-500">Customer</th>
                              <th className="px-2 py-2 text-left font-medium text-gray-500">Event</th>
                              <th className="px-2 py-2 text-left font-medium text-gray-500">Quantity</th>
                              <th className="px-2 py-2 text-left font-medium text-gray-500">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.slice(0, 3).map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-2 whitespace-nowrap">{row.customerEmail}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{row.eventTitle}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{row.quantity}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{row.totalAmount} {row.currency}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || csvData.length === 0 || isProcessing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </>
              ) : (
                'Import Bookings'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importResult && importResult.successful?.length > 0 ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorBookingImportModal;
