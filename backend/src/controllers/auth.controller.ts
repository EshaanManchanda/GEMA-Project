import { Request, Response, NextFunction, CookieOptions } from "express";
import mongoose from "mongoose";
import { getAuth } from "../config/firebase";
import { generateToken, generateRefreshToken } from "../config/jwt";
import {
  User,
  UserStatus,
  RefreshToken,
  IUser,
  IAddress,
  Gender,
} from "../models/index";
import MediaAsset from "../models/MediaAsset";
import { AppError } from "../middleware/index";
import { emailService } from "../services/email.service";
import smsService from "../services/sms.service";
import { cacheService } from "../services/cache.service";
import mediaService from "../services/media.service";
import { getOrCreateVendorProfile } from "../utils/vendorHelpers";
import { getOrCreateTeacherProfile } from "../utils/teacherHelpers";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  VerifyEmailRequest,
  FirebaseAuthRequest,
  ApiResponse,
  UserResponse,
} from "../types/index";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateOTP, getOTPExpiry } from "../utils/otp";
import {
  sanitizeToE164,
  validatePhoneForAPI,
  isE164Format,
} from "../utils/phoneValidation";
import { toISOStringSafe, toDateStringSafe } from "../utils/dateHelpers";
import { config } from "../config/index";
import logger from "../config/logger";

/**
 * Cookie configuration for auth tokens
 */
const getCookieOptions = (): CookieOptions => {
  const isProduction = config.nodeEnv === "production";
  const frontendUrl = config.frontendUrl || "";
  const isLocalhost =
    frontendUrl.includes("localhost") || frontendUrl.includes("127.0.0.1");

  // Use secure cookies only if in production AND not localhost
  // This allows testing production mode locally without HTTPS
  const useSecureCookies = isProduction && !isLocalhost;

  logger.debug("[COOKIE_CONFIG] Environment:", {
    env: config.nodeEnv,
    isProduction,
    frontendUrl,
    isLocalhost,
    secure: useSecureCookies,
    sameSite: useSecureCookies ? "none" : "lax",
  });

  return {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: useSecureCookies, // true only for production with HTTPS (not localhost)
    sameSite: useSecureCookies ? "none" : "lax", // 'lax' for localhost, 'none' for cross-domain HTTPS
    domain: undefined, // Don't set domain - let browser handle it for localhost
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = config.nodeEnv === "production";
  const frontendUrl = config.frontendUrl || "";
  const isLocalhost =
    frontendUrl.includes("localhost") || frontendUrl.includes("127.0.0.1");

  // Use secure cookies only if in production AND not localhost
  const useSecureCookies = isProduction && !isLocalhost;

  return {
    httpOnly: true,
    secure: useSecureCookies, // true only for production with HTTPS (not localhost)
    sameSite: useSecureCookies ? "none" : "lax", // 'lax' for localhost, 'none' for cross-domain HTTPS
    domain: undefined, // Don't set domain - let browser handle it for localhost
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  };
};

/**
 * Set auth cookies on response
 */
const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
): void => {
  // Validate tokens before setting cookies
  if (!accessToken || accessToken.trim() === "") {
    logger.error("[SET_COOKIES] Attempted to set empty accessToken");
    throw new AppError("Invalid access token generated", 500);
  }

  if (!refreshToken || refreshToken.trim() === "") {
    logger.error("[SET_COOKIES] Attempted to set empty refreshToken");
    throw new AppError("Invalid refresh token generated", 500);
  }

  const cookieOptions = getCookieOptions();
  const refreshOptions = getRefreshCookieOptions();

  if (process.env.DEBUG_AUTH === "true" && process.env.NODE_ENV !== "production") {
    logger.debug("[SET_COOKIES] Setting auth cookies with options:", {
      cookieOptions,
      refreshOptions,
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
    });
  }

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, refreshOptions);

  if (process.env.DEBUG_AUTH === "true" && process.env.NODE_ENV !== "production") {
    logger.debug("[SET_COOKIES] Cookies set successfully");
  }
};

/**
 * Get cookie options for clearing (without maxAge to avoid Express deprecation warning)
 */
const getClearCookieOptions = (): CookieOptions => {
  const isProduction = config.nodeEnv === "production";
  const frontendUrl = config.frontendUrl || "";
  const isLocalhost =
    frontendUrl.includes("localhost") || frontendUrl.includes("127.0.0.1");
  const useSecureCookies = isProduction && !isLocalhost;

  return {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: useSecureCookies ? "none" : "lax",
    domain: undefined,
    path: "/",
    // maxAge intentionally omitted - Express 5.x will set expiry automatically
  };
};

/**
 * Clear auth cookies on response
 */
const clearAuthCookies = (res: Response): void => {
  const clearOptions = getClearCookieOptions();
  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
};

/**
 * Format user for response
 */
const formatUserResponse = (user: IUser): UserResponse => {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role, // role is now a string
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    createdAt: toISOStringSafe(user.createdAt),
    updatedAt: toISOStringSafe(user.updatedAt),
  };
};

/**
 * Generate authentication tokens
 */
const generateAuthTokens = async (
  userId: string,
  req: Request,
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Generate access token
  const accessToken = generateToken({ id: userId });

  // Generate refresh token
  const refreshToken = generateRefreshToken({ id: userId });

  // Calculate expiry date (from JWT config)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  // Save refresh token to database with duplicate handling for race conditions
  try {
    await RefreshToken.create({
      token: refreshToken,
      user: userId,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error: any) {
    // Handle duplicate key errors from race conditions (multiple simultaneous requests)
    if (error.code === 11000) {
      logger.info("[Auth] Refresh token already exists (race condition), continuing...");
      // Token already exists in DB, which is fine - the operation succeeded in another request
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  return { accessToken, refreshToken };
};

/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  logger.debug("[REGISTER] Function entered");
  try {
    if (!req.body) {
      throw new AppError("Request body is missing", 400);
    }
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
    }: RegisterRequest = req.body;
    logger.debug("[REGISTER] Request body received:", {
      firstName,
      lastName,
      email,
      phone,
    });

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    // Check if user already exists
    logger.debug("[REGISTER] Checking for existing user...");
    const existingUser = await User.findOne({ email });
    logger.debug("[REGISTER] Existing user check complete. User found: " + !!existingUser);
    if (existingUser) {
      throw new AppError("User with this email already exists", 400);
    }

    // Generate verification OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now

    // Public registration always creates customers — role cannot be set by caller
    logger.debug("[REGISTER] Creating user with role: customer");

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      phone,
      role: "customer",
      status: UserStatus.PENDING,
      emailVerification: {
        otp: verificationOTP,
        expiresAt: otpExpiry,
      },
    });

    if (process.env.DEBUG_AUTH === "true" && process.env.NODE_ENV !== "production") {
      logger.debug("[REGISTER] User created successfully:", {
        id: user._id,
        email: user.email,
        role: user.role,
        hasPassword: !!user.passwordHash,
        passwordHashLength: user.passwordHash?.length,
        passwordHashStart: user.passwordHash?.substring(0, 10) + "***",
      });
    }

    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);

    // Set httpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    // Send verification email - failure rolls back user creation
    try {
      await emailService.sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        otp: verificationOTP,
      });
    } catch (emailError: any) {
      logger.error("[REGISTER] CRITICAL: Failed to send verification email", {
        userId: user._id,
        email: user.email,
        error: emailError.message,
      });

      // Keep strict behavior in production; allow local/dev registration to continue.
      if (config.nodeEnv === "production") {
        await User.findByIdAndDelete(user._id);
        return next(
          new AppError("Failed to send verification email. Please try again.", 500),
        );
      }

      logger.warn("[REGISTER] Non-production mode: continuing despite email failure", {
        userId: user._id,
        email: user.email,
      });
    }

    // Return response
    logger.info("Registration successful");
    res.status(201).json({
      success: true,
      message: "User registered successfully. Auth cookies have been set.",
      data: {
        user: formatUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new admin user
 * @route   POST /auth/register-admin
 * @access  Public (requires admin secret key)
 */
export const registerAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, phone, adminSecretKey } =
      req.body;

    // Verify admin secret key
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

    if (!ADMIN_SECRET_KEY) {
      throw new AppError(
        "Admin registration is not configured. Please contact system administrator.",
        500,
      );
    }

    if (adminSecretKey !== ADMIN_SECRET_KEY) {
      throw new AppError("Invalid admin secret key", 403);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User with this email already exists", 400);
    }

    // Generate verification OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now

    // Create new admin user
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      phone,
      role: "admin",
      status: UserStatus.ACTIVE, // Admin users are active immediately
      isEmailVerified: true, // Admin users are verified immediately
      emailVerification: {
        otp: verificationOTP,
        expiresAt: otpExpiry,
      },
    });

    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);

    // Set httpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    // Optionally send welcome email (you can customize this)
    try {
      await emailService.sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        otp: verificationOTP,
      });
    } catch (emailError) {
      logger.error("Failed to send admin welcome email:", emailError);
      // Don't fail registration if email fails
    }

    // Return response
    res.status(201).json({
      success: true,
      message:
        "Admin user registered successfully. Auth cookies have been set.",
      data: {
        user: formatUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification link
 * @route   POST /api/auth/resend-verification-email
 * @access  Public
 */
export const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email }: { email: string } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.isEmailVerified) {
      throw new AppError("Email already verified", 400);
    }

    // Generate new verification OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now

    user.emailVerification = {
      otp: verificationOTP,
      expiresAt: otpExpiry,
    };

    await user.save();

    await emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      otp: verificationOTP,
    });

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    logger.auth("Attempting login for:", { email });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.auth("User not found:", { email });
      throw new AppError("Invalid credentials", 401);
    }

    logger.auth("User found:", {
      id: user._id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.passwordHash,
      passwordHashLength: user.passwordHash?.length,
    });

    // Check if user has a password (might be social login only)
    if (!user.passwordHash) {
      logger.auth("No password hash found for user");
      throw new AppError(
        "This account does not have a password. Please use social login.",
        400,
      );
    }

    // Verify password
    if (process.env.DEBUG_AUTH === "true" && process.env.NODE_ENV !== "production") {
      logger.debug("[LOGIN] Comparing passwords...");
      logger.debug("[LOGIN] Password provided (first 3 chars):", {
        partial: password.substring(0, 3) + "***",
      });
      logger.debug("[LOGIN] Stored hash (first 10 chars):", {
        partial: user.passwordHash.substring(0, 10) + "***",
      });
    }
    const isMatch = await user.comparePassword(password);
    if (process.env.DEBUG_AUTH === "true" && process.env.NODE_ENV !== "production") {
      logger.debug("[LOGIN] Password match result:", { isMatch });
    }

    if (!isMatch) {
      // Record failed login attempt
      user.loginAttempts = user.loginAttempts || [];
      user.loginAttempts.push({
        timestamp: new Date(),
        ip: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        success: false,
      });
      await user.save();

      logger.auth("Password mismatch for user:", { email });
      throw new AppError("Invalid credentials", 401);
    }

    // Check if user is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        "Your account has been suspended. Please contact support.",
        403,
      );
    }

    // Record successful login
    user.loginAttempts = user.loginAttempts || [];
    user.loginAttempts.push({
      timestamp: new Date(),
      ip: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
      success: true,
    });
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);

    // Set httpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    // Return response
    res.status(200).json({
      success: true,
      message: "Login successful. Auth cookies have been set.",
      data: {
        user: formatUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get refresh token from cookie or body (for backward compatibility)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true },
      );
    }

    // Clear auth cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logout successful. Auth cookies have been cleared.",
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get refresh token from cookie or body (for backward compatibility)
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      throw new AppError("No refresh token provided", 401);
    }

    // Find the refresh token in the database
    const refreshTokenDoc = await RefreshToken.findOne({
      token,
      isRevoked: false,
    });
    if (!refreshTokenDoc) {
      // Clear invalid cookies
      clearAuthCookies(res);
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Check if token is expired
    if (refreshTokenDoc.expiresAt < new Date()) {
      // Mark as revoked
      refreshTokenDoc.isRevoked = true;
      await refreshTokenDoc.save();

      // Clear expired cookies
      clearAuthCookies(res);

      throw new AppError("Refresh token expired", 401);
    }

    // Get user
    const user = await User.findById(refreshTokenDoc.user);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Generate new tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);

    // Set new httpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    // Revoke old refresh token
    refreshTokenDoc.isRevoked = true;
    await refreshTokenDoc.save();

    // Return response
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully. New auth cookies have been set.",
      data: {
        user: formatUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      // Return null user instead of throwing 401 to prevent console errors
      res.status(200).json({
        success: true,
        message: "Use is not authenticated",
        data: { user: null },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: formatUserResponse(user),
    } as ApiResponse<UserResponse>);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      preferences,
    }: UpdateProfileRequest = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    // Fetch user from database as Mongoose document (not from cache)
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Update basic fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    // Handle phone number with E.164 conversion and validation
    if (phone !== undefined) {
      if (phone === "" || phone === null) {
        // Allow clearing the phone number
        user.phone = undefined;
        user.isPhoneVerified = false;
        user.phoneVerification = undefined;
      } else {
        // Sanitize to E.164 format
        const e164Phone = sanitizeToE164(phone);

        if (!e164Phone) {
          throw new AppError(
            "Invalid phone number format. Please provide a valid international phone number (e.g., +1234567890)",
            400,
          );
        }

        // Normalize current user's phone for comparison
        const currentUserPhone = user.phone ? sanitizeToE164(user.phone) : null;

        // Check if this phone is already used by another user (only if it's different from current)
        if (e164Phone !== currentUserPhone) {
          const existingUser = await User.findOne({
            phone: e164Phone,
            _id: { $ne: user._id },
          });

          if (existingUser) {
            throw new AppError(
              "This phone number is already registered to another account",
              409,
            );
          }

          // If changing phone, reset verification
          user.phone = e164Phone;
          user.isPhoneVerified = false;
          user.phoneVerification = undefined;
        } else {
          // Same phone, just ensure it's in E.164 format
          user.phone = e164Phone;
        }
      }
    }

    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender as Gender;

    // Update preferences if provided
    if (preferences) {
      if (!user.preferences) {
        user.preferences = {
          language: "en",
          currency: "AED",
          timezone: "Asia/Dubai",
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
        };
      }

      if (preferences.language)
        user.preferences.language = preferences.language;
      if (preferences.currency)
        user.preferences.currency = preferences.currency;
      if (preferences.timezone)
        user.preferences.timezone = preferences.timezone;

      if (preferences.notifications) {
        user.preferences.notifications = {
          ...user.preferences.notifications,
          ...preferences.notifications,
        };
      }
    }

    await user.save();

    // Invalidate user cache to ensure fresh data on next request
    const cacheKey = `user:${userId}`;
    await cacheService.delete(cacheKey);

    // Calculate profile completion
    const calculateProfileCompletion = (user: IUser): number => {
      let completedFields = 0;
      const totalFields = 8;

      if (user.firstName) completedFields++;
      if (user.lastName) completedFields++;
      if (user.email && user.isEmailVerified) completedFields++;
      if (user.phone && user.isPhoneVerified) completedFields++;
      if (user.avatar) completedFields++;
      if (user.dateOfBirth) completedFields++;
      if (user.addresses && user.addresses.length > 0) completedFields++;
      if (user.gender) completedFields++;

      return Math.round((completedFields / totalFields) * 100);
    };

    // Return full user profile
    const userProfile = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      avatar: user.avatar || "",
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified || false,
      dateOfBirth: toDateStringSafe(user.dateOfBirth),
      gender: user.gender || "",
      bio: "",
      addresses: user.addresses || [],
      socialLinks: {
        facebook: user.socialMedia?.facebook || "",
        instagram: user.socialMedia?.instagram || "",
        twitter: user.socialMedia?.twitter || "",
        linkedin: user.socialMedia?.linkedin || "",
        website: user.socialMedia?.website || "",
      },
      securitySettings: {
        twoFactorEnabled: user.twoFactorAuth?.enabled || false,
        loginNotifications: true,
        securityAlerts: true,
        lastPasswordChange: toISOStringSafe(user.updatedAt),
        activeDevices: [],
      },
      privacySettings: {
        profileVisibility: "public" as const,
        showEmail: false,
        showPhone: false,
        showBirthDate: false,
        dataProcessingConsent: true,
        marketingEmails: true,
        thirdPartySharing: false,
      },
      preferences: {
        language: user.preferences?.language || "en",
        currency: user.preferences?.currency || "AED",
        timezone: user.preferences?.timezone || "Asia/Dubai",
        theme: "light" as const,
        notifications: {
          email: user.preferences?.notifications?.email ?? true,
          sms: user.preferences?.notifications?.sms ?? false,
          push: user.preferences?.notifications?.push ?? true,
          marketing: user.preferences?.notifications?.email ?? true,
          security: true,
          bookingReminders: true,
          eventUpdates: true,
        },
      },
      profileCompletion: calculateProfileCompletion(user),
      lastActiveAt: toISOStringSafe(user.updatedAt),
      memberSince: toISOStringSafe(user.createdAt),
      createdAt: toISOStringSafe(user.createdAt),
      updatedAt: toISOStringSafe(user.updatedAt),
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
    // const user = req.user;
    // Get user ID from cached user object
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }
    // Re-fetch user from database to get Mongoose document with methods
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", 400);
    }

    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email }: ForgotPasswordRequest = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that the user doesn't exist
      res.status(200).json({
        success: true,
        message:
          "If your email is registered, you will receive a password reset code",
      } as ApiResponse);
      return;
    }

    // Generate OTP for password reset
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now

    // Save OTP to user
    user.passwordResetOTP = {
      otp,
      expiresAt: otpExpiry,
    };
    await user.save();

    // Send password reset email with OTP
    await emailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetOTP: otp,
    });

    res.status(200).json({
      success: true,
      message:
        "If your email is registered, you will receive a password reset code",
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      email,
      otp,
      newPassword,
    }: { email: string; otp: string; newPassword: string } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      throw new AppError("Email, OTP, and new password are required", 400);
    }

    // Find user by email and OTP
    const user = await User.findOne({
      email,
      "passwordResetOTP.otp": otp,
      "passwordResetOTP.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      throw new AppError("Invalid or expired OTP code", 400);
    }

    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    user.passwordResetOTP = undefined; // Clear OTP
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, otp }: VerifyEmailRequest = req.body;

    // Find user by email AND OTP — both must match to prevent cross-account OTP attacks
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      "emailVerification.otp": otp,
      "emailVerification.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      throw new AppError("Invalid or expired verification OTP", 400);
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerification = undefined; // Clear verification OTP

    // Update status if pending
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate with Firebase
 * @route   POST /api/auth/firebase
 * @access  Public
 */
export const firebaseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { idToken }: FirebaseAuthRequest = req.body;

    // Verify Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    if (!decodedToken) {
      throw new AppError("Invalid Firebase token", 401);
    }

    // Get Firebase user
    const firebaseUser = await getAuth().getUser(decodedToken.uid);

    // Check if user exists in our database
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });

    // If user doesn't exist, check by email
    if (!user && firebaseUser.email) {
      user = await User.findOne({ email: firebaseUser.email });

      // If user exists by email, link Firebase UID
      if (user) {
        user.firebaseUid = firebaseUser.uid;
        await user.save();
      }
    }

    // If user still doesn't exist, create a new one
    if (!user) {
      // Extract name from Firebase user
      const firstName = firebaseUser.displayName
        ? firebaseUser.displayName.split(" ")[0]
        : "User";

      const lastName = firebaseUser.displayName
        ? firebaseUser.displayName.split(" ").slice(1).join(" ")
        : String(Date.now());

      user = await User.create({
        firstName,
        lastName,
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
        avatar: firebaseUser.photoURL,
        role: "customer",
        status: UserStatus.ACTIVE,
        isEmailVerified: firebaseUser.emailVerified,
      });
    }

    // Auto-create Vendor profile if user is a vendor
    if (user.role === "vendor") {
      try {
        await getOrCreateVendorProfile(user._id);
        logger.info("[FIREBASE_AUTH] Vendor profile auto-created for user:", { userId: user._id });
      } catch (vendorError) {
        logger.error(
          "[FIREBASE_AUTH] Failed to create vendor profile:",
          vendorError,
        );
      }
    }

    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);

    // Set httpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    // Return response
    res.status(200).json({
      success: true,
      message:
        "Firebase authentication successful. Auth cookies have been set.",
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full user profile with enhanced data
 */
export const getFullProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }

    const calculateProfileCompletion = (user: IUser): number => {
      let completedFields = 0;
      const totalFields = 8;

      if (user.firstName) completedFields++;
      if (user.lastName) completedFields++;
      if (user.email && user.isEmailVerified) completedFields++;
      if (user.phone && user.isPhoneVerified) completedFields++;
      if (user.avatar) completedFields++;
      if (user.dateOfBirth) completedFields++;
      if (user.addresses && user.addresses.length > 0) completedFields++;
      if (user.gender) completedFields++;

      return Math.round((completedFields / totalFields) * 100);
    };

    const userProfile = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      avatar: user.avatar || "",
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified || false,
      dateOfBirth: toDateStringSafe(user.dateOfBirth),
      gender: user.gender || "",
      bio: "",
      addresses: user.addresses || [],
      socialLinks: {
        facebook: user.socialMedia?.facebook || "",
        instagram: user.socialMedia?.instagram || "",
        twitter: user.socialMedia?.twitter || "",
        linkedin: user.socialMedia?.linkedin || "",
        website: user.socialMedia?.website || "",
      },
      securitySettings: {
        twoFactorEnabled: user.twoFactorAuth?.enabled || false,
        loginNotifications: true,
        securityAlerts: true,
        lastPasswordChange: toISOStringSafe(user.updatedAt),
        activeDevices: [],
      },
      privacySettings: {
        profileVisibility: "public" as const,
        showEmail: false,
        showPhone: false,
        showBirthDate: false,
        dataProcessingConsent: true,
        marketingEmails: true,
        thirdPartySharing: false,
      },
      preferences: {
        language: user.preferences?.language || "en",
        currency: user.preferences?.currency || "AED",
        timezone: user.preferences?.timezone || "Asia/Dubai",
        theme: "light" as const,
        notifications: {
          email: user.preferences?.notifications?.email ?? true,
          sms: user.preferences?.notifications?.sms ?? false,
          push: user.preferences?.notifications?.push ?? true,
          marketing: user.preferences?.notifications?.email ?? true,
          security: true,
          bookingReminders: true,
          eventUpdates: true,
        },
      },
      profileCompletion: calculateProfileCompletion(user),
      lastActiveAt: toISOStringSafe(user.updatedAt),
      memberSince: toISOStringSafe(user.createdAt),
      createdAt: toISOStringSafe(user.createdAt),
      updatedAt: toISOStringSafe(user.updatedAt),
    };

    res.status(200).json({
      success: true,
      message: "Full profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new address to user profile
 */
export const addAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    // Fetch user from database as Mongoose document (not from cache)
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { street, city, state, zipCode, country, isDefault }: IAddress =
      req.body;

    // If this is being set as default, unset all other default addresses
    if (isDefault) {
      if (user.addresses && user.addresses.length > 0) {
        user.addresses = user.addresses.map((addr) => ({
          ...addr,
          isDefault: false,
        }));
      }
    }

    // Add new address
    const newAddress: IAddress = {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || user.addresses?.length === 0,
    };

    if (!user.addresses) {
      user.addresses = [];
    }
    user.addresses.push(newAddress);

    // Mark addresses array as modified for Mongoose to detect the change
    user.markModified("addresses");

    await user.save();

    // Invalidate user cache to ensure fresh data on next request
    const cacheKey = `user:${userId}`;
    await cacheService.delete(cacheKey);

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: {
        addresses: user.addresses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing address
 */
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    // Fetch user from database as Mongoose document (not from cache)
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { addressIndex } = req.params;
    const index = parseInt(addressIndex, 10);

    if (!user.addresses || index < 0 || index >= user.addresses.length) {
      throw new AppError("Address not found", 404);
    }

    const { street, city, state, zipCode, country, isDefault }: IAddress =
      req.body;

    // If this is being set as default, unset all other default addresses
    if (isDefault) {
      user.addresses = user.addresses.map((addr, i) => ({
        ...addr,
        isDefault: i === index ? true : false,
      }));
    }

    // Update the address
    user.addresses[index] = {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault:
        isDefault !== undefined ? isDefault : user.addresses[index].isDefault,
    };

    // Mark addresses array as modified for Mongoose to detect the change
    user.markModified("addresses");

    await user.save();

    // Invalidate user cache to ensure fresh data on next request
    const cacheKey = `user:${userId}`;
    await cacheService.delete(cacheKey);

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: {
        addresses: user.addresses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an address
 */
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    // Fetch user from database as Mongoose document (not from cache)
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { addressIndex } = req.params;
    const index = parseInt(addressIndex, 10);

    if (!user.addresses || index < 0 || index >= user.addresses.length) {
      throw new AppError("Address not found", 404);
    }

    const wasDefault = user.addresses[index].isDefault;

    // Remove the address
    user.addresses.splice(index, 1);

    // Mark addresses array as modified for Mongoose to detect the change
    user.markModified("addresses");

    // If the deleted address was default and there are still addresses, set the first one as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    // Invalidate user cache to ensure fresh data on next request
    const cacheKey = `user:${userId}`;
    await cacheService.delete(cacheKey);

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: {
        addresses: user.addresses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user avatar
 */
export const updateAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const startTime = Date.now();

  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const { avatar }: { avatar: string } = req.body;

    if (!avatar) {
      throw new AppError("Avatar URL is required", 400);
    }

    // Fetch current user to get old avatar
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const oldAvatarUrl = user.avatar;

    // Extract UUID from avatar URL if it's a UUID-based URL
    let newMediaAssetId: string | null = null;
    const uuidMatch = avatar.match(/\/api\/media\/file\/([a-f0-9-]+)/i);

    if (uuidMatch) {
      // UUID-based URL - verify MediaAsset exists
      const uuid = uuidMatch[1];
      const mediaAsset = await MediaAsset.findOne({ uuid });

      if (!mediaAsset) {
        throw new AppError("Avatar media asset not found", 404);
      }

      // Verify it's an image
      if (!mediaAsset.mimeType.startsWith("image/")) {
        throw new AppError("Avatar must be an image file", 400);
      }

      // Verify it belongs to this user (security check)
      if (mediaAsset.uploadedBy.toString() !== userId.toString()) {
        throw new AppError("You can only use avatars you uploaded", 403);
      }

      newMediaAssetId = mediaAsset._id.toString();

      // Track usage for new avatar
      await mediaService.trackUsage(
        newMediaAssetId,
        "User",
        "avatar",
        new mongoose.Types.ObjectId(userId),
      );
    }
    // else: Full URL (backward compatibility) - just store it

    // Update user's avatar
    user.avatar = avatar;
    await user.save();

    // Clean up old avatar if it was a MediaAsset
    if (oldAvatarUrl) {
      const oldUuidMatch = oldAvatarUrl.match(
        /\/api\/media\/file\/([a-f0-9-]+)/i,
      );
      if (oldUuidMatch) {
        const oldUuid = oldUuidMatch[1];
        const oldMediaAsset = await MediaAsset.findOne({ uuid: oldUuid });

        if (oldMediaAsset) {
          // Untrack usage from old avatar
          await mediaService.untrackUsage(
            oldMediaAsset._id.toString(),
            "User",
            new mongoose.Types.ObjectId(userId),
          );

          // Optional: Delete old avatar if no longer used anywhere
          if (oldMediaAsset.usageCount === 0) {
            logger.info(
              `Auto-deleting unused avatar MediaAsset ${oldMediaAsset._id}`,
            );
            await mediaService.deleteMedia(oldMediaAsset._id.toString(), false);
          }
        }
      }
    }

    // Invalidate user cache
    const cacheKey = `user:${userId}`;
    await cacheService.delete(cacheKey);

    const duration = Date.now() - startTime;

    logger.info(`Avatar updated successfully`, {
      userId,
      newAvatar: avatar,
      oldAvatar: oldAvatarUrl,
      duration: `${duration}ms`,
      isMediaAsset: !!newMediaAssetId,
    });

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      data: {
        avatar: user.avatar,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Avatar update failed after ${duration}ms`, { error });
    next(error);
  }
};

/**
 * Delete user avatar
 */
export const deleteAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const currentAvatar = user.avatar;

    // Clean up MediaAsset if avatar is UUID-based
    if (currentAvatar) {
      const uuidMatch = currentAvatar.match(
        /\/api\/media\/file\/([a-f0-9-]+)/i,
      );

      if (uuidMatch) {
        const uuid = uuidMatch[1];
        const mediaAsset = await MediaAsset.findOne({ uuid });

        if (mediaAsset) {
          // Untrack usage
          await mediaService.untrackUsage(
            mediaAsset._id.toString(),
            "User",
            new mongoose.Types.ObjectId(userId),
          );

          // Delete MediaAsset if no longer used
          if (mediaAsset.usageCount === 0) {
            logger.info(
              `Deleting unused avatar MediaAsset ${mediaAsset._id} after user deletion`,
            );
            await mediaService.deleteMedia(mediaAsset._id.toString(), false);
          }
        }
      }
    }

    // Remove avatar from user
    user.avatar = undefined;
    await user.save();

    // Invalidate user cache
    const cacheKey = `user:${userId}`;
    await cacheService.delete(cacheKey);

    logger.info(`Avatar deleted successfully`, {
      userId,
      deletedAvatar: currentAvatar,
    });

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully",
      data: {
        avatar: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send phone verification OTP
 * @route   POST /api/auth/send-phone-verification
 * @access  Private
 */
export const sendPhoneVerificationOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }

    const { phone }: { phone: string } = req.body;

    if (!phone) {
      throw new AppError("Phone number is required", 400);
    }

    // Comprehensive phone validation (format, mobile check, duplicate check)
    const phoneValidation = await validatePhoneForAPI(phone, {
      requireMobile: true,
      checkDuplicate: true,
      excludeUserId: user._id.toString(),
    });

    if (!phoneValidation.isValid) {
      throw new AppError(
        phoneValidation.error || "Invalid phone number",
        400,
        phoneValidation.errorCode,
      );
    }

    // Use the validated E.164 formatted phone number
    const validatedPhone = phoneValidation.e164Format!;

    // Generate 6-digit OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now

    // Save OTP to user
    user.phoneVerification = {
      code: verificationOTP,
      expiresAt: otpExpiry,
    };

    // Update phone if different (using validated E.164 format)
    if (user.phone !== validatedPhone) {
      user.phone = validatedPhone;
      user.isPhoneVerified = false; // Reset verification status
    }

    await user.save();

    // Send SMS with verification OTP
    const smsResult = await smsService.sendVerificationOTP(
      validatedPhone,
      verificationOTP,
    );

    if (!smsResult.success) {
      // SMS failed to send, but we've already saved the OTP to DB
      // Log the error but still allow the user to proceed (they can resend)
      logger.error(`Failed to send OTP to ${phone}:`, smsResult.error);
      throw new AppError(
        "Failed to send verification code. Please try again or contact support.",
        500,
      );
    }

    const responseData: any = {
      message: "Verification OTP sent successfully",
      provider: smsService.getProviderName(),
    };

    // Only send OTP in response during development mode
    if (process.env.NODE_ENV === "development") {
      responseData.otp = verificationOTP; // For testing only - remove in production
      logger.debug(`[DEV] Phone verification OTP for ${phone}: ${verificationOTP}`);
    }

    res.status(200).json({
      success: true,
      message: "Verification OTP sent to your phone number",
      data: responseData,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify phone number with OTP
 * @route   POST /api/auth/verify-phone
 * @access  Private
 */
export const verifyPhoneOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }

    const { otp }: { otp: string } = req.body;

    if (!otp) {
      throw new AppError("OTP is required", 400);
    }

    // Check if user has phoneVerification data
    if (!user.phoneVerification || !user.phoneVerification.code) {
      throw new AppError(
        "No verification OTP found. Please request a new one.",
        400,
      );
    }

    // Check if OTP is expired
    if (user.phoneVerification.expiresAt < new Date()) {
      user.phoneVerification = undefined;
      await user.save();
      throw new AppError(
        "Verification OTP has expired. Please request a new one.",
        400,
      );
    }

    // Verify OTP
    if (user.phoneVerification.code !== otp) {
      throw new AppError("Invalid verification OTP", 400);
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    user.phoneVerification = undefined; // Clear verification OTP

    // Update status if pending
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
      data: {
        isPhoneVerified: true,
        phone: user.phone,
      },
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend phone verification OTP
 * @route   POST /api/auth/resend-phone-verification
 * @access  Private
 */
export const resendPhoneVerificationOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError("User not authenticated", 401);
    }

    if (!user.phone) {
      throw new AppError(
        "No phone number found. Please add a phone number first.",
        400,
      );
    }

    if (user.isPhoneVerified) {
      throw new AppError("Phone number is already verified", 400);
    }

    // Generate new OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry();

    user.phoneVerification = {
      code: verificationOTP,
      expiresAt: otpExpiry,
    };

    await user.save();

    // Send SMS with verification OTP
    const smsResult = await smsService.sendVerificationOTP(
      user.phone,
      verificationOTP,
    );

    if (!smsResult.success) {
      logger.error(`Failed to resend OTP to ${user.phone}:`, smsResult.error);
      throw new AppError(
        "Failed to send verification code. Please try again or contact support.",
        500,
      );
    }

    const responseData: any = {
      message: "Verification OTP resent successfully",
      provider: smsService.getProviderName(),
    };

    // Only send OTP in response during development mode
    if (process.env.NODE_ENV === "development") {
      responseData.otp = verificationOTP; // For testing only - remove in production
      logger.debug(`[DEV] Phone verification OTP for ${user.phone}: ${verificationOTP}`);
    }

    res.status(200).json({
      success: true,
      message: "Verification OTP resent to your phone number",
      data: responseData,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};
