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
import MediaPickerModal from './media/MediaPickerModal';
import SEOEditor from '../seo/SEOEditor';
import { config } from '../../config';

// Validation schema
const collectionSchema = yup.object().shape({
  title: yup.string()
    .required('Title is required')
    .max(100, 'Title cannot exceed 100 characters'),
  description: yup.string()
    .required('Description is required')
    .max(500, 'Description cannot exceed 500 characters'),
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

  // MediaAsset states
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showFeaturedImagePicker, setShowFeaturedImagePicker] = useState(false);
  const [selectedIconAsset, setSelectedIconAsset] = useState<any | null>(null);
  const [selectedFeaturedImageAsset, setSelectedFeaturedImageAsset] = useState<any | null>(null);

  // SEO data for SEOEditor
  const [seoData, setSeoData] = useState({
    title: '',
    description: '',
    keywords: [] as string[],
    canonicalUrl: ''
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(collectionSchema),
    defaultValues: {
      title: '',
      description: '',
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

  // Load events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await adminAPI.getAllEvents({ limit: 100, status: 'published'});
        setEvents(response.events || []);
        console.log(response.events);
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
      setSeoData({
        title: collection.seo?.metaTitle || '',
        description: collection.seo?.metaDescription || '',
        keywords: collection.seo?.metaKeywords || [],
        canonicalUrl: collection.seo?.canonicalUrl || ''
      });

      // Initialize icon asset preview
      if (collection.iconAsset && typeof collection.iconAsset === 'object') {
        setSelectedIconAsset(collection.iconAsset);
      } else {
        setSelectedIconAsset(null);
      }

      // Initialize featured image asset preview
      if (collection.featuredImageAsset && typeof collection.featuredImageAsset === 'object') {
        setSelectedFeaturedImageAsset(collection.featuredImageAsset);
      } else {
        setSelectedFeaturedImageAsset(null);
      }
    } else {
      reset({
        title: '',
        description: '',
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
      setSeoData({
        title: '',
        description: '',
        keywords: [],
        canonicalUrl: ''
      });
      setSelectedIconAsset(null);
      setSelectedFeaturedImageAsset(null);
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


  // Handle SEO data change from SEOEditor
  const handleSeoDataChange = (newSeoData: any) => {
    setSeoData(newSeoData);
    // Sync with form values
    setValue('metaTitle', newSeoData.title || '');
    setValue('metaDescription', newSeoData.description || '');
    setValue('canonicalUrl', newSeoData.canonicalUrl || '');
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
      // Validate icon selection - only require for new collections or if they removed the existing icon
      if (!selectedIconAsset && !collection?.icon) {
        toast.error('Please select an icon');
        return;
      }

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
          metaTitle: seoData.title || data.metaTitle,
          metaDescription: seoData.description || data.metaDescription,
          metaKeywords: seoData.keywords,
          canonicalUrl: seoData.canonicalUrl || data.canonicalUrl
        }
      };

      console.log('Submitting collection with event IDs:', selectedEvents);

      // Send iconAsset changes explicitly
      if (selectedIconAsset) {
        formData.iconAsset = selectedIconAsset._id;
      } else if (collection && collection.iconAsset && !selectedIconAsset) {
        // Explicitly clear icon if it existed before and user removed it
        formData.iconAsset = null;
      }

      // Send featuredImageAsset changes explicitly
      if (selectedFeaturedImageAsset) {
        formData.featuredImageAsset = selectedFeaturedImageAsset._id;
      } else if (collection && collection.featuredImageAsset && !selectedFeaturedImageAsset) {
        // Explicitly clear featured image if it existed before and user removed it
        formData.featuredImageAsset = null;
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

              {selectedIconAsset ? (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                    <img
                      src={selectedIconAsset.variations?.thumbnail || selectedIconAsset.url}
                      alt="Icon"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedIconAsset.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedIconAsset.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIconAsset(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIconPicker(true)}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select from Media Library
                </Button>
              )}
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image (Optional)
              </label>

              {selectedFeaturedImageAsset ? (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md">
                  <div className="w-20 h-16 rounded overflow-hidden border-2 border-gray-200 flex-shrink-0">
                    <img
                      src={selectedFeaturedImageAsset.variations?.thumbnail || selectedFeaturedImageAsset.url}
                      alt="Featured"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedFeaturedImageAsset.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFeaturedImageAsset.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFeaturedImageAsset(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFeaturedImagePicker(true)}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select from Media Library
                </Button>
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
                  <div className="divide-y divide-gray-100">
                    {filteredEvents.map((event) => {
                      const eventId = event._id || event.id;
                      return (
                        <div
                          key={eventId}
                          className="p-3 flex items-center hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                          onClick={() => handleEventToggle(eventId)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEvents.includes(eventId)}
                            onChange={() => handleEventToggle(eventId)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />

                        {/* Event thumbnail */}
                        {event.images && event.images[0] && (
                          <div className="ml-3 w-12 h-12 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                            <img
                              src={event.images[0]}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Type Badge */}
                            {event.type && (
                              <Badge variant="secondary" className="text-xs">
                                {event.type}
                              </Badge>
                            )}

                            {/* Category */}
                            {event.category && (
                              <span className="text-xs text-gray-500">{event.category}</span>
                            )}

                            {/* Price */}
                            {event.price !== undefined && event.currency && (
                              <span className="text-xs font-medium text-green-600">
                                {event.currency} {event.price}
                              </span>
                            )}

                            {/* Vendor name */}
                            {event.vendorId && (
                              <span className="text-xs text-gray-500">
                                by {event.vendorId.firstName || event.vendorId.businessName}
                              </span>
                            )}

                            {/* Approval Status */}
                            {event.isApproved ? (
                              <Badge variant="success" className="text-xs">Approved</Badge>
                            ) : (
                              <Badge variant="warning" className="text-xs">Pending</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <SEOEditor
              initialData={{
                title: seoData.title,
                description: seoData.description,
                keywords: seoData.keywords,
                canonicalUrl: seoData.canonicalUrl
              }}
              contentData={{
                title: watch('title') || '',
                description: watch('description') || '',
                category: watch('category') || '',
                type: 'collection'
              }}
              onChange={handleSeoDataChange}
              baseUrl={config.appUrl}
              path={`/collections/${watch('slug') || 'new-collection'}`}
              disabled={isSubmitting}
            />
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

      {/* Media Picker Modals */}
      <MediaPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(assets) => {
          if (assets.length > 0) {
            setSelectedIconAsset(assets[0]);
          }
          setShowIconPicker(false);
        }}
        category="misc"
        folder="collections.icons"
        multiple={false}
        title="Select Collection Icon"
      />

      <MediaPickerModal
        isOpen={showFeaturedImagePicker}
        onClose={() => setShowFeaturedImagePicker(false)}
        onSelect={(assets) => {
          if (assets.length > 0) {
            setSelectedFeaturedImageAsset(assets[0]);
          }
          setShowFeaturedImagePicker(false);
        }}
        category="misc"
        folder="collections.featured"
        multiple={false}
        title="Select Featured Image"
      />
    </Modal>
  );
};

export default CollectionForm;
