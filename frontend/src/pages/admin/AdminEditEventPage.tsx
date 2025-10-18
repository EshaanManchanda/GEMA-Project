import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventsAPI from '../../services/api/eventsAPI';
import adminAPI from '../../services/api/adminAPI';
import SEOEditor from '../../components/seo/SEOEditor';
import FormBuilder from '@/components/registration/FormBuilder';

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
  price: string;
  currency: string;
  tags: string;
  eventDate: string;
  availableSeats: string;
  schedulePrice: string;
  unlimitedSeats: boolean;
  images: File[];
  imagePreviewUrls: string[];
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
}

interface Category {
  id: string;
  name: string;
}

const AdminEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    price: '',
    currency: 'USD',
    tags: '',
    eventDate: '',
    availableSeats: '',
    schedulePrice: '',
    unlimitedSeats: false,
    images: [],
    imagePreviewUrls: [],
    seoMeta: {
      title: '',
      description: '',
      keywords: []
    }
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'registration'>('details');

  useEffect(() => {
    // Fetch categories from backend
    const fetchCategories = async () => {
      try {
        const categoriesData = await eventsAPI.getEventCategories();
        // Handle different response formats
        const categoriesArray = Array.isArray(categoriesData)
          ? categoriesData
          : (categoriesData?.categories || []);

        // Transform backend data to expected format
        const transformedCategories: Category[] = categoriesArray.map((cat: any) => ({
          id: cat._id || cat.id || cat,
          name: cat.name || cat
        }));
        setCategories(transformedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to basic categories if API fails
        setCategories([
          { id: 'arts', name: 'Arts & Crafts' },
          { id: 'science', name: 'Science & Technology' },
          { id: 'sports', name: 'Sports & Activities' },
          { id: 'music', name: 'Music & Dance' },
          { id: 'food', name: 'Food & Cooking' }
        ]);
      }
    };

    // Fetch event data
    const fetchEventData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch real event data from backend (admin can fetch any event)
        const eventData = await adminAPI.getEventById(id);

        // Transform backend data to form format
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
          price: eventData.price?.toString() || '',
          currency: eventData.currency || 'USD',
          tags: eventData.tags?.join(', ') || '',
          eventDate: eventData.dateSchedule?.[0]?.date || '',
          availableSeats: eventData.dateSchedule?.[0]?.availableSeats?.toString() || '',
          schedulePrice: eventData.dateSchedule?.[0]?.price?.toString() || '',
          unlimitedSeats: eventData.dateSchedule?.[0]?.unlimitedSeats || false,
          images: [],
          imagePreviewUrls: eventData.images || [],
          seoMeta: {
            title: eventData.seoMeta?.title || '',
            description: eventData.seoMeta?.description || '',
            keywords: eventData.seoMeta?.keywords || []
          }
        });
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
  }, [id]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.ageRangeMin.trim()) newErrors.ageRangeMin = 'Minimum age is required';
    if (!formData.ageRangeMax.trim()) newErrors.ageRangeMax = 'Maximum age is required';
    // Skip seat validation if unlimited capacity is enabled
    if (!formData.unlimitedSeats && !formData.availableSeats.trim()) {
      newErrors.availableSeats = 'Available seats is required';
    }

    // Price validation
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Price must be a valid number greater than or equal to 0';
    }

    // Available seats validation (skip for unlimited)
    if (!formData.unlimitedSeats && formData.availableSeats.trim()) {
      const seats = parseInt(formData.availableSeats);
      if (isNaN(seats) || seats <= 0) {
        newErrors.availableSeats = 'Available seats must be a positive number';
      }
    }

    // Age range validation
    if (formData.ageRangeMin.trim() && formData.ageRangeMax.trim()) {
      const minAge = parseInt(formData.ageRangeMin);
      const maxAge = parseInt(formData.ageRangeMax);
      if (isNaN(minAge) || isNaN(maxAge)) {
        newErrors.ageRangeMin = 'Age must be a valid number';
      } else if (minAge >= maxAge) {
        newErrors.ageRangeMax = 'Maximum age must be greater than minimum age';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user types
    if (errors[name as keyof EventFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string
        }));
      };

      reader.readAsDataURL(file);

      // Clear error for image when user uploads
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0] as keyof EventFormData;
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
        price: parseFloat(formData.price),
        currency: formData.currency,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        dateSchedule: [{
          date: formData.eventDate,
          availableSeats: formData.unlimitedSeats ? 999999 : parseInt(formData.availableSeats),
          price: parseFloat(formData.schedulePrice || formData.price),
          unlimitedSeats: formData.unlimitedSeats
        }],
        images: [], // Images will be handled separately if upload service is implemented
        seoMeta: {
          title: formData.seoMeta.title || formData.title,
          description: formData.seoMeta.description || formData.description.substring(0, 160),
          keywords: formData.seoMeta.keywords.length > 0
            ? formData.seoMeta.keywords
            : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        },
        faqs: []
      };

      // Admin uses adminAPI to update event
      await adminAPI.updateEvent(id!, eventData);

      // Success message
      setSaveStatus({
        type: 'success',
        message: 'Event updated successfully!'
      });

      // Redirect after successful update
      setTimeout(() => {
        navigate('/admin/events');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving event:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update event. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/events'); // Go back to admin events page
  };

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
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Edit Event (Admin)
              </h1>

              {/* Tabs */}
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`
                    px-4 py-2 rounded-t-lg font-medium text-sm transition-colors
                    ${activeTab === 'details'
                      ? 'bg-white text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Event Details
                </button>
                <button
                  onClick={() => setActiveTab('registration')}
                  className={`
                    px-4 py-2 rounded-t-lg font-medium text-sm transition-colors
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

            {saveStatus && (
              <div className={`p-4 ${saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {saveStatus.message}
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'details' ? (
              <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Event Details Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Event Title*
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="Enter event title"
                      />
                      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Event Description*
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="Describe your event"
                      />
                      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>

                    <div>
                      <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Event Date*
                      </label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formData.eventDate}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.eventDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                      />
                      {errors.eventDate && <p className="mt-1 text-sm text-red-600">{errors.eventDate}</p>}
                    </div>

                    <div>
                      <label htmlFor="availableSeats" className="block text-sm font-medium text-gray-700 mb-1">
                        Available Seats{!formData.unlimitedSeats && '*'}
                      </label>
                      <input
                        type="number"
                        id="availableSeats"
                        name="availableSeats"
                        value={formData.unlimitedSeats ? '' : formData.availableSeats}
                        onChange={handleInputChange}
                        disabled={formData.unlimitedSeats}
                        min="1"
                        className={`w-full px-3 py-2 border ${errors.availableSeats ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                          formData.unlimitedSeats ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder={formData.unlimitedSeats ? 'Unlimited' : 'Enter number of seats'}
                      />
                      {errors.availableSeats && <p className="mt-1 text-sm text-red-600">{errors.availableSeats}</p>}

                      {/* Unlimited Capacity Checkbox */}
                      <div className="mt-2">
                        <label className="flex items-center text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={formData.unlimitedSeats}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                unlimitedSeats: e.target.checked,
                                availableSeats: e.target.checked ? '999999' : prev.availableSeats
                              }));
                            }}
                            className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          Unlimited Capacity (ideal for online events)
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category*
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                    </div>

                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Ticket Price ($)*
                      </label>
                      <input
                        type="text"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="0.00"
                      />
                      {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                          Event Type*
                        </label>
                        <select
                          id="type"
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        >
                          <option value="Event">Event</option>
                          <option value="Course">Course</option>
                          <option value="Venue">Venue</option>
                        </select>
                        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                      </div>

                      <div>
                        <label htmlFor="venueType" className="block text-sm font-medium text-gray-700 mb-1">
                          Venue Type*
                        </label>
                        <select
                          id="venueType"
                          name="venueType"
                          value={formData.venueType}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.venueType ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        >
                          <option value="Indoor">Indoor</option>
                          <option value="Outdoor">Outdoor</option>
                        </select>
                        {errors.venueType && <p className="mt-1 text-sm text-red-600">{errors.venueType}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="ageRangeMin" className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Age*
                        </label>
                        <input
                          type="number"
                          id="ageRangeMin"
                          name="ageRangeMin"
                          value={formData.ageRangeMin}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          className={`w-full px-3 py-2 border ${errors.ageRangeMin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                          placeholder="e.g. 5"
                        />
                        {errors.ageRangeMin && <p className="mt-1 text-sm text-red-600">{errors.ageRangeMin}</p>}
                      </div>

                      <div>
                        <label htmlFor="ageRangeMax" className="block text-sm font-medium text-gray-700 mb-1">
                          Maximum Age*
                        </label>
                        <input
                          type="number"
                          id="ageRangeMax"
                          name="ageRangeMax"
                          value={formData.ageRangeMax}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          className={`w-full px-3 py-2 border ${errors.ageRangeMax ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                          placeholder="e.g. 12"
                        />
                        {errors.ageRangeMax && <p className="mt-1 text-sm text-red-600">{errors.ageRangeMax}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                        Tags <span className="text-gray-500">(comma separated)</span>
                      </label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.tags ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="e.g. kids, science, fun, educational"
                      />
                      {errors.tags && <p className="mt-1 text-sm text-red-600">{errors.tags}</p>}
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address*
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="Enter street address"
                      />
                      {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                          City*
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                          placeholder="Enter city"
                        />
                        {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                      </div>

                      <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          id="currency"
                          name="currency"
                          value={formData.currency}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.currency ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                        {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude <span className="text-gray-500">(optional)</span>
                        </label>
                        <input
                          type="text"
                          id="latitude"
                          name="latitude"
                          value={formData.latitude}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.latitude ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                          placeholder="e.g. 40.7128"
                        />
                        {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude}</p>}
                      </div>

                      <div>
                        <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude <span className="text-gray-500">(optional)</span>
                        </label>
                        <input
                          type="text"
                          id="longitude"
                          name="longitude"
                          value={formData.longitude}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border ${errors.longitude ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                          placeholder="e.g. -74.0060"
                        />
                        {errors.longitude && <p className="mt-1 text-sm text-red-600">{errors.longitude}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Image</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Image
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="image" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                              <span>Upload a file</span>
                              <input
                                id="image"
                                name="image"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                      </div>
                      {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
                    </div>

                    <div>
                      {formData.imagePreviewUrls.length > 0 && (
                        <div>
                          <p className="block text-sm font-medium text-gray-700 mb-1">Image Preview</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                            {formData.imagePreviewUrls.map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Event preview ${index + 1}`}
                                className="h-32 w-full object-cover rounded-md"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SEO Settings */}
                <div className="mt-8">
                  <SEOEditor
                    initialData={{
                      title: formData.seoMeta.title,
                      description: formData.seoMeta.description,
                      keywords: formData.seoMeta.keywords
                    }}
                    contentData={{
                      title: formData.title,
                      description: formData.description,
                      category: formData.category,
                      location: formData.city,
                      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
                      type: 'event'
                    }}
                    onChange={handleSeoChange}
                    baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
                    path={`/events/${id || 'new-event'}`}
                    ogImage={formData.imagePreviewUrls[0]}
                    disabled={isSaving}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
                      <>Save Changes</>
                    )}
                  </button>
                </div>
              </div>
            </form>
            ) : (
              <div className="p-6">
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
        </div>
      </div>
  );
};

export default AdminEditEventPage;
