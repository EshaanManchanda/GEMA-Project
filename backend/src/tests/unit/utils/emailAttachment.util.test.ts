import { downloadFileAsAttachment, safePdfFilename } from "../../../utils/emailAttachment.util";

// Mock logger so tests don't produce console noise
jest.mock("../../../config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Helper to build a mock Response-like object for global fetch
function mockResponse(opts: {
  ok: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  body?: Buffer | string;
}): Response {
  const body = opts.body ? Buffer.from(opts.body) : Buffer.alloc(0);
  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 500),
    statusText: opts.statusText ?? (opts.ok ? "OK" : "Internal Server Error"),
    headers: {
      get: (name: string) => (name === "content-type" ? (opts.contentType ?? null) : null),
    },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as unknown as Response;
}

// ------------------------------------------------------------------
// safePdfFilename
// ------------------------------------------------------------------
describe("safePdfFilename", () => {
  it("TC8a uses recipient name when available", () => {
    expect(safePdfFilename("Jane Doe", "SN-001")).toBe("Certificate-Jane-Doe.pdf");
  });

  it("TC8b strips unsafe chars from name", () => {
    // "O'Brien & Co." → strip non-alnum → "OBrien  Co" → collapse spaces → "OBrien-Co"
    expect(safePdfFilename("O'Brien & Co.", "SN-001")).toBe("Certificate-OBrien-Co.pdf");
  });

  it("TC8c falls back to serial when name is empty", () => {
    expect(safePdfFilename("", "SN-001")).toBe("Certificate-SN-001.pdf");
  });

  it("TC8d falls back to static name when both are empty", () => {
    expect(safePdfFilename(null, null)).toBe("Certificate.pdf");
  });
});

// ------------------------------------------------------------------
// downloadFileAsAttachment
// ------------------------------------------------------------------
describe("downloadFileAsAttachment", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // TC5 — successful fetch (follows redirects natively; simulate direct 200)
  it("TC5 resolves bytes for a valid PDF response", async () => {
    const content = Buffer.from("%PDF-1.4 fake pdf content");
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "application/pdf", body: content }),
    );

    const result = await downloadFileAsAttachment(
      "https://cdn.example.com/cert.pdf",
      "Certificate-Jane.pdf",
      { expectedType: "application/pdf" },
    );

    expect(result).not.toBeNull();
    expect(result!.filename).toBe("Certificate-Jane.pdf");
    expect(result!.contentType).toBe("application/pdf");
    expect(result!.content).toEqual(content);
  });

  // TC6a — text/html rejected (the 200 SVG/HTML placeholder trap)
  it("TC6a rejects text/html response", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "text/html", body: "<html>Not Found</html>" }),
    );

    const result = await downloadFileAsAttachment("https://app.example.com/api/media/file/uuid", "cert.pdf");
    expect(result).toBeNull();
  });

  // TC6b — image/svg+xml rejected (200-OK SVG placeholder)
  it("TC6b rejects image/svg+xml response", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "image/svg+xml", body: "<svg/>" }),
    );

    const result = await downloadFileAsAttachment("https://app.example.com/api/media/file/uuid", "cert.pdf");
    expect(result).toBeNull();
  });

  // TC7 — zero-byte buffer rejected
  it("TC7 rejects zero-byte response", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "application/pdf", body: "" }),
    );

    const result = await downloadFileAsAttachment("https://cdn.example.com/cert.pdf", "cert.pdf");
    expect(result).toBeNull();
  });

  // TC9 — oversized payload rejected (>10 MB)
  it("TC9 rejects oversized attachment (>10 MB)", async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0x25); // 11 MB of '%'
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "application/pdf", body: oversized }),
    );

    const result = await downloadFileAsAttachment("https://cdn.example.com/cert.pdf", "cert.pdf");
    expect(result).toBeNull();
  });

  // TC4 — non-ok HTTP response (Cloudinary 404) → returns null, does not throw
  it("TC4 returns null on non-ok response after retries, never throws", async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 404, statusText: "Not Found", contentType: "text/html" }));

    const promise = downloadFileAsAttachment("https://cdn.example.com/missing.pdf", "cert.pdf");
    // Fast-forward through all retry delays (1s + 2s + 4s)
    jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3); // 3 attempts
  });

  // TC4b — network error → returns null, does not throw
  it("TC4b returns null on network error after retries, never throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const promise = downloadFileAsAttachment("https://cdn.example.com/cert.pdf", "cert.pdf");
    jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // unexpected MIME when expectedType is specified
  it("rejects unexpected MIME type when expectedType is set", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "image/png", body: Buffer.from("fake png") }),
    );

    const result = await downloadFileAsAttachment(
      "https://cdn.example.com/image.png",
      "cert.pdf",
      { expectedType: "application/pdf" },
    );
    expect(result).toBeNull();
  });

  // application/octet-stream is accepted as generic fallback even when expectedType is set
  it("accepts application/octet-stream as generic fallback", async () => {
    const content = Buffer.from("%PDF-1.4 octet stream pdf");
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, contentType: "application/octet-stream", body: content }),
    );

    const result = await downloadFileAsAttachment(
      "https://cdn.example.com/cert.pdf",
      "cert.pdf",
      { expectedType: "application/pdf" },
    );
    // octet-stream is accepted; contentType returned is the expectedType
    expect(result).not.toBeNull();
    expect(result!.contentType).toBe("application/pdf");
  });
});
