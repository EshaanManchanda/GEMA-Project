/**
 * Phone number utility functions
 */

/**
 * Sanitize phone number to E.164 format
 * Removes all non-digit characters except the leading +
 * @param phone - Phone number in any format
 * @returns Sanitized phone number or null if invalid
 */
export const sanitizePhoneNumber = (phone: string): string | null => {
  if (!phone) return null;

  // Trim whitespace
  let sanitized = phone.trim();

  // Remove all characters except digits and +
  sanitized = sanitized.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!sanitized.startsWith("+")) {
    // If no +, assume it's missing and add it
    // This is a basic assumption - in production you might want to be more strict
    return null; // Or return `+${sanitized}` if you want to be lenient
  }

  // Validate E.164 format: + followed by 8-15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Validate if phone number is in E.164 format
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
};

/**
 * Format phone number for display
 * @param phone - Phone number in E.164 format
 * @returns Formatted phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";

  // Basic formatting: +X (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 11) {
    // US/Canada format: +1 (234) 567-8900
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length >= 10) {
    // International format: +XX XXX XXX XXXX
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(-10);
    return `+${countryCode} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }

  return phone;
};
