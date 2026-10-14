/**
 * Vendors may only issue certificates for their own events (single and bulk).
 */
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import { certificateService } from "../../../modules/certificates/services/certificate.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, insertEvent, signUp, vendorIdOf, Session } from "../setup/session";

jest.mock("../../../services/email.service", () => {
  const svc = new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) });
  return { __esModule: true, default: svc, emailService: svc, sendEmail: jest.fn() };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
jest.mock("../../../modules/certificates/services/certificate.service", () => ({
  certificateService: {
    issueForEvent: jest.fn(),
    bulkIssue: jest.fn(),
  },
}));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
beforeEach(() => {
  // jest.config resets mocks between tests
  (certificateService.issueForEvent as jest.Mock).mockResolvedValue({ _id: "c1" });
  (certificateService.bulkIssue as jest.Mock).mockResolvedValue({ total: 1 });
});
afterEach(async () => {
  await clearTestDB();
});
afterAll(closeTestDB);

const post = (s: Session, path: string, body: object) =>
  request(app).post(`/api/certificates${path}`).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);

const single = (eventId: string) => ({ eventId, recipient: { name: "Kid", email: "kid@example.com" } });
const bulk = (eventId: string) => ({
  eventId,
  templateId: String(new Types.ObjectId()),
  inputs: [{ recipient: { name: "Kid", email: "kid@example.com" } }],
});

it("a vendor cannot issue certificates for another vendor's event", async () => {
  const [owner, other] = [await signUp(app, "vendor"), await signUp(app, "vendor")];
  const eventId = await insertEvent(await vendorIdOf(owner));

  expect((await post(other, "/generate", single(eventId))).status).toBe(403);
  expect((await post(other, "/bulk", bulk(eventId))).status).toBe(403);
  expect(certificateService.issueForEvent).not.toHaveBeenCalled();
  expect(certificateService.bulkIssue).not.toHaveBeenCalled();
});

it("the owning vendor can", async () => {
  const owner = await signUp(app, "vendor");
  const eventId = await insertEvent(await vendorIdOf(owner));

  expect((await post(owner, "/generate", single(eventId))).status).toBe(201);
  expect((await post(owner, "/bulk", bulk(eventId))).status).toBe(202);
});
