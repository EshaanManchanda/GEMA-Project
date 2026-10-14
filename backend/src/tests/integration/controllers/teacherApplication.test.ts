/** teacher.application + admin.teacher (review path) controllers. */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import Teacher from "../../../models/Teacher";
import User from "../../../models/User";
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

const put = (s: Session, url: string, body: object) =>
  request(app).put(url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);
const get = (s: Session, url: string) => request(app).get(url).set("Cookie", cookie(s));

const application = {
  topics: ["Math"],
  ageRanges: ["6-9"],
  experienceTypes: ["school"],
  yearsOfExperience: 4,
  qualifications: "I hold a BSc in maths. I taught for four years. I coach olympiad teams. I love working with kids.",
  acceptedTerms: true,
};

async function applied() {
  const user = await signUp(app, "customer");
  await put(user, "/api/teachers/application", application);
  const teacher = await Teacher.findOne({ userId: user.userId }).lean();
  return { user, teacherId: String(teacher!._id) };
}

describe("teacher application (self-service)", () => {
  it("submits a pending, inactive application and reads it back", async () => {
    const user = await signUp(app, "customer");

    const res = await put(user, "/api/teachers/application", application);

    expect(res.status).toBe(200);
    const saved = (await Teacher.findOne({ userId: user.userId }).lean())!;
    expect(saved).toMatchObject({ verificationStatus: "pending", isActive: false, subjects: ["Math"] });
    expect((await User.findById(user.userId).lean())!.role).toBe("customer");
    expect((await get(user, "/api/teachers/application")).body.data.application._id).toBe(String(saved._id));
  });

  it.each([
    ["no topics", { topics: [] }],
    ["negative experience", { yearsOfExperience: -1 }],
    ["two-sentence qualifications", { qualifications: "One. Two." }],
    ["terms not accepted", { acceptedTerms: false }],
  ])("returns 400 for %s", async (_label, patch) => {
    const user = await signUp(app, "customer");
    expect((await put(user, "/api/teachers/application", { ...application, ...patch })).status).toBe(400);
    expect(await Teacher.countDocuments()).toBe(0);
  });

  it("forbids roles outside customer/vendor/teacher/admin", async () => {
    const user = await signUp(app, "customer");
    await User.updateOne({ _id: user.userId }, { role: "student" });
    expect((await put(user, "/api/teachers/application", application)).status).toBe(403);
  });
});

describe("admin teacher review", () => {
  it("lists applicants and verifying one promotes the user to teacher", async () => {
    const admin = await signUpAdmin(app);
    const { user, teacherId } = await applied();

    const list = await get(admin, "/api/admin/teachers?verificationStatus=pending");
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain(teacherId);
    expect((await get(admin, `/api/admin/teachers/${teacherId}`)).status).toBe(200);

    const res = await put(admin, `/api/admin/teachers/${teacherId}/status`, { verificationStatus: "verified" });
    expect(res.status).toBe(200);
    expect((await Teacher.findById(teacherId).lean())!).toMatchObject({ verificationStatus: "verified", isActive: true });
    expect((await User.findById(user.userId).lean())!.role).toBe("teacher");
  });

  it("validates status input", async () => {
    const admin = await signUpAdmin(app);
    const { teacherId } = await applied();

    expect((await put(admin, `/api/admin/teachers/${teacherId}/status`, { verificationStatus: "golden" })).status).toBe(400);
    expect((await put(admin, `/api/admin/teachers/${teacherId}/active`, {})).status).toBe(400);
    expect((await put(admin, "/api/admin/teachers/bad/status", { isActive: true })).status).toBe(400);
  });

  it("forbids non-admins from approving themselves", async () => {
    const { user, teacherId } = await applied();

    expect((await put(user, `/api/admin/teachers/${teacherId}/status`, { verificationStatus: "verified" })).status).toBe(403);
    expect((await User.findById(user.userId).lean())!.role).toBe("customer");
  });
});
