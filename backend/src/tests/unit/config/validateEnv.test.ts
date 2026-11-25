/**
 * Production must refuse to start without the secrets that protect money and data
 * (owner decision 25 Nov 2026): FIELD_ENCRYPTION_KEY, Stripe keys, Firebase admin.
 */
import { validateEnv } from "../../../config/env";

const KEY = "k".repeat(64);
const prodEnv = (over: Record<string, string | undefined> = {}): NodeJS.ProcessEnv => ({
  MONGODB_URI: "mongodb://x",
  JWT_SECRET: "a".repeat(40),
  JWT_REFRESH_SECRET: "b".repeat(40),
  SESSION_SECRET: "s".repeat(40),
  FIELD_ENCRYPTION_KEY: KEY,
  STRIPE_SECRET_KEY: "sk_live_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  FIREBASE_PROJECT_ID: "p",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----x",
  FIREBASE_CLIENT_EMAIL: "f@p.iam.gserviceaccount.com",
  ...over,
});

describe("validateEnv in production", () => {
  it("accepts a complete configuration", () => {
    expect(() => validateEnv(prodEnv(), true)).not.toThrow();
  });

  it.each(["FIELD_ENCRYPTION_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL"])(
    "refuses to start without %s",
    (name) => {
      expect(() => validateEnv(prodEnv({ [name]: undefined }), true)).toThrow(name);
      expect(() => validateEnv(prodEnv({ [name]: "   " }), true)).toThrow(name);
    },
  );

  it("refuses a short encryption key", () => {
    expect(() => validateEnv(prodEnv({ FIELD_ENCRYPTION_KEY: "short" }), true)).toThrow(/FIELD_ENCRYPTION_KEY/);
  });

  it("names every missing setting in one message", () => {
    expect(() => validateEnv(prodEnv({ FIELD_ENCRYPTION_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }), true)).toThrow(
      /FIELD_ENCRYPTION_KEY[\s\S]*STRIPE_WEBHOOK_SECRET/,
    );
  });

  it("development still starts without them", () => {
    expect(() =>
      validateEnv(prodEnv({ FIELD_ENCRYPTION_KEY: undefined, STRIPE_SECRET_KEY: undefined, FIREBASE_PROJECT_ID: undefined }), false),
    ).not.toThrow();
  });
});
