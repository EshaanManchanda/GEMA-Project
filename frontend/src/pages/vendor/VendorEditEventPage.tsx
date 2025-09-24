import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventsAPI from '../../services/api/eventsAPI';
import SEOEditor from '../../components/seo/SEOEditor';

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

const VendorEditEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const isNewEvent = eventId === 'new';
  
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

  useEffect(() => {
    // Fetch categories from backend
    const fetchCategories = async () => {
      try {
        const categoriesData = await eventsAPI.getEventCategories();
        // Transform backend data to expected format
        const transformedCategories: Category[] = categoriesData.map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name
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
    
    // Fetch event data if editing an existing event
    const fetchEventData = async () => {
      if (isNewEvent) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Fetch real event data from backend
        const eventData = await eventsAPI.getEventById(eventId!);
        
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
          images: [],
          imagePreviewUrls: eventData.images || []
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
  }, [eventId, isNewEvent]);

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
    if (!formData.availableSeats.trim()) newErrors.availableSeats = 'Available seats is required';
    
    // Price validation
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Price must be a valid number greater than or equal to 0';
    }
    
    // Available seats validation
    if (formData.availableSeats.trim()) {
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
    
    // Date validation - ensure it's a future date for new events
    if (formData.eventDate && isNewEvent) {
      const selectedDate = new Date(formData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.eventDate = 'Event date must be in the future';
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
      
      // Transform form data to match backend Event model\n      const eventData = {\n        title: formData.title,\n        description: formData.description,\n        category: formData.category,\n        type: formData.type,\n        venueType: formData.venueType,\n        ageRange: [parseInt(formData.ageRangeMin), parseInt(formData.ageRangeMax)],\n        location: {\n          city: formData.city,\n          address: formData.address,\n          coordinates: {\n            lat: parseFloat(formData.latitude) || 0,\n            lng: parseFloat(formData.longitude) || 0\n          }\n        },\n        price: parseFloat(formData.price),\n        currency: formData.currency,\n        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),\n        dateSchedule: [{\n          date: formData.eventDate,\n          availableSeats: parseInt(formData.availableSeats),\n          price: parseFloat(formData.schedulePrice || formData.price)\n        }],\n        images: [], // Images will be handled separately if upload service is implemented\n        seoMeta: {\n          title: formData.seoMeta.title || formData.title,\n          description: formData.seoMeta.description || formData.description.substring(0, 160),\n          keywords: formData.seoMeta.keywords.length > 0\n            ? formData.seoMeta.keywords\n            : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)\n        },\n        faqs: []\n      };\n      \n      // Call appropriate API endpoint\n      if (isNewEvent) {\n        await eventsAPI.createEvent(eventData);\n      } else {\n        await eventsAPI.updateEvent(eventId!, eventData);\n      }\n      \n      // Success message\n      setSaveStatus({\n        type: 'success',\n        message: isNewEvent \n          ? 'Event created successfully! Redirecting to events page...'\n          : 'Event updated successfully!'\n      });\n      \n      // Redirect after successful creation/update\n      setTimeout(() => {\n        navigate('/vendor/events');\n      }, 2000);
    } catch (error: any) {
      console.error('Error saving event:', error);
      setSaveStatus({
        type: 'error',
        message: error.response?.data?.message || (isNewEvent 
          ? 'Failed to create event. Please try again.'
          : 'Failed to update event. Please try again.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {isNewEvent ? 'Create New Event' : 'Edit Event'}
          </h1>
        </div>
        
        {saveStatus && (
          <div className={`p-4 ${saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {saveStatus.message}
          </div>
        )}
        
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
                    Available Seats*
                  </label>
                  <input
                    type="number"
                    id="availableSeats"
                    name="availableSeats"
                    value={formData.availableSeats}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-3 py-2 border ${errors.availableSeats ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="Enter number of seats"
                  />
                  {errors.availableSeats && <p className="mt-1 text-sm text-red-600">{errors.availableSeats}</p>}
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
                    Upload Image{isNewEvent ? '*' : ''}
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
                onChange={(seoData) => {
                  setFormData(prev => ({
                    ...prev,
                    seoMeta: {
                      title: seoData.title,
                      description: seoData.description,
                      keywords: seoData.keywords
                    }
                  }));
                }}
                baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
                path={`/events/${eventId !== 'new' ? eventId : 'new-event'}`}
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
                    {isNewEvent ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  <>{isNewEvent ? 'Create Event' : 'Save Changes'}</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorEditEventPage;