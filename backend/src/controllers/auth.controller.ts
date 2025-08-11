import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { generateToken, generateRefreshToken } from '../config/jwt';
import { User, UserRole, UserStatus, RefreshToken, IUser } from '../models';
import { AppError } from '../middleware';
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
  UserResponse
} from '../types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sendEmail from '../utils/mailer';


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
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

/**
 * Generate authentication tokens
 */
const generateAuthTokens = async (userId: string, req: Request): Promise<{ accessToken: string, refreshToken: string }> => {
  // Generate access token
  const accessToken = generateToken({ id: userId });
  
  // Generate refresh token
  const refreshToken = generateRefreshToken({ id: userId });
  
  // Calculate expiry date (from JWT config)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
  
  // Save refresh token to database
  await RefreshToken.create({
    token: refreshToken,
    user: userId,
    expiresAt,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  return { accessToken, refreshToken };
};

/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('Register function entered');
  try {
    if (!req.body) {
      throw new AppError('Request body is missing', 400);
    }
    const { firstName, lastName, email, password, phone }: RegisterRequest = req.body;
    console.log('Request body received:', { firstName, lastName, email, phone });
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    
    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ email });
    console.log('Existing user check complete. User found:', !!existingUser);
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now
    
    // Create new user
    console.log('Creating new user...');
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      phone,
      role: UserRole.CUSTOMER,
      status: UserStatus.PENDING,
      emailVerification: {
        token: verificationToken,
        expiresAt: tokenExpiry
      }
    });
    
    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);
    
    // TODO: Send verification email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      text: `Please verify your email address by clicking on this link: ${verificationLink}`,
      html: `<p>Please verify your email address by clicking on this link: <a href="${verificationLink}">${verificationLink}</a></p>`,
    });
    
    // Return response
    console.log('Registration successful');
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(user),
        tokens
      }
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification link
 * @route   POST /api/auth/resend-verification-email
 * @access  Public
 */
export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email }: { email: string } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now

    user.emailVerification = {
      token: verificationToken,
      expiresAt: tokenExpiry
    };

    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Resend Email Verification Link',
      text: `Please verify your email address by clicking on this link: ${verificationLink}`,
      html: `<p>Please verify your email address by clicking on this link: <a href="${verificationLink}">${verificationLink}</a></p>`,
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
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
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Check if user has a password (might be social login only)
    if (!user.passwordHash) {
      throw new AppError('This account does not have a password. Please use social login.', 400);
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Record failed login attempt
      user.loginAttempts = user.loginAttempts || [];
      user.loginAttempts.push({
        timestamp: new Date(),
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        success: false
      });
      await user.save();
      
      throw new AppError('Invalid credentials', 401);
    }
    
    // Check if user is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }
    
    // Record successful login
    user.loginAttempts = user.loginAttempts || [];
    user.loginAttempts.push({
      timestamp: new Date(),
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      success: true
    });
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);
    
    // Return response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        tokens
      }
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      // Revoke the refresh token
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
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
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token }: RefreshTokenRequest = req.body;
    
    // Find the refresh token in the database
    const refreshTokenDoc = await RefreshToken.findOne({ token, isRevoked: false });
    if (!refreshTokenDoc) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
    
    // Check if token is expired
    if (refreshTokenDoc.expiresAt < new Date()) {
      // Mark as revoked
      refreshTokenDoc.isRevoked = true;
      await refreshTokenDoc.save();
      
      throw new AppError('Refresh token expired', 401);
    }
    
    // Get user
    const user = await User.findById(refreshTokenDoc.user);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Generate new tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);
    
    // Revoke old refresh token
    refreshTokenDoc.isRevoked = true;
    await refreshTokenDoc.save();
    
    // Return response
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: formatUserResponse(user),
        tokens
      }
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: formatUserResponse(user)
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
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, phone }: UpdateProfileRequest = req.body;
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: formatUserResponse(user)
    } as ApiResponse<UserResponse>);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }
    
    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
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
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email }: ForgotPasswordRequest = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that the user doesn't exist
      res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      } as ApiResponse);
      return;
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // 1 hour from now
    
    // Save reset token to user
    user.passwordReset = {
      token: resetToken,
      expiresAt: tokenExpiry
    };
    await user.save();
    
    // TODO: Send password reset email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n${resetLink}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
      html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p><p>Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    });
    
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword }: ResetPasswordRequest = req.body;
    
    // Find user by reset token
    const user = await User.findOne({
      'passwordReset.token': token,
      'passwordReset.expiresAt': { $gt: new Date() }
    });
    
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    
    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    user.passwordReset = undefined; // Clear reset token
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
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
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token }: VerifyEmailRequest = req.body;
    
    // Find user by verification token
    const user = await User.findOne({
      'emailVerification.token': token,
      'emailVerification.expiresAt': { $gt: new Date() }
    });
    
    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    
    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerification = undefined; // Clear verification token
    
    // Update status if pending
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
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
export const firebaseAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken }: FirebaseAuthRequest = req.body;
    
    // Verify Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    if (!decodedToken) {
      throw new AppError('Invalid Firebase token', 401);
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
      const firstName = firebaseUser.displayName ? 
        firebaseUser.displayName.split(' ')[0] : 
        'User';
      
      const lastName = firebaseUser.displayName ? 
        firebaseUser.displayName.split(' ').slice(1).join(' ') : 
        String(Date.now());
      
      user = await User.create({
        firstName,
        lastName,
        email: firebaseUser.email,
        firebaseUid: firebaseUser.uid,
        avatar: firebaseUser.photoURL,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        isEmailVerified: firebaseUser.emailVerified
      });
    }
    
    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);
    
    // Return response
    res.status(200).json({
      success: true,
      message: 'Firebase authentication successful',
      data: {
        user: formatUserResponse(user),
        tokens
      }
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    next(error);
  }
};