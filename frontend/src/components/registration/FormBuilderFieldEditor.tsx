import React from 'react';
import { FormField, FieldType } from '@/types/registration';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import Button from '@/components/ui/Button';

interface FormBuilderFieldEditorProps {
  field: FormField;
  onUpdate: (field: Partial<FormField>) => void;
  onRemove: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  // Basic inputs
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'tel', label: 'Phone' },
  { value: 'textarea', label: 'Long Text' },
  
  // New field types
  { value: 'address', label: 'Address' },
  { value: 'website', label: 'Website URL' },
  
  // Date and time
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  
  // Location fields
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  
  // Selection fields
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  
  // Special fields
  { value: 'file', label: 'File Upload' },
  { value: 'html', label: 'HTML Block' },
  { value: 'pagebreak', label: 'Page Break' },
];

const FormBuilderFieldEditor: React.FC<FormBuilderFieldEditorProps> = ({
  field,
  onUpdate,
  onRemove,
  isSelected,
  onSelect,
}) => {
  const requiresOptions = ['dropdown', 'radio', 'checkbox'].includes(field.type);
  const isFileType = field.type === 'file';

  return (
    <div
      onClick={onSelect}
      className={`
        border-2 rounded-lg p-4 cursor-pointer transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 bg-white'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
          <span className="font-semibold text-gray-900">{field.label || 'Untitled Field'}</span>
          {field.required && <span className="text-xs text-red-500 font-bold">*</span>}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isSelected && (
        <div className="space-y-4">
          {/* Field Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Enter field label"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Type
            </label>
            <select
              value={field.type}
              onChange={(e) => onUpdate({ type: e.target.value as FieldType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder */}
          {!requiresOptions && !isFileType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Enter placeholder text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Help Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Help Text
            </label>
            <input
              type="text"
              value={field.helpText || ''}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="Additional instructions for users"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section (optional)
            </label>
            <input
              type="text"
              value={field.section || ''}
              onChange={(e) => onUpdate({ section: e.target.value })}
              placeholder="e.g., Personal Information"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700">
              Required Field
            </label>
            <button
              type="button"
              onClick={() => onUpdate({ required: !field.required })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${field.required ? 'bg-blue-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${field.required ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Options (for dropdown, radio, checkbox) */}
          {requiresOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {(field.options || []).map((option, index) => (
                  <div key={`option-${field.id}-${index}`} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[index] = e.target.value;
                        onUpdate({ options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const newOptions = field.options?.filter((_, i) => i !== index) || [];
                        onUpdate({ options: newOptions });
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...(field.options || []), ''];
                    onUpdate({ options: newOptions });
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="w-full"
                >
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* File Upload Settings */}
          {isFileType && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accepted File Types (comma-separated)
                </label>
                <input
                  type="text"
                  value={field.accept?.join(', ') || ''}
                  onChange={(e) => {
                    const types = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    onUpdate({ accept: types });
                  }}
                  placeholder=".pdf, .jpg, .png, .zip"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={field.maxFileSize ? field.maxFileSize / 1024 / 1024 : 5}
                  onChange={(e) => {
                    const mb = parseFloat(e.target.value) || 5;
                    onUpdate({ maxFileSize: mb * 1024 * 1024 });
                  }}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Validation Settings */}
          {['text', 'textarea', 'email', 'tel'].includes(field.type) && (
            <div className="border-t pt-3 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Validation Rules</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Length</label>
                  <input
                    type="number"
                    value={field.validation?.minLength || ''}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, minLength: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Length</label>
                  <input
                    type="number"
                    value={field.validation?.maxLength || ''}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, maxLength: parseInt(e.target.value) || undefined }
                    })}
                    placeholder="Unlimited"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {field.type === 'number' && (
            <div className="border-t pt-3 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Number Range</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Minimum</label>
                  <input
                    type="number"
                    value={field.validation?.min ?? ''}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, min: parseFloat(e.target.value) || undefined }
                    })}
                    placeholder="No minimum"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Maximum</label>
                  <input
                    type="number"
                    value={field.validation?.max ?? ''}
                    onChange={(e) => onUpdate({
                      validation: { ...field.validation, max: parseFloat(e.target.value) || undefined }
                    })}
                    placeholder="No maximum"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isSelected && (
        <div className="text-sm text-gray-500">
          Click to edit • {FIELD_TYPES.find(t => t.value === field.type)?.label}
        </div>
      )}
    </div>
  );
};

export default FormBuilderFieldEditor;
