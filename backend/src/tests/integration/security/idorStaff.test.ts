/**
 * IDOR: vendor- and teacher-owned records. Vendor/teacher B must get 403/404 on
 * A's record for read/update/delete; A must succeed (positive control).
 * `it.failing("BUG: ...")` marks a live vulnerability — the test asserts the
 * secure behaviour and flips to a real failure once production is fixed.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import Event from "../../../models/Event";
import Ticket from "../../../models/Ticket";
import Employee from "../../../models/Employee";
import Payout from "../../../models/Payout";
import TeacherBooking from "../../../models/TeacherBooking";
import Order from "../../../models/Order";
import { certificateService } from "../../../modules/certificates/services/certificate.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, insertEvent, signUp, signUpAdmin, vendorIdOf, Session } from "../setup/session";
import { insertOrder, signUpAs, teacherIdOf } from "../setup/factories";

jest.mock("../../../services/email.service", () => {
  const svc = new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) });
  return { __esModule: true, default: svc, emailService: svc, sendEmail: jest.fn().mockResolvedValue(undefined) };
});
jest.mock("../../../utils/mailer", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
  sendTicketByEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../config/redis", () => {
  const client = new Proxy({ status: "end" }, { get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : jest.fn().mockResolvedValue(null)) });
  return { redisClient: client, redisPool: { isHealthy: () => false, getConnection: () => null } };
});
jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../modules/certificates/services/certificate.service", () => ({
  certificateService: { issueForEvent: jest.fn(), bulkIssue: jest.fn() },
}));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
beforeEach(() => {
  // jest.config resets mock implementations before every test
  jest.mocked(certificateService.issueForEvent).mockResolvedValue({ _id: "cert" } as never);
  jest.mocked(certificateService.bulkIssue).mockResolvedValue({ requestId: "req", total: 1 });
});
afterEach(clearTestDB);
afterAll(closeTestDB);

type Method = "get" | "post" | "put" | "patch" | "delete";
const call = (s: Session, method: Method, url: string, body: object = {}) => {
  const r = request(app)[method](url).set("Cookie", cookie(s));
  return method === "get" ? r : r.set("x-csrf-token", s.csrfToken).send(body);
};

const eventExtras = (extra: Record<string, unknown> = {}) => ({
  isDeleted: false,
  location: { address: "1 Test St", city: "Dubai" },
  dateSchedule: [{ _id: new Types.ObjectId(), date: new Date(Date.now() + 864e6), startDate: new Date(Date.now() + 864e6), endDate: new Date(Date.now() + 865e6) }],
  ...extra,
});
const vendorEvent = async (v: Session, extra: Record<string, unknown> = {}) => insertEvent(await vendorIdOf(v), eventExtras(extra));
const twoVendors = async () => [await signUp(app, "vendor"), await signUp(app, "vendor")];

async function ticketFor(customer: Session, eventId: string, orderId: string) {
  const _id = new Types.ObjectId();
  const event = await Event.findById(eventId).select("vendorId").lean();
  await Ticket.collection.insertOne({
    _id,
    userId: new Types.ObjectId(customer.userId),
    eventId: new Types.ObjectId(eventId),
    vendorId: event!.vendorId,
    orderId: new Types.ObjectId(orderId),
    ticketNumber: `T-${_id}`,
    qrCode: "qr",
    qrCodeImage: "data:image/png;base64,",
    ticketType: "general",
    attendeeName: "Kid A",
    attendeeEmail: "kid.a@example.com",
    price: 50,
    currency: "AED",
    status: "active",
    checkInDetails: { isCheckedIn: false, scanCount: 0 },
    validUntil: new Date(Date.now() + 864e6),
  });
  return String(_id);
}

describe("vendor events", () => {
  it("another vendor cannot read, edit, delete, restore or export an event; the owner can read it", async () => {
    const [a, b] = await twoVendors();
    const id = await vendorEvent(a);

    expect((await call(b, "get", `/api/vendors/events/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/vendors/events/${id}`, { title: "Hijacked" })).status).toBe(404);
    expect((await call(b, "delete", `/api/vendors/events/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/vendors/events/${id}/restore`)).status).toBe(404);
    expect((await call(b, "get", `/api/vendors/events/${id}/participants/export`)).status).toBe(404);
    expect((await call(b, "put", `/api/events/${id}`, { title: "Hijacked" })).status).toBe(404);
    expect((await call(b, "delete", `/api/events/${id}`)).status).toBe(404);
    expect((await call(b, "post", `/api/events/${id}/promote`, { tier: "boost" })).status).toBe(403);
    expect((await call(b, "get", `/api/events/${id}/certificate-types`)).status).toBe(404);
    expect((await call(b, "post", `/api/events/${id}/certificate-types`, { slug: "x", label: "X", templateId: String(new Types.ObjectId()) })).status).toBe(404);
    const after = await Event.findById(id).lean();
    expect(after!.title).toBe("Owned Event");
    expect(after!.isDeleted).toBe(false);

    expect((await call(a, "get", `/api/vendors/events/${id}`)).status).toBe(200);
    expect((await call(a, "get", `/api/events/${id}/certificate-types`)).status).toBe(200);
  });

  // events.controller.ts updateEvent/deleteEvent match `vendorId: req.user._id`,
  // but Event.vendorId is a Vendor._id — so the owner is always refused.
  it.failing("BUG: the owning vendor gets 404 updating/deleting their own event via /api/events/:id", async () => {
    const [a] = await twoVendors();
    const id = await vendorEvent(a);
    expect((await call(a, "put", `/api/events/${id}`, { title: "Renamed" })).status).toBe(200);
  });
});

describe("registrations (vendor side)", () => {
  it("another vendor cannot list, review or configure registrations of an event", async () => {
    const [a, b] = await twoVendors();
    const id = await vendorEvent(a);
    const own = await vendorEvent(b);

    expect((await call(b, "get", `/api/registrations/event/${id}`)).status).toBe(403);
    expect((await call(b, "post", `/api/registrations/config/${id}`, { enabled: true, fields: [] })).status).toBe(403);
    expect((await call(b, "delete", `/api/registrations/config/${id}`)).status).toBe(403);
    expect((await call(b, "post", `/api/registrations/config/${own}/duplicate`, { sourceEventId: id })).status).toBe(403);
    expect((await call(a, "get", `/api/registrations/event/${id}`)).status).toBe(200);
  });
});

describe("vendor bookings", () => {
  it("another vendor cannot read or update a booking for the vendor's event; the owner can read it", async () => {
    const [a, b] = await twoVendors();
    const customer = await signUp(app, "customer");
    const id = await insertOrder(customer.userId, await vendorEvent(a));

    expect((await call(b, "get", `/api/vendors/bookings/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/vendors/bookings/${id}`, { vendorNotes: "pwned" })).status).toBe(404);
    expect((await Order.findById(id).lean() as Record<string, unknown>).vendorNotes).toBeUndefined();
    expect((await call(a, "get", `/api/vendors/bookings/${id}`)).status).toBe(200);
  });
});

describe("tickets (staff side)", () => {
  it("another vendor cannot view or check in a ticket for the vendor's event; the owner can check it in", async () => {
    const [a, b] = await twoVendors();
    const customer = await signUp(app, "customer");
    const eventId = await vendorEvent(a);
    const id = await ticketFor(customer, eventId, await insertOrder(customer.userId, eventId));

    expect((await call(b, "get", `/api/tickets/${id}`)).status).toBe(403);
    expect((await call(b, "post", `/api/tickets/${id}/resend`, { method: "email" })).status).toBe(403);
    expect((await call(b, "post", `/api/tickets/${id}/checkin`)).status).toBe(403);
    expect((await Ticket.findById(id).lean())!.status).toBe("active");
    expect((await call(a, "post", `/api/tickets/${id}/checkin`)).status).toBe(200);
  });

  // ticket.controller.ts getTicketsByOrder: `!["admin","vendor"].includes(role)` — any vendor passes.
  it("a vendor cannot list the tickets (attendee PII) of another vendor's order", async () => {
    const [a, b] = await twoVendors();
    const customer = await signUp(app, "customer");
    const eventId = await vendorEvent(a);
    const orderId = await insertOrder(customer.userId, eventId);
    await ticketFor(customer, eventId, orderId);

    expect((await call(b, "get", `/api/tickets/order/${orderId}`)).status).toBe(403);
  });

  // ticket.controller.ts generateTickets: no check that the caller owns eventId.
  it("a vendor cannot mint tickets for another vendor's event", async () => {
    const [a, b] = await twoVendors();
    const accomplice = await signUp(app, "customer");
    const email = (await User.findById(accomplice.userId).lean())!.email;
    const eventId = await vendorEvent(a);
    const res = await call(b, "post", "/api/tickets/generate", {
      eventId,
      orderId: String(new Types.ObjectId()),
      attendees: [{ name: "Free Rider", email, ticketType: "vip", price: 0, currency: "AED" }],
    });
    expect([403, 404]).toContain(res.status);
    expect(await Ticket.countDocuments({ eventId })).toBe(0);
  });
});

describe("certificates (vendor side)", () => {
  it("the owning vendor can issue a certificate for their event", async () => {
    const [a] = await twoVendors();
    const eventId = await vendorEvent(a);
    const res = await call(a, "post", "/api/certificates/generate", { eventId, recipient: { name: "Kid", email: "kid@example.com" } });
    expect(res.status).toBe(201);
  });

  // certificate.controller.ts triggerGeneration/bulkGenerate: no event ownership check.
  it("a vendor cannot issue certificates under another vendor's event", async () => {
    const [a, b] = await twoVendors();
    const eventId = await vendorEvent(a);
    const res = await call(b, "post", "/api/certificates/generate", { eventId, recipient: { name: "Forged", email: "forged@example.com" } });
    expect([403, 404]).toContain(res.status);
    expect(certificateService.issueForEvent).not.toHaveBeenCalled();
  });

  it("a vendor cannot bulk-queue certificates under another vendor's event", async () => {
    const [a, b] = await twoVendors();
    const eventId = await vendorEvent(a);
    const res = await call(b, "post", "/api/certificates/bulk", {
      eventId,
      templateId: String(new Types.ObjectId()),
      inputs: [{ recipientName: "Forged", recipientEmail: "forged@example.com" }],
    });
    expect([403, 404]).toContain(res.status);
    expect(certificateService.bulkIssue).not.toHaveBeenCalled();
  });
});

describe("vendor employees", () => {
  async function employeeOf(vendorRef: string) {
    const _id = new Types.ObjectId();
    await Employee.collection.insertOne({
      _id,
      vendorId: new Types.ObjectId(vendorRef),
      userId: new Types.ObjectId(),
      employeeId: `EMP-${_id}`,
      firstName: "Staff",
      lastName: "Member",
      email: `staff.${_id}@example.com`,
      role: "scanner",
      status: "active",
      assignedEvents: [],
      assignedVenues: [],
    });
    return String(_id);
  }

  it("another vendor cannot read, edit, delete or reassign an employee (/api/vendors/employees); the owner can read it", async () => {
    const [a, b] = await twoVendors();
    const id = await employeeOf(await vendorIdOf(a));
    const bEvent = await vendorEvent(b);

    expect((await call(b, "get", `/api/vendors/employees/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/vendors/employees/${id}`, { firstName: "Pwned" })).status).toBe(404);
    expect((await call(b, "delete", `/api/vendors/employees/${id}?hard=true`)).status).toBe(404);
    expect((await call(b, "post", `/api/vendors/employees/${id}/remove-event`, { eventId: bEvent })).status).toBe(404);
    const after = await Employee.findById(id).lean();
    expect(after!.firstName).toBe("Staff");
    expect(after!.status).toBe("active");

    expect((await call(a, "get", `/api/vendors/employees/${id}`)).status).toBe(200);
  });

  it("another vendor cannot read, edit or delete an employee (legacy /api/employees); the owner can read it", async () => {
    const [a, b] = await twoVendors();
    const id = await employeeOf(a.userId); // legacy router keys employees by the vendor's User._id

    expect((await call(b, "get", `/api/employees/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/employees/${id}`, { firstName: "Pwned" })).status).toBe(404);
    expect((await call(b, "delete", `/api/employees/${id}`)).status).toBe(404);
    expect((await Employee.findById(id).lean())!.firstName).toBe("Staff");

    expect((await call(a, "get", `/api/employees/${id}`)).status).toBe(200);
  });

  // employee.controller.ts updateEmployee: `$set: req.body` (userId/vendorId writable) and then
  // copies body.email onto User(employee.userId) — any vendor can rewrite any account's email.
  it("a vendor cannot change any user's login email via PUT /api/employees/:id", async () => {
    const [vendor, admin] = [await signUp(app, "vendor"), await signUpAdmin(app)];
    const adminEmail = (await User.findById(admin.userId).lean())!.email;
    const id = await employeeOf(vendor.userId);

    await call(vendor, "put", `/api/employees/${id}`, { userId: admin.userId, email: "attacker@evil.test" });

    expect((await User.findById(admin.userId).lean())!.email).toBe(adminEmail);
  });

  it("a vendor cannot move their employee onto another vendor to read its attendees", async () => {
    const [a, b] = await twoVendors();
    const insider = await signUpAs(app, "employee");
    const insiderEmail = (await User.findById(insider.userId).lean())!.email;
    const created = await call(a, "post", "/api/employees", { firstName: "In", lastName: "Sider", email: insiderEmail, role: "scanner" });
    expect(created.status).toBe(201);
    const bEvent = await vendorEvent(b);

    await call(a, "put", `/api/employees/${created.body.data._id}`, { vendorId: await vendorIdOf(b) });

    expect((await call(insider, "get", `/api/tickets/event/${bEvent}`)).status).toBe(403);
  });
});

describe("venues", () => {
  it("another vendor cannot read, edit or delete a venue; the owner can read it", async () => {
    const [a, b] = await twoVendors();
    const id = await vendorEvent(a, { type: "Venue", title: "My Hall" });

    expect((await call(b, "get", `/api/venues/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/venues/${id}`, { name: "Hijacked" })).status).toBe(404);
    expect((await call(b, "delete", `/api/venues/${id}`)).status).toBe(404);
    const after = await Event.findById(id).lean();
    expect(after!.title).toBe("My Hall");

    expect((await call(a, "get", `/api/venues/${id}`)).status).toBe(200);
  });
});

describe("payouts", () => {
  async function payout(owner: Record<string, Types.ObjectId>, requestedBy: string) {
    const _id = new Types.ObjectId();
    await Payout.collection.insertOne({
      _id,
      ...owner,
      amount: 100,
      currency: "AED",
      status: "pending",
      requestedAt: new Date(),
      requestedBy: new Types.ObjectId(requestedBy),
      bankDetails: { accountHolderName: "A", bankName: "B", accountNumber: "1" },
    });
    return String(_id);
  }

  it("another vendor cannot read or cancel a payout request; the owner can read it", async () => {
    const [a, b] = await twoVendors();
    const id = await payout({ vendorId: new Types.ObjectId(await vendorIdOf(a)) }, a.userId);

    expect((await call(b, "get", `/api/vendors/payouts/requests/${id}`)).status).toBe(404);
    expect((await call(b, "delete", `/api/vendors/payouts/requests/${id}`)).status).toBe(404);
    expect((await Payout.findById(id).lean())!.status).toBe("pending");
    expect((await call(a, "get", `/api/vendors/payouts/requests/${id}`)).status).toBe(200);
  });

  it("another teacher cannot read or cancel a payout request; the owner can read it", async () => {
    const [a, b] = [await signUpAs(app, "teacher"), await signUpAs(app, "teacher")];
    await teacherIdOf(b);
    const id = await payout({ teacherId: new Types.ObjectId(await teacherIdOf(a)) }, a.userId);

    expect((await call(b, "get", `/api/teachers/payouts/requests/${id}`)).status).toBe(404);
    expect((await call(b, "delete", `/api/teachers/payouts/requests/${id}`)).status).toBe(404);
    expect((await Payout.findById(id).lean())!.status).toBe("pending");
    expect((await call(a, "get", `/api/teachers/payouts/requests/${id}`)).status).toBe(200);
  });
});

describe("teachers", () => {
  async function teachingEvent(t: Session, extra: Record<string, unknown> = {}) {
    return insertEvent(String(new Types.ObjectId()), eventExtras({ type: "Class", teacherId: new Types.ObjectId(await teacherIdOf(t)), ...extra }));
  }

  it("another teacher cannot read, edit, delete or restore a teaching event; the owner can read it", async () => {
    const [a, b] = [await signUpAs(app, "teacher"), await signUpAs(app, "teacher")];
    const id = await teachingEvent(a);
    const trashed = await teachingEvent(a, { isDeleted: true });

    expect((await call(b, "get", `/api/teachers/events/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/teachers/events/${id}`, { title: "Hijacked", shortDescription: "Hijacked event" })).status).toBe(404);
    expect((await call(b, "delete", `/api/teachers/events/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/teachers/events/${trashed}/restore`)).status).toBe(404);
    expect((await Event.findById(id).lean())!.title).toBe("Owned Event");
    expect((await Event.findById(trashed).lean())!.isDeleted).toBe(true);

    expect((await call(a, "get", `/api/teachers/events/${id}`)).status).toBe(200);
  });

  async function teacherBooking(t: Session) {
    const student = await signUp(app, "customer");
    const eventId = await teachingEvent(t);
    const _id = new Types.ObjectId();
    await TeacherBooking.collection.insertOne({
      _id,
      studentId: new Types.ObjectId(student.userId),
      sessions: [{ _id: new Types.ObjectId(), teachingEventId: new Types.ObjectId(eventId) }],
      createdAt: new Date(),
    });
    return { id: String(_id), orderId: await insertOrder(student.userId, eventId) };
  }

  it("another teacher cannot read or edit a booking or its meeting link", async () => {
    const [a, b] = [await signUpAs(app, "teacher"), await signUpAs(app, "teacher")];
    const { id, orderId } = await teacherBooking(a);

    expect((await call(b, "get", `/api/teachers/bookings/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/teachers/bookings/${id}`, { teacherNotes: "pwned" })).status).toBe(404);
    expect((await call(b, "put", `/api/teachers/bookings/${orderId}/meeting-link`, { meetingLink: "https://evil.test/meet" })).status).toBe(404);
    expect(JSON.stringify(await Order.findById(orderId).lean())).not.toContain("evil.test");
    expect((await call(a, "put", `/api/teachers/bookings/${orderId}/meeting-link`, { meetingLink: "https://meet.test/ok" })).status).toBe(200);
  });

  // teacher.controller.ts getTeacherBookingById populates "sessions.teachingEventId" whose ref
  // ("TeachingEvent") is not a registered model — the owner always gets a 500.
  it.failing("BUG: the owning teacher gets 500 reading their own booking", async () => {
    const [a] = [await signUpAs(app, "teacher")];
    const { id } = await teacherBooking(a);
    expect((await call(a, "get", `/api/teachers/bookings/${id}`)).status).toBe(200);
  });
});
