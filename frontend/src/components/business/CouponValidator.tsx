import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { couponAPI } from '../../services/api/index';
import type { CouponValidation } from '../../services/api/index';
import LoadingSpinner from '../common/LoadingSpinner';

interface CouponValidatorProps {
  orderId?: string;
  orderAmount: number;
  currency?: string;
  onValidCoupon?: (validation: CouponValidation) => void;
  onInvalidCoupon?: (error: string) => void;
  onCouponRemoved?: () => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const CouponValidator: React.FC<CouponValidatorProps> = ({
  orderId,
  orderAmount,
  currency = 'AED',
  onValidCoupon,
  onInvalidCoupon,
  onCouponRemoved,
  className = '',
  placeholder = 'Enter coupon code',
  disabled = false
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [error, setError] = useState<string>('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced validation
  const validateCoupon = useCallback(async (code: string) => {
    if (!code.trim()) {
      setAppliedCoupon(null);
      setError('');
      onCouponRemoved?.();
      return;
    }

    setValidating(true);
    setError('');

    try {
      const validation = await couponAPI.validateCoupon(code, {
        orderId,
        orderAmount
      });

      const result = validation.data || validation;

      if (result.isValid) {
        setAppliedCoupon(result);
        onValidCoupon?.(result);
        toast.success(`Coupon applied! You saved ${formatDiscount(result.discountAmount, currency)}`);
      } else {
        setError(result.reason || 'Invalid coupon code');
        onInvalidCoupon?.(result.reason || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to validate coupon';
      setError(errorMessage);
      onInvalidCoupon?.(errorMessage);
      setAppliedCoupon(null);
    } finally {
      setValidating(false);
    }
  }, [orderId, orderAmount, onValidCoupon, onInvalidCoupon, onCouponRemoved, currency]);

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setCouponCode(value.toUpperCase());

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      validateCoupon(value.toUpperCase());
    }, 500);

    setDebounceTimer(timer);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Handle apply button click
  const handleApply = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    validateCoupon(couponCode);
  };

  // Handle remove coupon
  const handleRemove = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setError('');
    onCouponRemoved?.();
  };

  // Format discount amount
  const formatDiscount = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  // Get discount percentage for display
  const getDiscountPercentage = () => {
    if (!appliedCoupon || orderAmount === 0) return 0;
    return Math.round((appliedCoupon.discountAmount / orderAmount) * 100);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input Section */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApply()}
            placeholder={placeholder}
            disabled={disabled || !!appliedCoupon}
            className={`
              w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase
              ${error ? 'border-red-500 bg-red-50' : appliedCoupon ? 'border-green-500 bg-green-50' : 'border-gray-300'}
              ${disabled || appliedCoupon ? 'bg-gray-50 cursor-not-allowed' : ''}
            `}
            maxLength={20}
          />
          
          {validating && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <LoadingSpinner size="small" />
            </div>
          )}
        </div>

        {appliedCoupon ? (
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={handleApply}
            disabled={disabled || validating || !couponCode.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex-shrink-0">
            <span className="text-red-500">❌</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {appliedCoupon && (
        <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex-shrink-0">
            <span className="text-green-500">✅</span>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Coupon "{appliedCoupon.coupon.code}" applied
                </p>
                <p className="text-sm text-green-700">
                  {appliedCoupon.coupon.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-800">
                  -{formatDiscount(appliedCoupon.discountAmount, currency)}
                </p>
                <p className="text-xs text-green-600">
                  ({getDiscountPercentage()}% off)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Details */}
      {appliedCoupon && appliedCoupon.coupon.description && (
        <div className="text-xs text-gray-500 pl-3">
          {appliedCoupon.coupon.description}
        </div>
      )}

      {/* Usage Information */}
      {appliedCoupon && appliedCoupon.coupon.usageLimit && (
        <div className="text-xs text-gray-500 pl-3">
          {appliedCoupon.coupon.usageLimit.perUser && (
            <span>Limited to {appliedCoupon.coupon.usageLimit.perUser} use(s) per user • </span>
          )}
          {appliedCoupon.coupon.validUntil && (
            <span>
              Valid until {new Date(appliedCoupon.coupon.validUntil).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Order Summary with Discount */}
      {appliedCoupon && (
        <div className="border-t pt-3 mt-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatDiscount(orderAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Discount ({appliedCoupon.coupon.code}):</span>
              <span>-{formatDiscount(appliedCoupon.discountAmount, currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-1">
              <span>Total:</span>
              <span>{formatDiscount(appliedCoupon.finalAmount, currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponValidator;