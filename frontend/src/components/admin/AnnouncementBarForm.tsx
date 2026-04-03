import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { Save, X } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { AnnouncementBar, CreateAnnouncementBarData } from '@/types/announcementBar';
import logger from '@/utils/logger';

const announcementSchema = yup.object().shape({
  message: yup.string().required('Message is required').min(1).max(200, 'Message cannot exceed 200 characters'),
  link: yup.string()
    .transform((value) => value === '' ? undefined : value)
    .test('is-url-or-path', 'Must be a valid URL or path', function (value) {
      if (!value) return true;
      return /^https?:\/\//.test(value) || /^\//.test(value);
    })
    .optional(),
  linkText: yup.string().max(30, 'Link text cannot exceed 30 characters').optional(),
  icon: yup.string().max(50, 'Icon cannot exceed 50 characters').optional(),
  backgroundColor: yup.string()
    .matches(/^#[0-9A-F]{6}$/i, 'Background color must be a valid hex color (#RRGGBB)')
    .required('Background color is required'),
  textColor: yup.string()
    .matches(/^#[0-9A-F]{6}$/i, 'Text color must be a valid hex color (#RRGGBB)')
    .required('Text color is required'),
  variant: yup.string().oneOf(['info', 'warning', 'success', 'error']).required('Variant is required'),
  displayOrder: yup.number().min(0, 'Display order must be 0 or greater').required('Display order is required'),
  status: yup.string().oneOf(['active', 'inactive', 'scheduled']).required('Status is required'),
  startDate: yup.date().nullable().optional(),
  endDate: yup.date()
    .nullable()
    .optional()
    .test('is-after-start', 'End date must be after start date', function (value) {
      const { startDate } = this.parent;
      if (!value || !startDate) return true;
      return new Date(value) > new Date(startDate);
    }),
  isActive: yup.boolean().required(),
  targetPages: yup.string().oneOf(['all', 'specific']).required('Target pages is required'),
  specificPages: yup.array().of(yup.string()).optional(),
  excludePages: yup.array().of(yup.string()).optional(),
  isDismissible: yup.boolean().required(),
  dismissalDuration: yup.number().min(0).nullable().optional()
});

interface AnnouncementBarFormProps {
  announcement?: AnnouncementBar | null;
  onCancel: () => void;
  onSubmit: (data: CreateAnnouncementBarData) => Promise<void>;
}

const AnnouncementBarForm: React.FC<AnnouncementBarFormProps> = ({ announcement, onCancel, onSubmit }) => {
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
    resolver: yupResolver(announcementSchema),
    defaultValues: {
      message: '',
      link: '',
      linkText: '',
      icon: '',
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      variant: 'info' as const,
      displayOrder: 0,
      status: 'inactive' as const,
      startDate: null,
      endDate: null,
      isActive: true,
      targetPages: 'all' as const,
      specificPages: [],
      excludePages: [],
      isDismissible: true,
      dismissalDuration: null
    }
  });

  useEffect(() => {
    if (announcement) {
      reset({
        message: announcement.message,
        link: announcement.link || '',
        linkText: announcement.linkText || '',
        icon: announcement.icon || '',
        backgroundColor: announcement.backgroundColor,
        textColor: announcement.textColor,
        variant: announcement.variant,
        displayOrder: announcement.displayOrder,
        status: announcement.status,
        startDate: announcement.startDate ? new Date(announcement.startDate) : null,
        endDate: announcement.endDate ? new Date(announcement.endDate) : null,
        isActive: announcement.isActive,
        targetPages: announcement.targetPages,
        specificPages: announcement.specificPages || [],
        excludePages: announcement.excludePages || [],
        isDismissible: announcement.isDismissible,
        dismissalDuration: announcement.dismissalDuration ?? null
      });
      setSpecificPagesInput(announcement.specificPages?.join(', ') || '');
      setExcludePagesInput(announcement.excludePages?.join(', ') || '');
    }
  }, [announcement, reset]);

  const handleFormSubmit = async (data: any) => {
    try {
      logger.info('[AnnouncementBarForm] Submitting data', {
        status: data.status,
        isActive: data.isActive
      });
      await onSubmit(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save announcement');
    }
  };

  const watchedStatus = watch('status');
  const watchedTargetPages = watch('targetPages');

  // Debug: Log status changes
  useEffect(() => {
    logger.debug('[AnnouncementBarForm] Status changed', { status: watchedStatus });
  }, [watchedStatus]);

  const applyVariantPreset = (variant: string) => {
    const presets: Record<string, { bg: string; text: string }> = {
      info: { bg: '#3B82F6', text: '#FFFFFF' },
      warning: { bg: '#F59E0B', text: '#FFFFFF' },
      success: { bg: '#10B981', text: '#FFFFFF' },
      error: { bg: '#EF4444', text: '#FFFFFF' }
    };

    const preset = presets[variant];
    if (preset) {
      setValue('backgroundColor', preset.bg);
      setValue('textColor', preset.text);
    }
  };

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
    <Modal isOpen={true} onClose={onCancel} title={announcement ? 'Edit Announcement' : 'Create Announcement'} size="xl">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Content Section */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <Controller
                name="message"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter announcement message (max 200 characters)"
                    error={errors.message?.message}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link</label>
                <Controller
                  name="link"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="/events or https://example.com"
                      error={errors.link?.message}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link Text</label>
                <Controller
                  name="linkText"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Learn More"
                      error={errors.linkText?.message}
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon (emoji or lucide name)</label>
              <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="🎉 or info-circle"
                    error={errors.icon?.message}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Styling Section */}
        <Card>
          <CardHeader>
            <CardTitle>Styling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Variant Preset</label>
              <Controller
                name="variant"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {(['info', 'warning', 'success', 'error'] as const).map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => {
                          field.onChange(variant);
                          applyVariantPreset(variant);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${field.value === variant
                            ? 'ring-2 ring-blue-500'
                            : 'border border-gray-300'
                          }`}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <Controller
                  name="backgroundColor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        {...field}
                        className="h-10 w-20 rounded cursor-pointer"
                      />
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="#3B82F6"
                        error={errors.backgroundColor?.message}
                      />
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
                      <input
                        type="color"
                        {...field}
                        className="h-10 w-20 rounded cursor-pointer"
                      />
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="#FFFFFF"
                        error={errors.textColor?.message}
                      />
                    </div>
                  )}
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                <Controller
                  name="displayOrder"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      error={errors.displayOrder?.message}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-xs text-blue-600 font-bold bg-yellow-100 px-2 py-1 rounded">Current: {watchedStatus}</span>
                </label>
                <select
                  value={watchedStatus}
                  onChange={(e) => {
                    setValue('status', e.target.value as 'active' | 'inactive' | 'scheduled');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                {errors.status && (
                  <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                )}
              </div>

              <div className="flex items-center pt-8">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Is Active</span>
                    </label>
                  )}
                />
              </div>
            </div>

            {(watchedStatus === 'scheduled' || watchedStatus === 'active') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="datetime-local"
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="datetime-local"
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                  {errors.endDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Page Targeting */}
        <Card>
          <CardHeader>
            <CardTitle>Page Targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Pages</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Pages (comma-separated, supports wildcards)
                </label>
                <input
                  type="text"
                  value={specificPagesInput}
                  onChange={(e) => handleSpecificPagesChange(e.target.value)}
                  placeholder="/events, /search, /admin/*"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Example: /events, /events/*, /admin/events</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exclude Pages (comma-separated)
              </label>
              <input
                type="text"
                value={excludePagesInput}
                onChange={(e) => handleExcludePagesChange(e.target.value)}
                placeholder="/checkout, /payment-success"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dismissal Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Dismissal Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Controller
                name="isDismissible"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow users to dismiss</span>
                  </label>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dismissal Duration (days, 0 = session only, empty = forever)
              </label>
              <Controller
                name="dismissalDuration"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                    placeholder="Leave empty for forever, 0 for session only"
                    error={errors.dismissalDuration?.message}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : announcement ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AnnouncementBarForm;
