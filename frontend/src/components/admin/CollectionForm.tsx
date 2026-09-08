import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTag, FaCalendarAlt, FaChevronDown, FaTimes } from 'react-icons/fa';
import {
  Save,
  X,
  Search,
  Upload,
  Trash2
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { Collection, CollectionFormData } from '../../services/api/collectionsAPI';
import adminAPI from '../../services/api/adminAPI';
import MediaPickerModal from './media/MediaPickerModal';
import SEOEditor from '../seo/SEOEditor';
import { config } from '../../config';
import logger from '../../utils/logger';

// Validation schema
const collectionSchema = yup.object().shape({
  title: yup.string()
    .required('Title is required')
    .max(100, 'Title cannot exceed 100 characters'),
  description: yup.string()
    .required('Description is required')
    .max(500, 'Description cannot exceed 500 characters'),
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
    .test('is-url', 'Must be a valid URL', function (value) {
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

const toEventIdString = (value: any): string => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'object') {
    const candidate = value._id || value.id || value;
    if (candidate && typeof candidate.toString === 'function') {
      return candidate.toString().trim();
    }
  }

  if (typeof value.toString === 'function') {
    return value.toString().trim();
  }

  return '';
};

// ── Outschool-style Dropdown ─────────────────────────────────────────────────
interface OutschoolDropdownProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  children: React.ReactNode;
}
const OutschoolDropdown: React.FC<OutschoolDropdownProps> = ({
  label, icon, active, title, description, ctaLabel, onCtaClick, children
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all whitespace-nowrap select-none shadow-sm ${active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
      >
        {icon && <span className="text-sm">{icon}</span>}
        {label}
        <FaChevronDown className={`text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 w-72"
          >
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {description && <p className="text-sm text-gray-500 mt-1 leading-snug">{description}</p>}
            </div>
            <div className="px-5 pb-3 max-h-64 overflow-y-auto">
              {children}
            </div>
            {ctaLabel && (
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => { onCtaClick?.(); setOpen(false); }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-sm transition-colors"
                >
                  {ctaLabel}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActiveChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-xs font-medium">
    {label}
    <button type="button" onClick={onRemove} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-200 transition-colors">
      <FaTimes size={9} />
    </button>
  </span>
);

const CheckRow: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 py-2 cursor-pointer hover:text-indigo-700 group" onClick={(e) => { e.preventDefault(); onChange(); }}>
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'
      }`}>
      {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-white fill-current"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
    <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
  </label>
);

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
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 20;

  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [pendingCategory, setPendingCategory] = useState<string[]>([]);
  const [pendingType, setPendingType] = useState<string[]>([]);
  const [catSearch, setCatSearch] = useState('');

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach(e => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).map(c => ({ label: c, value: c })).sort((a, b) => a.label.localeCompare(b.label));
  }, [events]);

  const uniqueEventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(e => {
      if (e.type) types.add(e.type);
    });
    return Array.from(types).map(t => ({ label: t, value: t })).sort((a, b) => a.label.localeCompare(b.label));
  }, [events]);

  const currentCatLabel = useMemo(() => {
    if (!filterCategory.length) return 'Category';
    if (filterCategory.length === 1) return filterCategory[0];
    return `${filterCategory.length} Categories`;
  }, [filterCategory]);

  const currentTypeLabel = useMemo(() => {
    if (!filterType.length) return 'Event Type';
    if (filterType.length === 1) return filterType[0];
    return `${filterType.length} Types`;
  }, [filterType]);

  const togglePendingArray = useCallback((setState: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setState(prev => {
      if (!value) return [];
      if (prev.includes(value)) return prev.filter(v => v !== value);
      return [...prev, value];
    });
  }, []);

  const toggleFilterArray = useCallback((setState: React.Dispatch<React.SetStateAction<string[]>>, setPending: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setState(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      setPending(next);
      return next;
    });
  }, []);

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
        const response = await adminAPI.getEvents({ limit: 1000, status: 'published' });
        setEvents(response.events || []);
        if (import.meta.env.VITE_DEBUG === 'true') {
          logger.debug('Events loaded', { count: response.events?.length });
        }
      } catch (error) {
        logger.error('Error fetching events', error);
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
      const normalizedSelectedEvents = (collection.events || [])
        .map((e: any) => toEventIdString(e))
        .filter((id: string) => Boolean(id));

      reset({
        title: collection.title || '',
        description: collection.description || '',
        category: collection.category || '',
        sortOrder: collection.sortOrder || 0,
        isActive: collection.isActive !== undefined ? collection.isActive : true,
        slug: collection.slug || '',
        metaTitle: collection.seo?.metaTitle || '',
        metaDescription: collection.seo?.metaDescription || '',
        canonicalUrl: collection.seo?.canonicalUrl || ''
      });
      setSelectedEvents(normalizedSelectedEvents);
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
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(eventSearch.toLowerCase());
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes(event.category);
    const matchesType = filterType.length === 0 || filterType.includes(event.type);
    return matchesSearch && matchesCategory && matchesType;
  });

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [eventSearch, filterCategory, filterType]);

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  // Handle event toggle
  const handleEventToggle = (eventId: string) => {
    const normalizedEventId = toEventIdString(eventId);
    if (!normalizedEventId) return;

    setSelectedEvents(prev =>
      prev.includes(normalizedEventId)
        ? prev.filter(id => id !== normalizedEventId)
        : [...prev, normalizedEventId]
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

      logger.info('Submitting collection', { eventCount: selectedEvents.length });

      // Send iconAsset changes explicitly
      if (selectedIconAsset) {
        formData.iconAsset = selectedIconAsset._id;
      } else if (collection && collection.iconAsset && !selectedIconAsset) {
        // Explicitly clear icon if it existed before and user removed it
        formData.iconAsset = undefined;
      }

      // Send featuredImageAsset changes explicitly
      if (selectedFeaturedImageAsset) {
        formData.featuredImageAsset = selectedFeaturedImageAsset._id;
      } else if (collection && collection.featuredImageAsset && !selectedFeaturedImageAsset) {
        // Explicitly clear featured image if it existed before and user removed it
        formData.featuredImageAsset = undefined;
      }

      await onSubmit(formData);
      onClose();
    } catch (error) {
      logger.error('Error submitting form', error);
      toast.error('Failed to save collection');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={collection ? 'Edit Collection' : 'Create Collection'} size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'basic'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'events'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Events ({selectedEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'seo'
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

            {/* Category and Sort Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <OutschoolDropdown
                  label={currentCatLabel}
                  icon={<FaTag />}
                  active={filterCategory.length > 0}
                  title="Category"
                  ctaLabel="Apply"
                  onCtaClick={() => setFilterCategory(pendingCategory)}
                >
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-gray-50"
                    />
                  </div>
                  <div className="divide-y divide-gray-50">
                    {uniqueCategories
                      .filter(c => !catSearch || c.label.toLowerCase().includes(catSearch.toLowerCase()))
                      .map(cat => (
                        <CheckRow
                          key={cat.value}
                          label={cat.label}
                          checked={pendingCategory.includes(cat.value)}
                          onChange={() => togglePendingArray(setPendingCategory, cat.value)}
                        />
                      ))}
                  </div>
                </OutschoolDropdown>

                <OutschoolDropdown
                  label={currentTypeLabel}
                  icon={<FaCalendarAlt />}
                  active={filterType.length > 0}
                  title="Event Type"
                  ctaLabel="Apply"
                  onCtaClick={() => setFilterType(pendingType)}
                >
                  <div className="divide-y divide-gray-50">
                    {uniqueEventTypes.map(type => (
                      <CheckRow
                        key={type.value}
                        label={type.label}
                        checked={pendingType.includes(type.value)}
                        onChange={() => togglePendingArray(setPendingType, type.value)}
                      />
                    ))}
                  </div>
                </OutschoolDropdown>
                
                {(filterCategory.length > 0 || filterType.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCategory([]); setPendingCategory([]);
                      setFilterType([]); setPendingType([]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all ml-auto"
                  >
                    <FaTimes size={10} /> Clear Filters
                  </button>
                )}
              </div>
              
              {/* Active Chips */}
              {(filterCategory.length > 0 || filterType.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filterCategory.map(cat => (
                    <ActiveChip key={`cat-${cat}`} label={cat} onRemove={() => toggleFilterArray(setFilterCategory, setPendingCategory, cat)} />
                  ))}
                  {filterType.map(type => (
                    <ActiveChip key={`type-${type}`} label={type} onRemove={() => toggleFilterArray(setFilterType, setPendingType, type)} />
                  ))}
                </div>
              )}

              {/* Events List */}
              <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                {eventsLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading events...</div>
                ) : paginatedEvents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No events found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {paginatedEvents.map((event) => {
                      const eventId = toEventIdString(event._id || event.id);
                      if (!eventId) return null;

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
                            onClick={(e) => e.stopPropagation()}
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 px-2">
                  <div className="text-xs text-gray-500">
                    Showing {(currentPage - 1) * eventsPerPage + 1} to {Math.min(currentPage * eventsPerPage, filteredEvents.length)} of {filteredEvents.length} events
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-700 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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
                type: 'event' as 'event' | 'blog'
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
