/**
 * GET /api/uploads/files/* used to serve every file under the upload folder to anyone, including
 * certificate PDFs (children's names) and booking attachments. Private categories now need the
 * owner, an admin, or a server-signed expiring link; public images are unchanged.
 */
import "../setup/mocks";
import fs from "fs";
import path from "path";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Certificate from "../../../models/Certificate";
import Booking from "../../../models/Booking";
import { config } from "../../../config/env";
import { signUploadPath } from "../../../utils/uploadAccess";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, closeTestDB } from "../setup/testDB";
import {
  cookie,
  insertEvent,
  signUp,
  signUpAdmin,
  vendorIdOf,
  Session,
} from "../setup/session";

jest.setTimeout(90_000); // a cold ts-jest compile of the whole app happens inside beforeAll

// Fixtures live in a scratch upload root inside node_modules/.cache, so the tracked backend/uploads stays clean.
const ROOT_REL = path.join(
  "node_modules",
  ".cache",
  `private-uploads-test-${process.pid}`,
);
const ROOT = path.join(process.cwd(), ROOT_REL);
const PDF = "%PDF-1.4\n%%EOF\n";
const CERT = "certificates/certificate-1-1.pdf";
const ATTACH = "booking-attachments/booking-1-1.pdf";
const TICKET = "tickets/ticket-1-1.pdf";
const DOC = "documents/doc-1-1.pdf";
const REG = "registrations/reg-1-1.pdf";
const PUBLIC_IMG = "events/photo-1-1.jpg";
const url = (rel: string) => `/api/uploads/files/${rel}`;

let app: Application;
let originalPath: string;
let admin: Session;
let recipient: Session;
let stranger: Session;
let vendor: Session;
let otherVendor: Session;
let eventId: string;

const get = (rel: string, who?: Session) => {
  const r = request(app).get(url(rel));
  return who ? r.set("Cookie", cookie(who)) : r;
};

beforeAll(async () => {
  originalPath = config.upload.path;
  (config.upload as { path: string }).path = `${ROOT_REL}/`;
  for (const rel of [CERT, ATTACH, TICKET, DOC, REG, PUBLIC_IMG]) {
    fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, rel), PDF);
  }

  await connectTestDB();
  app = createTestApp();
  admin = await signUpAdmin(app);
  recipient = await signUp(app, "customer");
  stranger = await signUp(app, "customer");
  vendor = await signUp(app, "vendor");
  otherVendor = await signUp(app, "vendor");

  eventId = await insertEvent(await vendorIdOf(vendor), {
    bookingAttachments: [
      {
        originalName: "info.pdf",
        filename: "booking-1-1.pdf",
        url: url(ATTACH),
        provider: "local",
        mimetype: "application/pdf",
      },
    ],
  });
  await Certificate.collection.insertOne({
    _id: new Types.ObjectId(),
    templateId: new Types.ObjectId(),
    eventId: new Types.ObjectId(eventId),
    userId: new Types.ObjectId(recipient.userId),
    serialNumber: "CERT-PRIV-1",
    recipient: { name: "Kid A", email: "kid.a@example.com" },
    status: "generated",
    // stored as an absolute url: the base url of the day it was issued
    pdfUrl: `https://api.kidrove.com${url(CERT)}`,
    history: [],
  });
  await Booking.collection.insertOne({
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(recipient.userId),
    eventId: new Types.ObjectId(eventId),
    status: "confirmed",
  });
});
afterAll(async () => {
  (config.upload as { path: string }).path = originalPath;
  fs.rmSync(ROOT, { recursive: true, force: true });
  await closeTestDB();
});

describe("public images are unchanged", () => {
  it("serves an events image to anyone, cross-origin", async () => {
    const res = await get(PUBLIC_IMG);
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});

describe("certificates", () => {
  it("refuses anonymous visitors with 401", async () => {
    expect((await get(CERT)).status).toBe(401);
  });

  it("refuses a signed-in user who does not own it with 403", async () => {
    expect((await get(CERT, stranger)).status).toBe(403);
    expect((await get(CERT, otherVendor)).status).toBe(403);
  });

  it("lets the recipient, the event's vendor and an admin fetch it", async () => {
    for (const who of [recipient, vendor, admin]) {
      const res = await get(CERT, who);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
    }
  });

  it("never sends a wildcard CORS header or a cacheable response for a private file", async () => {
    const res = await get(CERT, recipient);
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
    expect(res.headers["cache-control"]).toMatch(/no-store/);
    expect(res.headers["cache-control"] ?? "").not.toMatch(/\bpublic\b/);
  });

  it("answers a missing private file exactly like an existing one for anonymous callers (no existence leak)", async () => {
    const missing = await get("certificates/does-not-exist.pdf");
    expect(missing.status).toBe(401);
  });
});

describe("booking attachments", () => {
  it("refuses anonymous visitors", async () => {
    expect((await get(ATTACH)).status).toBe(401);
  });

  it("refuses a user without a booking for that event, and another vendor", async () => {
    expect((await get(ATTACH, stranger)).status).toBe(403);
    expect((await get(ATTACH, otherVendor)).status).toBe(403);
  });

  it("lets a user with a booking, the event's vendor and an admin fetch it", async () => {
    for (const who of [recipient, vendor, admin])
      expect((await get(ATTACH, who)).status).toBe(200);
  });

  it("does not let a cancelled booking keep access", async () => {
    await Booking.collection.updateMany(
      { userId: new Types.ObjectId(recipient.userId) },
      { $set: { status: "cancelled" } },
    );
    try {
      expect((await get(ATTACH, recipient)).status).toBe(403);
    } finally {
      await Booking.collection.updateMany(
        { userId: new Types.ObjectId(recipient.userId) },
        { $set: { status: "confirmed" } },
      );
    }
  });
});

describe("categories nobody owns through a record (tickets, documents, registrations)", () => {
  it.each([TICKET, DOC, REG])(
    "%s: anonymous 401, signed-in customer 403, admin 200",
    async (rel) => {
      expect((await get(rel)).status).toBe(401);
      expect((await get(rel, recipient)).status).toBe(403);
      expect((await get(rel, admin)).status).toBe(200);
    },
  );
});

describe("signed links", () => {
  const signed = (rel: string, ttl = 3600, now = Date.now()) => {
    const { exp, sig } = signUploadPath(rel, ttl, now);
    return `${url(rel)}?exp=${exp}&sig=${sig}`;
  };

  it("open a private file for someone who is not signed in", async () => {
    const res = await request(app).get(signed(CERT));
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("stop working after they expire", async () => {
    const res = await request(app).get(signed(CERT, 60, Date.now() - 3600_000));
    expect([401, 403]).toContain(res.status);
  });

  it("do not work with a tampered signature or on another file", async () => {
    const good = signed(CERT);
    expect([401, 403]).toContain(
      (await request(app).get(good.replace(/sig=./, "sig=0"))).status,
    );
    const forOtherFile = signed(TICKET).replace(url(TICKET), url(CERT));
    expect([401, 403]).toContain((await request(app).get(forOtherFile)).status);
  });
});

describe("tricks to reach a private file through a public-looking path", () => {
  it.each([
    "/api/uploads/files/events/../certificates/certificate-1-1.pdf",
    "/api/uploads/files/certificates/./certificate-1-1.pdf",
    "/api/uploads/files//certificates/certificate-1-1.pdf",
    "/api/uploads/files/Certificates/certificate-1-1.pdf",
    "/api/uploads/files/CERTIFICATES/certificate-1-1.pdf",
    "/api/uploads/files/events/..%2fcertificates%2fcertificate-1-1.pdf",
    "/api/uploads/files/events/%2e%2e/certificates/certificate-1-1.pdf",
    "/api/uploads/files/../../package.json",
  ])("%s is never served anonymously", async (p) => {
    const res = await request(app).get(p);
    expect(res.status).not.toBe(200);
    expect(res.text ?? "").not.toContain("%PDF");
  });

  it("a signature for a public path does not unlock a private one", async () => {
    const { exp, sig } = signUploadPath(PUBLIC_IMG, 3600);
    const res = await request(app).get(`${url(CERT)}?exp=${exp}&sig=${sig}`);
    expect([401, 403]).toContain(res.status);
  });
});

describe("GET /api/uploads/list/:category", () => {
  it("is admin-only for private categories", async () => {
    for (const category of ["tickets", "documents"]) {
      expect(
        (
          await request(app)
            .get(`/api/uploads/list/${category}`)
            .set("Cookie", cookie(recipient))
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .get(`/api/uploads/list/${category}`)
            .set("Cookie", cookie(vendor))
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .get(`/api/uploads/list/${category}`)
            .set("Cookie", cookie(admin))
        ).status,
      ).toBe(200);
    }
  });

  it("still works for signed-in vendors on public categories (the file manager)", async () => {
    expect(
      (
        await request(app)
          .get("/api/uploads/list/events")
          .set("Cookie", cookie(vendor))
      ).status,
    ).toBe(200);
  });
});
