import { Request, Response, NextFunction } from "express";
import { config, logger } from "../config/index";
import { ErrorResponse } from "../types/index";

/**
 * Error handler middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log error
  logger.error(`${err.name}: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Default error response
  const errorResponse: ErrorResponse = {
    success: false,
    message: "Server Error",
    errors: {},
  };

  // Mongoose validation error
  if (err.name === "ValidationError") {
    errorResponse.message = "Validation Error";
    errorResponse.errors = Object.values(err.errors).map(
      (val: any) => val.message,
    );
    return res.status(400).json(errorResponse);
  }

  // Mongoose cast error: a malformed id or value in the request, not a
  // server fault (every handler that passes it on used to answer 500).
  if (err.name === "CastError") {
    errorResponse.message = `Invalid ${err.path || "value"}`;
    return res.status(400).json(errorResponse);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    errorResponse.message = "Duplicate Field Value";
    errorResponse.errors = {
      field: Object.keys(err.keyValue)[0],
      value: Object.values(err.keyValue)[0],
    };
    return res.status(400).json(errorResponse);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    errorResponse.message = "Invalid token";
    return res.status(401).json(errorResponse);
  }

  if (err.name === "TokenExpiredError") {
    errorResponse.message = "Token expired";
    return res.status(401).json(errorResponse);
  }

  // Firebase Auth errors
  if (typeof err.code === "string" && err.code.startsWith("auth/")) {
    errorResponse.message = "Authentication Error";
    errorResponse.errors = { code: err.code, message: err.message };
    return res.status(401).json(errorResponse);
  }

  // Custom error with status code
  if (err.statusCode) {
    errorResponse.message = err.message || "Error";
    errorResponse.errors = err.errors || {};
    return res.status(err.statusCode).json(errorResponse);
  }

  // Add stack trace in development
  if (config.nodeEnv === "development") {
    errorResponse.stack = err.stack;
  }

  // Generic server error. Internal messages (Mongo paths, stack details)
  // stay out of production responses; they're in the log above.
  errorResponse.message = config.nodeEnv === "production" ? "Server Error" : err.message || "Server Error";
  res.status(err.statusCode || 500).json(errorResponse);
};

/**
 * Not found middleware
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // statusCode, not res.status(): errorHandler answers err.statusCode || 500,
  // so a bare Error turned every unknown route into a 500 "Server Error".
  next(Object.assign(new Error(`Not Found - ${req.originalUrl}`), { statusCode: 404 }));
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

/**
 * For a handler's catch block: a malformed id/value (CastError) or failed
 * validation is the caller's fault, so let the error handler answer 400;
 * anything else becomes the handler's generic 500.
 */
export const asServerError = (error: any, message: string) =>
  error?.name === "CastError" || error?.name === "ValidationError" ? error : new AppError(message, 500);
