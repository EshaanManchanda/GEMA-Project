/**
 * Certificate lookup by email: the list (children's names, events, PDF
 * links) goes only to the address's owner — shown to them when logged in,
 * otherwise emailed to that address. Strangers learn nothing.
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Certificate from "../../../models/Certificate";
import User from "../../../models/User";
import { emailService } from "../../../services/email.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp } from "../setup/session";

jest.mock("../../../services/email.service", () => {
  const sendEmail = jest.fn();
  const svc = new Proxy({ sendEmail }, { get: (t: any, k) => t[k] ?? jest.fn().mockResolvedValue(undefined) });
  return { __esModule: true, default: svc, emailService: svc, sendEmail };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
beforeEach(() => (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined));
afterEach(clearTestDB);
afterAll(closeTestDB);

const lookup = (email: string) => request(app).get("/api/certificates/public/by-email").query({ email });

async function certFor(email: string) {
  await Certificate.collection.insertOne({
    _id: new Types.ObjectId(),
    serialNumber: `SN-${new Types.ObjectId()}`,
    recipient: { name: "Child Name", email },
    status: "generated",
    pdfUrl: "https://example.test/api/media/file/00000000-0000-0000-0000-000000000000",
    createdAt: new Date(),
  });
}

it("an anonymous caller gets no data; the list is emailed to the address", async () => {
  await certFor("kid.parent@example.com");

  const res = await lookup("kid.parent@example.com");

  expect(res.status).toBe(200);
  expect(res.body.data.certificates).toBeUndefined();
  expect(res.body.data.emailed).toBe(true);
  expect(JSON.stringify(res.body)).not.toContain("Child Name");
  const mail = (emailService.sendEmail as jest.Mock).mock.calls[0][0];
  expect(mail.to).toBe("kid.parent@example.com");
  expect(mail.html).toContain("SN-");
});

it("the logged-in owner sees their list directly", async () => {
  const owner = await signUp(app, "customer");
  const email = (await User.findById(owner.userId).lean())!.email;
  await certFor(email);

  const res = await lookup(email).set("Cookie", cookie(owner));

  expect(res.status).toBe(200);
  expect(res.body.data.certificates).toHaveLength(1);
});

it("a logged-in user asking about someone else's email gets no data", async () => {
  await certFor("someone.else@example.com");
  const other = await signUp(app, "customer");

  const res = await lookup("someone.else@example.com").set("Cookie", cookie(other));

  expect(res.body.data.certificates).toBeUndefined();
});

it("sends nothing when there are no certificates (same response)", async () => {
  const res = await lookup("nobody@example.com");
  expect(res.body.data.emailed).toBe(true);
  expect(emailService.sendEmail).not.toHaveBeenCalled();
});
