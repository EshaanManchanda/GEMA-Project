import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

/** OTP validity window. Keep in sync with any user-facing "valid for N minutes" copy. */
export const OTP_EXPIRY_MINUTES = 10;
/** Failed verify attempts allowed against a single OTP before it is locked out. */
export const MAX_OTP_ATTEMPTS = 5;
/** Minimum seconds between resend requests for the same verification cycle. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
/** Max resends allowed per verification cycle before the caller must start over. */
export const MAX_OTP_RESENDS = 3;

const OTP_HASH_SALT_ROUNDS = 10;

/**
 * Generate a cryptographically random 6-digit OTP code
 */
export const generateOTP = (): string => {
  return randomInt(100000, 1000000).toString();
};

/**
 * Hash an OTP for storage. Never persist the plaintext code.
 */
export const hashOTP = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, OTP_HASH_SALT_ROUNDS);
};

/**
 * Compare a plaintext OTP against its stored hash.
 */
export const verifyOTPHash = async (
  otp: string,
  otpHash: string,
): Promise<boolean> => {
  return bcrypt.compare(otp, otpHash);
};

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * Get OTP expiry date (OTP_EXPIRY_MINUTES from now)
 */
export const getOTPExpiry = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
};

/**
 * Whether a resend is allowed right now given the last send time.
 */
export const isResendOnCooldown = (lastSentAt?: Date): boolean => {
  if (!lastSentAt) return false;
  const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
  return elapsedMs < OTP_RESEND_COOLDOWN_SECONDS * 1000;
};
