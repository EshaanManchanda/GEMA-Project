import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Ticket from "../../../models/Ticket";
import CheckinLog from "../../../models/CheckinLog";
import Employee from "../../../models/Employee";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin, vendorIdOf, insertEvent } from "../setup/session";
import { signUpAs } from "../setup/factories";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const post = (s: Session, body: object) =>
  request(app).post("/api/checkin").set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function insertTicket(eventId: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Ticket.collection.insertOne({
    _id,
    ticketNumber: `TK-${_id}`,
    orderId: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    eventId: new Types.ObjectId(eventId),
    qrCode: "qr",
    qrCodeImage: "img",
    ticketType: "standard",
    attendeeName: "A",
    attendeeEmail: "a@example.com",
    price: 10,
    currency: "AED",
    status: "active",
    ...extra,
  });
  return { id: String(_id), ticketNumber: `TK-${_id}` };
}

async function insertEmployee(userId: string, vendorId: string, assignedEvents: string[] = [], assignedVenues: string[] = []) {
  const _id = new Types.ObjectId();
  await Employee.collection.insertOne({
    _id,
    userId: new Types.ObjectId(userId),
    vendorId: new Types.ObjectId(vendorId),
    employeeId: `E-${_id}`,
    firstName: "E",
    lastName: "M",
    email: `e.${_id}@example.com`,
    role: "scanner",
    status: "active",
    assignedEvents: assignedEvents.map((e) => new Types.ObjectId(e)),
    assignedVenues: assignedVenues.map((v) => new Types.ObjectId(v)),
  });
  return String(_id);
}

async function setup() {
  const vendor = await signUp(app, "vendor");
  const vendorId = await vendorIdOf(vendor);
  const eventId = await insertEvent(vendorId);
  const emp = await signUpAs(app, "employee");
  const employeeId = await insertEmployee(emp.userId, vendorId, [eventId]);
  return { vendor, vendorId, eventId, emp, employeeId };
}

describe("POST /api/checkin", () => {
  it("checks in an active ticket for an assigned employee and logs it", async () => {
    const { eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId);

    const res = await post(emp, { ticketNumber: t.ticketNumber, employeeId, location: "Gate A" });

    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe("used");
    expect((await Ticket.findById(t.id).lean())!.status).toBe("used");
    expect(await CheckinLog.countDocuments({ ticketId: t.id, scanResult: "success" })).toBe(1);
  });

  it("rejects a second check-in of the same ticket with 409", async () => {
    const { eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId, { status: "used" });

    expect((await post(emp, { ticketNumber: t.ticketNumber, employeeId })).status).toBe(409);
  });

  it("refuses refunded tickets with 403", async () => {
    const { eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId, { status: "refunded" });

    expect((await post(emp, { ticketNumber: t.ticketNumber, employeeId })).status).toBe(403);
  });

  it("returns 404 for an unknown ticket number", async () => {
    const { emp, employeeId } = await setup();
    expect((await post(emp, { ticketNumber: "NOPE", employeeId })).status).toBe(404);
  });

  it("forbids non-employee roles", async () => {
    const { vendor, eventId, employeeId } = await setup();
    const t = await insertTicket(eventId);

    expect((await post(vendor, { ticketNumber: t.ticketNumber, employeeId })).status).toBe(403);
    expect((await Ticket.findById(t.id).lean())!.status).toBe("active");
  });

  it("rejects a missing ticketNumber without touching any ticket", async () => {
    const { eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId);

    const res = await post(emp, { employeeId });

    expect(res.status).toBe(400);
    expect((await Ticket.findById(t.id).lean())!.status).toBe("active");
  });

  it("ignores a body employeeId: the check-in is attributed to the caller", async () => {
    const { eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId);

    expect((await post(emp, { ticketNumber: t.ticketNumber, employeeId: "not-an-id" })).status).toBe(200);
    expect(String((await CheckinLog.findOne({ ticketId: t.id }).lean())!.employeeId)).toBe(employeeId);
  });

  it("an employee cannot check in by passing another employee's id", async () => {
    const { eventId, vendorId, employeeId } = await setup();
    const t = await insertTicket(eventId);
    const other = await signUpAs(app, "employee");
    await insertEmployee(other.userId, vendorId); // assigned to nothing

    const res = await post(other, { ticketNumber: t.ticketNumber, employeeId });

    expect(res.status).toBe(403);
  });

  it("an employee assigned to any venue is not authorized for unrelated events", async () => {
    const { eventId, vendorId } = await setup();
    const t = await insertTicket(eventId);
    const other = await signUpAs(app, "employee");
    const otherId = await insertEmployee(other.userId, vendorId, [], [String(new Types.ObjectId())]);

    const res = await post(other, { ticketNumber: t.ticketNumber, employeeId: otherId });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/checkin/logs and /summary", () => {
  it("returns logs and a summary for the vendor's event", async () => {
    const { vendor, eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId);
    await insertTicket(eventId);
    await post(emp, { ticketNumber: t.ticketNumber, employeeId });

    const logs = await get(vendor, `/api/checkin/logs?eventId=${eventId}`);
    expect(logs.status).toBe(200);
    expect(logs.body.data).toHaveLength(1);

    const summary = await get(vendor, `/api/checkin/summary?eventId=${eventId}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({ totalTickets: 2, checkedInTickets: 1, uncheckedTickets: 1, checkInRate: 50 });
  });

  it("lets admins read the summary", async () => {
    const admin = await signUpAdmin(app);
    expect((await get(admin, "/api/checkin/summary?eventId=" + new Types.ObjectId())).status).toBe(200);
  });

  it("forbids customers from logs and employees from the summary", async () => {
    const { emp } = await setup();
    const customer = await signUp(app, "customer");
    expect((await get(customer, "/api/checkin/logs")).status).toBe(403);
    expect((await get(emp, "/api/checkin/summary")).status).toBe(403);
  });

  it("a vendor cannot read another vendor's check-in logs", async () => {
    const { eventId, emp, employeeId } = await setup();
    const t = await insertTicket(eventId);
    await post(emp, { ticketNumber: t.ticketNumber, employeeId });
    const otherVendor = await signUp(app, "vendor");

    const res = await get(otherVendor, "/api/checkin/logs");

    expect(res.body.data ?? []).toHaveLength(0);
  });

  it("malformed eventId on summary returns 400, not 500", async () => {
    const { vendor } = await setup();
    expect((await get(vendor, "/api/checkin/summary?eventId=bad")).status).toBe(400);
  });
});
