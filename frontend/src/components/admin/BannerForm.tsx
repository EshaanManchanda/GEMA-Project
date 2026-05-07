import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { Save, X, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import MediaPickerModal from './media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import { Banner } from '../../services/api/bannerAPI';

const bannerSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: yup.string().max(500, 'Description cannot exceed 500 characters').optional(),
  imageAsset: yup.string().required('Banner image is required'),
  link: yup.string()
    .transform((value) => value === '' ? undefined : value)
    .test('is-url-or-path', 'Must be a valid URL or path', function (value) {
      if (!value) return true;
      return /^https?:\/\//.test(value) || /^\//.test(value);
    })
    .optional(),
  ctaText: yup.string().max(50, 'CTA text cannot exceed 50 characters').optional(),
  ctaLink: yup.string()
    .transform((value) => value === '' ? undefined : value)
    .test('is-url-or-path', 'Must be a valid URL or path', function (value) {
      if (!value) return true;
      return /^https?:\/\//.test(value) || /^\//.test(value);
    })
    .optional(),
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
  isActive: yup.boolean().optional(),
  titleVisible: yup.boolean().optional(),
  descriptionVisible: yup.boolean().optional(),
  ctaVisible: yup.boolean().optional(),
  objectFit: yup.string().oneOf(['cover', 'contain', 'fill']).optional(),
  objectPosition: yup.string().optional()
});

interface BannerFormProps {
  banner?: Banner | null;
  onClose: () => void;
  onSubmit: (data: Partial<Banner>) => Promise<void>;
}

const BannerForm: React.FC<BannerFormProps> = ({ banner, onClose, onSubmit }) => {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedImageAsset, setSelectedImageAsset] = useState<MediaAsset | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(bannerSchema),
    defaultValues: {
      title: '',
      description: '',
      imageAsset: '',
      link: '',
      ctaText: '',
      ctaLink: '',
      displayOrder: 0,
      status: 'inactive',
      startDate: null,
      endDate: null,
      isActive: true,
      titleVisible: false,
      descriptionVisible: false,
      ctaVisible: false,
      objectFit: 'cover' as const,
      objectPosition: 'center'
    }
  });

  useEffect(() => {
    if (banner) {
      reset({
        title: banner.title,
        description: banner.description || '',
        imageAsset: banner.imageAsset?._id || '',
        link: banner.link || '',
        ctaText: banner.ctaText || '',
        ctaLink: banner.ctaLink || '',
        displayOrder: banner.displayOrder,
        status: banner.status,
        startDate: banner.startDate ? new Date(banner.startDate) : null,
        endDate: banner.endDate ? new Date(banner.endDate) : null,
        isActive: banner.isActive,
        titleVisible: banner.titleVisible ?? false,
        descriptionVisible: banner.descriptionVisible ?? false,
        ctaVisible: banner.ctaVisible ?? false,
        objectFit: banner.objectFit || 'cover',
        objectPosition: banner.objectPosition || 'center'
      });

      if (banner.imageAsset) {
        setSelectedImageAsset(banner.imageAsset as any);
      }
    } else {
      reset({
        title: '',
        description: '',
        imageAsset: '',
        link: '',
        ctaText: '',
        ctaLink: '',
        displayOrder: 0,
        status: 'inactive',
        startDate: null,
        endDate: null,
        isActive: true,
        titleVisible: false,
        descriptionVisible: false,
        ctaVisible: false,
        objectFit: 'cover' as const,
        objectPosition: 'center'
      });
      setSelectedImageAsset(null);
    }
  }, [banner, reset]);

  const handleImageSelect = (assets: MediaAsset[]) => {
    if (assets.length > 0) {
      setSelectedImageAsset(assets[0]);
      setValue('imageAsset', assets[0]._id);
      setShowMediaPicker(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save banner');
    }
  };

  const watchedStatus = watch('status');

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={banner ? 'Edit Banner' : 'Create Banner'} size="lg">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Banner Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter banner title"
                      error={errors.title?.message}
                    />
                  )}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      placeholder="Enter banner description"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Banner Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {selectedImageAsset && (
                    <div className="relative w-full h-48 border border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={selectedImageAsset.url}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageAsset(null);
                          setValue('imageAsset', '');
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {selectedImageAsset ? 'Change Image' : 'Select Image'}
                  </Button>
                </div>
                {errors.imageAsset && (
                  <p className="text-red-500 text-sm mt-1">{errors.imageAsset.message}</p>
                )}
              </div>

              {/* Banner Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Link (URL or path)
                </label>
                <Controller
                  name="link"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="https://example.com or /events"
                      error={errors.link?.message}
                    />
                  )}
                />
              </div>

              {/* CTA Button */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CTA Button Text
                  </label>
                  <Controller
                    name="ctaText"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Book Now"
                        error={errors.ctaText?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CTA Button Link
                  </label>
                  <Controller
                    name="ctaLink"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="https://example.com"
                        error={errors.ctaLink?.message}
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="displayOrder"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        placeholder="0"
                        error={errors.displayOrder?.message}
                      />
                    )}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers display first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    )}
                  />
                </div>
              </div>

              {/* Scheduling */}
              {(watchedStatus === 'scheduled' || watchedStatus === 'active') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="datetime-local"
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="datetime-local"
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          error={errors.endDate?.message}
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Active (Quick toggle)
                      </span>
                    </label>
                  )}
                />
              </div>

              {/* Title Visible Toggle */}
              <div className="flex flex-col">
                <Controller
                  name="titleVisible"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Show Title on Banner
                      </span>
                    </label>
                  )}
                />
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Display the banner title text overlay
                </p>
              </div>

              {/* Description Visible Toggle */}
              <div className="flex flex-col">
                <Controller
                  name="descriptionVisible"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Show Description on Banner
                      </span>
                    </label>
                  )}
                />
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Display the banner description text overlay
                </p>
              </div>

              {/* CTA Button Visible Toggle */}
              <div className="flex flex-col">
                <Controller
                  name="ctaVisible"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Show CTA Button on Banner
                      </span>
                    </label>
                  )}
                />
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Display the call-to-action button overlay
                </p>
              </div>

              {/* Image Fit & Position */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Image Fit & Focal Point</p>
                <p className="text-xs text-gray-500 mb-3">
                  Recommended image size: <strong>1920 × 600 px</strong> (landscape). Use focal
                  point to keep the important area visible on mobile.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image Fit
                    </label>
                    <Controller
                      name="objectFit"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                            focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="cover">Cover (fills area, may crop)</option>
                          <option value="contain">Contain (no crop, letterbox)</option>
                          <option value="fill">Fill (stretch)</option>
                        </select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Focal Point
                    </label>
                    <Controller
                      name="objectPosition"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                            focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="center">Center</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="left center">Left</option>
                          <option value="right center">Right</option>
                          <option value="top left">Top Left</option>
                          <option value="top right">Top Right</option>
                          <option value="bottom left">Bottom Left</option>
                          <option value="bottom right">Bottom Right</option>
                        </select>
                      )}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sets which part of the image stays visible when cropped on smaller screens
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {banner ? 'Update Banner' : 'Create Banner'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleImageSelect}
          multiple={false}
        />
      )}
    </>
  );
};

export default BannerForm;
