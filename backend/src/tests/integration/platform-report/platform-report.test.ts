/**
 * Integration tests — GET /api/insights/platform/highlights-report
 *
 * Follows business-report.test.ts conventions: createTestApp() (never
 * server.ts), in-memory Mongo, mocks declared before importing modules.
 * renderReportPdf is mocked here; the real Puppeteer path is covered by
 * platform-report.pdf.test.ts.
 */

import request from "supertest";
import { Application } from "express";
import User, { UserStatus } from "../../../models/User";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { renderReportPdf } from "../../../utils/pdf.utils";
import cacheService from "../../../services/cache.service";
import * as gsc from "../../../services/searchConsole.service";

jest.mock("../../../services/email.service", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../config/redis", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    quit: jest.fn().mockResolvedValue(undefined),
    status: "end",
  },
  redisPool: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue("OK"),
    isHealthy: jest.fn().mockReturnValue(false),
    getConnection: jest.fn().mockReturnValue(null),
  },
}));

jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../utils/pdf.utils", () => ({ renderReportPdf: jest.fn() }));

jest.mock("../../../services/searchConsole.service", () => ({
  ...jest.requireActual("../../../services/searchConsole.service"),
  isSearchConsoleConfigured: jest.fn(),
  getConfiguredSites: jest.fn(),
  getCachedSummary: jest.fn(),
  getCachedQueries: jest.fn(),
}));

// ---------------------------------------------------------------------------

const URL = "/api/insights/platform/highlights-report";

const uniqueEmail = (label: string) =>
  `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

const extractCookie = (cookies: string[], name: string): string => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  return c ? c.split(";")[0].replace(`${name}=`, "") : "";
};

const cookieHeader = (s: { accessToken: string; csrfToken: string }) =>
  `accessToken=${s.accessToken}; XSRF-TOKEN=${s.csrfToken}`;

async function login(app: Application, email: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookies: string[] = (res.headers["set-cookie"] as unknown as string[]) || [];
  return { accessToken: extractCookie(cookies, "accessToken"), csrfToken: extractCookie(cookies, "XSRF-TOKEN") };
}

async function admin(app: Application) {
  const payload = {
    firstName: "Test",
    lastName: "Admin",
    email: uniqueEmail("admin"),
    password: "Test@1234!",
    adminSecretKey: process.env.ADMIN_SECRET_KEY,
  };
  await request(app).post("/api/auth/register-admin").send(payload);
  return login(app, payload.email, payload.password);
}

async function nonAdmin(app: Application, role: "vendor" | "customer") {
  const payload = { firstName: "T", lastName: "U", email: uniqueEmail(role), password: "Test@1234!", role };
  await request(app).post("/api/auth/register").send(payload);
  await User.findOneAndUpdate({ email: payload.email }, { isEmailVerified: true, status: UserStatus.ACTIVE });
  return login(app, payload.email, payload.password);
}

let app: Application;
let capturedHtml: string | undefined;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

beforeEach(() => {
  // jest.config resets mocks — reinstall implementations per test.
  (renderReportPdf as jest.Mock).mockImplementation(async (html: string) => {
    capturedHtml = html;
    return Buffer.from("%PDF-fake");
  });
  (gsc.isSearchConsoleConfigured as jest.Mock).mockReturnValue(false);
  (gsc.getConfiguredSites as jest.Mock).mockReturnValue([]);
});

afterEach(async () => {
  await clearTestDB();
  capturedHtml = undefined;
});

afterAll(closeTestDB);

// ===========================================================================

describe("GET /api/insights/platform/highlights-report", () => {
  it("returns a PDF attachment for an admin", async () => {
    const s = await admin(app);
    const res = await request(app).get(`${URL}?range=90d`).set("Cookie", cookieHeader(s)).buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    expect(res.headers["content-disposition"]).toMatch(
      /^attachment; filename="kidrove-platform-highlights-90d-\d{4}-\d{2}-\d{2}\.pdf"$/,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-report-omitted-sections"]).toContain("search:not_configured");
    expect(renderReportPdf).toHaveBeenCalledWith(expect.any(String), {
      footerText: "Kidrove Platform Highlights · Last 13 weeks",
      offline: true,
    });
    expect(capturedHtml).toContain("Platform Highlights");
    expect(capturedHtml!.toLowerCase()).not.toContain("revenue");
  });

  it.each(["vendor", "customer"] as const)("rejects a %s with 403", async (role) => {
    const s = await nonAdmin(app, role);
    const res = await request(app).get(`${URL}?range=30d`).set("Cookie", cookieHeader(s));
    expect(res.status).toBe(403);
    expect(renderReportPdf).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get(`${URL}?range=30d`);
    expect(res.status).toBe(401);
  });

  it.each(["7d", "", "1y; drop"])("rejects unsupported range %p with 400", async (range) => {
    const s = await admin(app);
    const res = await request(app).get(`${URL}?range=${encodeURIComponent(range)}`).set("Cookie", cookieHeader(s));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain("range must be 30d, 90d or 1y");
    expect(renderReportPdf).not.toHaveBeenCalled();
  });

  it("serves from cache without re-rendering", async () => {
    const s = await admin(app);
    const realGet = cacheService.get.bind(cacheService);
    const entry = { pdf: Buffer.from("%PDF-cached").toString("base64"), omitted: "ages:empty", day: "2026-10-13" };
    // Only intercept the report key — auth middleware uses the cache too.
    const getSpy = jest
      .spyOn(cacheService, "get")
      .mockImplementation(((key: string, opts?: any) =>
        key.startsWith("report:platform-highlights:") ? Promise.resolve(entry) : realGet(key, opts)) as any);
    const res = await request(app).get(`${URL}?range=30d`).set("Cookie", cookieHeader(s)).buffer(true);
    expect(res.status).toBe(200);
    expect(getSpy).toHaveBeenCalledWith(expect.stringMatching(/^report:platform-highlights:v1:30d:/));
    expect(renderReportPdf).not.toHaveBeenCalled();
    expect(res.headers["x-report-omitted-sections"]).toBe("ages:empty");
    expect(Buffer.from(res.body).toString()).toBe("%PDF-cached");
  });

  it("stores the rendered PDF with a 1h TTL", async () => {
    const s = await admin(app);
    const setSpy = jest.spyOn(cacheService, "set").mockResolvedValue(true as any);
    await request(app).get(`${URL}?range=1y`).set("Cookie", cookieHeader(s));
    expect(setSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^report:platform-highlights:v1:1y:/),
      expect.objectContaining({ pdf: expect.any(String) }),
      { ttl: 3600 },
    );
  });

  it("applies the PDF rate limiter", async () => {
    const s = await admin(app);
    const res = await request(app).get(`${URL}?range=30d`).set("Cookie", cookieHeader(s));
    expect(res.headers["ratelimit-limit"]).toBe("10");
  });

  it("still returns 200 when one section fails, and reports it", async () => {
    (gsc.isSearchConsoleConfigured as jest.Mock).mockReturnValue(true);
    (gsc.getConfiguredSites as jest.Mock).mockReturnValue(["sc-domain:kidrove.com"]);
    (gsc.getCachedSummary as jest.Mock).mockRejectedValue(new Error("quota exceeded"));
    (gsc.getCachedQueries as jest.Mock).mockResolvedValue({ data: [] });
    const s = await admin(app);
    const res = await request(app).get(`${URL}?range=30d`).set("Cookie", cookieHeader(s));
    expect(res.status).toBe(200);
    expect(res.headers["x-report-omitted-sections"]).toContain("search:failed");
    expect(capturedHtml).not.toContain("Found on Google");
  });

  it("does not cache a report with a failed section", async () => {
    (gsc.isSearchConsoleConfigured as jest.Mock).mockReturnValue(true);
    (gsc.getConfiguredSites as jest.Mock).mockReturnValue(["sc-domain:kidrove.com"]);
    (gsc.getCachedSummary as jest.Mock).mockRejectedValue(new Error("timeout"));
    (gsc.getCachedQueries as jest.Mock).mockResolvedValue({ data: [] });
    const setSpy = jest.spyOn(cacheService, "set");
    const s = await admin(app);
    const res = await request(app).get(`${URL}?range=90d`).set("Cookie", cookieHeader(s));
    expect(res.status).toBe(200);
    expect(setSpy).not.toHaveBeenCalledWith(expect.stringMatching(/^report:platform-highlights:/), expect.anything(), expect.anything());
  });

  it("returns an error and caches nothing when rendering fails", async () => {
    (renderReportPdf as jest.Mock).mockRejectedValue(new Error("Navigation timeout"));
    const setSpy = jest.spyOn(cacheService, "set");
    const s = await admin(app);
    const res = await request(app).get(`${URL}?range=30d`).set("Cookie", cookieHeader(s));
    expect(res.status).toBe(500);
    expect(setSpy).not.toHaveBeenCalledWith(expect.stringMatching(/^report:platform-highlights:/), expect.anything(), expect.anything());
  });

  it("shares one render between concurrent cold requests", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    (renderReportPdf as jest.Mock).mockImplementation(async () => {
      await gate;
      return Buffer.from("%PDF-shared");
    });
    const s = await admin(app);
    const reqs = [1, 2, 3].map(() =>
      request(app).get(`${URL}?range=1y`).set("Cookie", cookieHeader(s)).buffer(true).then((r) => r),
    );
    await new Promise((r) => setTimeout(r, 300));
    release();
    const results = await Promise.all(reqs);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(renderReportPdf).toHaveBeenCalledTimes(1);
  });
});
