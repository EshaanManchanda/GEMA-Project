/** public.settings + admin.app-settings controllers. */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import SystemSettings from "../../../models/SystemSettings";
import SocialSettings from "../../../models/SocialSettings";
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

const put = (s: Session, body: object) =>
  request(app).put("/api/admin/app-settings").set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);

describe("public settings", () => {
  it("serves UI and social settings with defaults", async () => {
    const ui = await request(app).get("/api/public/settings/ui");
    expect(ui.status).toBe(200);
    expect(typeof ui.body.data.animationsEnabled).toBe("boolean");

    const social = await request(app).get("/api/public/settings/social");
    expect(social.status).toBe(200);
    expect(social.body.data).toHaveProperty("facebookUrl");
  });
});

describe("admin app settings", () => {
  it("reads all four settings groups", async () => {
    const admin = await signUpAdmin(app);
    const res = await request(app).get("/api/admin/app-settings").set("Cookie", cookie(admin));

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(["emailSettings", "paymentSettings", "socialSettings", "systemSettings"]);
  });

  it("updates system and social settings and the public endpoints reflect it", async () => {
    const admin = await signUpAdmin(app);

    const res = await put(admin, {
      systemSettings: { animationsEnabled: false },
      socialSettings: { facebookUrl: "https://facebook.com/kidrove" },
    });

    expect(res.status).toBe(200);
    expect((await SystemSettings.findOne().lean())!.animationsEnabled).toBe(false);
    expect((await SocialSettings.findOne().lean())!.facebookUrl).toBe("https://facebook.com/kidrove");
    expect((await request(app).get("/api/public/settings/ui")).body.data.animationsEnabled).toBe(false);
  });

  it("returns 400 for unknown keys and non-boolean flags", async () => {
    const admin = await signUpAdmin(app);

    expect((await put(admin, { hackerSettings: {} })).status).toBe(400);
    expect((await put(admin, { systemSettings: { maintenanceMode: "maybe" } })).status).toBe(400);
    expect((await put(admin, { systemSettings: { maxImagesPerEvent: 0 } })).status).toBe(400);
  });

  it.failing("BUG: a mistyped email setting returns 400, not 500", async () => {
    const admin = await signUpAdmin(app);
    expect((await put(admin, { emailSettings: { smtpPort: "not-a-port" } })).status).toBe(400);
  });

  it("forbids non-admins", async () => {
    const vendor = await signUp(app, "vendor");

    expect((await request(app).get("/api/admin/app-settings").set("Cookie", cookie(vendor))).status).toBe(403);
    expect((await put(vendor, { systemSettings: { animationsEnabled: false } })).status).toBe(403);
  });
});
