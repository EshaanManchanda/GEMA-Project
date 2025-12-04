export { authenticate, authenticateFirebase, authorize } from './auth';
export { errorHandler, notFound, AppError } from './error';
export { default as catchAsync } from '../utils/catchAsync';
export { validate } from './validation';
export { timeoutMiddleware } from './timeout';
export {
  requirePhoneVerification,
  conditionalPhoneVerification,
  optionalPhoneVerification,
  requirePhoneVerificationCustom,
  checkPhoneVerificationStatus,
} from './requirePhoneVerification';

// Security middleware
export {
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
} from './security';

// Rate limiting middleware
export {
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
} from './rateLimiter';