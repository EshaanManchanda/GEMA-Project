import { Request, Response } from "express";
import CalendarEvent from "./calendar-event.model";
import { catchAsync, AppError } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

export const createCalendarEvent = catchAsync(async (req: AuthRequest, res: Response) => {
  const event = await CalendarEvent.create({ ...req.body, createdBy: req.user?._id });
  res.status(201).json({ success: true, message: "Calendar event created", data: { event } });
});

export const getCalendarEvents = catchAsync(async (req: Request, res: Response) => {
  const { schoolId, startDate, endDate, type } = req.query;
  const filter: any = {};
  if (schoolId) filter.schoolId = schoolId;
  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.startDate = {};
    if (startDate) filter.startDate.$gte = new Date(String(startDate));
    if (endDate) filter.startDate.$lte = new Date(String(endDate));
  }
  const events = await CalendarEvent.find(filter).populate("createdBy", "firstName lastName").sort({ startDate: 1 });
  res.json({ success: true, data: { events } });
});

export const updateCalendarEvent = catchAsync(async (req: AuthRequest, res: Response) => {
  const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!event) throw new AppError("Calendar event not found", 404);
  res.json({ success: true, message: "Calendar event updated", data: { event } });
});

export const deleteCalendarEvent = catchAsync(async (req: AuthRequest, res: Response) => {
  const event = await CalendarEvent.findByIdAndDelete(req.params.id);
  if (!event) throw new AppError("Calendar event not found", 404);
  res.json({ success: true, message: "Calendar event deleted" });
});
