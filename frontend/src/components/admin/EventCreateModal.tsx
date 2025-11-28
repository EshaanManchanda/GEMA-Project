import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import adminAPI from '../../services/api/adminAPI';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';
import TipTapEditor from '../common/TipTapEditor';
import MediaPickerModal from './media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import SEOEditor from '../seo/SEOEditor';
import { config } from '../../config';

interface Vendor {
  id: string;
  fullName: string;
  email: string;
}

interface DateSchedule {
  startDate: string;
  endDate: string;
  availableSeats: number;
  totalSeats: number;
  price: number;
}

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EventCreateModal: React.FC<EventCreateModalProps> = ({ isOpen, onClose, onSave }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'schedule' | 'seo' | 'advanced'>('basic');

  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue'>('Event');
  const [venueType, setVenueType] = useState<'Indoor' | 'Outdoor' | 'Online' | 'Offline'>('Indoor');
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState('AED');
  const [vendorId, setVendorId] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState('');
  const [selectedImageAssets, setSelectedImageAssets] = useState<MediaAsset[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [seoData, setSeoData] = useState({
    title: '',
    description: '',
    keywords: [] as string[],
    canonicalUrl: ''
  });
  const [dateSchedule, setDateSchedule] = useState<DateSchedule[]>([
    { startDate: '', endDate: '', availableSeats: 0, totalSeats: 0, price: 0 }
  ]);
  const [isApproved, setIsApproved] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const handleSeoDataChange = useCallback((data: any) => {
    setSeoData(data);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    try {
      const response = await adminAPI.getAllUsers({ role: 'vendor', status: 'active' });
      const vendorsList = response.data?.users || [];
      setVendors(vendorsList.map((v: any) => ({
        id: v.id || v._id,
        fullName: `${v.firstName} ${v.lastName}`,
        email: v.email
      })));
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      const categoriesList = response.data || [];
      setCategories(categoriesList);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setType('Event');
    setVenueType('Indoor');
    setAgeRange([0, 100]);
    setCity('');
    setAddress('');
    setLat(0);
    setLng(0);
    setPrice(0);
    setCurrency('AED');
    setVendorId('');
    setTags('');
    setImages('');
    setSelectedImageAssets([]);
    setSeoData({ title: '', description: '', keywords: [], canonicalUrl: '' });
    setDateSchedule([{ startDate: '', endDate: '', availableSeats: 0, totalSeats: 0, price: 0 }]);
    setIsApproved(true);
    setIsFeatured(false);
    setError(null);
  };

  const handleAddSchedule = () => {
    setDateSchedule([...dateSchedule, { startDate: '', endDate: '', availableSeats: 0, totalSeats: 0, price: 0 }]);
  };

  const handleRemoveSchedule = (index: number) => {
    setDateSchedule(dateSchedule.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, field: string, value: any) => {
    const newSchedule = [...dateSchedule];
    newSchedule[index] = {
      ...newSchedule[index],
      [field]: field === 'availableSeats' || field === 'totalSeats' || field === 'price'
        ? parseFloat(value) || 0
        : value
    };
    setDateSchedule(newSchedule);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (!title.trim()) {
        setError('Title is required');
        return;
      }
      if (!description.trim()) {
        setError('Description is required');
        return;
      }
      if (!category.trim()) {
        setError('Category is required');
        return;
      }
      if (!city.trim()) {
        setError('City is required');
        return;
      }
      if (!address.trim()) {
        setError('Address is required');
        return;
      }
      if (!vendorId) {
        setError('Please select a vendor');
        return;
      }
      if (dateSchedule.length === 0) {
        setError('At least one date schedule is required');
        return;
      }

      // Prepare event data
      const eventData = {
        title,
        description,
        category,
        type,
        venueType,
        ageRange,
        location: {
          city,
          address,
          coordinates: { lat, lng }
        },
        price,
        currency,
        vendorId,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        imageAssets: selectedImageAssets.map(a => a._id),  // Send MediaAsset IDs
        dateSchedule,
        isApproved,
        isFeatured,
        seo: {
          metaTitle: seoData.title,
          metaDescription: seoData.description,
          keywords: seoData.keywords,
          canonicalUrl: seoData.canonicalUrl
        }
      };

      // Create event using admin API
      await adminAPI.createEvent(eventData);
      onSave();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
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
              { key: 'location', label: 'Location & Pricing' },
              { key: 'schedule', label: 'Date Schedules' },
              { key: 'seo', label: 'SEO' },
              { key: 'advanced', label: 'Advanced' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
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
                <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  id="event-title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={200}
                />
              </div>

              <div>
                <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <TipTapEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Describe your event in detail... Use the toolbar to format text, add images from media library, embed videos, and create engaging content."
                  editable={true}
                  mediaCategory="event"
                  mediaFolder="events"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    id="event-category"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      value={ageRange[0]}
                      onChange={(e) => setAgeRange([parseInt(e.target.value) || 0, ageRange[1]])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={ageRange[1]}
                      onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value) || 0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="event-tags" className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="event-tags"
                  name="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., music, outdoor, family-friendly"
                />
              </div>

              {/* Event Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Images
                </label>

                {selectedImageAssets.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {selectedImageAssets.map((asset, index) => (
                      <div key={asset._id} className="relative group">
                        <img
                          src={asset.url}
                          alt={asset.originalName}
                          className="h-24 w-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImageAssets(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {selectedImageAssets.length > 0 ? 'Add More' : 'Select Images'}
                </button>
              </div>
            </div>
          )}

          {/* Location & Pricing Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-city" className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    id="event-city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="event-currency" className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                  <select
                    id="event-currency"
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="-90"
                    max="90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="-180"
                    max="180"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Date Schedules *</label>
                <button
                  onClick={handleAddSchedule}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FaPlus className="mr-1" />
                  Add Schedule
                </button>
              </div>

              <div className="space-y-3">
                {dateSchedule.map((schedule, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    {dateSchedule.length > 1 && (
                      <button
                        onClick={() => handleRemoveSchedule(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                        <input
                          type="datetime-local"
                          value={schedule.startDate}
                          onChange={(e) => handleScheduleChange(index, 'startDate', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                        <input
                          type="datetime-local"
                          value={schedule.endDate}
                          onChange={(e) => handleScheduleChange(index, 'endDate', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Available Seats</label>
                        <input
                          type="number"
                          value={schedule.availableSeats}
                          onChange={(e) => handleScheduleChange(index, 'availableSeats', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Total Seats</label>
                        <input
                          type="number"
                          value={schedule.totalSeats}
                          onChange={(e) => handleScheduleChange(index, 'totalSeats', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Price for this schedule</label>
                        <input
                          type="number"
                          step="0.01"
                          value={schedule.price}
                          onChange={(e) => handleScheduleChange(index, 'price', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <SEOEditor
                initialData={{
                  title: seoData.title,
                  description: seoData.description,
                  keywords: seoData.keywords,
                  canonicalUrl: seoData.canonicalUrl
                }}
                contentData={{
                  title: title,
                  description: description,
                  category: categories.find(c => c._id === category)?.name || category,
                  tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                  type: 'event'
                }}
                onChange={handleSeoDataChange}
                baseUrl={config.appUrl}
                path={`/events/${title.toLowerCase().replace(/\s+/g, '-')}`}
                ogImage={selectedImageAssets[0]?.url || ''}
              />
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Assignment *</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.fullName} ({vendor.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isApproved"
                    checked={isApproved}
                    onChange={(e) => setIsApproved(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isApproved" className="ml-2 block text-sm text-gray-900">
                    Approved (auto-approve this event)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                    Featured
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <FaSave className="mr-2" />
            {isLoading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(assets) => {
          setSelectedImageAssets(assets);
          setShowMediaPicker(false);
        }}
        category="event"
        folder="events"
        multiple={true}
        title="Select Event Images"
      />
    </div>
  );
};

export default EventCreateModal;
