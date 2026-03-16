import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import vendorAPI from '../../services/api/vendorAPI';
import categoriesAPI from '../../services/api/categoriesAPI';
import { MediaAsset } from '../../store/slices/mediaSlice';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import BasicInfoTab from '../../components/vendor/BasicInfoTab';
import SchedulePricingTab from '../../components/vendor/SchedulePricingTab';
import AdvancedTab from '../../components/vendor/AdvancedTab';

interface EventFormData {
  title: string;
  description: string;
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
}

interface Category {
  id: string;
  name: string;
}

const VendorCreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'advanced'>('basic');

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
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
    competitionFormat: '',
    teamSize: '',
    skillLevel: '',
    prerequisites: '',
    facilities: [],
    amenities: [],
    currency: 'USD',
    tags: [],
    capacity: '',
    featured: false,
    requirePhoneVerification: false,
    imageAssets: [],
    imagePreviewUrls: [],
    faqs: [],
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    },
    externalBookingLink: ''
  });

  const [bookingMethod, setBookingMethod] = useState<'internal' | 'external'>('internal');

  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: uuidv4(),
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      availableSeats: '',
      price: ''
    }
  ]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState<boolean>(false);

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
        console.error('Error fetching categories:', error);
        setCategories([
          { id: 'arts', name: 'Arts & Crafts' },
          { id: 'science', name: 'Science & Technology' },
          { id: 'sports', name: 'Sports & Activities' },
          { id: 'music', name: 'Music & Dance' },
          { id: 'food', name: 'Food & Cooking' }
        ]);
      }
    };

    fetchCategories();
  }, []);

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
      setErrors(prev => { const e = { ...prev }; delete e[name]; return e; });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (start < today) newErrors[`schedule_${index}_startDate`] = 'Start date must be in the future';
        if (end < start) newErrors[`schedule_${index}_endDate`] = 'End date must be after start date';
      }
      if (!schedule.unlimitedSeats && (!schedule.availableSeats || parseInt(schedule.availableSeats) <= 0)) {
        newErrors[`schedule_${index}_availableSeats`] = 'Available seats must be greater than 0';
      }
      if (!schedule.price || parseFloat(schedule.price) < 0) {
        newErrors[`schedule_${index}_price`] = 'Price must be 0 or greater';
      }
    });

    if (!formData.capacity.trim() || parseInt(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (formData.venueType !== 'Online' && !formData.address.trim()) newErrors.address = 'Address is required';

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
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const minPrice = Math.min(...schedules.map(s => parseFloat(s.price)));

      const eventData = {
        title: formData.title,
        description: formData.description,
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
        currency: formData.currency,
        capacity: parseInt(formData.capacity),
        requirePhoneVerification: formData.requirePhoneVerification,
        tags: formData.tags,
        dateSchedule: schedules.map(schedule => ({
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
          availableSeats: schedule.unlimitedSeats ? 999999 : parseInt(schedule.availableSeats),
          price: parseFloat(schedule.price),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isOverride: schedule.isOverride || false
        })),
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
        isAffiliateEvent: bookingMethod === 'external'
      };

      const response = await vendorAPI.createVendorEvent(eventData);
      const newEventId = response.event?._id || response.event?.id;

      setSaveStatus({ type: 'success', message: 'Event created successfully! Redirecting to edit page...' });

      setTimeout(() => {
        navigate(`/vendor/events/${newEventId}/edit`);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating event:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create event. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PrivatePageSEO title="Vendor - Create Event | Kidrove" description="Create a new event" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            <button
              onClick={() => navigate('/vendor/events')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Back
            </button>
          </div>

          {saveStatus && (
            <div className={`p-4 mb-6 rounded-lg ${saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {saveStatus.message}
            </div>
          )}

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-2 p-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`
                    px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                    ${activeTab === 'basic'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-md'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                    }
                  `}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className={`
                    px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                    ${activeTab === 'schedule'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-md'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                    }
                  `}
                >
                  Schedule & Pricing
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('advanced')}
                  className={`
                    px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                    ${activeTab === 'advanced'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-md'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                    }
                  `}
                >
                  Advanced
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                {activeTab === 'basic' && (
                  <BasicInfoTab
                    formData={formData}
                    categories={categories}
                    errors={errors}
                    onInputChange={handleInputChange}
                    onImagesChange={handleImagesChange}
                    onRemoveImage={removeImage}
                    onTagsChange={handleTagsChange}
                    showMediaPicker={showMediaPicker}
                    onOpenMediaPicker={() => setShowMediaPicker(true)}
                    onCloseMediaPicker={() => setShowMediaPicker(false)}
                    bookingMethod={bookingMethod}
                    onBookingMethodChange={handleBookingMethodChange}
                  />
                )}

                {activeTab === 'schedule' && (
                  <SchedulePricingTab
                    schedules={schedules}
                    currency={formData.currency}
                    capacity={formData.capacity}
                    eventType={formData.type}
                    errors={errors}
                    onScheduleChange={handleScheduleChange}
                    onAddSchedule={handleAddSchedule}
                    onRemoveSchedule={handleRemoveSchedule}
                    onCurrencyChange={handleInputChange}
                    onCapacityChange={handleInputChange}
                  />
                )}

                {activeTab === 'advanced' && (
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
                    onCheckboxChange={handleCheckboxChange}
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'schedule') setActiveTab('basic');
                    else if (activeTab === 'advanced') setActiveTab('schedule');
                  }}
                  disabled={activeTab === 'basic'}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate('/vendor/events')}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>

                  {activeTab !== 'advanced' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'basic') setActiveTab('schedule');
                        else if (activeTab === 'schedule') setActiveTab('advanced');
                      }}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : 'Create Event'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorCreateEventPage;
