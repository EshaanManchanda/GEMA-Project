import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import { getAuth } from '../config/firebase';
import User from '../models/User';
import { ApiResponse } from '../types';

/**
 * Middleware to authenticate users via JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      } as ApiResponse);
      return;
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      } as ApiResponse);
      return;
    }

    // Find user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.'
      } as ApiResponse);
      return;
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      errors: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
};

/**
 * Middleware to authenticate users via Firebase
 */
export const authenticateFirebase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      } as ApiResponse);
      return;
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify Firebase token
    const decodedToken = await getAuth().verifyIdToken(token);
    if (!decodedToken) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired Firebase token.'
      } as ApiResponse);
      return;
    }

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    // Attach Firebase user to request
    req.firebaseUser = decodedToken;
    
    // If user exists in our database, attach it too
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Firebase authentication failed.',
      errors: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.'
      } as ApiResponse);
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      } as ApiResponse);
      return;
    }

    next();
  };
};