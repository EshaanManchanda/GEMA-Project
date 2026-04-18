import { Request, Response, NextFunction } from "express";
import { schoolService } from "./schools.service";
import { AppError, catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";
import { UserRole } from "../../models/index";

export const createSchool = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const school = await schoolService.createSchool(req.user?._id.toString() || "", req.body);
  res.status(201).json({ success: true, message: "School created successfully. Pending approval.", data: { school } });
});

export const getSchools = catchAsync(async (req: Request, res: Response) => {
  const result = await schoolService.getAllSchools(req.query);
  res.json({ success: true, ...result });
});

export const getSchool = catchAsync(async (req: Request, res: Response) => {
  const school = await schoolService.getSchoolById(req.params.id);
  res.json({ success: true, data: { school } });
});

export const updateSchool = catchAsync(async (req: AuthRequest, res: Response) => {
  const school = await schoolService.updateSchool(req.params.id, req.body);
  res.json({ success: true, message: "School updated successfully", data: { school } });
});

export const moderateSchool = catchAsync(async (req: Request, res: Response) => {
  const { action } = req.body;
  const school = await schoolService.moderateSchool(req.params.id, action);
  res.json({ success: true, message: `School ${action}d successfully`, data: { school } });
});

export const deleteSchool = catchAsync(async (req: Request, res: Response) => {
  await schoolService.deleteSchool(req.params.id);
  res.json({ success: true, message: "School deleted successfully" });
});

export const inviteToSchool = catchAsync(async (req: AuthRequest, res: Response) => {
  const { email, role, metadata } = req.body;
  const invite = await schoolService.inviteUser(req.params.id, req.user?._id.toString() || "", email, role, metadata);
  res.status(201).json({ success: true, message: "Invitation sent successfully", data: { invite } });
});

export const getSchoolInvites = catchAsync(async (req: Request, res: Response) => {
  const invites = await schoolService.getInvites(req.params.id);
  res.json({ success: true, data: { invites } });
});

export const acceptInvite = catchAsync(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const invite = await schoolService.acceptInvite(token, req.user?._id.toString() || "");
  res.json({ success: true, message: "Invitation accepted successfully", data: { invite } });
});

export const getSchoolStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await schoolService.getSchoolStats(req.params.id);
  res.json({ success: true, data: { stats } });
});
