import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaInfoCircle, FaCalendarAlt, FaPlus, FaArrowLeft, FaSave } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { useVendorEventQuery } from '../../hooks/queries/useVendorQuery';
import { useCreateVendorEventMutation, useUpdateVendorEventMutation } from '../../hooks/mutations/useEventMutations';
import categoriesAPI from '../../services/api/categoriesAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import BasicInfoTab from '../../components/vendor/BasicInfoTab';
import SchedulePricingTab from '../../components/admin/SchedulePricingTab';
import AdvancedTab from '../../components/vendor/AdvancedTab';
import { MediaAsset } from '../../store/slices/mediaSlice';
import { TIMEZONE_OPTIONS } from '../../utils/timezoneUtils';

interface EventFormData {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop' | 'Class' | 'Bootcamp' | 'Masterclass';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRangeMin: string;
  ageRangeMax: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  country: string;
  state: string;
  zipCode: string;
  meetingLink: string;
  meetingPassword?: string;
  competitionFormat: string;
  teamSize: string;
  skillLevel: string;
  prerequisites: string;
  facilities: string[];
  amenities: string[];
  currency: string;
  tags: string[];
  capacity: string;
  featured: boolean;
  requirePhoneVerification: boolean;
  imageAssets: string[];
  imagePreviewUrls: string[];
  syllabus: Array<{ title: string; description: string; duration?: string }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
  externalBookingLink?: string;
}

interface Schedule {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
  _id?: string;
  sessionType?: string;
  isFreeSession?: boolean;
  ratePerClass?: string;
  timeSlots?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    availableSeats: string;
  }>;
}

interface Category {
  id: string;
  name: string;
}

const VendorEventFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'advanced'>('basic');

  const { data: eventData, isLoading: isLoadingEvent } = useVendorEventQuery(id || '', {
    enabled: isEditMode,
  });

  const createMutation = useCreateVendorEventMutation();
  const updateMutation = useUpdateVendorEventMutation();

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    shortDescription: '',
    category: '',
    type: 'Event',
    venueType: 'Indoor',
    ageRangeMin: '',
    ageRangeMax: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    country: '',
    state: '',
    zipCode: '',
    meetingLink: '',
    meetingPassword: '',
    competitionFormat: '',
    teamSize: '',
    skillLevel: '',
    prerequisites: '',
    facilities: [],
    amenities: [],
    currency: 'AED',
    tags: [],
    capacity: '',
    featured: false,
    requirePhoneVerification: false,
    imageAssets: [],
    imagePreviewUrls: [],
    syllabus: [],
    faqs: [],
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    },
    externalBookingLink: ''
  });

  const [bookingMethod, setBookingMethod] = useState<'internal' | 'external'>('internal');
  const [isFreeEvent, setIsFreeEvent] = useState<boolean>(false);
  const [unlimitedCapacity, setUnlimitedCapacity] = useState<boolean>(false);
  const [basePrice, setBasePrice] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('Asia/Dubai');

  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [formFields, setFormFields] = useState<any[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await categoriesAPI.getAllCategories({ tree: false });
        const transformedCategories: Category[] = categoriesData.map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name
        }));
        setCategories(transformedCategories);
      } catch (error) {
        setCategories([
          { id: 'arts', name: 'Arts & Crafts' },
          { id: 'science', name: 'Science & Technology' }
        ]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isEditMode && eventData?.event) {
      const event = eventData.event;
      setFormData({
        title: event.title || '',
        description: event.description || '',
        shortDescription: event.shortDescription || '',
        category: event.category || '',
        type: event.type || 'Event',
        venueType: event.venueType || 'Indoor',
        ageRangeMin: event.ageRange?.[0]?.toString() || '',
        ageRangeMax: event.ageRange?.[1]?.toString() || '',
        city: event.location?.city || '',
        address: event.location?.address || '',
        latitude: event.location?.coordinates?.lat?.toString() || '',
        longitude: event.location?.coordinates?.lng?.toString() || '',
        country: event.location?.country || '',
        state: event.location?.state || '',
        zipCode: event.location?.zipCode || '',
        meetingLink: event.meetingLink || '',
        competitionFormat: event.competitionFormat || '',
        teamSize: event.teamSize?.toString() || '',
        skillLevel: event.skillLevel || '',
        prerequisites: event.prerequisites || '',
        facilities: event.facilities || [],
        amenities: event.amenities || [],
        currency: event.currency || 'USD',
        tags: event.tags || [],
        capacity: event.capacity?.toString() || '',
        featured: event.featured || false,
        requirePhoneVerification: event.requirePhoneVerification || false,
        imageAssets: (event.imageAssets || []).map((a: any) => a._id || a),
        imagePreviewUrls: (event.imageAssets || []).map((a: any) => a.url || a.secureUrl).filter(Boolean),
        faqs: event.faqs || [],
        seoMeta: event.seoMeta || { title: '', description: '', keywords: [] },
        externalBookingLink: event.externalBookingLink || '',
        syllabus: event.syllabus || []
      });

      setBookingMethod(event.isAffiliateEvent || event.externalBookingLink ? 'external' : 'internal');
      setIsFreeEvent(event.isFreeEvent || false);
      setTimezone(event.timezone || 'Asia/Dubai');

      if (event.dateSchedule?.length > 0) {
        setSchedules(event.dateSchedule.map((s: any, index: number) => ({
          id: s._id || uuidv4(),
          _id: s._id,
          startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
          endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          availableSeats: s.unlimitedSeats ? '' : s.availableSeats?.toString() || '',
          price: s.price?.toString() || '',
          unlimitedSeats: s.unlimitedSeats || false,
          isOverride: s.isOverride || false,
          sessionType: s.sessionType || 'Standard Session',
          // Recompute isFreeSession from price as ground truth (mirrors admin transform).
          // Standard Sessions are never free; Intro Sessions are free only when price === 0.
          isFreeSession: (() => {
            const resolvedType = s.sessionType || 'Standard Session';
            if (resolvedType === 'Standard Session') return false;
            return resolvedType === 'Intro Session' && parseFloat(s.price?.toString() || '0') === 0;
          })(),
          ratePerClass: s.ratePerClass?.toString() || '',
          timeSlots: (s.timeSlots || []).map((slot: any, slotIdx: number) => ({
            id: slot._id || `slot-${index}-${slotIdx}`,
            date: slot.date ? new Date(slot.date).toISOString().split('T')[0] : '',
            startTime: slot.startTime || '',
            endTime: slot.endTime || '',
            availableSeats: slot.availableSeats?.toString() || '',
            price: slot.price?.toString() || ''
          }))
        })));
      }

      if (event.registrationForm?.fields) {
        setFormFields(event.registrationForm.fields);
      }
    }
  }, [isEditMode, eventData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'seoTitle') {
      setFormData(prev => ({ ...prev, seoMeta: { ...prev.seoMeta, title: value } }));
    } else if (name === 'seoDescription') {
      setFormData(prev => ({ ...prev, seoMeta: { ...prev.seoMeta, description: value } }));
    } else if (name === 'seoKeywords') {
      setFormData(prev => ({
        ...prev,
        seoMeta: { ...prev.seoMeta, keywords: value.split(',').map(k => k.trim()).filter(k => k.length > 0) }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSeoChange = (seoData: { title: string; description: string; keywords: string[] }) => {
    setFormData(prev => ({
      ...prev,
      seoMeta: seoData
    }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
    if (tags.length > 0 && errors.tags) {
      setErrors(prev => { const e = { ...prev }; delete e.tags; return e; });
    }
  };

  const handleFaqAdd = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { id: uuidv4(), question: '', answer: '' }]
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData(prev => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  const handleFaqRemove = (index: number) => {
    setFormData(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }));
  };

  const handleFacilitiesChange = (facilities: string[]) => {
    setFormData(prev => ({ ...prev, facilities }));
  };

  const handleAmenitiesChange = (amenities: string[]) => {
    setFormData(prev => ({ ...prev, amenities }));
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => ({ ...prev, country, city: '' }));
  };

  const handleBookingMethodChange = (method: 'internal' | 'external') => {
    setBookingMethod(method);
    if (method === 'internal') {
      setFormData(prev => ({ ...prev, externalBookingLink: '' }));
      setErrors(prev => { const e = { ...prev }; delete e.externalBookingLink; return e; });
    }
  };

  const handleImagesChange = (assets: MediaAsset[], previewUrls: string[]) => {
    setFormData(prev => ({
      ...prev,
      imageAssets: [...prev.imageAssets, ...assets.map(a => a._id)],
      imagePreviewUrls: [...prev.imagePreviewUrls, ...previewUrls]
    }));
    if (previewUrls.length > 0 && errors.images) {
      setErrors(prev => { const e = { ...prev }; delete e.images; return e; });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImageAssets = [...prev.imageAssets];
      const newImagePreviewUrls = [...prev.imagePreviewUrls];
      newImageAssets.splice(index, 1);
      newImagePreviewUrls.splice(index, 1);
      return { ...prev, imageAssets: newImageAssets, imagePreviewUrls: newImagePreviewUrls };
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const { ApiService } = await import('../../services/api');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'event');
      fd.append('folder', 'events');
      const res = await ApiService.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const asset = res?.data;
      if (asset?._id && asset?.url) {
        setFormData(prev => ({
          ...prev,
          imageAssets: [...prev.imageAssets, asset._id],
          imagePreviewUrls: [...prev.imagePreviewUrls, asset.url]
        }));
        if (errors.images) {
          setErrors(prev => { const errs = { ...prev }; delete errs.images; return errs; });
        }
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      toast.error('Image upload failed');
    } finally {
      setIsUploadingImage(false);
      if (imageFileRef.current) imageFileRef.current.value = '';
    }
  };

  const handleScheduleChange = (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => {
    setSchedules(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    const errorKey = `schedule_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => { const e = { ...prev }; delete e[errorKey]; return e; });
    }
  };

  const handleAddSchedule = (isSpecialDate: boolean = false) => {
    setSchedules(prev => [...prev, {
      id: uuidv4(),
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      availableSeats: '',
      price: '',
      isSpecialDate,
      specialDates: [],
      priority: isSpecialDate ? 1 : 0
    }]);
  };

  const handleRemoveSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.shortDescription?.trim()) newErrors.shortDescription = 'Short description is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';

    if (formData.type !== 'Venue') {
      if (!formData.ageRangeMin.trim()) newErrors.ageRangeMin = 'Minimum age is required';
      if (!formData.ageRangeMax.trim()) newErrors.ageRangeMax = 'Maximum age is required';
      if (formData.ageRangeMin && formData.ageRangeMax) {
        const minAge = parseInt(formData.ageRangeMin, 10);
        const maxAge = parseInt(formData.ageRangeMax, 10);
        if (isNaN(minAge) || isNaN(maxAge)) {
          newErrors.ageRangeMin = 'Age must be a valid number';
        } else if (minAge >= maxAge) {
          newErrors.ageRangeMax = 'Maximum age must be greater than minimum age';
        }
      }
    }

    schedules.forEach((schedule, index) => {
      if (!schedule.startDate) newErrors[`schedule_${index}_startDate`] = 'Start date is required';
      if (!schedule.endDate) newErrors[`schedule_${index}_endDate`] = 'End date is required';
      if (schedule.startDate && schedule.endDate) {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        if (end < start) newErrors[`schedule_${index}_endDate`] = 'End date must be after start date';
      }
      if (!schedule.unlimitedSeats && (!schedule.availableSeats || parseInt(schedule.availableSeats) <= 0)) {
        newErrors[`schedule_${index}_availableSeats`] = 'Available seats must be greater than 0';
      }
      if (!schedule.isFreeSession && (!schedule.price || parseFloat(schedule.price) < 0)) {
        newErrors[`schedule_${index}_price`] = 'Price must be 0 or greater';
      }
    });

    if (formData.venueType !== 'Online') {
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      const firstErrorField = Object.keys(formErrors)[0];
      if (firstErrorField && (firstErrorField.includes('schedule') || firstErrorField === 'capacity')) {
        setActiveTab('schedule');
      } else if (firstErrorField && ['city', 'address', 'latitude', 'longitude', 'seoTitle', 'seoDescription', 'seoKeywords'].includes(firstErrorField)) {
        setActiveTab('advanced');
      } else {
        setActiveTab('basic');
      }
      setTimeout(() => {
        document.querySelector<HTMLElement>(`[name="${firstErrorField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      const firstErrorMessage = Object.values(formErrors)[0];
      toast.error(`Validation error: ${firstErrorMessage}`);
      return;
    }

    try {
      const minPrice = isFreeEvent ? 0 : Math.min(...schedules.map(s => parseFloat(s.price || '0')));

      const payload = {
        isFreeEvent,
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription || undefined,
        category: formData.category,
        type: formData.type,
        venueType: formData.venueType,
        ageRange: formData.type === 'Venue' ? [0, 100] : [parseInt(formData.ageRangeMin), parseInt(formData.ageRangeMax)],
        ...(formData.competitionFormat && { competitionFormat: formData.competitionFormat }),
        ...(formData.competitionFormat === 'Team' && formData.teamSize && { teamSize: parseInt(formData.teamSize) }),
        ...(formData.skillLevel && { skillLevel: formData.skillLevel }),
        ...(formData.prerequisites && { prerequisites: formData.prerequisites }),
        ...(formData.facilities.length > 0 && { facilities: formData.facilities }),
        ...(formData.amenities.length > 0 && { amenities: formData.amenities }),
        location: {
          city: formData.city,
          address: formData.address,
          ...(formData.country && { country: formData.country }),
          ...(formData.state && { state: formData.state }),
          ...(formData.zipCode && { zipCode: formData.zipCode }),
          coordinates: {
            lat: parseFloat(formData.latitude) || 0,
            lng: parseFloat(formData.longitude) || 0
          }
        },
        ...(formData.meetingLink && { meetingLink: formData.meetingLink }),
        price: minPrice,
        currency: "AED",
        ...(schedules.length > 0 && parseInt(schedules[0].availableSeats) > 0 ? { capacity: parseInt(schedules[0].availableSeats) } : {}),
        requirePhoneVerification: formData.requirePhoneVerification,
        tags: formData.tags,
        timezone,
        dateSchedule: schedules.map(schedule => ({
          _id: schedule._id,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
          availableSeats: schedule.unlimitedSeats ? 999999 : parseInt(schedule.availableSeats),
          // Normalize before sending: Standard is never free; Intro is always free.
          price: isFreeEvent ? 0 : (schedule.sessionType === 'Intro Session' ? 0 : parseFloat(schedule.price) || 0),
          isFreeSession: schedule.sessionType === 'Standard Session' ? false : !!(schedule.isFreeSession || schedule.sessionType === 'Intro Session'),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isOverride: schedule.isOverride || false,
          sessionType: schedule.sessionType || 'Standard Session',
          ratePerClass: schedule.ratePerClass ? parseFloat(schedule.ratePerClass) : undefined,
          timeSlots: schedule.timeSlots || []
        })),
        syllabus: formData.syllabus,
        imageAssets: formData.imageAssets,
        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description: formData.seoMeta.description || formData.description.substring(0, 160),
          keywords: formData.seoMeta.keywords.length > 0
            ? formData.seoMeta.keywords
            : formData.tags
        },
        externalBookingLink: bookingMethod === 'external' ? formData.externalBookingLink : '',
        faqs: formData.faqs.map(({ question, answer }) => ({ question, answer })),
        isAffiliateEvent: bookingMethod === 'external',
        registrationForm: formFields.length > 0 ? {
          isEnabled: true,
          fields: formFields
        } : undefined
      };

      if (isEditMode) {
        await updateMutation.mutateAsync({ eventId: id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      
      window.location.href = '/vendor/events';
    } catch (error: any) {
      console.error('Error saving event:', error);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isLoadingEvent) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title={`Vendor - ${isEditMode ? 'Edit' : 'Create'} Event | Kidrove`} description={`${isEditMode ? 'Edit' : 'Create a new'} event`} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/vendor/events')}
              className="p-2 text-gray-600 hover:text-green-600 transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'Edit Event' : 'Create New Event'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode ? 'Update your event details' : 'Fill in the details to create a new event'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {!isSaving && <FaSave className="w-4 h-4" />}
            {isSaving ? 'Saving...' : isEditMode ? 'Update Event' : 'Create Event'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {[
              { id: 'basic', label: 'Basic Info', icon: <FaInfoCircle className="w-4 h-4" /> },
              { id: 'schedule', label: 'Schedule & Pricing', icon: <FaCalendarAlt className="w-4 h-4" /> },
              { id: 'advanced', label: 'Advanced Settings', icon: <FaPlus className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'basic' | 'schedule' | 'advanced')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-green-600 hover:bg-gray-50'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'basic' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <BasicInfoTab
                  formData={formData}
                  categories={categories}
                  errors={errors}
                  onInputChange={handleInputChange}
                  onImagesChange={handleImagesChange}
                  onRemoveImage={removeImage}
                  onTagsChange={handleTagsChange}
                  isUploadingImage={isUploadingImage}
                  onImageUpload={handleImageFileUpload}
                  imageFileRef={imageFileRef}
                  bookingMethod={bookingMethod}
                  onBookingMethodChange={handleBookingMethodChange}
                  onSyllabusChange={(syllabus) => setFormData(prev => ({ ...prev, syllabus }))}
                />
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Timezone */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
                  >
                    {TIMEZONE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-400 mt-1.5">All session start/end times are interpreted in this timezone.</div>
                </div>

                <SchedulePricingTab
                  schedules={schedules}
                  currency={formData.currency}
                  capacity={formData.capacity}
                  basePrice={basePrice}
                  isFreeEvent={isFreeEvent}
                  unlimitedCapacity={unlimitedCapacity}
                  isEducational={['Course', 'Workshop', 'Bootcamp', 'Class', 'Masterclass'].includes(formData.type)}
                  errors={errors}
                  onScheduleChange={handleScheduleChange}
                  onAddSchedule={handleAddSchedule}
                  onRemoveSchedule={handleRemoveSchedule}
                  onCurrencyChange={handleInputChange}
                  onCapacityChange={handleInputChange}
                  onBasePriceChange={(e) => setBasePrice(e.target.value)}
                  onFreeEventChange={setIsFreeEvent}
                  onUnlimitedCapacityChange={setUnlimitedCapacity}
                />
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AdvancedTab
                  formData={formData}
                  venueType={formData.venueType}
                  faqs={formData.faqs}
                  onFaqAdd={handleFaqAdd}
                  onFaqChange={handleFaqChange}
                  onFaqRemove={handleFaqRemove}
                  onFacilitiesChange={handleFacilitiesChange}
                  onAmenitiesChange={handleAmenitiesChange}
                  onCountryChange={handleCountryChange}
                  errors={errors}
                  onInputChange={handleInputChange}
                  onSeoChange={handleSeoChange}
                  eventData={{
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    tags: formData.tags,
                    _id: id,
                  }}
                  imagePreviewUrl={formData.imagePreviewUrls[0]}
                />
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
            <button
              type="button"
              onClick={() => {
                const tabOrder = ['basic', 'schedule', 'advanced'];
                const idx = tabOrder.indexOf(activeTab);
                if (idx > 0) setActiveTab(tabOrder[idx - 1] as 'basic' | 'schedule' | 'advanced');
              }}
              disabled={activeTab === 'basic'}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                const tabOrder = ['basic', 'schedule', 'advanced'];
                const idx = tabOrder.indexOf(activeTab);
                if (idx < tabOrder.length - 1) {
                  setActiveTab(tabOrder[idx + 1] as 'basic' | 'schedule' | 'advanced');
                } else {
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                }
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow"
            >
              {activeTab === 'advanced' ? (isEditMode ? 'Save Changes' : 'Create Event') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorEventFormPage;
