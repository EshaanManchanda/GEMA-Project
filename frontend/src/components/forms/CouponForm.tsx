import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { couponAPI, categoriesAPI, eventsAPI } from '../../services/api';
import type { 
  Coupon, 
  CreateCouponData, 
  UpdateCouponData,
  CouponType, 
  CouponApplicationType,
  CouponUsageLimit 
} from '../../services/api/couponAPI';
import LoadingSpinner from '../common/LoadingSpinner';

interface CouponFormProps {
  coupon?: Coupon;
  onSuccess?: (coupon: Coupon) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

interface FormData {
  code: string;
  name: string;
  description: string;
  type: CouponType;
  value: number;
  applicationType: CouponApplicationType;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  usageLimit?: CouponUsageLimit;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  applicableCategories: string[];
  applicableEvents: string[];
  excludedCategories: string[];
  excludedEvents: string[];
  isFirstTimeUser: boolean;
  isRecurringUser: boolean;
}

const CouponForm: React.FC<CouponFormProps> = ({
  coupon,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<FormData>({
    defaultValues: {
      code: coupon?.code || '',
      name: coupon?.name || '',
      description: coupon?.description || '',
      type: coupon?.type || 'percentage',
      value: coupon?.value || 0,
      applicationType: coupon?.applicationType || 'all_events',
      isActive: coupon?.isActive ?? true,
      validFrom: coupon?.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 16) : '',
      validUntil: coupon?.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 16) : '',
      usageLimit: coupon?.usageLimit,
      minimumOrderAmount: coupon?.minimumOrderAmount || 0,
      maximumDiscountAmount: coupon?.maximumDiscountAmount,
      applicableCategories: coupon?.applicableCategories || [],
      applicableEvents: coupon?.applicableEvents || [],
      excludedCategories: coupon?.excludedCategories || [],
      excludedEvents: coupon?.excludedEvents || [],
      isFirstTimeUser: coupon?.userRestrictions?.isFirstTimeUser || false,
      isRecurringUser: coupon?.userRestrictions?.isRecurringUser || false
    }
  });

  const watchType = watch('type');
  const watchApplicationType = watch('applicationType');

  useEffect(() => {
    loadCategories();
    loadEvents();
  }, []);

  useEffect(() => {
    if (coupon && mode === 'edit') {
      reset({
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        applicationType: coupon.applicationType,
        isActive: coupon.isActive,
        validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 16) : '',
        validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 16) : '',
        usageLimit: coupon.usageLimit,
        minimumOrderAmount: coupon.minimumOrderAmount,
        maximumDiscountAmount: coupon.maximumDiscountAmount,
        applicableCategories: coupon.applicableCategories || [],
        applicableEvents: coupon.applicableEvents || [],
        excludedCategories: coupon.excludedCategories || [],
        excludedEvents: coupon.excludedEvents || [],
        isFirstTimeUser: coupon.userRestrictions?.isFirstTimeUser || false,
        isRecurringUser: coupon.userRestrictions?.isRecurringUser || false
      });
    }
  }, [coupon, mode, reset]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories();
      setCategories(response.data || response);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await eventsAPI.getAllEvents();
      setEvents(response.data || response);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const generateCouponCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setValue('code', code);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      const couponData: CreateCouponData | UpdateCouponData = {
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value,
        applicationType: data.applicationType,
        isActive: data.isActive,
        validFrom: new Date(data.validFrom),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        usageLimit: data.usageLimit,
        minimumOrderAmount: data.minimumOrderAmount || 0,
        maximumDiscountAmount: data.maximumDiscountAmount,
        applicableCategories: data.applicationType === 'specific_categories' ? data.applicableCategories : [],
        applicableEvents: data.applicationType === 'specific_events' ? data.applicableEvents : [],
        excludedCategories: data.excludedCategories,
        excludedEvents: data.excludedEvents,
        userRestrictions: {
          isFirstTimeUser: data.isFirstTimeUser,
          isRecurringUser: data.isRecurringUser
        }
      };

      let result;
      if (mode === 'create') {
        result = await couponAPI.createCoupon(couponData as CreateCouponData);
      } else {
        result = await couponAPI.updateCoupon(coupon!._id, couponData as UpdateCouponData);
      }

      const savedCoupon = result.data || result;
      toast.success(`Coupon ${mode === 'create' ? 'created' : 'updated'} successfully`);
      onSuccess?.(savedCoupon);
      
      if (mode === 'create') {
        reset();
      }
      
    } catch (error: any) {
      console.error('Failed to save coupon:', error);
      toast.error(error.response?.data?.message || `Failed to ${mode} coupon`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New Coupon' : 'Edit Coupon'}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    {...register('code', { required: 'Coupon code is required' })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="DISCOUNT10"
                  />
                  <button
                    type="button"
                    onClick={generateCouponCode}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Generate
                  </button>
                </div>
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Coupon name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10% Summer Discount"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what this coupon offers"
              />
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Discount Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type *
                </label>
                <select
                  {...register('type', { required: 'Discount type is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {watchType === 'percentage' ? 'Percentage (%)' : 'Amount (AED)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('value', { 
                    required: 'Value is required',
                    min: { value: 0, message: 'Value must be positive' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={watchType === 'percentage' ? '10' : '50'}
                  disabled={watchType === 'free_shipping'}
                />
                {errors.value && (
                  <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Type
                </label>
                <select
                  {...register('applicationType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all_events">All Events</option>
                  <option value="specific_categories">Specific Categories</option>
                  <option value="specific_events">Specific Events</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('minimumOrderAmount')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              {watchType === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Discount Amount (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('maximumDiscountAmount')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="No limit"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Application Scope */}
          {watchApplicationType !== 'all_events' && (
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900">Application Scope</h3>
              
              {watchApplicationType === 'specific_categories' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applicable Categories
                  </label>
                  <Controller
                    name="applicableCategories"
                    control={control}
                    render={({ field }) => (
                      <select
                        multiple
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        size={6}
                      >
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Hold Ctrl/Cmd to select multiple categories
                  </p>
                </div>
              )}

              {watchApplicationType === 'specific_events' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applicable Events
                  </label>
                  <Controller
                    name="applicableEvents"
                    control={control}
                    render={({ field }) => (
                      <select
                        multiple
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        size={6}
                      >
                        {events.map((event) => (
                          <option key={event._id} value={event._id}>
                            {event.title}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Hold Ctrl/Cmd to select multiple events
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Validity Period */}
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Validity Period</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From *
                </label>
                <input
                  type="datetime-local"
                  {...register('validFrom', { required: 'Valid from date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.validFrom && (
                  <p className="mt-1 text-sm text-red-600">{errors.validFrom.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until (Optional)
                </label>
                <input
                  type="datetime-local"
                  {...register('validUntil')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Usage Restrictions */}
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Usage Restrictions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  {...register('usageLimit.total')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per User Limit
                </label>
                <input
                  type="number"
                  {...register('usageLimit.perUser')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per Day Limit
                </label>
                <input
                  type="number"
                  {...register('usageLimit.perDay')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isFirstTimeUser')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  First-time users only
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isRecurringUser')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Returning users only
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Active
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={loading}
            >
              {loading && <LoadingSpinner size="small" className="mr-2" />}
              {mode === 'create' ? 'Create Coupon' : 'Update Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponForm;