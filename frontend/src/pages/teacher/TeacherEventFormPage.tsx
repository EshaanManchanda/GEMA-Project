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
import type { MediaAsset } from '@/store/legacySlices/mediaSlice';
import { TeacherNavigation } from '@/components/teacher';
import { useTeacherTeachingEvent } from '@/hooks/queries/useTeacherQuery';
import { useCreateTeachingEvent, useUpdateTeachingEvent } from '@/hooks/mutations/useTeacherMutations';
import TipTapEditor from '@/components/common/TipTapEditor';
import categoriesAPI from '@/services/api/categoriesAPI';
import type { Category } from '@/services/api/categoriesAPI';
import type { TeachingEventCreateInput } from '@/types/teacher';

interface Schedule {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  availableSeats: string;
  price: string;
  unlimitedSeats: boolean;
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

type TabType = 'basic' | 'schedule' | 'location' | 'syllabus';

// Categories are fetched from API - no hardcoded list

const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP'];

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
      .catch(() => {/* silent fail, user can still type */});
  }, []);

  // Form state
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

  // Location
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('AE');

  // SEO & FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load event data in edit mode
  useEffect(() => {
    if (eventData?.teachingEvent) {
      const event = eventData.teachingEvent;
      setTitle(event.title || '');
      setDescription(event.description || '');
      setCategory(event.category || '');
      setType(event.type || 'Class');
      setEventType(event.eventType || 'Online');
      setAgeRangeMin(event.ageRange?.[0]?.toString() || '3');
      setAgeRangeMax(event.ageRange?.[1]?.toString() || '12');
      setTags(event.tags || []);
      // Load imageAssets (IDs) and preview URLs — prefer populated imageAssets, fall back to images[]
      const isHttpUrl = (s: any) => typeof s === 'string' && s.startsWith('http');
      const eventAny = event as any;
      setImageAssets(
        Array.isArray(eventAny.imageAssets)
          ? eventAny.imageAssets.map((a: any) => (typeof a === 'object' && a !== null ? a._id : a)).filter(Boolean)
          : []
      );
      setImagePreviewUrls((() => {
        if (Array.isArray(eventAny.imageAssets) && eventAny.imageAssets.length > 0) {
          const fromAssets = eventAny.imageAssets
            .map((a: any) => (typeof a === 'object' && a !== null) ? (a.url || a.secureUrl) : null)
            .filter(isHttpUrl);
          if (fromAssets.length > 0) return fromAssets;
        }
        return (event.images || []).filter(isHttpUrl);
      })());
      setMeetingLink(event.meetingLink || '');
      setIsFreeEvent((eventAny as any).isFreeEvent || false);
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
            availableSeats: s.availableSeats?.toString() || '10',
            price: s.price?.toString() || '',
            unlimitedSeats: s.unlimitedSeats || false,
          }))
        );
      }
    }
  }, [eventData]);

  // Validation
  const validateForm = (): boolean => {
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

    // Validate meeting link for online events
    if (eventType === 'Online' && !meetingLink.trim()) {
      newErrors.meetingLink = 'Meeting link required for online events';
    }

    // Validate city (required for all events)
    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    setIsSaving(true);
    try {
      const eventData: TeachingEventCreateInput = {
        title,
        description,
        category,
        type,
        eventType,
        meetingLink: eventType === 'Online' ? meetingLink : undefined,
        ageRange: [parseInt(ageRangeMin), parseInt(ageRangeMax)],
        location: {
          country,
          city,
          address: eventType === 'Offline' ? address : undefined,
        },
        price: isFreeEvent ? 0 : parseFloat(basePrice),
        currency,
        tags,
        dateSchedule: schedules.map((s) => ({
          startDate: new Date(s.startDate),
          endDate: s.endDate ? new Date(s.endDate) : undefined,
          startTime: s.startTime,
          endTime: s.endTime,
          availableSeats: s.unlimitedSeats ? 999999 : parseInt(s.availableSeats) || 10,
          price: isFreeEvent ? 0 : (s.price ? parseFloat(s.price) : parseFloat(basePrice)),
          unlimitedSeats: s.unlimitedSeats,
        })),
        images: [],
        imageAssets,
        subject,
        topic,
        introVideo,
        syllabus,
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
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save event. Please check all required fields.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Schedule handlers
  const addSchedule = () => {
    setSchedules([
      ...schedules,
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
    if (schedules.length > 1) {
      setSchedules(schedules.filter((_, i) => i !== idx));
    }
  };

  const updateSchedule = (idx: number, field: keyof Schedule, value: string | boolean) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedules(updated);
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

  if (isEditMode && isLoadingEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <TeacherNavigation />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info', icon: <FaInfoCircle /> },
    { id: 'schedule' as TabType, label: 'Schedule & Pricing', icon: <FaCalendarAlt /> },
    { id: 'syllabus' as TabType, label: 'Syllabus', icon: <FaInfoCircle /> },
    { id: 'location' as TabType, label: 'Location & SEO', icon: <FaMapMarkerAlt /> },
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <TipTapEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Describe your class in detail..."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
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
                      <option value="Offline">In-Person</option>
                    </select>
                  </div>

                  {eventType === 'Online' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meeting Link *
                      </label>
                      <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.meetingLink ? 'border-red-500' : 'border-gray-200'
                          }`}
                      />
                      {errors.meetingLink && (
                        <p className="text-red-500 text-sm mt-1">{errors.meetingLink}</p>
                      )}
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

                {/* Subject, Topic, Intro Video */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Calculus"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intro Video URL</label>
                    <input
                      type="text"
                      value={introVideo}
                      onChange={(e) => setIntroVideo(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
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

                {/* Base Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Price {!isFreeEvent && '*'}
                    </label>
                    <input
                      type="number"
                      value={isFreeEvent ? '0' : basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isFreeEvent}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.basePrice ? 'border-red-500' : 'border-gray-200'} ${isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                    />
                    {errors.basePrice && (
                      <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>
                    )}
                    {isFreeEvent && <p className="mt-1 text-xs text-green-600">Free — no charge</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedules */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Class Schedules
                    </label>
                    <button
                      type="button"
                      onClick={addSchedule}
                      className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <FaPlus className="w-4 h-4" />
                      Add Schedule
                    </button>
                  </div>

                  <div className="space-y-4">
                    {schedules.map((schedule, idx) => (
                      <div
                        key={schedule.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-700">Schedule {idx + 1}</h4>
                          {schedules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSchedule(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Start Date *
                            </label>
                            <input
                              type="date"
                              value={schedule.startDate}
                              onChange={(e) => updateSchedule(idx, 'startDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              End Date *
                            </label>
                            <input
                              type="date"
                              value={schedule.endDate}
                              onChange={(e) => updateSchedule(idx, 'endDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Available Seats
                            </label>
                            <input
                              type="number"
                              value={schedule.availableSeats}
                              onChange={(e) => updateSchedule(idx, 'availableSeats', e.target.value)}
                              disabled={schedule.unlimitedSeats}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Price Override
                            </label>
                            <input
                              type="number"
                              value={isFreeEvent ? '0' : schedule.price}
                              onChange={(e) => updateSchedule(idx, 'price', e.target.value)}
                              placeholder={basePrice || '0'}
                              min="0"
                              step="0.01"
                              disabled={isFreeEvent}
                              className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${isFreeEvent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                            />
                            {isFreeEvent && <p className="mt-1 text-xs text-green-600">Free — no charge</p>}
                          </div>

                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schedule.unlimitedSeats}
                                onChange={(e) =>
                                  updateSchedule(idx, 'unlimitedSeats', e.target.checked)
                                }
                                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-600">Unlimited Seats</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.city ? 'border-red-500' : 'border-gray-200'
                          }`}
                      />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>
                  </div>

                  {eventType === 'Offline' && (
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
                  )}
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
          </div>

          {/* Bottom Navigation */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={() => {
                const tabOrder: TabType[] = ['basic', 'schedule', 'syllabus', 'location'];
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
                const tabOrder: TabType[] = ['basic', 'schedule', 'syllabus', 'location'];
                const idx = tabOrder.indexOf(activeTab);
                if (idx < tabOrder.length - 1) {
                  setActiveTab(tabOrder[idx + 1]);
                } else {
                  handleSubmit();
                }
              }}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              {activeTab === 'location' ? (isEditMode ? 'Update Class' : 'Create Class') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherEventFormPage;
