/**
 * N90: POST /api/media/upload(-multiple) passed req.body.folder into the storage path.
 * A client may only pick a plain public folder name, never a traversal or a private folder.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { signUp, cookie } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

describe("media upload folder", () => {
  it.each(["../escape", "events/../../x", "/etc", "C:\\x","certificates", "Booking-Attachments/x", "a".repeat(80), "a/b/c/d/e"])(
    "rejects folder %p with 400",
    async (folder) => {
      const v = await signUp(app, "vendor");
      for (const url of ["/api/media/upload", "/api/media/upload-multiple"]) {
        const field = url.endsWith("multiple") ? "files" : "file";
        const res = await request(app)
          .post(url)
          .set("Cookie", cookie(v))
          .set("X-CSRF-Token", v.csrfToken)
          .field("folder", folder)
          .attach(field, PNG, { filename: "a.png", contentType: "image/png" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/folder/i);
      }
    },
  );
});
