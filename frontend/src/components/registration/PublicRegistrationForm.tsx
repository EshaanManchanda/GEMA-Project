import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FileText, Send, Save, Loader2, CheckCircle, XCircle, AlertCircle, Calendar, CreditCard, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '@/store';
import {
  fetchRegistrationConfig,
  submitRegistration,
  updateRegistrationFormField,
  updateRegistrationFormFile,
  resetRegistrationForm,
  selectRegistrationForm,
  selectIsSubmittingRegistration,
  selectRegistrationSubmitError,
  selectRegistrationPayment,
} from '@/store/slices/registrationsSlice';
import { RegistrationData } from '@/types/registration';
import { Event } from '@/types/event';

import RegistrationFormField from './RegistrationFormField';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface PublicRegistrationFormProps {
  event: Event;
  onSuccess?: () => void;
}

const PublicRegistrationForm: React.FC<PublicRegistrationFormProps> = ({ event, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const registrationForm = useSelector(selectRegistrationForm);
  const isSubmitting = useSelector(selectIsSubmittingRegistration);
  const submitError = useSelector(selectRegistrationSubmitError);
  const payment = useSelector(selectRegistrationPayment);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Load registration configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoadingConfig(true);
        await dispatch(fetchRegistrationConfig(event._id)).unwrap();
      } catch (error: any) {
        toast.error(error || 'Failed to load registration form');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();

    return () => {
      // Cleanup on unmount
      dispatch(resetRegistrationForm());
    };
  }, [event._id, dispatch]);

  // Validate individual field
  const validateField = (fieldId: string, value: any): string | null => {
    const field = registrationForm.config?.fields.find((f) => f.id === fieldId);
    if (!field) return null;

    // Required validation
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    // Email validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    // Min/Max length validation
    if (field.validation?.minLength && value.length < field.validation.minLength) {
      return `Minimum ${field.validation.minLength} characters required`;
    }
    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
      return `Maximum ${field.validation.maxLength} characters allowed`;
    }

    // Number range validation
    if (field.type === 'number') {
      const numValue = parseFloat(value);
      if (field.validation?.min !== undefined && numValue < field.validation.min) {
        return `Minimum value is ${field.validation.min}`;
      }
      if (field.validation?.max !== undefined && numValue > field.validation.max) {
        return `Maximum value is ${field.validation.max}`;
      }
    }

    // Pattern validation
    if (field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return 'Invalid format';
      }
    }

    return null;
  };

  // Validate all fields
  const validateAllFields = (): boolean => {
    if (!registrationForm.config) return false;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    registrationForm.config.fields.forEach((field) => {
      const value = registrationForm.formData[field.id];
      const error = validateField(field.id, value);

      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle field change
  const handleFieldChange = (fieldId: string, value: any) => {
    dispatch(updateRegistrationFormField({ fieldId, value }));

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Handle file change
  const handleFileChange = (fieldId: string, file: File | null) => {
    dispatch(updateRegistrationFormFile({ fieldId, file }));
  };

  // Handle submit
  const handleSubmit = async (saveAsDraft: boolean = false) => {
    // Validate if not saving as draft
    if (!saveAsDraft && !validateAllFields()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    if (!registrationForm.config) {
      toast.error('Registration configuration not loaded');
      return;
    }

    try {
      // Prepare registration data
      const registrationData: RegistrationData[] = registrationForm.config.fields.map((field) => ({
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: field.type,
        value: registrationForm.formData[field.id] || null,
      }));

      // Prepare files
      const files = Object.entries(registrationForm.files)
        .map(([_, file]) => file)
        .filter(Boolean);

      // Submit registration
      const result = await dispatch(
        submitRegistration({
          eventId: event._id,
          registrationData,
          files,
          saveAsDraft,
        })
      ).unwrap();

      // If payment is required, redirect to payment
      if (result.data.payment) {
        toast.success('Registration created! Redirecting to payment...');
        // In a real app, integrate with Stripe here
        // For now, we'll just show the payment info
        console.log('Payment required:', result.data.payment);
        if (onSuccess) onSuccess();
      } else {
        toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Registration submitted successfully!');
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error('Registration submission error:', error);
    }
  };

  // Group fields by section
  const groupedFields = registrationForm.config?.fields.reduce((acc, field) => {
    const section = field.section || 'General Information';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, typeof registrationForm.config.fields>);

  // Loading state
  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading registration form...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No config available
  if (!registrationForm.config || !registrationForm.config.enabled) {
    return (
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Registration Not Available</h3>
          <p className="text-gray-600 mb-4">Registration for this event is currently closed.</p>
        </CardContent>
      </Card>
    );
  }

  // Check registration deadline
  const isDeadlinePassed = registrationForm.config.registrationDeadline
    ? new Date(registrationForm.config.registrationDeadline) < new Date()
    : false;

  if (isDeadlinePassed) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardContent className="py-12 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Registration Deadline Passed</h3>
          <p className="text-gray-600">The registration period for this event has ended.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Info Header */}
      <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Register for {event.title}</h2>
              <p className="text-gray-600 mb-4">Fill in the information below to complete your registration</p>

              <div className="flex flex-wrap gap-3">
                <Badge variant="primary" className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{event.category}</span>
                </Badge>
                {event.price > 0 && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <CreditCard className="w-3 h-3" />
                    <span>{event.currency} {event.price}</span>
                  </Badge>
                )}
                {registrationForm.config.registrationDeadline && (
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Deadline: {new Date(registrationForm.config.registrationDeadline).toLocaleDateString()}
                    </span>
                  </Badge>
                )}
              </div>

              {registrationForm.config.requiresApproval && (
                <div className="mt-4 flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Approval Required:</strong> Your registration will be reviewed by the event organizer before confirmation.
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-6">
        {groupedFields && Object.entries(groupedFields).map(([section, fields]) => (
          <Card key={section}>
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>{section}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {fields.map((field) => (
                <RegistrationFormField
                  key={field.id}
                  field={field}
                  value={registrationForm.formData[field.id]}
                  error={errors[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  onFileChange={(file) => handleFileChange(field.id, file)}
                  disabled={isSubmitting}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Submit Error */}
        {submitError && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <Card className="sticky bottom-0 shadow-xl border-2 border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                leftIcon={<Save className="w-5 h-5" />}
                className="w-full sm:w-auto"
              >
                Save as Draft
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                leftIcon={
                  isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )
                }
                className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Registration'}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              By submitting, you agree to the event's terms and conditions.
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default PublicRegistrationForm;
