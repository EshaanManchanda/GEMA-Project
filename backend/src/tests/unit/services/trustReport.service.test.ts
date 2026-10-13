/**
 * Platform Highlights aggregation — pure helpers + DB aggregation against
 * mongodb-memory-server. Fixtures are inserted via the raw collection so
 * model validation/hooks don't get in the way of crafting edge cases.
 */
import { connectTestDB, clearTestDB, closeTestDB } from "../../integration/setup/testDB";
import User from "../../../models/User";
import Student from "../../../models/Student";
import Event from "../../../models/Event";
import PageView from "../../../models/PageView";
import * as gsc from "../../../services/searchConsole.service";
import {
  buildTrustReport,
  resolveReportPeriod,
  bucketKeys,
  positiveGrowthPct,
  toPercentages,
  suppressAgeBins,
  KID_BINS,
  rankLocations,
  normalizeLocation,
  dedupeSites,
  isSafeQuery,
  weightedPosition,
  buildKpis,
  isHighlightsRange,
  scopeLabel,
} from "../../../services/trustReport.service";

jest.mock("../../../services/searchConsole.service", () => ({
  isSearchConsoleConfigured: jest.fn(),
  getConfiguredSites: jest.fn(),
  getCachedSummary: jest.fn(),
  getCachedQueries: jest.fn(),
}));

const NOW = new Date("2026-10-13T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const users = (n: number, extra: (i: number) => Record<string, unknown> = () => ({})) =>
  Array.from({ length: n }, (_, i) => ({
    email: `u${i}-${Math.random().toString(36).slice(2)}@x.test`,
    role: "customer",
    status: "active",
    createdAt: day(400),
    ...extra(i),
  }));

let seq = 0;
const kid = (dateOfBirth?: unknown) => ({
  email: `kid${++seq}@x.test`,
  parentUserId: `p${seq}`,
  status: "active",
  ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe("pure helpers", () => {
  it("validates ranges", () => {
    expect(isHighlightsRange("30d")).toBe(true);
    expect(isHighlightsRange("7d")).toBe(false);
    expect(isHighlightsRange(undefined)).toBe(false);
  });

  it("resolves bucket-aligned, half-open UTC periods with an equal previous period", () => {
    const { current, previous } = resolveReportPeriod("30d", NOW);
    expect(current.end.toISOString()).toBe("2026-10-13T00:00:00.000Z"); // today is in progress → excluded
    expect(current.start.toISOString()).toBe("2026-09-13T00:00:00.000Z");
    expect(current.days).toBe(30);
    expect(previous.end.getTime()).toBe(current.start.getTime());
    expect(previous.start.toISOString()).toBe("2026-08-14T00:00:00.000Z");

    const w = resolveReportPeriod("90d", NOW).current; // NOW is a Tuesday
    expect(w.end.toISOString()).toBe("2026-10-12T00:00:00.000Z"); // Monday
    expect(w.days).toBe(91);
    expect(scopeLabel(w.days)).toBe("Last 13 weeks");

    const y = resolveReportPeriod("1y", NOW);
    expect(y.current.start.toISOString()).toBe("2025-10-01T00:00:00.000Z");
    expect(y.current.end.toISOString()).toBe("2026-10-01T00:00:00.000Z"); // October is in progress → excluded
    expect(y.previous.start.toISOString()).toBe("2024-10-01T00:00:00.000Z");
    expect(scopeLabel(y.current.days)).toBe("Last 12 months");
    expect(bucketKeys(y.current, "month")).toHaveLength(12);
  });

  it("fills every bucket (weeks start Monday)", () => {
    const keys = bucketKeys({ start: new Date("2026-10-01T10:00:00Z"), end: new Date("2026-10-20T00:00:00Z") }, "week");
    expect(keys).toEqual(["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]);
    expect(bucketKeys({ start: new Date("2026-01-15Z"), end: new Date("2026-03-02Z") }, "month")).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
  });

  it("shows growth only when baseline > 0 and change is positive", () => {
    expect(positiveGrowthPct(120, 100)).toBe(20);
    expect(positiveGrowthPct(50, 0)).toBeUndefined();
    expect(positiveGrowthPct(80, 100)).toBeUndefined();
    expect(positiveGrowthPct(100, 100)).toBeUndefined();
    expect(positiveGrowthPct(0, 10)).toBeUndefined();
  });

  it("percentages always sum to 100", () => {
    const p = toPercentages([1, 1, 1]);
    expect(p.reduce((a, b) => a + b, 0)).toBe(100);
    expect(toPercentages([0, 0])).toEqual([0, 0]);
  });

  describe("suppressAgeBins", () => {
    it("keeps bins of exactly 10", () => {
      const d = suppressAgeBins(KID_BINS, [10, 10, 10, 10])!;
      expect(d.bins.map((b) => b.label)).toEqual(["3–5", "6–8", "9–12", "13–17"]);
      expect(d.basedOn).toBe(40);
    });

    it("merges a bin of 9 into its smaller neighbour", () => {
      const d = suppressAgeBins(KID_BINS, [30, 9, 12, 40])!;
      expect(d.bins.map((b) => b.label)).toEqual(["3–5", "6–12", "13–17"]);
      expect(d.bins.reduce((a, b) => a + b.pct, 0)).toBe(100);
    });

    it("is insufficient when fewer than 2 bins survive", () => {
      expect(suppressAgeBins(KID_BINS, [5, 5, 5, 4])).toBeUndefined();
      expect(suppressAgeBins(KID_BINS, [0, 25, 0, 0])).toBeUndefined();
    });

    it("never exposes counts and rounds basedOn down", () => {
      const d = suppressAgeBins(KID_BINS, [13, 14, 0, 0])!;
      expect(d.basedOn).toBe(20);
      expect(JSON.stringify(d)).not.toMatch(/"count"/);
    });
  });

  it("normalises locations and groups small/tail ones into Other", () => {
    expect(normalizeLocation(" ae ")).toBe("United Arab Emirates");
    expect(normalizeLocation("abu  dhabi")).toBe("Abu Dhabi");
    expect(normalizeLocation("N/A")).toBeNull();
    const rows = rankLocations([
      { label: "dubai", count: 30 },
      { label: "Dubai ", count: 5 },
      { label: "Sharjah", count: 12 },
      { label: "Ajman", count: 3 },
      { label: "", count: 50 },
    ])!;
    expect(rows).toEqual([
      { label: "Dubai", count: 35, pct: 70 },
      { label: "Sharjah", count: 12, pct: 24 },
      { label: "Other", count: 3, pct: 6 },
    ]);
    expect(rankLocations([{ label: "Ajman", count: 3 }])).toBeUndefined();
  });

  it("dedupes URL-prefix properties covered by a domain property", () => {
    expect(
      dedupeSites(["sc-domain:kidrove.com", "https://kidrove.com/", "https://www.kidrove.com/", "https://kidrove.in/"]),
    ).toEqual(["sc-domain:kidrove.com", "https://kidrove.in/"]);
  });

  it("filters search queries to customer-safe ones", () => {
    expect(isSafeQuery("kids classes dubai", 100)).toBe(true);
    expect(isSafeQuery("kidrove", 50)).toBe(true);
    expect(isSafeQuery("john smith", 500)).toBe(false);
    expect(isSafeQuery("kids camp 0501234567", 500)).toBe(false);
    expect(isSafeQuery("kids camp a@b.com", 500)).toBe(false);
    expect(isSafeQuery("kids classes", 5)).toBe(false);
    expect(isSafeQuery("things to do in dubai for kids", 100)).toBe(true);
    // One safe word is not enough: every word must be safe, so names never leak.
    expect(isSafeQuery("aarav sharma birthday party dubai", 500)).toBe(false);
    expect(isSafeQuery("kidrove teacher priya contact", 500)).toBe(false);
    expect(isSafeQuery("the near me", 500)).toBe(false); // filler only
  });

  it("weights average position by impressions", () => {
    expect(weightedPosition([{ position: 2, impressions: 900 }, { position: 20, impressions: 100 }])).toBe(3.8);
    expect(weightedPosition([{ position: 3, impressions: 0 }])).toBeUndefined();
  });

  it("drops zero / negative KPI cards", () => {
    const { current } = resolveReportPeriod("30d", NOW);
    const kpis = buildKpis({
      period: current,
      sections: {
        community: { totalUsers: 50, newUsers: 0, previousNewUsers: 3, unit: "day", cumulative: [], activity: [] },
        events: { publishedEvents: -1, top: [] },
      },
    });
    expect(kpis.map((k) => k.id)).toEqual(["registered_users"]);
  });
});

// ─── Aggregation ─────────────────────────────────────────────────────────────

describe("buildTrustReport (DB)", () => {
  beforeAll(async () => {
    await connectTestDB();
    await Promise.all([User.init(), Student.init(), Event.init(), PageView.init()]).catch(() => {});
  });
  beforeEach(() => {
    (gsc.isSearchConsoleConfigured as jest.Mock).mockReturnValue(false);
    (gsc.getConfiguredSites as jest.Mock).mockReturnValue([]);
  });
  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it("returns a valid, empty report for an empty database", async () => {
    const r = await buildTrustReport("30d", NOW);
    expect(r.kpis).toEqual([]);
    expect(r.sections).toEqual({});
    const status = Object.fromEntries(r.diagnostics.map((d) => [d.section, d.status]));
    expect(status).toEqual({
      community: "empty",
      ages: "empty",
      locations: "empty",
      engagement: "empty",
      search: "not_configured",
      events: "empty",
      blogs: "empty",
    });
  });

  it("respects period boundaries and keeps zero buckets in the trend", async () => {
    const { current } = resolveReportPeriod("30d", NOW);
    await User.collection.insertMany([
      ...users(3), // lifetime, before period
      ...users(1, () => ({ createdAt: current.start })), // exactly at start → included
      ...users(1, () => ({ createdAt: day(1) })),
      ...users(1, () => ({ createdAt: current.end })), // at end → excluded
      ...users(1, () => ({ createdAt: NOW })), // today, still in progress → excluded
      ...users(1, () => ({ createdAt: day(3), role: "vendor" })), // staff / partners are not members
      ...users(1, () => ({ createdAt: day(3), role: "admin" })),
      ...users(1, () => ({ createdAt: day(3), status: "pending" })), // unverified
      ...users(1, () => ({ createdAt: day(3), role: "parent" })), // parents ARE members
      ...users(1, () => ({ createdAt: new Date(NOW.getTime() + 86_400_000) })), // future → excluded
      ...users(1, () => ({ createdAt: day(5), status: "suspended" })),
      ...users(1, () => ({ createdAt: day(45) })), // previous period
    ]);
    const r = await buildTrustReport("30d", NOW);
    const c = r.sections.community!;
    expect(c.totalUsers).toBe(7);
    expect(c.newUsers).toBe(3);
    expect(c.previousNewUsers).toBe(1);
    expect(c.activity.length).toBe(30); // whole days only — no partial bucket at either end
    expect(c.activity.filter((p) => p.value === 0).length).toBeGreaterThan(20); // zeros kept
    expect(c.cumulative[c.cumulative.length - 1].value).toBe(7);
    expect(c.cumulative[0].value).toBeGreaterThanOrEqual(4);
    const kpi = r.kpis.find((k) => k.id === "new_registrations")!;
    expect(kpi.changePct).toBe(200);
  });

  it("computes exact ages (birthday not yet reached this year)", async () => {
    await Student.collection.insertMany([
      ...Array.from({ length: 10 }, () => kid(new Date("2017-10-14T00:00:00Z"))), // 8
      ...Array.from({ length: 10 }, () => kid(new Date("2017-10-13T00:00:00Z"))), // 9
      kid("not-a-date"),
      kid(new Date("2030-01-01T00:00:00Z")),
      kid(),
    ]);
    const r = await buildTrustReport("30d", NOW);
    expect(r.sections.ages!.kids!.bins).toEqual([
      { label: "6–8", pct: 50 },
      { label: "9–12", pct: 50 },
    ]);
    expect(r.sections.ages!.kids!.basedOn).toBe(20);
    expect(r.sections.ages!.adults).toBeUndefined();
  });

  it("marks ages insufficient when below the privacy threshold", async () => {
    await Student.collection.insertMany(
      Array.from({ length: 9 }, () => kid(new Date("2019-01-01T00:00:00Z"))),
    );
    const r = await buildTrustReport("30d", NOW);
    expect(r.diagnostics.find((d) => d.section === "ages")!.status).toBe("insufficient");
  });

  it("keeps member and visitor locations separate", async () => {
    await User.collection.insertMany(users(12, () => ({ addresses: [{ city: "dubai", country: "AE" }, { city: "Pune", country: "IN" }] })));
    await PageView.collection.insertMany(
      Array.from({ length: 15 }, () => ({ path: "/", country: "IN", device: "mobile", sessionId: "s", timestamp: day(2) })),
    );
    const r = await buildTrustReport("30d", NOW);
    const l = r.sections.locations!;
    expect(l.communityCountries).toEqual([{ label: "United Arab Emirates", count: 12, pct: 100 }]);
    expect(l.communityCities).toEqual([{ label: "Dubai", count: 12, pct: 100 }]);
    expect(l.visitorCountries).toEqual([{ label: "India", count: 15, pct: 100 }]);
  });

  it("caps visitor coverage to retained data and excludes bots", async () => {
    await PageView.collection.insertMany([
      { path: "/", device: "desktop", sessionId: "a", timestamp: day(10) },
      { path: "/x", device: "desktop", sessionId: "a", timestamp: day(3) },
      { path: "/", device: "mobile", sessionId: "b", timestamp: day(3) },
      { path: "/", device: "bot", sessionId: "c", timestamp: day(3) },
    ]);
    const r = await buildTrustReport("1y", NOW);
    const e = r.sections.engagement!;
    expect(e.pageViews).toBe(3);
    expect(e.uniqueVisitors).toBe(2);
    expect(e.coverage.start.toISOString()).toBe(day(10).toISOString());
    expect(e.devices.map((d) => d.label)).toEqual(["Desktop", "Mobile"]);
  });

  it("aggregates GSC across deduped sites with weighted position", async () => {
    (gsc.isSearchConsoleConfigured as jest.Mock).mockReturnValue(true);
    (gsc.getConfiguredSites as jest.Mock).mockReturnValue(["sc-domain:kidrove.com", "https://kidrove.com/", "https://kidrove.in/"]);
    (gsc.getCachedSummary as jest.Mock).mockImplementation(async (site: string) => ({
      data: {
        summary: site.includes(".in") ? { clicks: 10, impressions: 100, position: 20 } : { clicks: 90, impressions: 900, position: 2 },
        trend: [{ keys: ["2026-10-10"], clicks: 5, impressions: 50 }, { keys: ["2026-10-11"], clicks: 6, impressions: 60 }],
      },
    }));
    (gsc.getCachedQueries as jest.Mock).mockResolvedValue({
      data: [
        { keys: ["kids classes dubai"], clicks: 20, impressions: 200 },
        { keys: ["jane doe"], clicks: 50, impressions: 500 },
      ],
    });
    const r = await buildTrustReport("30d", NOW);
    const s = r.sections.search!;
    expect(gsc.getCachedSummary).toHaveBeenCalledTimes(2);
    expect(s.sites).toEqual(["sc-domain:kidrove.com", "https://kidrove.in/"]);
    expect(s.clicks).toBe(100);
    expect(s.impressions).toBe(1000);
    expect(s.avgPosition).toBe(3.8);
    expect(s.trend).toEqual([
      { key: "2026-10-10", clicks: 10, impressions: 100 },
      { key: "2026-10-11", clicks: 12, impressions: 120 },
    ]);
    expect(s.topQueries.map((q) => q.query)).toEqual(["kids classes dubai"]);
  });

  it("omits a failed section without failing the report", async () => {
    (gsc.isSearchConsoleConfigured as jest.Mock).mockReturnValue(true);
    (gsc.getConfiguredSites as jest.Mock).mockReturnValue(["sc-domain:kidrove.com"]);
    (gsc.getCachedSummary as jest.Mock).mockRejectedValue(new Error("quota"));
    (gsc.getCachedQueries as jest.Mock).mockResolvedValue({ data: [] });
    await User.collection.insertMany(users(3));
    const r = await buildTrustReport("30d", NOW);
    expect(r.diagnostics.find((d) => d.section === "search")!.status).toBe("failed");
    expect(r.sections.search).toBeUndefined();
    expect(r.sections.community!.totalUsers).toBe(3);
  });

  it("only counts published, approved, non-deleted events", async () => {
    const base = { title: "Art Camp", category: "art", location: { city: "dubai" }, viewsCount: 40 };
    await Event.collection.insertMany([
      { ...base, slug: "e1", status: "published", isApproved: true, isDeleted: false },
      { ...base, slug: "e2", title: "Draft", status: "draft", isApproved: true },
      { ...base, slug: "e3", title: "Pending", status: "published", isApproved: false },
      { ...base, slug: "e4", title: "Gone", status: "published", isApproved: true, isDeleted: true },
    ]);
    const r = await buildTrustReport("30d", NOW);
    expect(r.sections.events!.publishedEvents).toBe(1);
    expect(r.sections.events!.top).toEqual([
      { title: "Art Camp", place: "Dubai", views: 40 },
    ]);
  });
});

