import { Request, Response, NextFunction } from "express";
import { isMaintenanceMode } from "../services/settings.service";
import { authenticateOptional } from "./auth";
import { UserRole } from "../models/User";
import logger from "../config/logger";

/**
 * Path prefixes that must keep working even while maintenanceMode is on:
 * admins need to be able to log in and manage the site, health checks back
 * uptime monitoring, and payment/communication webhooks must never be told
 * to retry-later by us (the provider will just keep retrying and/or mark
 * the endpoint unhealthy).
 */
const EXEMPT_PATH_PREFIXES = [
  "/api/admin",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/health",
  "/api/payments/webhook",
  "/api/webhooks",
];

function isExemptPath(path: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Blocks public traffic with a 503 while `maintenanceMode` is enabled.
 * Admins (any authenticated user with role ADMIN) pass through unaffected.
 *
 * Mounted globally in server.ts, ahead of the main route table, so it
 * covers every module without each one needing its own check.
 */
export const maintenanceModeGuard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (isExemptPath(req.path)) {
    return next();
  }

  let maintenanceOn = false;
  try {
    maintenanceOn = await isMaintenanceMode();
  } catch (error) {
    // Fail open — a broken settings lookup should never itself take the
    // whole public site down.
    logger.error(
      `maintenanceModeGuard: failed to read setting, failing open: ${(error as Error).message}`,
    );
    return next();
  }

  if (!maintenanceOn) {
    return next();
  }

  // Only resolve the current user (cheap-ish cache/DB lookup) once we know
  // maintenance mode is actually on, so normal traffic pays no extra cost.
  await authenticateOptional(req, res, () => {
    /* no-op: authenticateOptional always calls next() itself; this callback
       exists only to satisfy its signature without double-responding. */
  });

  if (req.user?.role === UserRole.ADMIN) {
    return next();
  }

  res.set("Retry-After", "3600");
  res.status(503).json({
    success: false,
    code: "MAINTENANCE_MODE",
    message: "Kidrove is temporarily unavailable for maintenance.",
  });
};

export default maintenanceModeGuard;
