import { Request, Response } from "express";
import { parentService } from "./parents.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

export const createParent = catchAsync(async (req: AuthRequest, res: Response) => {
  const parent = await parentService.createParent(req.body);
  res.status(201).json({ success: true, message: "Parent profile created", data: { parent } });
});

export const getParent = catchAsync(async (req: Request, res: Response) => {
  const parent = await parentService.getParentById(req.params.id);
  res.json({ success: true, data: { parent } });
});

export const getParentByUser = catchAsync(async (req: AuthRequest, res: Response) => {
  const parent = await parentService.getParentByUserId(req.user?._id.toString() || "");
  res.json({ success: true, data: { parent } });
});

export const updateParent = catchAsync(async (req: AuthRequest, res: Response) => {
  const parent = await parentService.updateParent(req.params.id, req.body);
  res.json({ success: true, message: "Parent profile updated", data: { parent } });
});

export const addChild = catchAsync(async (req: AuthRequest, res: Response) => {
  const { studentId, relationship } = req.body;
  const parent = await parentService.addChild(req.params.id, studentId, relationship);
  res.json({ success: true, message: "Child added successfully", data: { parent } });
});

export const removeChild = catchAsync(async (req: AuthRequest, res: Response) => {
  const parent = await parentService.removeChild(req.params.parentId, req.params.studentId);
  res.json({ success: true, message: "Child removed successfully", data: { parent } });
});

export const deleteParent = catchAsync(async (req: AuthRequest, res: Response) => {
  await parentService.deleteParent(req.params.id);
  res.json({ success: true, message: "Parent profile deleted" });
});
