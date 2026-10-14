/**
 * IDOR: customer-owned records. User B (same role) must get 403/404 on user A's
 * record for read/update/delete; A must succeed (positive control).
 * Anonymous access and customer-on-admin are in routeAuthMatrix.test.ts.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import Order from "../../../models/Order";
import Ticket from "../../../models/Ticket";
import Registration from "../../../models/Registration";
import Student from "../../../models/Student";
import Review from "../../../models/Review";
import Notification from "../../../models/Notification";
import Certificate from "../../../models/Certificate";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, insertEvent, signUp, signUpAdmin, vendorIdOf, Session } from "../setup/session";
import { insertOrder } from "../setup/factories";

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

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

type Method = "get" | "post" | "put" | "patch" | "delete";
const call = (s: Session, method: Method, url: string, body: object = {}) => {
  const r = request(app)[method](url).set("Cookie", cookie(s));
  return method === "get" ? r : r.set("x-csrf-token", s.csrfToken).send(body);
};

const event = async (vendor: Session) =>
  insertEvent(await vendorIdOf(vendor), {
    isDeleted: false,
    location: { address: "1 Test St", city: "Dubai" },
    dateSchedule: [{ _id: new Types.ObjectId(), date: new Date(Date.now() + 864e6), startDate: new Date(Date.now() + 864e6), endDate: new Date(Date.now() + 865e6) }],
  });

/** customer A, customer B, and an event A booked */
async function twoCustomers() {
  const [a, b, vendor] = [await signUp(app, "customer"), await signUp(app, "customer"), await signUp(app, "vendor")];
  return { a, b, vendor, eventId: await event(vendor) };
}

describe("orders", () => {
  it("another customer cannot read or cancel an order; the owner can read it", async () => {
    const { a, b, eventId } = await twoCustomers();
    const id = await insertOrder(a.userId, eventId);

    expect((await call(b, "get", `/api/orders/${id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/orders/${id}/cancel`, { reason: "not mine" })).status).toBe(404);
    expect((await call(b, "post", `/api/orders/${id}/payment`, { paymentMethod: "stripe", paymentIntentId: "pi_x" })).status).toBe(404);
    expect((await Order.findById(id).lean())!.status).toBe("confirmed");

    expect((await call(a, "get", `/api/orders/${id}`)).status).toBe(200);
  });
});

describe("bookings", () => {
  it("another customer cannot read or cancel a booking by id or order number; the owner can", async () => {
    const { a, b, eventId } = await twoCustomers();
    const id = await insertOrder(a.userId, eventId);

    for (const ref of [id, `GM-${id}`]) {
      expect((await call(b, "get", `/api/bookings/${ref}`)).status).toBe(404);
      expect((await call(b, "put", `/api/bookings/${ref}/cancel`, { reason: "not my booking" })).status).toBe(404);
    }
    expect((await Order.findById(id).lean())!.status).toBe("confirmed");

    expect((await call(a, "get", `/api/bookings/${id}`)).status).toBe(200);
  });
});

describe("tickets", () => {
  async function ticketFor(owner: Session, eventId: string, orderId: string) {
    const _id = new Types.ObjectId();
    await Ticket.collection.insertOne({
      _id,
      userId: new Types.ObjectId(owner.userId),
      eventId: new Types.ObjectId(eventId),
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

  it("another customer cannot view, download, resend or list a ticket; the owner can", async () => {
    const { a, b, eventId } = await twoCustomers();
    const orderId = await insertOrder(a.userId, eventId);
    const id = await ticketFor(a, eventId, orderId);

    expect((await call(b, "get", `/api/tickets/${id}`)).status).toBe(403);
    expect((await call(b, "get", `/api/tickets/${id}/download`)).status).toBe(403);
    expect((await call(b, "post", `/api/tickets/${id}/resend`, { method: "email" })).status).toBe(403);
    expect((await call(b, "get", `/api/tickets/order/${orderId}`)).status).toBe(403);
    expect((await call(b, "post", "/api/tickets/generate-missing", { orderId })).status).toBe(404);

    expect((await call(a, "get", `/api/tickets/${id}`)).status).toBe(200);
    expect((await call(a, "get", `/api/tickets/${id}/download`)).status).toBe(200);
    expect((await call(a, "post", `/api/tickets/${id}/resend`, { method: "email" })).status).toBe(200);
    const list = await call(a, "get", `/api/tickets/order/${orderId}`);
    expect(list.status).toBe(200);
    expect(list.body.tickets).toHaveLength(1);
  });

  it("an unrelated customer cannot check a ticket in", async () => {
    const { a, b, eventId } = await twoCustomers();
    const id = await ticketFor(a, eventId, await insertOrder(a.userId, eventId));
    expect((await call(b, "post", `/api/tickets/${id}/checkin`)).status).toBe(403);
    expect((await Ticket.findById(id).lean())!.status).toBe("active");
  });
});

describe("registrations", () => {
  async function registration(owner: Session, eventId: string) {
    const _id = new Types.ObjectId();
    const fileId = new Types.ObjectId();
    await Registration.collection.insertOne({
      _id,
      eventId: new Types.ObjectId(eventId),
      userId: new Types.ObjectId(owner.userId),
      status: "submitted",
      registrationData: [],
      files: [{ _id: fileId, fieldId: "f", fileName: "id.pdf", fileUrl: "https://x.test/id.pdf", fileType: "application/pdf", fileSize: 1 }],
      payment: { required: true, amount: 10, currency: "AED", status: "pending", stripePaymentIntentId: "pi_owned" },
      submittedAt: new Date(),
    });
    return { id: String(_id), fileId: String(fileId) };
  }

  it("another customer cannot read, edit, withdraw, pay for or download files of a registration; the owner can read it", async () => {
    const { a, b, eventId } = await twoCustomers();
    const { id, fileId } = await registration(a, eventId);

    expect((await call(b, "get", `/api/registrations/${id}`)).status).toBe(403);
    expect((await call(b, "patch", `/api/registrations/${id}`, { registrationData: [] })).status).toBe(404);
    expect((await call(b, "delete", `/api/registrations/${id}`)).status).toBe(404);
    expect((await call(b, "post", `/api/registrations/${id}/confirm-payment`, { paymentIntentId: "pi_owned" })).status).toBe(404);
    expect((await call(b, "get", `/api/registrations/${id}/files/${fileId}`)).status).toBe(403);
    expect((await call(b, "post", `/api/registrations/${id}/review`, { status: "approved" })).status).toBe(403);
    expect((await Registration.findById(id).lean())!.status).toBe("submitted");

    expect((await call(a, "get", `/api/registrations/${id}`)).status).toBe(200);
  });
});

describe("students", () => {
  it("only admins update/delete a child record — not even another parent; admin can", async () => {
    const [parent, stranger, admin] = [await signUp(app, "customer"), await signUp(app, "customer"), await signUpAdmin(app)];
    const _id = new Types.ObjectId();
    await Student.collection.insertOne({ _id, firstName: "Kid", lastName: "A", email: "kid@x.test", parentUserId: new Types.ObjectId(parent.userId), status: "active" });

    for (const who of [stranger, parent]) {
      expect((await call(who, "put", `/api/students/${_id}`, { firstName: "Pwned" })).status).toBe(403);
      expect((await call(who, "delete", `/api/students/${_id}`)).status).toBe(403);
    }
    expect((await Student.findById(_id).lean())!.firstName).toBe("Kid");
    expect((await call(admin, "put", `/api/students/${_id}`, { firstName: "Renamed" })).status).toBe(200);
  });

  it("my-children lists only the caller's own children", async () => {
    const [parent, stranger] = [await signUp(app, "customer"), await signUp(app, "customer")];
    await Student.collection.insertOne({ firstName: "Kid", email: "kid@x.test", parentUserId: new Types.ObjectId(parent.userId), status: "active" });
    const res = await call(stranger, "get", "/api/students/me/children");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("kid@x.test");
  });
});

describe("reviews", () => {
  async function review(owner: Session, eventId: string, status = "pending") {
    const _id = new Types.ObjectId();
    await Review.collection.insertOne({
      _id,
      type: "event",
      event: new Types.ObjectId(eventId),
      user: new Types.ObjectId(owner.userId),
      rating: 5,
      title: "Great event",
      comment: "Really enjoyed this event a lot",
      status,
      helpfulVotes: [],
      flags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return String(_id);
  }

  it("another customer cannot edit or delete a review; the author can delete it", async () => {
    const { a, b, eventId } = await twoCustomers();
    const id = await review(a, eventId);

    expect((await call(b, "put", `/api/reviews/${id}`, { rating: 1, comment: "edited by someone else" })).status).toBe(404);
    expect((await call(b, "delete", `/api/reviews/${id}`)).status).toBe(404);
    const after = await Review.findById(id).lean();
    expect(after!.rating).toBe(5);
    expect(after!.deletedAt).toBeUndefined();

    expect((await call(a, "delete", `/api/reviews/${id}`)).status).toBe(200);
  });

  it("only the event's vendor may respond to a review", async () => {
    const { a, vendor, eventId } = await twoCustomers();
    const otherVendor = await signUp(app, "vendor");
    const id = await review(a, eventId, "approved");

    expect((await call(otherVendor, "post", `/api/reviews/${id}/respond`, { message: "fake reply" })).status).toBe(403);
    expect((await call(vendor, "post", `/api/reviews/${id}/respond`, { message: "thanks!" })).status).toBe(200);
  });
});

describe("favorites", () => {
  it("one user's favorites are untouched by another user's requests", async () => {
    const { a, b, eventId } = await twoCustomers();
    expect((await call(a, "post", `/api/favorites/${eventId}`)).status).toBeLessThan(300);

    expect((await call(b, "delete", `/api/favorites/${eventId}`)).status).toBe(400);
    expect((await call(b, "get", `/api/favorites/check/${eventId}`)).body.data?.isFavorite ?? false).toBe(false);
    const user = await User.findById(a.userId).select("favoriteEvents").lean();
    expect((user!.favoriteEvents || []).map(String)).toContain(eventId);
  });
});

describe("notifications", () => {
  it("another user cannot read or mark a notification; the owner can", async () => {
    const [a, b] = [await signUp(app, "customer"), await signUp(app, "customer")];
    const _id = new Types.ObjectId();
    await Notification.collection.insertOne({
      _id,
      userId: new Types.ObjectId(a.userId),
      type: "booking_confirmed",
      priority: "medium",
      title: "Booked",
      message: "Your booking is confirmed",
      channels: ["in_app"],
      isRead: false,
      createdAt: new Date(),
    });

    expect((await call(b, "get", `/api/notifications/${_id}`)).status).toBe(404);
    expect((await call(b, "put", `/api/notifications/${_id}/read`)).status).toBe(404);
    expect((await call(b, "put", `/api/notifications/${_id}/clicked`)).status).toBe(404);
    expect((await call(b, "delete", `/api/notifications/${_id}`)).status).toBe(403);
    expect((await Notification.findById(_id).lean())!.isRead).toBe(false);

    expect((await call(a, "get", `/api/notifications/${_id}`)).status).toBe(200);
    expect((await call(a, "put", `/api/notifications/${_id}/read`)).status).toBe(200);
  });
});

describe("certificates", () => {
  it("only the recipient and the event's vendor can view/download a certificate", async () => {
    const { a, b, vendor, eventId } = await twoCustomers();
    const otherVendor = await signUp(app, "vendor");
    const _id = new Types.ObjectId();
    await Certificate.collection.insertOne({
      _id,
      templateId: new Types.ObjectId(),
      eventId: new Types.ObjectId(eventId),
      userId: new Types.ObjectId(a.userId),
      serialNumber: `CERT-${_id}`,
      recipient: { name: "Kid A", email: "kid.a@example.com" },
      status: "generated",
      pdfUrl: "https://cdn.test/cert.pdf",
      history: [],
    });

    for (const who of [b, otherVendor]) {
      expect((await call(who, "get", `/api/certificates/${_id}`)).status).toBe(404);
      expect((await call(who, "get", `/api/certificates/${_id}/download`)).status).toBe(404);
    }
    for (const who of [vendor, a]) {
      expect((await call(who, "put", `/api/certificates/${_id}`, { recipient: { name: "X" } })).status).toBe(403);
      expect((await call(who, "delete", `/api/certificates/${_id}`)).status).toBe(403);
      expect((await call(who, "post", `/api/certificates/${_id}/revoke`, { reason: "x" })).status).toBe(403);
    }
    for (const who of [a, vendor]) {
      expect((await call(who, "get", `/api/certificates/${_id}`)).status).toBe(200);
      expect((await call(who, "get", `/api/certificates/${_id}/download`)).status).toBe(200);
    }
  });
});
