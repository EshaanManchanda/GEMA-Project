/**
 * Regression tests for the cross-tenant access (IDOR) fixes:
 * vendors / customers must not reach another tenant's data by changing an ID.
 *
 * Fixtures are inserted via raw collections so model validation doesn't get in
 * the way; only the ownership fields matter here.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User, { UserStatus } from "../../../models/User";
import Vendor from "../../../models/Vendor";
import Event from "../../../models/Event";
import Ticket from "../../../models/Ticket";
import Order from "../../../models/Order";
import Student from "../../../models/Student";
import Employee from "../../../models/Employee";
import { stripe } from "../../../config/stripe";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../services/email.service", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../config/redis", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    quit: jest.fn().mockResolvedValue(undefined),
    status: "end",
  },
  redisPool: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    isHealthy: jest.fn().mockReturnValue(false),
    getConnection: jest.fn().mockReturnValue(null),
  },
}));

jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

type Session = { accessToken: string; csrfToken: string; userId: string };

const uniqueEmail = (label: string) =>
  `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

const cookie = (s: Session) => `accessToken=${s.accessToken}; XSRF-TOKEN=${s.csrfToken}`;

const extractCookie = (cookies: string[], name: string) => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  return c ? c.split(";")[0].replace(`${name}=`, "") : "";
};

async function login(app: Application, email: string, password: string, userId: string): Promise<Session> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookies: string[] = (res.headers["set-cookie"] as unknown as string[]) || [];
  return { accessToken: extractCookie(cookies, "accessToken"), csrfToken: extractCookie(cookies, "XSRF-TOKEN"), userId };
}

async function signUp(app: Application, role: "vendor" | "customer") {
  const payload = { firstName: "T", lastName: "U", email: uniqueEmail(role), password: "Test@1234!", role };
  const reg = await request(app).post("/api/auth/register").send(payload);
  await User.findOneAndUpdate({ email: payload.email }, { isEmailVerified: true, status: UserStatus.ACTIVE });
  return login(app, payload.email, payload.password, reg.body.data.user.id);
}

async function signUpAdmin(app: Application) {
  const payload = { firstName: "T", lastName: "A", email: uniqueEmail("admin"), password: "Test@1234!", adminSecretKey: process.env.ADMIN_SECRET_KEY };
  await request(app).post("/api/auth/register-admin").send(payload);
  const user = await User.findOne({ email: payload.email }).select("_id").lean();
  return login(app, payload.email, payload.password, String(user!._id));
}

const vendorIdOf = async (s: Session) => String((await Vendor.findOne({ userId: s.userId }).select("_id").lean())!._id);

async function insertEvent(vendorId: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Event.collection.insertOne({
    _id,
    title: "Owned Event",
    slug: `owned-${_id}`,
    type: "Event",
    vendorId: new Types.ObjectId(vendorId),
    status: "published",
    isApproved: true,
    claimStatus: "not_claimable",
    ...extra,
  });
  return String(_id);
}

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await clearTestDB();
});
afterAll(closeTestDB);

describe("cross-tenant access", () => {
  it("vendor cannot list another vendor's event tickets (customer PII)", async () => {
    const [a, b] = [await signUp(app, "vendor"), await signUp(app, "vendor")];
    const eventId = await insertEvent(await vendorIdOf(a));
    await Ticket.collection.insertOne({ eventId: new Types.ObjectId(eventId), userId: new Types.ObjectId(), ticketNumber: "T-1", attendeeEmail: "kid@x.test" });

    const other = await request(app).get(`/api/tickets/event/${eventId}`).set("Cookie", cookie(b));
    expect(other.status).toBe(403);
    const owner = await request(app).get(`/api/tickets/event/${eventId}`).set("Cookie", cookie(a));
    expect(owner.status).toBe(200);
  });

  it("vendor cannot claim another vendor's (not_claimable) event", async () => {
    const [a, b] = [await signUp(app, "vendor"), await signUp(app, "vendor")];
    const vendorA = await vendorIdOf(a);
    const eventId = await insertEvent(vendorA);

    const res = await request(app)
      .post(`/api/events/${eventId}/claim`)
      .set("Cookie", cookie(b))
      .set("X-CSRF-Token", b.csrfToken);
    expect(res.status).toBe(400);
    const event = await Event.findById(eventId).select("vendorId").lean();
    expect(String(event!.vendorId)).toBe(vendorA);
  });

  it("vendor cannot read another vendor's cancellation contact list", async () => {
    const [a, b] = [await signUp(app, "vendor"), await signUp(app, "vendor")];
    const eventId = await insertEvent(await vendorIdOf(a));

    const other = await request(app).get(`/api/events/${eventId}/affected-orders`).set("Cookie", cookie(b));
    expect(other.status).toBe(403);
    const owner = await request(app).get(`/api/events/${eventId}/affected-orders`).set("Cookie", cookie(a));
    expect(owner.status).toBe(200);
  });

  it("a child's record is visible only to its parent and admins", async () => {
    const [parent, stranger, admin] = [await signUp(app, "customer"), await signUp(app, "customer"), await signUpAdmin(app)];
    const _id = new Types.ObjectId();
    await Student.collection.insertOne({ _id, firstName: "Kid", email: "kid@x.test", parentUserId: new Types.ObjectId(parent.userId), status: "active" });

    expect((await request(app).get(`/api/students/${_id}`).set("Cookie", cookie(stranger))).status).toBe(404);
    expect((await request(app).get(`/api/students/${_id}`).set("Cookie", cookie(parent))).status).toBe(200);
    expect((await request(app).get(`/api/students/${_id}`).set("Cookie", cookie(admin))).status).toBe(200);
  });

  it("a paid PaymentIntent from one order cannot pay a different order", async () => {
    const customer = await signUp(app, "customer");
    const orderId = new Types.ObjectId();
    await Order.collection.insertOne({ _id: orderId, userId: new Types.ObjectId(customer.userId), paymentStatus: "pending", status: "pending", items: [], total: 500 });
    jest.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue({
      id: "pi_cheap",
      status: "succeeded",
      metadata: { orderId: String(new Types.ObjectId()) }, // created for some other order
    } as never);

    const res = await request(app)
      .post(`/api/orders/${orderId}/payment`)
      .set("Cookie", cookie(customer))
      .set("X-CSRF-Token", customer.csrfToken)
      .send({ paymentMethod: "stripe", paymentIntentId: "pi_cheap" });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain("does not belong to this order");
    const order = await Order.findById(orderId).select("paymentStatus").lean();
    expect(order!.paymentStatus).toBe("pending");
  });
});

describe("admin-created accounts", () => {
  const newUser = (extra: Record<string, unknown>) => ({
    firstName: "New",
    lastName: "Hire",
    email: uniqueEmail("hire"),
    password: "Str0ng!Pass",
    ...extra,
  });

  it("refuses a missing password and the old public default", async () => {
    const admin = await signUpAdmin(app);
    for (const password of [undefined, "", "TempPass123!"]) {
      const res = await request(app).post("/api/admin/users").set("Cookie", cookie(admin)).set("X-CSRF-Token", admin.csrfToken)
        .send(newUser({ role: "customer", password }));
      expect(res.status).toBe(400);
    }
    expect(await User.countDocuments({ firstName: "New" })).toBe(0);
  });

  it("refuses an employee without a real vendor, and links one that has it", async () => {
    const admin = await signUpAdmin(app);
    const post = (body: Record<string, unknown>) =>
      request(app).post("/api/admin/users").set("Cookie", cookie(admin)).set("X-CSRF-Token", admin.csrfToken).send(body);

    expect((await post(newUser({ role: "employee" }))).status).toBe(400);
    expect((await post(newUser({ role: "employee", vendorId: String(new Types.ObjectId()) }))).status).toBe(404);
    expect(await User.countDocuments({ firstName: "New" })).toBe(0);

    const vendorId = await vendorIdOf(await signUp(app, "vendor"));
    const ok = await post(newUser({ role: "employee", vendorId }));
    expect(ok.status).toBe(201);
    const employee = await Employee.findOne({ email: ok.body.data.user.email }).lean();
    expect(String(employee!.vendorId)).toBe(vendorId);
  });

  it("admin employee endpoint also refuses the old default password", async () => {
    const admin = await signUpAdmin(app);
    const vendorId = await vendorIdOf(await signUp(app, "vendor"));
    const res = await request(app).post("/api/admin/employees").set("Cookie", cookie(admin)).set("X-CSRF-Token", admin.csrfToken)
      .send(newUser({ role: "scanner", vendorId, password: "TempPass123!" }));
    expect(res.status).toBe(400);
  });
});

it("vendors can't save a manual Stripe secret key (payments on it can't be confirmed)", async () => {
  const vendor = await signUp(app, "vendor");
  const res = await request(app).put("/api/vendors/payment-settings/stripe/keys").set("Cookie", cookie(vendor)).set("X-CSRF-Token", vendor.csrfToken)
    .send({ publishableKey: "pk_test_x", secretKey: "sk_test_x", testMode: true });
  expect(res.status).toBe(409);
});
