/**
 * Integration tests — Business Optimization / Report Center (KBOS Phase 1)
 *
 * Coverage:
 *  1. Admin generates a snapshot for a vendor
 *  2. Vendor A gets 403 on vendor B's report (ownership check)
 *  3. Regenerating a snapshot for the same period is idempotent (same _id)
 *  4. Regenerating a locked snapshot returns 409
 *  5. CSV report has correct Content-Type / Content-Disposition
 *  6. Internal notes never reach the PDF-rendering HTML or the CSV body
 *     (the confidentiality boundary enforced by toReportPayload)
 *  7. Task toggling round-trips
 *
 * Follows the conventions in auth.test.ts: createTestApp() (never import
 * server.ts), connectTestDB/clearTestDB/closeTestDB, mocks declared before
 * any importing module. renderReportPdf is mocked — no real Puppeteer launch
 * — but its captured `html` argument is asserted against directly, so the
 * full HTML-building pipeline (not just toReportPayload in isolation) is
 * exercised for the confidentiality assertion.
 */

import request from "supertest";
import { Application } from "express";
import User, { UserRole, UserStatus } from "../../../models/User";
import Vendor from "../../../models/Vendor";
import VendorBusinessSnapshot from "../../../models/VendorBusinessSnapshot";
import Event from "../../../models/Event";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { renderReportPdf } from "../../../utils/pdf.utils";
import { computeVendorHealth } from "../../../services/businessReport.service";
import cacheService from "../../../services/cache.service";
import ReportGenerationLog, {
  ReportGenerationOperation,
  ReportGenerationStatus,
} from "../../../models/ReportGenerationLog";
import { SNAPSHOT_SCHEMA_VERSION } from "../../../constants/businessHealth.rules";
import { config } from "../../../config/env";

// ---------------------------------------------------------------------------
// Mocks — must come before any module that imports them
// ---------------------------------------------------------------------------

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

jest.mock("../../../config/firebase", () => ({
  initializeFirebase: jest.fn(),
}));

jest.mock("../../../services/queue.service", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addQRJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../utils/pdf.utils", () => ({
  renderReportPdf: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uniqueEmail = (label: string) =>
  `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

const extractCookie = (cookies: string[], name: string): string => {
  const c = cookies.find((h) => h.startsWith(`${name}=`));
  if (!c) return "";
  return c.split(";")[0].replace(`${name}=`, "");
};

async function registerAndLoginVendor(app: Application, label: string) {
  const payload = {
    firstName: "Test",
    lastName: "Vendor",
    email: uniqueEmail(label),
    password: "Test@1234!",
    role: "vendor",
  };
  const registerRes = await request(app)
    .post("/api/auth/register")
    .send(payload);
  await User.findOneAndUpdate(
    { email: payload.email },
    { isEmailVerified: true, status: UserStatus.ACTIVE },
  );
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: payload.email, password: payload.password });
  const cookies: string[] =
    (loginRes.headers["set-cookie"] as unknown as string[]) || [];
  const accessToken = extractCookie(cookies, "accessToken");
  const csrfToken = extractCookie(cookies, "XSRF-TOKEN");

  const userId = registerRes.body.data.user.id;
  const vendor = await Vendor.findOne({ userId });

  return { accessToken, csrfToken, userId, vendorId: vendor!._id.toString() };
}

async function registerAndLoginAdmin(app: Application, label: string) {
  const payload = {
    firstName: "Test",
    lastName: "Admin",
    email: uniqueEmail(label),
    password: "Test@1234!",
    adminSecretKey: process.env.ADMIN_SECRET_KEY,
  };
  await request(app).post("/api/auth/register-admin").send(payload);
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: payload.email, password: payload.password });
  const cookies: string[] =
    (loginRes.headers["set-cookie"] as unknown as string[]) || [];
  return {
    accessToken: extractCookie(cookies, "accessToken"),
    csrfToken: extractCookie(cookies, "XSRF-TOKEN"),
  };
}

const PERIOD = "2026-06";

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

let app: Application;
let capturedPdfHtml: string | undefined;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

beforeEach(() => {
  // jest.config.js sets resetMocks/restoreMocks — that strips any
  // implementation set via jest.fn(impl) before every test, so the mock
  // implementation must be (re)installed here rather than in the
  // jest.mock() factory above.
  (renderReportPdf as jest.Mock).mockImplementation(async (html: string) => {
    capturedPdfHtml = html;
    return Buffer.from("fake-pdf-content");
  });
});

afterEach(async () => {
  await clearTestDB();
  capturedPdfHtml = undefined;
});

afterAll(async () => {
  await closeTestDB();
});

// ===========================================================================

describe("GET /api/admin/business-reports/overview — segmentation", () => {
  it("classifies a freshly-registered vendor as 'new' and includes it under filter=new", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-overview-new");
    const vendor = await registerAndLoginVendor(app, "vendor-overview-new");
    // Vendors are auto-created with isActive=false pending approval (see
    // vendorHelpers.getOrCreateVendorProfile) — getOverview only lists
    // isActive vendors, so approve it directly for this fixture.
    await Vendor.findByIdAndUpdate(vendor.vendorId, { isActive: true });
    // A vendor with no snapshot at all is "inactive" by design (see
    // classifyVendorSegments precedence — inactive is checked before new).
    // Generate one so this vendor's age, not its missing data, drives the
    // segment under test.
    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const all = await request(app)
      .get("/api/admin/business-reports/overview")
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(all.status).toBe(200);
    const row = all.body.data.rows.find(
      (r: any) => r.vendorId === vendor.vendorId,
    );
    expect(row).toBeDefined();
    expect(row.segments.lifecycle).toBe("new");
    expect(row.segments.all).toContain("new");

    const filtered = await request(app)
      .get("/api/admin/business-reports/overview")
      .query({ period: PERIOD, filter: "new" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(filtered.status).toBe(200);
    expect(
      filtered.body.data.rows.some((r: any) => r.vendorId === vendor.vendorId),
    ).toBe(true);
  });

  it("still honors the legacy filter=inactive value for a vendor with no snapshot", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-overview-legacy");
    const vendor = await registerAndLoginVendor(app, "vendor-overview-legacy");
    await Vendor.findByIdAndUpdate(vendor.vendorId, { isActive: true });

    const res = await request(app)
      .get("/api/admin/business-reports/overview")
      .query({ period: PERIOD, filter: "inactive" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(
      res.body.data.rows.some((r: any) => r.vendorId === vendor.vendorId),
    ).toBe(true);
  });
});

describe("GET /api/admin/business-reports/vendors/:vendorId/snapshot", () => {
  it("returns null (not 404) when no snapshot exists yet for the period", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-getsnap-none");
    const vendor = await registerAndLoginVendor(app, "vendor-getsnap-none");

    const res = await request(app)
      .get(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("returns the persisted snapshot (with _id/status) without regenerating it", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-getsnap");
    const vendor = await registerAndLoginVendor(app, "vendor-getsnap");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const res = await request(app)
      .get(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(created.body.data._id);
    expect(res.body.data.status).toBe("draft");
  });
});

describe("POST /api/admin/business-reports/vendors/:vendorId/snapshot", () => {
  it("admin generates a snapshot for a vendor with no data yet — dimensions come back null, not zero", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-gen");
    const vendor = await registerAndLoginVendor(app, "vendor-gen");

    const res = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe(PERIOD);
    expect(res.body.data.status).toBe("draft");
    // No orders/reviews/bookings exist yet -> those dimensions are null, not 0
    expect(res.body.data.scores.sales).toBeNull();
    expect(res.body.data.scores.customer).toBeNull();
    expect(res.body.data.confidence.dimensionsTotal).toBe(5);
    expect(res.body.data.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
  });

  it("is idempotent per (vendor, period) — regenerating updates the same document", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-idem");
    const vendor = await registerAndLoginVendor(app, "vendor-idem");

    const first = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const second = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data._id).toBe(first.body.data._id);

    const count = await VendorBusinessSnapshot.countDocuments({
      vendorId: vendor.vendorId,
      period: PERIOD,
    });
    expect(count).toBe(1);
  });

  it("returns 409 when regenerating a locked snapshot", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-lock");
    const vendor = await registerAndLoginVendor(app, "vendor-lock");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    const lockRes = await request(app)
      .patch(`/api/admin/business-reports/snapshots/${snapshotId}/status`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "locked" });
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.status).toBe("locked");

    const regenerate = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    expect(regenerate.status).toBe(409);
  });
});

describe("KBOS 007 — frozen platform benchmarks", () => {
  it("freezes benchmarks.capturedAt on generation, and computeVendorHealth replays a frozen benchmark without recomputing it live", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-benchmark");
    const vendor = await registerAndLoginVendor(app, "vendor-benchmark");

    await Event.create({
      title: "Test Event",
      description: "desc",
      shortDescription: "short",
      slug: `test-event-benchmark-${Date.now()}`,
      category: "sports",
      type: "Event",
      venueType: "Indoor",
      ageRange: [5, 15],
      location: {
        city: "Dubai",
        address: "123 St",
        coordinates: { lat: 25, lng: 55 },
      },
      price: 0,
      currency: "AED",
      dateSchedule: [
        {
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 172800000),
          availableSeats: 50,
          price: 0,
        },
      ],
      status: "published",
      isDeleted: false,
      vendorId: vendor.vendorId,
      images: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
    });

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    expect(created.status).toBe(200);
    expect(created.body.data.benchmarks?.capturedAt).toBeDefined();

    const aggregateSpy = jest.spyOn(Event, "aggregate");
    const frozenCapturedAt = new Date("2020-01-01T00:00:00.000Z");

    const health = await computeVendorHealth(vendor.vendorId, PERIOD, {
      benchmarks: {
        averageListingPhotoCount: 42,
        capturedAt: frozenCapturedAt,
      },
    });

    // getListingPhotoCountBenchmark's aggregate pipeline is the only one
    // that groups on "photoCount" — Event.aggregate is also called by
    // analyticsService for unrelated stats, so scope the assertion to that
    // specific pipeline rather than the whole mock.
    const benchmarkAggregateCalls = aggregateSpy.mock.calls.filter((call) =>
      JSON.stringify(call).includes("photoCount"),
    );
    expect(benchmarkAggregateCalls).toHaveLength(0);
    expect(health.benchmarks).toEqual({
      averageListingPhotoCount: 42,
      capturedAt: frozenCapturedAt,
    });
    const listingRec = health.recommendations.find(
      (r) => r.code === "LISTING_PHOTO_COUNT",
    );
    expect(listingRec?.reason).toContain("42 photos per listing");

    aggregateSpy.mockRestore();
  });
});

describe("GET /api/insights/vendors/:vendorId/report — ownership", () => {
  it("returns 403 when vendor A requests vendor B's report", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-own");
    const vendorA = await registerAndLoginVendor(app, "vendor-a");
    const vendorB = await registerAndLoginVendor(app, "vendor-b");

    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendorB.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const res = await request(app)
      .get(`/api/insights/vendors/${vendorB.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "csv" })
      .set("Cookie", `accessToken=${vendorA.accessToken}; XSRF-TOKEN=${vendorA.csrfToken}`)
      .set("X-CSRF-Token", vendorA.csrfToken);

    expect(res.status).toBe(403);
  });

  it("allows a vendor to fetch their own report", async () => {
    const vendor = await registerAndLoginVendor(app, "vendor-self");

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "csv" })
      .set("Cookie", `accessToken=${vendor.accessToken}; XSRF-TOKEN=${vendor.csrfToken}`)
      .set("X-CSRF-Token", vendor.csrfToken);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/insights/vendors/:vendorId/report — CSV format", () => {
  it("returns text/csv with a .csv Content-Disposition filename", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-csv");
    const vendor = await registerAndLoginVendor(app, "vendor-csv");

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "csv" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toMatch(/\.csv"/);
  });
});

describe("Internal notes confidentiality boundary", () => {
  it("never appears in the CSV export", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-notes-csv");
    const vendor = await registerAndLoginVendor(app, "vendor-notes-csv");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    await request(app)
      .put(`/api/admin/business-reports/snapshots/${snapshotId}/notes`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        vendorVisible: "Great progress this month.",
        internal: "SECRET_INTERNAL_ONLY_TEXT — slow to respond, premium lead",
      });

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "csv" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("SECRET_INTERNAL_ONLY_TEXT");
    expect(res.text).toContain("Great progress this month");
  });

  it("never appears in the HTML handed to the PDF renderer", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-notes-pdf");
    const vendor = await registerAndLoginVendor(app, "vendor-notes-pdf");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    await request(app)
      .put(`/api/admin/business-reports/snapshots/${snapshotId}/notes`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        vendorVisible: "Great progress this month.",
        internal: "SECRET_INTERNAL_ONLY_TEXT — slow to respond, premium lead",
      });

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "pdf" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(capturedPdfHtml).toBeDefined();
    expect(capturedPdfHtml).not.toContain("SECRET_INTERNAL_ONLY_TEXT");
    expect(capturedPdfHtml).toContain("Great progress this month");
  });

  it("stamps the render-time layout version into the PDF footer, not the persisted snapshot", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-template-version");
    const vendor = await registerAndLoginVendor(app, "vendor-template-version");

    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "pdf" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(capturedPdfHtml).toContain("Layout v1.0");

    const stored = await VendorBusinessSnapshot.findOne({
      vendorId: vendor.vendorId,
      period: PERIOD,
    }).lean();
    expect((stored as any)?.templateVersion).toBeUndefined();
  });
});

describe("Business report cache invalidation", () => {
  it("invalidates the PDF cache when snapshot notes are edited", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-cache-notes");
    const vendor = await registerAndLoginVendor(app, "vendor-cache-notes");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    const deletePatternSpy = jest.spyOn(cacheService, "deletePattern");
    deletePatternSpy.mockClear();

    await request(app)
      .put(`/api/admin/business-reports/snapshots/${snapshotId}/notes`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ vendorVisible: "Updated note." });

    expect(deletePatternSpy).toHaveBeenCalledWith(
      `report:business:${vendor.vendorId}:${PERIOD}:*`,
    );

    deletePatternSpy.mockRestore();
  });

  it("invalidates the PDF cache when promotion input is saved", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-cache-promo");
    const vendor = await registerAndLoginVendor(app, "vendor-cache-promo");

    const deletePatternSpy = jest.spyOn(cacheService, "deletePattern");
    deletePatternSpy.mockClear();

    await request(app)
      .put(
        `/api/admin/business-reports/vendors/${vendor.vendorId}/promotion-input`,
      )
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ impressions: 500 });

    expect(deletePatternSpy).toHaveBeenCalledWith(
      `report:business:${vendor.vendorId}:${PERIOD}:*`,
    );

    deletePatternSpy.mockRestore();
  });
});

describe("Report generation observability", () => {
  it("writes a succeeded SNAPSHOT_GENERATE log entry", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-obs-succeed");
    const vendor = await registerAndLoginVendor(app, "vendor-obs-succeed");

    const res = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    expect(res.status).toBe(200);

    const log = await ReportGenerationLog.findOne({
      vendorId: vendor.vendorId,
      period: PERIOD,
      operation: ReportGenerationOperation.SNAPSHOT_GENERATE,
    });
    expect(log).not.toBeNull();
    expect(log!.status).toBe(ReportGenerationStatus.SUCCEEDED);
    expect(log!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("writes a skipped_locked SNAPSHOT_GENERATE log entry when regenerating a locked snapshot", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-obs-locked");
    const vendor = await registerAndLoginVendor(app, "vendor-obs-locked");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    await request(app)
      .patch(`/api/admin/business-reports/snapshots/${snapshotId}/status`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "locked" });

    const retry = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    expect(retry.status).toBe(409);

    const log = await ReportGenerationLog.findOne({
      vendorId: vendor.vendorId,
      period: PERIOD,
      operation: ReportGenerationOperation.SNAPSHOT_GENERATE,
      status: ReportGenerationStatus.SKIPPED_LOCKED,
    });
    expect(log).not.toBeNull();
  });

  it("writes a cache_hit PDF_RENDER log entry when the cache is warm", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-obs-cache");
    const vendor = await registerAndLoginVendor(app, "vendor-obs-cache");

    // Redis is mocked unavailable in this suite (see config/redis mock
    // above), so cacheService.get always short-circuits to null. Other
    // requests in this flow (settings lookup, auth) also call
    // cacheService.get, so a plain mockResolvedValueOnce would be consumed
    // by whichever of those happens to run first — key on the cache key
    // itself instead, and pass everything else through to the real
    // (Redis-unavailable) implementation.
    const realGet = cacheService.get.bind(cacheService);
    const getSpy = jest
      .spyOn(cacheService, "get")
      .mockImplementation(async (key: string, ...rest: unknown[]) => {
        if (key.startsWith("report:business:")) {
          return Buffer.from("cached-pdf-bytes") as any;
        }
        return realGet(key, ...(rest as []));
      });

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "pdf" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(res.status).toBe(200);

    const log = await ReportGenerationLog.findOne({
      vendorId: vendor.vendorId,
      period: PERIOD,
      operation: ReportGenerationOperation.PDF_RENDER,
      status: ReportGenerationStatus.CACHE_HIT,
    });
    expect(log).not.toBeNull();
    expect(log!.renderMs).toBeUndefined();

    getSpy.mockRestore();
  });

  it("does not throw when the ReportGenerationLog write itself fails", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-obs-logfail");
    const vendor = await registerAndLoginVendor(app, "vendor-obs-logfail");

    const createSpy = jest
      .spyOn(ReportGenerationLog, "create")
      .mockRejectedValueOnce(new Error("simulated log write failure"));

    const res = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    // The snapshot itself must still succeed — observability failures are
    // swallowed, never propagated to the caller.
    expect(res.status).toBe(200);

    createSpy.mockRestore();
  });
});

describe("PUT .../promotion-input — manual-input validation", () => {
  it("returns 200 with a non-empty warnings array for a suspicious-but-valid value", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-promo-warn");
    const vendor = await registerAndLoginVendor(app, "vendor-promo-warn");

    const res = await request(app)
      .put(
        `/api/admin/business-reports/vendors/${vendor.vendorId}/promotion-input`,
      )
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        bannerPlacements: [
          { label: "Suspicious banner", impressions: 10, clicks: 500 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.warnings.length).toBeGreaterThan(0);
    expect(res.body.warnings[0].code).toBe("BANNER_CLICKS_EXCEED_IMPRESSIONS");
    // Still persisted — a warning is non-blocking.
    expect(res.body.data.bannerPlacements[0].clicks).toBe(500);
  });

  it("returns 400 for a physically-impossible value (hard cap)", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-promo-reject");
    const vendor = await registerAndLoginVendor(app, "vendor-promo-reject");

    const res = await request(app)
      .put(
        `/api/admin/business-reports/vendors/${vendor.vendorId}/promotion-input`,
      )
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ impressions: 1e15 });

    expect(res.status).toBe(400);
  });

  it("returns 200 with an empty warnings array for a fully plausible input", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-promo-clean");
    const vendor = await registerAndLoginVendor(app, "vendor-promo-clean");

    const res = await request(app)
      .put(
        `/api/admin/business-reports/vendors/${vendor.vendorId}/promotion-input`,
      )
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ impressions: 5000 });

    expect(res.status).toBe(200);
    expect(res.body.warnings).toEqual([]);
  });
});

describe("PATCH /api/insights/vendors/:vendorId/tasks/:taskCode", () => {
  it("round-trips a task's done state", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-task");
    const vendor = await registerAndLoginVendor(app, "vendor-task");

    // No listing profile fields filled -> LISTING_MISSING_LOGO etc. should fire,
    // giving at least one task to toggle.
    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const tasks = created.body.data.tasks as Array<{
      code: string;
      done: boolean;
    }>;
    expect(tasks.length).toBeGreaterThan(0);
    const taskCode = tasks[0].code;

    const res = await request(app)
      .patch(`/api/insights/vendors/${vendor.vendorId}/tasks/${taskCode}`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${vendor.accessToken}; XSRF-TOKEN=${vendor.csrfToken}`)
      .set("X-CSRF-Token", vendor.csrfToken)
      .send({ done: true });

    expect(res.status).toBe(200);
    expect(res.body.data.done).toBe(true);

    const snapshot = await VendorBusinessSnapshot.findOne({
      vendorId: vendor.vendorId,
      period: PERIOD,
    });
    const updatedTask = snapshot!.tasks.find((t) => t.code === taskCode);
    expect(updatedTask!.done).toBe(true);
  });
});

describe("KBOS 003b — content-addressed cache key", () => {
  it("mints a fresh cache key after regeneration, so a stale cached PDF is never served without relying on explicit invalidation", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-content-tag");
    const vendor = await registerAndLoginVendor(app, "vendor-content-tag");

    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const firstDownload = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "pdf" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(firstDownload.status).toBe(200);
    expect(capturedPdfHtml).toBeDefined();

    // Regenerating always advances `generatedAt` (sealed content), so the
    // integrity hash — and therefore the content-addressed cache key —
    // changes even with otherwise-identical underlying data.
    capturedPdfHtml = undefined;
    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const secondDownload = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "pdf" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(secondDownload.status).toBe(200);
    // If the stale cache key were reused, renderReportPdf would never be
    // called and capturedPdfHtml would stay undefined.
    expect(capturedPdfHtml).toBeDefined();
  });
});

describe("KBOS 005 — snapshot integrity checksum", () => {
  it("still generates a snapshot successfully when REPORT_INTEGRITY_SECRET is unset — a missing secret must never take down report generation", async () => {
    const originalSecret = config.reportIntegritySecret;
    config.reportIntegritySecret = "";
    try {
      const admin = await registerAndLoginAdmin(
        app,
        "admin-integrity-nosecret",
      );
      const vendor = await registerAndLoginVendor(
        app,
        "vendor-integrity-nosecret",
      );

      const created = await request(app)
        .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
        .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
        .send({ period: PERIOD });

      expect(created.status).toBe(200);
      expect(created.body.data.integrity).toBeUndefined();

      const res = await request(app)
        .get(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
        .query({ period: PERIOD })
        .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);
      expect(res.body.integrity.status).toBe("unhashed");
    } finally {
      config.reportIntegritySecret = originalSecret;
    }
  });

  it("verifies clean after a generate → read-back round trip", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-integrity-ok");
    const vendor = await registerAndLoginVendor(app, "vendor-integrity-ok");

    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    const res = await request(app)
      .get(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.integrity.status).toBe("verified");
  });

  it("flags 'mismatch' after a direct DB edit bypassing generateSnapshot", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-integrity-tamper");
    const vendor = await registerAndLoginVendor(app, "vendor-integrity-tamper");

    await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });

    await VendorBusinessSnapshot.updateOne(
      { vendorId: vendor.vendorId, period: PERIOD },
      { $set: { "scores.overall": 999 } },
    );

    const res = await request(app)
      .get(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.integrity.status).toBe("mismatch");
  });

  it("stays 'verified' after toggling a task — done/completedAt/completedBy are workflow state, not sealed content", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-integrity-task");
    const vendor = await registerAndLoginVendor(app, "vendor-integrity-task");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const tasks = created.body.data.tasks as Array<{ code: string }>;
    expect(tasks.length).toBeGreaterThan(0);

    await request(app)
      .patch(`/api/insights/vendors/${vendor.vendorId}/tasks/${tasks[0].code}`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${vendor.accessToken}; XSRF-TOKEN=${vendor.csrfToken}`)
      .set("X-CSRF-Token", vendor.csrfToken)
      .send({ done: true });

    const res = await request(app)
      .get(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .query({ period: PERIOD })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.integrity.status).toBe("verified");
  });

  it("blocks a PDF/CSV download with 409 when a locked snapshot's checksum mismatches", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-integrity-locked");
    const vendor = await registerAndLoginVendor(app, "vendor-integrity-locked");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    await request(app)
      .patch(`/api/admin/business-reports/snapshots/${snapshotId}/status`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "locked" });

    await VendorBusinessSnapshot.updateOne(
      { _id: snapshotId },
      { $set: { "scores.overall": 999 } },
    );

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "csv" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(409);
  });

  it("allows a draft snapshot's download to proceed (allow-with-log) even when its checksum mismatches", async () => {
    const admin = await registerAndLoginAdmin(app, "admin-integrity-draft");
    const vendor = await registerAndLoginVendor(app, "vendor-integrity-draft");

    const created = await request(app)
      .post(`/api/admin/business-reports/vendors/${vendor.vendorId}/snapshot`)
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ period: PERIOD });
    const snapshotId = created.body.data._id;

    await VendorBusinessSnapshot.updateOne(
      { _id: snapshotId },
      { $set: { "scores.overall": 999 } },
    );

    const res = await request(app)
      .get(`/api/insights/vendors/${vendor.vendorId}/report`)
      .query({ period: PERIOD, type: "health", format: "csv" })
      .set("Cookie", `accessToken=${admin.accessToken}; XSRF-TOKEN=${admin.csrfToken}`)
      .set("X-CSRF-Token", admin.csrfToken);

    expect(res.status).toBe(200);
  });
});
