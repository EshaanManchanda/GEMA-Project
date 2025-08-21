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

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
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
    if (!req.user || !req.user.role) {
      return next(new AppError('User role not found', 403));
    }

    // Check if the user's role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized to perform this action', 403));
    }
    next();
  };
};