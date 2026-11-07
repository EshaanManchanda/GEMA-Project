import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/index";
import { exportUserData, deleteOwnAccount } from "../services/account.service";
import { clearAuthCookies } from "./auth.controller";
import { audit, AuditAction } from "../utils/auditLog";

const uid = (req: AuthRequest) => String(req.user?._id || req.user?.id);

// POST /api/auth/export-data — a copy of everything we hold about the caller
export const exportMyData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await exportUserData(uid(req)) });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/delete-account { password } or { confirm: "DELETE" } for Google-only accounts
export const deleteMyAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    await deleteOwnAccount(userId, { password: req.body?.password, confirm: req.body?.confirm });
    audit({ action: AuditAction.ACCOUNT_DELETED, userId, req });
    clearAuthCookies(res);
    res.json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    next(error);
  }
};
