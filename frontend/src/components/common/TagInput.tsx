import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { parseBulkTags, validateTag } from '../../utils/tagHelpers';
import BulkInputModal from './BulkInputModal';

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  maxTagLength?: number;
  placeholder?: string;
  disabled?: boolean;
  showCount?: boolean;
  allowBulkAdd?: boolean;
  label?: string;
  error?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  maxTags = 20,
  maxTagLength = 50,
  placeholder = 'Add tag',
  disabled = false,
  showCount = true,
  allowBulkAdd = true,
  label,
  error,
}) => {
  const [newTag, setNewTag] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const trimmedTag = newTag.trim().toLowerCase();

    // Validate tag
    const validation = validateTag(trimmedTag);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid tag');
      return;
    }

    // Check for duplicates
    if (tags.includes(trimmedTag)) {
      setValidationError('Tag already exists');
      return;
    }

    // Check max limit
    if (tags.length >= maxTags) {
      setValidationError(`Cannot exceed ${maxTags} tags`);
      return;
    }

    // Add tag
    onChange([...tags, trimmedTag]);
    setNewTag('');
    setValidationError('');
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleBulkAdd = (bulkInput: string) => {
    const parsedTags = parseBulkTags(bulkInput, {
      maxLength: maxTagLength,
      maxCount: maxTags - tags.length,
    });

    // Filter out duplicates
    const newTags = parsedTags.filter(tag => !tags.includes(tag));

    if (newTags.length === 0) {
      setValidationError('No new valid tags to add');
      return;
    }

    onChange([...tags, ...newTags]);
    setShowBulkModal(false);
    setValidationError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {showCount && (
            <span className="ml-2 text-xs text-gray-500">
              ({tags.length}/{maxTags})
            </span>
          )}
        </label>
      )}

      {/* Input Row */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => {
            setNewTag(e.target.value);
            setValidationError('');
          }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || tags.length >= maxTags}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleAddTag}
          disabled={disabled || tags.length >= maxTags || !newTag.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
        {allowBulkAdd && (
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            disabled={disabled || tags.length >= maxTags}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed"
          >
            Bulk Add
          </button>
        )}
      </div>

      {/* Validation Error */}
      {(validationError || error) && (
        <p className="text-xs text-red-600">
          {validationError || error}
        </p>
      )}

      {/* Tag Chips */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveTag(index)}
                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {tags.length === 0 && !disabled && (
        <p className="text-xs text-gray-500">
          No tags added yet. {allowBulkAdd && 'Use "Bulk Add" to paste multiple tags.'}
        </p>
      )}

      {/* Bulk Input Modal */}
      {allowBulkAdd && (
        <BulkInputModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSubmit={handleBulkAdd}
          title="Bulk Add Tags"
          placeholder="Enter tags separated by commas or new lines&#10;e.g., kids, science, fun&#10;educational, outdoor"
          maxItems={maxTags}
          currentCount={tags.length}
          itemType="tags"
        />
      )}
    </div>
  );
};

export default TagInput;
