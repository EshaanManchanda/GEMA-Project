import { Request, Response, NextFunction } from "express";

/**
 * Query Timeout Middleware
 *
 * Sets maxTimeMS on MongoDB queries to prevent long-running queries
 * that outlive the HTTP timeout. This ensures queries are killed at the
 * database level, freeing up connections faster.
 *
 * Usage:
 * - Apply globally or per-route
 * - Access via req.mongooseOptions.maxTimeMS in controllers
 */

declare global {
  namespace Express {
    interface Request {
      mongooseOptions?: {
        maxTimeMS: number;
      };
    }
  }
}

/**
 * Set query timeout based on route type
 */
export const setQueryTimeout = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const isUploadRoute =
    req.path.startsWith("/api/uploads") || req.path.startsWith("/api/media");
  const isDashboardRoute =
    req.path.includes("/dashboard") || req.path.includes("/analytics");
  const isReportRoute =
    req.path.includes("/report") || req.path.includes("/export");

  // Determine timeout based on route type
  let timeoutSeconds: number;

  if (isUploadRoute) {
    timeoutSeconds = 120; // 2 minutes for uploads
  } else if (isReportRoute) {
    timeoutSeconds = 60; // 1 minute for reports
  } else if (isDashboardRoute) {
    timeoutSeconds = 30; // 30 seconds for dashboard (should be cached)
  } else {
    timeoutSeconds = 15; // 15 seconds for regular API calls
  }

  const timeoutMs = timeoutSeconds * 1000;

  // Attach to request for use in controllers/services
  // Leave 2 second buffer for cleanup before HTTP timeout
  req.mongooseOptions = {
    maxTimeMS: timeoutMs - 2000,
  };

  next();
};

/**
 * Apply maxTimeMS to a Mongoose query
 * Helper function to use in controllers/services
 *
 * Example:
 * const events = await applyQueryTimeout(
 *   Event.find(filter),
 *   req
 * ).lean();
 */
export function applyQueryTimeout<T>(query: any, req: Request): any {
  if (req.mongooseOptions?.maxTimeMS) {
    return query.maxTimeMS(req.mongooseOptions.maxTimeMS);
  }
  return query;
}

export default {
  setQueryTimeout,
  applyQueryTimeout,
};
