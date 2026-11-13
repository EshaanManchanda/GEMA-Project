/**
 * Regressions for the security review of the GCC / Reel / Winter Camp flows
 * (Aditya's branch, merged 13 Nov 2026): payment binding, ownership checks on
 * lookup/upload, admin-only manuscript download, free-order abuse.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import GCCSubmission from "../../../models/GCCSubmission";
import ReelSubmission from "../../../models/ReelSubmission";
import Event from "../../../models/Event";
import Order from "../../../models/Order";
import User, { UserRole, UserStatus } from "../../../models/User";
import Student from "../../../models/Student";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import {
  signUp,
  signUpAdmin,
  vendorIdOf,
  insertEvent,
  cookie,
} from "../setup/session";

// Plain functions (not jest.fn): resetMocks would wipe a jest.fn's implementation.
const mockSessions: Record<string, any> = {};
jest.mock("../../../config/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: async (id: string) => {
          if (!mockSessions[id]) throw new Error("No such checkout session");
          return mockSessions[id];
        },
      },
    },
  },
  stripePublishableKey: "pk_test_mock",
}));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(async () => {
  for (const k of Object.keys(mockSessions)) delete mockSessions[k];
  await clearTestDB();
});
afterAll(closeTestDB);

const PARENT = "parent.sec@example.com";
const participant = (email = PARENT) => ({
  studentFullName: "Test Child",
  studentAge: 10,
  parentName: "Test Parent",
  parentEmail: email,
  parentPhone: "+971500000000",
  grade: "5",
  category: "junior",
  country: "UAE",
  schoolName: "Test School",
});

// Model is `any`: the two Mongoose models are a union TypeScript can't call as one.
const COMPS: { name: string; base: string; Model: any; upload: string }[] = [
  {
    name: "gcc",
    base: "/api/gcc-competition",
    Model: GCCSubmission,
    upload: "submit-story",
  },
  {
    name: "reel",
    base: "/api/reel-competition",
    Model: ReelSubmission,
    upload: "submit-reel",
  },
];

async function insertSubmission(
  Model: any,
  extra: Record<string, unknown> = {},
) {
  const _id = new Types.ObjectId();
  await Model.collection.insertOne({
    _id,
    participant: participant(),
    paymentStatus: "pending",
    paymentAmount: 50,
    status: "pending",
    // Required by the schema on save(); every real registration carries them.
    consent: { competitionUpdatesConsent: true, parentGuardianConsent: true },
    declarations: { originalityDeclaration: true, agreeTerms: true },
    createdAt: new Date(),
    ...extra,
  });
  return String(_id);
}

const paidSession = (
  submissionId: string,
  over: Record<string, unknown> = {},
) => ({
  payment_status: "paid",
  amount_total: 5000,
  currency: "aed",
  metadata: { submissionId },
  ...over,
});

async function waitFor<T>(
  fn: () => Promise<T | null | undefined>,
  ms = 6000,
): Promise<T | null> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

const createParent = (email: string) =>
  User.create({
    firstName: "Real",
    lastName: "Parent",
    email,
    passwordHash: "Test@1234!",
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
  });

// Seats live in dateSchedule[]; that is what the winter-camp registration decrements.
const scheduleOf = (seats = 10) => [
  {
    _id: new Types.ObjectId(),
    startDate: new Date(),
    availableSeats: seats,
    soldSeats: 0,
    totalSeats: seats,
    price: 0,
  },
];
const seatsOf = async (id: string) => {
  const ev: any = await Event.findById(id).lean();
  return {
    available: ev.dateSchedule[0].availableSeats,
    sold: ev.dateSchedule[0].soldSeats,
  };
};

describe.each(COMPS)("$name finalize", ({ base, Model }) => {
  it("rejects a paid session that was created for a different submission", async () => {
    const victim = await insertSubmission(Model);
    const other = await insertSubmission(Model);
    mockSessions["cs_other"] = paidSession(other); // paid, but for `other`

    const res = await request(app)
      .post(`${base}/finalize`)
      .send({ submissionId: victim, sessionId: "cs_other" });

    expect(res.status).toBe(400);
    expect((await Model.findById(victim).lean())?.paymentStatus).toBe(
      "pending",
    );
  });

  it("rejects a session whose amount is not the entry fee", async () => {
    const id = await insertSubmission(Model);
    mockSessions["cs_cheap"] = paidSession(id, { amount_total: 100 });

    const res = await request(app)
      .post(`${base}/finalize`)
      .send({ submissionId: id, sessionId: "cs_cheap" });

    expect(res.status).toBe(400);
    expect((await Model.findById(id).lean())?.paymentStatus).toBe("pending");
  });

  it("does not honour the test-payment bypass unless ALLOW_TEST_PAYMENT_SKIP is set", async () => {
    const id = await insertSubmission(Model);
    delete process.env.ALLOW_TEST_PAYMENT_SKIP;

    const res = await request(app)
      .post(`${base}/finalize`)
      .send({ submissionId: id, sessionId: "TEST_PAYMENT_SKIP" });

    expect(res.status).toBe(502); // falls through to Stripe, which has no such session
    expect((await Model.findById(id).lean())?.paymentStatus).toBe("pending");
  });

  it("confirms a genuine payment once, even when finalize runs twice at the same time", async () => {
    const id = await insertSubmission(Model);
    mockSessions["cs_ok"] = paidSession(id);

    const [a, b] = await Promise.all([
      request(app)
        .post(`${base}/finalize`)
        .send({ submissionId: id, sessionId: "cs_ok" }),
      request(app)
        .post(`${base}/finalize`)
        .send({ submissionId: id, sessionId: "cs_ok" }),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect((await Model.findById(id).lean())?.paymentStatus).toBe("paid");
    expect(
      await waitFor(() => Order.findOne({ transactionId: "cs_ok" }).lean()),
    ).toBeTruthy();
    await new Promise((r) => setTimeout(r, 500)); // let a (wrong) second background run finish
    expect(await Order.countDocuments({ transactionId: "cs_ok" })).toBe(1);
    expect(await User.countDocuments({ email: PARENT })).toBe(1);
  });

  // Finalize is unauthenticated: knowing an email must not let someone add a
  // child to that person's account.
  it("does not attach the child to an existing parent account", async () => {
    const parent = await createParent(PARENT);
    const id = await insertSubmission(Model);
    mockSessions["cs_existing"] = paidSession(id);

    const res = await request(app)
      .post(`${base}/finalize`)
      .send({ submissionId: id, sessionId: "cs_existing" });

    expect(res.status).toBe(200);
    // The order is written after the student step, so it marks "background done".
    expect(
      await waitFor(() => Order.findOne({ transactionId: "cs_existing" }).lean()),
    ).toBeTruthy();
    expect(await Student.countDocuments({ parentUserId: parent._id })).toBe(0);
  });

  it("still creates the child for a parent account made by this registration", async () => {
    const id = await insertSubmission(Model);
    mockSessions["cs_new"] = paidSession(id);

    const res = await request(app)
      .post(`${base}/finalize`)
      .send({ submissionId: id, sessionId: "cs_new" });

    expect(res.status).toBe(200);
    expect(
      await waitFor(() => Order.findOne({ transactionId: "cs_new" }).lean()),
    ).toBeTruthy();
    const parent: any = await User.findOne({ email: PARENT }).lean();
    expect(parent).toBeTruthy();
    expect(await Student.countDocuments({ parentUserId: parent._id })).toBe(1);
  });
});

describe.each(COMPS)(
  "$name lookup and upload need the parent email",
  ({ base, Model, upload }) => {
    it("lookup: requires the email, and a wrong email looks exactly like an unknown ref", async () => {
      const id = await insertSubmission(Model, { paymentStatus: "paid" });

      const noEmail = await request(app).get(`${base}/lookup/${id}`);
      expect(noEmail.status).toBe(400);

      const wrong = await request(app)
        .get(`${base}/lookup/${id}`)
        .query({ email: "someone.else@example.com" });
      const unknown = await request(app)
        .get(`${base}/lookup/${new Types.ObjectId()}`)
        .query({ email: "someone.else@example.com" });
      expect(wrong.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(wrong.body.message).toBe(unknown.body.message);
      expect(JSON.stringify(wrong.body)).not.toContain(PARENT);

      const ok = await request(app)
        .get(`${base}/lookup/${id}`)
        .query({ email: PARENT.toUpperCase() });
      expect(ok.status).toBe(200);
      expect(ok.body.data.participant.parentEmail).toBe(PARENT);
    });

    it("upload: refuses without the email and with someone else's email, changing nothing", async () => {
      const id = await insertSubmission(Model, { paymentStatus: "paid" });
      const body = {
        submissionId: id,
        storyTitle: "Hijacked",
        reelTitle: "Hijacked",
        videoDriveLink: "https://evil.example/x",
      };

      const none = await request(app).post(`${base}/${upload}`).send(body);
      const wrong = await request(app)
        .post(`${base}/${upload}`)
        .send({ ...body, email: "someone.else@example.com" });

      expect(none.status).toBe(400);
      expect(wrong.status).toBe(404);
      const stored: any = await Model.findById(id).lean();
      expect(stored.status).toBe("pending");
      expect(stored.story?.title ?? stored.reel?.title).toBeUndefined();
    });
  },
);

describe("reel: an entry under review cannot be overwritten", () => {
  it("accepts the owner's first submission, then refuses a second", async () => {
    const id = await insertSubmission(ReelSubmission, {
      paymentStatus: "paid",
    });
    const send = (link: string) =>
      request(app).post("/api/reel-competition/submit-reel").send({
        submissionId: id,
        email: PARENT,
        reelTitle: "My Reel",
        videoDriveLink: link,
      });

    expect((await send("https://drive.example/one")).status).toBe(200);
    expect((await send("https://drive.example/two")).status).toBe(409);

    const stored: any = await ReelSubmission.findById(id).lean();
    expect(stored.reel.videoDriveLink).toBe("https://drive.example/one");
    expect(stored.status).toBe("under_review");
  });
});

describe("gcc manuscript download is admin only", () => {
  it("401 anonymous, 403 for a customer, reaches the handler for an admin", async () => {
    const id = await insertSubmission(GCCSubmission, { paymentStatus: "paid" });
    const url = `/api/gcc-competition/submissions/${id}/file`;

    expect((await request(app).get(url)).status).toBe(401);

    const customer = await signUp(app, "customer");
    expect(
      (await request(app).get(url).set("Cookie", cookie(customer))).status,
    ).toBe(403);

    const admin = await signUpAdmin(app);
    const res = await request(app).get(url).set("Cookie", cookie(admin));
    expect(res.status).toBe(404); // authorised; this submission simply has no file
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe("winter camp free registration", () => {
  it("never takes a seat or issues a free order for a paid event", async () => {
    const vendor = await signUp(app, "vendor");
    const vendorId = await vendorIdOf(vendor);
    const freeId = await insertEvent(vendorId, {
      title: "Free Camp",
      isFreeEvent: true,
      price: 0,
      dateSchedule: scheduleOf(10),
      isDeleted: false,
    });
    const paidId = await insertEvent(vendorId, {
      title: "Paid Course",
      isFreeEvent: false,
      price: 100,
      dateSchedule: scheduleOf(10),
      isDeleted: false,
    });
    const email = "wc.parent@example.com";

    const res = await request(app)
      .post("/api/winter-camp/register")
      .send({
        studentName: "Camp Kid",
        email,
        grade: "4",
        eventIds: [freeId, paidId, { $ne: null }, 42],
        selectedPrograms: ["Free Camp", "Paid Course", { $ne: null }],
      });
    expect(res.status).toBe(201);

    const order: any = await waitFor(() =>
      Order.findOne({ "billingAddress.email": email }).lean(),
    );
    expect(order).toBeTruthy();
    const linked = order.items.map((i: any) => String(i.eventId));
    expect(linked).toContain(freeId);
    expect(linked).not.toContain(paidId);

    expect(await seatsOf(freeId)).toEqual({ available: 9, sold: 1 });
    expect(await seatsOf(paidId)).toEqual({ available: 10, sold: 0 });
  });

  it("does not link anything when only a paid event is requested", async () => {
    const vendor = await signUp(app, "vendor");
    const paidId = await insertEvent(await vendorIdOf(vendor), {
      title: "Paid Only",
      isFreeEvent: false,
      price: 250,
      dateSchedule: scheduleOf(5),
      isDeleted: false,
    });
    const email = "wc.paid@example.com";

    await request(app)
      .post("/api/winter-camp/register")
      .send({
        studentName: "Kid",
        email,
        grade: "3",
        eventIds: [paidId],
        selectedPrograms: ["Paid Only"],
      });

    const order: any = await waitFor(() =>
      Order.findOne({ "billingAddress.email": email }).lean(),
    );
    expect(order).toBeTruthy();
    expect(order.items.map((i: any) => String(i.eventId))).not.toContain(
      paidId,
    );
    expect(await seatsOf(paidId)).toEqual({ available: 5, sold: 0 });
  });

  it("does not attach the child to an existing account, but creates one for a new account", async () => {
    const vendor = await signUp(app, "vendor");
    const freeId = await insertEvent(await vendorIdOf(vendor), {
      title: "Free Camp",
      isFreeEvent: true,
      price: 0,
      dateSchedule: scheduleOf(10),
      isDeleted: false,
    });
    const existingEmail = "wc.existing@example.com";
    const newEmail = "wc.brandnew@example.com";
    const existing = await createParent(existingEmail);

    for (const email of [existingEmail, newEmail]) {
      const res = await request(app)
        .post("/api/winter-camp/register")
        .send({
          studentName: "Camp Kid",
          email,
          grade: "4",
          eventIds: [freeId],
          selectedPrograms: ["Free Camp"],
        });
      expect(res.status).toBe(201);
      // The order is written after the student step, so it marks "background done".
      expect(
        await waitFor(() =>
          Order.findOne({ "billingAddress.email": email }).lean(),
        ),
      ).toBeTruthy();
    }

    expect(await Student.countDocuments({ parentUserId: existing._id })).toBe(0);
    const created: any = await User.findOne({ email: newEmail }).lean();
    expect(await Student.countDocuments({ parentUserId: created._id })).toBe(1);
  });

  it("rejects non-text names and grades instead of crashing", async () => {
    const res = await request(app)
      .post("/api/winter-camp/register")
      .send({ studentName: { a: 1 }, email: "x@example.com", grade: ["4"] });
    expect(res.status).toBe(400);
  });
});
