import { Request, Response } from "express";
import { studentPortalService } from "./portal.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";
import Student from "../students/student.model";

export const getStudentDashboard = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await studentPortalService.getStudentDashboard(req.user?._id.toString() || "");
  res.json({ success: true, data });
});

export const getParentDashboard = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await studentPortalService.getParentDashboard(req.user?._id.toString() || "");
  res.json({ success: true, data });
});

export const getEnrollments = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) return res.json({ success: true, data: { enrollments: [], pagination: { total: 0 } } });
  const result = await studentPortalService.getEnrollments(student._id.toString(), req.query);
  res.json({ success: true, ...result });
});

export const getCertificates = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) return res.json({ success: true, data: { certificates: [], pagination: { total: 0 } } });
  const result = await studentPortalService.getCertificates(student._id.toString(), req.query);
  res.json({ success: true, ...result });
});

export const getAttendance = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) return res.json({ success: true, data: { summary: {}, enrollments: [] } });
  const result = await studentPortalService.getAttendance(student._id.toString());
  res.json({ success: true, data: result });
});

export const getGrades = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await Student.findOne({ userId: req.user?._id });
  if (!student) return res.json({ success: true, data: { grades: [] } });
  const result = await studentPortalService.getGrades(student._id.toString());
  res.json({ success: true, data: result });
});

export const getChildren = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await studentPortalService.getParentDashboard(req.user?._id.toString() || "");
  res.json({ success: true, data: { children: data.children } });
});
