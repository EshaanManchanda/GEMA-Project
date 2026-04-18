import { Request, Response } from "express";
import Notice from "./notice.model";
import { catchAsync, AppError } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

export const createNotice = catchAsync(async (req: AuthRequest, res: Response) => {
  const notice = await Notice.create({ ...req.body, createdBy: req.user?._id });
  res.status(201).json({ success: true, message: "Notice created", data: { notice } });
});

export const getNotices = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, schoolId, priority, targetAudience, isPublished } = req.query;
  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  const skip = (pageNum - 1) * limitNum;
  const filter: any = {};
  if (schoolId) filter.schoolId = schoolId;
  if (priority) filter.priority = priority;
  if (targetAudience) filter.targetAudience = targetAudience;
  if (isPublished !== undefined) filter.isPublished = isPublished === "true";
  const [notices, total] = await Promise.all([
    Notice.find(filter).populate("createdBy", "firstName lastName").sort({ startDate: -1 }).skip(skip).limit(limitNum),
    Notice.countDocuments(filter),
  ]);
  res.json({ success: true, notices, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } });
});

export const updateNotice = catchAsync(async (req: AuthRequest, res: Response) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!notice) throw new AppError("Notice not found", 404);
  res.json({ success: true, message: "Notice updated", data: { notice } });
});

export const deleteNotice = catchAsync(async (req: AuthRequest, res: Response) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) throw new AppError("Notice not found", 404);
  res.json({ success: true, message: "Notice deleted" });
});
