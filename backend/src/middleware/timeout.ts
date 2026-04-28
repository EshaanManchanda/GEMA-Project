import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

/**
 * Request timeout middleware
 * Prevents indefinite hangs by enforcing timeout limits per route
 *
 * @param seconds - Timeout in seconds (default: 45s)
 * @returns Express middleware function
 */
export const timeoutMiddleware = (seconds: number = 45) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutMs = seconds * 1000;

    // Set timeout on request socket
    req.setTimeout(timeoutMs, () => {
      logger.error("Request timeout", {
        path: req.path,
        method: req.method,
        timeout: seconds,
        user: (req as any).user?._id,
        query: req.query,
        timestamp: new Date().toISOString(),
      });

      // Send 408 Request Timeout if headers not sent
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: "Request timeout - operation took too long",
          timeout: `${seconds}s`,
        });
      }
    });

    // Set timeout on response socket
    res.setTimeout(timeoutMs);

    next();
  };
};
