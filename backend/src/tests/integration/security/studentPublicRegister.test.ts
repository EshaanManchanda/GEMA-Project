/**
 * Public student-program signup: may create a new parent account, but must
 * never attach a child to someone else's existing account, and must not
 * inject submitted text into the welcome email as HTML.
 */
import request from "supertest";
import { Application } from "express";
import Student from "../../../models/Student";
import User from "../../../models/User";
import { emailService } from "../../../services/email.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp } from "../setup/session";

jest.mock("../../../services/email.service", () => {
  const sendEmail = jest.fn().mockResolvedValue(undefined);
  const svc = new Proxy({ sendEmail }, { get: (t: any, k) => t[k] ?? jest.fn().mockResolvedValue(undefined) });
  return { __esModule: true, default: svc, sendEmail, emailService: svc };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(async () => {
  jest.clearAllMocks();
  await clearTestDB();
});
afterAll(closeTestDB);

const register = (body: Record<string, unknown>) => request(app).post("/api/students/public-register").send(body);

it("creates a parent account and student for a new email", async () => {
  const res = await register({ studentName: "Ali Khan", email: "new.parent@example.com", grade: "5" });

  expect(res.status).toBe(201);
  const parent = await User.findOne({ email: "new.parent@example.com" }).lean();
  expect(await Student.countDocuments({ parentUserId: parent!._id })).toBe(1);
});

it("does not attach a child to an existing account for an anonymous caller", async () => {
  const victim = await signUp(app, "customer");
  const email = (await User.findById(victim.userId).lean())!.email;

  const res = await register({ studentName: "Planted Child", email });

  expect(res.status).toBe(409);
  expect(await Student.countDocuments({ parentUserId: victim.userId })).toBe(0);
});

it("lets a logged-in parent add a child with their own email", async () => {
  const parent = await signUp(app, "customer");
  const email = (await User.findById(parent.userId).lean())!.email;

  const res = await request(app)
    .post("/api/students/public-register")
    .set("Cookie", cookie(parent))
    .set("x-csrf-token", parent.csrfToken)
    .send({ studentName: "Own Child", email });

  expect(res.status).toBe(201);
  expect(await Student.countDocuments({ parentUserId: parent.userId })).toBe(1);
});

it("escapes submitted text in the welcome email", async () => {
  await register({
    studentName: "Kid",
    email: "html.parent@example.com",
    grade: '<a href="https://evil.test">Click to verify</a>',
    interest: "<script>alert(1)</script>",
  });

  const html: string = (emailService.sendEmail as jest.Mock).mock.calls[0][0].html;
  expect(html).not.toContain('<a href="https://evil.test">');
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});

it("rejects an invalid email with 400", async () => {
  const res = await register({ studentName: "Kid", email: "not-an-email" });
  expect(res.status).toBe(400);
});
