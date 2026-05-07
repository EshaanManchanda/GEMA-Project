import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";

/**
 * Rate limiting configuration for different endpoint types
 */

// Helper function to create custom error message
const createErrorMessage = (retryAfter: number) => ({
  success: false,
  message: `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
  error: "RATE_LIMIT_EXCEEDED",
  retryAfter: retryAfter * 1000, // Convert to milliseconds
});

/**
 * General API rate limiter
 * Limit: 100 requests per 15 minutes per IP
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: createErrorMessage(15 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req: Request) => {
    // Use IP address as key
    return req.ip || req.socket.remoteAddress || "unknown";
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(createErrorMessage(15 * 60));
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limit: 5 requests per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: createErrorMessage(15 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req: Request) => {
    // Use combination of IP and email for more specific limiting
    const email = req.body?.email || "";
    return `${req.ip}-${email}`;
  },
  handler: (req: Request, res: Response) => {
    console.warn(
      `Rate limit exceeded for auth attempt from IP: ${req.ip}, email: ${req.body?.email}`,
    );
    res.status(429).json({
      ...createErrorMessage(15 * 60),
      message:
        "Too many login attempts. Please try again later or reset your password.",
    });
  },
});

/**
 * Password reset rate limiter
 * Limit: 3 requests per hour per IP
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: createErrorMessage(60 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || "";
    return `reset-${req.ip}-${email}`;
  },
  handler: (req: Request, res: Response) => {
    console.warn(
      `Password reset rate limit exceeded from IP: ${req.ip}, email: ${req.body?.email}`,
    );
    res.status(429).json({
      ...createErrorMessage(60 * 60),
      message: "Too many password reset requests. Please try again later.",
    });
  },
});

/**
 * Email verification rate limiter
 * Limit: 5 requests per hour per IP
 */
export const emailVerificationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: createErrorMessage(60 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || "";
    return `verify-${req.ip}-${email}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      ...createErrorMessage(60 * 60),
      message:
        "Too many verification requests. Please check your email or try again later.",
    });
  },
});

/**
 * File upload rate limiter
 * Limit: 20 uploads per hour per user
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: createErrorMessage(60 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?._id?.toString() || req.ip;
    return `upload-${userId}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      ...createErrorMessage(60 * 60),
      message: "Upload limit exceeded. Please try again later.",
    });
  },
});

/**
 * API creation rate limiter (for creating events, orders, etc.)
 * Limit: 30 requests per hour per user
 */
export const createResourceLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: createErrorMessage(60 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?._id?.toString() || req.ip;
    return `create-${userId}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      ...createErrorMessage(60 * 60),
      message: "Too many creation requests. Please slow down.",
    });
  },
});

/**
 * Admin action rate limiter
 * Limit: 200 requests per 15 minutes for admin users
 */
export const adminLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: createErrorMessage(15 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?._id?.toString() || req.ip;
    return `admin-${userId}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(createErrorMessage(15 * 60));
  },
});

/**
 * Search/query rate limiter
 * Limit: 60 requests per minute for search endpoints
 */
export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: createErrorMessage(60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?._id?.toString() || req.ip;
    return `search-${userId}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      ...createErrorMessage(60),
      message: "Too many search requests. Please slow down.",
    });
  },
});

/**
 * Payment processing rate limiter
 * Limit: 10 payment attempts per hour per user
 */
export const paymentLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: createErrorMessage(60 * 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?._id?.toString() || req.ip;
    return `payment-${userId}`;
  },
  handler: (req: Request, res: Response) => {
    console.warn(
      `Payment rate limit exceeded for user: ${(req as any).user?._id}, IP: ${req.ip}`,
    );
    res.status(429).json({
      ...createErrorMessage(60 * 60),
      message:
        "Too many payment attempts. Please contact support if you need assistance.",
    });
  },
});

/**
 * Flexible rate limiter factory
 * Creates a custom rate limiter with specified options
 */
export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: createErrorMessage(options.windowMs / 1000),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?._id?.toString() || req.ip;
      const prefix = options.keyPrefix || "custom";
      return `${prefix}-${userId}`;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        ...createErrorMessage(options.windowMs / 1000),
        message:
          options.message || "Too many requests. Please try again later.",
      });
    },
  });
};

export default {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  uploadLimiter,
  createResourceLimiter,
  adminLimiter,
  searchLimiter,
  paymentLimiter,
  createCustomLimiter,
};
