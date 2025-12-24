import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { ValidationReport as ValidationReportType } from '../../../services/api/bulkDataAPI';

interface ValidationReportProps {
  report: ValidationReportType;
  onConfirm?: () => void;
  onCancel?: () => void;
  isExecuting?: boolean;
}

const ValidationReport: React.FC<ValidationReportProps> = ({
  report,
  onConfirm,
  onCancel,
  isExecuting = false,
}) => {
  const { valid, summary, errors, warnings } = report;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div
        className={`p-4 rounded-lg border-2 ${
          valid
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {valid ? (
              <FaCheckCircle className="text-green-600 text-2xl" />
            ) : (
              <FaTimesCircle className="text-red-600 text-2xl" />
            )}
            <div>
              <h3 className="text-lg font-semibold">
                {valid ? 'Validation Passed' : 'Validation Failed'}
              </h3>
              <p className="text-sm text-gray-600">
                {summary.validRecords} of {summary.totalRecords} records are valid
              </p>
            </div>
          </div>

          {/* Validation Stats */}
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {summary.totalRecords}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.validRecords}
              </div>
              <div className="text-xs text-gray-500">Valid</div>
            </div>
            {summary.errorCount > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {summary.errorCount}
                </div>
                <div className="text-xs text-gray-500">Errors</div>
              </div>
            )}
            {summary.warningCount > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.warningCount}
                </div>
                <div className="text-xs text-gray-500">Warnings</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center space-x-2">
            <FaTimesCircle className="text-red-600" />
            <h4 className="font-semibold text-red-800">
              Errors ({errors.length})
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Row
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Field
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {errors.map((error, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {error.row}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700">
                      {error.field}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-600">
                      {error.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="bg-white rounded-lg border border-yellow-200">
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center space-x-2">
            <FaExclamationTriangle className="text-yellow-600" />
            <h4 className="font-semibold text-yellow-800">
              Warnings ({warnings.length})
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Row
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Field
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {warnings.map((warning, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {warning.row}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700">
                      {warning.field}
                    </td>
                    <td className="px-4 py-2 text-sm text-yellow-700">
                      {warning.message}
                      {warning.value && (
                        <span className="ml-2 text-gray-500">
                          ({String(warning.value)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {onConfirm && onCancel && (
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onCancel}
            disabled={isExecuting}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!valid || isExecuting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {isExecuting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
                <span>Importing...</span>
              </>
            ) : (
              <span>Confirm Import</span>
            )}
          </button>
        </div>
      )}

      {/* Expiration Notice */}
      {valid && (
        <div className="text-xs text-gray-500 text-center">
          Validation expires at {new Date(report.expiresAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default ValidationReport;
