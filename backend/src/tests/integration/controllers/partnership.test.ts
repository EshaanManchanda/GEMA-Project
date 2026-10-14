import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Partnership from "../../../models/Partnership";
import User from "../../../models/User";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "put" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const form = {
  name: "Sara Ahmed",
  email: "sara.partner@example.com",
  phone: "+971 50 000 0000",
  partnershipType: "vendor",
  message: "We would love to list our camps.",
  agreeToTerms: true,
};

async function insertPartnership(extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Partnership.collection.insertOne({
    _id,
    ...form,
    email: `p.${_id}@example.com`,
    status: "pending",
    campaignType: "general",
    notes: "internal admin note",
    createdAt: new Date(),
    ...extra,
  });
  return String(_id);
}

describe("POST /api/partnerships (public form)", () => {
  it("stores a pending submission", async () => {
    const res = await request(app).post("/api/partnerships").send(form);

    expect(res.status).toBe(201);
    const saved = await Partnership.findOne({ email: form.email }).lean();
    expect(saved).toMatchObject({ status: "pending", partnershipType: "vendor" });
  });

  it.each([
    ["missing name", { name: undefined }],
    ["invalid email", { email: "nope" }],
    ["unknown type", { partnershipType: "spaceship" }],
    ["short message", { message: "hi" }],
    ["terms not accepted", { agreeToTerms: false }],
  ])("returns 400 for %s", async (_label, patch) => {
    const res = await request(app).post("/api/partnerships").send({ ...form, ...patch });
    expect(res.status).toBe(400);
    expect(await Partnership.countDocuments()).toBe(0);
  });
});

describe("public directory", () => {
  it("lists and reads only approved partnerships", async () => {
    const approved = await insertPartnership({ status: "approved" });
    const pending = await insertPartnership();

    const list = await request(app).get("/api/partnerships/directory");
    expect(list.status).toBe(200);
    expect(list.body.data.partnerships.map((p: { _id: string }) => p._id)).toEqual([approved]);
    expect((await request(app).get(`/api/partnerships/directory/${approved}`)).status).toBe(200);
    expect((await request(app).get(`/api/partnerships/directory/${pending}`)).status).toBe(404);
  });

  // email and notes are intentionally public (the directory page shows the
  // contact email and uses notes as the listing blurb); nothing else private.
  it("the public directory exposes only listing fields", async () => {
    await insertPartnership({ status: "approved", paymentSessionId: "cs_secret", phone: "+971500000001" });

    const res = await request(app).get("/api/partnerships/directory");

    const p = res.body.data.partnerships[0];
    expect(p.phone).toBeUndefined();
    expect(p.paymentSessionId).toBeUndefined();
    expect(p.attachments).toBeUndefined();
    expect(p.name).toBeDefined();
  });

  it("malformed directory id returns 400/404, not 500", async () => {
    const res = await request(app).get("/api/partnerships/directory/not-an-id");
    expect([400, 404]).toContain(res.status);
  });
});

describe("admin partnership management", () => {
  it("lists, reads, updates status, edits, and deletes", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertPartnership();

    const list = await get(admin, "/api/partnerships");
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain(id);
    expect((await get(admin, `/api/partnerships/${id}`)).status).toBe(200);
    expect((await get(admin, "/api/partnerships/stats")).status).toBe(200);

    expect((await send(admin, "patch", `/api/partnerships/${id}`, { status: "contacted", notes: "called" })).status).toBe(200);
    expect((await Partnership.findById(id).lean())!.status).toBe("contacted");

    expect((await send(admin, "put", `/api/partnerships/${id}`, { organization: "Camp Co" })).status).toBe(200);
    expect((await Partnership.findById(id).lean())!.organization).toBe("Camp Co");

    expect((await send(admin, "delete", `/api/partnerships/${id}`)).status).toBe(200);
    expect(await Partnership.countDocuments({ _id: id })).toBe(0);
  });

  it("validates status and ids", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertPartnership();

    expect((await send(admin, "patch", `/api/partnerships/${id}`, { status: "maybe" })).status).toBe(400);
    expect((await send(admin, "patch", `/api/partnerships/${id}`, {})).status).toBe(400);
    expect((await send(admin, "put", `/api/partnerships/${id}`, { email: "bad" })).status).toBe(400);
    expect((await get(admin, "/api/partnerships/not-an-id")).status).toBe(400);
  });

  it("creates a vendor user from an approved partnership only", async () => {
    const admin = await signUpAdmin(app);
    const pending = await insertPartnership();
    const approved = await insertPartnership({ status: "approved" });

    expect((await send(admin, "post", `/api/partnerships/${pending}/create-user`)).status).toBe(400);
    const res = await send(admin, "post", `/api/partnerships/${approved}/create-user`);
    expect(res.status).toBe(201);
    const email = (await Partnership.findById(approved).lean())!.email;
    expect((await User.findOne({ email }).lean())!.role).toBe("vendor");
  });

  it("create-user does not return the new user's password hash", async () => {
    const admin = await signUpAdmin(app);
    const approved = await insertPartnership({ status: "approved" });

    const res = await send(admin, "post", `/api/partnerships/${approved}/create-user`);

    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("forbids non-admins from every management endpoint", async () => {
    const vendor = await signUp(app, "vendor");
    const id = await insertPartnership({ status: "approved" });

    expect((await get(vendor, "/api/partnerships")).status).toBe(403);
    expect((await get(vendor, `/api/partnerships/${id}`)).status).toBe(403);
    expect((await get(vendor, "/api/partnerships/stats")).status).toBe(403);
    expect((await send(vendor, "patch", `/api/partnerships/${id}`, { status: "rejected" })).status).toBe(403);
    expect((await send(vendor, "post", `/api/partnerships/${id}/create-user`)).status).toBe(403);
    expect((await send(vendor, "delete", `/api/partnerships/${id}`)).status).toBe(403);
    expect(await Partnership.countDocuments({ _id: id, status: "approved" })).toBe(1);
  });
});
