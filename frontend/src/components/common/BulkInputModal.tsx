import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { parseBulkTags } from '../../utils/tagHelpers';

export interface BulkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: string) => void;
  title: string;
  placeholder: string;
  maxItems: number;
  currentCount: number;
  itemType: 'tags' | 'keywords';
}

const BulkInputModal: React.FC<BulkInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder,
  maxItems,
  currentCount,
  itemType,
}) => {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<string[]>([]);

  useEffect(() => {
    if (input.trim()) {
      const parsed = parseBulkTags(input, {
        maxLength: 50,
        maxCount: maxItems - currentCount,
      });
      setPreview(parsed);
    } else {
      setPreview([]);
    }
  }, [input, maxItems, currentCount]);

  const handleSubmit = () => {
    if (preview.length > 0) {
      onSubmit(input);
      setInput('');
      setPreview([]);
    }
  };

  const handleClose = () => {
    setInput('');
    setPreview([]);
    onClose();
  };

  if (!isOpen) return null;

  const remainingSlots = maxItems - currentCount;
  const willBeAdded = preview.length;
  const willExceedLimit = willBeAdded > remainingSlots;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Instructions */}
          <div className="text-sm text-gray-600">
            <p>
              Paste your {itemType} below, separated by commas or new lines.
              They will be automatically cleaned and deduplicated.
            </p>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {itemType === 'tags' ? 'Tags' : 'Keywords'}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              <span className="font-medium">{remainingSlots}</span> {itemType} remaining
              {' • '}
              <span className="font-medium">{currentCount}</span> current
            </div>
            <div className={`font-medium ${willExceedLimit ? 'text-red-600' : 'text-green-600'}`}>
              {willBeAdded} will be added
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview ({preview.length} {itemType}):
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-md max-h-32 overflow-y-auto">
                {preview.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {willExceedLimit && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only the first {remainingSlots} {itemType} will be added
                due to the limit of {maxItems} {itemType}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={preview.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add {preview.length} {itemType}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkInputModal;
