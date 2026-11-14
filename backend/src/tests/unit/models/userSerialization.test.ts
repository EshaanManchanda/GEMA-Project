/**
 * res.json({ user }) calls User#toJSON. Beyond passwordHash and the OTP hashes it must not carry
 * the legacy plaintext reset token, the login history (IPs and user agents), 2FA secrets, the
 * Stripe secret or legacy bank details, even on a document that still holds them in memory
 * (select:false only protects documents loaded from the database).
 */
import User from "../../../models/User";

const build = () =>
  new User({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    passwordHash: "CANARY-HASH",
    role: "vendor",
    phone: "+971500000000",
    twoFactorAuth: {
      enabled: true,
      secret: "CANARY-2FA-SECRET",
      backupCodes: ["CANARY-BACKUP-1"],
    },
    passwordReset: {
      token: "CANARY-RESET-TOKEN",
      expiresAt: new Date(Date.now() + 3600_000),
    },
    passwordResetOTP: { otpHash: "CANARY-OTP-HASH", attempts: 1 },
    loginAttempts: [
      { ip: "203.0.113.9", userAgent: "CANARY-UA", success: true },
    ],
    vendorPaymentSettings: {
      hasCustomStripeAccount: true,
      stripeAccountId: "acct_public_id",
      stripeSecretKey: "sk_live_CANARY",
      preferredPayoutMethod: "bank_transfer",
      minimumPayout: 100,
      bankAccountDetails: {
        accountHolderName: "Ada",
        accountNumber: "CANARY-ACCT-123",
        iban: "CANARY-IBAN",
        swiftCode: "CANARYSWIFT",
      },
    },
  });

const json = () => JSON.parse(JSON.stringify(build())) as Record<string, any>;

describe("User#toJSON", () => {
  it.each([
    "CANARY-HASH",
    "CANARY-OTP-HASH",
    "CANARY-2FA-SECRET",
    "CANARY-BACKUP-1",
    "CANARY-RESET-TOKEN",
    "sk_live_CANARY",
    "CANARY-ACCT-123",
    "CANARY-IBAN",
    "CANARYSWIFT",
    "203.0.113.9",
    "CANARY-UA",
  ])("never contains %s", (canary) => {
    expect(JSON.stringify(build())).not.toContain(canary);
  });

  it("drops the sensitive keys themselves, not just their values", () => {
    const out = json();
    expect(out.passwordHash).toBeUndefined();
    expect(out.passwordReset?.token).toBeUndefined();
    expect(out.loginAttempts).toBeUndefined();
    expect(out.twoFactorAuth?.secret).toBeUndefined();
    expect(out.twoFactorAuth?.backupCodes).toBeUndefined();
    expect(out.vendorPaymentSettings?.stripeSecretKey).toBeUndefined();
    expect(out.vendorPaymentSettings?.bankAccountDetails).toBeUndefined();
  });

  it("keeps what the app shows the signed-in user", () => {
    const out = json();
    expect(out.firstName).toBe("Ada");
    expect(out.email).toBe("ada@example.com");
    expect(out.role).toBe("vendor");
    expect(out.phone).toBe("+971500000000");
    expect(out.twoFactorAuth.enabled).toBe(true);
    expect(out.vendorPaymentSettings.stripeAccountId).toBe("acct_public_id");
    expect(out.vendorPaymentSettings.preferredPayoutMethod).toBe(
      "bank_transfer",
    );
    expect(out.vendorPaymentSettings.minimumPayout).toBe(100);
  });

  it("does not change what the server itself reads from the document", () => {
    const doc = build();
    JSON.stringify(doc);
    expect(doc.passwordReset?.token).toBe("CANARY-RESET-TOKEN");
    expect(doc.loginAttempts?.[0].ip).toBe("203.0.113.9");
    expect(doc.vendorPaymentSettings?.bankAccountDetails?.accountNumber).toBe(
      "CANARY-ACCT-123",
    );
    expect(doc.twoFactorAuth.secret).toBe("CANARY-2FA-SECRET");
  });

  it("still works for a user with none of those fields", () => {
    const out = JSON.parse(
      JSON.stringify(
        new User({
          firstName: "B",
          email: "b@example.com",
          passwordHash: "x",
          role: "customer",
        }),
      ),
    );
    expect(out.email).toBe("b@example.com");
    expect(out.passwordHash).toBeUndefined();
  });
});
