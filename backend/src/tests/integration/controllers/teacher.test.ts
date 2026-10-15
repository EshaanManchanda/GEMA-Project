/** teacher (profile) + teacher.event (own-event access) controllers. */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Event from "../../../models/Event";
import Teacher from "../../../models/Teacher";
import User from "../../../models/User";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp } from "../setup/session";
import { signUpAs, teacherIdOf, savableEventFields } from "../setup/factories";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

async function teacherWithEvent() {
  const teacher = await signUpAs(app, "teacher");
  const teacherId = await teacherIdOf(teacher);
  const _id = new Types.ObjectId();
  await Event.collection.insertOne({
    _id,
    ...savableEventFields,
    title: "Piano 101",
    slug: `piano-${_id}`,
    type: "Event",
    teacherId: new Types.ObjectId(teacherId),
    status: "published",
    isApproved: true,
  });
  return { teacher, teacherId, eventId: String(_id) };
}

describe("teacher profile", () => {
  it("GET /teachers/profile works (select excludes emailVerification + its select:false child -> Mongo 'Path collision' 500)", async () => {
    const { teacher } = await teacherWithEvent();
    expect((await get(teacher, "/api/teachers/profile")).status).toBe(200);
  });

  it("PUT /teachers/profile saves", async () => {
    const { teacher, teacherId } = await teacherWithEvent();

    const res = await send(teacher, "put", "/api/teachers/profile", { firstName: "Maya", bio: "Pianist", subjects: ["Music"] });

    expect(res.status).toBe(200);
    expect((await User.findById(teacher.userId).lean())!.firstName).toBe("Maya");
    expect((await Teacher.findById(teacherId).lean())!).toMatchObject({ bio: "Pianist", subjects: ["Music"] });
  });

  it("returns 400 for a malformed dateOfBirth", async () => {
    const { teacher } = await teacherWithEvent();
    expect((await send(teacher, "put", "/api/teachers/profile", { dateOfBirth: "someday" })).status).toBe(400);
  });

  it("forbids non-teachers", async () => {
    const customer = await signUp(app, "customer");
    expect((await get(customer, "/api/teachers/profile")).status).toBe(403);
    expect((await get(customer, "/api/teachers/stats")).status).toBe(403);
  });
});

describe("teacher events", () => {
  it("reads and soft-deletes the teacher's own event", async () => {
    const { teacher, eventId } = await teacherWithEvent();

    const res = await get(teacher, `/api/teachers/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.teachingEvent.title).toBe("Piano 101");

    expect((await send(teacher, "delete", `/api/teachers/events/${eventId}`)).status).toBe(200);
    expect((await Event.findById(eventId).lean())!).toMatchObject({ isDeleted: true, status: "archived" });
    expect((await get(teacher, `/api/teachers/events/${eventId}`)).status).toBe(404);
  });

  it("hides another teacher's event (404) and leaves it untouched", async () => {
    const { eventId } = await teacherWithEvent();
    const other = await signUpAs(app, "teacher");
    await teacherIdOf(other);

    expect((await get(other, `/api/teachers/events/${eventId}`)).status).toBe(404);
    expect((await send(other, "delete", `/api/teachers/events/${eventId}`)).status).toBe(404);
    expect((await Event.findById(eventId).lean())!.isDeleted).toBe(false);
  });

  it("a malformed event id returns 400/404, not 500", async () => {
    const { teacher } = await teacherWithEvent();
    expect([400, 404]).toContain((await get(teacher, "/api/teachers/events/not-an-id")).status);
  });
});
