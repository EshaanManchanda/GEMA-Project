import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Registration from "../../../models/Registration";
import Event from "../../../models/Event";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin, vendorIdOf, insertEvent } from "../setup/session";
import { savableEventFields } from "../setup/factories";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const answers = [{ fieldId: "f1", fieldLabel: "Name", fieldType: "text", value: "Ali" }];

async function freeEvent(extra: Record<string, unknown> = {}) {
  const vendor = await signUp(app, "vendor");
  const eventId = await insertEvent(await vendorIdOf(vendor), { ...savableEventFields, ...extra });
  return { vendor, eventId };
}

async function insertRegistration(eventId: string, userId: string, status = "draft") {
  const _id = new Types.ObjectId();
  await Registration.collection.insertOne({
    _id,
    eventId: new Types.ObjectId(eventId),
    userId: new Types.ObjectId(userId),
    registrationData: answers,
    files: [],
    payment: { status: "paid", amount: 0, currency: "AED" },
    status,
    confirmationNumber: `R-${_id}`,
    createdAt: new Date(),
  });
  return String(_id);
}

describe("POST /api/registrations/submit/:eventId", () => {
  it("auto-approves a free registration and stores it", async () => {
    const { eventId } = await freeEvent();
    const customer = await signUp(app, "customer");

    const res = await send(customer, "post", `/api/registrations/submit/${eventId}`, { registrationData: answers });

    expect(res.status).toBe(201);
    expect(res.body.data.registration).toMatchObject({ status: "approved", paymentStatus: "paid" });
    expect(res.body.data.payment).toBeNull();
    const saved = await Registration.findOne({ eventId, userId: customer.userId }).lean();
    expect(saved!.registrationData[0].value).toBe("Ali");
  });

  it("rejects a second active registration for the same event", async () => {
    const { eventId } = await freeEvent();
    const customer = await signUp(app, "customer");
    await send(customer, "post", `/api/registrations/submit/${eventId}`, { registrationData: answers });

    const res = await send(customer, "post", `/api/registrations/submit/${eventId}`, { registrationData: answers });

    expect(res.status).toBe(400);
    expect(await Registration.countDocuments({ eventId })).toBe(1);
  });

  it("returns 400 when registrationData is missing or not an array", async () => {
    const { eventId } = await freeEvent();
    const customer = await signUp(app, "customer");

    expect((await send(customer, "post", `/api/registrations/submit/${eventId}`, {})).status).toBe(400);
    expect((await send(customer, "post", `/api/registrations/submit/${eventId}`, { registrationData: 5 })).status).toBe(400);
  });

  it("returns 400 for a malformed eventId", async () => {
    const customer = await signUp(app, "customer");
    expect((await send(customer, "post", "/api/registrations/submit/nope", { registrationData: answers })).status).toBe(400);
  });

  it("requires authentication", async () => {
    const { eventId } = await freeEvent();
    const res = await request(app).post(`/api/registrations/submit/${eventId}`).send({ registrationData: answers });
    expect([401, 403]).toContain(res.status);
  });

  it.failing("BUG: answers missing fieldLabel/fieldType return 400, not 500", async () => {
    const { eventId } = await freeEvent();
    const customer = await signUp(app, "customer");

    const res = await send(customer, "post", `/api/registrations/submit/${eventId}`, { registrationData: [{ fieldId: "x" }] });

    expect(res.status).toBe(400);
  });
});

describe("registration reads", () => {
  it("lists the caller's own registrations only", async () => {
    const { eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const other = await signUp(app, "customer");
    await insertRegistration(eventId, me.userId);
    await insertRegistration(eventId, other.userId);

    const res = await get(me, "/api/registrations/user/me");

    expect(res.status).toBe(200);
    expect(res.body.data.registrations).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it("lets the owner and the event vendor read a registration, but not a stranger", async () => {
    const { vendor, eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const stranger = await signUp(app, "customer");
    const id = await insertRegistration(eventId, me.userId);

    expect((await get(me, `/api/registrations/${id}`)).status).toBe(200);
    expect((await get(vendor, `/api/registrations/${id}`)).body.data.registration._id).toBe(id);
    expect((await get(stranger, `/api/registrations/${id}`)).status).toBe(403);
  });

  it("lets the event vendor list event registrations with status counts; other vendors get 403", async () => {
    const { vendor, eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    await insertRegistration(eventId, me.userId, "approved");
    const otherVendor = await signUp(app, "vendor");

    const res = await get(vendor, `/api/registrations/event/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stats.byStatus).toEqual({ approved: 1 });
    expect((await get(otherVendor, `/api/registrations/event/${eventId}`)).status).toBe(403);
  });

  it.failing("BUG: malformed registration id returns 400, not 500", async () => {
    const me = await signUp(app, "customer");
    expect((await get(me, "/api/registrations/not-an-id")).status).toBe(400);
  });

  it.failing("BUG: malformed eventId on event listing returns 400, not 500", async () => {
    const { vendor } = await freeEvent();
    expect((await get(vendor, "/api/registrations/event/not-an-id")).status).toBe(400);
  });
});

describe("registration updates", () => {
  it("lets the owner edit a draft", async () => {
    const { eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const id = await insertRegistration(eventId, me.userId, "draft");
    const changed = [{ ...answers[0], value: "Omar" }];

    const res = await send(me, "patch", `/api/registrations/${id}`, { registrationData: changed });

    expect(res.status).toBe(200);
    expect((await Registration.findById(id).lean())!.registrationData[0].value).toBe("Omar");
  });

  it("refuses edits to non-draft registrations and invalid payloads", async () => {
    const { eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const approved = await insertRegistration(eventId, me.userId, "approved");
    const draft = await insertRegistration(eventId, me.userId, "draft");

    expect((await send(me, "patch", `/api/registrations/${approved}`, { registrationData: answers })).status).toBe(400);
    expect((await send(me, "patch", `/api/registrations/${draft}`, { registrationData: "x" })).status).toBe(400);
  });

  it("returns 404 when another user tries to edit", async () => {
    const { eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const other = await signUp(app, "customer");
    const id = await insertRegistration(eventId, me.userId, "draft");

    expect((await send(other, "patch", `/api/registrations/${id}`, { registrationData: answers })).status).toBe(404);
  });

  it("withdraws a submitted registration", async () => {
    const { eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const id = await insertRegistration(eventId, me.userId, "submitted");

    expect((await send(me, "delete", `/api/registrations/${id}`)).status).toBe(200);
    expect((await Registration.findById(id).lean())!.status).toBe("withdrawn");
  });

  it("lets the event vendor approve, rejects bad status, and forbids customers", async () => {
    const { vendor, eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const id = await insertRegistration(eventId, me.userId, "under_review");

    expect((await send(vendor, "post", `/api/registrations/${id}/review`, { status: "maybe" })).status).toBe(400);
    expect((await send(me, "post", `/api/registrations/${id}/review`, { status: "approved" })).status).toBe(403);
    const res = await send(vendor, "post", `/api/registrations/${id}/review`, { status: "approved", remarks: "ok" });
    expect(res.status).toBe(200);
    expect((await Registration.findById(id).lean())!.status).toBe("approved");
  });

  it("rejects confirm-payment without a paymentIntentId", async () => {
    const { eventId } = await freeEvent();
    const me = await signUp(app, "customer");
    const id = await insertRegistration(eventId, me.userId, "submitted");
    expect((await send(me, "post", `/api/registrations/${id}/confirm-payment`, {})).status).toBe(400);
  });
});

describe("registration config (event.registration.config controller)", () => {
  const fields = [{ label: "Name", type: "text", required: true }];

  it("lets the event vendor configure, read and disable registration", async () => {
    const { vendor, eventId } = await freeEvent();

    const res = await send(vendor, "post", `/api/registrations/config/${eventId}`, { enabled: true, fields, requiresApproval: true });
    expect(res.status).toBe(200);
    expect(res.body.data.registrationConfig.fields[0]).toMatchObject({ label: "Name", type: "text" });
    expect((await Event.findById(eventId).lean())!.registrationConfig!.requiresApproval).toBe(true);

    const pub = await request(app).get(`/api/registrations/config/${eventId}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.registrationConfig.emailNotifications).toBeUndefined();

    expect((await send(vendor, "delete", `/api/registrations/config/${eventId}`)).status).toBe(200);
    expect((await Event.findById(eventId).lean())!.registrationConfig!.enabled).toBe(false);
    expect((await request(app).get(`/api/registrations/config/${eventId}`)).status).toBe(404);
  });

  it("forbids another vendor from configuring the event", async () => {
    const { eventId } = await freeEvent();
    const other = await signUp(app, "vendor");
    expect((await send(other, "post", `/api/registrations/config/${eventId}`, { enabled: true })).status).toBe(403);
  });

  it("validates fields: missing label or unknown type → 400", async () => {
    const { vendor, eventId } = await freeEvent();
    expect((await send(vendor, "post", `/api/registrations/config/${eventId}`, { fields: [{ type: "text" }] })).status).toBe(400);
    expect((await send(vendor, "post", `/api/registrations/config/${eventId}`, { fields: [{ label: "A", type: "bogus" }] })).status).toBe(400);
    expect((await send(vendor, "post", `/api/registrations/config/${eventId}`, { enabled: "yes" })).status).toBe(400);
  });

  it("duplicates config from the vendor's other event; missing sourceEventId → 400", async () => {
    const { vendor, eventId } = await freeEvent();
    const target = await insertEvent(await vendorIdOf(vendor), savableEventFields);
    await send(vendor, "post", `/api/registrations/config/${eventId}`, { enabled: true, fields });

    expect((await send(vendor, "post", `/api/registrations/config/${target}/duplicate`, {})).status).toBe(400);
    const res = await send(vendor, "post", `/api/registrations/config/${target}/duplicate`, { sourceEventId: eventId });
    expect(res.status).toBe(200);
    expect((await Event.findById(target).lean())!.registrationConfig!.fields).toHaveLength(1);
  });

  it("lets admins configure any event", async () => {
    const { eventId } = await freeEvent();
    const admin = await signUpAdmin(app);
    expect((await send(admin, "post", `/api/registrations/config/${eventId}`, { enabled: false })).status).toBe(200);
  });
});
