export { default as Coupon, CouponType, CouponStatus } from "./coupon.model";
export type { ICoupon, ICouponUsage } from "./coupon.model";
export { CouponService } from "./coupon.service";
export type { CouponValidationResult } from "./coupon.service";
export {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  getActiveCoupons,
  getCouponStats,
  getUserCouponHistory,
  bulkUpdateCoupons,
} from "./coupon.controller";
export { default as couponRoutes } from "./coupon.routes";
export {
  createCouponValidation,
  updateCouponValidation,
  applyCouponValidation,
} from "./coupon.validator";
