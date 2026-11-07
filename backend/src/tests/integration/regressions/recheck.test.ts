/**
 * Regressions from the 31 Oct 2026 per-role re-check (Kidrove Issue Board N-items).
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import { Order } from "../../../models/index";
import { getOrCreateTeacherProfile } from "../../../utils/teacherHelpers";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections, signUpAs } from "../setup/factories";
import Employee from "../../../models/Employee";
import CheckinLog from "../../../models/CheckinLog";
import { cookie, signUp, login, insertEvent, vendorIdOf, Session } from "../setup/session";

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  await ensureCollections();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const as = (s: Session) => ({ Cookie: cookie(s), "X-CSRF-Token": s.csrfToken });

it("answers 404, not 500, for an unknown API route", async () => {
  const res = await request(app).get("/api/no-such-route");
  expect(res.status).toBe(404);
});

it("does not tell the public that an unpublished event exists", async () => {
  const vendor = await signUp(app, "vendor");
  const draft = await insertEvent(await vendorIdOf(vendor), { status: "draft", isApproved: false });
  const res = await request(app).get(`/api/events/${draft}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Event not found");
});

describe("vendor event lists use the Vendor profile id", () => {
  it("my-events and analytics include the vendor's events; my-orders includes their orders", async () => {
    const vendor = await signUp(app, "vendor");
    const vendorId = await vendorIdOf(vendor);
    const eventId = new Types.ObjectId(await insertEvent(vendorId, { isDeleted: false }));
    await Order.collection.insertOne({ orderNumber: "ORD-RECHECK-1", userId: new Types.ObjectId(), items: [{ eventId, eventVendorId: new Types.ObjectId(vendorId), quantity: 1 }], status: "confirmed", paymentStatus: "paid", createdAt: new Date() });

    const mine = await request(app).get("/api/events/vendor/my-events").set(as(vendor));
    expect(mine.body.data.events.map((e: { _id: string }) => String(e._id))).toEqual([String(eventId)]);
    const stats = await request(app).get("/api/events/vendor/analytics").set(as(vendor));
    expect(stats.body.data.analytics.totalEvents).toBe(1);
    const orders = await request(app).get("/api/orders/vendor/my-orders").set(as(vendor));
    expect(orders.body.data.pagination.totalOrders).toBe(1);
  });
});

describe("permanent event delete", () => {
  it("is refused while orders reference the event, and allowed when none do", async () => {
    const vendor = await signUp(app, "vendor");
    const vendorId = await vendorIdOf(vendor);
    const booked = new Types.ObjectId(await insertEvent(vendorId));
    const unbooked = await insertEvent(vendorId);
    await Order.collection.insertOne({ orderNumber: "ORD-RECHECK-2", userId: new Types.ObjectId(), items: [{ eventId: booked, quantity: 1 }], createdAt: new Date() });

    const refused = await request(app).delete(`/api/vendors/events/${booked}?permanent=true`).set(as(vendor));
    expect(refused.status).toBe(409);
    const allowed = await request(app).delete(`/api/vendors/events/${unbooked}?permanent=true`).set(as(vendor));
    expect(allowed.status).toBe(200);
  });
});

it("teacher CSV import creates an account for a new student", async () => {
  const signed = await signUp(app, "customer");
  const user = await User.findByIdAndUpdate(signed.userId, { role: "teacher" }, { new: true });
  const teacher = await login(app, user!.email, "Test@1234!", signed.userId);
  const profile = await getOrCreateTeacherProfile(signed.userId);
  await insertEvent(String(new Types.ObjectId()), { title: "Recheck Class", type: "Class", isDeleted: false, teacherId: profile._id, vendorId: undefined });

  const res = await request(app)
    .post("/api/teachers/bookings/import")
    .set(as(teacher))
    .send({ csvData: [{ teachingEventTitle: "Recheck Class", studentName: "New Student", studentEmail: "new.student@example.com", quantity: 1, totalAmount: 100 }] });
  expect(res.body.data.failed).toEqual([]);
  expect(await User.exists({ email: "new.student@example.com", role: "student" })).toBeTruthy();
});

it("vendor CSV booking import creates an order", async () => {
  const vendor = await signUp(app, "vendor");
  await insertEvent(await vendorIdOf(vendor), { title: "Recheck Venue", isDeleted: false, price: 100 });
  const res = await request(app)
    .post("/api/vendors/bookings/import")
    .set(as(vendor))
    .send({ csvData: [{ customerEmail: "imported@example.com", customerName: "Imported Parent", customerPhone: "+971501234567", eventTitle: "Recheck Venue", quantity: 1, totalAmount: 100 }] });
  expect(res.body.data.failed).toEqual([]);
  expect(res.body.data.successful).toHaveLength(1);
});

it("an employee sees their assigned events and their own check-in report", async () => {
  const vendor = await signUp(app, "vendor");
  const eventId = new Types.ObjectId(await insertEvent(await vendorIdOf(vendor), { title: "Gate A" }));
  const staff = await signUpAs(app, "employee");
  const employee = await Employee.create({
    vendorId: new Types.ObjectId(await vendorIdOf(vendor)), userId: staff.userId, employeeId: "EMP-RECHECK",
    firstName: "Gate", lastName: "Keeper", email: "gate.keeper@example.com", role: "scanner", status: "active", assignedEvents: [eventId],
  });
  await CheckinLog.collection.insertMany([
    { ticketId: new Types.ObjectId(), eventId, employeeId: employee._id, customerId: new Types.ObjectId(), scanResult: "success", scanTime: new Date() },
    { ticketId: new Types.ObjectId(), eventId, employeeId: employee._id, customerId: new Types.ObjectId(), scanResult: "duplicate", scanTime: new Date() },
  ]);

  const events = await request(app).get("/api/employees/assigned-events").set(as(staff));
  expect(events.status).toBe(200);
  expect(events.body.data).toEqual([expect.objectContaining({ title: "Gate A", checkedInCount: 1, ticketsCount: 0 })]);

  const report = await request(app).get("/api/employees/my-reports?period=7d").set(as(staff));
  expect(report.body.data.summary).toEqual({ totalShifts: 1, totalCheckins: 1, todayCheckins: 1, avgCheckinsPerShift: 1 });
  expect(report.body.data.recentCheckins.map((c: { status: string }) => c.status).sort()).toEqual(["checked_in", "invalid"]);
});

it("accepts the engagement beacon from a logged-in user (sendBeacon can't send the CSRF header)", async () => {
  const customer = await signUp(app, "customer");
  const res = await request(app)
    .post("/api/track/engagement")
    .set("Cookie", cookie(customer))
    .set("Content-Type", "text/plain")
    .send(JSON.stringify({ sessionId: "s-recheck", path: "/", ms: 5000 }));
  expect(res.status).toBe(204);
});

it("currency detection answers 200 with no currency for a local address", async () => {
  const res = await request(app).get("/api/currency/detect");
  expect(res.status).toBe(200);
  expect(res.body.data.currency).toBeNull();
});

describe("privacy requests", () => {
  it("exports the caller's own data", async () => {
    const customer = await signUp(app, "customer");
    const res = await request(app).post("/api/auth/export-data").set(as(customer));
    expect(res.status).toBe(200);
    expect(res.body.data.profile.email).toMatch(/@/);
    expect(res.body.data.profile.passwordHash).toBeUndefined();
  });

  it("deletes a customer account after the password check, anonymising their orders", async () => {
    const customer = await signUp(app, "customer");
    const email = (await User.findById(customer.userId).lean())!.email;
    await Order.collection.insertOne({ orderNumber: "ORD-RECHECK-3", userId: new Types.ObjectId(customer.userId), items: [], billingAddress: { firstName: "Real", lastName: "Name", email, phone: "+971501234567" }, createdAt: new Date() });

    expect((await request(app).post("/api/auth/delete-account").set(as(customer)).send({ password: "wrong" })).status).toBe(400);
    const ok = await request(app).post("/api/auth/delete-account").set(as(customer)).send({ password: "Test@1234!" });
    expect(ok.status).toBe(200);

    expect((await request(app).post("/api/auth/login").send({ email, password: "Test@1234!" })).status).not.toBe(200);
    const order = await Order.collection.findOne({ orderNumber: "ORD-RECHECK-3" });
    expect(order!.billingAddress.email).not.toBe(email);
    expect(order!.billingAddress.firstName).toBe("Deleted");
  });

  it("sends vendors to support instead of deleting accounts with listings", async () => {
    const vendor = await signUp(app, "vendor");
    const res = await request(app).post("/api/auth/delete-account").set(as(vendor)).send({ password: "Test@1234!" });
    expect(res.status).toBe(409);
  });
});
