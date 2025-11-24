import { Request, Response, NextFunction } from 'express';
import { Ticket, CheckinLog, Employee } from '../models/index';
import { AppError } from '../middleware/error';

export const checkInTicket = async (req: Request, res: Response, next: NextFunction) => {
  const { ticketNumber, employeeId, location, deviceInfo, geoLocation, notes } = req.body;

  try {
    const ticket = await Ticket.findOne({ ticketNumber });

    if (!ticket) {
      return next(new AppError('Ticket not found', 404));
    }

    if (ticket.status === 'used') {
      return next(new AppError('Ticket already checked in', 409));
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return next(new AppError(`Ticket status is ${ticket.status}`, 403));
    }

    // Check if the employee is authorized to check in tickets for this event/venue
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return next(new AppError('Employee not found', 404));
    }

    // Basic authorization check (can be expanded)
    const isAuthorized = employee.assignedEvents.includes(ticket.eventId) || employee.assignedVenues.some(venueId => {
      // This would require populating venue details to check gates, or a more complex query
      // For now, a simple check if the employee is assigned to the event
      return true; // Placeholder, actual logic needed
    });

    if (!isAuthorized) {
      return next(new AppError('Employee not authorized for this event/venue', 403));
    }

    // Update ticket status
    ticket.status = 'used';
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
      scanResult: 'success',
      scanTime: new Date(),
      location,
      deviceInfo,
      geoLocation,
      notes,
    });

    res.status(200).json({
      success: true,
      message: 'Ticket checked in successfully',
      data: { ticket, checkinLog },
    });

  } catch (error) {
    console.error('Error checking in ticket:', error);
    next(new AppError('Failed to check in ticket', 500));
  }
};

export const getCheckinLogs = async (req: Request, res: Response, next: NextFunction) => {
  const { eventId, employeeId, scanResult } = req.query;
  const filter: any = {};

  if (eventId) filter.eventId = eventId;
  if (employeeId) filter.employeeId = employeeId;
  if (scanResult) filter.scanResult = scanResult;

  try {
    const logs = await CheckinLog.find(filter)
      .populate('ticketId', 'ticketNumber ticketType')
      .populate('eventId', 'name')
      .populate('employeeId', 'firstName lastName')
      .populate('customerId', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Check-in logs retrieved successfully',
      data: logs,
    });
  } catch (error) {
    console.error('Error retrieving check-in logs:', error);
    next(new AppError('Failed to retrieve check-in logs', 500));
  }
};

export const getCheckinSummary = async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.query;

  try {
    const totalTickets = await Ticket.countDocuments({ eventId });
    const checkedInTickets = await Ticket.countDocuments({ eventId, 'checkInDetails.isCheckedIn': true });
    const uniqueAttendees = await CheckinLog.distinct('customerId', { eventId, scanResult: 'success' });

    res.status(200).json({
      success: true,
      message: 'Check-in summary retrieved successfully',
      data: {
        totalTickets,
        checkedInTickets,
        uncheckedTickets: totalTickets - checkedInTickets,
        uniqueAttendees: uniqueAttendees.length,
        checkInRate: totalTickets > 0 ? (checkedInTickets / totalTickets) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error retrieving check-in summary:', error);
    next(new AppError('Failed to retrieve check-in summary', 500));
  }
};