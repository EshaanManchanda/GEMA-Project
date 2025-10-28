/**
 * Middleware to require phone verification for protected routes
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';

/**
 * Middleware to check if user has verified their phone number
 * Use this middleware on routes that require phone verification
 *
 * @example
 * ```typescript
 * router.post('/booking', authenticate, requirePhoneVerification, createBooking);
 * ```
 */
export const requirePhoneVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if phone verification is required for this user
    // Admins might be exempt from phone verification requirement
    if (req.user.role === 'admin' || req.user.role === 'employee') {
      return next();
    }

    // Check if user has a phone number
    if (!req.user.phone) {
      throw new AppError(
        'Phone number required. Please add and verify your phone number to continue.',
        403,
        'PHONE_NUMBER_REQUIRED'
      );
    }

    // Check if phone is verified
    if (!req.user.isPhoneVerified) {
      throw new AppError(
        'Phone verification required. Please verify your phone number to continue.',
        403,
        'PHONE_VERIFICATION_REQUIRED'
      );
    }

    // User has verified phone, proceed
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has verified their phone number (optional)
 * This middleware won't block the request, but will add a warning to the response
 *
 * @example
 * ```typescript
 * router.get('/profile', authenticate, optionalPhoneVerification, getProfile);
 * ```
 */
export const optionalPhoneVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.user && !req.user.isPhoneVerified) {
      // Add a header to indicate phone verification is recommended
      res.setHeader('X-Phone-Verification-Recommended', 'true');

      // Optionally add a warning message that the frontend can display
      if (!res.locals.warnings) {
        res.locals.warnings = [];
      }
      res.locals.warnings.push({
        code: 'PHONE_VERIFICATION_RECOMMENDED',
        message: 'Phone verification is recommended for enhanced security',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware factory to create custom phone verification requirements
 *
 * @param options - Configuration options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/payment', authenticate, requirePhoneVerificationCustom({
 *   exemptRoles: ['admin'],
 *   customMessage: 'Phone verification is required to process payments'
 * }), processPayment);
 * ```
 */
export const requirePhoneVerificationCustom = (options: {
  exemptRoles?: string[];
  customMessage?: string;
  errorCode?: string;
}) => {
  const {
    exemptRoles = ['admin', 'employee'],
    customMessage = 'Phone verification required to continue',
    errorCode = 'PHONE_VERIFICATION_REQUIRED',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check if user's role is exempt
      if (exemptRoles.includes(req.user.role)) {
        return next();
      }

      // Check if user has a phone number
      if (!req.user.phone) {
        throw new AppError(
          'Phone number required. Please add and verify your phone number to continue.',
          403,
          'PHONE_NUMBER_REQUIRED'
        );
      }

      // Check if phone is verified
      if (!req.user.isPhoneVerified) {
        throw new AppError(customMessage, 403, errorCode);
      }

      // User has verified phone, proceed
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check phone verification status and add info to response
 * This doesn't block the request, just adds verification status info
 */
export const checkPhoneVerificationStatus = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user) {
    res.locals.phoneVerificationStatus = {
      hasPhone: !!req.user.phone,
      isVerified: req.user.isPhoneVerified || false,
      phone: req.user.phone || null,
    };
  }

  next();
};

export default {
  requirePhoneVerification,
  optionalPhoneVerification,
  requirePhoneVerificationCustom,
  checkPhoneVerificationStatus,
};
