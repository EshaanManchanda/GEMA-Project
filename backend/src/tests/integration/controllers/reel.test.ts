/** reel (public) + admin.reel controllers. */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Reel from "../../../models/Reel";
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

const BASE = "/api/admin/reels";
const send = (s: Session, method: "post" | "put" | "patch" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const body = { title: "Camp highlights", videoSourceType: "youtube", externalVideoUrl: "https://www.youtube.com/watch?v=abc123", visibility: "public" };

async function createReel(admin: Session, extra: object = {}) {
  const res = await send(admin, "post", BASE, { ...body, ...extra });
  return res.body.data.reel._id as string;
}

describe("admin reels", () => {
  it("creates, reads, updates and deletes a reel", async () => {
    const admin = await signUpAdmin(app);

    const created = await send(admin, "post", BASE, body);
    expect(created.status).toBe(201);
    const id = created.body.data.reel._id;

    expect((await get(admin, BASE)).status).toBe(200);
    expect((await get(admin, `${BASE}/${id}`)).status).toBe(200);
    expect((await send(admin, "put", `${BASE}/${id}`, { title: "Best of summer" })).status).toBe(200);
    expect((await Reel.findById(id).lean())!.title).toBe("Best of summer");

    expect((await send(admin, "delete", `${BASE}/${id}`)).status).toBe(204);
    expect(await Reel.countDocuments({ _id: id })).toBe(0);
  });

  it("returns 400 for a missing title, missing video, or bad visibility", async () => {
    const admin = await signUpAdmin(app);

    expect((await send(admin, "post", BASE, { ...body, title: "" })).status).toBe(400);
    expect((await send(admin, "post", BASE, { title: "No video" })).status).toBe(400);
    expect((await send(admin, "post", BASE, { ...body, externalVideoUrl: "" })).status).toBe(400);
    expect((await send(admin, "post", BASE, { ...body, visibility: "secret" })).status).toBe(400);
    expect(await Reel.countDocuments()).toBe(0);
  });

  it("forbids non-admins", async () => {
    const vendor = await signUp(app, "vendor");
    expect((await send(vendor, "post", BASE, body)).status).toBe(403);
    expect((await get(vendor, BASE)).status).toBe(403);
  });
});

describe("public reels", () => {
  it("lists only public reels and counts views and likes", async () => {
    const admin = await signUpAdmin(app);
    const id = await createReel(admin);
    const draft = await createReel(admin, { visibility: "draft" });

    const list = await request(app).get("/api/reels");
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain(id);
    expect(JSON.stringify(list.body.data)).not.toContain(draft);
    expect((await request(app).get(`/api/reels/${draft}`)).status).toBe(404);

    expect((await request(app).post(`/api/reels/${id}/view`)).status).toBe(200);
    expect((await request(app).post(`/api/reels/${id}/like`).send({ increment: true })).status).toBe(200);
    expect((await Reel.findById(id).lean())!).toMatchObject({ viewsCount: 1, likes: 1 });
    expect((await request(app).post(`/api/reels/${draft}/like`)).status).toBe(404);
    expect((await request(app).post("/api/reels/bad/like")).status).toBe(400);
  });

  it.failing("BUG: one anonymous client cannot inflate a reel's like count without limit", async () => {
    const admin = await signUpAdmin(app);
    const id = await createReel(admin);

    for (let i = 0; i < 3; i++) await request(app).post(`/api/reels/${id}/like`).send({ increment: true });

    expect((await Reel.findById(id).lean())!.likes).toBeLessThanOrEqual(1);
  });

  it("returns 404 for an unknown reel", async () => {
    expect((await request(app).get(`/api/reels/${new Types.ObjectId()}`)).status).toBe(404);
  });
});
