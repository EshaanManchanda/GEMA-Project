import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaMapMarkerAlt } from 'react-icons/fa';
import vendorAPI from '../../services/api/vendorAPI';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';

interface DateSchedule {
  _id?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  availableSeats: number;
  totalSeats?: number;
  price: number;
}

interface EventData {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRange: [number, number];
  location: {
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  currency: string;
  tags: string[];
  dateSchedule: DateSchedule[];
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs?: Array<{
    _id?: string;
    question: string;
    answer: string;
  }>;
  images: string[];
  status?: string;
  isApproved?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface VendorEventEditModalProps {
  event: EventData;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const VendorEventEditModal: React.FC<VendorEventEditModalProps> = ({ event, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<EventData>(event);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'schedule' | 'seo' | 'advanced'>('basic');

  useEffect(() => {
    if (isOpen) {
      setFormData(event);
      fetchCategories();
    }
  }, [event, isOpen]);

  const fetchCategories = async () => {
    try {
      const categoriesList = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      setCategories(categoriesList || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      // Set fallback categories if API fails
      setCategories([]);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: string, value: any) => {
    if (field === 'lat' || field === 'lng') {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          coordinates: {
            ...prev.location.coordinates,
            [field]: parseFloat(value) || 0
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [field]: value
        }
      }));
    }
  };

  const handleTagsChange = (tags: string) => {
    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setFormData(prev => ({ ...prev, tags: tagArray }));
  };

  const handleDateScheduleChange = (index: number, field: string, value: any) => {
    const newSchedule = [...formData.dateSchedule];
    newSchedule[index] = {
      ...newSchedule[index],
      [field]: field === 'availableSeats' || field === 'totalSeats' || field === 'price'
        ? parseFloat(value) || 0
        : value
    };
    setFormData(prev => ({ ...prev, dateSchedule: newSchedule }));
  };

  const addDateSchedule = () => {
    setFormData(prev => ({
      ...prev,
      dateSchedule: [
        ...prev.dateSchedule,
        {
          startDate: '',
          endDate: '',
          availableSeats: 0,
          totalSeats: 0,
          price: 0
        }
      ]
    }));
  };

  const removeDateSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dateSchedule: prev.dateSchedule.filter((_, i) => i !== index)
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...(formData.faqs || [])];
    newFaqs[index] = {
      ...newFaqs[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, faqs: newFaqs }));
  };

  const addFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }]
    }));
  };

  const removeFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  const handleImageChange = (images: string) => {
    const imageArray = images.split(',').map(img => img.trim()).filter(img => img.length > 0);
    setFormData(prev => ({ ...prev, images: imageArray }));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Prepare update data
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        venueType: formData.venueType,
        ageRange: formData.ageRange,
        location: formData.location,
        price: formData.price,
        currency: formData.currency,
        tags: formData.tags,
        dateSchedule: formData.dateSchedule,
        images: formData.images
      };

      // Add optional fields if they exist
      if (formData.seoMeta) {
        updateData.seoMeta = formData.seoMeta;
      }
      if (formData.faqs && formData.faqs.length > 0) {
        updateData.faqs = formData.faqs;
      }

      await vendorAPI.updateVendorEvent(formData._id, updateData);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaTimes className="text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-4">
            {[
              { key: 'basic', label: 'Basic Info' },
              { key: 'location', label: 'Location' },
              { key: 'schedule', label: 'Schedule & Pricing' },
              { key: 'seo', label: 'SEO & FAQs' },
              { key: 'advanced', label: 'Advanced' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="Olympiad">Olympiad</option>
                    <option value="Championship">Championship</option>
                    <option value="Competition">Competition</option>
                    <option value="Event">Event</option>
                    <option value="Course">Course</option>
                    <option value="Venue">Venue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue Type *</label>
                  <select
                    value={formData.venueType}
                    onChange={(e) => handleInputChange('venueType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range *</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={formData.ageRange[0]}
                      onChange={(e) => handleInputChange('ageRange', [parseInt(e.target.value) || 0, formData.ageRange[1]])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min="0"
                      max="100"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={formData.ageRange[1]}
                      onChange={(e) => handleInputChange('ageRange', [formData.ageRange[0], parseInt(e.target.value) || 0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., music, outdoor, family-friendly"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images (comma-separated URLs)</label>
                <textarea
                  value={formData.images.join(', ')}
                  onChange={(e) => handleImageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={2}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.location.city}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="AED">AED</option>
                    <option value="EGP">EGP</option>
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input
                  type="text"
                  value={formData.location.address}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapMarkerAlt className="inline mr-1" />
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.location.coordinates.lat}
                    onChange={(e) => handleLocationChange('lat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="-90"
                    max="90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapMarkerAlt className="inline mr-1" />
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.location.coordinates.lng}
                    onChange={(e) => handleLocationChange('lng', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min="-180"
                    max="180"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Schedule & Pricing Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="0"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Date Schedules *</label>
                  <button
                    onClick={addDateSchedule}
                    className="flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <FaPlus className="mr-1" />
                    Add Schedule
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.dateSchedule.map((schedule, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        onClick={() => removeDateSchedule(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                          <input
                            type="datetime-local"
                            value={schedule.startDate || ''}
                            onChange={(e) => handleDateScheduleChange(index, 'startDate', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                          <input
                            type="datetime-local"
                            value={schedule.endDate || ''}
                            onChange={(e) => handleDateScheduleChange(index, 'endDate', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Available Seats</label>
                          <input
                            type="number"
                            value={schedule.availableSeats}
                            onChange={(e) => handleDateScheduleChange(index, 'availableSeats', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Total Seats</label>
                          <input
                            type="number"
                            value={schedule.totalSeats || ''}
                            onChange={(e) => handleDateScheduleChange(index, 'totalSeats', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                            min="0"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Price for this schedule</label>
                          <input
                            type="number"
                            step="0.01"
                            value={schedule.price}
                            onChange={(e) => handleDateScheduleChange(index, 'price', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEO & FAQs Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">SEO Meta</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SEO Title</label>
                    <input
                      type="text"
                      value={formData.seoMeta?.title || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        seoMeta: { ...(prev.seoMeta || { description: '', keywords: [] }), title: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      maxLength={60}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SEO Description</label>
                    <textarea
                      value={formData.seoMeta?.description || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        seoMeta: { ...(prev.seoMeta || { title: '', keywords: [] }), description: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows={2}
                      maxLength={160}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SEO Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.seoMeta?.keywords?.join(', ') || ''}
                      onChange={(e) => {
                        const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                        setFormData(prev => ({
                          ...prev,
                          seoMeta: { ...(prev.seoMeta || { title: '', description: '' }), keywords }
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">FAQs</h3>
                  <button
                    onClick={addFaq}
                    className="flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <FaPlus className="mr-1" />
                    Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.faqs?.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        onClick={() => removeFaq(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                            maxLength={200}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Answer</label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                            rows={2}
                            maxLength={1000}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-medium text-emerald-900 mb-2">Event Status</h4>
                <p className="text-sm text-emerald-700 mb-2">
                  {formData.isApproved
                    ? 'Your event is approved and visible to users.'
                    : 'Your event is pending admin approval.'}
                </p>
                {formData.status && (
                  <p className="text-xs text-gray-600">
                    Current Status: <span className="font-medium">{formData.status}</span>
                  </p>
                )}
              </div>

              {formData.createdAt && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Event Statistics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(formData.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {formData.updatedAt && (
                      <div>
                        <span className="text-gray-600">Updated:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(formData.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <FaSave className="mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorEventEditModal;
