/**
 * Endpoints that return the signed-in user's own record must not carry the legacy reset token,
 * login history (IP + user agent), legacy bank details or other secrets that sit on the same document.
 */
import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import User from "../../../models/User";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, closeTestDB } from "../setup/testDB";
import { cookie, signUp, Session } from "../setup/session";

jest.setTimeout(90_000);

const CANARIES = [
  "CANARY-RESET-TOKEN",
  "CANARY-ACCT-123",
  "CANARY-IBAN",
  "CANARY-UA-HISTORY",
  "198.51.100.7",
];

let app: Application;
let vendor: Session;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
  vendor = await signUp(app, "vendor");
  await User.collection.updateOne({ _id: new Types.ObjectId(vendor.userId) }, {
    $set: {
      passwordReset: {
        token: "CANARY-RESET-TOKEN",
        expiresAt: new Date(Date.now() + 3600_000),
      },
      vendorPaymentSettings: {
        bankAccountDetails: {
          accountHolderName: "V",
          accountNumber: "CANARY-ACCT-123",
          iban: "CANARY-IBAN",
        },
      },
    },
    $push: {
      loginAttempts: {
        timestamp: new Date(),
        ip: "198.51.100.7",
        userAgent: "CANARY-UA-HISTORY",
        success: true,
      },
    },
  } as any);
});
afterAll(closeTestDB);

const expectClean = (res: request.Response) => {
  const text = JSON.stringify(res.body);
  for (const canary of CANARIES) expect(text).not.toContain(canary);
  expect(text).not.toContain('"loginAttempts"');
  expect(text).not.toContain('"passwordHash"');
};

describe("the signed-in user's own record", () => {
  it.each(["/api/auth/me", "/api/auth/profile"])(
    "GET %s carries no secrets, login history or legacy bank details",
    async (url) => {
      const res = await request(app).get(url).set("Cookie", cookie(vendor));
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).toContain("firstName"); // it did return the user, so the checks below mean something
      expectClean(res);
    },
  );

  it("the login response carries none either", async () => {
    const doc = await User.findById(vendor.userId).select("email").lean();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: doc!.email, password: "Test@1234!" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain("firstName");
    expectClean(res);
  });
});
