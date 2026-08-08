/**
 * Fallback VAT rate used when AdminRevenueSettings.taxSettings.vatRate is
 * unavailable. Single source of truth for the `|| 5` literals that used to
 * be scattered across booking.controller.ts and order.controller.ts.
 */
export const DEFAULT_VAT_RATE = 5;
