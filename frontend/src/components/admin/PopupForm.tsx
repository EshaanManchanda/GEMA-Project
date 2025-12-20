import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { PopupNotification, CreatePopupData } from '@/types/popup';

interface PopupFormProps {
  popup?: PopupNotification | null;
  onCancel: () => void;
  onSubmit: (data: CreatePopupData) => Promise<void>;
}

const PopupForm: React.FC<PopupFormProps> = ({ popup, onCancel, onSubmit }) => {
  const [specificPagesInput, setSpecificPagesInput] = useState('');
  const [excludePagesInput, setExcludePagesInput] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      title: '',
      message: '',
      ctaText: '',
      ctaLink: '',
      dismissText: 'Close',
      targetAudience: 'all' as const,
      targetRoles: [] as string[],
      targetPages: 'all' as const,
      specificPages: [] as string[],
      excludePages: [] as string[],
      trigger: 'timeDelay' as const,
      triggerValue: 3,
      frequency: 'once' as const,
      displayOrder: 0,
      status: 'inactive' as const,
      startDate: undefined,
      endDate: undefined,
      isActive: true,
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      overlayOpacity: 50,
      position: 'center' as const,
      size: 'medium' as const
    }
  });

  useEffect(() => {
    if (popup) {
      reset({
        title: popup.title,
        message: popup.message,
        ctaText: popup.ctaText || '',
        ctaLink: popup.ctaLink || '',
        dismissText: popup.dismissText || 'Close',
        targetAudience: popup.targetAudience,
        targetRoles: popup.targetRoles || [],
        targetPages: popup.targetPages,
        specificPages: popup.specificPages || [],
        excludePages: popup.excludePages || [],
        trigger: popup.trigger,
        triggerValue: popup.triggerValue,
        frequency: popup.frequency,
        displayOrder: popup.displayOrder,
        status: popup.status,
        startDate: popup.startDate ? new Date(popup.startDate) as any : undefined,
        endDate: popup.endDate ? new Date(popup.endDate) as any : undefined,
        isActive: popup.isActive,
        backgroundColor: popup.backgroundColor || '#FFFFFF',
        textColor: popup.textColor || '#000000',
        overlayOpacity: popup.overlayOpacity || 50,
        position: popup.position || 'center',
        size: popup.size || 'medium'
      });
      setSpecificPagesInput(popup.specificPages?.join(', ') || '');
      setExcludePagesInput(popup.excludePages?.join(', ') || '');
    }
  }, [popup, reset]);

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save popup');
    }
  };

  const watchedStatus = watch('status');
  const watchedTargetPages = watch('targetPages');
  const watchedTrigger = watch('trigger');
  const watchedTargetAudience = watch('targetAudience');

  const handleSpecificPagesChange = (value: string) => {
    setSpecificPagesInput(value);
    const pages = value.split(',').map(p => p.trim()).filter(p => p.length > 0);
    setValue('specificPages', pages);
  };

  const handleExcludePagesChange = (value: string) => {
    setExcludePagesInput(value);
    const pages = value.split(',').map(p => p.trim()).filter(p => p.length > 0);
    setValue('excludePages', pages);
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title={popup ? 'Edit Popup' : 'Create Popup'} size="xl">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <Controller
                name="title"
                control={control}
                rules={{ required: 'Title is required', maxLength: 100 }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Limited Time Offer!"
                    error={errors.title?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <Controller
                name="message"
                control={control}
                rules={{ required: 'Message is required', maxLength: 500 }}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={4}
                    placeholder="Get 20% off your first booking!"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
                <Controller
                  name="ctaText"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="Shop Now" />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CTA Link</label>
                <Controller
                  name="ctaLink"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="/events" />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Targeting */}
        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audience *</label>
              <Controller
                name="targetAudience"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-4">
                    {(['all', 'authenticated', 'anonymous'] as const).map((audience) => (
                      <label key={audience} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={field.value === audience}
                          onChange={() => field.onChange(audience)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="capitalize">{audience}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>

            {watchedTargetAudience === 'authenticated' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles (optional)</label>
                <Controller
                  name="targetRoles"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-4">
                      {['admin', 'vendor', 'customer', 'employee'].map((role) => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value.includes(role)}
                            onChange={(e) => {
                              const newRoles = e.target.checked
                                ? [...field.value, role]
                                : field.value.filter(r => r !== role);
                              field.onChange(newRoles);
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  )}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pages *</label>
              <Controller
                name="targetPages"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={field.value === 'all'}
                        onChange={() => field.onChange('all')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>All Pages</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={field.value === 'specific'}
                        onChange={() => field.onChange('specific')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>Specific Pages</span>
                    </label>
                  </div>
                )}
              />
            </div>

            {watchedTargetPages === 'specific' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specific Pages</label>
                <input
                  type="text"
                  value={specificPagesInput}
                  onChange={(e) => handleSpecificPagesChange(e.target.value)}
                  placeholder="/events, /search, /admin/*"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trigger & Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger & Frequency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trigger *</label>
                <Controller
                  name="trigger"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="pageLoad">Page Load</option>
                      <option value="timeDelay">Time Delay</option>
                      <option value="scrollPercent">Scroll Percent</option>
                      <option value="exitIntent">Exit Intent</option>
                    </select>
                  )}
                />
              </div>

              {(watchedTrigger === 'timeDelay' || watchedTrigger === 'scrollPercent') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {watchedTrigger === 'timeDelay' ? 'Seconds' : 'Percent'}
                  </label>
                  <Controller
                    name="triggerValue"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    )}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <select {...field} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="once">Once (Forever)</option>
                    <option value="session">Per Session</option>
                    <option value="daily">Daily</option>
                    <option value="always">Always Show</option>
                  </select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <Controller
                  name="size"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <Controller
                  name="backgroundColor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      <input type="color" {...field} className="h-10 w-20 rounded cursor-pointer" />
                      <Input {...field} />
                    </div>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                <Controller
                  name="textColor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      <input type="color" {...field} className="h-10 w-20 rounded cursor-pointer" />
                      <Input {...field} />
                    </div>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : popup ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PopupForm;
