/**
 * Uploaded SVG/XML/HTML is served from our API origin; a script inside it
 * must not run there. Such responses get a sandboxing CSP + nosniff, while
 * PDFs keep rendering in-browser (Chrome refuses sandboxed PDFs).
 */
import fs from "fs";
import path from "path";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import MediaAsset from "../../../models/MediaAsset";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));

const dir = path.join(process.cwd(), process.env.UPLOAD_PATH || "uploads/", "__active_content_test__");
const evilSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.domain)</script></svg>';

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "evil.svg"), evilSvg);
  fs.writeFileSync(path.join(dir, "doc.pdf"), "%PDF-1.4\n%%EOF\n");
});
afterEach(clearTestDB);
afterAll(async () => {
  fs.rmSync(dir, { recursive: true, force: true });
  await closeTestDB();
});

const expectSandboxed = (res: request.Response) => {
  expect(res.headers["content-security-policy"]).toMatch(/sandbox/);
  expect(res.headers["x-content-type-options"]).toBe("nosniff");
};

it("uploads/files serves SVG sandboxed", async () => {
  const res = await request(app).get("/api/uploads/files/__active_content_test__/evil.svg");
  expect(res.status).toBe(200);
  expectSandboxed(res);
});

it("uploads/files still serves PDFs without a sandbox", async () => {
  const res = await request(app).get("/api/uploads/files/__active_content_test__/doc.pdf");
  expect(res.status).toBe(200);
  expect(res.headers["content-security-policy"] ?? "").not.toMatch(/sandbox/);
});

it("media/file serves a local SVG asset sandboxed", async () => {
  const uuid = "11111111-2222-3333-4444-555555555555";
  await MediaAsset.collection.insertOne({
    _id: new Types.ObjectId(),
    uuid,
    filename: "evil.svg",
    originalName: "evil.svg",
    mimeType: "image/svg+xml",
    provider: "local",
    localPath: "__active_content_test__/evil.svg",
    isPublic: true,
  });

  const res = await request(app).get(`/api/media/file/${uuid}`);
  expect(res.status).toBe(200);
  expectSandboxed(res);
});
