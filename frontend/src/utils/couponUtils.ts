// Coupon utility functions for consistent discount calculations

export interface CouponInfo {
  code: string;
  discountPercentage: number;
  description: string;
  minAmount?: number;
  maxDiscount?: number;
}

// Mock coupon database - in production, this would come from API
export const VALID_COUPONS: Record<string, CouponInfo> = {
  'WELCOME10': {
    code: 'WELCOME10',
    discountPercentage: 10,
    description: '10% off for new customers',
    minAmount: 0,
  },
  'SAVE20': {
    code: 'SAVE20',
    discountPercentage: 20,
    description: '20% off on your booking',
    minAmount: 50,
  },
  'EARLYBIRD': {
    code: 'EARLYBIRD',
    discountPercentage: 15,
    description: '15% off for early bookings',
    minAmount: 0,
  },
};

/**
 * Validates a coupon code and returns coupon info if valid
 * @param code - The coupon code to validate
 * @returns CouponInfo if valid, null if invalid
 */
export const validateCoupon = (code: string): CouponInfo | null => {
  const upperCode = code.toUpperCase().trim();
  return VALID_COUPONS[upperCode] || null;
};

/**
 * Calculates discount amount based on coupon and subtotal
 * @param couponCode - The coupon code
 * @param subtotal - The subtotal amount
 * @returns Object with discount amount and coupon info
 */
export const calculateDiscount = (couponCode: string, subtotal: number) => {
  const coupon = validateCoupon(couponCode);

  if (!coupon) {
    return {
      discountAmount: 0,
      discountPercentage: 0,
      coupon: null,
      isValid: false
    };
  }

  // Check minimum amount requirement
  if (coupon.minAmount && subtotal < coupon.minAmount) {
    return {
      discountAmount: 0,
      discountPercentage: 0,
      coupon,
      isValid: false,
      error: `Minimum order amount of ${coupon.minAmount} required for this coupon`
    };
  }

  let discountAmount = (subtotal * coupon.discountPercentage) / 100;

  // Apply maximum discount limit if specified
  if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount;
  }

  return {
    discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    discountPercentage: coupon.discountPercentage,
    coupon,
    isValid: true
  };
};

/**
 * Calculates final pricing with discount applied
 * @param subtotal - The subtotal amount
 * @param couponCode - The coupon code (optional)
 * @param serviceFeeRate - The service fee rate (0-100, default 5)
 * @param hasServiceFee - Whether service fee applies (default true)
 * @returns Complete pricing breakdown
 */
export const calculatePricingWithDiscount = (
  subtotal: number,
  couponCode?: string,
  serviceFeeRate: number = 5,
  hasServiceFee: boolean = true
) => {
  const discountResult = couponCode ? calculateDiscount(couponCode, subtotal) : {
    discountAmount: 0,
    discountPercentage: 0,
    coupon: null,
    isValid: false
  };

  // Calculate service fee if applicable
  const serviceFee = hasServiceFee ? (subtotal * serviceFeeRate) / 100 : 0;

  // Calculate tax on subtotal + service fee - discount
  const taxableAmount = Math.max(0, subtotal + serviceFee - discountResult.discountAmount);
  const tax = taxableAmount * 0.05; // 5% tax

  const total = Math.max(0, subtotal + serviceFee - discountResult.discountAmount + tax);

  return {
    subtotal,
    discount: discountResult.discountAmount,
    discountPercentage: discountResult.discountPercentage,
    serviceFee,
    tax,
    total,
    coupon: discountResult.coupon,
    isValidCoupon: discountResult.isValid,
    couponError: discountResult.error || null,
    hasServiceFee
  };
};