/**
 * Generate a cryptographically random 6-digit OTP code
 */
export const generateOTP = (): string => {
  const { randomInt } = require("crypto");
  return randomInt(100000, 1000000).toString();
};

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * Get OTP expiry date (5 minutes from now)
 */
export const getOTPExpiry = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5);
  return expiry;
};
