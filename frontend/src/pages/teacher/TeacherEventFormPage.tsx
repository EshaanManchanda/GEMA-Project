import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft,
  FaSave,
  FaInfoCircle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaTrash,
  FaUpload,
  FaImages,
} from 'react-icons/fa';
import { ApiService } from '@/services/api';
import MediaPickerModal from '@/components/admin/media/MediaPickerModal';
import type { MediaAsset } from '@/store/slices/mediaSlice';
import { TeacherNavigation } from '@/components/teacher';
import { useTeacherTeachingEvent } from '@/hooks/queries/useTeacherQuery';
import { useCreateTeachingEvent, useUpdateTeachingEvent } from '@/hooks/mutations/useTeacherMutations';
import TipTapEditor from '@/components/common/TipTapEditor';
import SEOEditor from '@/components/seo/SEOEditor';
import categoriesAPI from '@/services/api/categoriesAPI';
import type { Category } from '@/services/api/categoriesAPI';
import type { TeachingEventCreateInput } from '@/types/teacher';
import { getEventMode } from '@/utils/eventMode';
import TeachingSchedulePricingTab from '@/components/admin/TeachingSchedulePricingTab';
import EventGalleryEditor from '@/components/common/EventGalleryEditor';

interface Schedule {
  id: string;
  _id?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  totalSeats?: string;
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface SyllabusLesson {
  title: string;
  duration: string;
}

interface SyllabusSection {
  title: string;
  description: string;
  duration: string;
  lessons: SyllabusLesson[];
}

type TabType = 'basic' | 'schedule' | 'location' | 'syllabus' | 'advanced';

// Categories are fetched from API - no hardcoded list

// ISO 3166-1 alpha-2 country codes with display names
const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },
];

const TeacherEventFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isEditMode = !!slug;

  // Queries & Mutations
  const { data: eventData, isLoading: isLoadingEvent } = useTeacherTeachingEvent(slug || '', {
    enabled: isEditMode,
  });
  const createMutation = useCreateTeachingEvent();
  const updateMutation = useUpdateTeachingEvent();

  // Categories from API
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    categoriesAPI.getAllCategories({ tree: false, includeInactive: false })
      .then((cats) => setCategories(cats))
      .catch(() => {/* silent fail, user can still type */ });
  }, []);

  // Form state
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass'>('Class');
  const [eventType, setEventType] = useState<'Online' | 'Offline'>('Online');
  const [ageRangeMin, setAgeRangeMin] = useState('3');
  const [ageRangeMax, setAgeRangeMax] = useState('12');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageAssets, setImageAssets] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Course specific
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [introVideo, setIntroVideo] = useState('');
  const [syllabus, setSyllabus] = useState<SyllabusSection[]>([]);

  // Schedule & Pricing
  const [isFreeEvent, setIsFreeEvent] = useState(false);
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: 'schedule-1',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '10:00',
      availableSeats: '10',
      price: '',
      unlimitedSeats: false,
    },
  ]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Location
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('AE');

  // Timezone
  const [timezone, setTimezone] = useState('Asia/Dubai');

  // SEO
  const [seoMeta, setSeoMeta] = useState<{ title: string; description: string; keywords: string[] }>({
    title: '',
    description: '',
    keywords: [],
  });

  // FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Note: Past Event Memories removed in favor of EventGalleryEditor

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load event data in edit mode
  useEffect(() => {
    console.log('🔍 Raw eventData from query:', eventData);
    if (eventData?.teachingEvent) {
      const event = eventData.teachingEvent;
      setTitle(event.title || '');
      setDescription(event.description || '');
      setShortDescription(event.shortDescription || '');
      console.log('📝 Loaded event data:', {
        id: event._id,
        title: event.title,
        descriptionCount: event.description?.length,
        subject: event.subject,
        topic: event.topic,
        introVideo: event.introVideo,
        memoriesCount: event.pastEventMemories?.length || 0,
        slug
      });
      setCategory(event.category || '');
      setType(event.type || 'Class');
      setEventType(getEventMode(event));
      setAgeRangeMin(event.ageRange?.[0]?.toString() || '3');
      setAgeRangeMax(event.ageRange?.[1]?.toString() || '12');
      setTags(event.tags || []);
      // Load imageAssets (IDs) and preview URLs — prefer populated imageAssets, fall back to images[]
      const isHttpUrl = (s: any) => typeof s === 'string' && s.startsWith('http');
      setImageAssets(
        Array.isArray(event.imageAssets)
          ? event.imageAssets.map((a: any) => (typeof a === 'object' && a !== null ? a._id : a)).filter(Boolean)
          : []
      );
      setImagePreviewUrls((() => {
        if (Array.isArray(event.imageAssets) && event.imageAssets.length > 0) {
          const fromAssets = event.imageAssets
            .map((a: any) => (typeof a === 'object' && a !== null) ? (a.url || a.secureUrl) : null)
            .filter(isHttpUrl);
          if (fromAssets.length > 0) return fromAssets;
        }
        return (event.images || []).filter(isHttpUrl);
      })());
      setMeetingLink(event.meetingLink || '');
      setMeetingPassword((event as any).meetingPassword || '');
      setTimezone((event as any).timezone || 'Asia/Dubai');
      setSeoMeta({
        title: (event as any).seoMeta?.title || '',
        description: (event as any).seoMeta?.description || '',
        keywords: (event as any).seoMeta?.keywords || [],
      });
      setIsFreeEvent(!!event.isFreeEvent);
      setBasePrice(event.price?.toString() || '');
      setCurrency(event.currency || 'AED');
      setCity(event.location?.city || '');
      setAddress(event.location?.address || '');
      setCity(event.location?.city || '');
      setAddress(event.location?.address || '');
      setCountry(event.location?.country || 'AE');

      // Load new fields
      setSubject(event.subject || '');
      setTopic(event.topic || '');
      setIntroVideo(event.introVideo || '');
      setSyllabus((event.syllabus || []).map((s: any) => ({
        title: s.title || '',
        description: s.description || '',
        duration: s.duration || '',
        lessons: (s.lessons || []).map((l: any) => ({ title: l.title || '', duration: l.duration || '' })),
      })));

      // Load schedules
      if (event.dateSchedule && event.dateSchedule.length > 0) {
        setSchedules(
          event.dateSchedule.map((s: any, idx: number) => ({
            id: s._id || `schedule-${idx}`,
            startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
            endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
            startTime: s.startTime || '09:00',
            endTime: s.endTime || '10:00',
            availableSeats: (s.totalSeats || s.availableSeats || 10).toString(),
            price: s.price?.toString() || '',
            unlimitedSeats: s.unlimitedSeats || false,
            _id: s._id,
          }))
        );
      }

      // Load memories
      setIsDataLoaded(true);
    }
    // Only run this once when eventData initially loads or when slug changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventData?.teachingEvent?._id, slug]);

  // Validation
  const validateForm = (): { isValid: boolean; firstError?: string } => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!category) newErrors.category = 'Category is required';
    if (!isFreeEvent && !basePrice.trim()) newErrors.basePrice = 'Base price is required';

    // Validate age range
    const minAge = parseInt(ageRangeMin);
    const maxAge = parseInt(ageRangeMax);
    if (minAge >= maxAge) newErrors.ageRange = 'Max age must be greater than min age';

    // Validate schedules
    schedules.forEach((s, idx) => {
      if (!s.startDate) newErrors[`schedule_${idx}_startDate`] = 'Start date required';
      if (!s.endDate) newErrors[`schedule_${idx}_endDate`] = 'End date required';
      if (!s.unlimitedSeats && !s.availableSeats) {
        newErrors[`schedule_${idx}_seats`] = 'Seats required';
      }
    });

    // Validate meeting link for online events removed per user request

    // Validate city only for offline events
    if (eventType === 'Offline' && !city.trim()) {
      newErrors.city = 'City is required for offline events';
    }

    setErrors(newErrors);
    const errorMessages = Object.values(newErrors);
    return {
      isValid: errorMessages.length === 0,
      firstError: errorMessages[0],
    };
  };

  // Submit handler
  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      const firstError = validation.firstError || 'Please fix validation errors';
      toast.error(firstError);
      return;
    }

    setIsSaving(true);
    try {
      const eventData: TeachingEventCreateInput = {
        title,
        description,
        shortDescription: shortDescription || undefined,
        category,
        type,
        status: 'pending',
        eventType,
        meetingLink: eventType === 'Online' ? meetingLink : undefined,
        meetingPassword: eventType === 'Online' && meetingPassword.trim() ? meetingPassword : undefined,
        timezone,
        ageRange: [parseInt(ageRangeMin), parseInt(ageRangeMax)],
        location: eventType === 'Offline' ? {
          country,
          city,
          address,
        } : {
          country: 'AE',
          city: 'Online',
        },
        seoMeta: seoMeta.title || seoMeta.description || seoMeta.keywords.length > 0 ? seoMeta : undefined,
        isFreeEvent,
        price: isFreeEvent ? 0 : parseFloat(basePrice),
        currency,
        tags,
        dateSchedule: schedules.map((s) => ({
          _id: s._id,
          startDate: new Date(s.startDate),
          endDate: s.endDate ? new Date(s.endDate) : undefined,
          startTime: s.startTime,
          endTime: s.endTime,
          // Both set to the same value from the input; the backend will adjust availableSeats based on bookings
          availableSeats: s.unlimitedSeats ? 999999 : parseInt(s.availableSeats) || 10,
          totalSeats: s.unlimitedSeats ? 999999 : parseInt(s.availableSeats) || 10,
          price: isFreeEvent ? 0 : (s.price ? parseFloat(s.price) : parseFloat(basePrice)),
          unlimitedSeats: s.unlimitedSeats,
        })),
        images: [],
        imageAssets,
        subject,
        topic,
        introVideo,
        syllabus,
        // removed pastEventMemories from payload
      };

      if (isEditMode && slug) {
        await updateMutation.mutateAsync({ id: slug, data: eventData });
        toast.success('Event updated successfully!');
      } else {
        await createMutation.mutateAsync(eventData);
        toast.success('Event created successfully!');
      }

      navigate('/teacher/events');
    } catch (error: any) {
      const backendErrors = error?.response?.data?.errors;
      const firstBackendError =
        backendErrors && typeof backendErrors === 'object'
          ? Object.values(backendErrors)[0]
          : undefined;

      const msg =
        (typeof firstBackendError === 'string' ? firstBackendError : undefined) ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save event. Please check all required fields.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Schedule handlers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addSchedule = (_isSpecialDate?: boolean) => {
    setSchedules(prev => [
      ...prev,
      {
        id: `schedule-${Date.now()}`,
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '10:00',
        availableSeats: '10',
        price: basePrice,
        unlimitedSeats: false,
      },
    ]);
  };

  const removeSchedule = (idx: number) => {
    setSchedules(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updateSchedule = (idx: number, field: keyof Schedule, value: string | boolean | string[] | number) => {
    setSchedules(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Tag handlers
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // FAQ handlers
  const addFaq = () => {
    setFaqs([...faqs, { id: `faq-${Date.now()}`, question: '', answer: '' }]);
  };

  const updateFaq = (idx: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqs];
    updated[idx] = { ...updated[idx], [field]: value };
    setFaqs(updated);
  };

  const removeFaq = (idx: number) => {
    setFaqs(faqs.filter((_, i) => i !== idx));
  };

  // Image upload handler — creates a tracked MediaAsset record
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'event');
      fd.append('folder', 'events');
      const res = await ApiService.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const asset = res?.data;
      if (asset?._id && asset?.url) {
        setImageAssets((prev) => [...prev, asset._id]);
        setImagePreviewUrls((prev) => [...prev, asset.url]);
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Image upload failed');
    } finally {
      setIsUploadingImage(false);
      if (imageFileRef.current) imageFileRef.current.value = '';
    }
  };

  if (isEditMode && (isLoadingEvent || !isDataLoaded)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <TeacherNavigation />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
            <p className="text-gray-500 font-medium">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info', icon: <FaInfoCircle /> },
    { id: 'schedule' as TabType, label: 'Schedule & Pricing', icon: <FaCalendarAlt /> },
    { id: 'syllabus' as TabType, label: 'Syllabus', icon: <FaInfoCircle /> },
    { id: 'location' as TabType, label: 'Location & SEO', icon: <FaMapMarkerAlt /> },
    { id: 'advanced' as TabType, label: 'Advanced', icon: <FaPlus /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/events')}
              className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'Edit Class' : 'Create New Class'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode ? 'Update your class details' : 'Fill in the details for your new class'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <FaSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : isEditMode ? 'Update Class' : 'Create Class'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium text-sm transition-all ${activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-gray-50'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Kids Art Workshop - Painting Basics"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.title ? 'border-red-500' : 'border-gray-200'
                      }`}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                {/* Subject, Topic, Intro Video — MOVED HIGHER FOR VISIBILITY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Calculus"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intro Video URL</label>
                    <input
                      type="text"
                      value={introVideo}
                      onChange={(e) => setIntroVideo(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <TipTapEditor
                    key={isEditMode ? `edit-${eventData?.teachingEvent?._id}-${isDataLoaded}` : 'create'}
                    content={description}
                    onChange={setDescription}
                    placeholder="Describe your class in detail..."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Description <span className="text-gray-400 text-xs font-normal">(optional — shown in event cards)</span>
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="A brief summary of your class (max 500 characters)..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">{shortDescription.length}/500</p>
                </div>

                {/* Category & Type Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.category ? 'border-red-500' : 'border-gray-200'
                        }`}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as 'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass')
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Class">Class</option>
                      <option value="Course">Course</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Bootcamp">Bootcamp</option>
                      <option value="Masterclass">Masterclass</option>
                    </select>
                  </div>
                </div>

                {/* Event Type & Meeting Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Mode
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as 'Online' | 'Offline')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>

                  {eventType === 'Online' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meeting Link <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="url"
                          value={meetingLink}
                          onChange={(e) => setMeetingLink(e.target.value)}
                          placeholder="https://zoom.us/j/..."
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.meetingLink ? 'border-red-500' : 'border-gray-200'}`}
                        />
                        {errors.meetingLink && (
                          <p className="text-red-500 text-sm mt-1">{errors.meetingLink}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meeting Password <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={meetingPassword}
                          onChange={(e) => setMeetingPassword(e.target.value)}
                          placeholder="Enter meeting password if required"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={ageRangeMin}
                      onChange={(e) => setAgeRangeMin(e.target.value)}
                      min="0"
                      max="99"
                      className="w-24 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      value={ageRangeMax}
                      onChange={(e) => setAgeRangeMax(e.target.value)}
                      min="0"
                      max="99"
                      className="w-24 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-500">years old</span>
                  </div>
                  {errors.ageRange && <p className="text-red-500 text-sm mt-1">{errors.ageRange}</p>}
                </div>


                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-purple-900"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Images</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select from media library or upload new images. First image is the cover.
                  </p>

                  {/* Preview grid */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {imagePreviewUrls.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImageAssets((prev) => prev.filter((_, i) => i !== idx));
                              setImagePreviewUrls((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                          >
                            ×
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-colors text-sm font-medium"
                      >
                        <FaImages className="w-3.5 h-3.5" />
                        Media Library
                      </button>

                      <input
                        ref={imageFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileUpload}
                      />
                      <button
                        type="button"
                        onClick={() => imageFileRef.current?.click()}
                        disabled={isUploadingImage}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <FaUpload className="w-3 h-3" />
                        {isUploadingImage ? 'Uploading...' : 'Upload File'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Media Picker Modal */}
                <MediaPickerModal
                  isOpen={isMediaPickerOpen}
                  onClose={() => setIsMediaPickerOpen(false)}
                  onSelect={(assets: MediaAsset[]) => {
                    setImageAssets((prev) => [...prev, ...assets.map((a) => a._id)]);
                    setImagePreviewUrls((prev) => [...prev, ...assets.map((a) => a.url).filter(Boolean)]);
                    setIsMediaPickerOpen(false);
                  }}
                  category="event"
                  multiple={true}
                  title="Select Event Images"
                />
              </motion.div>
            )}

            {/* Syllabus Tab */}
            {activeTab === 'syllabus' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Course Syllabus</h3>
                  <button
                    type="button"
                    onClick={() => setSyllabus([...syllabus, { title: '', description: '', duration: '', lessons: [] }])}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Section
                  </button>
                </div>

                <div className="space-y-6">
                  {syllabus.map((section, sIndex) => (
                    <div key={sIndex} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          placeholder="Section Title"
                          value={section.title}
                          onChange={(e) => {
                            const newSyllabus = [...syllabus];
                            newSyllabus[sIndex].title = e.target.value;
                            setSyllabus(newSyllabus);
                          }}
                          className="w-full px-4 py-2 border rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Duration"
                          value={section.duration}
                          onChange={(e) => {
                            const newSyllabus = [...syllabus];
                            newSyllabus[sIndex].duration = e.target.value;
                            setSyllabus(newSyllabus);
                          }}
                          className="w-full px-4 py-2 border rounded-lg bg-white"
                        />
                        <textarea
                          placeholder="Description"
                          value={section.description}
                          onChange={(e) => {
                            const newSyllabus = [...syllabus];
                            newSyllabus[sIndex].description = e.target.value;
                            setSyllabus(newSyllabus);
                          }}
                          className="w-full px-4 py-2 border rounded-lg bg-white col-span-2"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                        {section.lessons?.map((lesson, lIndex) => (
                          <div key={lIndex} className="flex gap-3 items-center">
                            <input
                              type="text"
                              placeholder="Lesson Title"
                              value={lesson.title}
                              onChange={(e) => {
                                const newSyllabus = [...syllabus];
                                newSyllabus[sIndex].lessons[lIndex].title = e.target.value;
                                setSyllabus(newSyllabus);
                              }}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Duration"
                              value={lesson.duration}
                              onChange={(e) => {
                                const newSyllabus = [...syllabus];
                                newSyllabus[sIndex].lessons[lIndex].duration = e.target.value;
                                setSyllabus(newSyllabus);
                              }}
                              className="w-24 px-3 py-2 border rounded-lg text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newSyllabus = [...syllabus];
                                newSyllabus[sIndex].lessons = newSyllabus[sIndex].lessons.filter((_, i) => i !== lIndex);
                                setSyllabus(newSyllabus);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newSyllabus = [...syllabus];
                            newSyllabus[sIndex].lessons = [...(newSyllabus[sIndex].lessons || []), { title: '', duration: '' }];
                            setSyllabus(newSyllabus);
                          }}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-2"
                        >
                          <FaPlus className="w-3 h-3" /> Add Lesson
                        </button>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSyllabus(syllabus.filter((_, i) => i !== sIndex))}
                          className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <FaTrash className="w-4 h-4" /> Remove Section
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Schedule & Pricing Tab */}
            {activeTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Free Event Toggle */}
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${isFreeEvent ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200 hover:border-green-300'}`}
                  onClick={() => setIsFreeEvent(!isFreeEvent)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isFreeEvent ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}>
                    {isFreeEvent && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isFreeEvent ? 'text-green-700' : 'text-gray-700'}`}>Free Event (No Payment Required)</p>
                    <p className="text-xs text-gray-500">Attendees register without paying — registration form is still collected</p>
                  </div>
                  {isFreeEvent && <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">FREE</span>}
                </div>


                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Asia/Dubai">UAE — Asia/Dubai (UTC+4)</option>
                    <option value="Asia/Riyadh">Saudi Arabia — Asia/Riyadh (UTC+3)</option>
                    <option value="Asia/Kuwait">Kuwait — Asia/Kuwait (UTC+3)</option>
                    <option value="Asia/Kolkata">India — Asia/Kolkata (UTC+5:30)</option>
                    <option value="Europe/London">UK — Europe/London (UTC+0/+1)</option>
                    <option value="America/New_York">US East — America/New_York (UTC-5/-4)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                {/* Schedule & Pricing (session-based component) */}
                <TeachingSchedulePricingTab
                  schedules={schedules}
                  currency={currency}
                  basePrice={basePrice}
                  errors={errors}
                  isFreeEvent={isFreeEvent}
                  onScheduleChange={updateSchedule}
                  onAddSchedule={addSchedule}
                  onRemoveSchedule={removeSchedule}
                  onCurrencyChange={(e) => setCurrency(e.target.value)}
                  onBasePriceChange={(e) => setBasePrice(e.target.value)}
                />
              </motion.div>
            )}

            {/* Location & SEO Tab */}
            {activeTab === 'location' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Location Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  {eventType === 'Online' ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                      Location is not required for online events. Meeting details can be added in the Basic Info tab.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g., Dubai"
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.city ? 'border-red-500' : 'border-gray-200'}`}
                          />
                          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Address
                        </label>
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                          placeholder="Enter the full address for in-person classes..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* SEO Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h3>
                  <SEOEditor
                    initialData={seoMeta}
                    contentData={{
                      title,
                      description,
                      category,
                      type: 'event',
                    }}
                    onChange={(data) => setSeoMeta({ title: data.title, description: data.description, keywords: data.keywords })}
                  />
                </div>

                {/* FAQs Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">FAQs (Optional)</h3>
                    <button
                      type="button"
                      onClick={addFaq}
                      className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <FaPlus className="w-4 h-4" />
                      Add FAQ
                    </button>
                  </div>

                  <div className="space-y-4">
                    {faqs.map((faq, idx) => (
                      <div
                        key={faq.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-500">FAQ {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeFaq(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                          placeholder="Question"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <textarea
                          value={faq.answer}
                          onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                          placeholder="Answer"
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    ))}
                    {faqs.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No FAQs added yet. Click "Add FAQ" to add common questions.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaImages className="text-purple-600" />
                    Past Event Memories
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <p className="text-sm text-gray-600 mb-6">
                      Add photos and testimonials from previous sessions to showcase participant experiences and build trust with new students.
                    </p>
                    <EventGalleryEditor eventId={eventData?.teachingEvent?._id} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={() => {
                const tabOrder: TabType[] = ['basic', 'schedule', 'syllabus', 'location', 'advanced'];
                const idx = tabOrder.indexOf(activeTab);
                if (idx > 0) setActiveTab(tabOrder[idx - 1]);
              }}
              disabled={activeTab === 'basic'}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                const tabOrder: TabType[] = ['basic', 'schedule', 'syllabus', 'location', 'advanced'];
                const idx = tabOrder.indexOf(activeTab);
                if (idx < tabOrder.length - 1) {
                  setActiveTab(tabOrder[idx + 1]);
                } else {
                  handleSubmit();
                }
              }}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              {activeTab === 'advanced' ? (isEditMode ? 'Update Class' : 'Create Class') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherEventFormPage;
