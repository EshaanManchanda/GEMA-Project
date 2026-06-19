import { Request } from "express";
import AuditLog, { AuditAction } from "../models/AuditLog";
import logger from "../config/logger";
import { Types } from "mongoose";

interface AuditEntry {
  action: AuditAction;
  userId?: string | Types.ObjectId;
  targetId?: string | Types.ObjectId;
  req?: Request;
  metadata?: Record<string, unknown>;
}

/** Fire-and-forget audit log write — never throws, never blocks the caller. */
export function audit(entry: AuditEntry): void {
  AuditLog.create({
    action: entry.action,
    userId: entry.userId,
    targetId: entry.targetId,
    ip: entry.req?.ip,
    userAgent: entry.req?.headers["user-agent"],
    metadata: entry.metadata,
  }).catch((err) => {
    logger.error("[AUDIT] Failed to write audit log", { error: err.message, action: entry.action });
  });
}

export { AuditAction };
