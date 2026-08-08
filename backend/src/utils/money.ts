/**
 * Money rounding utilities.
 *
 * Single source of truth for how order money fields (subtotal, vat, total,
 * commission, vendorPayout, refund amounts) get rounded. All stored money
 * fields are 2 decimal places for every currency currently in the `Order`
 * currency enum (INR, AED, USD, EUR, GBP, EGP, CAD) — all 100-minor-unit
 * currencies. `NO_DECIMAL_CURRENCIES` exists so a future zero-decimal
 * currency (JPY, KWD) doesn't silently get rounded to the wrong precision.
 *
 * Rounding is half-up, computed in minor units (cents/fils) to avoid the
 * float drift that comes from rounding decimal amounts directly.
 */

// Currencies with no minor unit (their smallest denomination is 1, not 0.01)
const NO_DECIMAL_CURRENCIES = new Set(["jpy", "krw"]);

/**
 * Round a money amount to the correct precision for its currency.
 * Half-up rounding, computed in minor units.
 *
 * @param amount - amount in major units (e.g. 12.505 AED)
 * @param currency - ISO currency code, case-insensitive
 * @returns amount rounded to the currency's minor-unit precision
 */
export const roundMoney = (amount: number, currency: string): number => {
  if (!Number.isFinite(amount)) return 0;

  const code = (currency || "").toLowerCase();

  if (NO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }

  // Round in minor units (cents/fils) to avoid float drift, then convert back.
  return Math.round(amount * 100) / 100;
};
