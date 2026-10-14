import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Category from "../../../models/Category";
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

async function insertCategory(extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Category.collection.insertOne({ _id, name: `Cat ${_id}`, slug: `cat-${_id}`, level: 0, isActive: true, sortOrder: 0, eventCount: 0, ...extra });
  return String(_id);
}

describe("public category reads", () => {
  it("lists active categories, roots, children, and finds by id or slug", async () => {
    const root = await insertCategory({ slug: "arts", name: "Arts" });
    await insertCategory({ slug: "painting", name: "Painting", parentId: new Types.ObjectId(root), level: 1 });

    const all = await request(app).get("/api/categories?tree=false");
    expect(all.status).toBe(200);
    expect(JSON.stringify(all.body.data)).toContain("painting");

    const roots = await request(app).get("/api/categories/roots");
    expect(roots.body.data.map((c: { slug: string }) => c.slug)).toEqual(["arts"]);

    const kids = await request(app).get(`/api/categories/parent/${root}`);
    expect(kids.body.data.map((c: { slug: string }) => c.slug)).toEqual(["painting"]);

    expect((await request(app).get(`/api/categories/${root}`)).body.data.slug).toBe("arts");
    expect((await request(app).get("/api/categories/painting")).body.data.name).toBe("Painting");
    expect((await request(app).get("/api/categories/nope")).status).toBe(404);
  });

  it("searches by name and requires a query", async () => {
    await Category.createIndexes(); // $text search needs the text index, which autoIndex builds lazily
    await insertCategory({ slug: "music", name: "Music" });
    const res = await request(app).get("/api/categories/search?q=music");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.data)).toContain("music");
    expect((await request(app).get("/api/categories/search")).status).toBe(400);
    expect((await request(app).get("/api/categories/parent/garbage")).status).toBe(400);
  });
});

describe("admin category management", () => {
  it("creates, updates and soft-deletes a category", async () => {
    const admin = await signUpAdmin(app);

    const created = await send(admin, "post", "/api/categories", { name: "Science", slug: "science", description: "Labs" });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect((await Category.findById(id).lean())!.slug).toBe("science");

    expect((await send(admin, "put", `/api/categories/${id}`, { name: "Sciences" })).status).toBe(200);
    expect((await Category.findById(id).lean())!.name).toBe("Sciences");

    expect((await send(admin, "delete", `/api/categories/${id}`)).status).toBe(200);
    expect((await Category.findById(id).lean())!.isActive).toBe(false);
  });

  it("creates a child category under an existing parent at level 1", async () => {
    const admin = await signUpAdmin(app);
    const parent = await insertCategory();

    const res = await send(admin, "post", "/api/categories", { name: "Child", slug: "child", parentId: parent });

    expect(res.status).toBe(201);
    expect((await Category.findOne({ slug: "child" }).lean())!.level).toBe(1);
  });

  it("returns 400 for invalid input and duplicate slugs", async () => {
    const admin = await signUpAdmin(app);
    await insertCategory({ slug: "taken" });

    expect((await send(admin, "post", "/api/categories", {})).status).toBe(400);
    expect((await send(admin, "post", "/api/categories", { name: "X", slug: "x", parentId: "bad" })).status).toBe(400);
    expect((await send(admin, "post", "/api/categories", { name: "X", slug: "x", sortOrder: -1 })).status).toBe(400);
    expect((await send(admin, "post", "/api/categories", { name: "Taken", slug: "taken" })).status).toBe(400);
    expect((await send(admin, "put", "/api/categories/bad", { name: "X" })).status).toBe(400);
  });

  it("refuses to delete a category that still has active children", async () => {
    const admin = await signUpAdmin(app);
    const parent = await insertCategory();
    await insertCategory({ parentId: new Types.ObjectId(parent), level: 1 });

    expect((await send(admin, "delete", `/api/categories/${parent}`)).status).toBe(400);
    expect((await Category.findById(parent).lean())!.isActive).toBe(true);
  });

  it("bulk-updates sort order", async () => {
    const admin = await signUpAdmin(app);
    const id = await insertCategory();

    expect((await send(admin, "put", "/api/categories/sort-order/bulk", { categories: [{ id, sortOrder: 7 }] })).status).toBe(200);
    expect((await Category.findById(id).lean())!.sortOrder).toBe(7);
    expect((await send(admin, "put", "/api/categories/sort-order/bulk", { categories: [{ id, sortOrder: -2 }] })).status).toBe(400);
  });

  it.failing("BUG: creating without a slug auto-generates one instead of failing validation", async () => {
    const admin = await signUpAdmin(app);

    const res = await send(admin, "post", "/api/categories", { name: "Dance Classes" });

    expect(res.status).toBe(201);
  });

  it("forbids non-admins", async () => {
    const vendor = await signUp(app, "vendor");
    const id = await insertCategory();

    expect((await send(vendor, "post", "/api/categories", { name: "X", slug: "x" })).status).toBe(403);
    expect((await send(vendor, "delete", `/api/categories/${id}`)).status).toBe(403);
    expect(await Category.countDocuments()).toBe(1);
  });
});
