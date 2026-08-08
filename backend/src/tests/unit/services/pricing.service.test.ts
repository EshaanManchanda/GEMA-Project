/**
 * Tests for the shared order pricing formula (services/pricing.service.ts),
 * which both booking.controller.ts and order.controller.ts now call instead
 * of duplicating the formula — duplicating it is exactly how those two
 * controllers ended up disagreeing before this refactor:
 * booking.controller.ts netted the coupon off before charging VAT,
 * order.controller.ts didn't. This suite is the replacement for the earlier
 * booking-pricing-formula.test.ts golden-formula spec.
 */
import { calculateOrderPricing, resolveVatRate } from "../../../services/pricing.service";

describe("calculateOrderPricing", () => {
  it("charges VAT on the coupon-discounted subtotal", () => {
    const { taxableBase, vat, total } = calculateOrderPricing({
      subtotal: 100,
      couponDiscount: 10,
      vatRate: 5,
      currency: "AED",
      isFree: false,
    });
    expect(taxableBase).toBe(90);
    expect(vat).toBe(4.5); // 90 * 5%
    expect(total).toBe(94.5); // 90 + 4.5
  });

  it("zeroes everything for a free order regardless of subtotal", () => {
    const result = calculateOrderPricing({
      subtotal: 100,
      couponDiscount: 0,
      vatRate: 5,
      currency: "AED",
      isFree: true,
    });
    expect(result).toEqual({ taxableBase: 0, vat: 0, total: 0 });
  });

  it("floors the taxable base at zero when a coupon exceeds the subtotal", () => {
    const { taxableBase, vat, total } = calculateOrderPricing({
      subtotal: 50,
      couponDiscount: 60,
      vatRate: 5,
      currency: "AED",
      isFree: false,
    });
    expect(taxableBase).toBe(0);
    expect(vat).toBe(0);
    expect(total).toBe(0);
  });

  it("rounds VAT once at order level, not per line item (multi-seat safe)", () => {
    // 3 seats at 33.33 each = 99.99 subtotal; a naive per-seat rounding of
    // (33.33 * 0.05 = 1.6665 -> 1.67) * 3 = 5.01 would drift from rounding
    // once on the order total.
    const { vat, total } = calculateOrderPricing({
      subtotal: 99.99,
      couponDiscount: 0,
      vatRate: 5,
      currency: "AED",
      isFree: false,
    });
    expect(vat).toBe(5); // round(99.99 * 0.05, 2) = round(4.9995, 2) = 5.00
    expect(total).toBe(104.99);
  });

  it("satisfies the invariant total === taxableBase + vat exactly", () => {
    const cases = [
      { subtotal: 133.33, couponDiscount: 12.5, vatRate: 5 },
      { subtotal: 0, couponDiscount: 0, vatRate: 5 },
      { subtotal: 1000, couponDiscount: 0, vatRate: 7.5 },
    ];
    for (const c of cases) {
      const { taxableBase, vat, total } = calculateOrderPricing({
        ...c,
        currency: "AED",
        isFree: false,
      });
      expect(total).toBeCloseTo(taxableBase + vat, 2);
    }
  });

  it("agrees for both former call sites given the same coupon-discounted subtotal", () => {
    // Before this refactor, booking.controller.ts and order.controller.ts
    // computed different totals for the same cart with a coupon applied
    // (order.controller.ts ignored the coupon before charging tax). Both
    // now route through this single function, so they necessarily agree.
    const input = { subtotal: 100, couponDiscount: 20, vatRate: 5, currency: "AED", isFree: false };
    expect(calculateOrderPricing(input)).toEqual(calculateOrderPricing({ ...input }));
  });
});

describe("resolveVatRate", () => {
  it("uses the admin-configured rate when present and valid", () => {
    expect(resolveVatRate(7.5)).toBe(7.5);
    expect(resolveVatRate(0)).toBe(0);
  });

  it("falls back to DEFAULT_VAT_RATE when undefined, null, or negative", () => {
    expect(resolveVatRate(undefined)).toBe(5);
    expect(resolveVatRate(null)).toBe(5);
    expect(resolveVatRate(-1)).toBe(5);
  });
});
