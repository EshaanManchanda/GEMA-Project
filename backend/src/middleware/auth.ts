import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './error';
import { User, IUser } from '../models'; // Removed Role import
import { getAuth } from 'firebase-admin/auth';

interface JwtPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Define the user property with IUser type
      firebaseUser?: any; // Keep firebaseUser if it's used elsewhere
    }
  }
}

/**
 * Middleware to authenticate users via JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Log for debugging
  console.log(`Auth attempt on ${req.method} ${req.path}:`, {
    hasAuthHeader: !!req.headers.authorization,
    tokenLength: token ? token.length : 0,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });

  if (!token) {
    console.log('No token provided');
    return next(new AppError('Not authorized to access this route', 401));
  }

  // Decode token payload without verification (for debugging)
  try {
    const decodedPayload = jwt.decode(token) as any;
    if (decodedPayload && decodedPayload.exp && decodedPayload.iat) {
      const now = Math.floor(Date.now() / 1000);
      const issuedDate = new Date(decodedPayload.iat * 1000).toISOString();
      const expiryDate = new Date(decodedPayload.exp * 1000).toISOString();
      const ageInSeconds = now - decodedPayload.iat;
      const ageInDays = Math.floor(ageInSeconds / 86400);

      console.log('Token payload:', {
        userId: decodedPayload.id,
        issuedAt: issuedDate,
        expiresAt: expiryDate,
        tokenAge: `${ageInDays} days, ${Math.floor((ageInSeconds % 86400) / 3600)} hours`,
        isExpired: now > decodedPayload.exp
      });
    }
  } catch (decodeError) {
    console.log('Failed to decode token payload:', decodeError);
  }

  try {
    // Add clock tolerance to handle time synchronization issues
    const decoded = jwt.verify(token, config.jwtSecret, {
      clockTolerance: 60 // Allow 60 seconds clock skew
    }) as JwtPayload;

    const user = await User.findById(decoded.id);

    if (!user) {
      console.log(`User not found for ID: ${decoded.id}`);
      return next(new AppError('User not found', 404));
    }

    console.log(`Authentication successful for user: ${user.email}`);
    req.user = user as IUser; // Cast to IUser
    next();
  } catch (error) {
    console.log('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');

    // Enhanced debugging for token expiration issues
    if (error instanceof jwt.TokenExpiredError) {
      const currentTime = Math.floor(Date.now() / 1000);
      const expiredAtTimestamp = error.expiredAt.getTime() / 1000;
      const timeDifference = currentTime - expiredAtTimestamp;
      const daysExpired = Math.floor(timeDifference / 86400);

      console.log('Token expiration debug:', {
        currentServerTime: currentTime,
        tokenExpiredAt: error.expiredAt,
        timeDifference: timeDifference,
        daysExpired: daysExpired
      });

      // Provide different error messages based on how old the token is
      if (daysExpired > 1) {
        return next(new AppError(
          `Token expired ${daysExpired} days ago. Please login again at /api/auth/login to get a fresh token.`,
          401
        ));
      } else {
        return next(new AppError(
          'Token expired. Please refresh your token using the /api/auth/refresh-token endpoint or login again.',
          401
        ));
      }
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please login again.', 401));
    }

    if (error instanceof jwt.NotBeforeError) {
      return next(new AppError('Token not yet valid.', 401));
    }

    return next(new AppError('Not authorized, token failed', 401));
  }
};

/**
 * Middleware to authenticate users via Firebase
 */
export const authenticateFirebase = async (req: Request, res: Response, next: NextFunction) => {
  let idToken;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    idToken = req.headers.authorization.split(' ')[1];
  }

  if (!idToken) {
    return next(new AppError('No Firebase ID token provided', 401));
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken; // Attach Firebase decoded token to request
    next();
  } catch (error) {
    return next(new AppError('Firebase authentication failed', 401));
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('🔐 Authorization check:', {
      endpoint: `${req.method} ${req.path}`,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      userRoleType: typeof req.user?.role,
      requiredRoles: roles,
      requiredRolesTypes: roles.map(r => typeof r),
      hasUser: !!req.user,
      hasRole: !!req.user?.role
    });

    if (!req.user || !req.user.role) {
      console.log('❌ Authorization failed: User or role not found');
      return next(new AppError('User role not found', 403));
    }

    // Check if the user's role is included in the allowed roles
    const isAuthorized = roles.includes(req.user.role);

    console.log('🔍 Role check result:', {
      isAuthorized,
      exactMatch: roles.find(r => r === req.user.role),
      caseInsensitiveMatch: roles.find(r => r.toLowerCase() === req.user.role.toLowerCase())
    });

    if (!isAuthorized) {
      console.log('❌ Authorization failed: Role not in allowed list');
      return next(new AppError('Not authorized to perform this action', 403));
    }

    console.log('✅ Authorization successful');
    next();
  };
};