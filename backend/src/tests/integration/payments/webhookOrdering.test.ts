/**
 * Stripe delivers events late, twice and out of order. A stale event must
 * not mislead a customer or downgrade a paying vendor.
 */
import { Types } from "mongoose";
import Order from "../../../models/Order";
import Vendor from "../../../models/Vendor";
import Notification from "../../../models/Notification";
import { PaymentService } from "../../../services/payment.service";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../services/email.service", () => {
  const svc = new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) });
  return { __esModule: true, default: svc, emailService: svc, sendEmail: jest.fn() };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../config/redis", () => ({ __esModule: true, default: null, redisClient: null }));
const retrieveSubscription = jest.fn();
jest.mock("../../../config/stripe", () => ({
  ...jest.requireActual("../../../config/stripe"),
  stripe: { subscriptions: { retrieve: (...a: unknown[]) => retrieveSubscription(...a) } },
}));

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const evt = (type: string, object: Record<string, unknown>) =>
  ({ id: `evt_${new Types.ObjectId()}`, type, data: { object } }) as any;

it("a late payment_failed doesn't tell a customer who has since paid that payment failed", async () => {
  const orderId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  await Order.collection.insertOne({ _id: orderId, userId, status: "confirmed", paymentStatus: "paid", total: 100, items: [] });

  await PaymentService.processWebhookEvent(
    evt("payment_intent.payment_failed", { id: "pi_x", object: "payment_intent", metadata: { orderId: String(orderId) } }),
  );

  expect(await Notification.countDocuments({ userId })).toBe(0);
});

it("an out-of-order subscription.updated uses Stripe's current state, not the stale payload", async () => {
  const vendorId = new Types.ObjectId();
  await Vendor.collection.insertOne({
    _id: vendorId,
    userId: new Types.ObjectId(),
    email: "v@example.com",
    businessName: "Vendor Co",
    address: { street: "1 St", city: "Dubai", state: "Dubai", zipCode: "00000" },
    contactPerson: { name: "V", email: "v@example.com", phone: "+971500000000" },
    paymentSettings: { subscriptionStatus: "active", stripeSettings: { stripeSubscriptionStatus: "active" } },
  });
  const stale = { id: "sub_1", object: "subscription", status: "incomplete", metadata: { vendorId: String(vendorId) }, items: { data: [] } };
  retrieveSubscription.mockResolvedValue({ ...stale, status: "active", cancel_at_period_end: false });

  await PaymentService.processWebhookEvent(evt("customer.subscription.updated", stale));

  const after: any = await Vendor.findById(vendorId).lean();
  expect(after.paymentSettings.subscriptionStatus).toBe("active");
  expect(retrieveSubscription).toHaveBeenCalledWith("sub_1");
});
