import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate, validate } from '../middleware';

const router = Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 50 })
      .withMessage('First name cannot be more than 50 characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 50 })
      .withMessage('Last name cannot be more than 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please provide a valid phone number')
  ],
  validate,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validate,
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  validate,
  authController.refreshToken
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   GET /api/auth/profile
 * @desc    Get full user profile with enhanced data
 * @access  Private
 */
router.get('/profile', authenticate, authController.getFullProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  [
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty')
      .isLength({ max: 50 })
      .withMessage('First name cannot be more than 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty')
      .isLength({ max: 50 })
      .withMessage('Last name cannot be more than 50 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please provide a valid phone number')
  ],
  validate,
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  validate,
  authController.changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Forgot password
 * @access  Public
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
  ],
  validate,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Token is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  validate,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post(
  '/verify-email',
  [
    body('otp')
      .notEmpty()
      .withMessage('Verification OTP is required')
      .isLength({ min: 4, max: 4 })
      .withMessage('OTP must be exactly 4 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  validate,
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification-email
 * @desc    Resend email verification OTP
 * @access  Public
 */
router.post(
  '/resend-verification-email',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
  ],
  validate,
  authController.resendVerificationEmail
);

/**
 * @route   POST /api/auth/firebase
 * @desc    Authenticate with Firebase
 * @access  Public
 */
router.post(
  '/firebase',
  [
    body('idToken')
      .notEmpty()
      .withMessage('Firebase ID token is required')
  ],
  validate,
  authController.firebaseAuth
);

/**
 * Address Management Routes
 */

/**
 * @route   POST /api/auth/addresses
 * @desc    Add a new address to user profile
 * @access  Private
 */
router.post(
  '/addresses',
  authenticate,
  [
    body('street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),
    body('city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),
    body('zipCode')
      .trim()
      .notEmpty()
      .withMessage('Zip code is required'),
    body('country')
      .trim()
      .notEmpty()
      .withMessage('Country is required'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault must be a boolean value')
  ],
  validate,
  authController.addAddress
);

/**
 * @route   PUT /api/auth/addresses/:addressIndex
 * @desc    Update an existing address
 * @access  Private
 */
router.put(
  '/addresses/:addressIndex',
  authenticate,
  [
    body('street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),
    body('city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),
    body('zipCode')
      .trim()
      .notEmpty()
      .withMessage('Zip code is required'),
    body('country')
      .trim()
      .notEmpty()
      .withMessage('Country is required'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault must be a boolean value')
  ],
  validate,
  authController.updateAddress
);

/**
 * @route   DELETE /api/auth/addresses/:addressIndex
 * @desc    Delete an address
 * @access  Private
 */
router.delete('/addresses/:addressIndex', authenticate, authController.deleteAddress);

/**
 * Avatar Management Routes
 */

/**
 * @route   PUT /api/auth/avatar
 * @desc    Update user avatar
 * @access  Private
 */
router.put(
  '/avatar',
  authenticate,
  [
    body('avatar')
      .trim()
      .notEmpty()
      .withMessage('Avatar URL is required')
      .isURL()
      .withMessage('Please provide a valid avatar URL')
  ],
  validate,
  authController.updateAvatar
);

/**
 * @route   DELETE /api/auth/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', authenticate, authController.deleteAvatar);

export default router;