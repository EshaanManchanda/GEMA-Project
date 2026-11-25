/**
 * Email digest / saved campaigns (merged from origin/aditya 4448c0d):
 * admin-only routes, the edit/activate flows, mass-assignment guard, HTML
 * escaping of vendor-authored text in the email (also rendered in the admin
 * preview iframe), and the cron gate. Provider is always "dev": no network.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import EmailDigestSettings from "../../../models/EmailDigestSettings";
import EmailCampaignRecord from "../../../models/EmailCampaignRecord";
import { config } from "../../../config/env";
import { invalidateEmailMarketingConfig } from "../../../services/communication/emailMarketingConfig.service";
import newsletterDigestService from "../../../services/communication/newsletterDigest.service";
import { runEmailDigestTick } from "../../../utils/cron";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { signUp, signUpAdmin, cookie, insertEvent } from "../setup/session";

const BASE = "/api/admin/communication/email-marketing";
const savedEnvCfg = { ...(config as any).emailMarketing };

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  Object.assign((config as any).emailMarketing, { provider: "dev", senderApiKey: "", senderListId: "", mailchimpApiKey: "" });
});
afterEach(async () => {
  jest.restoreAllMocks();
  await clearTestDB();
  invalidateEmailMarketingConfig();
});
afterAll(async () => {
  Object.assign((config as any).emailMarketing, savedEnvCfg);
  await closeTestDB();
});

const asAdmin = async () => {
  const admin = await signUpAdmin(app);
  return { Cookie: cookie(admin), "X-CSRF-Token": admin.csrfToken };
};

describe("digest routes: access", () => {
  it.each([
    ["get", `${BASE}/digest-settings`],
    ["put", `${BASE}/digest-settings`],
    ["post", `${BASE}/digest-preview`],
    ["post", `${BASE}/digest-dispatch`],
    ["get", `${BASE}/campaigns`],
  ])("%s %s: 401 anonymous, 403 customer", async (method, url) => {
    expect((await (request(app) as any)[method](url)).status).toBe(401);
    const c = await signUp(app, "customer");
    const res = await (request(app) as any)[method](url).set("Cookie", cookie(c)).set("X-CSRF-Token", c.csrfToken);
    expect(res.status).toBe(403);
  });
});

describe("saving and editing campaigns", () => {
  it("editing a saved campaign (body carries the record's _id) updates it and leaves the settings _id alone", async () => {
    const h = await asAdmin();
    const settings = await EmailDigestSettings.getSettings();
    const record = await EmailCampaignRecord.create({ title: "Old", subject: "Old subject" });

    // what DigestAutomationTab sends when editing: {...editingCampaign, campaignRecordId}
    const body = { ...record.toObject(), _id: String(record._id), campaignRecordId: String(record._id), subject: "New subject" };
    const res = await request(app).put(`${BASE}/digest-settings`).set(h).send(body);

    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(settings._id));
    expect((await EmailCampaignRecord.findById(record._id).lean())!.subject).toBe("New subject");
    expect(await EmailCampaignRecord.countDocuments()).toBe(1);
  });

  it("does not let the body overwrite delivery tracking (lastSentAt gates the cron)", async () => {
    const h = await asAdmin();
    const res = await request(app)
      .put(`${BASE}/digest-settings`)
      .set(h)
      .send({ subject: "S", lastSentAt: "2000-01-01T00:00:00.000Z", lastSentStatus: "success", lastSentRecipientCount: 999 });
    expect(res.status).toBe(200);
    const s = await EmailDigestSettings.findOne().lean();
    expect(s!.lastSentAt).toBeUndefined();
    expect(s!.lastSentRecipientCount).toBe(0);
  });

  it("activating a saved campaign copies it into the live settings", async () => {
    const h = await asAdmin();
    await EmailDigestSettings.getSettings();
    const record = await EmailCampaignRecord.create({ title: "Spot", subject: "Camp spotlight", campaignType: "event_spotlight" });

    const res = await request(app).patch(`${BASE}/campaigns/${record._id}`).set(h).send({ status: "active" });

    expect(res.status).toBe(200);
    const s = await EmailDigestSettings.findOne().lean();
    expect(s!.status).toBe("active");
    expect(s!.subject).toBe("Camp spotlight");
    expect(s!.campaignType).toBe("event_spotlight");
    expect(await EmailDigestSettings.countDocuments()).toBe(1);
  });

  it("delete: 404 for an unknown id, 400 for a malformed one", async () => {
    const h = await asAdmin();
    expect((await request(app).delete(`${BASE}/campaigns/${new Types.ObjectId()}`).set(h)).status).toBe(404);
    expect((await request(app).delete(`${BASE}/campaigns/not-an-id`).set(h)).status).toBe(400);
  });
});

describe("digest HTML", () => {
  const XSS = `<img src=x onerror=alert(document.domain)>`;

  it("escapes vendor-authored event text (email body and admin preview iframe)", async () => {
    const h = await asAdmin();
    const id = await insertEvent(String(new Types.ObjectId()), { title: XSS, category: "camp", location: { city: XSS } });
    const res = await request(app)
      .post(`${BASE}/digest-preview`)
      .set(h)
      .send({ campaignType: "event_spotlight", featuredEventId: id, eventCustomMessage: "Hi" });
    expect(res.status).toBe(200);
    expect(res.body.data.html).not.toContain("<img src=x onerror");
    expect(res.body.data.html).toContain("&lt;img src=x onerror");
  });

  it("never features an unpublished event", async () => {
    const h = await asAdmin();
    const draft = await insertEvent(String(new Types.ObjectId()), { title: "Secret draft", status: "draft" });
    const res = await request(app).post(`${BASE}/digest-preview`).set(h).send({ campaignType: "event_spotlight", featuredEventId: draft });
    expect(res.status).toBe(200);
    expect(res.body.data.html).not.toContain("Secret draft");
  });

  it("drops a non-http(s) CTA link", () => {
    const html = newsletterDigestService.generateHTML({
      campaignType: "custom_broadcast",
      targetAudience: "newsletter_all",
      subject: "S",
      audienceLabel: "x",
      customBroadcast: { heroTitle: "T", heroSubtitle: "", bodyHtml: "<p>b</p>", ctaText: "Go", ctaUrl: "javascript:alert(1)" },
    } as any);
    expect(html).not.toContain("javascript:");
  });
});

describe("digest cron tick", () => {
  // dispatchDigest stamps lastSentAt with the real clock, so the tick runs at "now"
  // and the schedule is set to today's weekday / current time.
  const NOW = new Date();
  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = DAYS[NOW.getUTCDay()];
  const otherDay = DAYS[(NOW.getUTCDay() + 3) % 7];
  const hhmm = `${String(NOW.getUTCHours()).padStart(2, "0")}:${String(NOW.getUTCMinutes()).padStart(2, "0")}`;
  const mkActive = (over: Record<string, unknown> = {}) =>
    EmailDigestSettings.create({ status: "active", autoSend: true, scheduleDay: today, scheduleTime: hhmm, ...over });

  it("does nothing with the default (draft, autoSend off) settings", async () => {
    const spy = jest.spyOn(newsletterDigestService, "dispatchDigest");
    await EmailDigestSettings.getSettings();
    await runEmailDigestTick(NOW);
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends once when due, and not again on the next tick in the same window", async () => {
    await mkActive();
    const spy = jest.spyOn(newsletterDigestService, "dispatchDigest");
    await runEmailDigestTick(NOW);
    await runEmailDigestTick(new Date(NOW.getTime() + 25 * 60_000));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("skips the wrong day and a run sent less than 20 h ago", async () => {
    const spy = jest.spyOn(newsletterDigestService, "dispatchDigest");
    await mkActive({ scheduleDay: otherDay });
    await runEmailDigestTick(NOW);
    await EmailDigestSettings.updateOne({}, { scheduleDay: today, lastSentAt: new Date(NOW.getTime() - 2 * 3600_000) });
    await runEmailDigestTick(NOW);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("audience and provider calls", () => {
  it("the audience cannot be chosen: every campaign targets the whole list", async () => {
    const h = await asAdmin();
    const res = await request(app).put(`${BASE}/digest-settings`).set(h).send({ subject: "S", targetAudience: "teachers" });
    expect(res.status).toBe(200);
    expect((await EmailDigestSettings.findOne().lean())!.targetAudience).toBe("newsletter_all");
    expect(res.body.campaignRecord.targetAudience).toBe("newsletter_all");

    const prev = await request(app).post(`${BASE}/digest-preview`).set(h).send({ targetAudience: "vendors" });
    expect(prev.body.data.targetAudience).toBe("newsletter_all");
    expect(prev.body.data.audienceLabel).toBe("all subscribers on the email-marketing list");
  });

  describe("via Sender", () => {
    beforeEach(() => {
      Object.assign((config as any).emailMarketing, { provider: "sender", senderApiKey: "test-key", senderListId: "grp1" });
      invalidateEmailMarketingConfig();
    });
    afterEach(() => {
      Object.assign((config as any).emailMarketing, { provider: "dev", senderApiKey: "", senderListId: "" });
    });
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as any;

    it("every provider call carries a timeout signal and the result names the whole list", async () => {
      await EmailDigestSettings.getSettings();
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(ok({ data: { id: "c1" } }))
        .mockResolvedValueOnce(ok({ data: { recipient_count: 3 } }));

      const r = await newsletterDigestService.dispatchDigest({});

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      for (const [, init] of fetchSpy.mock.calls) expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
      expect(r.message).toContain("all subscribers on the email-marketing list");
      expect((await EmailDigestSettings.findOne().lean())!.lastSentStatus).toBe("success");
    });

    it("a provider timeout fails the send and records it, so the cron does not retry in a loop", async () => {
      await EmailDigestSettings.getSettings();
      jest.spyOn(global, "fetch").mockRejectedValue(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }));

      await expect(newsletterDigestService.dispatchDigest({})).rejects.toThrow(/timeout/);
      const s = await EmailDigestSettings.findOne().lean();
      expect(s!.lastSentStatus).toBe("failed");
      expect(s!.lastSentAt).toBeDefined();
    });
  });
});
