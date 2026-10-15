import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, vendorIdOf, insertEvent } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "delete", url: string) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function setup() {
  const vendor = await signUp(app, "vendor");
  const eventId = await insertEvent(await vendorIdOf(vendor), { isDeleted: false });
  const me = await signUp(app, "customer");
  return { eventId, me };
}
const favoritesOf = async (userId: string) => ((await User.findById(userId).lean())!.favoriteEvents || []).map(String);

it("adds, checks, lists and removes a favorite", async () => {
  const { eventId, me } = await setup();

  expect((await send(me, "post", `/api/favorites/${eventId}`)).status).toBe(200);
  expect(await favoritesOf(me.userId)).toEqual([eventId]);
  expect((await get(me, `/api/favorites/check/${eventId}`)).body.data.isFavorite).toBe(true);

  const list = await get(me, "/api/favorites");
  expect(list.status).toBe(200);
  expect(list.body.data.favorites.map((e: { _id: string }) => e._id)).toEqual([eventId]);

  expect((await send(me, "delete", `/api/favorites/${eventId}`)).status).toBe(200);
  expect(await favoritesOf(me.userId)).toEqual([]);
  expect((await get(me, `/api/favorites/check/${eventId}`)).body.data.isFavorite).toBe(false);
});

it("rejects adding the same event twice and removing a non-favorite", async () => {
  const { eventId, me } = await setup();
  await send(me, "post", `/api/favorites/${eventId}`);

  expect((await send(me, "post", `/api/favorites/${eventId}`)).status).toBe(400);
  expect(await favoritesOf(me.userId)).toHaveLength(1);
  expect((await send(me, "delete", `/api/favorites/${new Types.ObjectId()}`)).status).toBe(400);
});

it("returns 404 for an unknown event", async () => {
  const { me } = await setup();
  expect((await send(me, "post", `/api/favorites/${new Types.ObjectId()}`)).status).toBe(404);
});

it("requires authentication", async () => {
  expect((await request(app).get("/api/favorites")).status).toBe(401);
});

it("keeps favorites per user", async () => {
  const { eventId, me } = await setup();
  const other = await signUp(app, "customer");
  await send(me, "post", `/api/favorites/${eventId}`);

  expect((await get(other, "/api/favorites")).body.data.favorites).toEqual([]);
});

it("malformed eventId on add returns 400, not 500", async () => {
  const { me } = await setup();
  expect((await send(me, "post", "/api/favorites/not-an-id")).status).toBe(400);
});
