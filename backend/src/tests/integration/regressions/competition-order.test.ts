/**
 * Merge regression: a paid AI-Art competition entry must (a) create the parent
 * account, and (b) record exactly one Order for the Stripe session, however
 * many times finalize runs (browser finalize + Stripe webhook can both fire).
 */
import "../setup/mocks";
import { Types } from "mongoose";
import CompetitionSubmission from "../../../models/CompetitionSubmission";
import User from "../../../models/User";
import { Order } from "../../../models/index";
import { activatePaidSubmission } from "../../../services/competition.service";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const insertSubmission = async (parentEmail: string) => {
  const _id = new Types.ObjectId();
  await CompetitionSubmission.collection.insertOne({
    _id,
    paymentStatus: "pending",
    participant: {
      studentFullName: "Test Child",
      parentName: "Test Parent",
      parentEmail,
      parentPhone: "+971500000000",
      grade: "5",
      schoolName: "Test School",
    },
    artwork: { title: "My Art" },
    metadata: { ipAddress: "203.0.113.5" },
    createdAt: new Date(),
  });
  return _id;
};

describe("activatePaidSubmission", () => {
  it("marks the entry paid, creates the parent, and records one Order", async () => {
    const id = await insertSubmission("parent.order@example.com");

    expect(await activatePaidSubmission(id, "cs_test_order_1")).toBe(true);

    const sub = await CompetitionSubmission.findById(id).lean();
    expect(sub?.paymentStatus).toBe("paid");
    expect(sub?.checkoutSessionId).toBe("cs_test_order_1");

    const parent = await User.findOne({ email: "parent.order@example.com" }).lean();
    expect(parent).toBeTruthy();

    const orders = await Order.find({ transactionId: "cs_test_order_1" }).lean();
    expect(orders).toHaveLength(1);
    expect(String(orders[0].userId)).toBe(String(parent!._id));
    expect(orders[0].paymentStatus).toBe("paid");
    expect(orders[0].total).toBe(50);
  });

  it("does nothing the second time (browser finalize + webhook race)", async () => {
    const id = await insertSubmission("parent.twice@example.com");

    expect(await activatePaidSubmission(id, "cs_test_order_2")).toBe(true);
    expect(await activatePaidSubmission(id, "cs_test_order_2")).toBe(false);

    expect(await Order.countDocuments({ transactionId: "cs_test_order_2" })).toBe(1);
    expect(await User.countDocuments({ email: "parent.twice@example.com" })).toBe(1);
  });

  it("does not create an Order for an unknown submission", async () => {
    expect(await activatePaidSubmission(new Types.ObjectId(), "cs_test_order_3")).toBe(false);
    expect(await Order.countDocuments({ transactionId: "cs_test_order_3" })).toBe(0);
  });
});
