import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import eventsAPI from '../../services/api/eventsAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';

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
}

interface Category {
  id: string;
  name: string;
}

const VendorCreateEventPage: React.FC = () => {
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
    images: [],
    imagePreviewUrls: []
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');

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
    
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
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
      
      // Validate file size and type
      const validFiles = filesArray.filter(file => {
        const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
        
        if (!isValidType) {
          setErrors(prev => ({ ...prev, images: 'Only JPG, JPEG, and PNG files are allowed.' }));
        } else if (!isValidSize) {
          setErrors(prev => ({ ...prev, images: 'Image size should not exceed 5MB.' }));
        }
        
        return isValidType && isValidSize;
      });
      
      if (validFiles.length > 0) {
        // Create preview URLs for valid files
        const newImagePreviewUrls = validFiles.map(file => URL.createObjectURL(file));
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...validFiles],
          imagePreviewUrls: [...prev.imagePreviewUrls, ...newImagePreviewUrls]
        }));
        
        // Clear error if valid files were uploaded
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
      
      // Revoke the object URL to avoid memory leaks
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.price.trim()) newErrors.price = 'Price is required';
    if (!formData.availableSeats.trim()) newErrors.availableSeats = 'Available seats is required';
    if (!formData.ageRangeMin.trim()) newErrors.ageRangeMin = 'Minimum age is required';
    if (!formData.ageRangeMax.trim()) newErrors.ageRangeMax = 'Maximum age is required';
    if (!formData.category) newErrors.category = 'Category is required';
    
    // Date validation - ensure it's a future date
    if (formData.eventDate) {
      const selectedDate = new Date(formData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.eventDate = 'Event date must be in the future';
      }
    }
    
    // Price validation - ensure it's a valid number
    if (formData.price && isNaN(parseFloat(formData.price))) {
      newErrors.price = 'Price must be a valid number';
    }
    
    // Available seats validation - ensure it's a valid integer
    if (formData.availableSeats) {
      const seatsNum = parseInt(formData.availableSeats, 10);
      if (isNaN(seatsNum) || seatsNum <= 0) {
        newErrors.availableSeats = 'Available seats must be a positive number';
      }
    }
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsLoading(true);
    setSubmitStatus('loading');
    
    try {
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
          availableSeats: parseInt(formData.availableSeats),
          price: parseFloat(formData.schedulePrice || formData.price)
        }],
        images: [], // Images will be handled separately if upload service is implemented
        seoMeta: {
          title: formData.title,
          description: formData.description.substring(0, 160),
          keywords: formData.tags.split(',').map(tag => tag.trim())
        },
        faqs: []
      };
      
      // Create event via API
      const response = await eventsAPI.createEvent(eventData);
      
      setSubmitStatus('success');
      setSubmitMessage('Event created successfully!');
      
      // Redirect to events page after a short delay
      setTimeout(() => {
        navigate('/vendor/events');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating event:', error);
      setSubmitStatus('error');
      const errorMessage = error.response?.data?.message || 'Failed to create event. Please try again.';
      setSubmitMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
        
        {submitStatus === 'success' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
            <p>{submitMessage}</p>
          </div>
        )}
        
        {submitStatus === 'error' && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{submitMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Event Details</h2>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title <span className="text-red-500">*</span>
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
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                  placeholder="Describe your event in detail"
                ></textarea>
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.eventDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                  />
                  {errors.eventDate && <p className="mt-1 text-sm text-red-500">{errors.eventDate}</p>}
                </div>
                
                <div>
                  <label htmlFor="availableSeats" className="block text-sm font-medium text-gray-700 mb-1">
                    Available Seats <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="availableSeats"
                    name="availableSeats"
                    value={formData.availableSeats}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-3 py-2 border ${errors.availableSeats ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="Enter number of available seats"
                  />
                  {errors.availableSeats && <p className="mt-1 text-sm text-red-500">{errors.availableSeats}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="e.g. New York"
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="Full address"
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="e.g. 25"
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
                </div>
                
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="capacity"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.capacity ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="e.g. 50"
                  />
                  {errors.capacity && <p className="mt-1 text-sm text-red-500">{errors.capacity}</p>}
                </div>
                
                <div>
                  <label htmlFor="ageRange" className="block text-sm font-medium text-gray-700 mb-1">
                    Age Range <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ageRange"
                    name="ageRange"
                    value={formData.ageRange}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.ageRange ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="e.g. 5-12 years"
                  />
                  {errors.ageRange && <p className="mt-1 text-sm text-red-500">{errors.ageRange}</p>}
                </div>
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
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
                {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type <span className="text-red-500">*</span>
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
                  {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
                </div>
                
                <div>
                  <label htmlFor="venueType" className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Type <span className="text-red-500">*</span>
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
                  {errors.venueType && <p className="mt-1 text-sm text-red-500">{errors.venueType}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="ageRangeMin" className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Age <span className="text-red-500">*</span>
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
                  {errors.ageRangeMin && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMin}</p>}
                </div>
                
                <div>
                  <label htmlFor="ageRangeMax" className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Age <span className="text-red-500">*</span>
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
                  {errors.ageRangeMax && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMax}</p>}
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
                {errors.tags && <p className="mt-1 text-sm text-red-500">{errors.tags}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Images <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                        <span>Upload images</span>
                        <input 
                          id="images" 
                          name="images" 
                          type="file" 
                          className="sr-only" 
                          accept="image/jpeg, image/png, image/jpg"
                          multiple
                          onChange={handleImageUpload}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, JPEG up to 5MB
                    </p>
                  </div>
                </div>
                {errors.images && <p className="mt-1 text-sm text-red-500">{errors.images}</p>}
                
                {formData.imagePreviewUrls.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {formData.imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`Preview ${index + 1}`} 
                            className="h-24 w-full object-cover rounded-md" 
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <input
                  id="featured"
                  name="featured"
                  type="checkbox"
                  checked={formData.featured}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                  Feature this event (will be displayed in featured section)
                </label>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 text-right">
            <button
              type="button"
              onClick={() => navigate('/vendor/events')}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
          </div>
        </form>
      </div>
      </div>
    </>
  );
};

export default VendorCreateEventPage;