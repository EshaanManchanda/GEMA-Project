import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '../types/index';

/**
 * Middleware to validate request data using express-validator
 */
export const validate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check for validation errors
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // Format validation errors
  const formattedErrors = errors.array().reduce((acc: Record<string, string>, error: any) => {
    // Use 'path' or 'param' depending on express-validator version
    const field = error.path || error.param || 'unknown';
    acc[field] = error.msg;
    return acc;
  }, {});

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('❌ Validation errors:', formattedErrors);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Validation details:', errors.array());
  }

  // Return validation error response
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: formattedErrors
  } as ApiResponse);
};

// Alias for backwards compatibility
export const validateRequest = validate;