import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import vendorAPI from '../../services/api/vendorAPI';
import categoriesAPI, { Category } from '../../services/api/categoriesAPI';

interface DateSchedule {
  startDate: string;
  endDate: string;
  availableSeats: number;
  totalSeats: number;
  price: number;
}

interface VendorEventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const VendorEventCreateModal: React.FC<VendorEventCreateModalProps> = ({ isOpen, onClose, onSave }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'schedule' | 'advanced'>('basic');

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
  const [tags, setTags] = useState('');
  const [images, setImages] = useState('');
  const [dateSchedule, setDateSchedule] = useState<DateSchedule[]>([
    { startDate: '', endDate: '', availableSeats: 0, totalSeats: 0, price: 0 }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const categoriesList = await categoriesAPI.getAllCategories({ tree: false, includeInactive: false });
      console.log('Fetched categories:', categoriesList);
      setCategories(categoriesList || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      // Set fallback categories if API fails
      setCategories([]);
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
    setTags('');
    setImages('');
    setDateSchedule([{ startDate: '', endDate: '', availableSeats: 0, totalSeats: 0, price: 0 }]);
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
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        images: images.split(',').map(img => img.trim()).filter(img => img),
        dateSchedule,
      };

      // Create event using vendor API
      await vendorAPI.createVendorEvent(eventData);
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
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
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value as any)}
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
                      value={ageRange[0]}
                      onChange={(e) => setAgeRange([parseInt(e.target.value) || 0, ageRange[1]])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min="0"
                      max="100"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={ageRange[1]}
                      onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value) || 0])}
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
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., music, outdoor, family-friendly"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images (comma-separated URLs)</label>
                <textarea
                  value={images}
                  onChange={(e) => setImages(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={2}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              </div>
            </div>
          )}

          {/* Location & Pricing Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
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
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                        <input
                          type="datetime-local"
                          value={schedule.endDate}
                          onChange={(e) => handleScheduleChange(index, 'endDate', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Available Seats</label>
                        <input
                          type="number"
                          value={schedule.availableSeats}
                          onChange={(e) => handleScheduleChange(index, 'availableSeats', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Total Seats</label>
                        <input
                          type="number"
                          value={schedule.totalSeats}
                          onChange={(e) => handleScheduleChange(index, 'totalSeats', e.target.value)}
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
                          onChange={(e) => handleScheduleChange(index, 'price', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-medium text-emerald-900 mb-2">Event Approval</h4>
                <p className="text-sm text-emerald-700">
                  Your event will be submitted for admin approval. Once approved, it will be visible to users on the platform.
                </p>
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
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <FaSave className="mr-2" />
            {isLoading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorEventCreateModal;
