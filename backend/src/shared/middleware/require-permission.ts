import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error";
import { Permission, ROLE_PERMISSIONS } from "../permissions";

export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return next(new AppError("Not authorized to perform this action", 403));
    }

    next();
  };
};
