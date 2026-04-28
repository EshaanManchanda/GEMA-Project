/**
 * Enhanced phone number validation utilities using libphonenumber-js
 */
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
  PhoneNumber,
} from "libphonenumber-js";
import User from "../models/User";

/**
 * Result of phone validation
 */
export interface PhoneValidationResult {
  isValid: boolean;
  phoneNumber?: PhoneNumber;
  e164Format?: string;
  country?: CountryCode;
  nationalNumber?: string;
  isMobile?: boolean;
  error?: string;
  errorCode?: PhoneValidationError;
}

/**
 * Error codes for phone validation
 */
export enum PhoneValidationError {
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_COUNTRY = "INVALID_COUNTRY",
  NOT_MOBILE = "NOT_MOBILE",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  TOO_SHORT = "TOO_SHORT",
  TOO_LONG = "TOO_LONG",
  INVALID_LENGTH = "INVALID_LENGTH",
  UNKNOWN = "UNKNOWN",
}

/**
 * Parse and validate phone number with detailed information
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code to use if not in international format
 * @returns Validation result with detailed information
 */
export const validatePhoneNumber = (
  phone: string,
  defaultCountry?: CountryCode,
): PhoneValidationResult => {
  if (!phone || typeof phone !== "string") {
    return {
      isValid: false,
      error: "Phone number is required",
      errorCode: PhoneValidationError.INVALID_FORMAT,
    };
  }

  try {
    // Try to parse the phone number
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);

    if (!phoneNumber) {
      return {
        isValid: false,
        error:
          "Unable to parse phone number. Please use international format (e.g., +1234567890)",
        errorCode: PhoneValidationError.INVALID_FORMAT,
      };
    }

    // Validate the phone number
    const valid = phoneNumber.isValid();

    if (!valid) {
      // Determine the specific error
      const possibleLengths = phoneNumber.getPossibleCountries();

      if (possibleLengths.length === 0) {
        return {
          isValid: false,
          error: `Invalid phone number for ${phoneNumber.country || "the provided country"}`,
          errorCode: PhoneValidationError.INVALID_COUNTRY,
        };
      }

      return {
        isValid: false,
        error: "Invalid phone number length or format",
        errorCode: PhoneValidationError.INVALID_LENGTH,
      };
    }

    // Check if it's a mobile number
    const type = phoneNumber.getType();

    // For numbers where type is undefined (common in countries like India where
    // libphonenumber-js lacks detailed type metadata), we assume it's mobile
    // if it's valid and follows the country's mobile number pattern
    let isMobile = type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE";

    // Special handling for undefined types - assume mobile for certain countries
    // where the library doesn't have detailed metadata
    if (!isMobile && !type) {
      // For India and similar countries, 10-digit numbers starting with 6-9
      // are typically mobile numbers
      if (phoneNumber.country === "IN") {
        const firstDigit = phoneNumber.nationalNumber?.charAt(0);
        isMobile =
          ["6", "7", "8", "9"].includes(firstDigit || "") &&
          phoneNumber.nationalNumber?.length === 10;
      } else {
        // For other countries with undefined type, assume mobile if valid
        // since most modern phone numbers receiving SMS are mobile
        isMobile = true;
      }
    }

    return {
      isValid: true,
      phoneNumber,
      e164Format: phoneNumber.number, // E.164 format: +1234567890
      country: phoneNumber.country,
      nationalNumber: phoneNumber.nationalNumber,
      isMobile,
    };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error ? error.message : "Invalid phone number format",
      errorCode: PhoneValidationError.UNKNOWN,
    };
  }
};

/**
 * Check if phone number is mobile (not landline)
 * Note: For countries where type metadata is unavailable (returns UNKNOWN),
 * this function uses heuristics to determine if a number is mobile
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code
 * @returns true if mobile, false otherwise
 */
export const isMobileNumber = (
  phone: string,
  defaultCountry?: CountryCode,
): boolean => {
  const result = validatePhoneNumber(phone, defaultCountry);
  return result.isValid && result.isMobile === true;
};

/**
 * Check if phone number already exists in database
 * @param phone - Phone number in E.164 format
 * @param excludeUserId - User ID to exclude from check (for updates)
 * @returns true if phone exists, false otherwise
 */
export const isPhoneNumberDuplicate = async (
  phone: string,
  excludeUserId?: string,
): Promise<boolean> => {
  try {
    const query: any = { phone };

    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query);
    return !!existingUser;
  } catch (error) {
    console.error("Error checking phone duplicate:", error);
    return false;
  }
};

/**
 * Comprehensive phone validation for API endpoints
 * @param phone - Phone number in any format
 * @param options - Validation options
 * @returns Validation result with detailed error messages
 */
export const validatePhoneForAPI = async (
  phone: string,
  options: {
    requireMobile?: boolean;
    checkDuplicate?: boolean;
    excludeUserId?: string;
    defaultCountry?: CountryCode;
  } = {},
): Promise<PhoneValidationResult> => {
  const {
    requireMobile = true,
    checkDuplicate = true,
    excludeUserId,
    defaultCountry,
  } = options;

  // Basic validation
  const validation = validatePhoneNumber(phone, defaultCountry);

  if (!validation.isValid) {
    return validation;
  }

  // Check if mobile is required
  if (requireMobile && !validation.isMobile) {
    return {
      isValid: false,
      error:
        "Only mobile phone numbers are allowed. Landline numbers cannot receive SMS verification codes.",
      errorCode: PhoneValidationError.NOT_MOBILE,
    };
  }

  // Check for duplicates
  if (checkDuplicate && validation.e164Format) {
    const isDuplicate = await isPhoneNumberDuplicate(
      validation.e164Format,
      excludeUserId,
    );

    if (isDuplicate) {
      return {
        isValid: false,
        error: "This phone number is already registered to another account",
        errorCode: PhoneValidationError.ALREADY_EXISTS,
      };
    }
  }

  return validation;
};

/**
 * Format phone number for display
 * @param phone - Phone number in any format
 * @param format - Display format ('INTERNATIONAL' | 'NATIONAL' | 'E164' | 'RFC3966')
 * @returns Formatted phone number or original if parsing fails
 */
export const formatPhoneForDisplay = (
  phone: string,
  format: "INTERNATIONAL" | "NATIONAL" | "E.164" | "RFC3966" = "INTERNATIONAL",
): string => {
  if (!phone) return "";

  try {
    const phoneNumber = parsePhoneNumber(phone);

    if (!phoneNumber) return phone;

    return phoneNumber.format(format);
  } catch {
    return phone;
  }
};

/**
 * Sanitize phone number to E.164 format
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code
 * @returns E.164 formatted phone number or null if invalid
 */
export const sanitizeToE164 = (
  phone: string,
  defaultCountry?: CountryCode,
): string | null => {
  const validation = validatePhoneNumber(phone, defaultCountry);
  return validation.isValid ? validation.e164Format! : null;
};

/**
 * Get country-specific example phone number
 * @param country - Country code
 * @returns Example phone number for the country
 */
export const getExamplePhoneNumber = (country: CountryCode): string => {
  try {
    const examples: Record<string, string> = {
      US: "+1 (234) 567-8900",
      GB: "+44 7400 123456",
      IN: "+91 98765 43210",
      CA: "+1 (234) 567-8900",
      AU: "+61 4 1234 5678",
      FR: "+33 6 12 34 56 78",
      DE: "+49 151 23456789",
      ES: "+34 612 34 56 78",
      IT: "+39 312 345 6789",
      BR: "+55 11 91234-5678",
      MX: "+52 1 234 567 8900",
      JP: "+81 90-1234-5678",
      CN: "+86 138 0123 4567",
      KR: "+82 10-1234-5678",
    };

    return examples[country] || `+${country} 123456789`;
  } catch {
    return "+1 234 567 8900";
  }
};

/**
 * Get detailed error message for phone validation
 * @param errorCode - Error code from validation
 * @param country - Country code for context
 * @returns User-friendly error message
 */
export const getPhoneValidationErrorMessage = (
  errorCode: PhoneValidationError,
  country?: CountryCode,
): string => {
  const countryName = country || "your country";
  const exampleNumber = country
    ? getExamplePhoneNumber(country)
    : "+1 234 567 8900";

  switch (errorCode) {
    case PhoneValidationError.INVALID_FORMAT:
      return `Please enter a valid phone number in international format. Example: ${exampleNumber}`;

    case PhoneValidationError.INVALID_COUNTRY:
      return `Invalid phone number for ${countryName}. Please check the country code and number.`;

    case PhoneValidationError.NOT_MOBILE:
      return "Only mobile phone numbers are allowed. Landline numbers cannot receive SMS verification codes.";

    case PhoneValidationError.ALREADY_EXISTS:
      return "This phone number is already registered to another account.";

    case PhoneValidationError.TOO_SHORT:
      return `Phone number is too short for ${countryName}. Example: ${exampleNumber}`;

    case PhoneValidationError.TOO_LONG:
      return `Phone number is too long for ${countryName}. Example: ${exampleNumber}`;

    case PhoneValidationError.INVALID_LENGTH:
      return `Invalid phone number length for ${countryName}. Example: ${exampleNumber}`;

    default:
      return `Invalid phone number format. Please use international format (e.g., ${exampleNumber})`;
  }
};

/**
 * Extract country code from phone number
 * @param phone - Phone number in any format
 * @returns Country code or null
 */
export const extractCountryCode = (phone: string): CountryCode | null => {
  const validation = validatePhoneNumber(phone);
  return validation.country || null;
};

/**
 * Check if phone number is valid E.164 format
 * @param phone - Phone number to check
 * @returns true if valid E.164, false otherwise
 */
export const isE164Format = (phone: string): boolean => {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
};
