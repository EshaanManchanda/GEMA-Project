import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { generateToken, generateRefreshToken } from '../config/jwt';
import { User, UserStatus, RefreshToken, IUser, IAddress } from '../models';
import { AppError } from '../middleware';
import { emailService } from '../services/email.service';
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
import { generateOTP, getOTPExpiry } from '../utils/otp';


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
    
    // Generate verification OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now
    
    // Create new user
    console.log('Creating new user...');
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      phone,
      role: 'customer', // Using string literal since UserRole enum is not defined
      status: UserStatus.PENDING,
      emailVerification: {
        otp: verificationOTP,
        expiresAt: otpExpiry
      }
    });
    
    // Generate tokens
    const tokens = await generateAuthTokens(user._id.toString(), req);
    
    // Send verification email
    await emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      otp: verificationOTP,
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

    // Generate new verification OTP
    const verificationOTP = generateOTP();
    const otpExpiry = getOTPExpiry(); // 10 minutes from now

    user.emailVerification = {
      otp: verificationOTP,
      expiresAt: otpExpiry
    };

    await user.save();

    await emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      otp: verificationOTP,
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
    
    // Send password reset email
    await emailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetToken,
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
    const { otp }: VerifyEmailRequest = req.body;
    
    // Find user by verification OTP
    const user = await User.findOne({
      'emailVerification.otp': otp,
      'emailVerification.expiresAt': { $gt: new Date() }
    });
    
    if (!user) {
      throw new AppError('Invalid or expired verification OTP', 400);
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
        role: 'customer',
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

/**
 * Get full user profile with enhanced data
 */
export const getFullProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
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
      phone: user.phone || '',
      avatar: user.avatar || '',
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified || false,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
      gender: user.gender || '',
      bio: '',
      addresses: user.addresses || [],
      socialLinks: {
        facebook: user.socialMedia?.facebook || '',
        instagram: user.socialMedia?.instagram || '',
        twitter: user.socialMedia?.twitter || '',
        linkedin: user.socialMedia?.linkedin || '',
        website: user.socialMedia?.website || ''
      },
      securitySettings: {
        twoFactorEnabled: user.twoFactorAuth?.enabled || false,
        loginNotifications: true,
        securityAlerts: true,
        lastPasswordChange: user.updatedAt.toISOString(),
        activeDevices: []
      },
      privacySettings: {
        profileVisibility: 'public' as const,
        showEmail: false,
        showPhone: false,
        showBirthDate: false,
        dataProcessingConsent: true,
        marketingEmails: true,
        thirdPartySharing: false
      },
      preferences: {
        language: 'en',
        currency: 'AED',
        timezone: 'Asia/Dubai',
        theme: 'light' as const,
        notifications: {
          email: true,
          sms: false,
          push: true,
          marketing: true,
          security: true,
          bookingReminders: true,
          eventUpdates: true
        }
      },
      profileCompletion: calculateProfileCompletion(user),
      lastActiveAt: user.updatedAt.toISOString(),
      memberSince: user.createdAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Full profile retrieved successfully',
      data: userProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new address to user profile
 */
export const addAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { street, city, state, zipCode, country, isDefault }: IAddress = req.body;

    // If this is being set as default, unset all other default addresses
    if (isDefault) {
      if (user.addresses && user.addresses.length > 0) {
        user.addresses = user.addresses.map(addr => ({ ...addr, isDefault: false }));
      }
    }

    // Add new address
    const newAddress: IAddress = {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || (user.addresses?.length === 0)
    };

    if (!user.addresses) {
      user.addresses = [];
    }
    user.addresses.push(newAddress);

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: {
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing address
 */
export const updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { addressIndex } = req.params;
    const index = parseInt(addressIndex, 10);

    if (!user.addresses || index < 0 || index >= user.addresses.length) {
      throw new AppError('Address not found', 404);
    }

    const { street, city, state, zipCode, country, isDefault }: IAddress = req.body;

    // If this is being set as default, unset all other default addresses
    if (isDefault) {
      user.addresses = user.addresses.map((addr, i) => ({
        ...addr,
        isDefault: i === index ? true : false
      }));
    }

    // Update the address
    user.addresses[index] = {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault !== undefined ? isDefault : user.addresses[index].isDefault
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an address
 */
export const deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { addressIndex } = req.params;
    const index = parseInt(addressIndex, 10);

    if (!user.addresses || index < 0 || index >= user.addresses.length) {
      throw new AppError('Address not found', 404);
    }

    const wasDefault = user.addresses[index].isDefault;

    // Remove the address
    user.addresses.splice(index, 1);

    // If the deleted address was default and there are still addresses, set the first one as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: {
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user avatar
 */
export const updateAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { avatar }: { avatar: string } = req.body;

    if (!avatar) {
      throw new AppError('Avatar URL is required', 400);
    }

    user.avatar = avatar;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user avatar
 */
export const deleteAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    user.avatar = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar deleted successfully',
      data: {
        avatar: null
      }
    });
  } catch (error) {
    next(error);
  }
};