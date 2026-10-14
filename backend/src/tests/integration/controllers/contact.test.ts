import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Contact from "../../../models/Contact";
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

const send = (s: Session, method: "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const form = { name: "Omar Ali", email: "omar@example.com", subject: "Feedback", message: "Loved the summer camp!" };

async function insertContact(extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Contact.collection.insertOne({ _id, ...form, status: "new", createdAt: new Date(), ...extra });
  return String(_id);
}

it("stores a public contact submission", async () => {
  const res = await request(app).post("/api/contact").send(form);

  expect(res.status).toBe(201);
  expect(res.body.data.contact).toMatchObject({ name: form.name, subject: "Feedback" });
  expect(await Contact.countDocuments({ email: form.email, status: "new" })).toBe(1);
});

it.each([
  ["missing name", { name: undefined }],
  ["digits in name", { name: "R2D2" }],
  ["invalid email", { email: "nope" }],
  ["unknown subject", { subject: "Spam" }],
  ["short message", { message: "hi" }],
])("returns 400 for %s", async (_label, patch) => {
  expect((await request(app).post("/api/contact").send({ ...form, ...patch })).status).toBe(400);
  expect(await Contact.countDocuments()).toBe(0);
});

it("lets an admin list, read, mark read/responded and delete submissions", async () => {
  const admin = await signUpAdmin(app);
  const id = await insertContact();

  const list = await get(admin, "/api/contact");
  expect(list.status).toBe(200);
  expect(JSON.stringify(list.body.data)).toContain(id);
  expect((await get(admin, "/api/contact/stats")).status).toBe(200);
  expect((await get(admin, `/api/contact/${id}`)).status).toBe(200);

  expect((await send(admin, "patch", `/api/contact/${id}/read`)).status).toBe(200);
  expect((await Contact.findById(id).lean())!.status).toBe("read");

  expect((await send(admin, "patch", `/api/contact/${id}/responded`, { notes: "Called back" })).status).toBe(200);
  expect((await Contact.findById(id).lean())!).toMatchObject({ status: "responded", notes: "Called back" });

  expect((await send(admin, "delete", `/api/contact/${id}`)).status).toBe(200);
  expect(await Contact.countDocuments()).toBe(0);
});

it("returns 400 for malformed ids and bad list filters, 404 for unknown ids", async () => {
  const admin = await signUpAdmin(app);

  expect((await get(admin, "/api/contact/not-an-id")).status).toBe(400);
  expect((await get(admin, "/api/contact?status=bogus")).status).toBe(400);
  expect((await get(admin, `/api/contact/${new Types.ObjectId()}`)).status).toBe(404);
});

it("forbids non-admins from reading or changing submissions", async () => {
  const vendor = await signUp(app, "vendor");
  const id = await insertContact();

  expect((await get(vendor, "/api/contact")).status).toBe(403);
  expect((await get(vendor, `/api/contact/${id}`)).status).toBe(403);
  expect((await send(vendor, "delete", `/api/contact/${id}`)).status).toBe(403);
  expect(await Contact.countDocuments()).toBe(1);
});
