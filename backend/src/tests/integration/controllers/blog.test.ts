import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import { Blog } from "../../../models/Blog";
import { BlogCategory } from "../../../models/BlogCategory";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections } from "../setup/factories";
import { Session, cookie, signUp, signUpAdmin } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  await ensureCollections(); // services here write inside transactions
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "put" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function insertCategory() {
  const _id = new Types.ObjectId();
  await BlogCategory.collection.insertOne({ _id, name: `News ${_id}`, slug: `news-${_id}`, isActive: true, postsCount: 0 });
  return String(_id);
}

async function insertBlog(category: string, extra: Record<string, unknown> = {}) {
  const _id = new Types.ObjectId();
  await Blog.collection.insertOne({
    _id,
    title: "Hello",
    slug: `hello-${_id}`,
    excerpt: "Ex",
    content: "Some content",
    category: new Types.ObjectId(category),
    author: { name: "Ann", email: "ann@example.com" },
    tags: [],
    status: "published",
    readTime: 1,
    viewCount: 0,
    likeCount: 0,
    shareCount: 0,
    likedBy: [],
    likedByIPs: [],
    publishedAt: new Date(),
    createdAt: new Date(),
    ...extra,
  });
  return { id: String(_id), slug: `hello-${_id}` };
}

const newBlog = (category: string) => ({
  title: "Summer Camps",
  slug: "summer-camps",
  excerpt: "Best camps",
  content: "word ".repeat(450),
  category,
  author: { name: "Ann", email: "ann@example.com" },
  status: "published",
});

describe("public blog endpoints", () => {
  it("lists published blogs only and reads one by slug", async () => {
    const cat = await insertCategory();
    const pub = await insertBlog(cat);
    const draft = await insertBlog(cat, { status: "draft" });

    const list = await request(app).get("/api/blogs");
    expect(list.status).toBe(200);
    const listed = JSON.stringify(list.body.data);
    expect(listed).toContain(pub.slug);
    expect(listed).not.toContain(draft.slug);

    expect((await request(app).get(`/api/blogs/${pub.slug}`)).status).toBe(200);
    expect((await request(app).get(`/api/blogs/${draft.slug}`)).status).toBe(404);
  });

  it("serves featured, popular, recent, categories and related lists", async () => {
    const cat = await insertCategory();
    const { slug } = await insertBlog(cat, { featured: true });
    for (const path of ["featured", "popular", "recent", "categories", `${slug}/related`]) {
      expect((await request(app).get(`/api/blogs/${path}`)).status).toBe(200);
    }
  });

  it("likes a blog once per anonymous client and counts shares", async () => {
    const cat = await insertCategory();
    const { id, slug } = await insertBlog(cat);

    await request(app).post(`/api/blogs/${slug}/like`);
    await request(app).post(`/api/blogs/${slug}/like`);
    await request(app).post(`/api/blogs/${slug}/share`).send({ platform: "facebook" });

    const saved = (await Blog.findById(id).lean())!;
    expect(saved.likeCount).toBe(1);
    expect(saved.shareCount).toBe(1);
  });

  it("likes cannot be inflated by spoofing the X-Real-IP header", async () => {
    const cat = await insertCategory();
    const { id, slug } = await insertBlog(cat);

    for (let i = 0; i < 3; i++) await request(app).post(`/api/blogs/${slug}/like`).set("X-Real-IP", `10.0.0.${i}`);

    expect((await Blog.findById(id).lean())!.likeCount).toBe(1);
  });
});

describe("admin blog management", () => {
  it("creates a blog with computed read time, updates and deletes it", async () => {
    const admin = await signUpAdmin(app);
    const cat = await insertCategory();

    const created = await send(admin, "post", "/api/admin/blogs", newBlog(cat));
    expect(created.status).toBe(201);
    const id = created.body.data.blog._id;
    const saved = (await Blog.findById(id).lean())!;
    expect(saved.readTime).toBe(3);
    expect((await BlogCategory.findById(cat).lean())!.postsCount).toBe(1);

    expect((await get(admin, `/api/admin/blogs/${id}`)).status).toBe(200);
    expect((await get(admin, "/api/admin/blogs")).status).toBe(200);

    expect((await send(admin, "put", `/api/admin/blogs/${id}`, { title: "Winter Camps" })).status).toBe(200);
    expect((await Blog.findById(id).lean())!.title).toBe("Winter Camps");

    expect((await send(admin, "delete", `/api/admin/blogs/${id}`)).status).toBe(200);
    expect(await Blog.countDocuments({ _id: id })).toBe(0);
    expect((await BlogCategory.findById(cat).lean())!.postsCount).toBe(0);
  });

  it("returns 400 for missing fields, bad category and bad author email", async () => {
    const admin = await signUpAdmin(app);
    const cat = await insertCategory();

    expect((await send(admin, "post", "/api/admin/blogs", {})).status).toBe(400);
    expect((await send(admin, "post", "/api/admin/blogs", { ...newBlog(cat), category: "bad" })).status).toBe(400);
    expect((await send(admin, "post", "/api/admin/blogs", { ...newBlog(String(new Types.ObjectId())) })).status).toBe(400);
    expect((await send(admin, "post", "/api/admin/blogs", { ...newBlog(cat), author: { name: "A", email: "nope" } })).status).toBe(400);
    expect(await Blog.countDocuments()).toBe(0);
  });

  it("manages blog categories", async () => {
    const admin = await signUpAdmin(app);

    const created = await send(admin, "post", "/api/admin/blogs/categories", { name: "Tips" });
    expect(created.status).toBe(201);
    const id = created.body.data.category._id;

    expect((await send(admin, "put", `/api/admin/blogs/categories/${id}`, { name: "Tricks" })).status).toBe(200);
    expect((await BlogCategory.findById(id).lean())!.name).toBe("Tricks");
    expect((await send(admin, "patch", `/api/admin/blogs/categories/${id}/toggle-status`)).status).toBe(200);
    expect((await get(admin, "/api/admin/blogs/categories")).body.data.categories).toHaveLength(1);
    expect((await send(admin, "post", "/api/admin/blogs/categories", {})).status).toBe(400);

    expect((await send(admin, "delete", `/api/admin/blogs/categories/${id}`)).status).toBe(200);
    expect(await BlogCategory.countDocuments()).toBe(0);
  });

  it("refuses to delete a category that still has blogs", async () => {
    const admin = await signUpAdmin(app);
    const cat = await insertCategory();
    await insertBlog(cat);

    expect((await send(admin, "delete", `/api/admin/blogs/categories/${cat}`)).status).toBe(400);
  });

  it("forbids non-admins", async () => {
    const vendor = await signUp(app, "vendor");
    const cat = await insertCategory();

    expect((await get(vendor, "/api/admin/blogs")).status).toBe(403);
    expect((await send(vendor, "post", "/api/admin/blogs", newBlog(cat))).status).toBe(403);
    expect(await Blog.countDocuments()).toBe(0);
  });
});
