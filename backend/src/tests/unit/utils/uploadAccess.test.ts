/**
 * Private upload files (certificates, tickets, booking attachments, ...) are only fetched by their
 * owner, an admin, or someone holding a server-signed expiring link. These tests pin the pieces:
 * which paths are private, and how a link is signed and checked.
 */
import { config } from "../../../config/env";
import {
  isPrivateUploadPath,
  signUploadPath,
  verifyUploadSignature,
  signedUploadUrl,
} from "../../../utils/uploadAccess";

const NOW = 1_800_000_000_000; // fixed clock, ms
const REL = "certificates/certificate-1779428686332-846512660.pdf";

describe("isPrivateUploadPath", () => {
  it.each([
    "certificates/a.pdf",
    "booking-attachments/b.pdf",
    "registrations/c.pdf",
    "tickets/d.pdf",
    "documents/e.pdf",
  ])("%s is private", (p) => expect(isPrivateUploadPath(p)).toBe(true));

  it.each(["Certificates/a.pdf", "TICKETS/d.pdf", "Documents/e.pdf"])(
    "%s is private whatever the letter case (case-insensitive file systems)",
    (p) => expect(isPrivateUploadPath(p)).toBe(true),
  );

  it.each([
    "events/a.jpg",
    "venues/a.jpg",
    "users/a.jpg",
    "profile.avatars/a.jpg",
    "collections.icons/a.png",
    "category-icons/a.png",
    "teaching-events/a.jpg",
    "blogs/a.jpg",
    "misc/a.jpg",
  ])("%s stays public (images shown on public pages)", (p) =>
    expect(isPrivateUploadPath(p)).toBe(false),
  );

  it("does not treat a public folder with a private-looking file name as private", () => {
    expect(isPrivateUploadPath("events/certificates.jpg")).toBe(false);
    expect(isPrivateUploadPath("events/tickets/a.jpg")).toBe(false);
  });
});

describe("signed upload links", () => {
  it("round-trips: a freshly signed path verifies", () => {
    const { exp, sig } = signUploadPath(REL, 3600, NOW);
    expect(verifyUploadSignature(REL, exp, sig, NOW)).toBe(true);
  });

  it("expires: the same link fails after its expiry second", () => {
    const { exp, sig } = signUploadPath(REL, 3600, NOW);
    expect(verifyUploadSignature(REL, exp, sig, NOW + 3600_000 - 1)).toBe(true);
    expect(verifyUploadSignature(REL, exp, sig, NOW + 3600_000 + 1000)).toBe(
      false,
    );
  });

  it("is bound to the path: a link for one file does not open another", () => {
    const { exp, sig } = signUploadPath(REL, 3600, NOW);
    expect(verifyUploadSignature("certificates/other.pdf", exp, sig, NOW)).toBe(
      false,
    );
    expect(
      verifyUploadSignature(
        "tickets/certificate-1779428686332-846512660.pdf",
        exp,
        sig,
        NOW,
      ),
    ).toBe(false);
  });

  it("is bound to the expiry: extending exp invalidates the signature", () => {
    const { exp, sig } = signUploadPath(REL, 3600, NOW);
    expect(verifyUploadSignature(REL, exp + 86_400, sig, NOW)).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["too short", "abcd"],
    ["wrong length", "a".repeat(63)],
    ["not hex", "z".repeat(64)],
    ["a flipped digit", "0".repeat(64)],
  ])("rejects a malformed or forged signature (%s)", (_name, bad) => {
    const { exp } = signUploadPath(REL, 3600, NOW);
    expect(verifyUploadSignature(REL, exp, bad, NOW)).toBe(false);
  });

  it.each([NaN, Infinity, -1, 0, "soon" as unknown as number])(
    "rejects a bad expiry (%s)",
    (badExp) => {
      const { sig } = signUploadPath(REL, 3600, NOW);
      expect(verifyUploadSignature(REL, badExp as number, sig, NOW)).toBe(
        false,
      );
    },
  );

  it("depends on the server secret: a different secret cannot verify (and the secret is not the raw JWT secret)", () => {
    const { exp, sig } = signUploadPath(REL, 3600, NOW);
    const original = config.jwtSecret;
    try {
      (config as { jwtSecret: string }).jwtSecret = `${original}-rotated`;
      expect(verifyUploadSignature(REL, exp, sig, NOW)).toBe(false);
    } finally {
      (config as { jwtSecret: string }).jwtSecret = original;
    }
    // domain separation: signing the bare path with the JWT secret must not produce a valid link
    const crypto = jest.requireActual("crypto") as typeof import("crypto");
    const naive = crypto
      .createHmac("sha256", config.jwtSecret)
      .update(`${REL}\n${exp}`)
      .digest("hex");
    expect(verifyUploadSignature(REL, exp, naive, NOW)).toBe(false);
  });
});

describe("signedUploadUrl", () => {
  it("adds exp and sig to a private local url and the result verifies", () => {
    const url = signedUploadUrl(`/api/uploads/files/${REL}`, 3600, NOW);
    const u = new URL(url, "http://x.test");
    expect(u.pathname).toBe(`/api/uploads/files/${REL}`);
    expect(
      verifyUploadSignature(
        REL,
        Number(u.searchParams.get("exp")),
        u.searchParams.get("sig") ?? "",
        NOW,
      ),
    ).toBe(true);
  });

  it("keeps the host of an absolute local url", () => {
    const url = signedUploadUrl(
      `https://api.kidrove.com/api/uploads/files/${REL}`,
      3600,
      NOW,
    );
    expect(
      url.startsWith(`https://api.kidrove.com/api/uploads/files/${REL}?exp=`),
    ).toBe(true);
  });

  it("leaves public local urls, Cloudinary urls, empty values and non-upload urls untouched", () => {
    for (const u of [
      "/api/uploads/files/events/a.jpg",
      "https://res.cloudinary.com/demo/raw/upload/v1/gema/certificates/a.pdf",
      "https://example.com/files/certificates/a.pdf",
      "",
    ]) {
      expect(signedUploadUrl(u, 3600, NOW)).toBe(u);
    }
  });

  it("does not sign a url that tries to climb out of the upload folder", () => {
    const bad = "/api/uploads/files/certificates/../../etc/passwd";
    expect(signedUploadUrl(bad, 3600, NOW)).toBe(bad);
  });
});
