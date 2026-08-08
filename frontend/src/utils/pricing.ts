// Shared order pricing calculation — mirrors backend/src/services/pricing.service.ts.
//
// Single source of truth for the frontend. Before this file existed, three
// different places computed tax/total with three different (disagreeing)
// formulas: utils/couponUtils.ts, components/booking/PaymentForm.tsx, and
// services/vendorPaymentService.ts. All three now delegate here.
//
// Service fees are NOT part of this calculation — they were removed from
// the customer-facing charge. The platform still earns via vendor-side
// commission, computed on the backend.

import { getCurrencyConfig } from './currencyUtils';

/** Fallback VAT rate used only if the backend didn't provide one. */
export const DEFAULT_VAT_RATE = 5;

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
 * Round a money amount to the correct precision for its currency. Half-up,
 * computed in minor units to avoid float drift. Mirrors
 * backend/src/utils/money.ts's roundMoney.
 */
export const roundMoney = (amount: number, currency: string): number => {
  if (!Number.isFinite(amount)) return 0;
  const { decimals } = getCurrencyConfig(currency);
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
};

/**
 * VAT is rounded once, at order level, on the already-coupon-net
 * taxableBase — never per line item, to avoid drift on multi-seat bookings.
 * `total` is the sum of two already-rounded parts, so
 * `total === taxableBase + vat` holds exactly, to the cent.
 */
export const calculateOrderPricing = ({
  subtotal,
  couponDiscount,
  vatRate,
  currency,
  isFree,
}: OrderPricingInput): OrderPricingResult => {
  if (isFree) {
    return { taxableBase: 0, vat: 0, total: 0 };
  }

  const taxableBase = roundMoney(Math.max(0, subtotal - couponDiscount), currency);
  const vat = roundMoney(taxableBase * (vatRate / 100), currency);
  const total = roundMoney(taxableBase + vat, currency);

  return { taxableBase, vat, total };
};

/**
 * Resolve the effective VAT rate: server-provided rate if present and
 * valid, otherwise DEFAULT_VAT_RATE.
 */
export const resolveVatRate = (serverProvidedRate: number | undefined | null): number =>
  typeof serverProvidedRate === 'number' && serverProvidedRate >= 0
    ? serverProvidedRate
    : DEFAULT_VAT_RATE;
