import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Ticket, CheckinLog, Employee, Event } from "../models/index";
import { AppError } from "../middleware/error";
import logger from "../config/logger";
import { AuthRequest } from "../types/index";
import { canStaffAccessVendor, resolveStaffVendorId } from "../utils/vendorResolve";

const isId = (v: unknown) => typeof v === "string" && mongoose.isValidObjectId(v);

export const checkInTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // The scanning employee is the logged-in user; a body employeeId used to be
  // trusted, letting anyone check in as (and with the rights of) a colleague.
  const { location, deviceInfo, geoLocation, notes } = req.body;
  const ticketNumber = req.body.ticketNumber ?? req.body.ticketCode;
  if (typeof ticketNumber !== "string" || !ticketNumber) {
    return next(new AppError("ticketNumber is required", 400));
  }

  try {
    const ticket = await Ticket.findOne({ ticketNumber });

    if (!ticket) {
      return next(new AppError("Ticket not found", 404));
    }

    if (ticket.status === "used") {
      return next(new AppError("Ticket already checked in", 409));
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return next(new AppError(`Ticket status is ${ticket.status}`, 403));
    }

    const employee = await Employee.findOne({ userId: (req as AuthRequest).user?._id });
    if (!employee) {
      return next(new AppError("No employee profile for this account", 403));
    }
    const employeeId = employee._id;

    // Only employees assigned to the ticket's event. (A venue assignment used
    // to authorize every event via a placeholder that always returned true.)
    const isAuthorized = employee.assignedEvents.some((id) => String(id) === String(ticket.eventId));

    if (!isAuthorized) {
      return next(
        new AppError("Employee not authorized for this event/venue", 403),
      );
    }

    // Update ticket status
    ticket.status = "used";
    ticket.checkInDetails = {
      isCheckedIn: true,
      checkInTime: new Date(),
      checkInBy: employeeId,
      checkInLocation: location,
      scanCount: (ticket.checkInDetails?.scanCount || 0) + 1,
    };
    await ticket.save();

    // Create check-in log
    const checkinLog = await CheckinLog.create({
      ticketId: ticket._id,
      eventId: ticket.eventId,
      employeeId,
      customerId: ticket.userId,
      scanResult: "success",
      scanTime: new Date(),
      location,
      deviceInfo,
      geoLocation,
      notes,
    });

    res.status(200).json({
      success: true,
      message: "Ticket checked in successfully",
      data: { ticket, checkinLog },
    });
  } catch (error) {
    logger.error("Error checking in ticket:", error);
    next(new AppError("Failed to check in ticket", 500));
  }
};

export const getCheckinLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { eventId, employeeId, scanResult } = req.query;
  if ((eventId && !isId(eventId)) || (employeeId && !isId(employeeId))) {
    return next(new AppError("Invalid eventId or employeeId", 400));
  }
  const filter: any = {};

  if (eventId) filter.eventId = eventId;
  if (employeeId) filter.employeeId = employeeId;
  if (scanResult) filter.scanResult = String(scanResult);

  try {
    // Admins see everything; vendors and employees only their vendor's events.
    const staffVendorId = await resolveStaffVendorId(req as AuthRequest);
    if (staffVendorId !== null) {
      const ownIds = [staffVendorId, String((req as AuthRequest).user?._id)].filter(Boolean);
      const ownEvents = staffVendorId === undefined ? [] : await Event.find({ vendorId: { $in: ownIds } }).distinct("_id");
      const own = ownEvents.map(String);
      filter.eventId = eventId ? (own.includes(String(eventId)) ? eventId : { $in: [] }) : { $in: ownEvents };
    }

    const logs = await CheckinLog.find(filter)
      .populate("ticketId", "ticketNumber ticketType")
      .populate("eventId", "name")
      .populate("employeeId", "firstName lastName")
      .populate("customerId", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Check-in logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    logger.error("Error retrieving check-in logs:", error);
    next(new AppError("Failed to retrieve check-in logs", 500));
  }
};

export const getCheckinSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { eventId } = req.query;
  if (!isId(eventId)) {
    return next(new AppError("A valid eventId is required", 400));
  }

  try {
    const event = await Event.findById(eventId).select("vendorId").lean();
    if (event && !(await canStaffAccessVendor(req as AuthRequest, event.vendorId))) {
      return next(new AppError("Not authorized for this event", 403));
    }
    const totalTickets = await Ticket.countDocuments({ eventId });
    const checkedInTickets = await Ticket.countDocuments({
      eventId,
      "checkInDetails.isCheckedIn": true,
    });
    const uniqueAttendees = await CheckinLog.distinct("customerId", {
      eventId,
      scanResult: "success",
    });

    res.status(200).json({
      success: true,
      message: "Check-in summary retrieved successfully",
      data: {
        totalTickets,
        checkedInTickets,
        uncheckedTickets: totalTickets - checkedInTickets,
        uniqueAttendees: uniqueAttendees.length,
        checkInRate:
          totalTickets > 0 ? (checkedInTickets / totalTickets) * 100 : 0,
      },
    });
  } catch (error) {
    logger.error("Error retrieving check-in summary:", error);
    next(new AppError("Failed to retrieve check-in summary", 500));
  }
};
