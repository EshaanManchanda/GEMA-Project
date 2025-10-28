import { body } from 'express-validator';
import { validateEmail, validatePhone } from './common.validator';

/**
 * Authentication validation rules
 */

// Password complexity validation
export const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/;
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Registration validation
 */
export const validateRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .escape(),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .escape(),

  validateEmail('email', true),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)'),

  validatePhone('phone', false),

  body('role')
    .optional()
    .isIn(['customer', 'vendor', 'employee'])
    .withMessage('Role must be customer, vendor, or employee'),
];

/**
 * Admin registration validation
 */
export const validateAdminRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .escape(),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .escape(),

  validateEmail('email', true),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)'),

  validatePhone('phone', false),

  body('adminSecretKey')
    .notEmpty()
    .withMessage('Admin secret key is required')
    .isString()
    .withMessage('Admin secret key must be a string'),
];

/**
 * Login validation
 */
export const validateLogin = [
  validateEmail('email', true),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Refresh token validation
 */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

/**
 * Change password validation
 */
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`New password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
    .matches(PASSWORD_REGEX)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];

/**
 * Forgot password validation
 */
export const validateForgotPassword = [
  validateEmail('email', true),
];

/**
 * Reset password validation
 */
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string'),

  body('newPassword')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)'),
];

/**
 * Email verification validation
 */
export const validateEmailVerification = [
  body('otp')
    .notEmpty()
    .withMessage('Verification OTP is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('OTP must be exactly 4 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
];

/**
 * Resend verification email validation
 */
export const validateResendVerification = [
  validateEmail('email', true),
];

/**
 * Firebase authentication validation
 */
export const validateFirebaseAuth = [
  body('idToken')
    .notEmpty()
    .withMessage('Firebase ID token is required')
    .isString()
    .withMessage('ID token must be a string'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .escape(),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .escape(),
];

/**
 * Two-factor authentication setup validation
 */
export const validate2FASetup = [
  body('secret')
    .notEmpty()
    .withMessage('2FA secret is required')
    .isString()
    .withMessage('Secret must be a string'),
];

/**
 * Two-factor authentication verification
 */
export const validate2FAVerification = [
  body('token')
    .notEmpty()
    .withMessage('2FA token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Token must be exactly 6 digits')
    .isNumeric()
    .withMessage('Token must contain only numbers'),
];

/**
 * Phone verification send OTP validation
 * Enhanced with duplicate checking and mobile-only requirement
 */
export const validateSendPhoneOTP = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom(async (value, { req }) => {
      // Import the enhanced validation utility
      const { validatePhoneForAPI } = await import('../utils/phoneValidation');

      // Comprehensive validation with duplicate check
      const validation = await validatePhoneForAPI(value, {
        requireMobile: true, // Only mobile numbers can receive SMS
        checkDuplicate: true, // Check if already registered
        excludeUserId: req.user?.id, // Allow current user's own phone
      });

      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid phone number');
      }

      // Store the E.164 formatted phone for later use
      req.body.phone = validation.e164Format;

      return true;
    }),
];

/**
 * Phone verification OTP validation
 */
export const validatePhoneOTP = [
  body('otp')
    .notEmpty()
    .withMessage('Verification OTP is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('OTP must be exactly 4 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
];

/**
 * Export all auth validators
 */
export default {
  validateRegistration,
  validateAdminRegistration,
  validateLogin,
  validateRefreshToken,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateResendVerification,
  validateFirebaseAuth,
  validate2FASetup,
  validate2FAVerification,
  validateSendPhoneOTP,
  validatePhoneOTP,
};
