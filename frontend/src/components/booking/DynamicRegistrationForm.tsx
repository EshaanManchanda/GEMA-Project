import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import UploadAPI from '../../services/api/uploadAPI';
import { getAbsoluteUploadUrl } from '../../utils/uploadHelpers';

import { RegistrationConfig, FormField as RegistrationField } from '../../types/registration';

interface DynamicRegistrationFormProps {
  config: RegistrationConfig;
  participantIndex: number;
  onDataChange: (participantIndex: number, data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

const DynamicRegistrationForm: React.FC<DynamicRegistrationFormProps> = ({
  config,
  participantIndex,
  onDataChange,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Notify parent of changes
    onDataChange(participantIndex, formData);
  }, [formData, participantIndex, onDataChange]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateField = (field: RegistrationField, value: any): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      const { pattern, minLength, maxLength, min, max } = field.validation;

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
        }
      }

      if (minLength && typeof value === 'string' && value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }

      if (maxLength && typeof value === 'string' && value.length > maxLength) {
        return `${field.label} must be no more than ${maxLength} characters`;
      }

      if (min !== undefined && typeof value === 'number' && value < min) {
        return `${field.label} must be at least ${min}`;
      }

      if (max !== undefined && typeof value === 'number' && value > max) {
        return `${field.label} must be no more than ${max}`;
      }
    }

    return null;
  };

  const renderField = (field: RegistrationField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
      case 'date':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                const fieldError = validateField(field, value);
                if (fieldError) {
                  setErrors(prev => ({ ...prev, [field.id]: fieldError }));
                }
              }}
              placeholder={field.placeholder}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                const fieldError = validateField(field, value);
                if (fieldError) {
                  setErrors(prev => ({ ...prev, [field.id]: fieldError }));
                }
              }}
              placeholder={field.placeholder}
              rows={4}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            ></textarea>
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                const fieldError = validateField(field, value);
                if (fieldError) {
                  setErrors(prev => ({ ...prev, [field.id]: fieldError }));
                }
              }}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            >
              <option value="">Select an option</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            {field.helpText && <p className="mt-1 text-sm text-gray-500 ml-6">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500 ml-6">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    name={`${field.id}_participant_${participantIndex}`}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'file': {
        const isUploading = uploadingFields[field.id] || false;
        const uploadError = uploadErrors[field.id];
        const isUploadedUrl = typeof value === 'string' && (value.startsWith('http') || value.startsWith('/api/'));
        const uploadedUrl = isUploadedUrl ? getAbsoluteUploadUrl(value) : null;

        const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (field.maxFileSize && file.size > field.maxFileSize) {
            setErrors(prev => ({
              ...prev,
              [field.id]: `File size must be less than ${((field.maxFileSize || 0) / 1024 / 1024).toFixed(2)}MB`
            }));
            return;
          }

          setUploadingFields(prev => ({ ...prev, [field.id]: true }));
          setUploadErrors(prev => { const n = { ...prev }; delete n[field.id]; return n; });

          try {
            const result = await UploadAPI.uploadDocument(file);
            const url = result?.data?.url || result?.data?.cloudinaryUrl;
            if (!url) throw new Error('No URL returned');
            handleInputChange(field.id, url);
          } catch (err: any) {
            logger.error('File upload failed', err);
            setUploadErrors(prev => ({
              ...prev,
              [field.id]: err?.response?.data?.message || 'Upload failed. Please try again.'
            }));
          } finally {
            setUploadingFields(prev => ({ ...prev, [field.id]: false }));
            e.target.value = '';
          }
        };

        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {uploadedUrl ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <a
                  href={uploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate flex-1"
                >
                  {uploadedUrl.split('/').pop()?.split('?')[0] || 'View uploaded file'}
                </a>
                <button
                  type="button"
                  onClick={() => handleInputChange(field.id, '')}
                  className="text-xs text-red-600 hover:text-red-800 font-medium shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : isUploading ? (
              <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                <svg className="animate-spin w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm text-gray-600">Uploading…</span>
              </div>
            ) : (
              <input
                type="file"
                onChange={handleFileSelect}
                accept={field.accept?.join(',')}
                className={`w-full px-3 py-2 border ${error || uploadError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              />
            )}

            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {field.maxFileSize && !uploadedUrl && !isUploading && (
              <p className="mt-1 text-xs text-gray-500">
                Max file size: {(field.maxFileSize / 1024 / 1024).toFixed(2)}MB
              </p>
            )}
            {(error || uploadError) && (
              <p className="mt-1 text-sm text-red-500">{error || uploadError}</p>
            )}
          </div>
        );
      }

      case 'website':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="url"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                const fieldError = validateField(field, value);
                if (fieldError) setErrors(prev => ({ ...prev, [field.id]: fieldError }));
              }}
              placeholder={field.placeholder || 'https://'}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'country':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            >
              <option value="">Select country</option>
              {(field.options && field.options.length > 0 ? field.options : [
                'United Arab Emirates', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman',
                'Egypt', 'Jordan', 'Lebanon', 'India', 'Pakistan', 'United States',
                'United Kingdom', 'Canada', 'Australia', 'Other'
              ]).map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'city':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              onBlur={() => {
                const fieldError = validateField(field, value);
                if (fieldError) setErrors(prev => ({ ...prev, [field.id]: fieldError }));
              }}
              placeholder={field.placeholder || 'Enter your city'}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'address':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || 'Enter your address'}
              rows={3}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'datetime':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'time':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="time"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  // Group fields by section
  const fieldsBySection = config.fields
    .sort((a, b) => a.order - b.order)
    .reduce((acc, field) => {
      const section = field.section || 'General Information';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(field);
      return acc;
    }, {} as Record<string, RegistrationField[]>);

  // Early return checks with debug logging
  if (!config) {
    logger.warn('DynamicRegistrationForm: No config provided');
    return null;
  }

  if (!config.enabled) {
    logger.debug('DynamicRegistrationForm: Registration disabled for this event');
    return null;
  }

  if (config.fields.length === 0) {
    logger.warn('DynamicRegistrationForm: No fields configured in registration form');
    return null;
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Participant {participantIndex + 1} Information
      </h3>

      {Object.entries(fieldsBySection).map(([section, fields]) => (
        <div key={section} className="mb-6">
          {Object.keys(fieldsBySection).length > 1 && (
            <h4 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">
              {section}
            </h4>
          )}
          <div className="space-y-4">
            {fields.map(field => renderField(field))}
          </div>
        </div>
      ))}

      {config.requiresApproval && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This registration requires approval from the event organizer.
          </p>
        </div>
      )}
    </div>
  );
};

export default DynamicRegistrationForm;
