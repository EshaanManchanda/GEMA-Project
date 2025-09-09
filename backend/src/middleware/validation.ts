import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '../types';

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
    acc[error.path] = error.msg;
    return acc;
  }, {});

  // Return validation error response
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: formattedErrors
  } as ApiResponse);
};

// Alias for backwards compatibility
export const validateRequest = validate;