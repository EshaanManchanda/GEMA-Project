import { Request, Response, NextFunction } from 'express';
import { config, logger } from '../config';
import { ErrorResponse } from '../types';

/**
 * Error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error response
  const errorResponse: ErrorResponse = {
    success: false,
    message: 'Server Error',
    errors: {}
  };
  

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    errorResponse.message = 'Validation Error';
    errorResponse.errors = Object.values(err.errors).map((val: any) => val.message);
    return res.status(400).json(errorResponse);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    errorResponse.message = 'Duplicate Field Value';
    errorResponse.errors = { field: Object.keys(err.keyValue)[0], value: Object.values(err.keyValue)[0] };
    return res.status(400).json(errorResponse);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token expired';
    return res.status(401).json(errorResponse);
  }

  // Firebase Auth errors
  if (err.code && err.code.startsWith('auth/')) {
    errorResponse.message = 'Authentication Error';
    errorResponse.errors = { code: err.code, message: err.message };
    return res.status(401).json(errorResponse);
  }

  // Custom error with status code
  if (err.statusCode) {
    errorResponse.message = err.message || 'Error';
    errorResponse.errors = err.errors || {};
    return res.status(err.statusCode).json(errorResponse);
  }

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
  }

  // Generic server error
  errorResponse.message = err.message || 'Server Error';
  res.status(err.statusCode || 500).json(errorResponse);
};

/**
 * Not found middleware
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Custom error class
 */
export class AppError extends Error {
  statusCode: number;
  errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}