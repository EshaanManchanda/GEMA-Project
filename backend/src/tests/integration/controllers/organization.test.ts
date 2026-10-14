/** organization + admin.organization controllers. */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import OrganizationOnboarding from "../../../models/OrganizationOnboarding";
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

const application = { organizationName: "Bright Minds", anticipatedTeachersNextMonth: 5 };
const agreement = {
  legalName: "Bright Minds LLC",
  legalEntityType: "LLC",
  incorporationLocation: "Dubai",
  backgroundChecksRequired: true,
  authorizedSignerName: "Sara",
  authorizedSignerTitle: "CEO",
  acceptedTerms: true,
};

async function submitted() {
  const org = await signUp(app, "customer");
  await put(org, "/api/organizations/application", { application });
  await put(org, "/api/organizations/agreement", { agreement });
  const doc = await OrganizationOnboarding.findOne({ user: org.userId }).lean();
  return { org, id: String(doc!._id) };
}

describe("organization onboarding (self-service)", () => {
  it("saves the application, signs the agreement and reads it back", async () => {
    const org = await signUp(app, "customer");
    expect((await get(org, "/api/organizations/onboarding")).body.data.onboarding).toBeNull();

    expect((await put(org, "/api/organizations/application", { application })).status).toBe(200);
    expect((await put(org, "/api/organizations/agreement", { agreement })).status).toBe(200);

    const res = await get(org, "/api/organizations/onboarding");
    expect(res.body.data.onboarding).toMatchObject({ reviewStatus: "pending", application: { organizationName: "Bright Minds" } });
    expect(res.body.data.onboarding.agreement.acceptedTerms).toBe(true);
  });

  it("refuses to sign before the application is submitted", async () => {
    const org = await signUp(app, "customer");
    expect((await put(org, "/api/organizations/agreement", { agreement })).status).toBe(400);
  });

  it("returns 400 for missing organization name, bad teacher count, or unaccepted terms", async () => {
    const org = await signUp(app, "customer");

    expect((await put(org, "/api/organizations/application", { application: { anticipatedTeachersNextMonth: 2 } })).status).toBe(400);
    expect((await put(org, "/api/organizations/application", { application: { ...application, anticipatedTeachersNextMonth: 0 } })).status).toBe(400);
    expect(await OrganizationOnboarding.countDocuments()).toBe(0);

    await put(org, "/api/organizations/application", { application });
    expect((await put(org, "/api/organizations/agreement", { agreement: { ...agreement, acceptedTerms: false } })).status).toBe(400);
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/api/organizations/onboarding")).status).toBe(401);
  });
});

describe("admin organization review", () => {
  it("lists, reports stats and approves a signed application", async () => {
    const admin = await signUpAdmin(app);
    const { id } = await submitted();

    const list = await get(admin, "/api/admin/organizations?status=pending");
    expect(list.status).toBe(200);
    expect(list.body.data.organizations).toHaveLength(1);
    expect((await get(admin, "/api/admin/organizations/stats")).body.data).toMatchObject({ total: 1, pending: 1, signedAgreements: 1 });

    expect((await put(admin, `/api/admin/organizations/${id}/review`, { status: "approved", notes: "ok" })).status).toBe(200);
    expect((await OrganizationOnboarding.findById(id).lean())!.reviewStatus).toBe("approved");
  });

  it("validates review input", async () => {
    const admin = await signUpAdmin(app);
    const { id } = await submitted();

    expect((await put(admin, `/api/admin/organizations/${id}/review`, { status: "maybe" })).status).toBe(400);
    expect((await put(admin, "/api/admin/organizations/bad/review", { status: "approved" })).status).toBe(400);
    expect((await put(admin, `/api/admin/organizations/${new Types.ObjectId()}/review`, { status: "approved" })).status).toBe(404);
  });

  it("forbids non-admins", async () => {
    const { org, id } = await submitted();
    expect((await get(org, "/api/admin/organizations")).status).toBe(403);
    expect((await put(org, `/api/admin/organizations/${id}/review`, { status: "approved" })).status).toBe(403);
    expect((await OrganizationOnboarding.findById(id).lean())!.reviewStatus).toBe("pending");
  });
});
