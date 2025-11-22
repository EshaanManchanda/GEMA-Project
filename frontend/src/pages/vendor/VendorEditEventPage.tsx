import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import vendorAPI from '../../services/api/vendorAPI';
import categoriesAPI from '../../services/api/categoriesAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import BasicInfoTab from '../../components/vendor/BasicInfoTab';
import SchedulePricingTab from '../../components/vendor/SchedulePricingTab';
import AdvancedTab from '../../components/vendor/AdvancedTab';
import FormBuilder from '@/components/registration/FormBuilder';
import CancelEventModal from '../../components/vendor/CancelEventModal';

interface EventFormData {
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRangeMin: string;
  ageRangeMax: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  currency: string;
  tags: string;
  capacity: string;
  featured: boolean;
  requirePhoneVerification: boolean;
  images: File[];
  imagePreviewUrls: string[];
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
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
}

interface Category {
  id: string;
  name: string;
}

const VendorEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we should open form builder tab from route state
  const initialTab = location.state?.activeTab === 'formBuilder' ? 'formBuilder' : 'basic';
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'advanced' | 'formBuilder'>(initialTab);

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
    currency: 'USD',
    tags: '',
    capacity: '',
    featured: false,
    requirePhoneVerification: false,
    images: [],
    imagePreviewUrls: [],
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    }
  });

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

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

    const fetchEventData = async () => {
      if (!id) {
        navigate('/vendor/events');
        return;
      }

      try {
        setIsLoading(true);
        const response = await vendorAPI.getVendorEventById(id);
        const eventData = response.data?.event || response.event;

        setFormData({
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          type: eventData.type,
          venueType: eventData.venueType,
          ageRangeMin: eventData.ageRange?.[0]?.toString() || '',
          ageRangeMax: eventData.ageRange?.[1]?.toString() || '',
          city: eventData.location?.city || '',
          address: eventData.location?.address || '',
          latitude: eventData.location?.coordinates?.lat?.toString() || '',
          longitude: eventData.location?.coordinates?.lng?.toString() || '',
          currency: eventData.currency || 'USD',
          tags: eventData.tags?.join(', ') || '',
          capacity: eventData.capacity?.toString() || '',
          featured: eventData.isFeatured || false,
          requirePhoneVerification: eventData.requirePhoneVerification || false,
          images: [],
          imagePreviewUrls: eventData.images || [],
          seoMeta: {
            title: eventData.seoMeta?.title || '',
            description: eventData.seoMeta?.description || '',
            keywords: eventData.seoMeta?.keywords || []
          }
        });

        // Transform dateSchedule to schedules format
        const transformedSchedules = eventData.dateSchedule?.map((schedule: any) => ({
          id: schedule._id || uuidv4(),
          _id: schedule._id,
          startDate: schedule.startDate ? new Date(schedule.startDate).toISOString().split('T')[0] :
                     schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
          endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().split('T')[0] :
                   schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
          availableSeats: schedule.availableSeats?.toString() || '',
          price: schedule.price?.toString() || '',
          unlimitedSeats: schedule.unlimitedSeats || false,
          isOverride: schedule.isOverride || false
        })) || [];

        setSchedules(transformedSchedules.length > 0 ? transformedSchedules : [{
          id: uuidv4(),
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          availableSeats: '',
          price: ''
        }]);

      } catch (error) {
        console.error('Error fetching event data:', error);
        setSaveStatus({
          type: 'error',
          message: 'Failed to load event data. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
    fetchEventData();
  }, [id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'seoTitle') {
      setFormData(prev => ({
        ...prev,
        seoMeta: { ...prev.seoMeta, title: value }
      }));
    } else if (name === 'seoDescription') {
      setFormData(prev => ({
        ...prev,
        seoMeta: { ...prev.seoMeta, description: value }
      }));
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleImagesChange = (images: File[], previewUrls: string[]) => {
    setFormData(prev => ({
      ...prev,
      images: images,
      imagePreviewUrls: previewUrls
    }));

    // Clear errors if images are added
    if (images.length > 0 && errors.images) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const newImagePreviewUrls = [...prev.imagePreviewUrls];

      if (newImagePreviewUrls[index].startsWith('blob:')) {
        URL.revokeObjectURL(newImagePreviewUrls[index]);
      }

      newImages.splice(index, 1);
      newImagePreviewUrls.splice(index, 1);

      return {
        ...prev,
        images: newImages,
        imagePreviewUrls: newImagePreviewUrls
      };
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
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
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

    schedules.forEach((schedule, index) => {
      if (!schedule.startDate) {
        newErrors[`schedule_${index}_startDate`] = 'Start date is required';
      }
      if (!schedule.endDate) {
        newErrors[`schedule_${index}_endDate`] = 'End date is required';
      }
      if (schedule.startDate && schedule.endDate) {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);

        if (end < start) {
          newErrors[`schedule_${index}_endDate`] = 'End date must be after start date';
        }
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
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstErrorField = Object.keys(errors)[0];

      if (firstErrorField && (firstErrorField.includes('schedule') || firstErrorField === 'capacity')) {
        setActiveTab('schedule');
      } else if (firstErrorField && ['city', 'address', 'latitude', 'longitude', 'seoTitle', 'seoDescription', 'seoKeywords'].includes(firstErrorField)) {
        setActiveTab('advanced');
      } else {
        setActiveTab('basic');
      }

      setTimeout(() => {
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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
        ageRange: [parseInt(formData.ageRangeMin), parseInt(formData.ageRangeMax)],
        location: {
          city: formData.city,
          address: formData.address,
          coordinates: {
            lat: parseFloat(formData.latitude) || 0,
            lng: parseFloat(formData.longitude) || 0
          }
        },
        price: minPrice,
        currency: formData.currency,
        capacity: parseInt(formData.capacity),
        requirePhoneVerification: formData.requirePhoneVerification,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        dateSchedule: schedules.map(schedule => ({
          ...(schedule._id && { _id: schedule._id }),
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
          availableSeats: schedule.unlimitedSeats ? 999999 : parseInt(schedule.availableSeats),
          price: parseFloat(schedule.price),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isOverride: schedule.isOverride || false
        })),
        images: formData.imagePreviewUrls,
        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description: formData.seoMeta.description || formData.description.substring(0, 160),
          keywords: formData.seoMeta.keywords.length > 0
            ? formData.seoMeta.keywords
            : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        }
      };

      await vendorAPI.updateVendorEvent(id!, eventData);

      setSaveStatus({
        type: 'success',
        message: 'Event updated successfully!'
      });

      setTimeout(() => {
        navigate('/vendor/events');
      }, 2000);

    } catch (error: any) {
      console.error('Error updating event:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update event. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <VendorNavigation />
        <div className="flex justify-center items-center min-h-screen">
          <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </>
    );
  }

  return (
    <>
      <VendorNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancel Event
              </button>
              <button
                onClick={() => navigate('/vendor/events')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Back
              </button>
            </div>
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
                <button
                  type="button"
                  onClick={() => setActiveTab('formBuilder')}
                  className={`
                    px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center
                    ${activeTab === 'formBuilder'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-md'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                    }
                  `}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Registration Form
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
                    onCheckboxChange={handleCheckboxChange}
                    onImagesChange={handleImagesChange}
                    onRemoveImage={removeImage}
                  />
                )}

                {activeTab === 'schedule' && (
                  <SchedulePricingTab
                    schedules={schedules}
                    currency={formData.currency}
                    capacity={formData.capacity}
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
                    errors={errors}
                    onInputChange={handleInputChange}
                    onCheckboxChange={handleCheckboxChange}
                  />
                )}

                {activeTab === 'formBuilder' && id && (
                  <FormBuilder
                    eventId={id}
                    onSaveSuccess={() => {
                      setSaveStatus({
                        type: 'success',
                        message: 'Registration form saved successfully!'
                      });
                      setTimeout(() => setSaveStatus(null), 3000);
                    }}
                  />
                )}
              </div>

              {/* Navigation Buttons (hide for form builder tab) */}
              {activeTab !== 'formBuilder' && (
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
                            Saving...
                          </>
                        ) : 'Save Changes'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Cancel Event Modal */}
      <CancelEventModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        eventId={id || ''}
        eventTitle={formData.title}
        onSuccess={() => navigate('/vendor/events')}
      />
    </>
  );
};

export default VendorEditEventPage;
