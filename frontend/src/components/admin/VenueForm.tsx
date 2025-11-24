import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { Save, X, Plus, Trash2, MapPin, Users, Calendar, Phone, Mail, Globe, DollarSign, Shield, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import ImageUpload from '../ui/ImageUpload';
import adminAPI from '../../services/api/adminAPI';

// Validation schema
const venueSchema = yup.object().shape({
  name: yup.string()
    .required('Venue name is required')
    .max(200, 'Name cannot exceed 200 characters'),
  description: yup.string()
    .max(2000, 'Description cannot exceed 2000 characters'),
  vendorId: yup.string()
    .required('Vendor is required'),
  status: yup.string()
    .oneOf(['active', 'inactive', 'maintenance', 'suspended'])
    .required('Status is required'),
  venueType: yup.string()
    .oneOf(['indoor', 'outdoor', 'hybrid'])
    .required('Venue type is required'),
  capacity: yup.number()
    .required('Capacity is required')
    .min(1, 'Capacity must be at least 1')
    .typeError('Capacity must be a number'),
  address: yup.object().shape({
    street: yup.string().required('Street is required'),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    country: yup.string().required('Country is required'),
    zipCode: yup.string().required('Zip code is required')
  }),
  coordinates: yup.object().shape({
    lat: yup.number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .typeError('Latitude must be a number'),
    lng: yup.number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .typeError('Longitude must be a number')
  }).nullable(),
  timezone: yup.string().required('Timezone is required'),
  baseRentalPrice: yup.number()
    .min(0, 'Price cannot be negative')
    .typeError('Price must be a number'),
  currency: yup.string()
    .oneOf(['AED', 'EGP', 'CAD', 'USD'])
    .required('Currency is required'),
  contactInfo: yup.object().shape({
    phone: yup.string()
      .matches(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
    email: yup.string()
      .email('Please enter a valid email'),
    website: yup.string()
      .matches(/^https?:\/\/.+/, 'Please enter a valid URL')
  }).nullable(),
  isAffiliateVenue: yup.boolean(),
  externalBookingLink: yup.string()
    .when('isAffiliateVenue', {
      is: true,
      then: (schema) => schema
        .required('External booking link is required for affiliate venues')
        .matches(/^https?:\/\/.+/, 'Please enter a valid URL'),
      otherwise: (schema) => schema.nullable()
    }),
  claimStatus: yup.string()
    .oneOf(['unclaimed', 'claimed', 'not_claimable'])
});

interface VenueFormProps {
  venue?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const VenueForm: React.FC<VenueFormProps> = ({
  venue,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [affiliateVendor, setAffiliateVendor] = useState<any>(null);
  const [facilities, setFacilities] = useState<string[]>(venue?.facilities || []);
  const [amenities, setAmenities] = useState<string[]>(venue?.amenities || []);
  const [safetyFeatures, setSafetyFeatures] = useState<string[]>(venue?.safetyFeatures || []);
  const [certifications, setCertifications] = useState<string[]>(venue?.certifications || []);
  const [images, setImages] = useState<string[]>(venue?.images || []);
  const [newItem, setNewItem] = useState({ facilities: '', amenities: '', safetyFeatures: '', certifications: '' });

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(venueSchema),
    defaultValues: {
      name: venue?.name || '',
      description: venue?.description || '',
      vendorId: venue?.vendor?.id || '',
      status: venue?.status || 'active',
      venueType: venue?.venueType || 'indoor',
      capacity: venue?.capacity || 0,
      address: {
        street: venue?.address?.street || '',
        city: venue?.address?.city || '',
        state: venue?.address?.state || '',
        country: venue?.address?.country || '',
        zipCode: venue?.address?.zipCode || ''
      },
      coordinates: venue?.coordinates || { lat: 0, lng: 0 },
      timezone: venue?.timezone || 'UTC',
      baseRentalPrice: venue?.baseRentalPrice || 0,
      currency: venue?.currency || 'AED',
      contactInfo: {
        phone: venue?.contactInfo?.phone || '',
        email: venue?.contactInfo?.email || '',
        website: venue?.contactInfo?.website || ''
      },
      operatingHours: venue?.operatingHours || daysOfWeek.map(day => ({
        day,
        openTime: '09:00',
        closeTime: '17:00',
        isClosed: false
      })),
      isAffiliateVenue: venue?.isAffiliateVenue || false,
      externalBookingLink: venue?.externalBookingLink || '',
      claimStatus: venue?.claimStatus || 'not_claimable'
    }
  });

  const { fields: operatingHoursFields } = useFieldArray({
    control,
    name: 'operatingHours'
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await adminAPI.getVendorsList();
      if (response.success) {
        // Transform vendors to ensure consistent id field
        const vendorsList = response.data.users || response.data.vendors || [];
        const transformedVendors = vendorsList.map((v: any) => ({
          id: v._id || v.id, // Handle both _id and id formats
          firstName: v.firstName || '',
          lastName: v.lastName || v.businessName || '',
          email: v.email,
          businessName: v.businessName
        }));

        setVendors(transformedVendors);

        // Find and set the Platform Affiliate vendor
        const platformAffiliate = transformedVendors.find(
          (v: any) => v.businessName === 'Platform Affiliate' || v.email === 'affiliate@kidrove-system.com'
        );
        if (platformAffiliate) {
          setAffiliateVendor(platformAffiliate);
        }
      }
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        facilities,
        amenities,
        safetyFeatures,
        certifications,
        images
      };

      await onSubmit(submitData);
    } catch (error: any) {
      console.error('[VenueForm] Form submission failed:', error);
    }
  };

  const addItem = (type: 'facilities' | 'amenities' | 'safetyFeatures' | 'certifications') => {
    const value = newItem[type].trim();
    if (!value) return;

    switch (type) {
      case 'facilities':
        if (!facilities.includes(value)) {
          setFacilities([...facilities, value]);
          setNewItem({ ...newItem, facilities: '' });
        }
        break;
      case 'amenities':
        if (!amenities.includes(value)) {
          setAmenities([...amenities, value]);
          setNewItem({ ...newItem, amenities: '' });
        }
        break;
      case 'safetyFeatures':
        if (!safetyFeatures.includes(value)) {
          setSafetyFeatures([...safetyFeatures, value]);
          setNewItem({ ...newItem, safetyFeatures: '' });
        }
        break;
      case 'certifications':
        if (!certifications.includes(value)) {
          setCertifications([...certifications, value]);
          setNewItem({ ...newItem, certifications: '' });
        }
        break;
    }
  };

  const removeItem = (type: 'facilities' | 'amenities' | 'safetyFeatures' | 'certifications', index: number) => {
    switch (type) {
      case 'facilities':
        setFacilities(facilities.filter((_, i) => i !== index));
        break;
      case 'amenities':
        setAmenities(amenities.filter((_, i) => i !== index));
        break;
      case 'safetyFeatures':
        setSafetyFeatures(safetyFeatures.filter((_, i) => i !== index));
        break;
      case 'certifications':
        setCertifications(certifications.filter((_, i) => i !== index));
        break;
    }
  };

  const handleImageUpload = (url: string) => {
    if (images.length < 20) {
      setImages([...images, url]);
    } else {
      toast.error('Maximum 20 images allowed');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Name <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter venue name"
                    error={errors.name?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={loadingVendors || watch('isAffiliateVenue')}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.vendorId ? 'border-red-500' : ''
                    } ${watch('isAffiliateVenue') ? 'bg-gray-100' : ''}`}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`} ({vendor.email})
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.vendorId && <p className="mt-1 text-sm text-red-600">{errors.vendorId.message}</p>}
              {watch('isAffiliateVenue') && (
                <p className="mt-1 text-xs text-gray-500">
                  Vendor is automatically set to "Platform Affiliate" for affiliate venues
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Type <span className="text-red-500">*</span>
              </label>
              <Controller
                name="venueType"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.venueType ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                )}
              />
              {errors.venueType && <p className="mt-1 text-sm text-red-600">{errors.venueType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.status ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="suspended">Suspended</option>
                  </select>
                )}
              />
              {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity <span className="text-red-500">*</span>
              </label>
              <Controller
                name="capacity"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    placeholder="Enter maximum capacity"
                    error={errors.capacity?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone <span className="text-red-500">*</span>
              </label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g., UTC, America/New_York"
                    error={errors.timezone?.message}
                  />
                )}
              />
            </div>
          </div>

          {/* Affiliate Venue Section */}
          <div className="border-t pt-4 mt-4">
            <Controller
              name="isAffiliateVenue"
              control={control}
              render={({ field: { value, onChange } }) => (
                <label className="flex items-center mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => {
                      onChange(e.target.checked);
                      // Auto-select Platform Affiliate vendor when affiliate venue is enabled
                      if (e.target.checked && affiliateVendor) {
                        setValue('vendorId', affiliateVendor.id);
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    This is an Affiliate Venue (External Booking Link)
                  </span>
                </label>
              )}
            />

            {watch('isAffiliateVenue') && (
              <div className="space-y-3 pl-6 border-l-4 border-blue-300 ml-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    External Booking Link <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="externalBookingLink"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com/book-venue"
                        error={errors.externalBookingLink?.message}
                      />
                    )}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Visitors will be redirected to this URL when they try to book this venue
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claim Status
                  </label>
                  <Controller
                    name="claimStatus"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="not_claimable">Not Claimable</option>
                        <option value="unclaimed">Unclaimed (Vendors Can Claim)</option>
                        <option value="claimed">Claimed</option>
                      </select>
                    )}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Control whether vendors can claim this affiliate venue
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={4}
                  className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.description ? 'border-red-500' : ''
                  }`}
                  placeholder="Enter venue description"
                />
              )}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street <span className="text-red-500">*</span>
              </label>
              <Controller
                name="address.street"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter street address"
                    error={errors.address?.street?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <Controller
                name="address.city"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter city"
                    error={errors.address?.city?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <Controller
                name="address.state"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter state"
                    error={errors.address?.state?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <Controller
                name="address.country"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter country"
                    error={errors.address?.country?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <Controller
                name="address.zipCode"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter zip code"
                    error={errors.address?.zipCode?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <Controller
                name="coordinates.lat"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    placeholder="e.g., 25.2048"
                    error={errors.coordinates?.lat?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <Controller
                name="coordinates.lng"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    placeholder="e.g., 55.2708"
                    error={errors.coordinates?.lng?.message}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Operating Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-gray-900">
            {operatingHoursFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {daysOfWeek[index]}
                  </span>
                </div>
                <div className="col-span-3">
                  <Controller
                    name={`operatingHours.${index}.openTime`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="time"
                        disabled={watch(`operatingHours.${index}.isClosed`)}
                      />
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <Controller
                    name={`operatingHours.${index}.closeTime`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="time"
                        disabled={watch(`operatingHours.${index}.isClosed`)}
                      />
                    )}
                  />
                </div>
                <div className="col-span-3 flex items-center">
                  <Controller
                    name={`operatingHours.${index}.isClosed`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => onChange(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Closed</span>
                      </label>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Facilities */}
      <Card>
        <CardHeader>
          <CardTitle>Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3 text-gray-900">
            <Input
              value={newItem.facilities}
              onChange={(e) => setNewItem({ ...newItem, facilities: e.target.value })}
              placeholder="Add facility (e.g., Parking, WiFi)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('facilities');
                }
              }}
            />
            <Button type="button" onClick={() => addItem('facilities')} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-gray-900">
            {facilities.map((facility, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {facility}
                <button
                  type="button"
                  onClick={() => removeItem('facilities', index)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              value={newItem.amenities}
              onChange={(e) => setNewItem({ ...newItem, amenities: e.target.value })}
              placeholder="Add amenity (e.g., Catering, Audio System)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('amenities');
                }
              }}
            />
            <Button type="button" onClick={() => addItem('amenities')} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                {amenity}
                <button
                  type="button"
                  onClick={() => removeItem('amenities', index)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                Phone
              </label>
              <Controller
                name="contactInfo.phone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="+1 (555) 123-4567"
                    error={errors.contactInfo?.phone?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                Email
              </label>
              <Controller
                name="contactInfo.email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="email"
                    placeholder="venue@example.com"
                    error={errors.contactInfo?.email?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                Website
              </label>
              <Controller
                name="contactInfo.website"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="https://example.com"
                    error={errors.contactInfo?.website?.message}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Rental Price
              </label>
              <Controller
                name="baseRentalPrice"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    error={errors.baseRentalPrice?.message}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.currency ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CAD">CAD</option>
                    <option value="EGP">EGP</option>
                  </select>
                )}
              />
              {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Safety Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              value={newItem.safetyFeatures}
              onChange={(e) => setNewItem({ ...newItem, safetyFeatures: e.target.value })}
              placeholder="Add safety feature (e.g., Fire Extinguisher, Emergency Exit)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('safetyFeatures');
                }
              }}
            />
            <Button type="button" onClick={() => addItem('safetyFeatures')} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {safetyFeatures.map((feature, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                {feature}
                <button
                  type="button"
                  onClick={() => removeItem('safetyFeatures', index)}
                  className="ml-2 text-yellow-600 hover:text-yellow-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              value={newItem.certifications}
              onChange={(e) => setNewItem({ ...newItem, certifications: e.target.value })}
              placeholder="Add certification (e.g., ISO 9001, Health & Safety)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('certifications');
                }
              }}
            />
            <Button type="button" onClick={() => addItem('certifications')} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {certifications.map((cert, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                {cert}
                <button
                  type="button"
                  onClick={() => removeItem('certifications', index)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ImageIcon className="w-5 h-5 mr-2" />
            Images ({images.length}/20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ImageUpload
              onUploadSuccess={handleImageUpload}
              folder="venues"
            />
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Venue ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting || isLoading ? 'Saving...' : venue ? 'Update Venue' : 'Create Venue'}
        </Button>
      </div>
    </form>
  );
};

export default VenueForm;
