import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaMapMarkerAlt, FaLink, FaImages } from 'react-icons/fa';
import adminAPI from '../../services/api/adminAPI';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';
import MediaPickerModal from './media/MediaPickerModal';
import { galleryAPI, reviewLinkAPI, type GalleryImage, type Gallery } from '../../services/api/reviewLinkAPI';

// Lazy load TipTapEditor (~200KB) - only loaded when modal opens
const TipTapEditor = lazy(() => import('../common/TipTapEditor'));
const TipTapEditorFallback = () => (
  <div className="border border-gray-300 rounded-lg p-4 min-h-[300px] bg-gray-50 animate-pulse">
    <div className="h-10 bg-gray-200 rounded mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);
import { MediaAsset } from '../../store/slices/mediaSlice';
import SEOEditor from '../seo/SEOEditor';
import { config } from '../../config';
import logger from '../../utils/logger';
import { getImageAlt } from '../../utils/imageAlt';

interface Vendor {
  id: string;
  fullName: string;
  email: string;
}

interface TimeSlotEntry {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  availableSeats: number;
  price?: number;
}

interface DateSchedule {
  _id?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  availableSeats: number;
  totalSeats?: number;
  price: number;
  /** Optional time slots per schedule — mirrors backend dateSchedule[].timeSlots */
  timeSlots?: TimeSlotEntry[];
}

interface EventData {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop' | 'Class' | 'Bootcamp' | 'Masterclass';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRange: [number, number];
  location: {
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  vendor: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  price: number;
  currency: string;
  isApproved: boolean;
  isFeatured: boolean;
  tags: string[];
  dateSchedule: DateSchedule[];
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs?: Array<{
    _id?: string;
    question: string;
    answer: string;
  }>;
  images: string[];
  imageAssets?: MediaAsset[];
  createdAt?: string;
  updatedAt?: string;
  // Educational fields — matches backend Event.ts syllabus schema
  syllabus?: Array<{
    title: string;
    description: string;
    duration?: string;
    lessons?: Array<{ title: string; duration?: string }>;
  }>;
  subject?: string;
  topic?: string;
  introVideo?: string;
  teacherId?: string | { _id: string; firstName: string; lastName: string; email: string };
}

interface EventEditModalProps {
  event: EventData;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const getMasonryCardClass = (idx: number): string => {
  const pattern = [
    'col-span-2 row-span-2 md:col-span-2',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
    'col-span-2 row-span-1 md:col-span-2',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
  ];

  return pattern[idx % pattern.length];
};

const EventEditModal: React.FC<EventEditModalProps> = ({ event, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<EventData>(event);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'schedule' | 'seo' | 'advanced' | 'gallery'>('basic');
  const [selectedImageAssets, setSelectedImageAssets] = useState<MediaAsset[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [seoData, setSeoData] = useState({
    title: '',
    description: '',
    keywords: [] as string[],
    canonicalUrl: ''
  });

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [galleryLayout, setGalleryLayout] = useState<'grid' | 'messy'>('grid');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);
  const [reviewLinkGenerating, setReviewLinkGenerating] = useState(false);
  const [generatedReviewLink, setGeneratedReviewLink] = useState<string>('');

  const handleSeoDataChange = useCallback((data: any) => {
    setSeoData(data);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData(event);
      // Initialize selected image assets
      if (event.imageAssets && event.imageAssets.length > 0) {
        setSelectedImageAssets(event.imageAssets as MediaAsset[]);
      } else {
        setSelectedImageAssets([]);
      }
      // Initialize SEO data
      setSeoData({
        title: event.seoMeta?.title || '',
        description: event.seoMeta?.description || '',
        keywords: event.seoMeta?.keywords || [],
        canonicalUrl: ''
      });
      fetchVendors();
      fetchTeachers();
      fetchCategories();
      fetchGallery();
    }
  }, [event, isOpen]);

  const fetchVendors = async () => {
    try {
      const response = await adminAPI.getAllUsers({ role: 'vendor', status: 'active' });
      const vendorsList = response.data?.users || [];
      setVendors(vendorsList.map((v: any) => ({
        id: v.id || v._id,
        fullName: `${v.firstName} ${v.lastName}`,
        email: v.email
      })));
    } catch (err: any) {
      logger.error('Error fetching vendors:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await adminAPI.getAllUsers({ role: 'teacher' });
      const teachersList = response.data?.users || [];
      setTeachers(teachersList.map((t: any) => ({
        id: t._id || t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email
      })));
    } catch (err: any) {
      logger.error('Error fetching teachers:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      // Same robustness check as in VendorEventsPage
      const categoriesList = Array.isArray(response) ? response : ((response as any).data || []);
      setCategories(categoriesList);
    } catch (err: any) {
      logger.error('Error fetching categories:', err);
    }
  };

  const fetchGallery = async () => {
    try {
      const res = await galleryAPI.getByEvent(formData.id);
      const g = res.data?.data?.gallery;
      if (g) {
        setGallery(g);
        setGalleryLayout(g.type);
        setGalleryImages(g.images || []);
      } else {
        setGallery(null);
        setGalleryLayout('grid');
        setGalleryImages([]);
      }
    } catch {
      setGallery(null);
      setGalleryImages([]);
    }
  };

  const handleSaveGallery = async () => {
    setGallerySaving(true);
    setGalleryError(null);
    try {
      if (gallery) {
        await galleryAPI.update(gallery._id, { type: galleryLayout, images: galleryImages });
      } else {
        const res = await galleryAPI.create({ eventId: formData.id, type: galleryLayout, images: galleryImages });
        setGallery(res.data?.data);
      }
    } catch (err: any) {
      setGalleryError(err?.response?.data?.message || 'Failed to save gallery');
    } finally {
      setGallerySaving(false);
    }
  };

  const handleGenerateReviewLink = async () => {
    setReviewLinkGenerating(true);
    try {
      const res = await reviewLinkAPI.generateLink(formData.id);
      const link = res.data?.data?.reviewLink || '';
      setGeneratedReviewLink(link);
    } catch (err: any) {
      logger.error('Failed to generate review link', err);
    } finally {
      setReviewLinkGenerating(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: string, value: any) => {
    if (field === 'lat' || field === 'lng') {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          coordinates: {
            ...prev.location.coordinates,
            [field]: parseFloat(value) || 0
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [field]: value
        }
      }));
    }
  };

  const handleTagsChange = (tags: string) => {
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setFormData(prev => ({ ...prev, tags: tagArray }));
  };

  const handleDateScheduleChange = (index: number, field: string, value: any) => {
    const newSchedule = [...formData.dateSchedule];
    newSchedule[index] = {
      ...newSchedule[index],
      [field]: field === 'availableSeats' || field === 'totalSeats' || field === 'price'
        ? parseFloat(value) || 0
        : value
    };
    setFormData(prev => ({ ...prev, dateSchedule: newSchedule }));
  };

  const addDateSchedule = () => {
    setFormData(prev => ({
      ...prev,
      dateSchedule: [
        ...prev.dateSchedule,
        {
          startDate: '',
          endDate: '',
          availableSeats: 0,
          totalSeats: 0,
          price: 0
        }
      ]
    }));
  };

  const removeDateSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dateSchedule: prev.dateSchedule.filter((_, i) => i !== index)
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...(formData.faqs || [])];
    newFaqs[index] = {
      ...newFaqs[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, faqs: newFaqs }));
  };

  const addFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }]
    }));
  };

  const removeFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Prepare update data
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription || undefined,
        category: formData.category,
        type: formData.type,
        venueType: formData.venueType,
        ageRange: formData.ageRange,
        location: formData.location,
        price: formData.price,
        currency: formData.currency,
        isApproved: formData.isApproved,
        isFeatured: formData.isFeatured,
        tags: formData.tags,
        dateSchedule: formData.dateSchedule,
        imageAssets: selectedImageAssets.map(a => a._id),  // Send MediaAsset IDs

        // Educational fields
        teacherId: typeof formData.teacherId === 'object' ? (formData.teacherId as any)._id : formData.teacherId,
        subject: formData.subject,
        topic: formData.topic,
        introVideo: formData.introVideo,
        syllabus: formData.syllabus,
      };

      // Add SEO data
      updateData.seo = {
        metaTitle: seoData.title,
        metaDescription: seoData.description,
        keywords: seoData.keywords,
        canonicalUrl: seoData.canonicalUrl
      };
      if (formData.faqs && formData.faqs.length > 0) {
        updateData.faqs = formData.faqs;
      }

      await adminAPI.updateEvent(formData.id, updateData);
      onSave();
      onClose();
    } catch (err: any) {
      logger.error('Error updating event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaTimes className="text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-4">
            {[
              { key: 'basic', label: 'Basic Info' },
              { key: 'location', label: 'Location' },
              { key: 'schedule', label: 'Schedule & Pricing' },
              { key: 'seo', label: 'SEO & FAQs' },
              { key: 'advanced', label: 'Advanced' },
              { key: 'gallery', label: 'Gallery' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-event-title" className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  id="edit-event-title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={200}
                />
              </div>

              <div>
                <label htmlFor="edit-event-short-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description <span className="text-gray-400 font-normal">(max 500 chars)</span>
                </label>
                <textarea
                  id="edit-event-short-description"
                  value={formData.shortDescription || ''}
                  onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                  placeholder="Brief summary shown on event cards and above the full description…"
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                />
                <p className="mt-1 text-xs text-gray-400 text-right">{(formData.shortDescription || '').length}/500</p>
              </div>

              <div>
                <label htmlFor="edit-event-description" className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <Suspense fallback={<TipTapEditorFallback />}>
                  <TipTapEditor
                    content={formData.description}
                    onChange={(content) => handleInputChange('description', content)}
                    placeholder="Describe your event in detail... Use the toolbar to format text, add images from media library, embed videos, and create engaging content."
                    editable={true}
                    mediaCategory="event"
                    mediaFolder="events"
                  />
                </Suspense>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-event-category" className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    id="edit-event-category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Olympiad">Olympiad</option>
                    <option value="Championship">Championship</option>
                    <option value="Competition">Competition</option>
                    <option value="Event">Event</option>
                    <option value="Course">Course</option>
                    <option value="Venue">Venue</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Class">Class</option>
                    <option value="Bootcamp">Bootcamp</option>
                    <option value="Masterclass">Masterclass</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue Type *</label>
                  <select
                    value={formData.venueType}
                    onChange={(e) => handleInputChange('venueType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                {(['Class', 'Bootcamp', 'Masterclass', 'Course', 'Workshop'].includes(formData.type) || formData.teacherId) && (
                  <div className="space-y-4 border-t pt-4 border-gray-100">
                    <h4 className="text-sm font-medium text-blue-800 flex items-center">
                      <span className="mr-2">📚</span> Educational Details
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={formData.subject || ''}
                          onChange={(e) => handleInputChange('subject', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={formData.topic || ''}
                          onChange={(e) => handleInputChange('topic', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={typeof formData.teacherId === 'object' ? formData.teacherId?._id : formData.teacherId || ''}
                          onChange={(e) => handleInputChange('teacherId', e.target.value)}
                        >
                          <option value="">Select Teacher</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Intro Video URL</label>
                        <input
                          type="url"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={formData.introVideo || ''}
                          onChange={(e) => handleInputChange('introVideo', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Syllabus — supports modules with nested lessons */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus</label>
                      <div className="space-y-3">
                        {(formData.syllabus || []).map((module, moduleIdx) => (
                          <div key={moduleIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Module header */}
                            <div className="flex gap-2 p-3 bg-gray-50 items-start">
                              <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    value={module.title}
                                    onChange={e => {
                                      const ns = [...(formData.syllabus || [])];
                                      ns[moduleIdx] = { ...ns[moduleIdx], title: e.target.value };
                                      setFormData({ ...formData, syllabus: ns });
                                    }}
                                    placeholder="Module Title *"
                                    className="w-full px-2 py-1 border rounded text-sm font-medium"
                                  />
                                  <input
                                    value={module.duration || ''}
                                    onChange={e => {
                                      const ns = [...(formData.syllabus || [])];
                                      ns[moduleIdx] = { ...ns[moduleIdx], duration: e.target.value };
                                      setFormData({ ...formData, syllabus: ns });
                                    }}
                                    placeholder="Duration (e.g. 2 hours)"
                                    className="w-full px-2 py-1 border rounded text-sm"
                                  />
                                </div>
                                <textarea
                                  value={module.description}
                                  onChange={e => {
                                    const ns = [...(formData.syllabus || [])];
                                    ns[moduleIdx] = { ...ns[moduleIdx], description: e.target.value };
                                    setFormData({ ...formData, syllabus: ns });
                                  }}
                                  placeholder="Module description"
                                  rows={2}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const ns = [...(formData.syllabus || [])];
                                  ns.splice(moduleIdx, 1);
                                  setFormData({ ...formData, syllabus: ns });
                                }}
                                className="text-red-500 p-1 mt-1 flex-shrink-0"
                                title="Remove module"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>

                            {/* Lessons within this module */}
                            <div className="px-3 pb-3 pt-1 bg-white space-y-2">
                              {(module.lessons || []).map((lesson, lessonIdx) => (
                                <div key={lessonIdx} className="flex gap-2 items-center pl-4 border-l-2 border-blue-200">
                                  <input
                                    value={lesson.title}
                                    onChange={e => {
                                      const ns = [...(formData.syllabus || [])];
                                      const lessons = [...(ns[moduleIdx].lessons || [])];
                                      lessons[lessonIdx] = { ...lessons[lessonIdx], title: e.target.value };
                                      ns[moduleIdx] = { ...ns[moduleIdx], lessons };
                                      setFormData({ ...formData, syllabus: ns });
                                    }}
                                    placeholder="Lesson title"
                                    className="flex-1 px-2 py-1 border rounded text-xs"
                                  />
                                  <input
                                    value={lesson.duration || ''}
                                    onChange={e => {
                                      const ns = [...(formData.syllabus || [])];
                                      const lessons = [...(ns[moduleIdx].lessons || [])];
                                      lessons[lessonIdx] = { ...lessons[lessonIdx], duration: e.target.value };
                                      ns[moduleIdx] = { ...ns[moduleIdx], lessons };
                                      setFormData({ ...formData, syllabus: ns });
                                    }}
                                    placeholder="Duration"
                                    className="w-24 px-2 py-1 border rounded text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ns = [...(formData.syllabus || [])];
                                      const lessons = [...(ns[moduleIdx].lessons || [])];
                                      lessons.splice(lessonIdx, 1);
                                      ns[moduleIdx] = { ...ns[moduleIdx], lessons };
                                      setFormData({ ...formData, syllabus: ns });
                                    }}
                                    className="text-red-400 flex-shrink-0"
                                    title="Remove lesson"
                                  >
                                    <FaTrash size={10} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const ns = [...(formData.syllabus || [])];
                                  const lessons = [...(ns[moduleIdx].lessons || [])];
                                  lessons.push({ title: '', duration: '' });
                                  ns[moduleIdx] = { ...ns[moduleIdx], lessons };
                                  setFormData({ ...formData, syllabus: ns });
                                }}
                                className="text-xs text-blue-500 hover:underline flex items-center pl-4 mt-1"
                              >
                                <FaPlus className="mr-1" size={9} /> Add Lesson
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const ns = [...(formData.syllabus || [])];
                            ns.push({ title: '', description: '', duration: '', lessons: [] });
                            setFormData({ ...formData, syllabus: ns });
                          }}
                          className="text-sm text-blue-600 hover:underline flex items-center"
                        >
                          <FaPlus className="mr-1" /> Add Module
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range *</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={formData.ageRange[0]}
                      onChange={(e) => handleInputChange('ageRange', [parseInt(e.target.value) || 0, formData.ageRange[1]])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={formData.ageRange[1]}
                      onChange={(e) => handleInputChange('ageRange', [formData.ageRange[0], parseInt(e.target.value) || 0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-event-tags" className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="edit-event-tags"
                  name="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., music, outdoor, family-friendly"
                />
              </div>

              {/* Event Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Images
                </label>

                {selectedImageAssets.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {selectedImageAssets.map((asset, index) => (
                      <div key={asset._id} className="relative group">
                        <img
                          src={asset.url}
                          alt={getImageAlt(asset, asset.originalName)}
                          className="h-24 w-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImageAssets(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {selectedImageAssets.length > 0 ? 'Add More' : 'Select Images'}
                </button>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              {/* Online event notice — location fields become optional */}
              {formData.venueType === 'Online' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  Online events do not require a physical location. City and address are optional below.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-event-city" className="block text-sm font-medium text-gray-700 mb-2">
                    City {formData.venueType !== 'Online' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    id="edit-event-city"
                    name="city"
                    value={formData.location.city}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    placeholder={formData.venueType === 'Online' ? 'Optional for online events' : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-event-currency" className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                  <select
                    id="edit-event-currency"
                    name="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="AED">AED</option>
                    <option value="EGP">EGP</option>
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address {formData.venueType !== 'Online' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.location.address}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  placeholder={formData.venueType === 'Online' ? 'Optional for online events' : ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Lat/lng coords are only relevant for physical venues */}
              {formData.venueType !== 'Online' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaMapMarkerAlt className="inline mr-1" />
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates.lat}
                      onChange={(e) => handleLocationChange('lat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="-90"
                      max="90"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaMapMarkerAlt className="inline mr-1" />
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates.lng}
                      onChange={(e) => handleLocationChange('lng', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="-180"
                      max="180"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule & Pricing Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Date Schedules *</label>
                  <button
                    onClick={addDateSchedule}
                    className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FaPlus className="mr-1" />
                    Add Schedule
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.dateSchedule.map((schedule, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        onClick={() => removeDateSchedule(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                          <input
                            type="datetime-local"
                            value={schedule.startDate || ''}
                            onChange={(e) => handleDateScheduleChange(index, 'startDate', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                          <input
                            type="datetime-local"
                            value={schedule.endDate || ''}
                            onChange={(e) => handleDateScheduleChange(index, 'endDate', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Available Seats</label>
                          <input
                            type="number"
                            value={schedule.availableSeats}
                            onChange={(e) => handleDateScheduleChange(index, 'availableSeats', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Total Seats</label>
                          <input
                            type="number"
                            value={schedule.totalSeats || ''}
                            onChange={(e) => handleDateScheduleChange(index, 'totalSeats', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Price for this schedule</label>
                          <input
                            type="number"
                            step="0.01"
                            value={schedule.price}
                            onChange={(e) => handleDateScheduleChange(index, 'price', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* ── Time Slots ──────────────────────────────────────────────────
                          Optional. Add when the event has multiple sessions per day.
                          Each slot can override the schedule's default price and seats.
                      ─────────────────────────────────────────────────────────────── */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600">Time Slots (optional)</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formData.dateSchedule];
                              const slots = [...(updated[index].timeSlots || [])];
                              slots.push({ startTime: '', endTime: '', availableSeats: 0, price: 0 });
                              updated[index] = { ...updated[index], timeSlots: slots };
                              handleInputChange('dateSchedule', updated);
                            }}
                            className="text-xs text-blue-600 hover:underline flex items-center"
                          >
                            <FaPlus className="mr-1" size={9} /> Add Slot
                          </button>
                        </div>
                        {(schedule.timeSlots || []).map((slot, slotIdx) => (
                          <div key={slotIdx} className="grid grid-cols-5 gap-2 mb-2 items-end">
                            <div className="col-span-1">
                              <label className="block text-xs text-gray-500 mb-0.5">Start</label>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={e => {
                                  const updated = [...formData.dateSchedule];
                                  const slots = [...(updated[index].timeSlots || [])];
                                  slots[slotIdx] = { ...slots[slotIdx], startTime: e.target.value };
                                  updated[index] = { ...updated[index], timeSlots: slots };
                                  handleInputChange('dateSchedule', updated);
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs text-gray-500 mb-0.5">End</label>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={e => {
                                  const updated = [...formData.dateSchedule];
                                  const slots = [...(updated[index].timeSlots || [])];
                                  slots[slotIdx] = { ...slots[slotIdx], endTime: e.target.value };
                                  updated[index] = { ...updated[index], timeSlots: slots };
                                  handleInputChange('dateSchedule', updated);
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs text-gray-500 mb-0.5">Seats</label>
                              <input
                                type="number"
                                min="0"
                                value={slot.availableSeats}
                                onChange={e => {
                                  const updated = [...formData.dateSchedule];
                                  const slots = [...(updated[index].timeSlots || [])];
                                  slots[slotIdx] = { ...slots[slotIdx], availableSeats: parseInt(e.target.value) || 0 };
                                  updated[index] = { ...updated[index], timeSlots: slots };
                                  handleInputChange('dateSchedule', updated);
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs text-gray-500 mb-0.5">Price</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={slot.price ?? ''}
                                placeholder="Schedule"
                                onChange={e => {
                                  const updated = [...formData.dateSchedule];
                                  const slots = [...(updated[index].timeSlots || [])];
                                  slots[slotIdx] = { ...slots[slotIdx], price: parseFloat(e.target.value) || 0 };
                                  updated[index] = { ...updated[index], timeSlots: slots };
                                  handleInputChange('dateSchedule', updated);
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...formData.dateSchedule];
                                  const slots = [...(updated[index].timeSlots || [])];
                                  slots.splice(slotIdx, 1);
                                  updated[index] = { ...updated[index], timeSlots: slots };
                                  handleInputChange('dateSchedule', updated);
                                }}
                                className="w-full flex justify-center items-center text-red-500 py-1"
                                title="Remove slot"
                              >
                                <FaTrash size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEO & FAQs Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">SEO Optimization</h3>
                <SEOEditor
                  initialData={{
                    title: seoData.title,
                    description: seoData.description,
                    keywords: seoData.keywords,
                    canonicalUrl: seoData.canonicalUrl
                  }}
                  contentData={{
                    title: formData.title,
                    description: formData.description,
                    category: categories.find(c => c._id === formData.category || c.slug === formData.category)?.name || formData.category,
                    tags: formData.tags,
                    type: 'event'
                  }}
                  onChange={handleSeoDataChange}
                  baseUrl={config.appUrl}
                  path={`/events/${formData.title.toLowerCase().replace(/\s+/g, '-')}`}
                  ogImage={selectedImageAssets[0]?.url || ''}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">FAQs</h3>
                  <button
                    onClick={addFaq}
                    className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FaPlus className="mr-1" />
                    Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.faqs?.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        onClick={() => removeFaq(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            maxLength={200}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Answer</label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            maxLength={1000}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Assignment</label>
                <select
                  value={formData.vendor?.id || ''}
                  onChange={(e) => {
                    const selectedVendor = vendors.find(v => v.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      vendor: selectedVendor ? {
                        id: selectedVendor.id,
                        fullName: selectedVendor.fullName,
                        email: selectedVendor.email
                      } : null
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.fullName} ({vendor.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Note: To change vendor, use the dedicated "Change Vendor" feature in the event list
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isApproved"
                    checked={formData.isApproved}
                    onChange={(e) => handleInputChange('isApproved', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isApproved" className="ml-2 block text-sm text-gray-900">
                    Approved
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                    Featured
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Event Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Updated:</span>
                    <span className="ml-2 text-gray-900">
                      {event.updatedAt ? new Date(event.updatedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FaLink className="text-indigo-600" /> Review Link
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Generate a shareable link so participants can submit a review without logging in.
                </p>
                {generatedReviewLink && (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      readOnly
                      value={generatedReviewLink}
                      className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedReviewLink);
                        setReviewLinkCopied(true);
                        setTimeout(() => setReviewLinkCopied(false), 2000);
                      }}
                      className="px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    >
                      {reviewLinkCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGenerateReviewLink}
                  disabled={reviewLinkGenerating}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewLinkGenerating ? 'Generating…' : generatedReviewLink ? 'Regenerate Link' : 'Generate Review Link'}
                </button>
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <FaImages className="text-blue-600" /> Event Gallery
                </h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Layout:</label>
                  <select
                    value={galleryLayout}
                    onChange={e => setGalleryLayout(e.target.value as 'grid' | 'messy')}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="grid">Grid</option>
                    <option value="messy">Masonry</option>
                  </select>
                </div>
              </div>

              {galleryImages.length > 0 && (
                <div
                  className={
                    galleryLayout === 'messy'
                      ? 'grid grid-cols-2 md:grid-cols-4 auto-rows-[110px] md:auto-rows-[128px] gap-3'
                      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  }
                >
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative group border rounded-lg overflow-hidden ${galleryLayout === 'messy' ? getMasonryCardClass(idx) : ''}`}
                    >
                      <img
                        src={img.url}
                        alt={img.caption || `Image ${idx + 1}`}
                        className={`w-full object-cover ${galleryLayout === 'messy' ? 'h-full min-h-[110px]' : 'h-44'}`}
                        onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x150?text=Image'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        ×
                      </button>
                      <div className="p-1.5 bg-white space-y-1">
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={e => {
                            const updated = [...galleryImages];
                            updated[idx] = { ...updated[idx], caption: e.target.value };
                            setGalleryImages(updated);
                          }}
                          placeholder="Caption (optional)"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
                        />
                        <select
                          value={img.size}
                          onChange={e => {
                            const updated = [...galleryImages];
                            updated[idx] = { ...updated[idx], size: e.target.value as GalleryImage['size'] };
                            setGalleryImages(updated);
                          }}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
                        >
                          <option value="small">Small (1:1)</option>
                          <option value="medium">Medium (4:3)</option>
                          <option value="large">Large (16:9)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Add Image by URL</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="gallery-url-input"
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setGalleryImages(prev => [...prev, { url: val, order: prev.length, size: 'medium' }]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('gallery-url-input') as HTMLInputElement;
                      const val = input?.value.trim();
                      if (val) {
                        setGalleryImages(prev => [...prev, { url: val, order: prev.length, size: 'medium' }]);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FaPlus className="inline mr-1" /> Add
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Press Enter or click Add. Use a CDN/Cloudinary URL for best results.</p>
              </div>

              {galleryError && (
                <p className="text-sm text-red-600">{galleryError}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGallery}
                  disabled={gallerySaving}
                  className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaSave /> {gallerySaving ? 'Saving…' : gallery ? 'Update Gallery' : 'Create Gallery'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <FaSave className="mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(assets) => {
          setSelectedImageAssets(assets);
          setShowMediaPicker(false);
        }}
        category="event"
        folder="events"
        multiple={true}
        title="Select Event Images"
      />
    </div>
  );
};

export default EventEditModal;
