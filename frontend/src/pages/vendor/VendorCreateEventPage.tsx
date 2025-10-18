import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import eventsAPI from '../../services/api/eventsAPI';
import categoriesAPI from '../../services/api/categoriesAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import BasicInfoTab from '../../components/vendor/BasicInfoTab';
import SchedulePricingTab from '../../components/vendor/SchedulePricingTab';
import AdvancedTab from '../../components/vendor/AdvancedTab';

interface EventFormData {
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor';
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
  availableSeats: string;
  price: string;
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
    currency: 'USD',
    tags: '',
    capacity: '',
    featured: false,
    images: [],
    imagePreviewUrls: [],
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    }
  });

  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: uuidv4(),
      startDate: '',
      endDate: '',
      availableSeats: '',
      price: ''
    }
  ]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

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

    // Handle SEO meta fields
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      const validFiles = filesArray.filter(file => {
        const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
        const isValidSize = file.size <= 5 * 1024 * 1024;

        if (!isValidType) {
          setErrors(prev => ({ ...prev, images: 'Only JPG, JPEG, and PNG files are allowed.' }));
        } else if (!isValidSize) {
          setErrors(prev => ({ ...prev, images: 'Image size should not exceed 5MB.' }));
        }

        return isValidType && isValidSize;
      });

      if (validFiles.length > 0) {
        const newImagePreviewUrls = validFiles.map(file => URL.createObjectURL(file));

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...validFiles],
          imagePreviewUrls: [...prev.imagePreviewUrls, ...newImagePreviewUrls]
        }));

        if (errors.images) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.images;
            return newErrors;
          });
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const newImagePreviewUrls = [...prev.imagePreviewUrls];

      URL.revokeObjectURL(newImagePreviewUrls[index]);

      newImages.splice(index, 1);
      newImagePreviewUrls.splice(index, 1);

      return {
        ...prev,
        images: newImages,
        imagePreviewUrls: newImagePreviewUrls
      };
    });
  };

  const handleScheduleChange = (index: number, field: keyof Schedule, value: string) => {
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

  const handleAddSchedule = () => {
    setSchedules(prev => [...prev, {
      id: uuidv4(),
      startDate: '',
      endDate: '',
      availableSeats: '',
      price: ''
    }]);
  };

  const handleRemoveSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic info validation
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.ageRangeMin.trim()) newErrors.ageRangeMin = 'Minimum age is required';
    if (!formData.ageRangeMax.trim()) newErrors.ageRangeMax = 'Maximum age is required';

    // Age range validation
    if (formData.ageRangeMin && formData.ageRangeMax) {
      const minAge = parseInt(formData.ageRangeMin, 10);
      const maxAge = parseInt(formData.ageRangeMax, 10);
      if (isNaN(minAge) || isNaN(maxAge)) {
        newErrors.ageRangeMin = 'Age must be a valid number';
      } else if (minAge >= maxAge) {
        newErrors.ageRangeMax = 'Maximum age must be greater than minimum age';
      }
    }

    // Schedule validation
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
          newErrors[`schedule_${index}_startDate`] = 'Start date must be in the future';
        }
        if (end < start) {
          newErrors[`schedule_${index}_endDate`] = 'End date must be after start date';
        }
      }
      if (!schedule.availableSeats || parseInt(schedule.availableSeats) <= 0) {
        newErrors[`schedule_${index}_availableSeats`] = 'Available seats must be greater than 0';
      }
      if (!schedule.price || parseFloat(schedule.price) < 0) {
        newErrors[`schedule_${index}_price`] = 'Price must be 0 or greater';
      }
    });

    if (!formData.capacity.trim() || parseInt(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    // Location validation
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstErrorField = Object.keys(errors)[0];

      // Navigate to tab containing the error
      if (firstErrorField.includes('schedule') || firstErrorField === 'capacity') {
        setActiveTab('schedule');
      } else if (['city', 'address', 'latitude', 'longitude', 'seoTitle', 'seoDescription', 'seoKeywords'].includes(firstErrorField)) {
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

    setIsLoading(true);
    setSubmitStatus('loading');

    try {
      // Calculate the minimum price from all schedules
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
        featured: formData.featured,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        dateSchedule: schedules.map(schedule => ({
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          availableSeats: parseInt(schedule.availableSeats),
          price: parseFloat(schedule.price)
        })),
        images: [],
        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description: formData.seoMeta.description || formData.description.substring(0, 160),
          keywords: formData.seoMeta.keywords.length > 0
            ? formData.seoMeta.keywords
            : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        },
        faqs: []
      };

      const response = await eventsAPI.createEvent(eventData);

      setSubmitStatus('success');
      setSubmitMessage('Event created successfully!');
      setCreatedEventId(response.data.event._id || response.data.event.id);

    } catch (error: any) {
      console.error('Error creating event:', error);
      setSubmitStatus('error');
      const errorMessage = error.response?.data?.message || 'Failed to create event. Please try again.';
      setSubmitMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToNextTab = (tab: 'basic' | 'schedule' | 'advanced'): boolean => {
    if (tab === 'basic') {
      return !!(formData.title && formData.description && formData.category && formData.ageRangeMin && formData.ageRangeMax);
    } else if (tab === 'schedule') {
      return schedules.every(s => s.startDate && s.endDate && s.availableSeats && s.price) && !!formData.capacity;
    } else if (tab === 'advanced') {
      return !!(formData.city && formData.address);
    }
    return false;
  };

  return (
    <>
      <VendorNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            <button
              onClick={() => navigate('/vendor/events')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
          </div>

          {submitStatus === 'success' && createdEventId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    {submitMessage}
                  </h3>
                  <p className="text-sm text-green-800 mb-4">
                    What would you like to do next?
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate(`/vendor/events/${createdEventId}/edit`, { state: { activeTab: 'formBuilder' } })}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Configure Registration Form
                    </button>
                    <button
                      onClick={() => navigate(`/vendor/events/${createdEventId}/edit`)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit Event
                    </button>
                    <button
                      onClick={() => navigate('/vendor/events')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back to Events
                    </button>
                    <button
                      onClick={() => {
                        setSubmitStatus('idle');
                        setCreatedEventId(null);
                        window.location.reload();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Another Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{submitMessage}</p>
            </div>
          )}

          {submitStatus !== 'success' && (
            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-1 p-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center
                      ${activeTab === 'basic'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    Basic Info
                    {canProceedToNextTab('basic') && activeTab !== 'basic' && (
                      <svg className="ml-2 w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('schedule')}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center
                      ${activeTab === 'schedule'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    Schedule & Pricing
                    {canProceedToNextTab('schedule') && activeTab !== 'schedule' && (
                      <svg className="ml-2 w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('advanced')}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center
                      ${activeTab === 'advanced'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    Advanced
                    {canProceedToNextTab('advanced') && activeTab !== 'advanced' && (
                      <svg className="ml-2 w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'basic' && (
                  <BasicInfoTab
                    formData={formData}
                    categories={categories}
                    errors={errors}
                    onInputChange={handleInputChange}
                    onCheckboxChange={handleCheckboxChange}
                    onImageUpload={handleImageUpload}
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
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                      {isLoading ? (
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
          )}
        </div>
      </div>
    </>
  );
};

export default VendorCreateEventPage;
