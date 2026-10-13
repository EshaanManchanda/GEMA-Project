/**
 * The seat-expiry sweep must never cancel an order whose Stripe payment
 * succeeded (missed webhook + closed tab) — it reconciles it instead.
 */
const retrieve = jest.fn();
const handlePaymentSucceeded = jest.fn();

jest.mock("../../../config/queue", () => ({
  areQueuesEnabled: false,
  seatExpiryQueue: null,
  bullMQConnection: null,
  QUEUE_PREFIX: "bull",
  QUEUE_NAMES: { SEAT_EXPIRY: "seat-expiry" },
}));
jest.mock("../../../config/stripe", () => ({ stripe: { paymentIntents: { retrieve } } }));
jest.mock("../../../services/payment.service", () => ({
  PaymentService: { handlePaymentSucceeded },
}));
jest.mock("../../../config/logger");

import { paidOrUnknown } from "../../../workers/seat-expiry.worker";

const order = (paymentIntentId?: string) => ({ _id: "o1", paymentIntentId });

describe("seat-expiry paidOrUnknown", () => {
  it("releases orders without a real Stripe intent", async () => {
    expect(await paidOrUnknown(order())).toBe(false);
    expect(await paidOrUnknown(order("test_pi_o1"))).toBe(false);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("reconciles and keeps a paid order", async () => {
    const intent = { id: "pi_1", status: "succeeded", metadata: { orderId: "o1" } };
    retrieve.mockResolvedValue(intent);
    expect(await paidOrUnknown(order("pi_1"))).toBe(true);
    expect(handlePaymentSucceeded).toHaveBeenCalledWith(intent);
  });

  it("keeps in-flight payments for the next sweep", async () => {
    retrieve.mockResolvedValue({ status: "processing" });
    expect(await paidOrUnknown(order("pi_1"))).toBe(true);
    expect(handlePaymentSucceeded).not.toHaveBeenCalled();
  });

  it("releases abandoned payments", async () => {
    retrieve.mockResolvedValue({ status: "requires_payment_method" });
    expect(await paidOrUnknown(order("pi_1"))).toBe(false);
  });

  it("keeps the order when Stripe can't be reached", async () => {
    retrieve.mockRejectedValue(Object.assign(new Error("timeout"), { code: "api_connection_error" }));
    expect(await paidOrUnknown(order("pi_1"))).toBe(true);
  });

  it("releases when the intent isn't on the platform account", async () => {
    retrieve.mockRejectedValue(Object.assign(new Error("No such payment_intent"), { code: "resource_missing" }));
    expect(await paidOrUnknown(order("pi_1"))).toBe(false);
  });
});
