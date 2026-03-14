import React, { useState, useEffect } from 'react';
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
} from 'react-icons/fa';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { TeacherNavigation } from '@/components/teacher';
import { useTeacherTeachingEvent } from '@/hooks/queries/useTeacherQuery';
import { useCreateTeachingEvent, useUpdateTeachingEvent } from '@/hooks/mutations/useTeacherMutations';
import TipTapEditor from '@/components/common/TipTapEditor';
import MediaPickerModal from '@/components/admin/media/MediaPickerModal';
import { MediaAsset } from '@/store/slices/mediaSlice';
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

const CATEGORIES = [
  'Arts & Crafts',
  'Music',
  'Dance',
  'Sports',
  'Education',
  'Languages',
  'Science & Technology',
  'Cooking',
  'Life Skills',
  'Other',
];

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
  const [images, setImages] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState<boolean>(false);
  const [meetingLink, setMeetingLink] = useState('');

  // Course specific
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [introVideo, setIntroVideo] = useState('');
  const [syllabus, setSyllabus] = useState<SyllabusSection[]>([]);

  // Schedule & Pricing
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
      setEventType((event as any).venueType || event.eventType || 'Online');
      setAgeRangeMin(event.ageRange?.[0]?.toString() || '3');
      setAgeRangeMax(event.ageRange?.[1]?.toString() || '12');
      setTags(event.tags || []);
      setImages(event.images || []);
      setImagePreviewUrls(event.images || []);
      setMeetingLink(event.meetingLink || '');
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
    if (!basePrice.trim()) newErrors.basePrice = 'Base price is required';

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
        price: parseFloat(basePrice),
        currency,
        tags,
        dateSchedule: schedules.map((s) => ({
          startDate: new Date(s.startDate),
          endDate: s.endDate ? new Date(s.endDate) : undefined,
          startTime: s.startTime,
          endTime: s.endTime,
          availableSeats: s.unlimitedSeats ? 999999 : parseInt(s.availableSeats) || 10,
          price: s.price ? parseFloat(s.price) : parseFloat(basePrice),
          unlimitedSeats: s.unlimitedSeats,
        })),
        images,
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
      toast.error(error?.message || 'Failed to save event');
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

  // Image handlers
  const handleImagesChange = (assets: MediaAsset[], previewUrls: string[]) => {
    setImages([...images, ...previewUrls]);
    setImagePreviewUrls([...imagePreviewUrls, ...previewUrls]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
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
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
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

                {/* Event Images Section */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2" />
                    Event Images ({imagePreviewUrls.length}/20)
                  </h4>
                  <div>
                    {/* Image Preview Grid */}
                    {imagePreviewUrls.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-6">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                              <img
                                src={url}
                                alt={`Event image ${index + 1}`}
                                className="h-40 w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                              <div
                                className="h-40 w-full bg-gray-100 items-center justify-center text-gray-400 text-xs text-center p-2"
                                style={{ display: 'none' }}
                              >
                                Image unavailable
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 font-medium">
                                Image {index + 1}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl transition-all duration-200"
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      {imagePreviewUrls.length > 0 ? 'Add More Images' : 'Select Images'}
                    </button>

                    <p className="mt-3 text-xs text-gray-600">
                      Upload high-quality images to showcase your class. First image will be the featured image.
                    </p>
                  </div>
                </div>
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
                {/* Base Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Price *
                    </label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.basePrice ? 'border-red-500' : 'border-gray-200'
                        }`}
                    />
                    {errors.basePrice && (
                      <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>
                    )}
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
                              value={schedule.price}
                              onChange={(e) => updateSchedule(idx, 'price', e.target.value)}
                              placeholder={basePrice || '0'}
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
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

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(assets) => {
          handleImagesChange(assets, assets.map(a => a.url));
          setShowMediaPicker(false);
        }}
        category="event"
        folder="teaching-events"
        multiple={true}
        title="Select Event Images"
      />
    </div>
  );
};

export default TeacherEventFormPage;
