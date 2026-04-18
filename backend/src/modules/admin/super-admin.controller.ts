import { Request, Response } from "express";
import { superAdminService } from "./super-admin.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

// Admin Management
export const createAdminRole = catchAsync(async (req: AuthRequest, res: Response) => {
  const adminRole = await superAdminService.createAdminRole(req.body, req.user?._id.toString() || "");
  res.status(201).json({ success: true, message: "Admin role created", data: { adminRole } });
});

export const listAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const result = await superAdminService.listAllAdmins(req.query);
  res.json({ success: true, ...result });
});

export const updateAdminRole = catchAsync(async (req: AuthRequest, res: Response) => {
  const adminRole = await superAdminService.updateAdminRole(req.params.id, req.body, req.user?._id.toString() || "");
  res.json({ success: true, message: "Admin role updated", data: { adminRole } });
});

export const deleteAdminRole = catchAsync(async (req: AuthRequest, res: Response) => {
  await superAdminService.deleteAdminRole(req.params.id, req.user?._id.toString() || "");
  res.json({ success: true, message: "Admin role deleted" });
});

export const suspendAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const adminRole = await superAdminService.suspendAdmin(req.params.id, reason, req.user?._id.toString() || "");
  res.json({ success: true, message: "Admin suspended", data: { adminRole } });
});

export const reinstateAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
  const adminRole = await superAdminService.reinstateAdmin(req.params.id, req.user?._id.toString() || "");
  res.json({ success: true, message: "Admin reinstated", data: { adminRole } });
});

// System Operations
export const getSystemHealth = catchAsync(async (req: Request, res: Response) => {
  const health = await superAdminService.getSystemHealth();
  res.json({ success: true, data: { health } });
});

export const getDatabaseStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await superAdminService.getDatabaseStats();
  res.json({ success: true, data: { stats } });
});

export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await superAdminService.getAuditLogs(req.query);
  res.json({ success: true, ...result });
});

// Feature Flags
export const getFeatureFlags = catchAsync(async (req: Request, res: Response) => {
  const flags = await superAdminService.getFeatureFlags();
  res.json({ success: true, data: { flags } });
});

export const updateFeatureFlag = catchAsync(async (req: AuthRequest, res: Response) => {
  const { value } = req.body;
  const flag = await superAdminService.updateFeatureFlag(req.params.key, value, req.user?._id.toString() || "");
  res.json({ success: true, message: "Feature flag updated", data: { flag } });
});

// API Keys
export const generateApiKey = catchAsync(async (req: AuthRequest, res: Response) => {
  const { name, scopes } = req.body;
  const apiKey = await superAdminService.generateApiKey(name, scopes, req.user?._id.toString() || "");
  res.status(201).json({ success: true, message: "API key generated", data: { apiKey } });
});

export const listApiKeys = catchAsync(async (req: AuthRequest, res: Response) => {
  const apiKeys = await superAdminService.listApiKeys(req.user?._id.toString() || "");
  res.json({ success: true, data: { apiKeys } });
});

export const revokeApiKey = catchAsync(async (req: AuthRequest, res: Response) => {
  await superAdminService.revokeApiKey(req.params.id, req.user?._id.toString() || "");
  res.json({ success: true, message: "API key revoked" });
});

// User Management
export const forceLogoutUser = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await superAdminService.forceLogoutUser(req.params.userId, req.user?._id.toString() || "");
  res.json({ success: true, ...result });
});

export const bulkSuspendUsers = catchAsync(async (req: AuthRequest, res: Response) => {
  const { userIds, reason } = req.body;
  const result = await superAdminService.bulkSuspendUsers(userIds, reason, req.user?._id.toString() || "");
  res.json({ success: true, ...result });
});
