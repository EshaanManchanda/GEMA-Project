import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cors from 'cors';
import { AppError } from './error';

/**
 * Sanitize request data to prevent NoSQL injection
 * Removes any keys that start with $ or contain .
 */
export const sanitizeRequest = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized potentially malicious input: ${key} from ${req.ip}`);
  },
});

/**
 * Prevent HTTP Parameter Pollution attacks
 * Protects against duplicate query parameters
 */
export const preventParameterPollution = hpp({
  whitelist: [
    // Allow these parameters to appear multiple times
    'tags',
    'categories',
    'eventIds',
    'userIds',
    'status',
    'role',
    'type',
  ],
});

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Stripe, etc.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: {
    action: 'deny',
  },
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});

/**
 * CORS configuration
 */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://gema-project.onrender.com',
  'https://kidrove-frontend.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

export const corsOptions = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
});

/**
 * Additional input sanitization middleware
 * Removes potentially dangerous HTML/script tags
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query as any);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    next(new AppError('Invalid input data', 400));
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Skip sanitization for specific fields that may contain HTML
        const skipSanitization = ['description', 'content', 'bio', 'answer'];

        if (skipSanitization.includes(key)) {
          // Basic sanitization only - remove script tags but preserve HTML
          // Do NOT recursively sanitize or call sanitizeObject on whitelisted fields
          sanitized[key] = typeof obj[key] === 'string'
            ? removeScriptTags(obj[key])
            : obj[key]; // ← FIXED: Return as-is, don't recursively sanitize
        } else {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize string input
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Basic XSS prevention - remove potentially dangerous patterns
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/javascript:/gi, '');
  str = str.replace(/on\w+\s*=/gi, '');

  return str;
}

/**
 * Remove script tags from HTML content
 */
function removeScriptTags(str: string): string {
  if (typeof str !== 'string') return str;

  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Request size limiter
 * Prevents large payload attacks
 */
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    console.warn(`Large request blocked from IP: ${req.ip}, size: ${contentLength} bytes`);
    return next(new AppError('Request payload too large', 413));
  }

  next();
};

/**
 * Suspicious activity detector
 * Flags potentially malicious requests
 */
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
    /(union|select|insert|update|delete|drop|exec|script)/i, // SQL injection patterns
    /(<script|javascript:|onerror=|onload=)/i, // XSS patterns
    /(\$where|\$ne|\$gt|\$lt)/i, // NoSQL injection
  ];

  const checkString = (str: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  // Check URL
  if (checkString(req.url)) {
    console.error(`Suspicious URL detected from IP ${req.ip}: ${req.url}`);
    return next(new AppError('Invalid request', 400));
  }

  // Check query parameters
  const queryString = JSON.stringify(req.query);
  if (checkString(queryString)) {
    console.error(`Suspicious query parameters from IP ${req.ip}: ${queryString}`);
    return next(new AppError('Invalid query parameters', 400));
  }

  // Check body
  if (req.body) {
    const bodyString = JSON.stringify(req.body);
    if (checkString(bodyString)) {
      console.error(`Suspicious request body from IP ${req.ip}`);
      return next(new AppError('Invalid request data', 400));
    }
  }

  next();
};

/**
 * IP whitelist/blacklist middleware
 */
const blacklistedIPs: Set<string> = new Set();
const whitelistedIPs: Set<string> = new Set(['127.0.0.1', '::1']); // Localhost

export const checkIPRestrictions = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

  // Check blacklist
  if (blacklistedIPs.has(clientIP)) {
    console.warn(`Blocked request from blacklisted IP: ${clientIP}`);
    return next(new AppError('Access denied', 403));
  }

  // If whitelist is enabled and IP is not whitelisted
  // (Currently disabled, but can be enabled in production)
  // if (process.env.ENABLE_IP_WHITELIST === 'true' && !whitelistedIPs.has(clientIP)) {
  //   console.warn(`Blocked request from non-whitelisted IP: ${clientIP}`);
  //   return next(new AppError('Access denied', 403));
  // }

  next();
};

/**
 * Add IP to blacklist
 */
export const blacklistIP = (ip: string): void => {
  blacklistedIPs.add(ip);
  console.warn(`IP added to blacklist: ${ip}`);
};

/**
 * Remove IP from blacklist
 */
export const removeFromBlacklist = (ip: string): void => {
  blacklistedIPs.delete(ip);
  console.info(`IP removed from blacklist: ${ip}`);
};

/**
 * Request logging for security monitoring
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?._id?.toString(),
  };

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log slow requests (>1s)
    if (duration > 1000) {
      console.warn(`Slow request detected: ${req.method} ${req.url} - ${duration}ms`);
    }

    // Log failed auth attempts
    if (req.url.includes('/auth/') && res.statusCode === 401) {
      console.warn('Failed authentication attempt:', logData);
    }

    // Log server errors
    if (res.statusCode >= 500) {
      console.error('Server error:', { ...logData, statusCode: res.statusCode, duration });
    }
  });

  next();
};

/**
 * Security middleware stack
 * Apply all security measures in correct order
 */
export const applySecurityMiddleware = [
  securityHeaders,
  corsOptions,
  requestSizeLimiter,
  sanitizeRequest,
  preventParameterPollution,
  sanitizeInput,
  detectSuspiciousActivity,
  checkIPRestrictions,
  securityLogger,
];

export default {
  securityHeaders,
  corsOptions,
  sanitizeRequest,
  preventParameterPollution,
  sanitizeInput,
  requestSizeLimiter,
  detectSuspiciousActivity,
  checkIPRestrictions,
  securityLogger,
  blacklistIP,
  removeFromBlacklist,
  applySecurityMiddleware,
};
