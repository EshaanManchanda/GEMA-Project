import { param, query, body } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Common validation rules used across multiple endpoints
 */

// MongoDB ObjectId validation
export const validateMongoId = (field: string = 'id', location: 'param' | 'body' | 'query' = 'param') => {
  const validator = location === 'param' ? param(field) : location === 'body' ? body(field) : query(field);

  return validator
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`${field} must be a valid ID`);
      }
      return true;
    });
};

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

// Sort validation
export const validateSort = (allowedFields: string[]) => [
  query('sortBy')
    .optional()
    .isIn(allowedFields)
    .withMessage(`sortBy must be one of: ${allowedFields.join(', ')}`),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('sortOrder must be asc, desc, 1, or -1'),
];

// Date range validation
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .toDate()
    .custom((endDate, { req }) => {
      if (req.query?.startDate && endDate < new Date(req.query.startDate as string)) {
        throw new Error('endDate must be after startDate');
      }
      return true;
    }),
];

// Price range validation
export const validatePriceRange = [
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a positive number')
    .toFloat(),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a positive number')
    .toFloat()
    .custom((maxPrice, { req }) => {
      if (req.query?.minPrice && maxPrice < parseFloat(req.query.minPrice as string)) {
        throw new Error('maxPrice must be greater than minPrice');
      }
      return true;
    }),
];

// Search query validation
export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(), // Prevent XSS
];

// Status validation
export const validateStatus = (allowedStatuses: string[]) => [
  query('status')
    .optional()
    .isIn(allowedStatuses)
    .withMessage(`Status must be one of: ${allowedStatuses.join(', ')}`),
];

// Boolean query validation
export const validateBooleanQuery = (field: string) => [
  query(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean value`)
    .toBoolean(),
];

// Email validation (reusable)
export const validateEmail = (field: string = 'email', required: boolean = true) => {
  const validator = body(field)
    .trim()
    .toLowerCase();

  if (required) {
    validator.notEmpty().withMessage('Email is required');
  } else {
    validator.optional();
  }

  return validator
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters');
};

// Phone validation with enhanced libphonenumber-js validation
export const validatePhone = (field: string = 'phone', required: boolean = false, requireMobile: boolean = false) => {
  const validator = body(field).trim();

  if (required) {
    validator.notEmpty().withMessage('Phone number is required');
  } else {
    validator.optional();
  }

  return validator
    .custom(async (value) => {
      if (!value) return true; // Allow empty if optional

      // Import the enhanced validation utility
      const { validatePhoneNumber, isMobileNumber, getPhoneValidationErrorMessage } = await import('../utils/phoneValidation');

      // Validate the phone number
      const validation = validatePhoneNumber(value);

      if (!validation.isValid) {
        const errorMessage = validation.error || 'Invalid phone number format';
        throw new Error(errorMessage);
      }

      // Check if mobile is required
      if (requireMobile && !validation.isMobile) {
        throw new Error('Only mobile phone numbers are allowed. Landline numbers cannot receive SMS verification codes.');
      }

      return true;
    });
};

// URL validation
export const validateUrl = (field: string, required: boolean = false) => {
  const validator = body(field).trim();

  if (required) {
    validator.notEmpty().withMessage(`${field} is required`);
  } else {
    validator.optional();
  }

  return validator
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage(`${field} must be a valid URL with http or https protocol`);
};

// Array validation
export const validateArray = (field: string, minLength: number = 1, maxLength?: number) => {
  const validator = body(field)
    .isArray({ min: minLength })
    .withMessage(`${field} must be an array with at least ${minLength} item(s)`);

  if (maxLength) {
    validator.isArray({ max: maxLength })
      .withMessage(`${field} cannot exceed ${maxLength} items`);
  }

  return validator;
};

// String length validation
export const validateStringLength = (
  field: string,
  minLength: number,
  maxLength: number,
  required: boolean = true
) => {
  const validator = body(field).trim();

  if (required) {
    validator.notEmpty().withMessage(`${field} is required`);
  } else {
    validator.optional();
  }

  return validator
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
    .escape(); // Prevent XSS
};

// Numeric range validation
export const validateNumericRange = (
  field: string,
  min: number,
  max?: number,
  required: boolean = true
) => {
  const validator = body(field);

  if (required) {
    validator.notEmpty().withMessage(`${field} is required`);
  } else {
    validator.optional();
  }

  if (max !== undefined) {
    return validator
      .isFloat({ min, max })
      .withMessage(`${field} must be between ${min} and ${max}`)
      .toFloat();
  }

  return validator
    .isFloat({ min })
    .withMessage(`${field} must be at least ${min}`)
    .toFloat();
};

// Enum validation
export const validateEnum = (field: string, allowedValues: string[], required: boolean = true) => {
  const validator = body(field);

  if (required) {
    validator.notEmpty().withMessage(`${field} is required`);
  } else {
    validator.optional();
  }

  return validator
    .isIn(allowedValues)
    .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`);
};

// Sanitize HTML input (prevent XSS)
export const sanitizeHtml = (field: string) => {
  return body(field)
    .trim()
    .customSanitizer((value) => {
      // Basic HTML sanitization - remove script tags and event handlers
      if (typeof value !== 'string') return value;

      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/on\w+='[^']*'/g, '');
    });
};

// Coordinate validation (latitude, longitude)
export const validateCoordinates = [
  body('coordinates.lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  body('coordinates.lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
];

// File upload validation helper
export const createFileValidation = (options: {
  allowedMimeTypes?: string[];
  maxSize?: number; // in bytes
  required?: boolean;
}) => {
  const { allowedMimeTypes, maxSize, required = false } = options;

  return (req: any, file: any, cb: any) => {
    if (!file && required) {
      return cb(new Error('File is required'), false);
    }

    if (file && allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`),
        false
      );
    }

    if (file && maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return cb(new Error(`File size cannot exceed ${maxSizeMB}MB`), false);
    }

    cb(null, true);
  };
};

/**
 * Strip HTML tags and get plain text content
 */
export const stripHtmlTags = (html: string): string => {
  if (!html || typeof html !== 'string') return '';

  // Simple regex-based approach (fast, no dependencies)
  return html
    .replace(/<[^>]*>/g, '')  // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with space
    .replace(/&amp;/g, '&')   // Decode common entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
};

/**
 * Validate HTML content by checking plain text length
 */
export const validateHtmlLength = (
  field: string,
  min: number,
  max: number,
  required: boolean = true
) => {
  return body(field)
    .custom((value) => {
      if (!value || value.trim() === '') {
        if (required) {
          throw new Error(`${field} is required`);
        }
        return true;
      }

      const plainText = stripHtmlTags(value);
      const length = plainText.length;

      if (length < min) {
        throw new Error(`${field} must be at least ${min} characters (currently ${length})`);
      }

      if (length > max) {
        throw new Error(`${field} must not exceed ${max} characters (currently ${length})`);
      }

      return true;
    });
};

// Export all validators as a convenience
export default {
  validateMongoId,
  validatePagination,
  validateSort,
  validateDateRange,
  validatePriceRange,
  validateSearch,
  validateStatus,
  validateBooleanQuery,
  validateEmail,
  validatePhone,
  validateUrl,
  validateArray,
  validateStringLength,
  validateNumericRange,
  validateEnum,
  sanitizeHtml,
  validateCoordinates,
  createFileValidation,
  stripHtmlTags,
  validateHtmlLength,
};
