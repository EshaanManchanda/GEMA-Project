import React, { useEffect, useState } from 'react';
import logger from '@/utils/logger';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Save,
  Eye,
  Settings,
  Calendar,
  Users,
  Mail,
  Loader2,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

import { AppDispatch } from '@/store';
import {
  fetchRegistrationConfig,
  saveRegistrationConfig,
  addFormBuilderField,
  updateFormBuilderField,
  removeFormBuilderField,
  setSelectedField,
  updateFormBuilderSettings,
  selectFormBuilder,
  selectIsFormBuilderDirty,
} from '@/store/slices/registrationsSlice';
import { FormField, FieldType } from '@/types/registration';

import FormBuilderFieldEditor from './FormBuilderFieldEditor';
import FormBuilderPreview from './FormBuilderPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';


interface FormBuilderProps {
  eventId: string;
  onSaveSuccess?: () => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ eventId, onSaveSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const formBuilder = useSelector(selectFormBuilder);
  const isDirty = useSelector(selectIsFormBuilderDirty);

  const [activeTab, setActiveTab] = useState<'build' | 'preview' | 'settings' | 'load'>('build');
  // Must be declared here (before any early returns) to comply with React Rules of Hooks
  const [defaultFieldsExpanded, setDefaultFieldsExpanded] = useState(false);

  // Load existing configuration
  useEffect(() => {
    dispatch(fetchRegistrationConfig(eventId));
  }, [eventId, dispatch]);

  // Add new field
  const handleAddField = (type: FieldType) => {
    const newField: FormField = {
      id: uuidv4(),
      label: `New ${type} Field`,
      type,
      required: false,
      order: formBuilder.config?.fields.length || 0,
    };

    dispatch(addFormBuilderField(newField));
    dispatch(setSelectedField(newField.id));
  };

  // Handle field update
  const handleFieldUpdate = (index: number, updates: Partial<FormField>) => {
    dispatch(updateFormBuilderField({ index, field: updates }));
  };

  // Handle field removal
  const handleFieldRemove = (index: number) => {
    const fieldId = formBuilder.config?.fields[index]?.id;
    if (formBuilder.selectedFieldId === fieldId) {
      dispatch(setSelectedField(null));
    }
    dispatch(removeFormBuilderField(index));
  };

  // Save configuration
  const handleSave = async () => {
    if (!formBuilder.config) {
      toast.error('No configuration to save');
      return;
    }

    // Validate fields
    const invalidFields = formBuilder.config.fields.filter(
      (field) => !field.label.trim()
    );

    if (invalidFields.length > 0) {
      toast.error('All fields must have a label');
      return;
    }

    try {
      await dispatch(
        saveRegistrationConfig({
          eventId,
          config: formBuilder.config,
        })
      ).unwrap();

      toast.success('Registration form saved successfully!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (error: any) {
      // Error toast is already shown by Redux thunk
      logger.error('Save error:', error);
    }
  };

  // Load configuration from JSON
  const handleLoadConfig = () => {
    try {
      // Get the JSON from the textarea
      const jsonTextarea = document.getElementById('config-json') as HTMLTextAreaElement;
      if (!jsonTextarea || !jsonTextarea.value.trim()) {
        toast.error('Please paste a valid JSON configuration');
        return;
      }

      const jsonData = JSON.parse(jsonTextarea.value);

      // Check if the JSON has the expected structure
      if (!jsonData.registrationConfig || !Array.isArray(jsonData.registrationConfig.fields)) {
        toast.error('Invalid configuration format. Missing registrationConfig or fields array.');
        return;
      }

      // Update the form builder with the loaded configuration
      dispatch(
        updateFormBuilderSettings({
          ...jsonData.registrationConfig,
          fields: jsonData.registrationConfig.fields
        })
      );

      // Clear the textarea
      jsonTextarea.value = '';

      toast.success('Registration form configuration loaded successfully!');
    } catch (error) {
      logger.error('Load error:', error);
      toast.error('Failed to parse JSON. Please check the format.');
    }
  };

  // Quick add field buttons — must match all cases in DynamicRegistrationForm.tsx
  const quickAddButtons = [
    // Text inputs
    { type: 'text' as FieldType, label: 'Text', icon: '📝' },
    { type: 'email' as FieldType, label: 'Email', icon: '📧' },
    { type: 'tel' as FieldType, label: 'Phone', icon: '📞' },
    { type: 'number' as FieldType, label: 'Number', icon: '🔢' },
    { type: 'textarea' as FieldType, label: 'Long Text', icon: '📄' },
    // Date & time
    { type: 'date' as FieldType, label: 'Date', icon: '📅' },
    { type: 'time' as FieldType, label: 'Time', icon: '🕐' },
    { type: 'datetime' as FieldType, label: 'Date & Time', icon: '🗓️' },
    // Choice
    { type: 'dropdown' as FieldType, label: 'Dropdown', icon: '▼' },
    { type: 'radio' as FieldType, label: 'Radio', icon: '🔘' },
    { type: 'checkbox' as FieldType, label: 'Checkbox', icon: '☑️' },
    // Location
    { type: 'country' as FieldType, label: 'Country', icon: '🌍' },
    { type: 'city' as FieldType, label: 'City', icon: '🏙️' },
    { type: 'address' as FieldType, label: 'Address', icon: '🏠' },
    // Other
    { type: 'website' as FieldType, label: 'Website / Link', icon: '🔗' },
    { type: 'file' as FieldType, label: 'File Upload', icon: '📎' },
  ];

  if (formBuilder.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading form builder...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Fields Section */}
      <Card>
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => setDefaultFieldsExpanded(v => !v)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Default Participant Fields</p>
                <p className="text-xs text-gray-500 mt-0.5">Always collected at booking — cannot be removed</p>
              </div>
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">8 fields</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${defaultFieldsExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {defaultFieldsExpanded && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-800">
                  These fields are collected for every participant during booking. Use the form builder below to add <strong>additional</strong> custom fields.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Enter full name</div>
                </div>

                {/* Email */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Enter email address</div>
                </div>

                {/* Phone */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Enter phone number</div>
                </div>

                {/* Age */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Age</label>
                  <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">5 – – years</div>
                </div>

                {/* Gender */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Gender</label>
                  <div className="flex gap-3 text-xs text-gray-600">
                    {['Male', 'Female', 'Other'].map(g => (
                      <label key={g} className="flex items-center gap-1 cursor-default">
                        <div className="w-3 h-3 rounded-full border border-gray-300 bg-gray-50" />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Emergency Contact <span className="text-amber-600 text-xs font-normal">(Recommended)</span>
                  </label>
                  <div className="space-y-1">
                    <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Contact name</div>
                    <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Contact phone</div>
                    <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Relationship</div>
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Dietary Restrictions & Allergies</label>
                  <div className="flex flex-wrap gap-2">
                    {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut Allergies', 'Halal', 'Kosher', 'Other'].map(d => (
                      <label key={d} className="flex items-center gap-1 text-xs text-gray-600 cursor-default">
                        <div className="w-3 h-3 rounded border border-gray-300 bg-gray-50 flex-shrink-0" />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Special Requirements</label>
                  <div className="w-full h-10 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-400">Any special requirements or notes...</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Form Builder</h2>
              <p className="text-gray-600">Add custom fields on top of the default participant fields above</p>
            </div>
            <div className="flex items-center space-x-3">
              {isDirty && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Unsaved changes</span>
                </div>
              )}
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={formBuilder.isSaving || !isDirty}
                leftIcon={
                  formBuilder.isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )
                }
              >
                {formBuilder.isSaving ? 'Saving...' : 'Save Form'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="bg-white border rounded-lg">
        <div className="border-b">
          <div className="flex space-x-1 p-2">
            <button
              type="button"
              onClick={() => setActiveTab('build')}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2
                ${activeTab === 'build'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Plus className="w-4 h-4" />
              <span>Build</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2
                ${activeTab === 'preview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2
                ${activeTab === 'settings'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('load')}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2
                ${activeTab === 'load'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Upload className="w-4 h-4" />
              <span>Load Config</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Build Tab */}
          {activeTab === 'build' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Field Palette */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Fields</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quickAddButtons.map((btn) => (
                      <button
                        key={btn.type}
                        type="button"
                        onClick={() => handleAddField(btn.type)}
                        className="w-full flex items-center space-x-3 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <span className="text-2xl">{btn.icon}</span>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                          {btn.label}
                        </span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Fields Editor */}
              <div className="lg:col-span-2 space-y-4">
                {(formBuilder.config?.fields || []).length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Plus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Custom Fields Added</h3>
                      <p className="text-sm text-gray-500">
                        The default participant fields (name, email, phone, age, gender, etc.) are always collected.<br />
                        Add custom fields here if you need additional information.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  (formBuilder.config?.fields || []).map((field, index) => (
                    <FormBuilderFieldEditor
                      key={field.id}
                      field={field}
                      onUpdate={(updates) => handleFieldUpdate(index, updates)}
                      onRemove={() => handleFieldRemove(index)}
                      isSelected={formBuilder.selectedFieldId === field.id}
                      onSelect={() => dispatch(setSelectedField(field.id))}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <FormBuilderPreview fields={formBuilder.config?.fields || []} />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Form Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enable/Disable */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-semibold text-gray-900">
                        Enable Registration
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Allow participants to register for this event
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(
                          updateFormBuilderSettings({
                            enabled: !formBuilder.config?.enabled,
                          })
                        )
                      }
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${formBuilder.config?.enabled ? 'bg-green-600' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${formBuilder.config?.enabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  {/* Max Registrations */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-2">
                      <Users className="w-4 h-4" />
                      <span>Maximum Registrations (optional)</span>
                    </label>
                    <input
                      type="number"
                      value={formBuilder.config?.maxRegistrations || ''}
                      onChange={(e) =>
                        dispatch(
                          updateFormBuilderSettings({
                            maxRegistrations: parseInt(e.target.value) || undefined,
                          })
                        )
                      }
                      placeholder="Unlimited"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Registration Deadline */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>Registration Deadline (optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        formBuilder.config?.registrationDeadline
                          ? new Date(formBuilder.config.registrationDeadline)
                            .toISOString()
                            .slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        dispatch(
                          updateFormBuilderSettings({
                            registrationDeadline: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          })
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Requires Approval */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-semibold text-gray-900">
                        Require Approval
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Manually review and approve each registration
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(
                          updateFormBuilderSettings({
                            requiresApproval: !formBuilder.config?.requiresApproval,
                          })
                        )
                      }
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${formBuilder.config?.requiresApproval ? 'bg-blue-600' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${formBuilder.config?.requiresApproval ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  {/* Email Notifications */}
                  <div className="border-t pt-6">
                    <h3 className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-4">
                      <Mail className="w-4 h-4" />
                      <span>Email Notifications</span>
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Notify vendor on new registration</span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(
                              updateFormBuilderSettings({
                                emailNotifications: {
                                  ...formBuilder.config?.emailNotifications!,
                                  toVendor: !formBuilder.config?.emailNotifications?.toVendor,
                                },
                              })
                            )
                          }
                          className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${formBuilder.config?.emailNotifications?.toVendor ? 'bg-blue-600' : 'bg-gray-300'}
                          `}
                        >
                          <span
                            className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                              ${formBuilder.config?.emailNotifications?.toVendor ? 'translate-x-6' : 'translate-x-1'}
                            `}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Notify participant on submission</span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(
                              updateFormBuilderSettings({
                                emailNotifications: {
                                  ...formBuilder.config?.emailNotifications!,
                                  toParticipant: !formBuilder.config?.emailNotifications?.toParticipant,
                                },
                              })
                            )
                          }
                          className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${formBuilder.config?.emailNotifications?.toParticipant ? 'bg-blue-600' : 'bg-gray-300'}
                          `}
                        >
                          <span
                            className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                              ${formBuilder.config?.emailNotifications?.toParticipant ? 'translate-x-6' : 'translate-x-1'}
                            `}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Load Config Tab */}
          {activeTab === 'load' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Load Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Paste a valid JSON configuration below to load an existing registration form.
                      This will replace your current form configuration.
                    </p>
                  </div>

                  <textarea
                    id="config-json"
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="Paste JSON configuration here..."
                  ></textarea>

                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      onClick={handleLoadConfig}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      Load Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
