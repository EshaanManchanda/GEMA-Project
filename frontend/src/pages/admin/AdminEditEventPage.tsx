import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventsAPI from '../../services/api/eventsAPI';
import adminAPI from '../../services/api/adminAPI';
import FormBuilder from '@/components/registration/FormBuilder';
import BasicInfoTab from '../../components/admin/BasicInfoTab';
import SchedulePricingTab from '../../components/admin/SchedulePricingTab';
import AdvancedTab from '../../components/admin/AdvancedTab';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Schedule {
  id: string;
  _id?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  availableSeats: string;
  totalSeats?: string;
  soldSeats?: string;
  reservedSeats?: string;
  price: string;
  unlimitedSeats?: boolean;
  isSpecialDate?: boolean;
  specialDates?: string[];
  priority?: number;
  isOverride?: boolean;
}

interface FAQ {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
}

interface EventFormData {
  // Basic Info
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRangeMin: string;
  ageRangeMax: string;
  tags: string;
  images: File[];
  imagePreviewUrls: string[];

  // Admin-specific fields
  isApproved: boolean;
  isFeatured: boolean;
  requirePhoneVerification: boolean;
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  isActive: boolean;
  vendorId: string;

  // Affiliate Event fields
  isAffiliateEvent: boolean;
  externalBookingLink: string;
  claimStatus: 'unclaimed' | 'claimed' | 'not_claimable';

  // Schedule & Pricing
  basePrice: string;
  currency: string;
  capacity: string;

  // Location (in Advanced tab)
  city: string;
  address: string;
  latitude: string;
  longitude: string;

  // SEO
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };

  // FAQs
  faqs: FAQ[];
}

interface Category {
  id: string;
  name: string;
}

interface Vendor {
  _id: string;
  businessName: string;
  email: string;
}

type TabType = 'basic' | 'schedule' | 'advanced' | 'registration';

const AdminEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category: '',
    type: 'Event',
    venueType: 'Indoor',
    ageRangeMin: '',
    ageRangeMax: '',
    tags: '',
    images: [],
    imagePreviewUrls: [],
    isApproved: false,
    isFeatured: false,
    requirePhoneVerification: false,
    status: 'pending',
    isActive: true,
    vendorId: '',
    isAffiliateEvent: false,
    externalBookingLink: '',
    claimStatus: 'not_claimable',
    basePrice: '',
    currency: 'AED',
    capacity: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    },
    faqs: []
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch categories, vendors, and event data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch categories
        const categoriesData = await eventsAPI.getEventCategories();
        const categoriesArray = Array.isArray(categoriesData)
          ? categoriesData
          : (categoriesData?.categories || []);
        const transformedCategories: Category[] = categoriesArray.map((cat: any) => ({
          id: cat._id || cat.id || cat,
          name: cat.name || cat
        }));
        setCategories(transformedCategories);

        // Fetch vendors
        const vendorsResponse = await adminAPI.getVendorsList();
        // Handle the response structure: data.vendors is the expected format from new endpoint
        const vendorsData = vendorsResponse?.data?.vendors || vendorsResponse?.vendors || vendorsResponse?.users || vendorsResponse?.data || [];
        // Extra safety: if vendorsData is not an array, make it an empty array
        const vendorsArray = Array.isArray(vendorsData) ? vendorsData : [];
        console.log('Loaded vendors:', vendorsArray);
        setVendors(vendorsArray);

        // Fetch event data if editing
        if (id) {
          const response = await adminAPI.getEventById(id);
          console.log("event data:",response)
          const eventData = response.event || response;

          if (!eventData) {
            setSaveStatus({
              type: 'error',
              message: 'Event not found or data is unavailable.'
            });
            return;
          }

          // Transform event data to form format
          setFormData({
            title: eventData.title || '',
            description: eventData.description || '',
            category: eventData.category || '',
            type: eventData.type || 'Event',
            venueType: eventData.venueType || 'Indoor',
            ageRangeMin: eventData.ageRange?.[0]?.toString() || '',
            ageRangeMax: eventData.ageRange?.[1]?.toString() || '',
            tags: eventData.tags?.join(', ') || '',
            images: [],
            imagePreviewUrls: eventData.images || [],
            isApproved: eventData.isApproved || false,
            isFeatured: eventData.isFeatured || false,
            requirePhoneVerification: eventData.requirePhoneVerification || false,
            status: eventData.status || 'pending',
            isActive: eventData.isActive !== undefined ? eventData.isActive : true,
            vendorId: typeof eventData.vendorId === 'object'
              ? (eventData.vendorId?._id || '')
              : (eventData.vendorId || ''),
            isAffiliateEvent: eventData.isAffiliateEvent || false,
            externalBookingLink: eventData.externalBookingLink || '',
            claimStatus: eventData.claimStatus || 'not_claimable',
            basePrice: eventData.price?.toString() || '',
            currency: eventData.currency || 'AED',
            capacity: eventData.dateSchedule?.[0]?.totalSeats?.toString()
              || eventData.dateSchedule?.[0]?.availableSeats?.toString()
              || '',
            city: eventData.location?.city || '',
            address: eventData.location?.address || '',
            latitude: eventData.location?.coordinates?.lat?.toString() || '',
            longitude: eventData.location?.coordinates?.lng?.toString() || '',
            seoMeta: {
              title: eventData.seoMeta?.title || '',
              description: eventData.seoMeta?.description || '',
              keywords: eventData.seoMeta?.keywords || []
            },
            faqs: eventData.faqs || []
          });

          // Transform schedules
          const transformedSchedules: Schedule[] = (eventData.dateSchedule || []).map((schedule: any, index: number) => ({
            id: schedule._id || `schedule-${index}`,
            _id: schedule._id,
            startDate: schedule.startDate
              ? new Date(schedule.startDate).toISOString().split('T')[0]
              : schedule.date
                ? new Date(schedule.date).toISOString().split('T')[0]
                : '',
            endDate: schedule.endDate
              ? new Date(schedule.endDate).toISOString().split('T')[0]
              : schedule.date
                ? new Date(schedule.date).toISOString().split('T')[0]
                : '',
            startTime: schedule.startTime || '',
            endTime: schedule.endTime || '',
            availableSeats: schedule.availableSeats?.toString() || '',
            totalSeats: schedule.totalSeats?.toString() || schedule.availableSeats?.toString() || '',
            soldSeats: schedule.soldSeats?.toString() || '0',
            reservedSeats: schedule.reservedSeats?.toString() || '0',
            price: schedule.price?.toString() || '',
            unlimitedSeats: schedule.unlimitedSeats || false,
            isSpecialDate: schedule.isSpecialDate || false,
            specialDates: schedule.specialDates?.map((d: any) =>
              new Date(d).toISOString().split('T')[0]
            ) || [],
            priority: schedule.priority || 0,
            isOverride: schedule.isOverride || false
          }));

          setSchedules(transformedSchedules.length > 0 ? transformedSchedules : [{
            id: 'schedule-1',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            availableSeats: '',
            totalSeats: '',
            price: '',
            unlimitedSeats: false,
            isSpecialDate: false,
            specialDates: [],
            priority: 0,
            isOverride: false
          }]);
        } else {
          // Initialize with one empty schedule for new events
          setSchedules([{
            id: 'schedule-1',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            availableSeats: '',
            totalSeats: '',
            price: '',
            unlimitedSeats: false,
            isSpecialDate: false,
            specialDates: [],
            priority: 0,
            isOverride: false
          }]);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setSaveStatus({
          type: 'error',
          message: error.response?.data?.message || 'Failed to load data. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Input change handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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
      const newImages = prev.images.filter((_, i) => i !== index);
      const newImagePreviewUrls = prev.imagePreviewUrls.filter((_, i) => i !== index);

      return {
        ...prev,
        images: newImages,
        imagePreviewUrls: newImagePreviewUrls
      };
    });
  };

  // Schedule management
  const handleScheduleChange = (index: number, field: keyof Schedule, value: string | boolean | string[] | number) => {
    setSchedules(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Clear schedule-specific errors
    const errorKey = `schedule_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const handleAddSchedule = (isSpecialDate: boolean = false) => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      availableSeats: '',
      totalSeats: '',
      price: formData.basePrice || '',
      unlimitedSeats: false,
      isSpecialDate,
      specialDates: [],
      priority: 0,
      isOverride: false
    };
    setSchedules(prev => [...prev, newSchedule]);
  };

  const handleRemoveSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(prev => prev.filter((_, i) => i !== index));
    }
  };

  // FAQ management
  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData(prev => {
      const updatedFaqs = [...prev.faqs];
      updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
      return { ...prev, faqs: updatedFaqs };
    });

    const errorKey = `faq_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const handleAddFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { id: `faq-${Date.now()}`, question: '', answer: '' }]
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  // SEO change handler
  const handleSeoChange = useCallback((seoData: any) => {
    setFormData(prev => ({
      ...prev,
      seoMeta: {
        title: seoData.title,
        description: seoData.description,
        keywords: seoData.keywords
      }
    }));
  }, []);

  // Validation
  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    // Basic Info validation
    if (activeTab === 'basic' || activeTab === 'schedule') {
      if (!formData.title?.trim()) newErrors.title = 'Title is required';
      if (!formData.description?.trim()) newErrors.description = 'Description is required';
      if (!formData.category) newErrors.category = 'Category is required';
      if (!formData.isAffiliateEvent && (!formData.vendorId || formData.vendorId.trim() === '')) {
        newErrors.vendorId = 'Vendor assignment is required';
      }
      if (!formData.ageRangeMin?.trim()) newErrors.ageRangeMin = 'Minimum age is required';
      if (!formData.ageRangeMax?.trim()) newErrors.ageRangeMax = 'Maximum age is required';

      // Age range validation
      if (formData.ageRangeMin && formData.ageRangeMax) {
        const minAge = parseInt(formData.ageRangeMin);
        const maxAge = parseInt(formData.ageRangeMax);
        if (isNaN(minAge) || isNaN(maxAge)) {
          newErrors.ageRangeMin = 'Age must be a valid number';
        } else if (minAge >= maxAge) {
          newErrors.ageRangeMax = 'Maximum age must be greater than minimum age';
        }
      }
    }

    // Schedule validation
    if (activeTab === 'schedule') {
      if (!formData.basePrice?.trim()) {
        newErrors.basePrice = 'Base price is required';
      } else if (isNaN(parseFloat(formData.basePrice)) || parseFloat(formData.basePrice) < 0) {
        newErrors.basePrice = 'Price must be a valid number greater than or equal to 0';
      }

      if (!formData.capacity?.trim()) {
        newErrors.capacity = 'Event capacity is required';
      }

      // Validate each schedule
      schedules.forEach((schedule, index) => {
        if (!schedule.isSpecialDate) {
          if (!schedule.startDate) {
            newErrors[`schedule_${index}_startDate`] = 'Start date is required';
          }
          if (!schedule.endDate) {
            newErrors[`schedule_${index}_endDate`] = 'End date is required';
          }
        }

        if (!schedule.unlimitedSeats && !schedule.availableSeats) {
          newErrors[`schedule_${index}_availableSeats`] = 'Available seats is required';
        }

        if (!schedule.price) {
          newErrors[`schedule_${index}_price`] = 'Price is required';
        }
      });
    }

    // Advanced tab validation
    if (activeTab === 'advanced') {
      if (!formData.city?.trim()) newErrors.city = 'City is required';
      if (!formData.address?.trim()) newErrors.address = 'Address is required';

      // FAQ validation
      formData.faqs.forEach((faq, index) => {
        if (!faq.question.trim()) {
          newErrors[`faq_${index}_question`] = 'Question is required';
        }
        if (!faq.answer.trim()) {
          newErrors[`faq_${index}_answer`] = 'Answer is required';
        }
      });
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  // Tab navigation
  const handleNextTab = () => {
    const validation = validateForm();

    if (!validation.isValid) {
      // Find first error and show message
      const firstError = Object.keys(validation.errors)[0];
      setSaveStatus({
        type: 'error',
        message: `Please fix validation errors before proceeding: ${validation.errors[firstError]}`
      });
      return;
    }

    const tabs: TabType[] = ['basic', 'schedule', 'advanced', 'registration'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousTab = () => {
    const tabs: TabType[] = ['basic', 'schedule', 'advanced', 'registration'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validation = validateForm();

    if (!validation.isValid) {
      const firstErrorField = Object.keys(validation.errors)[0];
      setSaveStatus({
        type: 'error',
        message: `Please fix validation errors: ${validation.errors[firstErrorField]}`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus(null);

      // Transform form data to match backend Event model
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
        vendorId: formData.vendorId,
        price: parseFloat(formData.basePrice),
        currency: formData.currency,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),

        // Admin-specific fields
        isApproved: formData.isApproved,
        isFeatured: formData.isFeatured,
        requirePhoneVerification: formData.requirePhoneVerification,
        status: formData.status,
        isActive: formData.isActive,

        // Affiliate Event fields
        isAffiliateEvent: formData.isAffiliateEvent,
        externalBookingLink: formData.isAffiliateEvent ? formData.externalBookingLink : undefined,
        claimStatus: formData.isAffiliateEvent ? formData.claimStatus : 'not_claimable',

        // Multiple schedules
        dateSchedule: schedules.map(schedule => ({
          ...(schedule._id && { _id: schedule._id }),
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
          availableSeats: schedule.unlimitedSeats ? 999999 : parseInt(schedule.availableSeats),
          totalSeats: schedule.totalSeats ? parseInt(schedule.totalSeats) : undefined,
          price: parseFloat(schedule.price),
          unlimitedSeats: schedule.unlimitedSeats || false,
          isSpecialDate: schedule.isSpecialDate || false,
          specialDates: schedule.specialDates || [],
          priority: schedule.priority || 0,
          isOverride: schedule.isOverride || false
        })),

        images: formData.imagePreviewUrls,

        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description: formData.seoMeta.description || formData.description.substring(0, 160),
          keywords: formData.seoMeta.keywords.length > 0
            ? formData.seoMeta.keywords
            : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        },

        faqs: formData.faqs.map(faq => ({
          ...(faq._id && { _id: faq._id }),
          question: faq.question,
          answer: faq.answer
        }))
      };

      await adminAPI.updateEvent(id!, eventData);

      setSaveStatus({
        type: 'success',
        message: 'Event updated successfully!'
      });

      setTimeout(() => {
        navigate('/admin/events');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving event:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update event. Please try again.'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/events');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Edit Event (Admin)
            </h1>

            {/* Tabs */}
            <div className="flex space-x-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('basic')}
                className={`
                  px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === 'basic'
                    ? 'bg-white text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`
                  px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === 'schedule'
                    ? 'bg-white text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Schedule & Pricing
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`
                  px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === 'advanced'
                    ? 'bg-white text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Advanced
              </button>
              <button
                onClick={() => setActiveTab('registration')}
                className={`
                  px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === 'registration'
                    ? 'bg-white text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Registration Form
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {saveStatus && (
            <div className={`p-4 ${saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {saveStatus.message}
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'basic' && (
              <BasicInfoTab
                formData={formData}
                categories={categories}
                vendors={vendors}
                errors={errors}
                onInputChange={handleInputChange}
                onCheckboxChange={handleCheckboxChange}
                onImagesChange={handleImagesChange}
                onRemoveImage={removeImage}
              />
            )}

            {activeTab === 'schedule' && (
              isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading schedule data...</p>
                  </div>
                </div>
              ) : (
                <SchedulePricingTab
                  schedules={schedules || []}
                  currency={formData.currency || 'AED'}
                  capacity={formData.capacity || ''}
                  basePrice={formData.basePrice || ''}
                  errors={errors}
                  onScheduleChange={handleScheduleChange}
                  onAddSchedule={handleAddSchedule}
                  onRemoveSchedule={handleRemoveSchedule}
                  onCurrencyChange={handleInputChange}
                  onCapacityChange={handleInputChange}
                  onBasePriceChange={handleInputChange}
                />
              )
            )}

            {activeTab === 'advanced' && (
              <AdvancedTab
                formData={formData}
                eventData={{
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  tags: formData.tags,
                  _id: id
                }}
                errors={errors}
                onInputChange={handleInputChange}
                onFaqChange={handleFaqChange}
                onAddFaq={handleAddFaq}
                onRemoveFaq={handleRemoveFaq}
                onSeoChange={handleSeoChange}
                imagePreviewUrl={formData.imagePreviewUrls[0]}
              />
            )}

            {activeTab === 'registration' && (
              <div>
                {id && (
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
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handlePreviousTab}
                disabled={activeTab === 'basic'}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  disabled={isSaving}
                >
                  Cancel
                </button>

                {activeTab === 'registration' ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Event'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextTab}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditEventPage;
