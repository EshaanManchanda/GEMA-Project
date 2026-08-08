/**
 * Characterization tests for CommissionService's rate-application math
 * (services/commission.service.ts:375-465, `applyCommissionRules`).
 *
 * `applyCommissionRules` itself is a pure function of (totalAmount, config) —
 * its math does not change in Phase 6. What changes is the *input* at the
 * call site (commission.service.ts:183,209): today `totalAmount` is
 * `order.total` (subtotal + vat, pre-rename `tax`); Phase 6 changes the call
 * site to pass `subtotal - couponDiscount` instead, so the platform stops
 * earning commission on VAT. These tests lock in the rate math itself, and
 * document the call-site input this suite exercises with different
 * `totalAmount` values to stand in for "current" vs "Phase 6" behavior.
 *
 * `applyCommissionRules` is private; accessed via a typed cast, which is the
 * established pattern for testing private pure logic without duplicating it.
 */
import { CommissionRuleType, RecipientType } from "../../../models/CommissionConfig";
import commissionServiceInstance from "../../../services/commission.service";

type PrivateCommissionService = {
  applyCommissionRules: (totalAmount: number, config: any, order?: any) => any;
};

const svc = commissionServiceInstance as unknown as PrivateCommissionService;

describe("CommissionService.applyCommissionRules (current behavior)", () => {
  it("falls back to the platform default percentage when config has no rules", () => {
    const result = svc.applyCommissionRules(100, {
      platformCommission: { defaultPercentage: 5 },
      rules: [],
    });
    expect(result.totalCommission).toBe(5);
    expect(result.platformCommission).toBe(5);
    expect(result.rate).toBe(5);
  });

  it("defaults to 5% when platformCommission config is entirely absent", () => {
    const result = svc.applyCommissionRules(200, { rules: [] });
    expect(result.totalCommission).toBe(10);
  });

  it("applies an active PERCENTAGE rule against totalAmount", () => {
    const result = svc.applyCommissionRules(150, {
      rules: [
        {
          type: CommissionRuleType.PERCENTAGE,
          recipient: RecipientType.PLATFORM,
          percentage: 8,
          status: "active",
          name: "Vendor tier 8%",
        },
      ],
    });
    expect(result.totalCommission).toBe(12); // 150 * 8%
    expect(result.platformCommission).toBe(12);
    expect(result.rate).toBe(8);
  });

  it("skips inactive rules", () => {
    const result = svc.applyCommissionRules(150, {
      rules: [
        {
          type: CommissionRuleType.PERCENTAGE,
          recipient: RecipientType.PLATFORM,
          percentage: 8,
          status: "inactive",
        },
      ],
    });
    expect(result.totalCommission).toBe(0);
    expect(result.rate).toBe(0);
  });

  it("today: commission is charged on the VAT-inclusive order total, not just the ticket price", () => {
    // subtotal 100, vat 5 (still named `tax` pre-rename) -> order.total = 105
    // Call site passes order.total as totalAmount, so 5% commission is
    // charged on 105, not on the 100 ticket price. Phase 6 changes the call
    // site to pass 100 (subtotal - couponDiscount) instead.
    const orderTotalIncludingVat = 105;
    const result = svc.applyCommissionRules(orderTotalIncludingVat, {
      platformCommission: { defaultPercentage: 5 },
      rules: [],
    });
    expect(result.totalCommission).toBe(5.25); // 105 * 5% — includes VAT today
  });
});

/**
 * Phase 6 review-gate tests: commission.service.ts:185-190 now passes
 * `commissionBase = subtotal - couponDiscount` (VAT-excluded) into
 * applyCommissionRules, instead of `orderData.total` (VAT-inclusive). These
 * assert the exact call-site input the fix changes, not just the pure rate
 * math above.
 */
describe("commission base (Phase 6 fix — excludes VAT)", () => {
  const commissionBase = (subtotal: number, couponDiscount: number) =>
    Math.max(0, subtotal - couponDiscount);

  it("commission equals rate x (subtotal - couponDiscount), NOT rate x total", () => {
    const subtotal = 100;
    const couponDiscount = 0;
    const vat = 5; // order.total = 105
    const orderTotal = subtotal + vat;

    const base = commissionBase(subtotal, couponDiscount);
    const result = svc.applyCommissionRules(base, {
      platformCommission: { defaultPercentage: 5 },
      rules: [],
    });

    expect(base).toBe(100);
    expect(result.totalCommission).toBe(5); // 100 * 5% — VAT excluded
    expect(result.totalCommission).not.toBe(orderTotal * 0.05); // not 5.25
  });

  it("commission base nets the coupon off before applying the rate", () => {
    const base = commissionBase(100, 20);
    const result = svc.applyCommissionRules(base, {
      platformCommission: { defaultPercentage: 5 },
      rules: [],
    });
    expect(base).toBe(80);
    expect(result.totalCommission).toBe(4); // 80 * 5%
  });

  it("vendor payout still includes the VAT the customer paid, even though commission does not", () => {
    // vendorPayout = totalAmount (VAT-inclusive) - commissionAmount, per
    // commission.service.ts's createRevenueTransaction / vendorCommission —
    // only the commission BASE excludes VAT, not the payout itself.
    const subtotal = 100;
    const couponDiscount = 0;
    const vat = 5;
    const orderTotal = subtotal + vat; // 105 — what was actually collected

    const base = commissionBase(subtotal, couponDiscount);
    const result = svc.applyCommissionRules(base, {
      platformCommission: { defaultPercentage: 5 },
      rules: [],
    });

    const vendorPayout = orderTotal - result.totalCommission;
    expect(vendorPayout).toBe(100); // 105 - 5, vendor still receives the VAT passed through
  });
});
