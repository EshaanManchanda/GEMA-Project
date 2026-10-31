/**
 * National Day competition: an entry is only reachable with its reference AND
 * the parent email, payments only finalize their own entry, and public callers
 * can't pick a cheaper price, skip payment, or attach children to other accounts.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import NationalDaySubmission from "../../../models/NationalDaySubmission";
import Student from "../../../models/Student";
import User from "../../../models/User";
import { stripe } from "../../../config/stripe";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections } from "../setup/factories";
import { signUp } from "../setup/session";

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  await ensureCollections();
});
afterEach(async () => {
  jest.restoreAllMocks();
  delete process.env.NATIONAL_DAY_SCHOOL_CODES;
  await clearTestDB();
});
afterAll(closeTestDB);

const EMAIL = "parent@example.com";
const API = "/api/national-day-competition";

const register = (extra: Record<string, unknown> = {}) =>
  request(app).post(`${API}/register`).send({
    studentFullName: "Test Child",
    studentAge: 8,
    grade: "Grade 3",
    schoolName: "Test School",
    schoolEmirate: "Dubai",
    parentName: "Test Parent",
    parentEmail: EMAIL,
    parentPhone: "+971500000000",
    agreeTerms: true,
    traditionalOnlyDeclaration: true,
    originalityDeclaration: true,
    parentGuardianConsent: true,
    competitionUpdatesConsent: true,
    ...extra,
  });

async function paidEntry(extra: Record<string, unknown> = {}) {
  const res = await register(extra);
  expect(res.status).toBe(201);
  await NationalDaySubmission.updateOne({ _id: res.body.data.submissionId }, { paymentStatus: "paid" });
  return res.body.data as { submissionId: string; submissionRef: string };
}

const lookup = (ref: string, email?: string) =>
  request(app).get(`${API}/lookup/${ref}`).query(email ? { email } : {});

describe("lookup by reference", () => {
  it("finds a paid entry even with 100+ newer entries", async () => {
    const { submissionId, submissionRef } = await paidEntry();
    const newer = Array.from({ length: 101 }, () => ({ _id: new Types.ObjectId(), createdAt: new Date(Date.now() + 1000) }));
    await NationalDaySubmission.collection.insertMany(newer);

    const res = await lookup(submissionRef, EMAIL);
    expect(res.status).toBe(200);
    expect(String(res.body.data.submissionId)).toBe(String(submissionId));
  });

  it("needs the parent email, and a wrong one looks like a missing entry", async () => {
    const { submissionRef } = await paidEntry();
    expect((await lookup(submissionRef)).status).toBe(400);
    const wrong = await lookup(submissionRef, "someone@else.com");
    expect(wrong.status).toBe(404);
    expect(wrong.body.data).toBeUndefined();
  });

  it("rejects a malformed reference", async () => {
    expect((await lookup("UAE2026-ZZZZZZZZ", EMAIL)).status).toBe(404);
  });
});

describe("artwork", () => {
  it("can't be uploaded into an entry without its parent email", async () => {
    const { submissionRef } = await paidEntry();
    const res = await request(app)
      .post(`${API}/submit-artwork`)
      .field("refNo", submissionRef)
      .field("parentEmail", "someone@else.com")
      .attach("artwork", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), { filename: "a.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(404);
  });

  it("is not served to anonymous callers", async () => {
    const res = await request(app).get(`${API}/submissions/${new Types.ObjectId()}/artwork`);
    expect(res.status).toBe(401);
  });
});

describe("registration price", () => {
  it("refuses the school bulk price without an issued school code", async () => {
    process.env.NATIONAL_DAY_SCHOOL_CODES = "GOOD1";
    expect((await register({ registrationType: "school_bulk", schoolBulkRef: "MADEUP" })).status).toBe(400);

    const ok = await register({ registrationType: "school_bulk", schoolBulkRef: "good1" });
    expect(ok.status).toBe(201);
    expect(ok.body.data.amount).toBe(40);
  });
});

describe("finalize", () => {
  const finalize = (submissionId: string, sessionId: string) =>
    request(app).post(`${API}/finalize`).send({ submissionId, sessionId });

  async function unpaidEntry() {
    const res = await register();
    return String(res.body.data.submissionId);
  }

  const stubSession = (session: Record<string, unknown>) =>
    jest.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue(session as any);

  it("won't skip payment without the explicit dev flag", async () => {
    const id = await unpaidEntry();
    jest.spyOn(stripe.checkout.sessions, "retrieve").mockRejectedValue(new Error("No such session"));
    const res = await finalize(id, "TEST_PAYMENT_SKIP");
    expect(res.status).not.toBe(200);
    expect((await NationalDaySubmission.findById(id).lean())!.paymentStatus).toBe("pending");
  });

  it("won't let one paid session finalize another entry", async () => {
    const [mine, other] = [await unpaidEntry(), await unpaidEntry()];
    stubSession({ payment_status: "paid", metadata: { submissionId: mine } });
    expect((await finalize(other, "cs_test_x")).status).toBe(400);
    expect((await NationalDaySubmission.findById(other).lean())!.paymentStatus).toBe("pending");
  });

  it("doesn't attach a child to an existing account it didn't create", async () => {
    const existing = await signUp(app, "customer");
    const { email } = (await User.findById(existing.userId).lean())!;
    const res = await register({ parentEmail: email });
    const id = String(res.body.data.submissionId);
    stubSession({ payment_status: "paid", metadata: { submissionId: id } });

    expect((await finalize(id, "cs_test_y")).status).toBe(200);
    expect(await Student.countDocuments({ parentUserId: existing.userId })).toBe(0);
  });
});
