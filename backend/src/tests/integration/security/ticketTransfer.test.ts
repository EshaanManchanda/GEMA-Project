/**
 * Transfer must not resurrect a ticket: it used to force status back to
 * "active" with a fresh QR, so a used/refunded ticket became valid again.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp, Session } from "../setup/session";

jest.mock("../../../services/email.service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock("../../../utils/mailer", () => ({ sendTicketByEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

async function ownedTicket(owner: Session, extra: Record<string, unknown>) {
  const _id = new Types.ObjectId();
  await Ticket.collection.insertOne({
    _id,
    userId: new Types.ObjectId(owner.userId),
    eventId: new Types.ObjectId(),
    orderId: new Types.ObjectId(),
    ticketNumber: `T-${_id}`,
    ticketType: "general",
    price: 50,
    currency: "AED",
    status: "active",
    checkInDetails: { isCheckedIn: false, scanCount: 0 },
    validUntil: new Date(Date.now() + 864e5),
    ...extra,
  });
  return _id;
}

const transfer = (s: Session, id: Types.ObjectId, toEmail = "friend@example.com") =>
  request(app)
    .post(`/api/tickets/${id}/transfer`)
    .set("Cookie", cookie(s))
    .set("x-csrf-token", s.csrfToken)
    .send({ toEmail });

it.each([
  ["used", { status: "used" }],
  ["cancelled", { status: "cancelled" }],
  ["refunded", { status: "refunded" }],
  ["checked in", { checkInDetails: { isCheckedIn: true, checkInTime: new Date(), scanCount: 1 } }],
  ["expired", { validUntil: new Date(Date.now() - 864e5) }],
])("refuses to transfer a %s ticket", async (_label, extra) => {
  const owner = await signUp(app, "customer");
  const id = await ownedTicket(owner, extra);

  const res = await transfer(owner, id);

  expect(res.status).toBe(400);
  const after = await Ticket.findById(id).lean();
  expect(String(after?.userId)).toBe(owner.userId);
});

it("still transfers an active ticket to an existing account", async () => {
  const [owner, friend] = [await signUp(app, "customer"), await signUp(app, "customer")];
  const friendEmail = (await User.findById(friend.userId).lean())!.email;
  const id = await ownedTicket(owner, {});

  const res = await transfer(owner, id, friendEmail);

  expect(res.status).toBe(200);
  expect(String((await Ticket.findById(id).lean())?.userId)).toBe(friend.userId);
});

it("asks for an account instead of crashing when the recipient has none", async () => {
  const owner = await signUp(app, "customer");
  const id = await ownedTicket(owner, {});

  const res = await transfer(owner, id, "nobody@example.com");

  expect(res.status).toBe(400);
  expect(await User.countDocuments({ email: "nobody@example.com" })).toBe(0);
});
