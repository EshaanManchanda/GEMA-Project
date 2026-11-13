/**
 * Email-marketing (Sender / Mailchimp) integration tests: inbound opt-out
 * webhook, opt-in gating of contact sync, the sync job, and the admin settings
 * endpoint (secrets encrypted at rest, never returned, input validated).
 * The provider is always the in-process "dev" adapter; no network.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User, { UserRole, UserStatus } from "../../../models/User";
import NewsletterSubscriber from "../../../models/NewsletterSubscriber";
import EmailMarketingSettings from "../../../models/EmailMarketingSettings";
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationCategory,
  CommunicationStatus,
} from "../../../models/index";
import { config } from "../../../config/env";
import {
  getEmailMarketingConfig,
  invalidateEmailMarketingConfig,
} from "../../../services/communication/emailMarketingConfig.service";
import {
  enqueueContactSync,
  syncUserToMarketing,
  unsubscribeUserFromMarketing,
} from "../../../services/communication/marketingSync.service";
import { runCommunicationJob } from "../../../services/communication/deliver.service";
import { CommunicationJobType } from "../../../services/communication/communication.service";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { signUp, signUpAdmin, cookie } from "../setup/session";

const EMPTY_ENV = {
  provider: "dev",
  senderApiKey: "",
  senderListId: "",
  mailchimpApiKey: "",
  mailchimpServerPrefix: "",
  mailchimpAudienceId: "",
  senderWebhookSecret: "",
  mailchimpWebhookSecret: "",
};
const savedEnvCfg = { ...(config as any).emailMarketing };
const savedKey = (config as any).fieldEncryptionKey;
const savedRedis = process.env.DISABLE_REDIS;

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  // Hermetic: a developer's real provider env vars must not leak into assertions,
  // and with no queue the sync job runs inline against the dev provider.
  Object.assign((config as any).emailMarketing, EMPTY_ENV);
  process.env.DISABLE_REDIS = "true";
});
afterEach(async () => {
  await clearTestDB();
  (config as any).fieldEncryptionKey = savedKey;
  invalidateEmailMarketingConfig();
});
afterAll(async () => {
  Object.assign((config as any).emailMarketing, savedEnvCfg);
  if (savedRedis === undefined) delete process.env.DISABLE_REDIS;
  else process.env.DISABLE_REDIS = savedRedis;
  await closeTestDB();
});

const EMAIL = "optout@example.com";
const mkUser = (over: Record<string, unknown> = {}) =>
  User.create({
    firstName: "Opt",
    lastName: "User",
    email: EMAIL,
    passwordHash: "Test@1234!",
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    ...over,
  });
const mkSubscriber = (over: Record<string, unknown> = {}) =>
  NewsletterSubscriber.create({
    email: EMAIL,
    source: "footer",
    isActive: true,
    ...over,
  });
const syncRows = (templateKey: string, email = EMAIL) =>
  CommunicationLog.find({ templateKey, recipientEmail: email }).lean();

// ─── Inbound opt-out webhook ─────────────────────────────────────────────────

describe("email-marketing webhook", () => {
  const SECRET = "whsec-test-secret-123";
  const hook = (provider: string, secret: string) =>
    `/api/webhooks/email-marketing/${provider}/${encodeURIComponent(secret)}`;
  const form = (type: string, email = EMAIL) =>
    `type=${type}&data%5Bemail%5D=${encodeURIComponent(email)}&data%5Breason%5D=manual`;

  beforeEach(async () => {
    await EmailMarketingSettings.create({ mailchimpWebhookSecret: SECRET });
    invalidateEmailMarketingConfig();
  });

  it("an unsubscribe mirrors locally: subscriber inactive, opt-in cleared, preference off, no echo sync", async () => {
    const user = await mkUser({ marketingOptInAt: new Date() });
    await mkSubscriber();

    const res = await request(app)
      .post(hook("mailchimp", SECRET))
      .type("form")
      .send(form("unsubscribe"));

    expect(res.status).toBe(200);
    const sub: any = await NewsletterSubscriber.findOne({ email: EMAIL }).lean();
    expect(sub.isActive).toBe(false);
    expect(sub.unsubscribeReason).toContain("mailchimp:unsubscribe");
    const u: any = await User.findById(user._id).lean();
    expect(u.marketingOptInAt).toBeUndefined();
    expect(u.preferences.notifications.marketing).toBe(false);
    // The provider already knows; syncing back would loop.
    expect(await CommunicationLog.countDocuments()).toBe(0);
  });

  it("a cleaned (hard-bounced) address is treated as an opt-out too", async () => {
    await mkSubscriber();
    const res = await request(app)
      .post(hook("mailchimp", SECRET))
      .type("form")
      .send(form("cleaned"));
    expect(res.status).toBe(200);
    expect(
      ((await NewsletterSubscriber.findOne({ email: EMAIL }).lean()) as any).isActive,
    ).toBe(false);
  });

  it("matches the email case-insensitively", async () => {
    await mkSubscriber();
    await request(app)
      .post(hook("mailchimp", SECRET))
      .type("form")
      .send(form("unsubscribe", "OptOut@Example.COM"));
    expect(
      ((await NewsletterSubscriber.findOne({ email: EMAIL }).lean()) as any).isActive,
    ).toBe(false);
  });

  it("other events (subscribe, profile) are acknowledged and change nothing", async () => {
    const user = await mkUser({ marketingOptInAt: new Date() });
    await mkSubscriber();

    const res = await request(app)
      .post(hook("mailchimp", SECRET))
      .type("form")
      .send(form("subscribe"));

    expect(res.status).toBe(200);
    expect(
      ((await NewsletterSubscriber.findOne({ email: EMAIL }).lean()) as any).isActive,
    ).toBe(true);
    expect(((await User.findById(user._id).lean()) as any).marketingOptInAt).toBeDefined();
  });

  it("a wrong secret is rejected with 401 and nothing changes", async () => {
    const user = await mkUser({ marketingOptInAt: new Date() });
    await mkSubscriber();

    const res = await request(app)
      .post(hook("mailchimp", "not-the-secret-at-all"))
      .type("form")
      .send(form("unsubscribe"));

    expect(res.status).toBe(401);
    expect(
      ((await NewsletterSubscriber.findOne({ email: EMAIL }).lean()) as any).isActive,
    ).toBe(true);
    expect(((await User.findById(user._id).lean()) as any).marketingOptInAt).toBeDefined();
  });

  it("rejects an unknown provider and a secret used on the wrong provider", async () => {
    await mkSubscriber();
    for (const provider of ["evil", "sender"]) {
      const res = await request(app)
        .post(hook(provider, SECRET))
        .type("form")
        .send(form("unsubscribe"));
      expect(res.status).toBe(401);
    }
    expect(
      ((await NewsletterSubscriber.findOne({ email: EMAIL }).lean()) as any).isActive,
    ).toBe(true);
  });

  it("a same-length secret with multi-byte characters is a clean 401, not a crash", async () => {
    await mkSubscriber();
    // "é" is 2 bytes: same JS length as SECRET, different byte length.
    const res = await request(app)
      .post(hook("mailchimp", "é".repeat(SECRET.length)))
      .type("form")
      .send(form("unsubscribe"));
    expect(res.status).toBe(401);
    expect(
      ((await NewsletterSubscriber.findOne({ email: EMAIL }).lean()) as any).isActive,
    ).toBe(true);
  });

  it("the registration ping answers 200 for the right secret, 401 for a wrong or multi-byte one", async () => {
    expect((await request(app).get(hook("mailchimp", SECRET))).status).toBe(200);
    expect((await request(app).get(hook("mailchimp", "nope"))).status).toBe(401);
    expect(
      (await request(app).get(hook("mailchimp", "é".repeat(SECRET.length)))).status,
    ).toBe(401);
  });
});

// ─── Opt-in gating of contact sync ───────────────────────────────────────────

describe("syncUserToMarketing consent gate", () => {
  it("syncs a verified user who explicitly opted in, with role/purchase tags", async () => {
    const user = await mkUser({ marketingOptInAt: new Date() });

    await syncUserToMarketing(String(user._id));

    const rows: any[] = await syncRows("contact-sync:upsert");
    expect(rows).toHaveLength(1);
    expect(rows[0].vars.action).toBe("upsert");
    expect(rows[0].vars.tags).toContain("role:customer");
    expect(String(rows[0].userId)).toBe(String(user._id));
  });

  it.each([
    ["has not opted in", { isEmailVerified: true }],
    ["has an unverified email", { isEmailVerified: false, marketingOptInAt: new Date() }],
  ])("never syncs a user who %s", async (_label, over) => {
    const user = await mkUser(over);
    await syncUserToMarketing(String(user._id));
    expect(await CommunicationLog.countDocuments()).toBe(0);
  });

  it("never syncs a user who switched the marketing preference off, even with an old opt-in", async () => {
    const user = await mkUser({ marketingOptInAt: new Date() });
    await User.updateOne(
      { _id: user._id },
      { $set: { "preferences.notifications.marketing": false } },
    );
    await syncUserToMarketing(String(user._id));
    expect(await CommunicationLog.countDocuments()).toBe(0);
  });

  it("is a silent no-op for an unknown or malformed user id", async () => {
    await expect(syncUserToMarketing(String(new Types.ObjectId()))).resolves.toBeUndefined();
    await expect(syncUserToMarketing("not-an-id")).resolves.toBeUndefined();
    expect(await CommunicationLog.countDocuments()).toBe(0);
  });
});

describe("unsubscribeUserFromMarketing", () => {
  it("queues an unsubscribe for a registered user", async () => {
    const user = await mkUser();
    await unsubscribeUserFromMarketing({ _id: user._id, email: EMAIL });
    expect(await syncRows("contact-sync:unsubscribe")).toHaveLength(1);
  });

  it("does not unsubscribe someone who still has an active newsletter subscription", async () => {
    const user = await mkUser();
    await mkSubscriber({ isActive: true });
    await unsubscribeUserFromMarketing({ _id: user._id, email: EMAIL });
    expect(await CommunicationLog.countDocuments()).toBe(0);
  });

  it("does unsubscribe when the newsletter subscription is already inactive", async () => {
    const user = await mkUser();
    await mkSubscriber({ isActive: false });
    await unsubscribeUserFromMarketing({ _id: user._id, email: EMAIL });
    expect(await syncRows("contact-sync:unsubscribe")).toHaveLength(1);
  });
});

// ─── Sync job delivery ───────────────────────────────────────────────────────

describe("contact sync job", () => {
  const jobFor = (log: any) => ({
    logId: String(log._id),
    jobType: CommunicationJobType.EMAIL_MARKETING_SYNC,
    to: log.recipientEmail,
    templateKey: log.templateKey,
    providerTemplateName: "",
    languageCode: "en",
    vars: {},
  });
  const mkLog = (vars: Record<string, unknown>) =>
    CommunicationLog.create({
      channel: CommunicationChannel.EMAIL_MARKETING,
      provider: "dev",
      category: CommunicationCategory.MARKETING,
      templateKey: "contact-sync:custom",
      recipientEmail: EMAIL,
      vars,
      status: CommunicationStatus.QUEUED,
      idempotencyKey: `test:${new Types.ObjectId()}`,
    });

  it("runs inline against the dev provider and lands as sent, with the email normalised", async () => {
    await enqueueContactSync({ action: "upsert", email: "  Dev.Sync@Example.COM ", firstName: "Dev" });

    const rows: any[] = await syncRows("contact-sync:upsert", "dev.sync@example.com");
    expect(rows).toHaveLength(1);
    expect(rows[0].provider).toBe("dev");
    expect(rows[0].status).toBe(CommunicationStatus.SENT);
  });

  it("an unsubscribe job is delivered too", async () => {
    await enqueueContactSync({ action: "unsubscribe", email: EMAIL });
    const rows: any[] = await syncRows("contact-sync:unsubscribe");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(CommunicationStatus.SENT);
  });

  it("re-running a job that already succeeded is a no-op success (retry safety)", async () => {
    const log = await mkLog({ action: "upsert" });
    const first = await runCommunicationJob(jobFor(log), { allowThrowOnRetryable: false });
    const second = await runCommunicationJob(jobFor(log), { allowThrowOnRetryable: false });
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(((await CommunicationLog.findById(log._id).lean()) as any).status).toBe(
      CommunicationStatus.SENT,
    );
  });

  it("an unknown action fails with UNKNOWN_ACTION instead of pretending to sync", async () => {
    const log = await mkLog({ action: "explode" });
    const result = await runCommunicationJob(jobFor(log), { allowThrowOnRetryable: false });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("UNKNOWN_ACTION");
    expect(((await CommunicationLog.findById(log._id).lean()) as any).status).toBe(
      CommunicationStatus.FAILED,
    );
  });

  it("a job whose log row is gone fails cleanly with LOG_NOT_FOUND", async () => {
    const result = await runCommunicationJob(
      {
        logId: String(new Types.ObjectId()),
        jobType: CommunicationJobType.EMAIL_MARKETING_SYNC,
        to: EMAIL,
        templateKey: "contact-sync:upsert",
        providerTemplateName: "",
        languageCode: "en",
        vars: {},
      },
      { allowThrowOnRetryable: false },
    );
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("LOG_NOT_FOUND");
  });
});

// ─── Admin settings endpoint ─────────────────────────────────────────────────

describe("admin email-marketing settings", () => {
  const URL = "/api/admin/communication/email-marketing/settings";
  const asAdmin = async () => {
    const admin = await signUpAdmin(app);
    return { Cookie: cookie(admin), "X-CSRF-Token": admin.csrfToken };
  };
  const SECRET_KEY = "abcd1234efgh5678-us21";

  it("is admin only: 401 anonymous, 403 for a customer", async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    const customer = await signUp(app, "customer");
    expect(
      (await request(app).get(URL).set("Cookie", cookie(customer))).status,
    ).toBe(403);
  });

  it.each([
    ["a hostile Mailchimp server prefix", { mailchimpServerPrefix: "evil.com/x" }],
    ["a malformed audience id", { mailchimpAudienceId: "bad id/../x" }],
    ["an unknown provider", { provider: "evilprovider" }],
  ])("rejects %s with 400 and stores nothing", async (_label, body) => {
    const headers = await asAdmin();
    const res = await request(app).put(URL).set(headers).send(body);
    expect(res.status).toBe(400);
    const stored: any = await EmailMarketingSettings.findOne().lean();
    expect(stored?.mailchimpServerPrefix ?? "").toBe("");
    expect(stored?.mailchimpAudienceId ?? "").toBe("");
    expect(stored?.provider ?? "").toBe("");
  });

  it("stores secrets encrypted and never returns them", async () => {
    (config as any).fieldEncryptionKey = "test-field-encryption-key";
    const headers = await asAdmin();

    const put = await request(app).put(URL).set(headers).send({
      provider: "mailchimp",
      mailchimpServerPrefix: "us21",
      mailchimpAudienceId: "abc123def",
      mailchimpApiKey: SECRET_KEY,
    });
    expect(put.status).toBe(200);
    expect(JSON.stringify(put.body)).not.toContain("abcd1234efgh5678");
    expect(put.body.data.secrets.mailchimpApiKey).toEqual({ isSet: true, source: "database" });
    expect(put.body.data.plain.mailchimpServerPrefix).toBe("us21");

    const get = await request(app).get(URL).set(headers);
    expect(get.status).toBe(200);
    expect(JSON.stringify(get.body)).not.toContain("abcd1234efgh5678");
    expect(get.body.data.provider).toBe("mailchimp");

    const stored: any = await EmailMarketingSettings.findOne().lean();
    expect(stored.mailchimpApiKey).toBeTruthy();
    expect(stored.mailchimpApiKey).not.toContain("abcd1234efgh5678");
    // ...and the server can still use it.
    expect((await getEmailMarketingConfig()).mailchimpApiKey).toBe(SECRET_KEY);
  });

  it("refuses to save a secret in plaintext when no encryption key is configured", async () => {
    (config as any).fieldEncryptionKey = "";
    const headers = await asAdmin();

    const res = await request(app)
      .put(URL)
      .set(headers)
      .send({ mailchimpApiKey: SECRET_KEY });

    expect(res.status).toBe(400);
    const stored: any = await EmailMarketingSettings.findOne().lean();
    expect(stored?.mailchimpApiKey ?? "").toBe("");
  });

  it("a blank secret keeps the current one; null clears it", async () => {
    (config as any).fieldEncryptionKey = "test-field-encryption-key";
    const headers = await asAdmin();
    await request(app).put(URL).set(headers).send({ mailchimpApiKey: SECRET_KEY });

    const keep = await request(app).put(URL).set(headers).send({ mailchimpApiKey: "  " });
    expect(keep.body.data.secrets.mailchimpApiKey.isSet).toBe(true);
    expect((await getEmailMarketingConfig()).mailchimpApiKey).toBe(SECRET_KEY);

    const clear = await request(app).put(URL).set(headers).send({ mailchimpApiKey: null });
    expect(clear.body.data.secrets.mailchimpApiKey).toEqual({ isSet: false, source: "none" });
    expect((await getEmailMarketingConfig()).mailchimpApiKey).toBe("");
  });
});
