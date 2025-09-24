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
  Trash2,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import couponAPI from '../../services/api/couponAPI';

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
      then: yup.string().required('Currency is required for fixed amount coupons'),
      otherwise: yup.string()
    }),
  minimumAmount: yup.number()
    .min(0, 'Minimum amount cannot be negative'),
  maximumDiscount: yup.number()
    .min(0, 'Maximum discount cannot be negative'),
  validFrom: yup.date()
    .required('Valid from date is required'),
  validUntil: yup.date()
    .required('Valid until date is required')
    .test('date-order', 'Valid until must be after valid from', function(value) {
      const { validFrom } = this.parent;
      return value > validFrom;
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
      setSelectedEvents(coupon.applicableEvents || []);
      setExcludedEvents(coupon.excludedEvents || []);
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
    }
  }, [coupon, reset]);

  const handleFormSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        applicableEvents: selectedEvents,
        excludedEvents: excludedEvents,
        validFrom: new Date(data.validFrom).toISOString(),
        validUntil: new Date(data.validUntil).toISOString()
      };

      await onSubmit(submitData);
      onClose();
      toast.success(coupon ? 'Coupon updated successfully!' : 'Coupon created successfully!');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
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
                        suffix={watchedType === 'percentage' ? '%' : undefined}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applicable Events (Leave empty for all events)
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                    {events.map((event) => (
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
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excluded Events
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                    {events.map((event) => (
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
                    ))}
                  </div>
                </div>
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
                  render={({ field }) => (
                    <div className="flex items-center">
                      <input
                        {...field}
                        type="checkbox"
                        checked={field.value}
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