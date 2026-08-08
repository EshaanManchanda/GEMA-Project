import { roundMoney } from "../utils/money";
import { DEFAULT_VAT_RATE } from "../constants/pricing";

export interface OrderPricingInput {
  subtotal: number;
  couponDiscount: number;
  vatRate: number;
  currency: string;
  isFree: boolean;
}

export interface OrderPricingResult {
  /** subtotal minus couponDiscount, the amount VAT is charged on */
  taxableBase: number;
  vat: number;
  /** taxableBase + vat — what the customer pays */
  total: number;
}

/**
 * Single source of truth for order pricing math (booking.controller.ts and
 * order.controller.ts both call this instead of duplicating the formula —
 * duplicating it is exactly how those two controllers ended up disagreeing
 * before this refactor: booking.controller.ts netted the coupon off before
 * charging fee/tax, order.controller.ts didn't).
 *
 * Service fees are NOT part of this calculation — they were removed from
 * the customer-facing charge (see plan: VAT rename + service-fee removal).
 * The platform still earns via vendor-side commission, computed separately
 * in commission.service.ts against (subtotal - couponDiscount).
 *
 * Rounding: VAT is rounded once, at order level, on the already-coupon-net
 * taxableBase — never per line item, to avoid drift on multi-seat bookings.
 * `total` is the sum of two already-rounded parts, so
 * `total === taxableBase + vat` holds exactly, to the cent.
 */
export function calculateOrderPricing({
  subtotal,
  couponDiscount,
  vatRate,
  currency,
  isFree,
}: OrderPricingInput): OrderPricingResult {
  if (isFree) {
    return { taxableBase: 0, vat: 0, total: 0 };
  }

  const taxableBase = roundMoney(Math.max(0, subtotal - couponDiscount), currency);
  const vat = roundMoney(taxableBase * (vatRate / 100), currency);
  const total = roundMoney(taxableBase + vat, currency);

  return { taxableBase, vat, total };
}

/**
 * Resolve the effective VAT rate: admin-configured rate if present and
 * valid, otherwise DEFAULT_VAT_RATE. Centralizes the `?? DEFAULT_VAT_RATE`
 * fallback that used to be a bare `|| 5` at each call site.
 */
export function resolveVatRate(adminConfiguredRate: number | undefined | null): number {
  return typeof adminConfiguredRate === "number" && adminConfiguredRate >= 0
    ? adminConfiguredRate
    : DEFAULT_VAT_RATE;
}
