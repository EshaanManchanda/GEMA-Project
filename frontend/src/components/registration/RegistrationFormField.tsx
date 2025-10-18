import React from 'react';
import { FormField } from '@/types/registration';
import { FileUp, Calendar, Clock, Globe, MapPin, ChevronDown } from 'lucide-react';

interface RegistrationFormFieldProps {
  field: FormField;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
}

const RegistrationFormField: React.FC<RegistrationFormFieldProps> = ({
  field,
  value,
  error,
  onChange,
  onFileChange,
  disabled = false,
}) => {
  const baseInputClasses = `
    w-full px-4 py-3 border-2 rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:cursor-not-allowed
    ${error
      ? 'border-red-300 bg-red-50 focus:ring-red-500'
      : 'border-gray-300 bg-white hover:border-gray-400'
    }
  `;

  // Helper function to safely display values that might be objects
  const displayValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      // Handle address objects specifically
      if (val.address) return val.address;
      return JSON.stringify(val);
    }
    return String(val);
  };

  const renderField = () => {
    switch (field.type) {
      // ✅ Basic Text Inputs
      case 'text':
      case 'email':
      case 'tel':
      case 'website':
        return (
          <input
            type={field.type === 'website' ? 'url' : field.type === 'number' ? 'number' : field.type}
            id={field.id}
            value={displayValue(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            className={baseInputClasses}
          />
        );
      
      // ✅ Address Field (handled separately from basic text inputs)
      case 'address':
        return (
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id={field.id}
              value={typeof value === 'object' ? (value?.address || '') : (value || '')}
              onChange={(e) => {
                // Create or update address object
                const addressValue = typeof value === 'object' ? 
                  { ...value, address: e.target.value } : 
                  { address: e.target.value, city: '', coordinates: {} };
                onChange(addressValue);
              }}
              placeholder={field.placeholder || "Enter address"}
              required={field.required}
              disabled={disabled}
              className={`${baseInputClasses} pl-10`}
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            value={displayValue(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClasses}
          />
        );

      // ✅ Textarea Field
      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={displayValue(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            rows={4}
            className={`${baseInputClasses} resize-none`}
          />
        );

      case 'date':
        return (
          <div className="relative">
            <input
              type="date"
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              className={baseInputClasses}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );
        
      // ✅ Time Picker
      case 'time':
        return (
          <div className="relative">
            <input
              type="time"
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              className={baseInputClasses}
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );

      // ✅ DateTime Picker
      case 'datetime':
        return (
          <div className="relative">
            <input
              type="datetime-local"
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              className={baseInputClasses}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );
        
      // ✅ Country Selector
      case 'country':
        return (
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              className={`${baseInputClasses} appearance-none pl-10 pr-10 cursor-pointer`}
            >
              <option value="">Select Country</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );
        
      // ✅ City Selector
      case 'city':
        return (
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              className={`${baseInputClasses} appearance-none pl-10 pr-10 cursor-pointer`}
            >
              <option value="">Select City</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );
        
      // ✅ HTML Block
      case 'html':
        return (
          <div 
            className="p-4 border border-gray-200 rounded-xl bg-gray-50"
            dangerouslySetInnerHTML={{ __html: value || field.placeholder || '' }}
          />
        );
        
      // ✅ Page Break
      case 'pagebreak':
        return (
          <div className="w-full py-2 my-4 border-t-2 border-dashed border-gray-300 text-center">
            <span className="inline-block px-4 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              Page Break
            </span>
          </div>
        );

      case 'dropdown':
        return (
          <div className="relative">
            <select
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
              disabled={disabled}
              className={`${baseInputClasses} appearance-none pr-10 cursor-pointer`}
            >
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((option) => (
              <label
                key={option}
                className={`
                  flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${value === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  required={field.required}
                  disabled={disabled}
                  className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.options?.map((option) => {
              const checkboxValues = Array.isArray(value) ? value : [];
              const isChecked = checkboxValues.includes(option);

              return (
                <label
                  key={option}
                  className={`
                    flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all
                    ${isChecked
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={isChecked}
                    onChange={() => {
                      const newValues = isChecked
                        ? checkboxValues.filter((v) => v !== option)
                        : [...checkboxValues, option];
                      onChange(newValues);
                    }}
                    disabled={disabled}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">{option}</span>
                </label>
              );
            })}
          </div>
        );

      case 'file':
        return (
          <div>
            <label
              htmlFor={field.id}
              className={`
                flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl
                cursor-pointer transition-all duration-200
                ${error
                  ? 'border-red-300 bg-red-50 hover:bg-red-100'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className={`w-10 h-10 mb-3 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {field.accept?.join(', ') || 'Any file type'}
                  {field.maxFileSize && ` (Max ${(field.maxFileSize / 1024 / 1024).toFixed(1)}MB)`}
                </p>
              </div>
              <input
                type="file"
                id={field.id}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && field.maxFileSize && file.size > field.maxFileSize) {
                    alert(`File size exceeds ${(field.maxFileSize / 1024 / 1024).toFixed(1)}MB limit`);
                    e.target.value = '';
                    return;
                  }
                  if (onFileChange) {
                    onFileChange(file);
                  }
                  onChange(file ? file.name : '');
                }}
                accept={field.accept?.join(',')}
                required={field.required}
                disabled={disabled}
                className="hidden"
              />
            </label>
            {value && (
              <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-900 truncate">{value}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      if (onFileChange) {
                        onFileChange(null);
                      }
                      const input = document.getElementById(field.id) as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                    className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="block text-sm font-semibold text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.helpText && (
        <p className="text-xs text-gray-500 mb-2">{field.helpText}</p>
      )}

      {renderField()}

      {error && (
        <p className="text-sm text-red-600 font-medium flex items-center">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default RegistrationFormField;
