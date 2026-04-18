import mongoose from "mongoose";
import AdminRole from "./admin-role.model";
import SuperAdminProfile from "./super-admin-profile.model";
import AuditLog from "./audit-log.model";
import FeatureFlag from "./feature-flag.model";
import ApiKey from "./api-key.model";
import { AppError } from "../../middleware/index";
import { AdminRoleType } from "./admin-role.model";
import { AuditAction } from "./audit-log.model";
import crypto from "crypto";
import os from "os";

export interface CreateAdminRoleInput {
  userId: string;
  role: AdminRoleType;
  customPermissions?: string[];
  revokedPermissions?: string[];
  scope?: {
    eventCategories?: string[];
    blogCategories?: string[];
    regions?: string[];
  };
  expiresAt?: string;
  notes?: string;
}

export interface UpdateAdminRoleInput {
  role?: AdminRoleType;
  customPermissions?: string[];
  revokedPermissions?: string[];
  scope?: {
    eventCategories?: string[];
    blogCategories?: string[];
    regions?: string[];
  };
  expiresAt?: string;
  notes?: string;
}

export interface SystemHealth {
  uptime: number;
  memory: { total: number; free: number; used: number };
  cpu: { cores: number; loadAvg: number[] };
  platform: string;
  nodeVersion: string;
  status: "healthy" | "degraded" | "critical";
}

export interface DatabaseStats {
  collections: number;
  indexes: number;
  dataSize: number;
  indexSize: number;
  numObjects: number;
}

class SuperAdminService {
  // Admin Management
  async createAdminRole(input: CreateAdminRoleInput, assignedBy: string) {
    const existing = await AdminRole.findOne({ userId: input.userId, isActive: true });
    if (existing) throw new AppError("User already has an active admin role", 400);

    const adminRole = await AdminRole.create({
      ...input,
      assignedBy,
      assignedAt: new Date(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });

    await this.createAuditLog(assignedBy, "super_admin", AuditAction.CREATE, "/api/super-admin/admin-roles", "POST", "Admin role created", { userId: input.userId, role: input.role });

    return adminRole;
  }

  async listAllAdmins(query: { page?: number; limit?: number; role?: string; isActive?: string }) {
    const { page = 1, limit = 20, role, isActive } = query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const [adminRoles, total] = await Promise.all([
      AdminRole.find(filter).populate("userId", "firstName lastName email").populate("assignedBy", "firstName lastName").sort({ assignedAt: -1 }).skip(skip).limit(limitNum),
      AdminRole.countDocuments(filter),
    ]);

    return { adminRoles, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async updateAdminRole(id: string, input: UpdateAdminRoleInput, updatedBy: string) {
    const adminRole = await AdminRole.findByIdAndUpdate(id, {
      ...input,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    }, { new: true, runValidators: true }).populate("userId", "firstName lastName email");

    if (!adminRole) throw new AppError("Admin role not found", 404);

    await this.createAuditLog(updatedBy, "super_admin", AuditAction.UPDATE, `/api/super-admin/admin-roles/${id}`, "PUT", "Admin role updated", input);

    return adminRole;
  }

  async deleteAdminRole(id: string, deletedBy: string) {
    const adminRole = await AdminRole.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!adminRole) throw new AppError("Admin role not found", 404);

    await this.createAuditLog(deletedBy, "super_admin", AuditAction.DELETE, `/api/super-admin/admin-roles/${id}`, "DELETE", "Admin role deleted");

    return adminRole;
  }

  async suspendAdmin(id: string, reason: string, suspendedBy: string) {
    const adminRole = await AdminRole.findByIdAndUpdate(id, { isActive: false, notes: `Suspended: ${reason}` }, { new: true });
    if (!adminRole) throw new AppError("Admin role not found", 404);

    await this.createAuditLog(suspendedBy, "super_admin", AuditAction.SUSPEND, `/api/super-admin/admin-roles/${id}/suspend`, "POST", "Admin suspended", { reason });

    return adminRole;
  }

  async reinstateAdmin(id: string, reinstatedBy: string) {
    const adminRole = await AdminRole.findByIdAndUpdate(id, { isActive: true }, { new: true });
    if (!adminRole) throw new AppError("Admin role not found", 404);

    await this.createAuditLog(reinstatedBy, "super_admin", AuditAction.REINSTATE, `/api/super-admin/admin-roles/${id}/reinstate`, "POST", "Admin reinstated");

    return adminRole;
  }

  // System Operations
  async getSystemHealth(): Promise<SystemHealth> {
    const mem = process.memoryUsage();
    const status = mem.heapUsed / mem.heapTotal > 0.9 ? "critical" : mem.heapUsed / mem.heapTotal > 0.7 ? "degraded" : "healthy";

    return {
      uptime: process.uptime(),
      memory: { total: mem.heapTotal, free: mem.heapTotal - mem.heapUsed, used: mem.heapUsed },
      cpu: { cores: os.cpus().length, loadAvg: os.loadavg() },
      platform: `${os.platform()} ${os.release()}`,
      nodeVersion: process.version,
      status,
    };
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    const db = mongoose.connection.db;
    if (!db) throw new AppError("Database not connected", 503);

    const stats = await db.admin().serverStatus();
    const collections = (await db.listCollections().toArray()).length;

    return {
      collections,
      indexes: stats?.metrics?.commands?.createIndexes?.total || 0,
      dataSize: stats?.metrics?.document?.returned || 0,
      indexSize: 0,
      numObjects: stats?.connections?.current || 0,
    };
  }

  async getAuditLogs(query: { page?: number; limit?: number; action?: string; actorId?: string; startDate?: string; endDate?: string }) {
    const { page = 1, limit = 20, action, actorId, startDate, endDate } = query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (action) filter.action = action;
    if (actorId) filter.actorId = new mongoose.Types.ObjectId(actorId);
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate("actorId", "firstName lastName email").sort({ timestamp: -1 }).skip(skip).limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  // Feature Flags
  async getFeatureFlags() {
    return FeatureFlag.find().sort({ key: 1 });
  }

  async updateFeatureFlag(key: string, value: boolean, updatedBy: string) {
    let flag = await FeatureFlag.findOne({ key });
    if (!flag) {
      flag = await FeatureFlag.create({ key, value, description: key, updatedBy });
    } else {
      flag.value = value;
      flag.updatedBy = new mongoose.Types.ObjectId(updatedBy);
      flag.updatedAt = new Date();
      await flag.save();
    }

    await this.createAuditLog(updatedBy, "super_admin", AuditAction.FEATURE_FLAG_UPDATE, `/api/super-admin/settings/feature-flags/${key}`, "PUT", `Feature flag ${key} set to ${value}`);

    return flag;
  }

  // API Keys
  async generateApiKey(name: string, scopes: string[], owner: string) {
    const key = `sk_${crypto.randomBytes(32).toString("hex")}`;
    const apiKey = await ApiKey.create({ name, key, owner, scopes });

    await this.createAuditLog(owner, "super_admin", AuditAction.API_KEY_CREATE, "/api/super-admin/api-keys", "POST", "API key created", { name, scopes });

    return { ...apiKey.toObject(), key };
  }

  async listApiKeys(owner: string) {
    return ApiKey.find({ owner }).sort({ createdAt: -1 });
  }

  async revokeApiKey(id: string, revokedBy: string) {
    const apiKey = await ApiKey.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!apiKey) throw new AppError("API key not found", 404);

    await this.createAuditLog(revokedBy, "super_admin", AuditAction.API_KEY_REVOKE, `/api/super-admin/api-keys/${id}`, "DELETE", "API key revoked");

    return apiKey;
  }

  // User Management (elevated)
  async forceLogoutUser(userId: string, actionBy: string) {
    const User = mongoose.model("User");
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    await this.createAuditLog(actionBy, "super_admin", AuditAction.FORCE_LOGOUT, `/api/super-admin/users/${userId}/force-logout`, "POST", "User force logged out", { userId });

    return { success: true, message: `User ${user.email} has been logged out` };
  }

  async bulkSuspendUsers(userIds: string[], reason: string, actionBy: string) {
    if (userIds.length > 1000) throw new AppError("Maximum 1000 users per bulk operation", 400);

    const User = mongoose.model("User");
    const result = await User.updateMany({ _id: { $in: userIds } }, { status: "suspended" });

    await this.createAuditLog(actionBy, "super_admin", AuditAction.BULK_SUSPEND, "/api/super-admin/users/bulk-suspend", "POST", `Bulk suspended ${result.modifiedCount} users`, { count: result.modifiedCount, reason });

    return { success: true, suspended: result.modifiedCount };
  }

  // Helper
  private async createAuditLog(actorId: string, actorRole: string, action: AuditAction, resource: string, method: string, notes?: string, data?: any, ipAddress?: string, userAgent?: string) {
    try {
      await AuditLog.create({
        actorId: new mongoose.Types.ObjectId(actorId),
        actorRole,
        action,
        resource,
        method,
        requestBody: data ? JSON.parse(JSON.stringify(data)) : undefined,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        timestamp: new Date(),
      });
    } catch (err) {
      // Don't fail the main operation if audit logging fails
      console.error("Audit log creation failed:", err);
    }
  }
}

export const superAdminService = new SuperAdminService();
