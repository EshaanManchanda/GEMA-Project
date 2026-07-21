import { config } from "../../../../config/env";
import {
  getWhatsAppProvider,
  DevWhatsAppProvider,
  MisconfiguredWhatsAppProvider,
  CunnektWhatsAppProvider,
} from "../../../../services/communication/providers/whatsapp.provider";

jest.mock("../../../../config/logger");
jest.mock("../../../../models/index", () => ({
  CommunicationLog: { findOne: jest.fn() },
  CommunicationStatus: {
    QUEUED: "queued",
    SENT: "sent",
    DELIVERED: "delivered",
    READ: "read",
    FAILED: "failed",
    BOUNCED: "bounced",
  },
}));

describe("getWhatsAppProvider — placeholder/missing key must never silently simulate success", () => {
  const original = {
    provider: config.whatsapp.provider,
    cunnektApiKey: config.whatsapp.cunnektApiKey,
    testMode: config.communication.testMode,
  };

  afterEach(() => {
    config.whatsapp.provider = original.provider;
    config.whatsapp.cunnektApiKey = original.cunnektApiKey;
    config.communication.testMode = original.testMode;
  });

  it("returns MisconfiguredWhatsAppProvider for a placeholder key with test mode OFF", async () => {
    config.whatsapp.provider = "cunnekt";
    config.whatsapp.cunnektApiKey = "your_key_here";
    config.communication.testMode = false;

    const provider = getWhatsAppProvider();

    expect(provider).toBeInstanceOf(MisconfiguredWhatsAppProvider);
    expect(await provider.testConnection()).toBe(false);

    const result = await provider.sendTemplate({
      to: "+15551234567",
      templateId: "x",
      variables: {},
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("CONFIGURATION_ERROR");
    expect(result.isRetryable).toBe(false);
  });

  it("returns MisconfiguredWhatsAppProvider for an empty key with test mode OFF", async () => {
    config.whatsapp.provider = "cunnekt";
    config.whatsapp.cunnektApiKey = "";
    config.communication.testMode = false;

    const provider = getWhatsAppProvider();
    expect(provider).toBeInstanceOf(MisconfiguredWhatsAppProvider);
  });

  it("still uses DevWhatsAppProvider when COMMUNICATION_TEST_MODE=true, even with a placeholder key", () => {
    config.whatsapp.provider = "cunnekt";
    config.whatsapp.cunnektApiKey = "your_key_here";
    config.communication.testMode = true;

    const provider = getWhatsAppProvider();

    expect(provider).toBeInstanceOf(DevWhatsAppProvider);
  });

  it("uses the real CunnektWhatsAppProvider when a real-looking key is configured", () => {
    config.whatsapp.provider = "cunnekt";
    config.whatsapp.cunnektApiKey = "sk_live_abcdef1234567890";
    config.communication.testMode = false;

    const provider = getWhatsAppProvider();

    expect(provider).toBeInstanceOf(CunnektWhatsAppProvider);
  });
});

describe("CunnektWhatsAppProvider — request shape (confirmed /sendnotification endpoint)", () => {
  const originalApiKey = config.whatsapp.cunnektApiKey;
  const originalBaseUrl = config.whatsapp.cunnektBaseUrl;
  const originalApiVersion = config.whatsapp.cunnektApiVersion;
  const originalFetch = global.fetch;

  beforeEach(() => {
    config.whatsapp.cunnektApiKey = "sk_live_abcdef1234567890";
    config.whatsapp.cunnektBaseUrl = "https://app2.cunnekt.com/v1";
    config.whatsapp.cunnektApiVersion = "legacy";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.test" }] }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    config.whatsapp.cunnektApiKey = originalApiKey;
    config.whatsapp.cunnektBaseUrl = originalBaseUrl;
    config.whatsapp.cunnektApiVersion = originalApiVersion;
    global.fetch = originalFetch;
  });

  // Regression guard: this endpoint was wrongly guessed twice before being
  // confirmed against Cunnekt's real docs (see whatsapp.provider.ts class
  // doc comment) — this test fails loudly if it ever silently regresses.
  it("sends to {CUNNEKT_BASE_URL}/sendnotification, never /restapi/ or /whatsapp/sendtemplate", async () => {
    const provider = new CunnektWhatsAppProvider();

    await provider.sendTemplate({
      to: "+15551234567",
      templateId: "1036659577939498",
      variables: { customer_name: "Ada" },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = (global.fetch as jest.Mock).mock.calls[0];
    expect(calledUrl).toBe("https://app2.cunnekt.com/v1/sendnotification");
    expect(calledUrl).not.toContain("/restapi/");
    expect(calledUrl).not.toContain("/whatsapp/sendtemplate");
  });

  it("still uses /sendnotification even if a stale rest-v1 CUNNEKT_API_VERSION lingers in .env", async () => {
    config.whatsapp.cunnektApiVersion = "rest-v1";
    const provider = new CunnektWhatsAppProvider();

    await provider.sendTemplate({
      to: "+15551234567",
      templateId: "1036659577939498",
      variables: {},
    });

    const [calledUrl] = (global.fetch as jest.Mock).mock.calls[0];
    expect(calledUrl).toBe("https://app2.cunnekt.com/v1/sendnotification");
  });
});
