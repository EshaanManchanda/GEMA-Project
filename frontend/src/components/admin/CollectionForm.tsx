import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  Save,
  X,
  Image as ImageIcon,
  FileImage,
  Calendar,
  Tag,
  Search,
  Upload,
  Eye,
  Trash2
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { Collection, CollectionFormData } from '../../services/api/collectionsAPI';
import adminAPI from '../../services/api/adminAPI';

// Validation schema
const collectionSchema = yup.object().shape({
  title: yup.string()
    .required('Title is required')
    .max(100, 'Title cannot exceed 100 characters'),
  description: yup.string()
    .required('Description is required')
    .max(500, 'Description cannot exceed 500 characters'),
  icon: yup.string()
    .when(['$iconFile'], {
      is: (iconFile: any) => !iconFile,
      then: (schema) => schema.required('Icon URL or file is required'),
      otherwise: (schema) => schema
    }),
  featuredImage: yup.string().optional(),
  count: yup.string()
    .max(50, 'Count text cannot exceed 50 characters'),
  category: yup.string()
    .max(50, 'Category cannot exceed 50 characters'),
  sortOrder: yup.number()
    .min(0, 'Sort order cannot be negative')
    .integer('Sort order must be a whole number'),
  isActive: yup.boolean().optional(),
  slug: yup.string()
    .matches(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  metaTitle: yup.string()
    .max(70, 'Meta title cannot exceed 70 characters')
    .optional(),
  metaDescription: yup.string()
    .max(160, 'Meta description cannot exceed 160 characters')
    .optional(),
  canonicalUrl: yup.string()
    .transform((value) => value === '' ? undefined : value)
    .test('is-url', 'Must be a valid URL', function(value) {
      if (!value) return true; // Optional field
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .optional(),
});

interface CollectionFormProps {
  collection?: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CollectionFormData) => Promise<void>;
  loading?: boolean;
}

const CollectionForm: React.FC<CollectionFormProps> = ({
  collection,
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'events' | 'seo'>('basic');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  // Image preview states
  const [iconPreview, setIconPreview] = useState<string>('');
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);

  // Image mode (url or file)
  const [iconMode, setIconMode] = useState<'url' | 'file'>('url');
  const [featuredImageMode, setFeaturedImageMode] = useState<'url' | 'file'>('url');

  // SEO keywords array
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(collectionSchema),
    context: { iconFile },
    defaultValues: {
      title: '',
      description: '',
      icon: '',
      featuredImage: '',
      count: '',
      category: '',
      sortOrder: 0,
      isActive: true,
      slug: '',
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: ''
    }
  });

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedIcon = watch('icon');
  const watchedFeaturedImage = watch('featuredImage');

  // Load events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await adminAPI.getAllEvents({ limit: 1000, isApproved: true });
        setEvents(response.data?.events || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setEventsLoading(false);
      }
    };

    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // Reset form when collection changes
  useEffect(() => {
    if (collection) {
      reset({
        title: collection.title || '',
        description: collection.description || '',
        icon: collection.icon || '',
        featuredImage: collection.featuredImage || '',
        count: collection.count || '',
        category: collection.category || '',
        sortOrder: collection.sortOrder || 0,
        isActive: collection.isActive !== undefined ? collection.isActive : true,
        slug: collection.slug || '',
        metaTitle: collection.seo?.metaTitle || '',
        metaDescription: collection.seo?.metaDescription || '',
        canonicalUrl: collection.seo?.canonicalUrl || ''
      });
      setSelectedEvents(collection.events?.map((e: any) => e._id || e) || []);
      setSeoKeywords(collection.seo?.metaKeywords || []);
      setIconPreview(collection.icon || '');
      setFeaturedImagePreview(collection.featuredImage || '');
      setIconFile(null);
      setFeaturedImageFile(null);
    } else {
      reset({
        title: '',
        description: '',
        icon: '',
        featuredImage: '',
        count: '',
        category: '',
        sortOrder: 0,
        isActive: true,
        slug: '',
        metaTitle: '',
        metaDescription: '',
        canonicalUrl: ''
      });
      setSelectedEvents([]);
      setSeoKeywords([]);
      setIconPreview('');
      setFeaturedImagePreview('');
      setIconFile(null);
      setFeaturedImageFile(null);
    }
  }, [collection, reset]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!collection && watchedTitle) {
      const generatedSlug = watchedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', generatedSlug);
    }
  }, [watchedTitle, collection, setValue]);

  // Auto-populate SEO fields
  useEffect(() => {
    if (!collection && watchedTitle) {
      const currentMetaTitle = watch('metaTitle');
      if (!currentMetaTitle) {
        setValue('metaTitle', watchedTitle.length > 70 ? `${watchedTitle.substring(0, 67)}...` : watchedTitle);
      }
    }
  }, [watchedTitle, collection, setValue, watch]);

  useEffect(() => {
    if (!collection && watchedDescription) {
      const currentMetaDescription = watch('metaDescription');
      if (!currentMetaDescription) {
        setValue('metaDescription', watchedDescription.length > 160 ? `${watchedDescription.substring(0, 157)}...` : watchedDescription);
      }
    }
  }, [watchedDescription, collection, setValue, watch]);

  // Handle icon file change
  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle featured image file change
  const handleFeaturedImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle icon URL change
  useEffect(() => {
    if (iconMode === 'url' && watchedIcon) {
      setIconPreview(watchedIcon);
    }
  }, [watchedIcon, iconMode]);

  // Handle featured image URL change
  useEffect(() => {
    if (featuredImageMode === 'url' && watchedFeaturedImage) {
      setFeaturedImagePreview(watchedFeaturedImage);
    }
  }, [watchedFeaturedImage, featuredImageMode]);

  // Handle keyword add
  const handleAddKeyword = () => {
    if (keywordInput.trim() && seoKeywords.length < 10) {
      setSeoKeywords([...seoKeywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  // Handle keyword remove
  const handleRemoveKeyword = (index: number) => {
    setSeoKeywords(seoKeywords.filter((_, i) => i !== index));
  };

  // Filter events
  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  // Handle event toggle
  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  // Handle form submit
  const handleFormSubmit = async (data: any) => {
    try {
      const formData: CollectionFormData = {
        title: data.title,
        description: data.description,
        count: data.count || `${selectedEvents.length}+ activities`,
        category: data.category,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        slug: data.slug,
        events: selectedEvents,
        seo: {
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          metaKeywords: seoKeywords,
          canonicalUrl: data.canonicalUrl
        }
      };

      // Handle icon
      if (iconMode === 'file' && iconFile) {
        formData.iconFile = iconFile;
      } else if (iconMode === 'url' && data.icon) {
        formData.icon = data.icon;
      }

      // Handle featured image
      if (featuredImageMode === 'file' && featuredImageFile) {
        formData.featuredImageFile = featuredImageFile;
      } else if (featuredImageMode === 'url' && data.featuredImage) {
        formData.featuredImage = data.featuredImage;
      }

      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to save collection');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={collection ? 'Edit Collection' : 'Create Collection'} size="large">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'basic'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'events'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Events ({selectedEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'seo'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            SEO
          </button>
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g., Summer Camps"
                    error={errors.title?.message}
                  />
                )}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={3}
                    placeholder="Brief description of this collection"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setIconMode('url')}
                  className={`px-3 py-1 rounded text-sm ${
                    iconMode === 'url' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setIconMode('file')}
                  className={`px-3 py-1 rounded text-sm ${
                    iconMode === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Upload File
                </button>
              </div>

              {iconMode === 'url' ? (
                <Controller
                  name="icon"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="https://example.com/icon.png"
                      error={errors.icon?.message}
                    />
                  )}
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}

              {/* Icon Preview */}
              {iconPreview && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                    <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setFeaturedImageMode('url')}
                  className={`px-3 py-1 rounded text-sm ${
                    featuredImageMode === 'url' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedImageMode('file')}
                  className={`px-3 py-1 rounded text-sm ${
                    featuredImageMode === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Upload File
                </button>
              </div>

              {featuredImageMode === 'url' ? (
                <Controller
                  name="featuredImage"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="https://example.com/featured-image.png"
                    />
                  )}
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFeaturedImageFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}

              {/* Featured Image Preview */}
              {featuredImagePreview && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="w-32 h-20 rounded overflow-hidden border border-gray-200">
                    <img src={featuredImagePreview} alt="Featured image preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Count, Category, Sort Order in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Count Display
                </label>
                <Controller
                  name="count"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., 45+ activities"
                    />
                  )}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to auto-generate from events
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Education"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <Controller
                  name="sortOrder"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      placeholder="0"
                      error={errors.sortOrder?.message}
                    />
                  )}
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug
              </label>
              <Controller
                name="slug"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="summer-camps"
                    error={errors.slug?.message}
                  />
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-generated from title. Use lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                )}
              />
              <label className="ml-2 block text-sm text-gray-700">
                Active (visible to users)
              </label>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Events for This Collection
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Choose which events belong to this collection. Selected: {selectedEvents.length}
              </p>

              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Search events..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Events List */}
              <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                {eventsLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No events found</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <div
                        key={event._id}
                        className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleEventToggle(event._id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event._id)}
                          onChange={() => handleEventToggle(event._id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{event.title}</p>
                          {event.category && (
                            <p className="text-xs text-gray-500">{event.category}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Optimize this collection for search engines. Fields are auto-populated but can be customized.
            </p>

            {/* Meta Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Title (max 70 characters)
              </label>
              <Controller
                name="metaTitle"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Auto-generated from title"
                    maxLength={70}
                  />
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Characters: {watch('metaTitle')?.length || 0}/70
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description (max 160 characters)
              </label>
              <Controller
                name="metaDescription"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={3}
                    maxLength={160}
                    placeholder="Auto-generated from description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Characters: {watch('metaDescription')?.length || 0}/160
              </p>
            </div>

            {/* Meta Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Keywords (max 10)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Add keyword and press Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={seoKeywords.length >= 10}
                />
                <Button
                  type="button"
                  onClick={handleAddKeyword}
                  disabled={!keywordInput.trim() || seoKeywords.length >= 10}
                  variant="secondary"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {seoKeywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(index)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Keywords: {seoKeywords.length}/10
              </p>
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canonical URL (Optional)
              </label>
              <Controller
                name="canonicalUrl"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="https://example.com/collections/summer-camps"
                  />
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use the default collection URL
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || loading}
          >
            <X size={16} className="mr-1" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            loading={isSubmitting || loading}
          >
            <Save size={16} className="mr-1" />
            {collection ? 'Update Collection' : 'Create Collection'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CollectionForm;
