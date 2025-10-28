import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import {
  authenticate,
  validate,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
} from '../middleware';
import {
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
  validateSendPhoneOTP,
  validatePhoneOTP
} from '../validators/auth.validator';
import {
  validateProfileUpdate,
  validateAddress,
  validateAddressIndex,
  validateAvatarUpdate
} from '../validators/user.validator';

const router = Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validateRegistration,
  validate,
  authController.register
);

/**
 * @route   POST /auth/register-admin
 * @desc    Register a new admin user (requires admin secret key)
 * @access  Public (protected by secret key)
 */
router.post(
  '/register-admin',
  authLimiter,
  validateAdminRegistration,
  validate,
  authController.registerAdmin
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validateLogin,
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
  validateRefreshToken,
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
  validateProfileUpdate,
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
  validateChangePassword,
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
  passwordResetLimiter,
  validateForgotPassword,
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
  passwordResetLimiter,
  validateResetPassword,
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
  emailVerificationLimiter,
  validateEmailVerification,
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
  emailVerificationLimiter,
  validateResendVerification,
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
  authLimiter,
  validateFirebaseAuth,
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
  validateAddress,
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
  [...validateAddressIndex, ...validateAddress],
  validate,
  authController.updateAddress
);

/**
 * @route   DELETE /api/auth/addresses/:addressIndex
 * @desc    Delete an address
 * @access  Private
 */
router.delete(
  '/addresses/:addressIndex',
  authenticate,
  validateAddressIndex,
  validate,
  authController.deleteAddress
);

/**
 * Avatar Management Routes
 */

/**
 * @route   POST /api/auth/upload-avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
  '/upload-avatar',
  authenticate,
  validateAvatarUpdate,
  validate,
  authController.updateAvatar
);

/**
 * @route   PUT /api/auth/avatar
 * @desc    Update user avatar (backward compatibility)
 * @access  Private
 */
router.put(
  '/avatar',
  authenticate,
  validateAvatarUpdate,
  validate,
  authController.updateAvatar
);

/**
 * @route   DELETE /api/auth/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', authenticate, authController.deleteAvatar);

/**
 * Phone Verification Routes
 */

/**
 * @route   POST /api/auth/send-phone-verification
 * @desc    Send phone verification OTP
 * @access  Private
 */
router.post(
  '/send-phone-verification',
  authenticate,
  emailVerificationLimiter,
  validateSendPhoneOTP,
  validate,
  authController.sendPhoneVerificationOTP
);

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Verify phone number with OTP
 * @access  Private
 */
router.post(
  '/verify-phone',
  authenticate,
  emailVerificationLimiter,
  validatePhoneOTP,
  validate,
  authController.verifyPhoneOTP
);

/**
 * @route   POST /api/auth/resend-phone-verification
 * @desc    Resend phone verification OTP
 * @access  Private
 */
router.post(
  '/resend-phone-verification',
  authenticate,
  emailVerificationLimiter,
  authController.resendPhoneVerificationOTP
);

export default router;