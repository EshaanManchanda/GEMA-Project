import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config, logger } from "../config/index";
import { AppError } from "./error";
import { User, IUser } from "../models/index"; // Removed Role import
import { getAuth } from "firebase-admin/auth";
import { cacheService } from "../shared/services/cache.service";

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
 * Supports both httpOnly cookies (preferred) and Authorization header (for API clients)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;

  // Try to get token from httpOnly cookie first (more secure)
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Fall back to Authorization header for API clients
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Development-only logging with conditional execution
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEBUG_AUTH === "true"
  ) {
    logger.debug("[AUTH] Auth attempt:", {
      method: req.method,
      path: req.path,
      hasAuthHeader: !!req.headers.authorization,
      hasCookie: !!req.cookies?.accessToken,
      tokenSource: req.cookies?.accessToken
        ? "cookie"
        : req.headers.authorization
          ? "header"
          : "none",
      origin: req.headers.origin,
    });
  }

  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }

  // Decode token payload for debugging (dev only)
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEBUG_AUTH === "true"
  ) {
    try {
      const decodedPayload = jwt.decode(token) as any;
      if (decodedPayload && decodedPayload.exp && decodedPayload.iat) {
        const now = Math.floor(Date.now() / 1000);
        const ageInSeconds = now - decodedPayload.iat;
        const ageInDays = Math.floor(ageInSeconds / 86400);

        logger.debug("Token payload:", {
          userId: decodedPayload.id,
          tokenAge: `${ageInDays} days, ${Math.floor((ageInSeconds % 86400) / 3600)} hours`,
          isExpired: now > decodedPayload.exp,
        });
      }
    } catch (decodeError) {
      logger.debug("Failed to decode token payload:", decodeError);
    }
  }

  try {
    // Add clock tolerance to handle time synchronization issues
    // Keep at 60s to handle NTP drift on KVM1 VPS (see CLAUDE.md)
    const decoded = jwt.verify(token, config.jwtSecret, {
      clockTolerance: 60, // Allow 60 seconds clock skew
    }) as JwtPayload;

    // Try to get user from cache first (huge performance boost!)
    const cacheKey = `user:${decoded.id}`;
    let user = await cacheService.get<IUser>(cacheKey);

    if (!user) {
      // Cache miss - fetch from database
      const userDoc = await User.findById(decoded.id);

      if (!userDoc) {
        return next(new AppError("User not found", 404));
      }

      user = userDoc.toObject({ virtuals: ["id"] }) as IUser;

      // Cache user data for 2 minutes so role/permission changes propagate quickly
      await cacheService.set(cacheKey, user, { ttl: 120 });

      if (
        process.env.NODE_ENV === "development" &&
        process.env.DEBUG_AUTH === "true"
      ) {
        logger.debug(`User ${decoded.id} cached for 10 minutes`);
      }
    }

    req.user = user as IUser; // Cast to IUser
    next();
  } catch (error) {
    // Enhanced debugging for token expiration issues
    if (error instanceof jwt.TokenExpiredError) {
      const currentTime = Math.floor(Date.now() / 1000);
      const expiredAtTimestamp = error.expiredAt.getTime() / 1000;
      const timeDifference = currentTime - expiredAtTimestamp;
      const daysExpired = Math.floor(timeDifference / 86400);

      if (
        process.env.NODE_ENV === "development" &&
        process.env.DEBUG_AUTH === "true"
      ) {
        logger.debug("Token expiration debug:", {
          currentServerTime: currentTime,
          tokenExpiredAt: error.expiredAt,
          timeDifference: timeDifference,
          daysExpired: daysExpired,
        });
      }

      // Provide different error messages based on how old the token is
      if (daysExpired > 1) {
        return next(
          new AppError(
            `Token expired ${daysExpired} days ago. Please login again at /api/auth/login to get a fresh token.`,
            401,
          ),
        );
      } else {
        return next(
          new AppError(
            "Token expired. Please refresh your token using the /api/auth/refresh-token endpoint or login again.",
            401,
          ),
        );
      }
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError("Invalid token. Please login again.", 401));
    }

    if (error instanceof jwt.NotBeforeError) {
      return next(new AppError("Token not yet valid.", 401));
    }

    return next(new AppError("Not authorized, token failed", 401));
  }
};

/**
 * Middleware to optionally authenticate users (doesn't throw 401)
 * Used for endpoints that can handle both guest and authenticated users
 */
export const authenticateOptional = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;

  // Try to get token from httpOnly cookie first
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Fall back to Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    // No token? No problem. Just proceed without user.
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      clockTolerance: 10, // Consistent with authenticate middleware
    }) as JwtPayload;

    // Try to get user from cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await cacheService.get<IUser>(cacheKey);

    if (!user) {
      const userDoc = await User.findById(decoded.id);
      if (userDoc) {
        user = userDoc.toObject({ virtuals: ["id"] }) as IUser;
        await cacheService.set(cacheKey, user, { ttl: 600 });
      }
    }

    if (user) {
      req.user = user as IUser;
    }
    next();
  } catch (error) {
    // If token is invalid/expired, just ignore it and proceed as guest
    // This prevents 401 errors for optional auth routes
    next();
  }
};

/**
 * Middleware to authenticate users via Firebase
 */
export const authenticateFirebase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let idToken;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    idToken = req.headers.authorization.split(" ")[1];
  }

  if (!idToken) {
    return next(new AppError("No Firebase ID token provided", 401));
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken; // Attach Firebase decoded token to request
    next();
  } catch (error) {
    return next(new AppError("Firebase authentication failed", 401));
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DEBUG_AUTH === "true"
    ) {
      logger.debug("Authorization check:", {
        endpoint: `${req.method} ${req.path}`,
        userRole: req.user?.role,
        requiredRoles: roles,
        hasUser: !!req.user,
        hasRole: !!req.user?.role,
      });
    }

    if (!req.user || !req.user.role) {
      return next(new AppError("User role not found", 403));
    }

    // Check if the user's role is included in the allowed roles
    const isAuthorized = roles.includes(req.user.role);

    if (!isAuthorized) {
      // Log unauthorized access attempts in production for security monitoring
      logger.warn("Authorization failed", {
        endpoint: `${req.method} ${req.path}`,
        userRole: req.user.role,
        requiredRoles: roles,
        userId: req.user._id || req.user.id,
      });
      return next(new AppError("Not authorized to perform this action", 403));
    }

    next();
  };
};
