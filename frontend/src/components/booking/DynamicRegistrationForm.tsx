import React, { useState, useEffect } from 'react';

interface RegistrationField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'textarea' | 'dropdown' | 'checkbox' | 'radio' | 'file' | 'date';
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: string[];
  accept?: string[];
  maxFileSize?: number;
  section?: string;
  order: number;
  helpText?: string;
}

interface RegistrationConfig {
  enabled: boolean;
  fields: RegistrationField[];
  maxRegistrations?: number;
  registrationDeadline?: Date;
  requiresApproval: boolean;
  emailNotifications: {
    toVendor: boolean;
    toParticipant: boolean;
    customMessage?: string;
  };
}

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

      case 'file':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (field.maxFileSize && file.size > field.maxFileSize) {
                    setErrors(prev => ({
                      ...prev,
                      [field.id]: `File size must be less than ${(field.maxFileSize / 1024 / 1024).toFixed(2)}MB`
                    }));
                    return;
                  }
                  handleInputChange(field.id, file);
                }
              }}
              accept={field.accept?.join(',')}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
            {field.maxFileSize && (
              <p className="mt-1 text-sm text-gray-500">
                Max file size: {(field.maxFileSize / 1024 / 1024).toFixed(2)}MB
              </p>
            )}
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
    console.warn('⚠️ DynamicRegistrationForm: No config provided');
    return null;
  }

  if (!config.enabled) {
    console.log('ℹ️ DynamicRegistrationForm: Registration disabled for this event');
    return null;
  }

  if (config.fields.length === 0) {
    console.warn('⚠️ DynamicRegistrationForm: No fields configured in registration form');
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
