import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Tag,
  Check,
  X,
  Percent,
  DollarSign,
  Truck,
  Gift,
  AlertCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { RootState, AppDispatch } from '../../store';
import { validateCoupon, clearValidationResult } from '../../store/slices/couponsSlice';

interface CouponValidatorProps {
  orderAmount: number;
  eventIds?: string[];
  onCouponApplied?: (coupon: any, discount: number) => void;
  onCouponRemoved?: () => void;
  appliedCoupon?: any;
}

const CouponValidator: React.FC<CouponValidatorProps> = ({
  orderAmount,
  eventIds = [],
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon: initialAppliedCoupon
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { validatedCoupon, loading, error } = useSelector((state: RootState) => state.coupons);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(initialAppliedCoupon);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (validatedCoupon && !appliedCoupon) {
      const discount = calculateDiscount(validatedCoupon);
      setAppliedCoupon(validatedCoupon);
      onCouponApplied?.(validatedCoupon, discount);
      toast.success(`Coupon applied! You saved ${formatDiscount(validatedCoupon, discount)}`);
    }
  }, [validatedCoupon, appliedCoupon, onCouponApplied]);

  const calculateDiscount = (coupon: any): number => {
    switch (coupon.type) {
      case 'percentage':
        const percentDiscount = (orderAmount * coupon.value) / 100;
        return coupon.maxDiscount
          ? Math.min(percentDiscount, coupon.maxDiscount)
          : percentDiscount;
      case 'fixed_amount':
        return Math.min(coupon.value, orderAmount);
      case 'free_shipping':
        // Assuming shipping cost is passed or calculated elsewhere
        return 0; // This would be the shipping amount
      default:
        return 0;
    }
  };

  const formatDiscount = (coupon: any, discount: number): string => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.currency || 'AED'} ${discount.toFixed(2)} (${coupon.value}% off)`;
      case 'fixed_amount':
        return `${coupon.currency || 'AED'} ${discount.toFixed(2)}`;
      case 'free_shipping':
        return 'Free shipping';
      default:
        return `${coupon.currency || 'AED'} ${discount.toFixed(2)}`;
    }
  };

  const getDiscountIcon = (type: string) => {
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      await dispatch(validateCoupon({
        code: couponCode.trim().toUpperCase(),
        orderAmount,
        eventIds
      })).unwrap();

      setCouponCode('');
    } catch (error: any) {
      toast.error(error.message || 'Invalid coupon code');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    dispatch(clearValidationResult());
    onCouponRemoved?.();
    toast.success('Coupon removed');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  return (
    <Card className="border-dashed border-2 border-gray-200 hover:border-blue-300 transition-colors">
      <CardContent className="p-4">
        {appliedCoupon ? (
          // Applied Coupon Display
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  appliedCoupon.type === 'percentage' ? 'bg-blue-100 text-blue-600' :
                  appliedCoupon.type === 'fixed_amount' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {getDiscountIcon(appliedCoupon.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{appliedCoupon.name}</h4>
                  <p className="text-sm text-gray-600">Code: {appliedCoupon.code}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success">
                  <Check className="w-3 h-3 mr-1" />
                  Applied
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  Discount Applied
                </span>
                <span className="text-lg font-bold text-green-800">
                  -{formatDiscount(appliedCoupon, calculateDiscount(appliedCoupon))}
                </span>
              </div>
              {appliedCoupon.description && (
                <p className="text-sm text-green-700 mt-1">
                  {appliedCoupon.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          // Coupon Input Form
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-700">Have a coupon code?</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Hide' : 'Apply'}
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter coupon code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      disabled={loading.validate}
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleApplyCoupon}
                    loading={loading.validate}
                    disabled={!couponCode.trim() || loading.validate}
                  >
                    {loading.validate ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>• Enter your coupon code to apply discount</p>
                  <p>• Coupon will be validated against your order</p>
                  <p>• Some coupons may have minimum order requirements</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CouponValidator;