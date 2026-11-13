import {
  MailchimpProvider,
  SenderProvider,
} from "../../services/communication/providers/emailMarketing.provider";
import type { EmailMarketingConfig } from "../../services/communication/emailMarketingConfig.service";

const base: EmailMarketingConfig = {
  provider: "dev",
  senderApiKey: "sender-key",
  senderListId: "list-1",
  senderWebhookSecret: "",
  mailchimpApiKey: "abc123-us21",
  mailchimpServerPrefix: "",
  mailchimpAudienceId: "aud1",
  mailchimpWebhookSecret: "",
};

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

const ok = (body: any = {}) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, body: any = {}) => ({ ok: false, status, json: async () => body });

describe("MailchimpProvider", () => {
  it("hashes the lowercase email with md5 (Mailchimp subscriber hash)", () => {
    expect(MailchimpProvider.memberHash("  Foo@Example.COM ")).toBe(
      "b48def645758b95537d4424c84d1a9ff",
    );
  });

  it("upserts via PUT with Basic auth, derived prefix and merge fields", async () => {
    fetchMock.mockResolvedValue(ok({ id: "m1" }));
    const res = await new MailchimpProvider(base).upsertContact({
      email: "Foo@Example.com",
      firstName: "Foo",
      tags: ["newsletter"],
      mergeFields: { CITY: "Dubai" },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://us21.api.mailchimp.com/3.0/lists/aud1/members/b48def645758b95537d4424c84d1a9ff",
    );
    expect(init.method).toBe("PUT");
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from("anystring:abc123-us21").toString("base64")}`,
    );
    expect(JSON.parse(init.body)).toMatchObject({
      status_if_new: "subscribed",
      tags: ["newsletter"],
      merge_fields: { CITY: "Dubai", FNAME: "Foo" },
    });
    expect(res).toMatchObject({ success: true, providerContactId: "m1" });
  });

  it("treats unsubscribing a contact that isn't in the audience as success", async () => {
    fetchMock.mockResolvedValue(fail(404));
    expect((await new MailchimpProvider(base).unsubscribeContact("a@b.co")).success).toBe(true);
  });

  it("marks 429/5xx retryable and 4xx not", async () => {
    fetchMock.mockResolvedValueOnce(fail(503)).mockResolvedValueOnce(fail(400));
    const p = new MailchimpProvider(base);
    expect((await p.upsertContact({ email: "a@b.co" })).isRetryable).toBe(true);
    expect((await p.upsertContact({ email: "a@b.co" })).isRetryable).toBe(false);
  });

  it("deactivates tags with status inactive", async () => {
    fetchMock.mockResolvedValue(ok());
    await new MailchimpProvider(base).removeTags("a@b.co", ["x"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      tags: [{ name: "x", status: "inactive" }],
    });
  });

  it.each(["evil.com/#", "us21.evil.com", "us21@evil.com", "US21", "u", "us21/../x", "a b"])(
    "rejects a server prefix that could redirect the API key to another host: %s",
    (prefix) => {
      expect(() => new MailchimpProvider({ ...base, mailchimpServerPrefix: prefix })).toThrow(/prefix/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a hostile prefix smuggled in through the API key suffix", () => {
    expect(
      () => new MailchimpProvider({ ...base, mailchimpApiKey: "abc-evil.com/#", mailchimpServerPrefix: "" }),
    ).toThrow(/prefix/i);
  });

  it.each(["aud/../../x", "aud?x=1", "aud id", "aud#"])(
    "rejects an audience id that could alter the request path: %s",
    (audienceId) => {
      expect(() => new MailchimpProvider({ ...base, mailchimpAudienceId: audienceId })).toThrow(/audience/i);
    },
  );

  it("requires key, audience and a resolvable prefix", () => {
    expect(() => new MailchimpProvider({ ...base, mailchimpApiKey: "" })).toThrow();
    expect(() => new MailchimpProvider({ ...base, mailchimpApiKey: "nodash" })).toThrow();
  });
});

describe("SenderProvider", () => {
  it("resolves tag group ids (creating missing ones) and sends them with the default list", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ data: [{ id: "g1", title: "newsletter" }] })) // GET /groups
      .mockResolvedValueOnce(ok({ data: { id: "g2" } })) // POST /groups (booked:camp)
      .mockResolvedValueOnce(ok({ data: { id: "s1" } })); // POST /subscribers

    const res = await new SenderProvider(base).upsertContact({
      email: "a@b.co",
      tags: ["newsletter", "booked:camp"],
      mergeFields: { CITY: "Dubai" },
    });

    expect(fetchMock.mock.calls[2][0]).toBe("https://api.sender.net/v2/subscribers");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
      email: "a@b.co",
      groups: ["list-1", "g1", "g2"],
      fields: { CITY: "Dubai" },
    });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer sender-key");
    expect(res).toMatchObject({ success: true, providerContactId: "s1" });
  });

  it("removeTags only removes the named groups", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ data: [{ id: "g1", title: "x" }] }))
      .mockResolvedValueOnce(ok());
    await new SenderProvider(base).removeTags("a@b.co", ["x"]);
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.sender.net/v2/subscribers/groups/g1");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("requires an API key", () => {
    expect(() => new SenderProvider({ ...base, senderApiKey: "" })).toThrow();
  });
});
