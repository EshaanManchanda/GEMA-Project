/**
 * Enhanced phone number utilities for frontend using libphonenumber-js
 */
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
  PhoneNumber,
  AsYouType,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

/**
 * Parse and validate phone number
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code if not in international format
 * @returns Parsed phone number or null
 */
export const parsePhone = (phone: string, defaultCountry?: CountryCode): PhoneNumber | null => {
  if (!phone) return null;

  try {
    return parsePhoneNumber(phone, defaultCountry);
  } catch {
    return null;
  }
};

/**
 * Validate phone number
 * @param phone - Phone number to validate
 * @param defaultCountry - Default country code
 * @returns true if valid, false otherwise
 */
export const isValidPhone = (phone: string, defaultCountry?: CountryCode): boolean => {
  if (!phone) return false;

  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    return phoneNumber ? phoneNumber.isValid() : false;
  } catch {
    return false;
  }
};

/**
 * Format phone number as user types (auto-formatting)
 * @param value - Current input value
 * @param country - Country code for formatting
 * @returns Formatted phone number
 */
export const formatPhoneAsYouType = (value: string, country?: CountryCode): string => {
  if (!value) return '';

  try {
    const formatter = new AsYouType(country);
    return formatter.input(value);
  } catch {
    return value;
  }
};

/**
 * Format phone number for display
 * @param phone - Phone number in any format
 * @param format - Display format
 * @returns Formatted phone number
 */
export const formatPhoneForDisplay = (
  phone: string,
  format: 'INTERNATIONAL' | 'NATIONAL' | 'E.164' | 'RFC3966' = 'INTERNATIONAL'
): string => {
  if (!phone) return '';

  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber ? phoneNumber.format(format) : phone;
  } catch {
    return phone;
  }
};

/**
 * Convert phone to E.164 format
 * @param phone - Phone number in any format
 * @param defaultCountry - Default country code
 * @returns E.164 formatted phone or null
 */
export const toE164 = (phone: string, defaultCountry?: CountryCode): string | null => {
  if (!phone) return null;

  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    return phoneNumber && phoneNumber.isValid() ? phoneNumber.number : null;
  } catch {
    return null;
  }
};

/**
 * Extract country code from phone number
 * @param phone - Phone number
 * @returns Country code or null
 */
export const getPhoneCountry = (phone: string): CountryCode | null => {
  if (!phone) return null;

  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber?.country || null;
  } catch {
    return null;
  }
};

/**
 * Get national number (without country code)
 * @param phone - Phone number
 * @returns National number or empty string
 */
export const getNationalNumber = (phone: string): string => {
  if (!phone) return '';

  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber?.nationalNumber || '';
  } catch {
    return '';
  }
};

/**
 * Check if phone is mobile number
 * @param phone - Phone number
 * @returns true if mobile, false otherwise
 */
export const isMobilePhone = (phone: string): boolean => {
  if (!phone) return false;

  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (!phoneNumber) return false;

    const type = phoneNumber.getType();
    let isMobile = type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';

    // Special handling for undefined types (no metadata available)
    if (!isMobile && !type) {
      if (phoneNumber.country === 'IN') {
        const firstDigit = phoneNumber.nationalNumber?.charAt(0);
        isMobile = ['6', '7', '8', '9'].includes(firstDigit || '') &&
                   phoneNumber.nationalNumber?.length === 10;
      } else {
        isMobile = true;
      }
    }

    return isMobile;
  } catch {
    return false;
  }
};

/**
 * Get example phone number for a country
 * @param country - Country code
 * @returns Example phone number
 */
export const getExamplePhone = (country: CountryCode): string => {
  const examples: Record<string, string> = {
    US: '+1 (234) 567-8900',
    GB: '+44 7400 123456',
    IN: '+91 98765 43210',
    CA: '+1 (234) 567-8900',
    AU: '+61 4 1234 5678',
    FR: '+33 6 12 34 56 78',
    DE: '+49 151 23456789',
    ES: '+34 612 34 56 78',
    IT: '+39 312 345 6789',
    BR: '+55 11 91234-5678',
    MX: '+52 1 234 567 8900',
    JP: '+81 90-1234-5678',
    CN: '+86 138 0123 4567',
    KR: '+82 10-1234-5678',
  };

  return examples[country] || `+${getCountryCallingCode(country)} 123456789`;
};

/**
 * Get country name from country code
 * @param country - Country code
 * @returns Country name
 */
export const getCountryName = (country: CountryCode): string => {
  const countryNames: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    IN: 'India',
    CA: 'Canada',
    AU: 'Australia',
    FR: 'France',
    DE: 'Germany',
    ES: 'Spain',
    IT: 'Italy',
    BR: 'Brazil',
    MX: 'Mexico',
    JP: 'Japan',
    CN: 'China',
    KR: 'South Korea',
    RU: 'Russia',
    ID: 'Indonesia',
    TR: 'Turkey',
    SA: 'Saudi Arabia',
    AE: 'United Arab Emirates',
    NG: 'Nigeria',
    ZA: 'South Africa',
    EG: 'Egypt',
    PK: 'Pakistan',
    BD: 'Bangladesh',
    PH: 'Philippines',
    VN: 'Vietnam',
    TH: 'Thailand',
    MY: 'Malaysia',
    SG: 'Singapore',
    NZ: 'New Zealand',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    VE: 'Venezuela',
  };

  return countryNames[country] || country;
};

/**
 * Get all available countries
 * @returns Array of country codes
 */
export const getAllCountries = (): CountryCode[] => {
  return getCountries();
};

/**
 * Get country calling code
 * @param country - Country code
 * @returns Calling code (e.g., '1' for US)
 */
export const getCallingCode = (country: CountryCode): string => {
  try {
    return getCountryCallingCode(country);
  } catch {
    return '';
  }
};

/**
 * Sanitize phone input (remove invalid characters)
 * @param value - Input value
 * @returns Sanitized value
 */
export const sanitizePhoneInput = (value: string): string => {
  if (!value) return '';

  // Allow only digits, +, spaces, parentheses, and hyphens
  return value.replace(/[^\d+\s()-]/g, '');
};

/**
 * Get validation error message
 * @param phone - Phone number that failed validation
 * @param country - Country code for context
 * @returns User-friendly error message
 */
export const getPhoneValidationError = (phone: string, country?: CountryCode): string => {
  if (!phone) return 'Phone number is required';

  if (phone.length < 8) return 'Phone number is too short';

  if (phone.length > 15 && !phone.startsWith('+')) {
    return 'Phone number is too long';
  }

  if (!phone.startsWith('+')) {
    return 'Please enter phone number in international format (e.g., +1234567890)';
  }

  const example = country ? getExamplePhone(country) : '+1 234 567 8900';
  return `Please enter a valid phone number. Example: ${example}`;
};

/**
 * Check if input looks like it's in E.164 format
 * @param value - Input value
 * @returns true if looks like E.164
 */
export const looksLikeE164 = (value: string): boolean => {
  return /^\+[1-9]\d{1,14}$/.test(value);
};

/**
 * Auto-detect country from phone number
 * @param phone - Phone number
 * @returns Detected country or null
 */
export const detectCountry = (phone: string): CountryCode | null => {
  if (!phone) return null;

  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber?.country || null;
  } catch {
    // Try to detect from country code prefix
    if (phone.startsWith('+1')) return 'US';
    if (phone.startsWith('+44')) return 'GB';
    if (phone.startsWith('+91')) return 'IN';
    if (phone.startsWith('+61')) return 'AU';
    if (phone.startsWith('+33')) return 'FR';
    if (phone.startsWith('+49')) return 'DE';

    return null;
  }
};

/**
 * Highlight format errors in phone input
 * @param phone - Phone number
 * @returns Object with validation details
 */
export interface PhoneValidationDetails {
  isValid: boolean;
  isMobile: boolean;
  country?: CountryCode;
  formatted?: string;
  error?: string;
}

export const validatePhoneDetails = (phone: string): PhoneValidationDetails => {
  if (!phone) {
    return {
      isValid: false,
      isMobile: false,
      error: 'Phone number is required',
    };
  }

  try {
    const phoneNumber = parsePhoneNumber(phone);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return {
        isValid: false,
        isMobile: false,
        error: getPhoneValidationError(phone),
      };
    }

    const type = phoneNumber.getType();

    // For numbers where type is undefined (common in countries like India where
    // libphonenumber-js lacks detailed type metadata), we assume it's mobile
    // if it's valid and follows the country's mobile number pattern
    let isMobile = type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';

    // Special handling for undefined types - assume mobile for certain countries
    // where the library doesn't have detailed metadata
    if (!isMobile && !type) {
      // For India and similar countries, 10-digit numbers starting with 6-9
      // are typically mobile numbers
      if (phoneNumber.country === 'IN') {
        const firstDigit = phoneNumber.nationalNumber?.charAt(0);
        isMobile = ['6', '7', '8', '9'].includes(firstDigit || '') &&
                   phoneNumber.nationalNumber?.length === 10;
      } else {
        // For other countries with undefined type, assume mobile if valid
        // since most modern phone numbers receiving SMS are mobile
        isMobile = true;
      }
    }

    return {
      isValid: true,
      isMobile,
      country: phoneNumber.country,
      formatted: phoneNumber.formatInternational(),
      error: isMobile ? undefined : 'Only mobile numbers can receive SMS verification',
    };
  } catch (error) {
    return {
      isValid: false,
      isMobile: false,
      error: 'Invalid phone number format',
    };
  }
};
