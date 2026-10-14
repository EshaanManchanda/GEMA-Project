import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import SEOContent from "../../../models/SEOContent";
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

const send = (s: Session, method: "post" | "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);

const body = {
  page: "about",
  metaTitle: "About Kidrove - Kids Activities in the UAE",
  metaDescription: "Kidrove helps parents discover camps, classes and events for kids across the UAE. Learn about our mission, our team and the partners behind it.",
  keywords: ["kids", "activities", "uae"],
  trustSignals: { yearsInBusiness: 3 }, // validator marks it optional, but the model requires it
};

it("creates, serves publicly, updates and deletes page SEO content", async () => {
  const admin = await signUpAdmin(app);

  const created = await send(admin, "post", "/api/seo-content", body);
  expect(created.status).toBe(201);
  expect(await SEOContent.countDocuments({ page: "about" })).toBe(1);

  const pub = await request(app).get("/api/seo-content/about");
  expect(pub.status).toBe(200);
  expect(pub.body.data.seoContent.metaTitle).toBe(body.metaTitle);

  const list = await request(app).get("/api/seo-content").set("Cookie", cookie(admin));
  expect(list.status).toBe(200);

  const newTitle = "About Kidrove - Family Fun Across the Emirates";
  expect((await send(admin, "put", "/api/seo-content/about", { metaTitle: newTitle })).status).toBe(200);
  expect((await SEOContent.findOne({ page: "about" }).lean())!.metaTitle).toBe(newTitle);

  expect((await send(admin, "delete", "/api/seo-content/about")).status).toBe(200);
  expect(await SEOContent.countDocuments()).toBe(0);
});

it("returns 404 for a page without content", async () => {
  expect((await request(app).get("/api/seo-content/faq")).status).toBe(404);
});

it.each([
  ["short metaTitle", { metaTitle: "Too short" }],
  ["short metaDescription", { metaDescription: "Too short" }],
  ["too few keywords", { keywords: ["one"] }],
  ["unknown page", { page: "pricing" }],
])("returns 400 for %s", async (_label, patch) => {
  const admin = await signUpAdmin(app);
  expect((await send(admin, "post", "/api/seo-content", { ...body, ...patch })).status).toBe(400);
  expect(await SEOContent.countDocuments()).toBe(0);
});

it("returns 400 for a duplicate page", async () => {
  const admin = await signUpAdmin(app);
  await send(admin, "post", "/api/seo-content", body);
  expect((await send(admin, "post", "/api/seo-content", body)).status).toBe(400);
});

it("forbids non-admins", async () => {
  const vendor = await signUp(app, "vendor");
  expect((await send(vendor, "post", "/api/seo-content", body)).status).toBe(403);
  expect(await SEOContent.countDocuments()).toBe(0);
});
