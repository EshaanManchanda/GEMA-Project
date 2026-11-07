import { Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Employee, Event, Ticket } from "../models/index";
import CheckinLog from "../models/CheckinLog";
import { AppError } from "../middleware/error";
import { AuthRequest } from "../types/index";

// Vendors manage employees through /api/vendors/employees and admins through
// /api/admin/employees. This router only serves the logged-in employee.

const myEmployee = (req: AuthRequest) =>
  Employee.findOne({ userId: req.user?._id || req.user?.id, status: "active" })
    .select("_id assignedEvents")
    .lean();

/** GET /api/employees/assigned-events — the events this employee works at, with ticket and check-in counts. */
export const getMyAssignedEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await myEmployee(req);
    if (!employee) return next(new AppError("No active employee profile for this account", 404));

    const ids = (employee.assignedEvents || []) as Types.ObjectId[];
    const [events, tickets, checkins] = await Promise.all([
      Event.find({ _id: { $in: ids }, isDeleted: { $ne: true } })
        .select("title slug dateSchedule location status type")
        .lean(),
      Ticket.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: "$eventId", n: { $sum: 1 } } }]),
      CheckinLog.aggregate([
        { $match: { eventId: { $in: ids }, scanResult: "success" } },
        { $group: { _id: "$eventId", n: { $sum: 1 } } },
      ]),
    ]);
    const count = (rows: { _id: Types.ObjectId; n: number }[], id: unknown) =>
      rows.find((r) => String(r._id) === String(id))?.n ?? 0;

    res.json({
      success: true,
      data: events.map((e) => ({ ...e, ticketsCount: count(tickets, e._id), checkedInCount: count(checkins, e._id) })),
    });
  } catch (error) {
    next(error);
  }
};

const PERIOD_DAYS: Record<string, number> = { "7d": 7, "30d": 30 };

/** GET /api/employees/my-reports?period=7d|30d — this employee's own check-in summary and recent scans. */
export const getMyReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await myEmployee(req);
    if (!employee) return next(new AppError("No active employee profile for this account", 404));

    const days = PERIOD_DAYS[String(req.query.period)];
    const filter: Record<string, unknown> = { employeeId: employee._id };
    if (days) filter.scanTime = { $gte: new Date(Date.now() - days * 86_400_000) };

    const logs = await CheckinLog.find(filter)
      .sort({ scanTime: -1 })
      .select("scanTime scanResult ticketId eventId customerId")
      .populate("ticketId", "ticketNumber")
      .populate("eventId", "title")
      .populate("customerId", "firstName lastName")
      .lean();

    const ok = logs.filter((l) => l.scanResult === "success");
    const dayOf = (d: Date) => new Date(d).toDateString();
    const today = dayOf(new Date());
    // ponytail: a "shift" is a day with at least one scan; switch to real shifts if Employee.shiftSchedule gets used
    const shifts = new Set(ok.map((l) => dayOf(l.scanTime))).size;

    res.json({
      success: true,
      data: {
        summary: {
          totalShifts: shifts,
          totalCheckins: ok.length,
          todayCheckins: ok.filter((l) => dayOf(l.scanTime) === today).length,
          avgCheckinsPerShift: shifts ? Math.round((ok.length / shifts) * 10) / 10 : 0,
        },
        recentCheckins: logs.slice(0, 20).map((l: any) => ({
          _id: String(l._id),
          ticketId: l.ticketId?.ticketNumber,
          eventTitle: l.eventId?.title,
          customerName: l.customerId ? `${l.customerId.firstName} ${l.customerId.lastName}`.trim() : undefined,
          checkedInAt: l.scanTime,
          status: l.scanResult === "success" ? "checked_in" : "invalid",
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
