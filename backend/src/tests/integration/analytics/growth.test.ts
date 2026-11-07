/**
 * Growth analytics: the public beacons store validated attribution, sign-ups
 * keep their first-touch channel, the nightly rollup is repeatable, and the
 * admin reports are admin-only and count what was tracked.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import PageView from "../../../models/PageView";
import AnalyticsEvent from "../../../models/AnalyticsEvent";
import AnalyticsDaily from "../../../models/AnalyticsDaily";
import User from "../../../models/User";
import { classifyChannel } from "../../../utils/channel";
import { rollupDay } from "../../../services/analyticsRollup.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { ensureCollections } from "../setup/factories";
import { cookie, signUp, signUpAdmin, uniqueEmail, vendorIdOf, insertEvent } from "../setup/session";

let app: Application;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  await ensureCollections();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

/** The beacon answers before it writes; wait for the row. */
const waitFor = async <T>(fn: () => Promise<T | null>, ms = 3000): Promise<T> => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("timed out waiting for write");
    await new Promise((r) => setTimeout(r, 25));
  }
};

const pageview = (body: Record<string, unknown>, ua = CHROME_ANDROID) =>
  request(app).post("/api/track/pageview").set("User-Agent", ua).send(body);

describe("classifyChannel", () => {
  it.each([
    [{ utmMedium: "cpc", utmSource: "google" }, "paid"],
    [{ paidClick: true }, "paid"],
    [{ utmSource: "whatsapp" }, "whatsapp"],
    [{ utmMedium: "email" }, "email"],
    [{ utmSource: "instagram" }, "social"],
    [{ referrer: "https://www.google.com/" }, "organic_search"],
    [{ referrer: "https://l.instagram.com/" }, "social"],
    [{ referrer: "https://wa.me/123" }, "whatsapp"],
    [{ referrer: "https://someblog.ae/post" }, "referral"],
    [{ referrer: "https://kidrove.com/events" }, "direct"],
    [{}, "direct"],
  ])("%j → %s", (attr, expected) => {
    expect(classifyChannel(attr, "kidrove.com")).toBe(expected);
  });
});

describe("POST /api/track/pageview", () => {
  it("stores visitor, channel, UTM and device details", async () => {
    expect(
      (
        await pageview({
          path: "/events",
          sessionId: "s1",
          visitorId: "v1",
          isNewVisitor: true,
          attribution: { utmSource: "Instagram", utmMedium: "social", utmCampaign: "summer" },
        })
      ).status,
    ).toBe(204);
    const pv = await waitFor(() => PageView.findOne({ sessionId: "s1" }).lean());
    expect(pv).toMatchObject({
      visitorId: "v1",
      isNewVisitor: true,
      channel: "social",
      utmSource: "instagram",
      utmCampaign: "summer",
      device: "mobile",
      browser: "Chrome",
      os: "Android",
    });
  });

  it("drops bots and ignores non-string fields", async () => {
    await pageview({ path: "/x", sessionId: "bot" }, "Googlebot/2.1");
    await pageview({ path: { $gt: "" }, sessionId: "obj" });
    await pageview({ path: "/ok", sessionId: { $ne: 1 }, visitorId: "v".repeat(500) });
    const ok = await waitFor(() => PageView.findOne({ path: "/ok" }).lean());
    expect(ok.sessionId).toBeNull();
    expect(ok.visitorId).toHaveLength(100);
    expect(await PageView.countDocuments({ path: "/x" })).toBe(0);
  });

  it("adds visible time from the beacon, capped at 30 minutes", async () => {
    await pageview({ path: "/a", sessionId: "s2" });
    await waitFor(() => PageView.findOne({ sessionId: "s2" }).lean());
    await request(app)
      .post("/api/track/engagement")
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ sessionId: "s2", path: "/a", ms: 4000 }));
    await waitFor(() => PageView.findOne({ sessionId: "s2", engagementMs: 4000 }).lean());
    await request(app).post("/api/track/engagement").send({ sessionId: "s2", path: "/a", ms: 99 * 60_000 });
    await waitFor(() => PageView.findOne({ sessionId: "s2", engagementMs: 30 * 60_000 }).lean());
  });
});

describe("POST /api/analytics/track", () => {
  const track = (body: Record<string, unknown>) => request(app).post("/api/analytics/track").send(body);

  it("accepts a search with a trimmed meta and no eventId", async () => {
    const res = await track({
      type: "searchPerformed",
      sessionId: "s",
      meta: { query: "  Summer CAMP ", resultCount: 0, evil: { $where: "1" } },
    });
    expect(res.status).toBe(204);
    const ev = await AnalyticsEvent.findOne({ type: "searchPerformed" }).lean();
    expect(ev!.meta).toEqual({ query: "summer camp", resultCount: 0 });
  });

  it("requires an eventId for event actions and rejects unknown types", async () => {
    expect((await track({ type: "bookingClicked" })).status).toBe(400);
    expect((await track({ type: "nope" })).status).toBe(400);
  });
});

describe("sign-up attribution", () => {
  it("saves the first-touch channel on a new account", async () => {
    const email = uniqueEmail("acq");
    await request(app)
      .post("/api/auth/register")
      .send({
        firstName: "A",
        lastName: "B",
        email,
        password: "Test@1234!",
        role: "customer",
        attribution: { utmSource: "whatsapp", utmCampaign: "launch", landingPath: "/", visitorId: "v9" },
      });
    const user = await User.findOne({ email }).lean();
    expect(user!.acquisition).toMatchObject({ channel: "whatsapp", utmCampaign: "launch", visitorId: "v9" });
  });
});

describe("rollup + admin reports", () => {
  async function seed() {
    const now = new Date();
    await PageView.insertMany([
      { path: "/", sessionId: "a", visitorId: "va", isNewVisitor: true, channel: "social", device: "mobile", timestamp: now },
      { path: "/events", sessionId: "a", visitorId: "va", channel: "social", device: "mobile", timestamp: now },
      { path: "/", sessionId: "b", visitorId: "vb", channel: "organic_search", device: "desktop", timestamp: now },
    ]);
  }

  it("rollupDay gives the same totals when run twice", async () => {
    await seed();
    const first = await rollupDay(new Date());
    const second = await rollupDay(new Date());
    expect(second).toEqual(first);
    expect(first).toMatchObject({ views: 3, visitors: 2, sessions: 2, newVisitors: 1 });
    expect(await AnalyticsDaily.countDocuments({ period: "day" })).toBe(1);
    expect(await AnalyticsDaily.countDocuments({ period: "month" })).toBe(1);
  });

  const REPORTS = ["summary", "acquisition", "funnel", "behaviour", "content", "events", "organisers"];

  it("are refused to anonymous callers and customers", async () => {
    const customer = await signUp(app, "customer");
    for (const r of REPORTS) {
      expect((await request(app).get(`/api/admin/traffic/${r}`)).status).toBe(401);
      expect((await request(app).get(`/api/admin/traffic/${r}`).set("Cookie", cookie(customer))).status).toBe(403);
    }
  });

  it("count the tracked visits and actions", async () => {
    await seed();
    const vendor = await signUp(app, "vendor");
    const eventId = await insertEvent(await vendorIdOf(vendor), { category: "Camps" });
    await AnalyticsEvent.insertMany([
      { type: "eventViewed", eventId, sessionId: "a", visitorId: "va" },
      { type: "bookingClicked", eventId, sessionId: "a", visitorId: "va" },
    ]);
    const admin = await signUpAdmin(app);
    const get = async (r: string) =>
      (await request(app).get(`/api/admin/traffic/${r}?days=7`).set("Cookie", cookie(admin))).body.data;

    for (const r of REPORTS) expect(await get(r)).toBeDefined();

    // one view in the previous 7 days; the admin account is not an audience sign-up
    await PageView.create({ path: "/", sessionId: "old", visitorId: "vold", device: "mobile", timestamp: new Date(Date.now() - 10 * 86_400_000) });
    const summary = await get("summary");
    expect(summary.totals).toMatchObject({ visitors: 2, sessions: 2, views: 3, newVisitors: 1, returningVisitors: 1, registrations: 1 });
    expect(summary.previous).toMatchObject({ visitors: 1, sessions: 1, views: 1, registrations: 0 });
    expect(summary.byDevice).toEqual(expect.arrayContaining([{ key: "mobile", n: 2 }, { key: "desktop", n: 1 }]));
    const channels = (await get("acquisition")).channels;
    expect(channels.find((c: { channel: string }) => c.channel === "social")).toMatchObject({ visitors: 1, views: 2 });
    expect((await get("funnel")).steps.map((s: { n: number }) => s.n).slice(0, 3)).toEqual([2, 1, 1]);
    const ev = await get("events");
    expect(ev.topEvents[0]).toMatchObject({ eventId, views: 1, bookingClicks: 1 });
    expect(ev.categories.find((c: { category: string }) => c.category === "Camps")).toMatchObject({ views: 1 });
    expect((await get("organisers")).topOrganisers[0]).toMatchObject({ views: 1, bookingClicks: 1 });
  });
});
