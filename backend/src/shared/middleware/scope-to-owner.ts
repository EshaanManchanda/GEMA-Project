import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../../middleware/error";
import { UserRole } from "../../models/index";

export interface ScopedRequest extends Request {
  resource?: any;
}

export const scopeToOwner = (Model: mongoose.Model<any>) => {
  return async (req: ScopedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
      return next();
    }

    const resource = await Model.findById(req.params.id);
    if (!resource) {
      return next(new AppError("Resource not found", 404));
    }

    const isOwner = (
      resource.userId?.toString() === req.user._id.toString() ||
      resource.vendorId?.toString() === (req.user as any).vendorId?.toString() ||
      resource.schoolId?.toString() === (req.user as any).schoolId?.toString() ||
      resource.teacherId?.toString() === (req.user as any).teacherProfileId?.toString()
    );

    if (!isOwner) {
      return next(new AppError("Not authorized to access this resource", 403));
    }

    req.resource = resource;
    next();
  };
};
