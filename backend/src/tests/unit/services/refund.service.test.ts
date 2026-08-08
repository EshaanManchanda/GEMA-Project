/**
 * Tests for RefundService.calculateRefundableAmount, post Phase 7
 * (VAT rename + service-fee removal): VAT is now refundable —
 * `refundAmount = ticketPrice + vat`, `nonRefundableAmount = serviceFee`
 * (legacy-only, 0 on every order created after service-fee removal).
 *
 * Pure function, no DB required.
 */
import { RefundService } from "../../../services/refund.service";

const baseOrder = (overrides: Record<string, any> = {}) => ({
  paymentStatus: "paid",
  subtotal: 100,
  couponDiscount: 0,
  serviceFee: 0, // 0 on every order created after service-fee removal
  vat: 5.25,
  ...overrides,
});

describe("RefundService.calculateRefundableAmount", () => {
  it("returns all-zero when the order was never paid", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder({ paymentStatus: "pending" }),
      "user_requested",
    );
    expect(result).toEqual({
      refundAmount: 0,
      nonRefundableAmount: 0,
      serviceFee: 0,
      vat: 0,
    });
  });

  it("refunds ticket price plus VAT on a new order (no legacy serviceFee)", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder(),
      "user_requested",
    );
    expect(result.refundAmount).toBe(105.25); // subtotal - couponDiscount + vat
    expect(result.nonRefundableAmount).toBe(0);
    expect(result.serviceFee).toBe(0);
    expect(result.vat).toBe(5.25);
  });

  it("withholds only the legacy serviceFee on an order that predates its removal", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder({ serviceFee: 5 }),
      "user_requested",
    );
    expect(result.refundAmount).toBe(105.25); // VAT still refunded
    expect(result.nonRefundableAmount).toBe(5); // only the legacy fee withheld
  });

  it("subtracts the coupon discount from the refundable ticket price, still adds VAT back", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder({ couponDiscount: 20 }),
      "event_cancelled",
    );
    expect(result.refundAmount).toBe(85.25); // (100-20) + 5.25
    expect(result.nonRefundableAmount).toBe(0);
  });

  it("floors the refund amount at zero when a coupon exceeds the subtotal and there's no VAT", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder({ subtotal: 50, couponDiscount: 60, vat: 0 }),
      "user_requested",
    );
    expect(result.refundAmount).toBe(0);
  });

  it("treats missing serviceFee/vat as zero (legacy-safe default)", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder({ serviceFee: undefined, vat: undefined }),
      "admin_cancelled",
    );
    expect(result.nonRefundableAmount).toBe(0);
    expect(result.refundAmount).toBe(100);
  });

  it("handles a free event (zero subtotal, zero fees)", () => {
    const result = RefundService.calculateRefundableAmount(
      baseOrder({ subtotal: 0, serviceFee: 0, vat: 0 }),
      "user_requested",
    );
    expect(result).toEqual({
      refundAmount: 0,
      nonRefundableAmount: 0,
      serviceFee: 0,
      vat: 0,
    });
  });

  /**
   * NOTE: there is no partial/proportional-refund code path anywhere in
   * this codebase today (verified by grep across backend/src) —
   * `calculateRefundableAmount` and `processRefund` always operate on a
   * whole order; there is no seat-count or line-item parameter. The plan's
   * "partial and proportional cancellation" test requirement is covered
   * here as: the function is linear in subtotal/couponDiscount/vat, so
   * scaling every input by the same factor scales the result by that same
   * factor. This documents current scope (whole-order only) rather than
   * asserting a partial-cancellation feature that doesn't exist — if
   * partial/multi-seat cancellation is added later, it needs its own
   * proportional-share logic before calling into this function.
   */
  describe("linearity (stand-in for partial/proportional cancellation coverage)", () => {
    it("scales refundAmount linearly when subtotal, couponDiscount, and vat are all scaled by the same factor", () => {
      const full = RefundService.calculateRefundableAmount(
        baseOrder({ subtotal: 300, couponDiscount: 30, vat: 13.5 }),
        "user_requested",
      );
      const oneThird = RefundService.calculateRefundableAmount(
        baseOrder({ subtotal: 100, couponDiscount: 10, vat: 4.5 }),
        "user_requested",
      );
      expect(oneThird.refundAmount).toBeCloseTo(full.refundAmount / 3, 2);
    });
  });
});
