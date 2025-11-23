import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import {
  Save,
  X,
  Percent,
  DollarSign,
  Truck,
  Calendar,
  Users,
  Tag,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import couponAPI from '../../services/api/couponAPI';
import categoriesAPI from '../../services/api/categoriesAPI';
import adminAPI from '../../services/api/adminAPI';

// Validation schema
const couponSchema = yup.object().shape({
  code: yup.string()
    .required('Code is required')
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code cannot exceed 20 characters')
    .matches(/^[A-Z0-9-_]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
  name: yup.string()
    .required('Name is required')
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: yup.string()
    .max(500, 'Description cannot exceed 500 characters'),
  type: yup.string()
    .oneOf(['percentage', 'fixed_amount', 'free_shipping'])
    .required('Type is required'),
  value: yup.number()
    .required('Value is required')
    .min(0, 'Value cannot be negative')
    .test('percentage-max', 'Percentage cannot exceed 100', function(value) {
      const { type } = this.parent;
      if (type === 'percentage' && value > 100) {
        return false;
      }
      return true;
    }),
  currency: yup.string()
    .when('type', {
      is: 'fixed_amount',
      then: (schema) => schema.required('Currency is required for fixed amount coupons'),
      otherwise: (schema) => schema
    }),
  minimumAmount: yup.number()
    .min(0, 'Minimum amount cannot be negative'),
  maximumDiscount: yup.number()
    .min(0, 'Maximum discount cannot be negative'),
  validFrom: yup.string()
    .required('Valid from date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  validUntil: yup.string()
    .required('Valid until date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .test('date-order', 'Valid until must be after valid from', function(value) {
      const { validFrom } = this.parent;
      if (!validFrom || !value) return true;
      return new Date(value) > new Date(validFrom);
    }),
  usageLimit: yup.number()
    .min(1, 'Usage limit must be at least 1'),
  userUsageLimit: yup.number()
    .min(1, 'User usage limit must be at least 1'),
  firstTimeOnly: yup.boolean()
});

interface CouponFormProps {
  coupon?: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  events?: any[];
  loading?: boolean;
}

const CouponForm: React.FC<CouponFormProps> = ({
  coupon,
  isOpen,
  onClose,
  onSubmit,
  events = [],
  loading = false
}) => {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [excludedEvents, setExcludedEvents] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [excludedVendors, setExcludedVendors] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();

  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // Search states
  const [eventSearch, setEventSearch] = useState('');
  const [excludedEventSearch, setExcludedEventSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [excludedCategorySearch, setExcludedCategorySearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [excludedVendorSearch, setExcludedVendorSearch] = useState('');

  // Filtered lists
  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(eventSearch.toLowerCase())
  );
  const filteredExcludedEvents = events.filter(event =>
    event.title?.toLowerCase().includes(excludedEventSearch.toLowerCase())
  );
  const filteredCategories = categories.filter(category =>
    category.name?.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const filteredExcludedCategories = categories.filter(category =>
    category.name?.toLowerCase().includes(excludedCategorySearch.toLowerCase())
  );
  const filteredVendors = vendors.filter(vendor =>
    (vendor.businessName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
     `${vendor.firstName} ${vendor.lastName}`.toLowerCase().includes(vendorSearch.toLowerCase()))
  );
  const filteredExcludedVendors = vendors.filter(vendor =>
    (vendor.businessName?.toLowerCase().includes(excludedVendorSearch.toLowerCase()) ||
     `${vendor.firstName} ${vendor.lastName}`.toLowerCase().includes(excludedVendorSearch.toLowerCase()))
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(couponSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      currency: 'AED',
      minimumAmount: 0,
      maximumDiscount: 0,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 100,
      userUsageLimit: 1,
      firstTimeOnly: false
    }
  });

  const watchedType = watch('type');
  const watchedCode = watch('code');

  useEffect(() => {
    if (coupon) {
      reset({
        code: coupon.code || '',
        name: coupon.name || '',
        description: coupon.description || '',
        type: coupon.type || 'percentage',
        value: coupon.value || 0,
        currency: coupon.currency || 'AED',
        minimumAmount: coupon.minimumAmount || 0,
        maximumDiscount: coupon.maximumDiscount || 0,
        validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '',
        validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
        usageLimit: coupon.usageLimit || 100,
        userUsageLimit: coupon.userUsageLimit || 1,
        firstTimeOnly: coupon.firstTimeOnly || false
      });
      setSelectedEvents(coupon.applicableEvents?.map((e: any) => e._id || e) || []);
      setExcludedEvents(coupon.excludedEvents?.map((e: any) => e._id || e) || []);
      setSelectedCategories(coupon.applicableCategories?.map((c: any) => c._id || c) || []);
      setExcludedCategories(coupon.excludedCategories?.map((c: any) => c._id || c) || []);
      setSelectedVendors(coupon.applicableVendors?.map((v: any) => v._id || v) || []);
      setExcludedVendors(coupon.excludedVendors?.map((v: any) => v._id || v) || []);
      setSelectedEventTypes(coupon.applicableEventTypes || []);
      setPriceMin(coupon.priceRange?.min);
      setPriceMax(coupon.priceRange?.max);
    } else {
      reset({
        code: '',
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        currency: 'AED',
        minimumAmount: 0,
        maximumDiscount: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: 100,
        userUsageLimit: 1,
        firstTimeOnly: false
      });
      setSelectedEvents([]);
      setExcludedEvents([]);
      setSelectedCategories([]);
      setExcludedCategories([]);
      setSelectedVendors([]);
      setExcludedVendors([]);
      setSelectedEventTypes([]);
      setPriceMin(undefined);
      setPriceMax(undefined);
    }
  }, [coupon, reset]);

  // Fetch categories and vendors on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setCategoriesLoading(true);
        const categoriesResponse = await categoriesAPI.getAllCategories();
        setCategories(categoriesResponse.categories || categoriesResponse || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }

      try {
        setVendorsLoading(true);

        // Fetch all vendors with pagination (max 100 per page)
        const allVendors: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const vendorsResponse = await adminAPI.getAllUsers({
            role: 'vendor',
            limit: 100,
            page
          });

          const vendors = vendorsResponse.data?.users || vendorsResponse.data || [];
          allVendors.push(...vendors);

          // Check if there are more pages
          const total = vendorsResponse.data?.pagination?.total || vendorsResponse.data?.total || 0;
          hasMore = allVendors.length < total;
          page++;

          // Safety limit to prevent infinite loops
          if (page > 50) break;
        }

        setVendors(allVendors);
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast.error('Failed to load vendors');
      } finally {
        setVendorsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleFormSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        applicableEvents: selectedEvents,
        excludedEvents: excludedEvents,
        applicableCategories: selectedCategories,
        excludedCategories: excludedCategories,
        applicableVendors: selectedVendors,
        excludedVendors: excludedVendors,
        applicableEventTypes: selectedEventTypes,
        priceRange: (priceMin !== undefined || priceMax !== undefined) ? {
          min: priceMin,
          max: priceMax
        } : undefined,
        validFrom: new Date(data.validFrom).toISOString(),
        validUntil: new Date(data.validUntil).toISOString()
      };

      await onSubmit(submitData);
      // Don't close modal here - let parent component handle it after success
    } catch (error: any) {
      // Error is already handled in parent component, just log it
      console.error('[CouponForm] Form submission failed:', error);
    }
  };

  const generateCode = () => {
    const codes = [
      'SAVE10', 'WELCOME20', 'SUMMER25', 'FLASH30', 'WEEKEND15',
      'FIRST20', 'LOYALTY25', 'SPECIAL30', 'DISCOUNT15', 'MEGA50'
    ];
    const randomCode = codes[Math.floor(Math.random() * codes.length)];
    setValue('code', randomCode);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4" />;
      case 'free_shipping':
        return <Truck className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const addEvent = (eventId: string, isExcluded: boolean = false) => {
    if (isExcluded) {
      if (!excludedEvents.includes(eventId)) {
        setExcludedEvents([...excludedEvents, eventId]);
      }
    } else {
      if (!selectedEvents.includes(eventId)) {
        setSelectedEvents([...selectedEvents, eventId]);
      }
    }
  };

  const removeEvent = (eventId: string, isExcluded: boolean = false) => {
    if (isExcluded) {
      setExcludedEvents(excludedEvents.filter(id => id !== eventId));
    } else {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={coupon ? 'Edit Coupon' : 'Create New Coupon'}
      size="xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <Controller
                      name="code"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Coupon Code"
                          placeholder="SAVE20"
                          error={errors.code?.message}
                          required
                          className="uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      )}
                    />
                  </div>
                  <div className="pt-6">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={generateCode}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Coupon Name"
                      placeholder="20% Off Summer Sale"
                      error={errors.name?.message}
                      required
                    />
                  )}
                />

                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Describe what this coupon is for"
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {/* Discount Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Discount Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount Type *
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'percentage', label: 'Percentage', icon: <Percent className="w-4 h-4" /> },
                          { value: 'fixed_amount', label: 'Fixed Amount', icon: <DollarSign className="w-4 h-4" /> },
                          { value: 'free_shipping', label: 'Free Shipping', icon: <Truck className="w-4 h-4" /> }
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                              field.value === type.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {type.icon}
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="value"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        label={`Discount ${watchedType === 'percentage' ? 'Percentage' : 'Amount'}`}
                        placeholder={watchedType === 'percentage' ? '20' : '50'}
                        error={errors.value?.message}
                        required
                        min="0"
                        max={watchedType === 'percentage' ? '100' : undefined}
                      />
                    )}
                  />

                  {watchedType === 'fixed_amount' && (
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Currency *
                          </label>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="AED">AED</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="CAD">CAD</option>
                          </select>
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="minimumAmount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        label="Minimum Order Amount"
                        placeholder="0"
                        error={errors.minimumAmount?.message}
                        min="0"
                        step="0.01"
                      />
                    )}
                  />

                  {watchedType === 'percentage' && (
                    <Controller
                      name="maximumDiscount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          label="Maximum Discount Amount"
                          placeholder="100"
                          error={errors.maximumDiscount?.message}
                          min="0"
                          step="0.01"
                        />
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>Event Restrictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Applicable Events {selectedEvents.length > 0 && (
                        <Badge variant="primary" className="ml-2">{selectedEvents.length} selected</Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEvents(events.map(e => e._id))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEvents([])}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="event-search"
                    name="eventSearch"
                    placeholder="Search events..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((event) => (
                        <div key={event._id} className="flex items-center justify-between py-2">
                          <span className="text-sm">{event.title}</span>
                          <input
                            type="checkbox"
                            checked={selectedEvents.includes(event._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addEvent(event._id);
                              } else {
                                removeEvent(event._id);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {eventSearch ? 'No events match your search' : 'No events available'}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Leave empty to apply to all events</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Excluded Events {excludedEvents.length > 0 && (
                        <Badge variant="danger" className="ml-2">{excludedEvents.length} excluded</Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExcludedEvents(events.map(e => e._id))}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setExcludedEvents([])}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="excluded-event-search"
                    name="excludedEventSearch"
                    placeholder="Search events..."
                    value={excludedEventSearch}
                    onChange={(e) => setExcludedEventSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                    {filteredExcludedEvents.length > 0 ? (
                      filteredExcludedEvents.map((event) => (
                        <div key={event._id} className="flex items-center justify-between py-2">
                          <span className="text-sm">{event.title}</span>
                          <input
                            type="checkbox"
                            checked={excludedEvents.includes(event._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addEvent(event._id, true);
                              } else {
                                removeEvent(event._id, true);
                              }
                            }}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {excludedEventSearch ? 'No events match your search' : 'No events available'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>Category Restrictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Applicable Categories {selectedCategories.length > 0 && (
                        <Badge variant="primary" className="ml-2">{selectedCategories.length} selected</Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategories(categories.map(c => c._id))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                        disabled={categoriesLoading}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {categoriesLoading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        id="category-search"
                        name="categorySearch"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category) => (
                            <div key={category._id} className="flex items-center justify-between py-2">
                              <span className="text-sm">{category.name}</span>
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(category._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCategories([...selectedCategories, category._id]);
                                  } else {
                                    setSelectedCategories(selectedCategories.filter(id => id !== category._id));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {categorySearch ? 'No categories match your search' : 'No categories available'}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave empty to apply to all categories</p>
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Excluded Categories {excludedCategories.length > 0 && (
                        <Badge variant="danger" className="ml-2">{excludedCategories.length} excluded</Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExcludedCategories(categories.map(c => c._id))}
                        className="text-xs text-red-600 hover:text-red-800"
                        disabled={categoriesLoading}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setExcludedCategories([])}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {categoriesLoading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        id="excluded-category-search"
                        name="excludedCategorySearch"
                        placeholder="Search categories..."
                        value={excludedCategorySearch}
                        onChange={(e) => setExcludedCategorySearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                        {filteredExcludedCategories.length > 0 ? (
                          filteredExcludedCategories.map((category) => (
                            <div key={category._id} className="flex items-center justify-between py-2">
                              <span className="text-sm">{category.name}</span>
                              <input
                                type="checkbox"
                                checked={excludedCategories.includes(category._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExcludedCategories([...excludedCategories, category._id]);
                                  } else {
                                    setExcludedCategories(excludedCategories.filter(id => id !== category._id));
                                  }
                                }}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {excludedCategorySearch ? 'No categories match your search' : 'No categories available'}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vendor Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>Vendor Restrictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Applicable Vendors {selectedVendors.length > 0 && (
                        <Badge variant="primary" className="ml-2">{selectedVendors.length} selected</Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedVendors(vendors.map(v => v._id))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                        disabled={vendorsLoading}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedVendors([])}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {vendorsLoading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        id="vendor-search"
                        name="vendorSearch"
                        placeholder="Search vendors..."
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                        {filteredVendors.length > 0 ? (
                          filteredVendors.map((vendor) => (
                            <div key={vendor._id} className="flex items-center justify-between py-2">
                              <span className="text-sm">
                                {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedVendors.includes(vendor._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVendors([...selectedVendors, vendor._id]);
                                  } else {
                                    setSelectedVendors(selectedVendors.filter(id => id !== vendor._id));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {vendorSearch ? 'No vendors match your search' : 'No vendors available'}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave empty to apply to all vendors</p>
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Excluded Vendors {excludedVendors.length > 0 && (
                        <Badge variant="danger" className="ml-2">{excludedVendors.length} excluded</Badge>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExcludedVendors(vendors.map(v => v._id))}
                        className="text-xs text-red-600 hover:text-red-800"
                        disabled={vendorsLoading}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setExcludedVendors([])}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {vendorsLoading ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        id="excluded-vendor-search"
                        name="excludedVendorSearch"
                        placeholder="Search vendors..."
                        value={excludedVendorSearch}
                        onChange={(e) => setExcludedVendorSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                        {filteredExcludedVendors.length > 0 ? (
                          filteredExcludedVendors.map((vendor) => (
                            <div key={vendor._id} className="flex items-center justify-between py-2">
                              <span className="text-sm">
                                {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                              </span>
                              <input
                                type="checkbox"
                                checked={excludedVendors.includes(vendor._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExcludedVendors([...excludedVendors, vendor._id]);
                                  } else {
                                    setExcludedVendors(excludedVendors.filter(id => id !== vendor._id));
                                  }
                                }}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {excludedVendorSearch ? 'No vendors match your search' : 'No vendors available'}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Type Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>Event Type Restrictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Applicable Event Types {selectedEventTypes.length > 0 && (
                      <Badge variant="primary" className="ml-2">{selectedEventTypes.length} selected</Badge>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEventTypes(['Olympiad', 'Championship', 'Competition', 'Event', 'Course', 'Venue'])}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEventTypes([])}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Olympiad', 'Championship', 'Competition', 'Event', 'Course', 'Venue'].map((type) => (
                    <label key={type} className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedEventTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEventTypes([...selectedEventTypes, type]);
                          } else {
                            setSelectedEventTypes(selectedEventTypes.filter(t => t !== type));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Leave empty to apply to all event types</p>
              </CardContent>
            </Card>

            {/* Price Range Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle>Price Range Restrictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Price (AED)
                    </label>
                    <input
                      type="number"
                      value={priceMin ?? ''}
                      onChange={(e) => setPriceMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Price (AED)
                    </label>
                    <input
                      type="number"
                      value={priceMax ?? ''}
                      onChange={(e) => setPriceMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="No limit"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Coupon will only apply to events within this price range
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Validity Period */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Validity Period
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Controller
                  name="validFrom"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Valid From"
                      error={errors.validFrom?.message}
                      required
                    />
                  )}
                />

                <Controller
                  name="validUntil"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Valid Until"
                      error={errors.validUntil?.message}
                      required
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Usage Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Usage Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Controller
                  name="usageLimit"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Total Usage Limit"
                      placeholder="100"
                      error={errors.usageLimit?.message}
                      min="1"
                    />
                  )}
                />

                <Controller
                  name="userUsageLimit"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Per User Limit"
                      placeholder="1"
                      error={errors.userUsageLimit?.message}
                      min="1"
                    />
                  )}
                />

                <Controller
                  name="firstTimeOnly"
                  control={control}
                  render={({ field: { value, ...field } }) => (
                    <div className="flex items-center">
                      <input
                        {...field}
                        type="checkbox"
                        checked={value}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">
                        First-time customers only
                      </label>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="primary">{watchedCode || 'COUPON'}</Badge>
                    <div className="flex items-center text-blue-600">
                      {getTypeIcon(watchedType)}
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {watch('name') || 'Coupon Name'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {watch('description') || 'Coupon description'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting || loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {coupon ? 'Update Coupon' : 'Create Coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CouponForm;